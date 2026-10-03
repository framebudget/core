import type { KernelName } from "./calibration";
import { geomean, median } from "./math";

/** Runs `n` work units and returns a value that depends on every one of them. */
export type KernelRun = (n: number) => number;

export interface Kernel {
  name: KernelName;
  /**
   * Initial work units per call: a few microseconds on a slow phone running
   * cold code. Fast devices grow it after the warm-up slice.
   */
  batch: number;
  run: KernelRun;
}

export interface BenchOptions {
  now: () => number;
  kernels: readonly Kernel[];
  /** Work units per millisecond of each kernel on the reference device. */
  reference: Readonly<Record<KernelName, number>>;
  /** Total time to spend, alignment excluded. */
  budgetMs: number;
  /** Shortest slice. Slices never get shorter than one clock tick. */
  sliceMs: number;
  /** Most measured rounds; one more warm-up round runs first when the budget allows. */
  maxRounds: number;
  /** A clock coarser than this cannot measure the budget; the run gives up. */
  maxTickMs: number;
}

export interface BenchResult {
  /** Geometric mean of rate / reference over the measured kernels, times 100. */
  score: number;
  /** Median work units per millisecond, per kernel. */
  rates: Partial<Record<KernelName, number>>;
  /** Measured clock resolution in ms. */
  tickMs: number;
  /** Measured rounds (warm-up excluded). */
  rounds: number;
  /** Folded kernel results, kept so no kernel can be dead-code eliminated. */
  sink: number;
}

const SPIN_LIMIT = 200000;

/** Spins until the clock moves past `from`. Returns NaN when it never does. */
function nextTick(now: () => number, from: number): number {
  for (let i = 0; i < SPIN_LIMIT; i++) {
    const t = now();
    if (t > from) return t;
  }
  return NaN;
}

interface Plan {
  start: number;
  tick: number;
  slice: number;
  rounds: number;
  warmup: number;
}

function plan(o: BenchOptions): Plan | null {
  const k = o.kernels.length;
  if (k === 0) return null;
  // Two edges: the first aligns to a tick boundary, the second measures the tick.
  const first = nextTick(o.now, o.now());
  const start = nextTick(o.now, first);
  const tick = start - first;
  if (!(tick > 0) || tick > o.maxTickMs) return null;
  const slice = Math.max(o.sliceMs, tick);
  let total = Math.floor(o.budgetMs / (slice * k));
  if (total < 1) {
    if (slice * k > o.budgetMs * 3) return null;
    total = 1;
  }
  const warmup = total >= 2 ? 1 : 0;
  const rounds = Math.min(total - warmup, o.maxRounds);
  return { start, tick, slice, rounds, warmup };
}

interface RunState {
  /** Rates per kernel, measured rounds only. */
  samples: number[][];
  /** Units per call per kernel; grows after the warm-up on fast devices. */
  batches: number[];
  sink: { v: number };
}

/** A warm-up slice sizes later batches to about 1/32 of a slice, so reading the clock stays cheap. */
const BATCHES_PER_SLICE = 32;

function newRun(o: BenchOptions): RunState {
  return { samples: o.kernels.map((): number[] => []), batches: o.kernels.map((k) => k.batch), sink: { v: 0 } };
}

/**
 * One slice per kernel, chained: each slice starts at the tick that ended the
 * previous one, so a coarse clock costs at most one batch of error per edge.
 */
function round(o: BenchOptions, t: number, slice: number, run: RunState, measure: boolean): number {
  for (let i = 0; i < o.kernels.length; i++) {
    const kernel = o.kernels[i]!;
    const batch = run.batches[i]!;
    const start = t;
    let units = 0;
    do {
      run.sink.v += kernel.run(batch);
      units += batch;
      t = o.now();
    } while (t - start < slice);
    if (measure) run.samples[i]!.push(units / (t - start));
    else run.batches[i] = Math.max(batch, Math.round(units / BATCHES_PER_SLICE));
  }
  return t;
}

