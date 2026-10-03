import { closeWindow } from "./close-window";
import { framesPerSecond } from "./frames-per-second";
import type { Governor, GovernorContext, GovernorHooks, GovernorOptions } from "./governor.types";

function reportGap(context: GovernorContext, gapMs: number, name: string): void {
  const { options, sources } = context;
  if (!(gapMs > 0) || gapMs > options.maxGapMs || context.now() < context.quietUntil) return;
  const source = (sources[name] ??= { gaps: [], strikes: 0, medians: [] });
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
    cleanStreak: 0,
    hasStepped: false,
    wasCleanFired: false,
  };
  return {
    report(gapMs, source = "main") {
      reportGap(context, gapMs, source);
    },
    fps() {
      return framesPerSecond(context.sources);
    },
  };
}
