import type { BenchmarkPlan, BenchmarkRun, BenchOptions } from "./benchmark.types";

export function createRun(options: BenchOptions, plan: BenchmarkPlan): BenchmarkRun {
  return {
    options,
    plan,
    samples: options.kernels.map((): number[] => []),
    batches: options.kernels.map((kernel) => kernel.batch),
    sink: { value: 0 },
  };
}
