import type { GovernorContext, RunState, WindowStats } from "./governor.types";
import { windowFps } from "./judge-window";

/** A step that brings no good window and less than this gain in frame rate did not help. */
const TRIAL_GAIN = 1.15;

/** A run with no frame yet. */
export function emptyRun(): RunState {
  return { frames: 0, elapsedMs: 0, lastAt: 0 };
}

/** Clears every open window, run and strike: what comes next runs with other effects. */
export function restartWindows(context: GovernorContext): void {
  for (const source of Object.values(context.sources)) {
    source.strikes = 0;
    source.gaps.length = 0;
    source.run = emptyRun();
  }
}

/**
 * Feeds a judged window to the running trial. Only the source that struck out
 * checks the steps; once it has as many windows as led to the first step, the
 * hook hears whether the frame rate recovered since then. When it steps one
 * more effect down, the check starts over; otherwise the trial ends. Either a
 * new step or steps undone change the frames, so the governor waits a cooldown.
 */
export function trialWindow(context: GovernorContext, name: string, stats: WindowStats): void {
  const { trial, options } = context;
  if (trial?.source !== name) return;
  trial.windows.push(stats);
  if (trial.windows.length < options.strikes) return;
  const hasHelped =
    trial.windows.some((window) => window.isGood) || windowFps(trial.windows) >= trial.beforeFps * TRIAL_GAIN;
  const isOngoing = context.hooks.trialChecked(hasHelped);
  restartWindows(context);
  trial.windows = [];
  if (!isOngoing) context.trial = null;
  if (isOngoing || !hasHelped) context.quietUntil = context.now() + options.cooldownMs;
}
