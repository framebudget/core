/** Signals read from the browser besides the benchmark. */
export interface Hints {
  cores?: number;
  memoryGb?: number;
  saveData: boolean;
  /** effectiveType is 2g or slow-2g. */
  slowNetwork: boolean;
  reducedMotion: boolean;
  /** Global Privacy Control. Only used to suppress sharing; never reported. */
  gpc: boolean;
}

export type PressureState = "nominal" | "fair" | "serious" | "critical";

export type ScoreSource = "cold" | "cached" | "warm" | "fallback" | "simulated";
