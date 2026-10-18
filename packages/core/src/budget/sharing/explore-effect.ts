import { exploreCandidates } from "../../core/telemetry/explore-candidates";
import type { ShareOptions } from "../../core/telemetry/telemetry.types";
import type { BudgetState } from "../budget-state.types";
import { pageInput } from "../decision/decide-for-page";
import { recomputeDecision } from "../decision/recompute-decision";

/** Only a real device in automatic mode explores, and only when the site set a positive rate. */
function canExplore(state: BudgetState, rate: number | undefined): rate is number {
  const { context } = state;
  return !!context && !context.forced && context.simulated === null && typeof rate === "number" && rate > 0;
}

/**
 * A sampled page view that rolls under `share.explore` turns on one effect a
 * little below its threshold, picked at random, so calibration sees how such
 * devices do. Never while a tier is forced or a device simulated.
 */
export function exploreEffect(state: BudgetState, share: ShareOptions): void {
  const rate = share.explore;
  const { context, decision, score } = state;
  if (!context || !decision || score === null || !canExplore(state, rate)) return;
  const random = state.init.random ?? Math.random;
  if (random() >= rate) return;
  const input = pageInput(state, context, score, decision.qualified);
  const candidates = exploreCandidates(input, decision, [...state.used]);
  const picked = candidates[Math.floor(random() * candidates.length)];
  if (picked === undefined) return;
  state.explored = picked;
  recomputeDecision(state, "explore");
}
