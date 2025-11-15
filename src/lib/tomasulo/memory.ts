import { SimulatorState } from "@/types/simulator";

/**
 * Calculate memory address for LOAD/STORE operations
 * @param base - Base register name (empty for direct addressing)
 * @param offset - Immediate offset value
 * @param state - Current simulator state
 * @returns Calculated address
 */
export function calculateAddress(
  base: string,
  offset: number,
  state: SimulatorState
): number {
  if (!base || base === "") {
    // Direct addressing
    return offset;
  }

  // Base + offset addressing
  const baseValue = state.registerFile.get(base) ?? 0;
  return baseValue + offset;
}

/**
 * Load value from memory
 * @param address - Memory address
 * @param state - Current simulator state
 * @returns Value at address (0 if not initialized)
 */
export function loadFromMemory(address: number, state: SimulatorState): number {
  return state.memory.get(address) ?? 0;
}

/**
 * Store value to memory (only called at commit)
 * @param address - Memory address
 * @param value - Value to store
 * @param state - Current simulator state
 * @returns Updated state
 */
export function storeToMemory(
  address: number,
  value: number,
  state: SimulatorState
): SimulatorState {
  const newMemory = new Map(state.memory);
  newMemory.set(address, value);

  return {
    ...state,
    memory: newMemory,
  };
}
