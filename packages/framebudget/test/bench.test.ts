import { describe, expect, it } from "vitest";
import { runBenchmark, runBenchmarkAsync, type BenchOptions, type Kernel } from "../src/bench";
import type { KernelName } from "../src/calibration";
import { geomean, median } from "../src/math";

const REFERENCE: Record<KernelName, number> = { float: 4000, typed: 8000, alloc: 2000, path: 1000 };
const BATCH: Record<KernelName, number> = { float: 40, typed: 80, alloc: 20, path: 10 };
const NAMES = Object.keys(REFERENCE) as KernelName[];

/**
 * A device on a fake clock. `speed` is relative to the reference device per
 * kernel. Each clock read costs a little time, like a real one; `resolution`
 * quantizes what the clock reports, like a coarsened performance.now().
 */
interface FakeDevice {
  now: () => number;
  kernels: Kernel[];
  state: { t: number; units: Record<string, number> };
}

function device(
  speed: Partial<Record<KernelName, number>> = {},
  opts: { resolution?: number; slowUnits?: Partial<Record<KernelName, (unit: number) => number>> } = {},
): FakeDevice {
  const state = { t: 0, units: {} as Record<string, number> };
  const now = () => {
    state.t += 2e-5; // about 20 ns per read
    const r = opts.resolution;
    return r ? Math.floor(state.t / r) * r : state.t;
  };
  const kernels: Kernel[] = NAMES.map((name) => ({
    name,
    batch: BATCH[name],
    run(n) {
      for (let i = 0; i < n; i++) {
        const unit = (state.units[name] = (state.units[name] || 0) + 1);
        const factor = opts.slowUnits?.[name]?.(unit) ?? 1;
        state.t += factor / (REFERENCE[name] * (speed[name] ?? 1));
      }
      return n;
    },
  }));
  return { now, kernels, state };
}

/** Relative closeness; reading the clock costs time, so scores carry a small known bias. */
function expectNear(actual: number, expected: number, tolerance = 0.01): void {
  expect(Math.abs(actual / expected - 1)).toBeLessThan(tolerance);
}

function options(d: FakeDevice, over: Partial<BenchOptions> = {}): BenchOptions {
  return {
    now: d.now,
    kernels: d.kernels,
    reference: REFERENCE,
    budgetMs: 2,
    sliceMs: 0.1,
    maxRounds: 4,
    maxTickMs: 1,
    ...over,
  };
}

describe("median and geomean", () => {
  it("takes the middle of odd and even lists without mutating them", () => {
    const list = [5, 1, 3];
    expect(median(list)).toBe(3);
    expect(list).toEqual([5, 1, 3]);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });

  it("is the n-th root of the product and rejects non-positive values", () => {
    expect(geomean([4, 1])).toBeCloseTo(2, 12);
    expect(geomean([2, 8, 4])).toBeCloseTo(4, 12);
    expect(geomean([1, 0])).toBeNaN();
    expect(geomean([1, -2])).toBeNaN();
    expect(geomean([])).toBeNaN();
  });
});

describe("runBenchmark", () => {
  it("scores the reference device at 100", () => {
    const r = runBenchmark(options(device()))!;
    expectNear(r.score, 100);
    for (const name of NAMES) expectNear(r.rates[name]! / REFERENCE[name], 1);
  });

  it("scores the geometric mean of the per-kernel ratios", () => {
    expectNear(runBenchmark(options(device({ float: 2, typed: 2, alloc: 2, path: 2 })))!.score, 200);
    // One kernel 16x faster moves the score by 16^(1/4) = 2, not by 16/4.
    expectNear(runBenchmark(options(device({ float: 16 })))!.score, 200);
    expectNear(runBenchmark(options(device({ alloc: 0.5 })))!.score, 100 * Math.pow(0.5, 0.25));
  });

  it("stays accurate on a clock coarsened to 0.1 ms by aligning slices to ticks", () => {
    const r = runBenchmark(options(device({}, { resolution: 0.1 })))!;
    expect(r.tickMs).toBeCloseTo(0.1, 9);
    expect(r.score).toBeGreaterThan(97);
    expect(r.score).toBeLessThan(103);
  });

  it("discards the warm-up slice, so a slow first run (JIT, cold caches) does not count", () => {
    // Budget for exactly one warm-up round and one measured round. The first
    // 40 float units run 20x slower and all fall in the warm-up slice; a
    // kept warm-up would be averaged into the median of two.
    const d = device({}, { slowUnits: { float: (unit) => (unit <= 40 ? 20 : 1) } });
    const r = runBenchmark(options(d, { budgetMs: 0.8, maxRounds: 1 }))!;
    expect(r.rounds).toBe(1);
    expectNear(r.rates.float! / REFERENCE.float, 1);
  });

  it("uses the median slice, so one slow slice (a GC pause) does not move the rate", () => {
    let calls = 0;
    const d = device();
    const alloc = d.kernels.find((k) => k.name === "alloc")!;
    const run = alloc.run;
    alloc.run = (n) => {
      calls += 1;
      // Somewhere in the middle of the measured rounds, one call stalls for 0.3 ms.
      if (calls === 25) d.state.t += 0.3;
      return run(n);
    };
    const r = runBenchmark(options(d))!;
    expectNear(r.rates.alloc! / REFERENCE.alloc, 1);
  });

  it("stays inside its time budget", () => {
    const d = device();
    const start = d.state.t;
    const r = runBenchmark(options(d))!;
    expect(r.rounds).toBe(4);
    expect(d.state.t - start).toBeLessThan(2.1);
  });

  it("gives up on a clock too coarse to measure and on a frozen clock", () => {
    expect(runBenchmark(options(device({}, { resolution: 5 })))).toBeNull();
    const frozen = device();
    expect(runBenchmark({ ...options(frozen), now: () => 42 })).toBeNull();
  });

  it("runs fewer, longer slices when one tick is longer than a slice", () => {
    const d = device({}, { resolution: 0.5 });
    const r = runBenchmark(options(d))!;
    // 0.5 ms slices x 4 kernels = 2 ms: one round, no warm-up.
    expect(r.rounds).toBe(1);
    expect(r.score).toBeGreaterThan(90);
    expect(r.score).toBeLessThan(110);
  });
});

describe("runBenchmarkAsync", () => {
  it("yields between rounds and measures the same as the sync run", async () => {
    let pauses = 0;
    const d = device({ typed: 4 });
    const r = (await runBenchmarkAsync(options(d), async () => {
      pauses += 1;
    }))!;
    expect(pauses).toBe(4); // warm-up + 4 rounds = 5 rounds, 4 gaps
    expectNear(r.score, 100 * Math.pow(4, 0.25));
  });
});
