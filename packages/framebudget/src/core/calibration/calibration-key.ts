import type { Calibration } from "./calibration.types";
import { KERNEL_NAMES } from "./kernel-names";

/**
 * Identifies the units of a score. A cached score is only reused when the key
 * matches, so overriding reference rates invalidates old scores.
 */
export function calibrationKey(calibration: Calibration): string {
  return calibration.version + ":" + KERNEL_NAMES.map((name) => calibration.reference[name]).join(",");
}
