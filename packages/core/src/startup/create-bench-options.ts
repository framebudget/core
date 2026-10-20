import type { BenchOptions } from "../benchmark/benchmark.types";
import { createKernels } from "../benchmark/kernels/create-kernels";
import { createWarmKernels } from "../benchmark/kernels/create-warm-kernels";
import type { Calibration } from "../core/calibration/calibration.types";
import type { Scope } from "../platform/scope/scope.types";
import { benchSettings } from "./bench-settings";

/** Bench options for a cold or a warm run. Only the warm run measures the raster kernel. */
export function createBenchOptions(
  scope: Scope,
  calibration: Calibration,
  budgetMs: number,
  isWarm: boolean,
): BenchOptions {
  const kernels = isWarm ? createWarmKernels(scope) : createKernels(scope);
  return { ...benchSettings(scope, calibration, budgetMs, isWarm), kernels };
}
