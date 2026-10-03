import type { BenchOptions, BenchResult } from "./benchmark.types";
import { createRun } from "./create-run";
import { finishBenchmark } from "./finish-benchmark";
import { planBenchmark } from "./plan-benchmark";
import { runRound } from "./run-round";

/** Runs the whole benchmark synchronously. Returns null when the clock cannot measure it. */
export function runBenchmark(options: BenchOptions): BenchResult | null {
  const plan = planBenchmark(options);
  if (!plan) return null;
  const run = createRun(options, plan);
  let time = plan.start;
  for (let round = 0; round < plan.warmup + plan.rounds; round++) {
    time = runRound(run, time, round >= plan.warmup);
  }
  return finishBenchmark(run);
}
