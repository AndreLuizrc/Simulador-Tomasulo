import { SimulatorState, FunctionalUnit } from "@/types/simulator";

/**
 * CDB Broadcast data structure
 */
export interface CDBBroadcast {
  robTag: number;
  value: number;
  instructionId: number;
}

/**
 * Select a functional unit ready for broadcast
 * CDB constraint: only 1 broadcast per cycle
 * @param state - Current simulator state
 * @returns FU index and broadcast data, or null if none ready
 */
export function selectForBroadcast(
  state: SimulatorState
): { fuIndex: number; broadcast: CDBBroadcast } | null {
  // Find first FU with a ready instruction
  for (let i = 0; i < state.functionalUnits.length; i++) {
    const fu = state.functionalUnits[i];

    if (fu.busy && fu.cyclesRemaining === 0 && fu.result !== undefined && fu.instructionId !== undefined) {
      const instruction = state.instructions[fu.instructionId];

      if (instruction && instruction.state === "ready" && instruction.robEntry !== undefined) {
        return {
          fuIndex: i,
          broadcast: {
            robTag: instruction.robEntry,
            value: fu.result,
            instructionId: fu.instructionId,
          },
        };
      }
    }
  }

  return null;
}

/**
 * Broadcast result on CDB and update all dependent structures
 * @param broadcast - Broadcast data
 * @param state - Current simulator state
 * @returns Updated state
 */
export function broadcast(
  broadcast: CDBBroadcast,
  state: SimulatorState
): SimulatorState {
  const { robTag, value } = broadcast;

  // 1. Update ROB entry
  const newRob = state.rob.map((entry, idx) => {
    if (idx === robTag) {
      return {
        ...entry,
        value,
        ready: true,
      };
    }
    return entry;
  });

  // 2. Wake up waiting RS entries
  const newReservationStations = state.reservationStations.map((rs) => {
    let updatedRs = { ...rs };

    // Check Qj
    if (rs.qj === `ROB${robTag}`) {
      updatedRs.vj = value;
      updatedRs.qj = undefined;
    }

    // Check Qk
    if (rs.qk === `ROB${robTag}`) {
      updatedRs.vk = value;
      updatedRs.qk = undefined;
    }

    return updatedRs;
  });

  return {
    ...state,
    rob: newRob,
    reservationStations: newReservationStations,
  };
}
