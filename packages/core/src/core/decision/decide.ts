import { fromEntries } from "../object/from-entries";
import { effectScore } from "../score/effect-score";
import { decidedTier } from "./decided-tier";
import type { DecideInput, Decision, OffReason } from "./decision.types";
import { effectiveScore } from "./effective-score";
import { offReason } from "./off-reason";
import { qualifiedEffects } from "./qualified-effects";

/** Each effect's score with its kernel weights, after pressure and hardware caps. */
function effectScores(input: DecideInput): Record<string, number> {
  const { calibration, hints, pressure } = input;
  return fromEntries(
    Object.entries(calibration.effects).map(([name, definition]) => [
      name,
      effectiveScore(calibration, effectScore(definition, input.score, input.ratios), hints, pressure),
    ]),
  );
}

export function decide(input: DecideInput): Decision {
  const { calibration, hints, forced } = input;
  const score = effectiveScore(calibration, input.score, hints, input.pressure);
  const scores = effectScores(input);
  const qualified = qualifiedEffects(calibration, scores, input.previous, forced);
  const reasons = Object.entries(calibration.effects).map(([name, definition]): [string, OffReason | undefined] => [
    name,
    offReason(input, qualified, name, definition),
  ]);
  const effects = reasons.filter(([, reason]) => reason === undefined).map(([name]) => name);
  const off = fromEntries(reasons.filter((entry): entry is [string, OffReason] => entry[1] !== undefined));
  const tier = decidedTier(calibration, off, forced);
  return { tier, effects, qualified, off, score, scores, promoted: [], explored: null };
}
