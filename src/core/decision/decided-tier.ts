import type { Calibration } from "../calibration/calibration.types";
import { tierEffects } from "../calibration/tier-effects";
import { Tier } from "../tier/tier.enum";
import { TIERS } from "../tier/tier-order";
import type { OffReason } from "./decision.types";

/** Preferences do not lower the tier; thresholds, learning and the governor do. */
const TIER_NEUTRAL: ReadonlySet<OffReason | undefined> = new Set([undefined, "motion", "data"]);

/** The forced tier, else the highest tier whose whole set is on (or off only by preference). */
export function decidedTier(
  calibration: Calibration,
  off: Record<string, OffReason>,
  forced: Tier | null | undefined,
): Tier {
  return (
    forced ??
    TIERS.find((candidate) => tierEffects(calibration, candidate).every((name) => TIER_NEUTRAL.has(off[name]))) ??
    Tier.Lite
  );
}
