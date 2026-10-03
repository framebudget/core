import type { Calibration } from "../calibration/calibration.types";
import type { Hints, PressureState } from "../device/device.types";

/** Compute Pressure multiplier for the state; 1 when the state does not slow the score. */
function pressureFactor(calibration: Calibration, pressure: PressureState | undefined): number {
  if (pressure === "serious") return calibration.pressure.serious;
  return pressure === "critical" ? calibration.pressure.critical : 1;
}

/** Low memory or few cores: the device gets the capped score at most. */
function isLowEnd(calibration: Calibration, hints: Hints): boolean {
  const isLowMemory = hints.memoryGb !== undefined && hints.memoryGb <= calibration.caps.lowMemoryGb;
  const hasFewCores = hints.cores !== undefined && hints.cores <= calibration.caps.lowCores;
  return isLowMemory || hasFewCores;
}

/** Score after Compute Pressure and the low-end hardware caps. */
export function effectiveScore(
  calibration: Calibration,
  score: number,
  hints: Hints,
  pressure?: PressureState,
): number {
  const pressured = score * pressureFactor(calibration, pressure);
  return isLowEnd(calibration, hints) ? Math.min(pressured, calibration.caps.lowScore) : pressured;
}
