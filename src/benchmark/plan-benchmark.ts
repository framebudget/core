import type { BenchmarkPlan, BenchOptions } from "./benchmark.types";
import { nextTick } from "./next-tick";

/** Rounds that fit the budget, or null when not even one round fits. */
function countRounds(options: BenchOptions, slice: number): number | null {
  const roundMs = slice * options.kernels.length;
  const total = Math.floor(options.budgetMs / roundMs);
  if (total >= 1) return total;
  return roundMs > options.budgetMs * 3 ? null : 1;
}

/** Aligns to the clock and sizes the run. Returns null when the clock cannot measure it. */
export function planBenchmark(options: BenchOptions): BenchmarkPlan | null {
  if (options.kernels.length === 0) return null;
  // Two edges: the first aligns to a tick boundary, the second measures the tick.
  const first = nextTick(options.now, options.now());
  const start = nextTick(options.now, first);
  const tick = start - first;
  if (!(tick > 0) || tick > options.maxTickMs) return null;
  const slice = Math.max(options.sliceMs, tick);
  const total = countRounds(options, slice);
  if (total === null) return null;
  const warmup = total >= 2 ? 1 : 0;
  const rounds = Math.min(total - warmup, options.maxRounds);
  return { start, tick, slice, rounds, warmup };
}
