import type { BenchOptions } from "../benchmark/benchmark.types";
import { createKernels } from "../benchmark/kernels/create-kernels";
import type { Calibration } from "../core/calibration/calibration.types";
import { createClock } from "../platform/scope/create-clock";
import type { Scope } from "../platform/scope/scope.types";

export function createBenchOptions(
  scope: Scope,
  calibration: Calibration,
  budgetMs: number,
  isWarm: boolean,
): BenchOptions {
  return {
    now: createClock(scope),
    kernels: createKernels(scope),
    reference: isWarm ? calibration.reference : calibration.coldReference,
    budgetMs,
    sliceMs: isWarm ? 0.75 : 0.1,
    maxRounds: isWarm ? 5 : 4,
    maxTickMs: isWarm ? 2 : 1,
  };
}
