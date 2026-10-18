import type { BudgetState } from "../budget-state.types";

/** Frames per second per source, or none before the governor starts. */
export function currentFps(state: BudgetState): Record<string, number> {
  return state.governor ? state.governor.fps() : {};
}

/** Fraction of late frames per source, or none before the governor starts. */
export function currentLate(state: BudgetState): Record<string, number> {
  return state.governor ? state.governor.late() : {};
}

/**
 * The effects the page used that the calibration knows, in registry order.
 * Unknown names (a typo, an effect registered later) do not count.
 */
export function pageUses(state: BudgetState): string[] {
  return Object.keys(state.context?.calibration.effects ?? {}).filter((name) => state.used.has(name));
}
