import { fromEntries } from "../object/from-entries";
import { decidedTier } from "./decided-tier";
import type { DecideInput, Decision, OffReason } from "./decision.types";
import { effectiveScore } from "./effective-score";
import { offReason } from "./off-reason";
import { qualifiedEffects } from "./qualified-effects";

export function decide(input: DecideInput): Decision {
  const { calibration, hints, forced } = input;
  const score = effectiveScore(calibration, input.score, hints, input.pressure);
  const qualified = qualifiedEffects(calibration, score, input.previous, forced);
  const reasons = Object.entries(calibration.effects).map(([name, definition]): [string, OffReason | undefined] => [
    name,
    offReason(input, qualified, name, definition),
  ]);
  const effects = reasons.filter(([, reason]) => reason === undefined).map(([name]) => name);
  const off = fromEntries(reasons.filter((entry): entry is [string, OffReason] => entry[1] !== undefined));
  return { tier: decidedTier(calibration, off, forced), effects, qualified, off, score };
}
