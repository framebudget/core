import { restoreBlock } from "../../core/learning/restore-block";
import { fromEntries } from "../../core/object/from-entries";
import type { StartContext } from "../../startup/startup.types";
import type { BudgetState } from "../budget-state.types";
import { persistState } from "../decision/persist-state";
import { recomputeDecision } from "../decision/recompute-decision";
import { restartStretch, unstep } from "./step-state";

/**
 * The retried effect held up: its block goes back to what it was before this
 * page, so a passing hitch is forgotten. A forced tier or a simulated device
 * changes nothing stored.
 */
function forgive(state: BudgetState, context: StartContext, name: string): void {
  const { steps } = state;
  steps.retry = null;
  restartStretch(steps);
  const isReal = !context.forced && context.simulated === null;
  if (!isReal || !Object.keys(steps.recorded).includes(name)) return;
  context.stored = restoreBlock(context.stored, name, steps.recorded[name] ?? null);
  steps.recorded = fromEntries(Object.entries(steps.recorded).filter(([recorded]) => recorded !== name));
  persistState(state);
}

/**
 * After a smooth stretch of windows: an in-page retry that held is forgiven;
 * otherwise the oldest step down not yet retried on this page is turned back
 * on once. If it stutters again, it is the governor's first suspect, and no
 * other effect is retried on this page. Nothing is retried after guesses that
 * did not help: a stutter of the retried effect could not be told apart.
 * Returns true when an effect came back on.
 */
export function settleStretch(state: BudgetState): boolean {
  const { context, steps } = state;
  if (!context) return false;
  if (steps.retry !== null) {
    forgive(state, context, steps.retry);
    return false;
  }
  if (steps.hasRetryFailed || steps.isHalted || context.forced) return false;
  const next = state.stepped.find((name) => !steps.retried.includes(name) && name !== state.explored);
  if (next === undefined) return false;
  steps.retry = next;
  steps.retried.push(next);
  restartStretch(steps);
  unstep(state.stepped, next);
  recomputeDecision(state, "governor");
  return true;
}

/**
 * A retry with no verdict after twice the stretch it needed (frames neither
 * smooth enough to forgive nor bad enough to strike out): it did not hold, so
 * the effect steps back down with its block, and nothing else is retried.
 * Returns true when it did.
 */
export function abandonRetry(state: BudgetState): boolean {
  const { steps } = state;
  const name = steps.retry;
  if (name === null) return false;
  steps.retry = null;
  steps.hasRetryFailed = true;
  restartStretch(steps);
  state.stepped.push(name);
  recomputeDecision(state, "governor");
  return true;
}
