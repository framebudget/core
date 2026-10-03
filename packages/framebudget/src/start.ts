import { createKernels, runBenchmark, type BenchOptions, type BenchResult } from "./bench";
import {
  calibrationKey,
  defaultCalibration,
  mergeCalibration,
  type Calibration,
  type CalibrationPatch,
} from "./calibration";
import { clock, safe, type Scope, type ScoreSource } from "./env";
import { readForcedTier, readSimulatedScore } from "./force";
import { readHints, type Hints } from "./hints";
import { loadState, openStorage, type StoredState } from "./storage";
import type { Tier } from "./tiers";

/** Shared by the boot script and the core, so both reach the same first decision. */
export interface StartContext {
  storage: Storage | null;
  stored: StoredState;
  cal: Calibration;
  hints: Hints;
  forced: Tier | null;
  /** Debug and demo: a score that replaces the measured one for the session. */
  simulated: number | null;
}

/** Calibration precedence: built-in numbers, then the fetched calibration, then the site's patches in order. */
export function loadContext(scope: Scope, patches: readonly (CalibrationPatch | undefined)[]): StartContext {
  const storage = openStorage(scope, "localStorage");
  const stored = loadState(storage);
  return {
    storage,
    stored,
    cal: mergeCalibration(defaultCalibration, stored.remote, ...patches),
    hints: readHints(scope),
    forced: readForcedTier(scope),
    simulated: readSimulatedScore(scope),
  };
}

/** Slice budget of the cold run; alignment and setup bring the boot script to about 2 ms. */
export const COLD_MS = 1.6;

export function benchOptions(scope: Scope, cal: Calibration, budgetMs: number, warm: boolean): BenchOptions {
  return {
    now: clock(scope),
    kernels: createKernels(scope),
    reference: warm ? cal.reference : cal.coldReference,
    budgetMs,
    sliceMs: warm ? 0.75 : 0.1,
    maxRounds: warm ? 5 : 4,
    maxTickMs: warm ? 2 : 1,
  };
}

/** The cached warm score, when it is recent and in the same units. */
export function cachedScore(ctx: StartContext, nowMs: number): number | undefined {
  const s = ctx.stored;
  const fresh = s.at !== undefined && nowMs - s.at < ctx.cal.scoreMaxAgeDays * 86400000;
  return s.score !== undefined && fresh && s.key === calibrationKey(ctx.cal) ? s.score : undefined;
}

/**
 * The measured score for the first decision: a recent warm score from an earlier page
 * beats a cold measurement, a forced tier skips the benchmark (the tier does
 * not need a score), and a clock too coarse to measure falls back to the
 * calibration's fallback score.
 */
export function initialScore(
  scope: Scope,
  ctx: StartContext,
  coldMs: number,
): { score: number; source: ScoreSource; cold: BenchResult | null } {
  const cached = cachedScore(ctx, Date.now());
  if (cached !== undefined) return { score: cached, source: "cached", cold: null };
  if (ctx.forced) return { score: ctx.cal.fallbackScore, source: "fallback", cold: null };
  const cold = safe(() => runBenchmark(benchOptions(scope, ctx.cal, coldMs, false))) || null;
  return cold
    ? { score: cold.score, source: "cold", cold }
    : { score: ctx.cal.fallbackScore, source: "fallback", cold: null };
}

export const TIER_ATTRIBUTE = "data-framebudget";
export const EFFECTS_ATTRIBUTE = "data-framebudget-effects";

/** Exposes the decision to CSS: `html[data-framebudget-effects~="parallax"]`. */
export function applyToDocument(scope: Scope, tier: Tier, effects: readonly string[]): void {
  const root = safe(() => scope.document && scope.document.documentElement);
  if (!root) return;
  safe(() => {
    root.setAttribute(TIER_ATTRIBUTE, tier);
    root.setAttribute(EFFECTS_ATTRIBUTE, effects.join(" "));
  });
}
