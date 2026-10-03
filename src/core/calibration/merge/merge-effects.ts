import { fromEntries } from "../../object/from-entries";
import type { EffectDefinition } from "../calibration.types";
import { isCalibrationNumber } from "./is-calibration-number";
import { mergeKnown } from "./merge-known";

/** The boolean flags the patch sets. */
function effectFlags(patch: Partial<EffectDefinition>): Pick<EffectDefinition, "motion" | "data"> {
  return {
    ...(typeof patch.motion === "boolean" && { motion: patch.motion }),
    ...(typeof patch.data === "boolean" && { data: patch.data }),
  };
}

/**
 * One effect after the patch, or undefined when the patch is not an object or
 * would add a new effect without both its threshold and its cost.
 */
function mergedEffect(
  effects: Record<string, EffectDefinition>,
  name: string,
  effectPatch: unknown,
): EffectDefinition | undefined {
  if (!effectPatch || typeof effectPatch !== "object") return undefined;
  const patch = effectPatch as Partial<EffectDefinition>;
  const existing = Object.keys(effects).includes(name) ? effects[name] : undefined;
  const isComplete = isCalibrationNumber(patch.threshold) && isCalibrationNumber(patch.cost);
  return existing || isComplete
    ? { ...mergeKnown(existing ?? { threshold: 0, cost: 0 }, patch), ...effectFlags(patch) }
    : undefined;
}

/** The effect registry with the patch's effects merged in. A new effect goes last. */
export function mergeEffects(
  effects: Record<string, EffectDefinition>,
  patch: unknown,
): Record<string, EffectDefinition> {
  if (!patch || typeof patch !== "object") return effects;
  const updates = Object.entries(patch as Record<string, unknown>)
    .map(([name, effectPatch]): [string, EffectDefinition | undefined] => [
      name,
      mergedEffect(effects, name, effectPatch),
    ])
    .filter((entry): entry is [string, EffectDefinition] => entry[1] !== undefined);
  return { ...effects, ...fromEntries(updates) };
}
