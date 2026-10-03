import { isValidScore } from "../core/score/is-valid-score";
import type { Tier } from "../core/tier/tier.enum";
import { writeForcedTier } from "../platform/overrides/forced-tier";
import { writeSimulatedScore } from "../platform/overrides/simulated-score";
import type { BudgetState } from "./budget-state.types";
import { recomputeDecision } from "./recompute-decision";

export function forceTier(state: BudgetState, tier: Tier | "auto"): void {
  const { scope, context } = state;
  if (!scope || !context) return;
  writeForcedTier(scope, tier);
  context.forced = tier === "auto" ? null : tier;
  recomputeDecision(state, "force");
}

/** Takes `unknown` because plain JavaScript callers can pass anything. */
export function assertSimulatedScore(value: unknown): void {
  if (value !== null && !(typeof value === "number" && isValidScore(value))) {
    throw new RangeError("framebudget: simulate() takes a score of 0 or more, or null");
  }
}

export function simulateScore(state: BudgetState, value: number | null): void {
  const { scope, context } = state;
  if (!scope || !context) return;
  writeSimulatedScore(scope, value);
  context.simulated = value;
  state.stepped.length = 0; // each simulated device starts fresh
  recomputeDecision(state, "simulate", true);
}
