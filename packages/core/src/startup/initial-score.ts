import { createKernels } from "../benchmark/kernels/create-kernels";
import { runBenchmark } from "../benchmark/run-benchmark";
import { safe } from "../platform/scope/safe";
import type { Scope } from "../platform/scope/scope.types";
import { benchSettings } from "./bench-settings";
import { cachedScore } from "./cached-score";
import type { InitialScore, StartContext } from "./startup.types";

/**
 * The measured score for the first decision: a recent warm score from an earlier page
 * beats a cold measurement, a forced tier skips the benchmark (the tier does
 * not need a score), and a clock too coarse to measure falls back to the
 * calibration's fallback score.
 */
export function initialScore(scope: Scope, context: StartContext, coldMs: number): InitialScore {
  const cached = cachedScore(context, Date.now());
  if (cached !== undefined) return { score: cached, source: "cached", cold: null };
  const fallback: InitialScore = { score: context.calibration.fallbackScore, source: "fallback", cold: null };
  if (context.forced) return fallback;
  // The cold kernels only, without createBenchOptions, so the boot script never bundles the warm raster kernel.
  const cold = safe(() =>
    runBenchmark({ ...benchSettings(scope, context.calibration, coldMs, false), kernels: createKernels(scope) }),
  );
  return cold ? { score: cold.score, source: "cold", cold } : fallback;
}
