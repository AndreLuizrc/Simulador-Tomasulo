import { SimulatorState, CDBBroadcast } from "@/types/simulator";
import { collectReadyBroadcasts, broadcast } from "./cdb";

/**
 * WriteBack Cycle - Broadcast result on CDB with queue support
 *
 * Algorithm:
 * 1. Collect all ready FUs and add to queue (if not already queued)
 * 2. Pop one broadcast from queue (CDB is unique - only 1 broadcast/cycle)
 * 3. Broadcast {robTag, value} to:
 *    - ROB: Set value and ready flag
 *    - RS entries: Wake up waiters (replace Qj/Qk with Vj/Vk)
 * 4. Free the FU
 * 5. Mark instruction as "writeback"
 */
export function writeBackCycle(state: SimulatorState): SimulatorState {
  let newQueue = [...state.pendingBroadcasts];

  // Collect all ready FUs and add to queue (avoiding duplicates)
  const readyBroadcasts = collectReadyBroadcasts(state);
  const queuedInstructions = new Set(newQueue.map(b => b.instructionId));

  for (const ready of readyBroadcasts) {
    if (!queuedInstructions.has(ready.broadcast.instructionId)) {
      newQueue.push(ready.broadcast);
    }
  }

  // Pop one broadcast from queue (FIFO)
  const broadcastData = newQueue.shift();

  if (!broadcastData) {
    // No broadcasts available
    return { ...state, pendingBroadcasts: newQueue };
  }

  // Find the FU that produced this broadcast
  const fuIndex = state.functionalUnits.findIndex(
    fu => fu.instructionId === broadcastData.instructionId
  );

  // Broadcast on CDB
  let newState = broadcast(broadcastData, state);

  // Free the FU (if found)
  const newFunctionalUnits = [...newState.functionalUnits];
  if (fuIndex !== -1) {
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
  }

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
    pendingBroadcasts: newQueue, // Update the queue
  };
}
