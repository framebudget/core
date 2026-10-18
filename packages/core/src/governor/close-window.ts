import type { GovernorContext, SourceState, WindowStats } from "./governor.types";
import { judgeWindow, learnCadence, windowFps } from "./judge-window";
import { restartWindows, trialWindow } from "./trial-window";

const KEPT_WINDOWS = 20;

function keepWindow(source: SourceState, stats: WindowStats): void {
  source.windows.push(stats);
  if (source.windows.length > KEPT_WINDOWS) source.windows.shift();
}

function strike(context: GovernorContext, name: string, source: SourceState): void {
  const { options } = context;
  source.strikes += 1;
  if (source.strikes < options.strikes) return;
  const beforeFps = windowFps(source.windows.slice(-options.strikes));
  restartWindows(context);
  const kind = context.hooks.strikeOut(name);
  if (kind === null) return;
  context.quietUntil = context.now() + options.cooldownMs;
  if (kind === "trial") context.trial = { source: name, beforeFps, windows: [] };
}

/**
 * Ends the open window of a source. Every window teaches the cadence; one that
 * started in a quiet period stops there. A judged window is reported first, so
 * it belongs to the stretch it closes; then it feeds the running trial, or else
 * a bad one is a strike and a good one clears the strikes. No strike counts
 * while a trial runs.
 */
export function closeWindow(context: GovernorContext, name: string, source: SourceState): void {
  const gaps = [...source.gaps];
  source.gaps.length = 0;
  learnCadence(context, gaps);
  if (source.startedAt < context.quietUntil) return;
  const stats = judgeWindow(context.options, context.cadenceMs, gaps);
  keepWindow(source, stats);
  context.hooks.judged(stats.isGood);
  if (context.trial) trialWindow(context, name, stats);
  else if (stats.isGood) source.strikes = 0;
  else strike(context, name, source);
}
