import type { BudgetState } from "../budget-state.types";

/** Frames per second per source, or none before the governor starts. */
export function currentFps(state: BudgetState): Record<string, number> {
  return state.governor ? state.governor.fps() : {};
}

/** Fraction of late frames per source, or none before the governor starts. */
export function currentLate(state: BudgetState): Record<string, number> {
  return state.governor ? state.governor.late() : {};
}

/** The used effects that are effects of the calibration, in registry order. */
export function usedEffects(state: BudgetState, effects: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(effects).filter((name) => state.used.has(name));
}
