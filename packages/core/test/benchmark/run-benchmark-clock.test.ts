import { describe, expect, it } from "vitest";
import { runBenchmark } from "../../src/benchmark/run-benchmark";
import { device, options } from "./fake-device";

describe("runBenchmark", () => {
  it("stays accurate on a clock coarsened to 0.1 ms by aligning slices to ticks", () => {
    const result = runBenchmark(options(device({}, { resolution: 0.1 })))!;
    expect(result.tickMs).toBeCloseTo(0.1, 9);
    expect(result.score).toBeGreaterThan(97);
    expect(result.score).toBeLessThan(103);
  });

  it("gives up on a clock too coarse to measure and on a frozen clock", () => {
    const coarse = runBenchmark(options(device({}, { resolution: 5 })));
    expect(coarse).toBeNull();
    const frozen = device();
    expect(runBenchmark({ ...options(frozen), now: () => 42 })).toBeNull();
  });

  it("runs fewer, longer slices when one tick is longer than a slice", () => {
    const fake = device({}, { resolution: 0.5 });
    const result = runBenchmark(options(fake))!;
    // 0.5 ms slices x 4 kernels = 2 ms: one round, no warm-up.
    expect(result.rounds).toBe(1);
    expect(result.score).toBeGreaterThan(90);
    expect(result.score).toBeLessThan(110);
  });
});
