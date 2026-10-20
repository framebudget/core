import { closeWindow, judgedFrom } from "./close-window";
import { endRuns } from "./end-runs";
import { emptyRun, restartWindows } from "./trial-window";
import type { Governor, GovernorContext, GovernorHooks, GovernorOptions, SourceState } from "./governor.types";
import { lateFraction, windowFps } from "./judge-window";
import { sourceRates } from "./source-rates";

/** An effect's frame extends its run, unless it falls in a quiet period: the run starts after it. */
function extendRun(context: GovernorContext, name: string, source: SourceState, gapMs: number): void {
  const now = context.now();
  if (now < judgedFrom(context, name)) return;
  source.run.frames += 1;
  source.run.elapsedMs += gapMs;
  source.run.lastAt = now;
}

/** Frames are collected in quiet periods too: they teach the cadence, though they are not judged. */
function reportGap(context: GovernorContext, gapMs: number, name: string): void {
  const { options, sources } = context;
  if (!(gapMs > 0) || gapMs > options.maxGapMs) return;
  const source = (sources[name] ??= { gaps: [], startedAt: 0, strikes: 0, windows: [], run: emptyRun() });
  if (context.hooks.isEffect(name)) extendRun(context, name, source, gapMs);
  if (source.gaps.length === 0) source.startedAt = context.now();
  source.gaps.push(gapMs);
  if (source.gaps.length >= options.windowFrames) closeWindow(context, name, source);
}

export function createGovernor(options: GovernorOptions, now: () => number, hooks: GovernorHooks): Governor {
  const context: GovernorContext = {
    options,
    now,
    hooks,
    sources: {},
    quietUntil: now(),
    warmUntil: now() + options.warmupMs,
    cadenceMs: Infinity,
    trial: null,
  };
  return {
    report(gapMs, source = "main") {
      reportGap(context, gapMs, source);
    },
    fps() {
      return sourceRates(context.sources, windowFps);
    },
    late() {
      return sourceRates(context.sources, lateFraction);
    },
    reset() {
      context.trial = null;
      restartWindows(context);
      context.quietUntil = Math.max(context.quietUntil, context.now() + options.cooldownMs);
    },
    endRuns(idleMs) {
      return endRuns(context, idleMs);
    },
  };
}
