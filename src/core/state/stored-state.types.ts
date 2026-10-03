import type { CalibrationPatch } from "../calibration/calibration.types";

export interface BlockEntry {
  /** Clean visits since the last stutter. */
  clean: number;
  /** Times the effect stuttered. Each one doubles the wait before a retry. */
  fails: number;
}

/** Everything framebudget keeps on the device (per origin, localStorage). */
export interface StoredState {
  v: 1;
  /** calibrationKey() of the calibration the score was measured against. */
  key?: string;
  /** Smoothed warm score from earlier pages. */
  score?: number;
  /** Date.now() when the score was stored. */
  at?: number;
  /** Effects that passed their threshold on the last page, for hysteresis. */
  qualified?: string[];
  /** Effects that stuttered (local learning). */
  blocked: Record<string, BlockEntry>;
  /** Calibration fetched from the site's calibration URL, used from the next visit. */
  remote?: CalibrationPatch;
  remoteAt?: number;
}
