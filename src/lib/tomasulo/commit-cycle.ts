import { SimulatorState } from "@/types/simulator";
import { clearRATIfMatches } from "./rat";
import { storeToMemory } from "./memory";
import { flushSpeculativeState } from "./flush";
import { findCheckpoint, removeCheckpoint } from "./checkpoint";
import { updatePredictor } from "./branch-predictor";

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

  // Block commit of speculative instructions until their branch resolves
  if (headEntry.isSpeculative && headEntry.branchCheckpointId !== undefined) {
    const dependentCheckpoint = state.branchCheckpoints.find(
      (cp) => cp.id === headEntry.branchCheckpointId
    );

    if (dependentCheckpoint && !dependentCheckpoint.resolved) {
      // Cannot commit until branch resolves - stall
      return state;
    }
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
      // Write to memory using the address computed during issue
      if (headEntry.address !== undefined && headEntry.value !== undefined) {
        newState = storeToMemory(headEntry.address, headEntry.value, newState);
      }
      break;

    case "BRANCH": {
      // Branch misprediction detection and recovery
      const checkpoint = findCheckpoint(instructionId, newState);

      if (checkpoint) {
        // Branch value: 1 = taken, 0 = not taken
        const actualTaken = headEntry.value === 1;

        if (!checkpoint.correct) {
          // MISPREDICTION DETECTED!
          console.log(`[MISPREDICTION] Instruction ${instructionId} at cycle ${newState.cycle}`);

          // 1. Flush speculative state
          newState = flushSpeculativeState(checkpoint, newState);

          // 2. Calculate correct PC
          const branchTarget = checkpoint.pc + (instruction.immediate ?? 1);
          const fallthrough = checkpoint.pc + 1;
          const correctTarget = actualTaken ? branchTarget : fallthrough;

          // 3. Update PC to correct path
          newState = {
            ...newState,
            pc: correctTarget,
          };

          // 4. Increment misprediction counter
          newState = {
            ...newState,
            mispredictionCount: newState.mispredictionCount + 1,
          };
        } else {
          // Prediction was correct
          newState = {
            ...newState,
            branchCorrect: newState.branchCorrect + 1,
          };
        }

        // 5. Update branch predictor with actual outcome
        updatePredictor(checkpoint.pc, actualTaken, newState.branchPredictor);

        // 6. Increment total branches executed
        newState = {
          ...newState,
          branchesExecuted: newState.branchesExecuted + 1,
        };

        // 7. Remove checkpoint (branch is now committed)
        newState = removeCheckpoint(checkpoint.id, newState);
      }
      break;
    }
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
