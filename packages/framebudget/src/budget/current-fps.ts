import type { BudgetState } from "./budget-state.types";

/** Median frames per second per source, or none before the governor starts. */
export function currentFps(state: BudgetState): Record<string, number> {
  return state.governor ? state.governor.fps() : {};
}
