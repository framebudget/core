export interface GovernorOptions {
  /**
   * Highest frame rate a page is held to. A frame is late when it takes more
   * than 1.5 frame times, a frame time being the display's cadence but never
   * shorter than 1000 / targetFps ms, so a 120 Hz screen at 60 fps is fine.
   */
  targetFps: number;
  /**
   * A window that runs under this frame rate is bad even when its frames are
   * steady. A page slow from its first frame shows no faster cadence to judge
   * late frames against; the step it leads to is checked, and undone under a
   * capped display, where it cannot help.
   */
  minFps: number;
  /** A window is bad when more than this fraction of its frames is late. */
  maxLateFraction: number;
  /** Frames per window. */
  windowFrames: number;
  /** Consecutive bad windows from one source before an effect steps down; also the windows that check a step. */
  strikes: number;
  /** Frames are not judged this long after the governor starts (loading, JIT warm-up). */
  warmupMs: number;
  /** Frames are not judged this long after a step down, so the change can take effect. */
  cooldownMs: number;
  /** Judged windows, mostly good, that make a visit clean; also the wait before an in-page retry. */
  cleanWindows: number;
  /** Gaps longer than this are not frames (hidden tab, debugger, sleep). */
  maxGapMs: number;
}

/** How a strike-out stepped an effect down: on a guess to check ("trial"), or for good ("kept"). */
export type StepKind = "trial" | "kept";

export interface GovernorHooks {
  /** `source` struck out. Returns how an effect was stepped down, or null when none was. */
  strikeOut(source: string): StepKind | null;
  /**
   * The trial steps were checked: `hasHelped` is true when the frames recovered
   * since the first of them. Returns true when another effect stepped down and
   * the check goes on against the same starting frame rate.
   */
  trialChecked(hasHelped: boolean): boolean;
  /** A window was judged. Returns true when the hook changed the effects, so the governor waits a cooldown. */
  judged(isGood: boolean): boolean;
}

export interface Governor {
  /** Reports the time between two frames of `source` ("main", "worker" or an effect name). */
  report(gapMs: number, source?: string): void;
  /** Frames per second per source over its recent judged windows. */
  fps(): Record<string, number>;
  /** Fraction of late frames per source over its recent judged windows. */
  late(): Record<string, number>;
  /** Drops the running check, open windows and strikes, and waits a cooldown: the effects changed outside the governor. */
  reset(): void;
}

/** One judged window. */
export interface WindowStats {
  frames: number;
  elapsedMs: number;
  /** Frames that missed at least one frame time. */
  late: number;
  isGood: boolean;
}

/** Frames of one source: the open window, its strike count and recent judged windows. */
export interface SourceState {
  gaps: number[];
  /** When the open window got its first frame. A window that starts in a quiet period is not judged. */
  startedAt: number;
  strikes: number;
  windows: WindowStats[];
}

/** A step down on a guess, checked on the next windows of the source that struck out. */
export interface Trial {
  source: string;
  /** Frame rate of the strike windows that led to the step. */
  beforeFps: number;
  windows: WindowStats[];
}

/** Everything a governor reads and updates between frames. */
export interface GovernorContext {
  options: GovernorOptions;
  now: () => number;
  hooks: GovernorHooks;
  sources: Record<string, SourceState>;
  /** Windows that start before this time are not judged (warm-up, cooldown). */
  quietUntil: number;
  /** The display cadence: the shortest 10th-percentile gap of any window, any source. */
  cadenceMs: number;
  trial: Trial | null;
}
