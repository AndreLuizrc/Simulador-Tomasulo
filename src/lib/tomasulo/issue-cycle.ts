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
export function issueCycle(state: SimulatorState): SimulatorState {
  // Find first idle instruction
  const instruction = state.instructions.find((inst) => inst.state === "idle");

  if (!instruction) {
    // No instructions to issue
    return state;
  }

  // Check if instruction can be issued
  if (!canIssue(instruction.id, state)) {
    // Structural hazard - stall
    return state;
  }

  // Allocate ROB entry
  const robIndex = findFreeROBEntry(state);
  if (robIndex === null) {
    return state; // Should not happen since canIssue checks this
  }

  // Determine RS type
  const rsType = getReservationStationType(instruction.operation);

  // Allocate RS entry
  const rsIndex = findFreeReservationStation(rsType, state);
  if (rsIndex === null) {
    return state; // Should not happen since canIssue checks this
  }

  // Clone state for updates
  let newState = { ...state };

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
    isSpeculative: false, // Will be set in Phase 3
  };

  // Update RS
  const newReservationStations = [...newState.reservationStations];

  // Calculate address for LOAD/STORE
  let address: number | undefined;
  if (instruction.operation === "LOAD" || instruction.operation === "STORE") {
    address = calculateAddress(
      instruction.src1,
      instruction.immediate ?? 0,
      newState
    );
  }

  newReservationStations[rsIndex] = {
    ...newReservationStations[rsIndex],
    busy: true,
    op: instruction.operation,
    vj: src1Info.value,
    vk: src2Info.value,
    qj: src1Info.robTag !== undefined ? `ROB${src1Info.robTag}` : undefined,
    qk: src2Info.robTag !== undefined ? `ROB${src2Info.robTag}` : undefined,
    dest: instruction.dest || undefined,
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
      };
    }
    return inst;
  });

  // Advance ROB tail
  const newRobTail = (robIndex + 1) % newState.rob.length;

  return {
    ...newState,
    instructions: newInstructions,
    reservationStations: newReservationStations,
    rob: newRob,
    robTail: newRobTail,
    registerRenaming: newRegisterRenaming,
  };
}
