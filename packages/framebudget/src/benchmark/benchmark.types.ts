import type { KernelName } from "../core/calibration/calibration.types";

/** Runs `units` work units and returns a value that depends on every one of them. */
export type KernelRun = (units: number) => number;

export interface Kernel {
  name: KernelName;
  /**
   * Initial work units per call: a few microseconds on a slow phone running
   * cold code. Fast devices grow it after the warm-up slice.
   */
  batch: number;
  run: KernelRun;
}

/** The part of the page scope the kernels need. */
export interface KernelScope {
  OffscreenCanvas?: typeof OffscreenCanvas;
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

/** How a run spends its budget, fixed before the first slice. */
export interface BenchmarkPlan {
  /** Clock reading at the tick edge the first slice starts on. */
  start: number;
  tick: number;
  slice: number;
  rounds: number;
  warmup: number;
}

/** Everything one run reads and accumulates. */
export interface BenchmarkRun {
  options: BenchOptions;
  plan: BenchmarkPlan;
  /** Rates per kernel, measured rounds only. */
  samples: number[][];
  /** Units per call per kernel; grows after the warm-up on fast devices. */
  batches: number[];
  sink: { value: number };
}
