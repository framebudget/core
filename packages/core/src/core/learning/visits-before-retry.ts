import type { Calibration } from "../calibration/calibration.types";
import type { BlockEntry } from "../state/stored-state.types";
import { MAX_FAILS } from "./learning.constants";

/** Clean visits an effect waits before a retry: retryVisits, doubled after every further stutter. */
export function visitsBeforeRetry(calibration: Calibration, entry: BlockEntry): number {
  return calibration.retryVisits * Math.pow(2, Math.max(0, Math.min(entry.fails, MAX_FAILS) - 1));
}
