import type { Calibration } from "../calibration/calibration.types";
import { tierEffects } from "../calibration/tier-effects";
import type { Tier } from "../tier/tier.enum";
import { isQualified } from "./is-qualified";

/** Effects that pass their threshold with hysteresis against the previous page. */
function passingEffects(calibration: Calibration, score: number, previous: readonly string[] | undefined): string[] {
  return Object.entries(calibration.effects)
    .filter(([name, definition]) =>
      isQualified(score, definition.threshold, calibration.hysteresis, previous ? previous.includes(name) : undefined),
    )
    .map(([name]) => name);
}

/** Effects that pass their threshold, or exactly the forced tier's set. */
export function qualifiedEffects(
  calibration: Calibration,
  score: number,
  previous: readonly string[] | undefined,
  forced: Tier | null | undefined,
): string[] {
  return forced ? tierEffects(calibration, forced) : passingEffects(calibration, score, previous);
}
