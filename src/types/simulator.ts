export type InstructionState = 
  | "idle"
  | "issued"
  | "executing"
  | "ready"
  | "writeback"
  | "committed"
  | "flushed"
  | "speculative";

export type OperationType = "ADD" | "SUB" | "MUL" | "DIV" | "LOAD" | "STORE" | "BEQ" | "BNE";

export interface Instruction {
  id: number;
  text: string;
  operation: OperationType;
  dest: string;
  src1: string;
  src2: string;
  immediate?: number;
  state: InstructionState;
  issueTime?: number;
  execStartTime?: number;
  execEndTime?: number;
  writebackTime?: number;
  commitTime?: number;
  isSpeculative: boolean;
  speculativeDepth?: number; // Nested speculation depth
  robEntry?: number;
}

export interface ReservationStation {
  name: string;
  type: "ADD" | "MUL" | "LOAD" | "STORE";
  busy: boolean;
  op?: OperationType;
  vj?: number;
  vk?: number;
  qj?: string;
  qk?: string;
  dest?: string;
  address?: number;
  instructionId?: number;
}

export interface FunctionalUnit {
  name: string;
  type: "ADD" | "MUL" | "LOAD" | "STORE";
  busy: boolean;
  instructionId?: number;
  cyclesRemaining: number;
  totalCycles: number;
  result?: number;
  operation?: OperationType;
  vj?: number;
  vk?: number;
  address?: number;
}

export interface ROBEntry {
  index: number;
  busy: boolean;
  instructionId?: number;
  type?: "ALU" | "LOAD" | "STORE" | "BRANCH";
  destination?: string;
  value?: number;
  ready: boolean;
  isSpeculative: boolean;
  branchCheckpointId?: number; // Which branch caused speculation
  address?: number; // Computed memory address for LOAD/STORE
}

export interface RegisterRenaming {
  register: string;
  robEntry?: number;
  value?: number;
}

export interface BranchPrediction {
  instructionId: number;
  pc: number;
  predicted: boolean;
  actual?: boolean;
  resolved: boolean;
}

export interface BranchPredictorEntry {
  state: 0 | 1 | 2 | 3; // 0=SNT, 1=WNT, 2=WT, 3=ST (2-bit saturating counter)
}

export interface BranchPredictor {
  type: 'static-taken' | 'static-not-taken' | '2-bit';
  table?: Map<number, BranchPredictorEntry>; // PC → state (for 2-bit predictor)
}

export interface BranchCheckpoint {
  id: number;
  instructionId: number;
  pc: number;
  ratSnapshot: RegisterRenaming[];
  robTailSnapshot: number;
  predictedTaken: boolean;
  predictedTarget: number;
  resolved: boolean;
  correct?: boolean;
}

export interface CDBBroadcast {
  robTag: number;
  value: number;
  instructionId: number;
}

export interface SimulatorState {
  instructions: Instruction[];
  reservationStations: ReservationStation[];
  functionalUnits: FunctionalUnit[];
  rob: ROBEntry[];
  robHead: number;
  robTail: number;
  registerFile: Map<string, number>;
  registerRenaming: RegisterRenaming[];
  memory: Map<number, number>;
  cycle: number;
  instructionsCommitted: number;
  branchPredictions: BranchPrediction[];
  speculationEnabled: boolean;
  isPaused: boolean;
  pendingBroadcasts: CDBBroadcast[]; // Queue for multiple FUs ready in same cycle
  // Speculation fields
  branchCheckpoints: BranchCheckpoint[];
  nextCheckpointId: number;
  pc: number; // Program counter
  branchPredictor: BranchPredictor;
  // Branch metrics
  branchesExecuted: number;
  branchCorrect: number;
  mispredictionCount: number;
  flushCount: number;
  // New stall metrics
  issueStalls: number;
  dataHazardStalls: number;
  structuralHazardStalls: number;
  cyclesWithAnyStall: number; // New metric for cycles where at least one stall occurred
}

export interface SimulatorMetrics {
  cycle: number;
  instructionsCommitted: number;
  ipc: number;
  stallCycles: number; // This will now reflect cyclesWithAnyStall
  flushCount: number;
  issueStalls: number;
  dataHazardStalls: number;
  structuralHazardStalls: number;
  cyclesWithAnyStall: number;
  branchAccuracy: number;
}
