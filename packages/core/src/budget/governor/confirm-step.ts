import { recordStutter } from "../../core/learning/record-stutter";
import type { BudgetState } from "../budget-state.types";
import { persistState } from "../decision/persist-state";

/**
 * A step down that stays. A retried effect that stutters again ends the
 * retries of the page. The stutter is recorded once per page, with the block
 * it replaces kept so a later in-page retry can undo it. Nothing is learned
 * while a tier is forced or a device simulated, nor for the explored effect,
 * which is off by threshold anyway.
 */
export function confirmStep(state: BudgetState, name: string): void {
  const { context, steps } = state;
  if (!context) return;
  if (steps.retry === name) {
    steps.retry = null;
    steps.hasRetryFailed = true;
  }
  const isRecorded = Object.keys(steps.recorded).includes(name);
  if (isRecorded || context.forced || context.simulated !== null || name === state.explored) return;
  steps.recorded[name] = context.stored.blocked[name] ?? null;
  context.stored = recordStutter(context.stored, name);
  persistState(state);
}
