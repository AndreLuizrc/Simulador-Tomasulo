import { RegisterRenaming } from "@/types/simulator";

/**
 * Update RAT to map a register to a ROB entry
 * @param rat - Current RAT
 * @param register - Register name
 * @param robTag - ROB entry index
 * @returns Updated RAT
 */
export function updateRAT(
  rat: RegisterRenaming[],
  register: string,
  robTag: number
): RegisterRenaming[] {
  const newRat = [...rat];
  const existingIndex = newRat.findIndex((entry) => entry.register === register);

  if (existingIndex >= 0) {
    newRat[existingIndex] = { register, robEntry: robTag };
  } else {
    newRat.push({ register, robEntry: robTag });
  }

  return newRat;
}

/**
 * Get RAT entry for a register
 * @param rat - Current RAT
 * @param register - Register name
 * @returns ROB tag or undefined if not renamed
 */
export function getRATEntry(
  rat: RegisterRenaming[],
  register: string
): number | undefined {
  const entry = rat.find((r) => r.register === register);
  return entry?.robEntry;
}

/**
 * Clear RAT entry for a register
 * @param rat - Current RAT
 * @param register - Register name
 * @returns Updated RAT
 */
export function clearRAT(
  rat: RegisterRenaming[],
  register: string
): RegisterRenaming[] {
  return rat.filter((entry) => entry.register !== register);
}

/**
 * Create a snapshot of the current RAT
 * @param rat - Current RAT
 * @returns Deep copy of RAT
 */
export function snapshotRAT(rat: RegisterRenaming[]): RegisterRenaming[] {
  return rat.map((entry) => ({ ...entry }));
}

/**
 * Restore RAT from a snapshot
 * @param snapshot - Saved RAT snapshot
 * @returns Restored RAT
 */
export function restoreRAT(snapshot: RegisterRenaming[]): RegisterRenaming[] {
  return snapshot.map((entry) => ({ ...entry }));
}

/**
 * Clear RAT entry if it still points to a specific ROB tag
 * @param rat - Current RAT
 * @param register - Register name
 * @param robTag - ROB entry to check
 * @returns Updated RAT
 */
export function clearRATIfMatches(
  rat: RegisterRenaming[],
  register: string,
  robTag: number
): RegisterRenaming[] {
  const entry = rat.find((r) => r.register === register);

  if (entry && entry.robEntry === robTag) {
    return clearRAT(rat, register);
  }

  return rat;
}
