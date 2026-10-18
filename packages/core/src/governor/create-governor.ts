import { closeWindow } from "./close-window";
import type { Governor, GovernorContext, GovernorHooks, GovernorOptions } from "./governor.types";
import { lateFraction, windowFps } from "./judge-window";
import { sourceRates } from "./source-rates";

/** Frames are collected in quiet periods too: they teach the cadence, though they are not judged. */
function reportGap(context: GovernorContext, gapMs: number, name: string): void {
  const { options, sources } = context;
  if (!(gapMs > 0) || gapMs > options.maxGapMs) return;
  const source = (sources[name] ??= { gaps: [], startedAt: 0, strikes: 0, windows: [] });
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
    quietUntil: now() + options.warmupMs,
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
  };
}
