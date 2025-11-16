import { SimulatorState, ReservationStation, FunctionalUnit, OperationType } from "@/types/simulator";

/**
 * Find a free reservation station of the specified type
 * @param type - Type of operation (ADD, MUL, LOAD, STORE)
 * @param state - Current simulator state
 * @returns Index of free RS or null if none available
 */
export function findFreeReservationStation(
  type: "ADD" | "MUL" | "LOAD" | "STORE",
  state: SimulatorState
): number | null {
  const index = state.reservationStations.findIndex(
    (rs) => rs.type === type && !rs.busy
  );
  return index >= 0 ? index : null;
}

/**
 * Find a free ROB entry
 * @param state - Current simulator state
 * @returns Index of free ROB entry or null if ROB is full
 */
export function findFreeROBEntry(state: SimulatorState): number | null {
  const nextTail = (state.robTail + 1) % state.rob.length;

  // ROB is full if advancing tail would hit head
  if (nextTail === state.robHead && state.rob[state.robHead].busy) {
    return null;
  }

  return state.robTail;
}

/**
 * Find a free functional unit of the specified type
 * @param type - Type of functional unit
 * @param state - Current simulator state
 * @returns Index of free FU or null if none available
 */
export function findFreeFunctionalUnit(
  type: "ADD" | "MUL" | "LOAD" | "STORE",
  state: SimulatorState
): number | null {
  const index = state.functionalUnits.findIndex(
    (fu) => fu.type === type && !fu.busy
  );
  return index >= 0 ? index : null;
}

/**
 * Get the value or ROB tag for a register
 * @param reg - Register name
 * @param state - Current simulator state
 * @returns Object with value and optional ROB tag
 */
export function getRegisterValue(
  reg: string,
  state: SimulatorState
): { value?: number; robTag?: number } {
  if (!reg || reg === "") {
    return { value: 0 };
  }

  // Check RAT for renaming
  const ratEntry = state.registerRenaming.find((r) => r.register === reg);

  if (ratEntry && ratEntry.robEntry !== undefined) {
    // Register is renamed - check if ROB entry has value ready
    const robEntry = state.rob[ratEntry.robEntry];
    if (robEntry && robEntry.ready && robEntry.value !== undefined) {
      return { value: robEntry.value };
    }
    // Value not ready - return ROB tag for waiting
    return { robTag: ratEntry.robEntry };
  }

  // No renaming - get from register file
  const value = state.registerFile.get(reg) ?? 0;
  return { value };
}

/**
 * Check if ROB is full
 * @param state - Current simulator state
 * @returns true if ROB is full
 */
export function isROBFull(state: SimulatorState): boolean {
  const nextTail = (state.robTail + 1) % state.rob.length;
  return nextTail === state.robHead && state.rob[state.robHead].busy;
}

/**
 * Check if an instruction can be issued
 * @param instructionId - ID of instruction to check
 * @param state - Current simulator state
 * @returns true if instruction can be issued
 */
export function canIssue(instructionId: number, state: SimulatorState): boolean {
  const instruction = state.instructions[instructionId];
  if (!instruction || instruction.state !== "idle") {
    return false;
  }

  // Check if ROB has space
  if (isROBFull(state)) {
    return false;
  }

  // Map operation to RS type
  const rsType = getReservationStationType(instruction.operation);

  // Check if appropriate RS is available
  const rsIndex = findFreeReservationStation(rsType, state);
  if (rsIndex === null) {
    return false;
  }

  return true;
}

/**
 * Map operation type to reservation station type
 * @param operation - Operation type
 * @returns Reservation station type
 */
export function getReservationStationType(
  operation: OperationType
): "ADD" | "MUL" | "LOAD" | "STORE" {
  switch (operation) {
    case "ADD":
    case "SUB":
    case "BEQ":
    case "BNE":
      return "ADD";
    case "MUL":
    case "DIV":
      return "MUL";
    case "LOAD":
      return "LOAD";
    case "STORE":
      return "STORE";
  }
}
