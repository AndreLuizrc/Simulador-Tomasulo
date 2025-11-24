import { SimulatorState, Instruction, ReservationStation, FunctionalUnit, ROBEntry, OperationType } from "@/types/simulator";
import { issueCycle } from "./tomasulo/issue-cycle";
import { executeCycle } from "./tomasulo/execute-cycle";
import { writeBackCycle } from "./tomasulo/writeback-cycle";
import { commitCycle } from "./tomasulo/commit-cycle";

const LATENCIES: Record<string, number> = {
  ADD: 2,
  SUB: 2,
  MUL: 4,
  DIV: 8,
  LOAD: 3,
  STORE: 3,
  BEQ: 1,
  BNE: 1,
};

export function createInitialState(): SimulatorState {
  // Sample MIPS program
  const sampleInstructions: Instruction[] = [
    { id: 0, text: "LOAD R1, 0", operation: "LOAD", dest: "R1", src1: "", src2: "", immediate: 0, state: "idle", isSpeculative: false },
    { id: 1, text: "LOAD R2, 4", operation: "LOAD", dest: "R2", src1: "", src2: "", immediate: 4, state: "idle", isSpeculative: false },
    { id: 2, text: "ADD R3, R1, R2", operation: "ADD", dest: "R3", src1: "R1", src2: "R2", state: "idle", isSpeculative: false },
    { id: 3, text: "MUL R4, R3, R1", operation: "MUL", dest: "R4", src1: "R3", src2: "R1", state: "idle", isSpeculative: false },
    { id: 4, text: "SUB R5, R4, R2", operation: "SUB", dest: "R5", src1: "R4", src2: "R2", state: "idle", isSpeculative: false },
    { id: 5, text: "STORE R5, 8", operation: "STORE", dest: "", src1: "R5", src2: "", immediate: 8, state: "idle", isSpeculative: false },
  ];

  const reservationStations: ReservationStation[] = [
    { name: "Add1", type: "ADD", busy: false },
    { name: "Add2", type: "ADD", busy: false },
    { name: "Mul1", type: "MUL", busy: false },
    { name: "Mul2", type: "MUL", busy: false },
    { name: "Load1", type: "LOAD", busy: false },
    { name: "Load2", type: "LOAD", busy: false },
    { name: "Store1", type: "STORE", busy: false },
  ];

  const functionalUnits: FunctionalUnit[] = [
    { name: "AddUnit1", type: "ADD", busy: false, cyclesRemaining: 0, totalCycles: 0 },
    { name: "MulUnit1", type: "MUL", busy: false, cyclesRemaining: 0, totalCycles: 0 },
    { name: "LoadUnit1", type: "LOAD", busy: false, cyclesRemaining: 0, totalCycles: 0 },
    { name: "StoreUnit1", type: "STORE", busy: false, cyclesRemaining: 0, totalCycles: 0 },
  ];

  const rob: ROBEntry[] = Array.from({ length: 8 }, (_, i) => ({
    index: i,
    busy: false,
    ready: false,
    isSpeculative: false,
  }));

  const registerFile = new Map<string, number>();
  ["R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7"].forEach(reg => registerFile.set(reg, 0));

  const memory = new Map<number, number>();
  memory.set(0, 5);
  memory.set(4, 3);

  return {
    instructions: sampleInstructions,
    reservationStations,
    functionalUnits,
    rob,
    robHead: 0,
    robTail: 0,
    registerFile,
    registerRenaming: [],
    memory,
    cycle: 0,
    instructionsCommitted: 0,
    branchPredictions: [],
    speculationEnabled: true,
    isPaused: false,
    pendingBroadcasts: [],
    // Speculation fields
    branchCheckpoints: [],
    nextCheckpointId: 0,
    pc: 0,
    branchPredictor: {
      type: '2-bit',
      table: new Map(),
    },
    // Branch metrics
    branchesExecuted: 0,
    branchCorrect: 0,
    mispredictionCount: 0,
    flushCount: 0,
    // Initialize new stall metrics
    issueStalls: 0,
    dataHazardStalls: 0,
    structuralHazardStalls: 0,
    cyclesWithAnyStall: 0, // Initialize new metric
  };
}

// Interfaces para os resultados dos ciclos
interface CycleResult {
  state: SimulatorState;
  stallOccurredThisCycle: boolean;
}

// Modifique issueCycle para retornar um indicador de stall
// Modifique executeCycle para retornar um indicador de stall

export function stepCycle(state: SimulatorState): SimulatorState {
  let newState = { ...state };
  let currentCycleStallOccurred = false;
  let preCommitFlushCount = newState.flushCount; // Capture flushCount before commit

  // 1. Commit (in-order retirement from ROB head)
  newState = commitCycle(newState);

  // Check if a flush occurred during commit (e.g., branch misprediction resolved)
  if (newState.flushCount > preCommitFlushCount) {
    currentCycleStallOccurred = true;
  }

  // 2. WriteBack (CDB broadcast to ROB and RS)
  newState = writeBackCycle(newState);

  // 3. Execute (FU processing and countdown)
  const executeResult = executeCycle(newState);
  newState = executeResult.state;
  if (executeResult.dataHazardOccurred || executeResult.structuralHazardOccurred) {
    currentCycleStallOccurred = true;
  }

  // 4. Issue (dispatch new instructions to RS and ROB)
  const issueResult = issueCycle(newState);
  newState = issueResult.state;
  if (issueResult.issueStallOccurred) {
    currentCycleStallOccurred = true;
  }

  // Increment cyclesWithAnyStall if any stall occurred this cycle
  if (currentCycleStallOccurred) {
    newState = { ...newState, cyclesWithAnyStall: newState.cyclesWithAnyStall + 1 };
  }

  // 5. Increment cycle counter
  newState = {
    ...newState,
    cycle: newState.cycle + 1,
  };

  return newState;
}

export function resetSimulator(): SimulatorState {
  return createInitialState();
}

/**
 * Calculate branch prediction accuracy
 * @param state - Current simulator state
 * @returns Branch accuracy as a percentage (0-1)
 */
export function getBranchAccuracy(state: SimulatorState): number {
  if (state.branchesExecuted === 0) {
    return 1.0; // No branches executed yet, 100% accuracy
  }
  return state.branchCorrect / state.branchesExecuted;
}

/**
 * Get comprehensive simulator metrics
 * @param state - Current simulator state
 * @returns Metrics object for display
 */
export function getSimulatorMetrics(state: SimulatorState): {
  cycle: number;
  instructionsCommitted: number;
  ipc: number;
  stallCycles: number;
  flushCount: number;
  issueStalls: number;
  dataHazardStalls: number;
  structuralHazardStalls: number;
  cyclesWithAnyStall: number; // Add to return type
  branchAccuracy: number;
} {
  const ipc = state.cycle > 0 ? state.instructionsCommitted / state.cycle : 0;
  const branchAccuracy = getBranchAccuracy(state);

  // The primary stallCycles metric now reflects cyclesWithAnyStall
  // Individual stall types are still returned for detailed analysis.
  const totalStallCycles = state.cyclesWithAnyStall;

  return {
    cycle: state.cycle,
    instructionsCommitted: state.instructionsCommitted,
    ipc: Math.max(0, ipc),
    stallCycles: totalStallCycles,
    flushCount: state.flushCount,
    issueStalls: state.issueStalls,
    dataHazardStalls: state.dataHazardStalls,
    structuralHazardStalls: state.structuralHazardStalls,
    cyclesWithAnyStall: state.cyclesWithAnyStall, // Return the new metric
    branchAccuracy,
  };
}
