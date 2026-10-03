import type { CalibrationPatch } from "../../core/calibration/calibration.types";

/** One calibration refresh. The caller owns the stored state and saves the patch in `onPatch`. */
export interface CalibrationRequest {
  url: string;
  /** When the stored patch was fetched, undefined when there is none. */
  lastFetchedAt: number | undefined;
  nowMs: number;
  onPatch(patch: CalibrationPatch, fetchedAt: number): void;
}
