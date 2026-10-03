import type { Calibration, CalibrationPatch } from "../calibration.types";
import { mergeEffects } from "./merge-effects";
import { mergeKnown } from "./merge-known";

/** One patch over the calibration: known fields first, then the effect registry. */
function applyPatch(calibration: Calibration, patch: CalibrationPatch | null | undefined): Calibration {
  const merged = mergeKnown(calibration, patch);
  return { ...merged, effects: mergeEffects(merged.effects, patch?.effects) };
}

function applyPatches(
  calibration: Calibration,
  patches: readonly (CalibrationPatch | null | undefined)[],
): Calibration {
  return patches.length === 0 ? calibration : applyPatches(applyPatch(calibration, patches[0]), patches.slice(1));
}

/** Keeps values that pass validation but would break the math in range. */
function clampCalibration(calibration: Calibration): Calibration {
  return {
    ...calibration,
    hysteresis: Math.min(calibration.hysteresis, 0.5),
    pressure: {
      ...calibration.pressure,
      serious: Math.min(calibration.pressure.serious, 1),
      critical: Math.min(calibration.pressure.critical, 1),
    },
    retryVisits: Math.round(calibration.retryVisits),
  };
}

/**
 * Merges patches over a base calibration, later patches winning. Every value is
 * validated, so patches can come from storage or the network. A new effect is
 * only added when the patch gives both its threshold and its cost.
 */
export function mergeCalibration(base: Calibration, ...patches: (CalibrationPatch | null | undefined)[]): Calibration {
  // A deep copy first, so the result never shares objects with `base`.
  const copy = JSON.parse(JSON.stringify(base)) as Calibration;
  return clampCalibration(applyPatches(copy, patches));
}
