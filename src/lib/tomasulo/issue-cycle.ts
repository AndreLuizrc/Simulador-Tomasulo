import { SimulatorState, Instruction } from "@/types/simulator";
import {
  canIssue,
  findFreeReservationStation,
  findFreeROBEntry,
  getReservationStationType,
  getRegisterValue,
} from "./state-manager";
import { updateRAT } from "./rat";
import { calculateAddress } from "./memory";
import { predictBranch } from "./branch-predictor";
import { createCheckpoint, hasUnresolvedCheckpoints } from "./checkpoint";

/**
 * Issue Cycle - Try to issue the next idle instruction
 *
 * Algorithm:
 * 1. Find next instruction in "idle" state
 * 2. Check if ROB and RS are available
 * 3. Allocate ROB entry at tail
 * 4. Allocate RS entry
 * 5. Query RAT for source operands
 * 6. Update RAT for destination register
 * 7. Mark instruction as "issued"
 */
export function issueCycle(state: SimulatorState): { state: SimulatorState; issueStallOccurred: boolean; } {
  let newState = { ...state };
  let issueStallOccurredThisCycle = false;

  // Find first idle instruction
  const instruction = newState.instructions.find((inst) => inst.state === "idle");

  if (!instruction) {
    // No instructions to issue, no stall specific to *this* cycle
    return { state: newState, issueStallOccurred: false };
  }

  // Check if instruction can be issued (ROB or RS full)
  if (!canIssue(instruction.id, newState)) {
    issueStallOccurredThisCycle = true;
  }

  // Allocate ROB entry (re-check as state might have changed, or canIssue might have missed edge case)
  const robIndex = findFreeROBEntry(newState);
  if (robIndex === null) {
    issueStallOccurredThisCycle = true;
  }

  // Determine RS type
  const rsType = getReservationStationType(instruction.operation);

  // Allocate RS entry (re-check as state might have changed, or canIssue might have missed edge case)
  const rsIndex = findFreeReservationStation(rsType, newState);
  if (rsIndex === null) {
    issueStallOccurredThisCycle = true;
  }

  // If an instruction cannot be issued due to any stall condition, return early with stall flag.
  if (issueStallOccurredThisCycle) {
    return { state: newState, issueStallOccurred: true };
  }

  // If we reach here, an instruction can be issued.
  // The newState is already cloned at the top, so we continue modifying it.

  // Get operand values or ROB tags
  const src1Info = getRegisterValue(instruction.src1, newState);
  const src2Info = getRegisterValue(instruction.src2, newState);

  // Determine ROB entry type
  let robType: "ALU" | "LOAD" | "STORE" | "BRANCH";
  switch (instruction.operation) {
    case "LOAD":
      robType = "LOAD";
      break;
    case "STORE":
      robType = "STORE";
      break;
    case "BEQ":
    case "BNE":
      robType = "BRANCH";
      break;
    default:
      robType = "ALU";
  }

  // Calculate address for LOAD/STORE before creating ROB entry
  let address: number | undefined;
  if (instruction.operation === "LOAD") {
    // LOAD: src1 = base register, immediate = offset
    address = calculateAddress(
      instruction.src1,
      instruction.immediate ?? 0,
      newState
    );
  } else if (instruction.operation === "STORE") {
    // STORE: dest = base register, immediate = offset
    address = calculateAddress(
      instruction.dest,
      instruction.immediate ?? 0,
      newState
    );
  }

  // Branch prediction and checkpoint creation
  let checkpointId: number | undefined;
  let isInstructionSpeculative = false;

  // Check if current instruction is being issued speculatively
  if (hasUnresolvedCheckpoints(newState)) {
    isInstructionSpeculative = true;
    // Find the oldest unresolved checkpoint
    const oldestUnresolved = newState.branchCheckpoints.find(cp => !cp.resolved);
    if (oldestUnresolved) {
      checkpointId = oldestUnresolved.id;
    }
  }

  // Handle branch instructions (BEQ/BNE)
  if (
    (instruction.operation === "BEQ" || instruction.operation === "BNE") &&
    newState.speculationEnabled
  ) {
    // Calculate branch target address
    const branchTarget = (newState.pc || instruction.id) + (instruction.immediate ?? 1);
    const fallthrough = (newState.pc || instruction.id) + 1;

    // Make branch prediction
    const prediction = predictBranch(
      newState.pc || instruction.id,
      newState.branchPredictor,
      fallthrough
    );

    // Calculate actual target based on prediction
    const predictedTarget = prediction.taken ? branchTarget : fallthrough;

    // Create checkpoint for this branch
    const checkpoint = createCheckpoint(
      instruction.id,
      newState.pc || instruction.id,
      prediction,
      predictedTarget,
      newState
    );

    // Add checkpoint to state
    newState = {
      ...newState,
      branchCheckpoints: [...newState.branchCheckpoints, checkpoint],
      nextCheckpointId: newState.nextCheckpointId + 1,
      pc: predictedTarget, // Update PC based on prediction
    };

    // Branch itself is not speculative, but it creates speculation
    isInstructionSpeculative = false;
    checkpointId = checkpoint.id;
  } else if (instruction.operation !== "BEQ" && instruction.operation !== "BNE") {
    // Update PC for non-branch instructions
    newState = {
      ...newState,
      pc: (newState.pc || instruction.id) + 1,
    };
  }

  // Update ROB
  const newRob = [...newState.rob];
  newRob[robIndex] = {
    index: robIndex,
    busy: true,
    instructionId: instruction.id,
    type: robType,
    destination: instruction.dest || undefined,
    value: undefined,
    ready: false,
    isSpeculative: isInstructionSpeculative,
    branchCheckpointId: checkpointId,
    address, // Store computed address for LOAD/STORE
  };

  // Update RS
  const newReservationStations = [...newState.reservationStations];

  newReservationStations[rsIndex] = {
    ...newReservationStations[rsIndex],
    busy: true,
    op: instruction.operation,
    vj: src1Info.value,
    vk: src2Info.value,
    qj: src1Info.robTag !== undefined ? `ROB${src1Info.robTag}` : undefined,
    qk: src2Info.robTag !== undefined ? `ROB${src2Info.robTag}` : undefined,
    dest: "ROB" + String(robIndex) || undefined,
    address,
    instructionId: instruction.id,
  };

  // Update RAT for destination register (except for STORE and BRANCH)
  let newRegisterRenaming = newState.registerRenaming;
  if (instruction.dest && instruction.operation !== "STORE" && instruction.operation !== "BEQ" && instruction.operation !== "BNE") {
    newRegisterRenaming = updateRAT(
      newState.registerRenaming,
      instruction.dest,
      robIndex
    );
  }

  // Update instruction state
  const newInstructions = newState.instructions.map((inst) => {
    if (inst.id === instruction.id) {
      return {
        ...inst,
        state: "issued" as const,
        issueTime: newState.cycle,
        robEntry: robIndex,
        isSpeculative: isInstructionSpeculative,
      };
    }
    return inst;
  });

  // Advance ROB tail
  const newRobTail = (robIndex + 1) % newState.rob.length;

  return {
    state: {
      ...newState,
      instructions: newInstructions,
      reservationStations: newReservationStations,
      rob: newRob,
      robTail: newRobTail,
      registerRenaming: newRegisterRenaming,
    },
    issueStallOccurred: false,
  };
}
