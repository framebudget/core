import type { GovernorContext, SourceState, WindowStats } from "./governor.types";
import { judgeWindow, learnCadence, windowFps } from "./judge-window";
import { restartWindows, trialWindow } from "./trial-window";

const KEPT_WINDOWS = 20;

/** When frames of `name` start counting: after the cooldown, and for a non-effect source after the warm-up too. */
export function judgedFrom(context: GovernorContext, name: string): number {
  return context.hooks.isEffect(name) ? context.quietUntil : Math.max(context.quietUntil, context.warmUntil);
}

export function keepWindow(source: SourceState, stats: WindowStats): void {
  source.windows.push(stats);
  if (source.windows.length > KEPT_WINDOWS) source.windows.shift();
}

/**
 * `name` struck out: every window starts over, and the hook steps an effect
 * down. A step waits a cooldown; a step on a guess starts a trial measured
 * against `beforeFps`.
 */
export function strikeOut(context: GovernorContext, name: string, beforeFps: number): void {
  restartWindows(context);
  const kind = context.hooks.strikeOut(name);
  if (kind === null) return;
  context.quietUntil = context.now() + context.options.cooldownMs;
  if (kind === "trial") context.trial = { source: name, beforeFps, windows: [] };
}

function strike(context: GovernorContext, name: string, source: SourceState): void {
  const { options } = context;
  source.strikes += 1;
  if (source.strikes < options.strikes) return;
  strikeOut(context, name, windowFps(source.windows.slice(-options.strikes)));
}

/**
 * Ends the open window of a source. Every window teaches the cadence; one that
 * started in a quiet period stops there. A judged window is reported first, so
 * it belongs to the stretch it closes; when the hook changes the effects then,
 * the governor starts over after a cooldown. Otherwise the window feeds the
 * running trial, or else a bad one is a strike and a good one clears the
 * strikes. No strike counts while a trial runs.
 */
export function closeWindow(context: GovernorContext, name: string, source: SourceState): void {
  const gaps = [...source.gaps];
  source.gaps.length = 0;
  learnCadence(context, gaps);
  if (source.startedAt < judgedFrom(context, name)) return;
  const stats = judgeWindow(context.options, context.cadenceMs, gaps);
  keepWindow(source, stats);
  if (context.hooks.judged(stats.isGood)) {
    restartWindows(context);
    context.quietUntil = context.now() + context.options.cooldownMs;
  } else if (context.trial) trialWindow(context, name, stats);
  else if (stats.isGood) source.strikes = 0;
  else strike(context, name, source);
}
