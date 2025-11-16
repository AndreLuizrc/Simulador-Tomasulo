import { SimulatorState, BranchCheckpoint } from "@/types/simulator";
import { restoreRAT } from "./rat";

/**
 * Flush speculative state after branch misprediction
 *
 * This function restores the processor state to the checkpoint,
 * removing all speculatively executed instructions.
 *
 * Steps:
 * 1. Restore RAT from checkpoint snapshot
 * 2. Reset ROB tail to checkpoint position
 * 3. Clear speculative ROB entries
 * 4. Clear speculative RS entries
 * 5. Cancel FUs executing speculative instructions
 * 6. Mark instructions as "flushed"
 *
 * @param checkpoint - The checkpoint to restore from
 * @param state - Current simulator state
 * @returns Updated state with speculation flushed
 */
export function flushSpeculativeState(
  checkpoint: BranchCheckpoint,
  state: SimulatorState
): SimulatorState {
  let newState = { ...state };

  // 1. Restore RAT from checkpoint snapshot
  newState.registerRenaming = restoreRAT(checkpoint.ratSnapshot);

  // 2. Reset ROB tail to checkpoint snapshot
  // Clear all ROB entries after the checkpoint
  const newRob = [...state.rob];
  let currentIndex = checkpoint.robTailSnapshot;
  const robSize = state.rob.length;

  // Clear entries from checkpoint tail to current tail
  while (currentIndex !== state.robTail) {
    newRob[currentIndex] = {
      index: currentIndex,
      busy: false,
      instructionId: undefined,
      type: undefined,
      destination: undefined,
      value: undefined,
      ready: false,
      isSpeculative: false,
      branchCheckpointId: undefined,
      address: undefined,
    };
    currentIndex = (currentIndex + 1) % robSize;
  }

  newState.rob = newRob;
  newState.robTail = checkpoint.robTailSnapshot;

  // 3. Clear speculative RS entries
  const newReservationStations = state.reservationStations.map((rs) => {
    if (!rs.busy || rs.instructionId === undefined) {
      return rs;
    }

    const instruction = state.instructions[rs.instructionId];
    if (instruction && instruction.isSpeculative) {
      // Clear this RS - it was executing speculatively
      return {
        name: rs.name,
        type: rs.type,
        busy: false,
        op: undefined,
        vj: undefined,
        vk: undefined,
        qj: undefined,
        qk: undefined,
        dest: undefined,
        address: undefined,
        instructionId: undefined,
      };
    }

    return rs;
  });

  newState.reservationStations = newReservationStations;

  // 4. Cancel FUs executing speculative instructions
  const newFunctionalUnits = state.functionalUnits.map((fu) => {
    if (!fu.busy || fu.instructionId === undefined) {
      return fu;
    }

    const instruction = state.instructions[fu.instructionId];
    if (instruction && instruction.isSpeculative) {
      // Cancel this FU - it was executing speculatively
      return {
        name: fu.name,
        type: fu.type,
        busy: false,
        instructionId: undefined,
        cyclesRemaining: 0,
        totalCycles: 0,
        result: undefined,
        operation: undefined,
        vj: undefined,
        vk: undefined,
        address: undefined,
      };
    }

    return fu;
  });

  newState.functionalUnits = newFunctionalUnits;

  // 5. Mark speculative instructions as "flushed"
  const newInstructions = state.instructions.map((instr) => {
    // Flush instructions that are:
    // - Speculative
    // - After the branch instruction (higher ID)
    // - Associated with this checkpoint
    if (
      instr.isSpeculative &&
      instr.id > checkpoint.instructionId &&
      instr.state !== "committed" &&
      instr.state !== "idle"
    ) {
      return {
        ...instr,
        state: "flushed" as const,
        isSpeculative: false,
      };
    }

    return instr;
  });

  newState.instructions = newInstructions;

  // 6. Increment flush count for metrics
  newState = {
    ...newState,
    flushCount: newState.flushCount + 1,
  };

  return newState;
}

/**
 * Clear all pending broadcasts from speculative instructions
 *
 * @param state - Current simulator state
 * @returns Updated state with speculative broadcasts removed
 */
export function clearSpeculativeBroadcasts(state: SimulatorState): SimulatorState {
  const newPendingBroadcasts = state.pendingBroadcasts.filter((broadcast) => {
    const instruction = state.instructions[broadcast.instructionId];
    return instruction && !instruction.isSpeculative;
  });

  return {
    ...state,
    pendingBroadcasts: newPendingBroadcasts,
  };
}

/**
 * Calculate how many instructions were flushed
 *
 * @param stateBefore - State before flush
 * @param stateAfter - State after flush
 * @returns Number of instructions that were flushed
 */
export function countFlushedInstructions(
  stateBefore: SimulatorState,
  stateAfter: SimulatorState
): number {
  let count = 0;

  for (let i = 0; i < stateAfter.instructions.length; i++) {
    if (
      stateBefore.instructions[i].state !== "flushed" &&
      stateAfter.instructions[i].state === "flushed"
    ) {
      count++;
    }
  }

  return count;
}
