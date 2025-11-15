import { SimulatorState } from "@/types/simulator";
import { selectForBroadcast, broadcast } from "./cdb";

/**
 * WriteBack Cycle - Broadcast result on CDB
 *
 * Algorithm:
 * 1. Select one FU with ready result (CDB is unique - only 1 broadcast/cycle)
 * 2. Broadcast {robTag, value} to:
 *    - ROB: Set value and ready flag
 *    - RS entries: Wake up waiters (replace Qj/Qk with Vj/Vk)
 * 3. Free the FU
 * 4. Mark instruction as "writeback"
 */
export function writeBackCycle(state: SimulatorState): SimulatorState {
  // Select a FU ready for broadcast
  const selected = selectForBroadcast(state);

  if (!selected) {
    // No FU ready for broadcast
    return state;
  }

  const { fuIndex, broadcast: broadcastData } = selected;

  // Broadcast on CDB
  let newState = broadcast(broadcastData, state);

  // Free the FU
  const newFunctionalUnits = [...newState.functionalUnits];
  newFunctionalUnits[fuIndex] = {
    ...newFunctionalUnits[fuIndex],
    busy: false,
    instructionId: undefined,
    cyclesRemaining: 0,
    totalCycles: 0,
    result: undefined,
    operation: undefined,
    vj: undefined,
    vk: undefined,
    address: undefined,
  };

  // Update instruction state
  const newInstructions = newState.instructions.map((inst) => {
    if (inst.id === broadcastData.instructionId) {
      return {
        ...inst,
        state: "writeback" as const,
        writebackTime: newState.cycle,
      };
    }
    return inst;
  });

  return {
    ...newState,
    functionalUnits: newFunctionalUnits,
    instructions: newInstructions,
  };
}
