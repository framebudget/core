import { describe, expect, it } from "vitest";
import { runBenchmark } from "../../src/benchmark/run-benchmark";
import { device, expectNear, NAMES, options, REFERENCE } from "./fake-device";

describe("runBenchmark", () => {
  it("scores the reference device at 100", () => {
    const result = runBenchmark(options(device()))!;
    expectNear(result.score, 100);
    for (const name of NAMES) expectNear(result.rates[name]! / REFERENCE[name], 1);
  });

  it("scores the geometric mean of the per-kernel ratios", () => {
    const doubled = runBenchmark(options(device({ float: 2, typed: 2, alloc: 2, path: 2 })))!;
    expectNear(doubled.score, 200);
    // One kernel 16x faster moves the score by 16^(1/4) = 2, not by 16/4.
    const fastFloat = runBenchmark(options(device({ float: 16 })))!;
    expectNear(fastFloat.score, 200);
    const slowAlloc = runBenchmark(options(device({ alloc: 0.5 })))!;
    expectNear(slowAlloc.score, 100 * Math.pow(0.5, 0.25));
  });

  it("discards the warm-up slice, so a slow first run (JIT, cold caches) does not count", () => {
    // Budget for exactly one warm-up round and one measured round. The first
    // 40 float units run 20x slower and all fall in the warm-up slice; a
    // kept warm-up would be averaged into the median of two.
    const fake = device({}, { slowUnits: { float: (unit) => (unit <= 40 ? 20 : 1) } });
    const result = runBenchmark(options(fake, { budgetMs: 0.8, maxRounds: 1 }))!;
    expect(result.rounds).toBe(1);
    expectNear(result.rates.float! / REFERENCE.float, 1);
  });

  it("uses the median slice, so one slow slice (a GC pause) does not move the rate", () => {
    let calls = 0;
    const fake = device();
    const alloc = fake.kernels.find((kernel) => kernel.name === "alloc")!;
    const run = alloc.run;
    alloc.run = (units) => {
      calls += 1;
      // Somewhere in the middle of the measured rounds, one call stalls for 0.3 ms.
      if (calls === 25) fake.state.time += 0.3;
      return run(units);
    };
    const result = runBenchmark(options(fake))!;
    expectNear(result.rates.alloc! / REFERENCE.alloc, 1);
  });

  it("stays inside its time budget", () => {
    const fake = device();
    const start = fake.state.time;
    const result = runBenchmark(options(fake))!;
    expect(result.rounds).toBe(4);
    expect(fake.state.time - start).toBeLessThan(2.1);
  });
});