function finish(o: BenchOptions, p: Plan, run: RunState): BenchResult | null {
  const rates: Partial<Record<KernelName, number>> = {};
  const ratios: number[] = [];
  o.kernels.forEach((kernel, i) => {
    const rate = median(run.samples[i]!);
    rates[kernel.name] = rate;
    const ref = o.reference[kernel.name];
    if (ref > 0 && rate > 0) ratios.push(rate / ref);
  });
  const score = geomean(ratios) * 100;
  if (!isFinite(score)) return null;
  return { score, rates, tickMs: p.tick, rounds: p.rounds, sink: run.sink.v };
}

/** Runs the whole benchmark synchronously. Returns null when the clock cannot measure it. */
export function runBenchmark(o: BenchOptions): BenchResult | null {
  const p = plan(o);
  if (!p) return null;
  const run = newRun(o);
  let t = p.start;
  for (let r = 0; r < p.warmup + p.rounds; r++) t = round(o, t, p.slice, run, r >= p.warmup);
  return finish(o, p, run);
}

/**
 * Same measurement, one round per task: `pause` resolves when the main thread
 * may continue, so a long warm run never becomes one long task.
 */
export async function runBenchmarkAsync(o: BenchOptions, pause: () => Promise<unknown>): Promise<BenchResult | null> {
  const p = plan(o);
  if (!p) return null;
  const run = newRun(o);
  let t = p.start;
  for (let r = 0; r < p.warmup + p.rounds; r++) {
    if (r > 0) {
      await pause();
      t = nextTick(o.now, o.now());
      if (isNaN(t)) return null;
    }
    round(o, t, p.slice, run, r >= p.warmup);
  }
  return finish(o, p, run);
}

/** Built-in kernels. The canvas kernel is only present with a working OffscreenCanvas. */
export function createKernels(scope?: { OffscreenCanvas?: typeof OffscreenCanvas }): Kernel[] {
  let a = 1.5;
  let b = 0.25;
  const buffer = new Float32Array(4096);
  let cursor = 0;
  const ring: ({ x: number; y: number; prev: number } | undefined)[] = new Array(64);
  let slot = 0;

  const kernels: Kernel[] = [
    {
      name: "float",
      batch: 8,
      run(n) {
        for (let i = 0; i < n; i++) {
          a = a * 0.999 + Math.sqrt(b + i) * 0.001;
          b = (b + a * 1.618) % 7.3;
        }
        return a + b;
      },
    },
    {
      name: "typed",
      batch: 128,
      run(n) {
        let s = 0;
        for (let i = 0; i < n; i++) {
          const k = (cursor + i * 7) & 4095;
          const v = buffer[k]! * 0.5 + (i & 255);
          buffer[k] = v;
          s += v;
        }
        cursor = (cursor + n) & 4095;
        return s;
      },
    },
    {
      name: "alloc",
      batch: 16,
      run(n) {
        let s = 0;
        for (let i = 0; i < n; i++) {
          const prev = ring[slot];
          const o = { x: i, y: i * 0.5, prev: prev ? prev.x : 0 };
          ring[slot] = o;
          slot = (slot + 1) & 63;
          s += o.x + o.y + o.prev;
        }
        return s;
      },
    },
  ];

  try {
    const Offscreen = scope && scope.OffscreenCanvas;
    const ctx = Offscreen ? new Offscreen(16, 16).getContext("2d") : null;
    if (ctx) {
      kernels.push({
        name: "path",
        batch: 2,
        run(n) {
          for (let i = 0; i < n; i++) {
            ctx.beginPath();
            ctx.moveTo(i & 15, 0);
            ctx.lineTo(16, i & 7);
            ctx.quadraticCurveTo(8, 16, 0, 8);
            ctx.closePath();
          }
          return ctx.isPointInPath(8, 8) ? 1 : 0;
        },
      });
    }
  } catch {
    // No canvas kernel; the score uses the other kernels.
  }
  return kernels;
}
