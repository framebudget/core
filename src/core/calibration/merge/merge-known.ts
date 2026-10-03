import { fromEntries } from "../../object/from-entries";
import { isCalibrationNumber } from "./is-calibration-number";

const MAX_STRING_LENGTH = 64;

/** The validated patch value when it fits the current one, else the current value. */
function mergedValue(key: string, current: unknown, patched: unknown): unknown {
  if (typeof current === "number") return isCalibrationNumber(patched) ? patched : current;
  if (typeof current === "string") {
    return typeof patched === "string" && patched.length <= MAX_STRING_LENGTH ? patched : current;
  }
  return current && typeof current === "object" && key !== "effects" ? mergeKnown(current, patched) : current;
}

/**
 * Copies validated values for the keys `target` already has: numbers, short
 * strings, nested objects. Returns a new object; `target` is left as it is.
 */
export function mergeKnown<Fields extends object>(target: Fields, patch: unknown): Fields {
  if (!patch || typeof patch !== "object") return target;
  const source = patch as Record<string, unknown>;
  const entries = Object.entries(target).map(([key, current]): [string, unknown] => [
    key,
    mergedValue(key, current, source[key]),
  ]);
  return fromEntries(entries) as Fields;
}
