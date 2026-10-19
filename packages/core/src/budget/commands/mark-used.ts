import type { BudgetState } from "../budget-state.types";
import { recomputeDecision } from "../decision/recompute-decision";

/** Whether `name` is an effect of the page's calibration (own keys only). */
export function isEffect(state: BudgetState, name: string): boolean {
  return !!state.context && Object.prototype.hasOwnProperty.call(state.context.calibration.effects, name);
}

/**
 * Records that the page uses an effect. With a capacity, a new use can let
 * more effects run, so the decision is made again once the current task's
 * synchronous work ends: never inside allows(), which React calls while rendering.
 */
export function markUsed(state: BudgetState, name: string): void {
  if (state.used.has(name)) return;
  state.used.add(name);
  const capacity = state.context?.calibration.capacity ?? 0;
  if (!(capacity > 0) || state.isCapacityPending) return;
  state.isCapacityPending = true;
  void Promise.resolve().then(() => {
    state.isCapacityPending = false;
    recomputeDecision(state, "capacity");
  });
}
