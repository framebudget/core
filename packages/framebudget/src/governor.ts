import { median } from "./math";

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

export const defaultGovernorOptions: GovernorOptions = {
  targetFps: 45,
  windowFrames: 30,
  strikes: 3,
  warmupMs: 3000,
  cooldownMs: 2000,
  cleanWindows: 20,
  maxGapMs: 1000,
};

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

interface SourceState {
  gaps: number[];
  strikes: number;
  medians: number[];
}

const KEPT_MEDIANS = 20;

export function createGovernor(options: GovernorOptions, now: () => number, hooks: GovernorHooks): Governor {
  const sources: Record<string, SourceState> = {};
  let quietUntil = now() + options.warmupMs;
  let cleanStreak = 0;
  let stepped = false;
  let cleanFired = false;

  function closeWindow(name: string, s: SourceState): void {
    const m = median(s.gaps);
    s.gaps.length = 0;
    s.medians.push(m);
    if (s.medians.length > KEPT_MEDIANS) s.medians.shift();

    if (m > 1000 / options.targetFps) {
      cleanStreak = 0;
      s.strikes += 1;
      if (s.strikes < options.strikes) return;
      for (const other of Object.keys(sources)) {
        sources[other]!.strikes = 0;
        sources[other]!.gaps.length = 0;
      }
      if (hooks.strikeOut(name)) {
        stepped = true;
        quietUntil = now() + options.cooldownMs;
      }
      return;
    }
    s.strikes = 0;
    cleanStreak += 1;
    if (!stepped && !cleanFired && cleanStreak >= options.cleanWindows) {
      cleanFired = true;
      hooks.clean();
    }
  }

  return {
    report(gapMs, source = "main") {
      if (!(gapMs > 0) || gapMs > options.maxGapMs || now() < quietUntil) return;
      const s = sources[source] || (sources[source] = { gaps: [], strikes: 0, medians: [] });
      s.gaps.push(gapMs);
      if (s.gaps.length >= options.windowFrames) closeWindow(source, s);
    },
    fps() {
      const out: Record<string, number> = {};
      for (const name of Object.keys(sources)) {
        const m = median(sources[name]!.medians);
        if (m > 0) out[name] = 1000 / m;
      }
      return out;
    },
  };
}
