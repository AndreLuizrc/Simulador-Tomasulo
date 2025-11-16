import { SimulatorState, BranchCheckpoint, RegisterRenaming } from "@/types/simulator";
import { snapshotRAT } from "./rat";
import { PredictionResult } from "./branch-predictor";

/**
 * Create a checkpoint when a branch instruction is issued
 *
 * Captures:
 * - RAT snapshot for recovery
 * - ROB tail position
 * - Prediction information
 * - PC of the branch
 *
 * @param instructionId - ID of the branch instruction
 * @param pc - Program counter of the branch
 * @param prediction - Prediction result (taken/not-taken and target)
 * @param state - Current simulator state
 * @returns New checkpoint
 */
export function createCheckpoint(
  instructionId: number,
  pc: number,
  prediction: PredictionResult,
  target: number, // Actual computed target address
  state: SimulatorState
): BranchCheckpoint {
  // Snapshot the current RAT
  const ratSnapshot = snapshotRAT(state.registerRenaming);

  const checkpoint: BranchCheckpoint = {
    id: state.nextCheckpointId,
    instructionId,
    pc,
    ratSnapshot,
    robTailSnapshot: state.robTail,
    predictedTaken: prediction.taken,
    predictedTarget: target,
    resolved: false,
    correct: undefined,
  };

  return checkpoint;
}

/**
 * Find a checkpoint by instruction ID
 *
 * @param instructionId - ID of the branch instruction
 * @param state - Current simulator state
 * @returns Checkpoint if found, undefined otherwise
 */
export function findCheckpoint(
  instructionId: number,
  state: SimulatorState
): BranchCheckpoint | undefined {
  return state.branchCheckpoints.find(cp => cp.instructionId === instructionId);
}

/**
 * Find a checkpoint by checkpoint ID
 *
 * @param checkpointId - ID of the checkpoint
 * @param state - Current simulator state
 * @returns Checkpoint if found, undefined otherwise
 */
export function findCheckpointById(
  checkpointId: number,
  state: SimulatorState
): BranchCheckpoint | undefined {
  return state.branchCheckpoints.find(cp => cp.id === checkpointId);
}

/**
 * Remove a checkpoint from the state
 *
 * Called after a branch commits and no longer needs recovery
 *
 * @param checkpointId - ID of checkpoint to remove
 * @param state - Current simulator state
 * @returns Updated state with checkpoint removed
 */
export function removeCheckpoint(
  checkpointId: number,
  state: SimulatorState
): SimulatorState {
  return {
    ...state,
    branchCheckpoints: state.branchCheckpoints.filter(
      cp => cp.id !== checkpointId
    ),
  };
}

/**
 * Mark a checkpoint as resolved with correctness info
 *
 * @param checkpointId - ID of checkpoint to update
 * @param correct - Whether prediction was correct
 * @param state - Current simulator state
 * @returns Updated state
 */
export function resolveCheckpoint(
  checkpointId: number,
  correct: boolean,
  state: SimulatorState
): SimulatorState {
  const newCheckpoints = state.branchCheckpoints.map(cp => {
    if (cp.id === checkpointId) {
      return {
        ...cp,
        resolved: true,
        correct,
      };
    }
    return cp;
  });

  return {
    ...state,
    branchCheckpoints: newCheckpoints,
  };
}

/**
 * Check if there are any unresolved checkpoints
 *
 * @param state - Current simulator state
 * @returns True if speculation is active
 */
export function hasUnresolvedCheckpoints(state: SimulatorState): boolean {
  return state.branchCheckpoints.some(cp => !cp.resolved);
}

/**
 * Get the oldest unresolved checkpoint
 *
 * Used to determine which checkpoint should block speculative commits
 *
 * @param state - Current simulator state
 * @returns Oldest unresolved checkpoint or undefined
 */
export function getOldestUnresolvedCheckpoint(
  state: SimulatorState
): BranchCheckpoint | undefined {
  const unresolved = state.branchCheckpoints.filter(cp => !cp.resolved);
  return unresolved.length > 0 ? unresolved[0] : undefined;
}
