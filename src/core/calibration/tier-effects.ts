import type { Tier } from "../tier/tier.enum";
import type { Calibration } from "./calibration.types";

/** Effects in a tier's set: threshold at or below the tier floor. */
export function tierEffects(calibration: Calibration, tier: Tier): string[] {
  const floor = calibration.tiers[tier];
  return Object.entries(calibration.effects)
    .filter(([, definition]) => definition.threshold <= floor)
    .map(([name]) => name);
}
