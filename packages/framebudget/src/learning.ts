import type { Calibration } from "./calibration";
import type { BlockEntry, StoredState } from "./storage";

const MAX_FAILS = 5;

/** Clean visits an effect waits before a retry: retryVisits, doubled after every further stutter. */
export function visitsBeforeRetry(cal: Calibration, entry: BlockEntry): number {
  return cal.retryVisits * Math.pow(2, Math.max(0, Math.min(entry.fails, MAX_FAILS) - 1));
}

/** Effects that stuttered before and are not yet up for a retry. */
export function learnedBlocks(state: StoredState, cal: Calibration): string[] {
  return Object.keys(state.blocked).filter(
    (name) => state.blocked[name]!.clean < visitsBeforeRetry(cal, state.blocked[name]!),
  );
}

/** The governor stepped this effect down: start without it on the next visits. */
export function recordStutter(state: StoredState, effect: string): void {
  const prev = state.blocked[effect];
  state.blocked[effect] = { clean: 0, fails: Math.min((prev ? prev.fails : 0) + 1, MAX_FAILS) };
}

/**
 * The page ran smoothly long enough. A blocked effect that ran on it (a retry)
 * held up and is forgotten; the others count one more clean visit.
 */
export function recordCleanVisit(state: StoredState, allowed: readonly string[]): void {
  for (const name of Object.keys(state.blocked)) {
    if (allowed.includes(name)) delete state.blocked[name];
    else state.blocked[name]!.clean += 1;
  }
}
