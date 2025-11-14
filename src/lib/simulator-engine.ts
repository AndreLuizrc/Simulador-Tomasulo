import { SimulatorState, Instruction, ReservationStation, FunctionalUnit, ROBEntry, OperationType } from "@/types/simulator";

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
  };
}

export function stepCycle(state: SimulatorState): SimulatorState {
  const newState = { ...state, cycle: state.cycle + 1 };
  
  // Simplified cycle step - in a real implementation, this would:
  // 1. Try to commit from ROB head
  // 2. Update functional units (decrement cycles)
  // 3. Try to issue new instructions to RS
  // 4. Handle branch resolution and speculation
  
  return newState;
}

export function resetSimulator(): SimulatorState {
  return createInitialState();
}
