import type { Calibration } from "../calibration/calibration.types";
import { tierEffects } from "../calibration/tier-effects";
import type { Tier } from "../tier/tier.enum";
import { isQualified } from "./is-qualified";

/** Effects whose own score passes their threshold, with hysteresis against the previous page. */
function passingEffects(
  calibration: Calibration,
  scores: Readonly<Record<string, number>>,
  previous: readonly string[] | undefined,
): string[] {
  return Object.entries(calibration.effects)
    .filter(([name, definition]) =>
      isQualified(
        scores[name] ?? 0,
        definition.threshold,
        calibration.hysteresis,
        previous ? previous.includes(name) : undefined,
      ),
    )
    .map(([name]) => name);
}

/** Effects that pass their threshold, or exactly the forced tier's set. */
export function qualifiedEffects(
  calibration: Calibration,
  scores: Readonly<Record<string, number>>,
  previous: readonly string[] | undefined,
  forced: Tier | null | undefined,
): string[] {
  return forced ? tierEffects(calibration, forced) : passingEffects(calibration, scores, previous);
}
