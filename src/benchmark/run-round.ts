import type { BenchmarkRun } from "./benchmark.types";

/** A warm-up slice sizes later batches to about 1/32 of a slice, so reading the clock stays cheap. */
const BATCHES_PER_SLICE = 32;

/**
 * One slice per kernel, chained: each slice starts at the tick that ended the
 * previous one, so a coarse clock costs at most one batch of error per edge.
 */
export function runRound(run: BenchmarkRun, startTime: number, isMeasured: boolean): number {
  const { options, plan, samples, batches, sink } = run;
  const { kernels, now } = options;
  let time = startTime;
  for (const [index, kernel] of kernels.entries()) {
    const batch = batches[index] ?? kernel.batch;
    const sliceStart = time;
    let units = 0;
    do {
      sink.value += kernel.run(batch);
      units += batch;
      time = now();
    } while (time - sliceStart < plan.slice);
    if (isMeasured) samples[index]?.push(units / (time - sliceStart));
    else batches[index] = Math.max(batch, Math.round(units / BATCHES_PER_SLICE));
  }
  return time;
}
