import { isValidScore } from "../../core/score/is-valid-score";
import type { Tier } from "../../core/tier/tier.enum";
import { writeForcedTier } from "../../platform/overrides/forced-tier";
import { writeSimulatedScore } from "../../platform/overrides/simulated-score";
import type { BudgetState } from "../budget-state.types";
import { recomputeDecision } from "../decision/recompute-decision";
import { dropChecks } from "../governor/step-state";

/** A forced tier replaces the device, so what the governor was checking says nothing anymore. */
export function forceTier(state: BudgetState, tier: Tier | "auto"): void {
  const { scope, context } = state;
  if (!scope || !context) return;
  writeForcedTier(scope, tier);
  context.forced = tier === "auto" ? null : tier;
  dropChecks(state);
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
  // Each simulated device starts fresh: no step down, check, retry or halt carries over.
  dropChecks(state);
  state.stepped.length = 0;
  Object.assign(state.steps, { isHalted: false, retried: [], hasRetryFailed: false });
  recomputeDecision(state, "simulate", true);
}
