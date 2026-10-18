import { recordCleanVisit } from "../../core/learning/record-clean-visit";
import type { BudgetState } from "../budget-state.types";
import { persistState } from "../decision/persist-state";
import { settleStretch } from "./in-page-retry";

/** Share of good windows that makes a stretch smooth. A few bad windows (a hitch, a slow scroll) do not spoil it. */
const SMOOTH_SHARE = 0.8;

/** Enough windows judged, and most of them good. */
function isSmooth(judged: number, good: number, needed: number): boolean {
  return judged >= needed && good >= judged * SMOOTH_SHARE;
}

/** The visit ran smoothly: blocked effects that ran held up and are forgotten, the others come closer to a retry. */
function markCleanVisit(state: BudgetState): void {
  const { context, decision } = state;
  if (!context || !decision || context.forced || context.simulated !== null) return;
  const ran = state.used.size > 0 ? decision.effects.filter((name) => state.used.has(name)) : decision.effects;
  context.stored = recordCleanVisit(context.stored, ran);
  persistState(state);
}

/**
 * Governor hook: a window was judged. Outside a trial, a smooth stretch
 * settles an in-page retry, and a visit with enough smooth windows and no
 * effect stepped down is clean, once.
 */
export function countWindow(state: BudgetState, cleanWindows: number, isGood: boolean): void {
  const { steps } = state;
  steps.judged += 1;
  steps.recentJudged += 1;
  if (isGood) {
    steps.good += 1;
    steps.recentGood += 1;
  }
  if (steps.trial.length > 0) return;
  if (isSmooth(steps.recentJudged, steps.recentGood, cleanWindows)) settleStretch(state);
  if (steps.isCleanMarked || state.stepped.length > 0 || !isSmooth(steps.judged, steps.good, cleanWindows)) return;
  steps.isCleanMarked = true;
  markCleanVisit(state);
}
