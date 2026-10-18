import { restoreBlock } from "../../core/learning/restore-block";
import { fromEntries } from "../../core/object/from-entries";
import type { StartContext } from "../../startup/startup.types";
import type { BudgetState } from "../budget-state.types";
import { persistState } from "../decision/persist-state";
import { recomputeDecision } from "../decision/recompute-decision";
import { restartStretch, unstep } from "./step-state";

/**
 * The retried effect held up: its block goes back to what it was before this
 * page, so a passing hitch is forgotten. A simulated device changes nothing stored.
 */
function forgive(state: BudgetState, context: StartContext, name: string): void {
  const { steps } = state;
  steps.retry = null;
  restartStretch(steps);
  if (context.simulated !== null || !Object.keys(steps.recorded).includes(name)) return;
  context.stored = restoreBlock(context.stored, name, steps.recorded[name] ?? null);
  steps.recorded = fromEntries(Object.entries(steps.recorded).filter(([recorded]) => recorded !== name));
  persistState(state);
}

/**
 * After a smooth stretch of windows: an in-page retry that held is forgiven;
 * otherwise the oldest step down not yet retried on this page is turned back
 * on once. If it stutters again, it is the governor's first suspect, and no
 * other effect is retried on this page.
 */
export function settleStretch(state: BudgetState): void {
  const { context, steps } = state;
  if (!context) return;
  if (steps.retry !== null) {
    forgive(state, context, steps.retry);
    return;
  }
  if (steps.hasRetryFailed) return;
  const next = state.stepped.find((name) => !steps.retried.includes(name) && name !== state.explored);
  if (next === undefined) return;
  steps.retry = next;
  steps.retried.push(next);
  restartStretch(steps);
  unstep(state.stepped, next);
  recomputeDecision(state, "governor");
}
