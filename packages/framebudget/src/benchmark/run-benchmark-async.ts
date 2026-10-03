import type { BenchOptions, BenchResult } from "./benchmark.types";
import { createRun } from "./create-run";
import { finishBenchmark } from "./finish-benchmark";
import { nextTick } from "./next-tick";
import { planBenchmark } from "./plan-benchmark";
import { runRound } from "./run-round";

/**
 * Same measurement, one round per task: `pause` resolves when the main thread
 * may continue, so a long warm run never becomes one long task.
 */
export async function runBenchmarkAsync(
  options: BenchOptions,
  pause: () => Promise<unknown>,
): Promise<BenchResult | null> {
  const plan = planBenchmark(options);
  if (!plan) return null;
  const run = createRun(options, plan);
  let time = plan.start;
  for (let round = 0; round < plan.warmup + plan.rounds; round++) {
    if (round > 0) {
      await pause();
      time = nextTick(options.now, options.now());
      if (Number.isNaN(time)) return null;
    }
    runRound(run, time, round >= plan.warmup);
  }
  return finishBenchmark(run);
}
