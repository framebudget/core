import { quantile } from "../core/math/quantile";
import type { GovernorContext, GovernorOptions, WindowStats } from "./governor.types";

/** A frame longer than this many frame times missed at least one. */
const LATE_FACTOR = 1.5;
/** The gap quantile that stands for the display cadence in one window. */
const CADENCE_QUANTILE = 0.1;

/** Frames per second over windows: all their frames over all their time. */
export function windowFps(windows: readonly WindowStats[]): number {
  const frames = windows.reduce((sum, window) => sum + window.frames, 0);
  const elapsedMs = windows.reduce((sum, window) => sum + window.elapsedMs, 0);
  return elapsedMs > 0 ? (frames * 1000) / elapsedMs : 0;
}

/** Fraction of late frames over windows. */
export function lateFraction(windows: readonly WindowStats[]): number {
  const frames = windows.reduce((sum, window) => sum + window.frames, 0);
  return frames > 0 ? windows.reduce((sum, window) => sum + window.late, 0) / frames : 0;
}

/**
 * Lowers the cadence to this window's fast frames. The cadence only goes down:
 * a display that once drew at 60 Hz keeps its 16.7 ms frame time, while one that
 * never drew faster than 30 Hz (a power-saving cap) is held to 33.3 ms.
 */
export function learnCadence(context: GovernorContext, gaps: readonly number[]): void {
  context.cadenceMs = Math.min(context.cadenceMs, quantile(gaps, CADENCE_QUANTILE));
}

/** Counts the late frames of a window and judges it: few late frames, and not too slow. */
export function judgeWindow(options: GovernorOptions, cadenceMs: number, gaps: readonly number[]): WindowStats {
  const lateMs = LATE_FACTOR * Math.max(cadenceMs, 1000 / options.targetFps);
  const late = gaps.filter((gap) => gap > lateMs).length;
  const elapsedMs = gaps.reduce((sum, gap) => sum + gap, 0);
  const isSteady = late <= options.maxLateFraction * gaps.length;
  return {
    frames: gaps.length,
    elapsedMs,
    late,
    isGood: isSteady && (gaps.length * 1000) / elapsedMs >= options.minFps,
  };
}
