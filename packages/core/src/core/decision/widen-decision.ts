import { promotedEffects } from "../capacity/promoted-effects";
import { fromEntries } from "../object/from-entries";
import type { Decision, WidenInput } from "./decision.types";
import { isThresholdOnly } from "./off-reason";

/**
 * What the page can run beyond its thresholds: the effects the capacity
 * promotes, then the effect this page view explores. The tier and the
 * qualified effects stay as decided, so neither moves the tier or the
 * hysteresis of the next page.
 */
export function widenDecision(input: WidenInput, decision: Decision): Decision {
  const promoted = promotedEffects(input, decision);
  const { explored: candidate } = input;
  const explored =
    candidate !== null && !promoted.includes(candidate) && isThresholdOnly(input, decision, candidate)
      ? candidate
      : null;
  const added = explored === null ? promoted : [...promoted, explored];
  if (added.length === 0) return decision;
  return {
    ...decision,
    effects: Object.keys(input.calibration.effects).filter(
      (name) => decision.effects.includes(name) || added.includes(name),
    ),
    off: fromEntries(Object.entries(decision.off).filter(([name]) => !added.includes(name))),
    promoted,
    explored,
  };
}
