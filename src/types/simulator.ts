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
}

export interface SimulatorMetrics {
  cycle: number;
  instructionsCommitted: number;
  ipc: number;
  stallCycles: number;
  flushCount: number;
  branchAccuracy: number;
}
