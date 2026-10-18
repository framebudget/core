import type { DecideInput, Decision } from "../decision/decision.types";
import { isThresholdOnly } from "../decision/off-reason";

/** How far below its threshold an effect may be explored, as a fraction of the threshold. */
const EXPLORE_REACH = 0.25;

/**
 * Effects a reporting page view may turn on for calibration: off only by their
 * threshold, with a score within reach of it, and used by the page when it
 * reported any use.
 */
export function exploreCandidates(input: DecideInput, decision: Decision, used: readonly string[]): string[] {
  return Object.entries(input.calibration.effects)
    .filter(
      ([name, definition]) =>
        isThresholdOnly(input, decision, name) &&
        (decision.scores[name] ?? 0) >= definition.threshold * (1 - EXPLORE_REACH) &&
        (used.length === 0 || used.includes(name)),
    )
    .map(([name]) => name);
}
