import { keepWindow, strikeOut } from "./close-window";
import type { GovernorContext, SourceState } from "./governor.types";
import { judgeWindow, learnCadence } from "./judge-window";
import { emptyRun } from "./trial-window";

/**
 * Ends one effect's run and judges it; its open window goes with it, so the
 * next run starts a window of its own. A run that lasted `minRunMs` and
 * averaged under `minFps` steps the effect down for good, unless a trial runs
 * (no strike counts then). This catches effects too short to fill the windows
 * that lead to a strike-out: a page transition, a draw-in on load. A run no
 * window judged is kept as one, so the frame rate per source shows it.
 */
function endRun(context: GovernorContext, name: string, source: SourceState): void {
  const { options } = context;
  const run = source.run;
  const gaps = [...source.gaps];
  source.run = emptyRun();
  source.gaps.length = 0;
  if (run.elapsedMs < options.minRunMs) return;
  const fps = (run.frames * 1000) / run.elapsedMs;
  const isGood = fps >= options.minFps;
  if (gaps.length === run.frames && run.frames < options.windowFrames) {
    learnCadence(context, gaps);
    keepWindow(source, { ...judgeWindow(options, context.cadenceMs, gaps), isGood });
  }
  if (!isGood && !context.trial) strikeOut(context, name, fps);
}

/** Ends and judges the runs idle for at least `idleMs`. Returns how many runs are still open. */
export function endRuns(context: GovernorContext, idleMs: number): number {
  const now = context.now();
  let open = 0;
  for (const [name, source] of Object.entries(context.sources)) {
    if (source.run.frames === 0) continue;
    if (now - source.run.lastAt < idleMs) open += 1;
    else endRun(context, name, source);
  }
  return open;
}
