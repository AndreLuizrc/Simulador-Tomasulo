import { SimulatorState, OperationType } from "@/types/simulator";
import { findFreeFunctionalUnit, getReservationStationType } from "./state-manager";
import { loadFromMemory } from "./memory";
import { findCheckpoint, resolveCheckpoint } from "./checkpoint";

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
export function executeCycle(state: SimulatorState): { state: SimulatorState; dataHazardOccurred: boolean; structuralHazardOccurred: boolean; } {
  let newState = { ...state };
  let dataHazardOccurredThisCycle = false;
  let structuralHazardOccurredThisCycle = false;

  // Step 1: Dispatch ready RS entries to FUs
  const dispatchResult = dispatchToFunctionalUnits(newState);
  newState = dispatchResult.state;
  dataHazardOccurredThisCycle = dispatchResult.dataHazardOccurred;
  structuralHazardOccurredThisCycle = dispatchResult.structuralHazardOccurred;

  // Step 2: Update functional units (decrement counters and compute results)
  newState = updateFunctionalUnits(newState);

  // No longer incrementing stalls here. Stalls are accumulated in stepCycle.

  return {
    state: newState,
    dataHazardOccurred: dataHazardOccurredThisCycle,
    structuralHazardOccurred: structuralHazardOccurredThisCycle,
  };
}

/**
 * Dispatch ready reservation stations to functional units
 * Returns the new state and flags if data/structural hazards occurred this cycle.
 */
function dispatchToFunctionalUnits(state: SimulatorState): {
  state: SimulatorState;
  dataHazardOccurred: boolean;
  structuralHazardOccurred: boolean;
} {
  const newReservationStations = [...state.reservationStations];
  const newFunctionalUnits = [...state.functionalUnits];
  const newInstructions = [...state.instructions];

  let dataHazardOccurred = false;
  let structuralHazardOccurred = false;

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
      // Data hazard stall occurred in this cycle for at least one RS
      dataHazardOccurred = true;
      continue; // This RS is stalled, move to next
    }

    // Guard against double-dispatch if already bound
    const alreadyBound = newFunctionalUnits.some((fu) => fu.instructionId ===
    rs.instructionId);
    if (alreadyBound) {
      continue;
    }

    const fuIndex = newFunctionalUnits.findIndex((fu) => fu.type === rs.type && !fu.busy);
    if (fuIndex === -1) {
      // Structural hazard stall occurred in this cycle for at least one RS
      structuralHazardOccurred = true;
      continue; // No free FU, move to next RS
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
    state: {
      ...state,
      reservationStations: newReservationStations,
      functionalUnits: newFunctionalUnits,
      instructions: newInstructions,
    },
    dataHazardOccurred,
    structuralHazardOccurred,
  };
}

/**
 * Update functional units - decrement counters and compute results
 */
function updateFunctionalUnits(state: SimulatorState): SimulatorState {
  let newState = { ...state };
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

        // Branch resolution
        if (instruction.operation === "BEQ" || instruction.operation === "BNE") {
          const checkpoint = findCheckpoint(instruction.id, newState);

          if (checkpoint && !checkpoint.resolved) {
            // Determine actual branch outcome
            const vj = fu.vj ?? 0;
            const vk = fu.vk ?? 0;
            const actualTaken =
              instruction.operation === "BEQ" ? vj === vk : vj !== vk;

            // Calculate actual target
            const branchTarget =
              (checkpoint.pc) + (instruction.immediate ?? 1);
            const fallthrough = checkpoint.pc + 1;
            const actualTarget = actualTaken ? branchTarget : fallthrough;

            // Check if prediction was correct
            const predictionCorrect =
              checkpoint.predictedTaken === actualTaken &&
              checkpoint.predictedTarget === actualTarget;

            // Mark checkpoint as resolved
            newState = resolveCheckpoint(
              checkpoint.id,
              predictionCorrect,
              newState
            );
          }
        }
      }
    }
  }

  return {
    ...newState,
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
