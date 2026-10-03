import type { KernelName } from "../core/calibration/calibration.types";
import { geometricMean } from "../core/math/geometric-mean";
import { median } from "../core/math/median";
import type { BenchmarkRun, BenchResult } from "./benchmark.types";

/** Folds the samples into the result. Returns null when no kernel produced a usable rate. */
export function finishBenchmark(run: BenchmarkRun): BenchResult | null {
  const { options, plan, samples, sink } = run;
  const rates: Partial<Record<KernelName, number>> = {};
  const ratios: number[] = [];
  for (const [index, kernel] of options.kernels.entries()) {
    const rate = median(samples[index] ?? []);
    rates[kernel.name] = rate;
    const reference = options.reference[kernel.name];
    if (reference > 0 && rate > 0) ratios.push(rate / reference);
  }
  const score = geometricMean(ratios) * 100;
  return Number.isFinite(score) ? { score, rates, tickMs: plan.tick, rounds: plan.rounds, sink: sink.value } : null;
}
