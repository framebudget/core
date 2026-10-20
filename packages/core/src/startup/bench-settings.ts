import type { BenchOptions } from "../benchmark/benchmark.types";
import type { Calibration } from "../core/calibration/calibration.types";
import { createClock } from "../platform/scope/create-clock";
import type { Scope } from "../platform/scope/scope.types";

/**
 * Everything in the bench options but the kernels. It imports no kernel, so
 * the boot script bundles only the cold kernels it adds.
 */
export function benchSettings(
  scope: Scope,
  calibration: Calibration,
  budgetMs: number,
  isWarm: boolean,
): Omit<BenchOptions, "kernels"> {
  return {
    now: createClock(scope),
    reference: isWarm ? calibration.reference : calibration.coldReference,
    budgetMs,
    sliceMs: isWarm ? 0.75 : 0.1,
    maxRounds: isWarm ? 5 : 4,
    maxTickMs: isWarm ? 2 : 1,
  };
}
