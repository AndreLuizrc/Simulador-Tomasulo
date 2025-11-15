import { SimulatorState } from "@/types/simulator";
import { clearRATIfMatches } from "./rat";
import { storeToMemory } from "./memory";

/**
 * Commit Cycle - Retire instruction from ROB head in-order
 *
 * Algorithm:
 * 1. Check ROB head - must be ready
 * 2. Commit by type:
 *    - ALU/LOAD: Write to register file
 *    - STORE: Write to memory
 *    - BRANCH: Verify prediction (basic - Phase 3 will handle full speculation)
 * 3. Clear RAT entry if still mapped
 * 4. Advance ROB head
 * 5. Mark instruction as "committed"
 */
export function commitCycle(state: SimulatorState): SimulatorState {
  const headEntry = state.rob[state.robHead];

  // Check if ROB head is ready to commit
  if (!headEntry.busy || !headEntry.ready) {
    // Nothing to commit
    return state;
  }

  const instructionId = headEntry.instructionId;
  if (instructionId === undefined) {
    return state;
  }

  const instruction = state.instructions[instructionId];
  if (!instruction) {
    return state;
  }

  let newState = { ...state };

  // Commit based on instruction type
  switch (headEntry.type) {
    case "ALU":
    case "LOAD":
      // Update register file with committed value
      if (headEntry.destination && headEntry.value !== undefined) {
        const newRegisterFile = new Map(newState.registerFile);
        newRegisterFile.set(headEntry.destination, headEntry.value);
        newState = {
          ...newState,
          registerFile: newRegisterFile,
        };

        // Clear RAT entry if it still points to this ROB entry
        newState = {
          ...newState,
          registerRenaming: clearRATIfMatches(
            newState.registerRenaming,
            headEntry.destination,
            state.robHead
          ),
        };
      }
      break;

    case "STORE":
      // Write to memory
      if (instruction.immediate !== undefined && headEntry.value !== undefined) {
        // Calculate address (simplified - using immediate as address)
        const address = instruction.immediate;
        newState = storeToMemory(address, headEntry.value, newState);
      }
      break;

    case "BRANCH":
      // Basic branch handling (Phase 3 will add full speculation)
      // For now, just mark as committed
      break;
  }

  // Clear ROB entry
  const newRob = [...newState.rob];
  newRob[state.robHead] = {
    index: state.robHead,
    busy: false,
    instructionId: undefined,
    type: undefined,
    destination: undefined,
    value: undefined,
    ready: false,
    isSpeculative: false,
  };

  // Advance ROB head
  const newRobHead = (state.robHead + 1) % state.rob.length;

  // Update instruction state
  const newInstructions = newState.instructions.map((inst) => {
    if (inst.id === instructionId) {
      return {
        ...inst,
        state: "committed" as const,
        commitTime: newState.cycle,
      };
    }
    return inst;
  });

  // Increment committed instruction counter
  const newInstructionsCommitted = newState.instructionsCommitted + 1;

  return {
    ...newState,
    rob: newRob,
    robHead: newRobHead,
    instructions: newInstructions,
    instructionsCommitted: newInstructionsCommitted,
  };
}
