import { SimulatorState, OperationType } from "@/types/simulator";
import { findFreeFunctionalUnit, getReservationStationType } from "./state-manager";
import { loadFromMemory } from "./memory";

// Operation latencies (in cycles)
const LATENCIES: Record<OperationType, number> = {
  ADD: 2,
  SUB: 2,
  MUL: 4,
  DIV: 8,
  LOAD: 3,
  STORE: 3,
  BEQ: 1,
  BNE: 1,
};

/**
 * Execute Cycle - Dispatch RS to FU and decrement counters
 *
 * Algorithm:
 * 1. Dispatch: Move ready RS entries (Qj==null && Qk==null) to FU
 * 2. Countdown: Decrement cyclesRemaining for busy FUs
 * 3. Complete: When counter hits 0, compute result
 */
export function executeCycle(state: SimulatorState): SimulatorState {
  let newState = { ...state };

  // Step 1: Dispatch ready RS entries to FUs
  newState = dispatchToFunctionalUnits(newState);

  // Step 2: Update functional units (decrement counters and compute results)
  newState = updateFunctionalUnits(newState);

  return newState;
}

/**
 * Dispatch ready reservation stations to functional units
 */
function dispatchToFunctionalUnits(state: SimulatorState): SimulatorState {
  const newReservationStations = [...state.reservationStations];
  const newFunctionalUnits = [...state.functionalUnits];
  const newInstructions = [...state.instructions];

  // Check each RS for readiness
  for (let rsIndex = 0; rsIndex < newReservationStations.length; rsIndex++) {
    const rs = newReservationStations[rsIndex];

    // Skip if not busy or already dispatched
    if (!rs.busy || rs.instructionId === undefined) {
      continue;
    }

    const instruction = newInstructions[rs.instructionId];
    if (!instruction || instruction.state !== "issued") {
      continue;
    }

    // Check if operands are ready (no waiting tags)
    const operandsReady = rs.qj === undefined && rs.qk === undefined;
    if (!operandsReady) {
      continue;
    }

    // Find free FU of the correct type
    const fuIndex = findFreeFunctionalUnit(rs.type, state);
    if (fuIndex === null) {
      continue; // No free FU, continue to next RS
    }

    // Dispatch to FU
    const latency = LATENCIES[rs.op!];

    newFunctionalUnits[fuIndex] = {
      ...newFunctionalUnits[fuIndex],
      busy: true,
      instructionId: rs.instructionId,
      cyclesRemaining: latency,
      totalCycles: latency,
      result: undefined,
      operation: rs.op,
      vj: rs.vj,
      vk: rs.vk,
      address: rs.address,
    };

    // Update instruction state
    newInstructions[rs.instructionId] = {
      ...instruction,
      state: "executing",
      execStartTime: state.cycle,
    };

    // Clear RS entry
    newReservationStations[rsIndex] = {
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

  return {
    ...state,
    reservationStations: newReservationStations,
    functionalUnits: newFunctionalUnits,
    instructions: newInstructions,
  };
}

/**
 * Update functional units - decrement counters and compute results
 */
function updateFunctionalUnits(state: SimulatorState): SimulatorState {
  const newFunctionalUnits = [...state.functionalUnits];
  const newInstructions = [...state.instructions];

  for (let fuIndex = 0; fuIndex < newFunctionalUnits.length; fuIndex++) {
    const fu = newFunctionalUnits[fuIndex];

    if (!fu.busy || fu.instructionId === undefined) {
      continue;
    }

    const instruction = newInstructions[fu.instructionId];
    if (!instruction) {
      continue;
    }

    // Decrement counter
    if (fu.cyclesRemaining > 0) {
      newFunctionalUnits[fuIndex] = {
        ...fu,
        cyclesRemaining: fu.cyclesRemaining - 1,
      };

      // Check if execution just completed
      if (fu.cyclesRemaining === 1) {
        // Compute result using FU's stored operands
        const result = computeResult(fu, state);

        newFunctionalUnits[fuIndex] = {
          ...newFunctionalUnits[fuIndex],
          result,
        };

        // Mark instruction as ready for writeback
        newInstructions[fu.instructionId] = {
          ...instruction,
          state: "ready",
          execEndTime: state.cycle,
        };
      }
    }
  }

  return {
    ...state,
    functionalUnits: newFunctionalUnits,
    instructions: newInstructions,
  };
}

/**
 * Compute result of an instruction using FU's stored operands
 */
function computeResult(fu: any, state: SimulatorState): number {
  const op = fu.operation;
  const vj = fu.vj ?? 0;
  const vk = fu.vk ?? 0;

  switch (op) {
    case "ADD":
      return vj + vk;

    case "SUB":
      return vj - vk;

    case "MUL":
      return vj * vk;

    case "DIV":
      return vk !== 0 ? Math.floor(vj / vk) : 0;

    case "LOAD": {
      const address = fu.address ?? 0;
      return loadFromMemory(address, state);
    }

    case "STORE":
      // Store doesn't produce a result, but we return the value to be stored
      return vj;

    case "BEQ":
    case "BNE":
      // Branch comparison result (0 = false, 1 = true)
      return vj === vk ? 1 : 0;

    default:
      return 0;
  }
}
