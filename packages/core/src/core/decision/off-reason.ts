import type { EffectDefinition } from "../calibration/calibration.types";
import type { Hints } from "../device/device.types";
import type { DecideInput, Decision, OffReason } from "./decision.types";

/** Off because of the visitor's motion or data preferences. */
function preferenceReason(definition: EffectDefinition, hints: Hints): OffReason | undefined {
  if (definition.motion && hints.reducedMotion) return "motion";
  return definition.data && (hints.saveData || hints.slowNetwork) ? "data" : undefined;
}

/** Off because the governor stepped it down here or it stuttered on earlier visits. A forced tier ignores both. */
function historyReason(input: DecideInput, name: string): OffReason | undefined {
  if (input.forced) return undefined;
  if (input.stepped?.includes(name)) return "governor";
  return input.learned?.includes(name) ? "learned" : undefined;
}

/** Why the effect is off, checked in order; undefined when it may run. */
export function offReason(
  input: DecideInput,
  qualified: readonly string[],
  name: string,
  definition: EffectDefinition,
): OffReason | undefined {
  return qualified.includes(name)
    ? (preferenceReason(definition, input.hints) ?? historyReason(input, name))
    : "threshold";
}

/** Off only because of its threshold: the visitor's preferences and the effect's history would let it run. */
export function isThresholdOnly(input: DecideInput, decision: Decision, name: string): boolean {
  const definition = input.calibration.effects[name];
  return !!definition && decision.off[name] === "threshold" && offReason(input, [name], name, definition) === undefined;
}
