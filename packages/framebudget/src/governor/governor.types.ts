export interface GovernorOptions {
  /** A window whose median frame rate is below this is a strike. */
  targetFps: number;
  /** Frames per window. */
  windowFrames: number;
  /** Consecutive bad windows from one source before an effect steps down. */
  strikes: number;
  /** Frames are ignored this long after the governor starts (loading, JIT warm-up). */
  warmupMs: number;
  /** Frames are ignored this long after a step down, so the change can take effect. */
  cooldownMs: number;
  /** Consecutive good windows with no step down that make the visit clean (local learning). */
  cleanWindows: number;
  /** Gaps longer than this are not frames (hidden tab, debugger, sleep). */
  maxGapMs: number;
}

export interface GovernorHooks {
  /** `source` struck out. Return true when an effect was stepped down. */
  strikeOut(source: string): boolean;
  /** The visit ran smoothly; fired once. */
  clean(): void;
}

export interface Governor {
  /** Reports the time between two frames of `source` ("main", "worker" or an effect name). */
  report(gapMs: number, source?: string): void;
  /** Median frame rate per source over its recent windows. */
  fps(): Record<string, number>;
}

/** Frames of one source: the open window, its strike count and recent window medians. */
export interface SourceState {
  gaps: number[];
  strikes: number;
  medians: number[];
}

/** Everything a governor reads and updates between frames. */
export interface GovernorContext {
  options: GovernorOptions;
  now: () => number;
  hooks: GovernorHooks;
  sources: Record<string, SourceState>;
  /** Frames before this time are ignored (warm-up, cooldown). */
  quietUntil: number;
  cleanStreak: number;
  hasStepped: boolean;
  wasCleanFired: boolean;
}
