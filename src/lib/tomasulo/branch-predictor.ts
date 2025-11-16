import { BranchPredictor, BranchPredictorEntry } from "@/types/simulator";

/**
 * Prediction result returned by predictBranch
 */
export interface PredictionResult {
  taken: boolean;
  target: number; // Will be calculated by caller if taken
}

/**
 * Predict whether a branch will be taken
 *
 * @param pc - Program counter of the branch instruction
 * @param predictor - Current branch predictor state
 * @param fallthrough - PC+1 (address of next sequential instruction)
 * @returns Prediction result with taken flag and target
 */
export function predictBranch(
  pc: number,
  predictor: BranchPredictor,
  fallthrough: number
): PredictionResult {
  switch (predictor.type) {
    case 'static-taken':
      // Always predict taken
      // Target will be calculated by caller based on branch offset
      return { taken: true, target: 0 }; // Target placeholder

    case 'static-not-taken':
      // Always predict not taken (fallthrough to next instruction)
      return { taken: false, target: fallthrough };

    case '2-bit':
      return predict2Bit(pc, predictor, fallthrough);

    default:
      // Default to not taken
      return { taken: false, target: fallthrough };
  }
}

/**
 * 2-bit saturating counter prediction
 *
 * State machine:
 * 0 (SNT) ↔ 1 (WNT) ↔ 2 (WT) ↔ 3 (ST)
 * Strongly   Weakly    Weakly   Strongly
 * Not Taken  Not Taken  Taken    Taken
 *
 * Prediction: state >= 2 → Taken, state < 2 → Not Taken
 *
 * @param pc - Program counter
 * @param predictor - Branch predictor with 2-bit table
 * @param fallthrough - Next sequential PC
 * @returns Prediction result
 */
function predict2Bit(
  pc: number,
  predictor: BranchPredictor,
  fallthrough: number
): PredictionResult {
  if (!predictor.table) {
    // Initialize table if needed
    predictor.table = new Map();
  }

  // Get entry from table, default to Weakly Not Taken (state 1)
  const entry = predictor.table.get(pc) ?? { state: 1 as 0 | 1 | 2 | 3 };

  // Predict taken if state is Weakly Taken (2) or Strongly Taken (3)
  const taken = entry.state >= 2;

  return {
    taken,
    target: taken ? 0 : fallthrough // Target placeholder for taken branches
  };
}

/**
 * Update branch predictor after branch resolution
 *
 * For 2-bit predictor:
 * - If actually taken: increment state (max 3 - Strongly Taken)
 * - If not taken: decrement state (min 0 - Strongly Not Taken)
 *
 * For static predictors: no update needed
 *
 * @param pc - Program counter of resolved branch
 * @param actualTaken - Whether branch was actually taken
 * @param predictor - Branch predictor to update (mutated in place)
 */
export function updatePredictor(
  pc: number,
  actualTaken: boolean,
  predictor: BranchPredictor
): void {
  // Only update for 2-bit predictor
  if (predictor.type !== '2-bit') {
    return;
  }

  if (!predictor.table) {
    predictor.table = new Map();
  }

  // Get current entry or create new one (default Weakly Not Taken)
  const entry = predictor.table.get(pc) ?? { state: 1 as 0 | 1 | 2 | 3 };

  if (actualTaken) {
    // Move towards Strongly Taken (max 3)
    entry.state = Math.min(3, entry.state + 1) as 0 | 1 | 2 | 3;
  } else {
    // Move towards Strongly Not Taken (min 0)
    entry.state = Math.max(0, entry.state - 1) as 0 | 1 | 2 | 3;
  }

  // Update table
  predictor.table.set(pc, entry);
}

/**
 * Initialize a new branch predictor
 *
 * @param type - Predictor type
 * @param tableSize - Size of prediction table (for 2-bit predictor)
 * @returns Initialized branch predictor
 */
export function initializeBranchPredictor(
  type: 'static-taken' | 'static-not-taken' | '2-bit',
  tableSize: number = 64
): BranchPredictor {
  const predictor: BranchPredictor = {
    type,
  };

  if (type === '2-bit') {
    predictor.table = new Map();
    // Pre-allocate table entries not needed - will be created on demand
  }

  return predictor;
}

/**
 * Get human-readable predictor state for debugging/UI
 *
 * @param entry - Predictor entry
 * @returns String representation of state
 */
export function getPredictorStateString(entry: BranchPredictorEntry): string {
  const states = ['SNT', 'WNT', 'WT', 'ST'];
  return states[entry.state] || 'Unknown';
}
