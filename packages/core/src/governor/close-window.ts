import { median } from "../core/math/median";
import type { GovernorContext, SourceState } from "./governor.types";

const KEPT_MEDIANS = 20;

/** Ends the open window of a source and keeps its median. */
function takeWindowMedian(source: SourceState): number {
  const windowMedian = median(source.gaps);
  source.gaps.length = 0;
  source.medians.push(windowMedian);
  if (source.medians.length > KEPT_MEDIANS) source.medians.shift();
  return windowMedian;
}

function strike(context: GovernorContext, name: string, source: SourceState): void {
  context.cleanStreak = 0;
  source.strikes += 1;
  if (source.strikes < context.options.strikes) return;
  for (const other of Object.values(context.sources)) {
    other.strikes = 0;
    other.gaps.length = 0;
  }
  if (!context.hooks.strikeOut(name)) return;
  context.hasStepped = true;
  context.quietUntil = context.now() + context.options.cooldownMs;
}

function countGoodWindow(context: GovernorContext, source: SourceState): void {
  source.strikes = 0;
  context.cleanStreak += 1;
  if (context.hasStepped || context.wasCleanFired || context.cleanStreak < context.options.cleanWindows) return;
  context.wasCleanFired = true;
  context.hooks.clean();
}

/** Judges a full window of `name` by its median gap. */
export function closeWindow(context: GovernorContext, name: string, source: SourceState): void {
  const windowMedian = takeWindowMedian(source);
  if (windowMedian > 1000 / context.options.targetFps) strike(context, name, source);
  else countGoodWindow(context, source);
}
