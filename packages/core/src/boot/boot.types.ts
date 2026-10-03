import type { CalibrationPatch } from "../core/calibration/calibration.types";

export interface BootOptions {
  /** Same patch you pass to `configure({ calibration })`, so boot and core agree. */
  calibration?: CalibrationPatch;
  /** Cold benchmark slice budget in ms. Default 1.6 (about 2 ms for the whole boot script). */
  coldMs?: number;
}
