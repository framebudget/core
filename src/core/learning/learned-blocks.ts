import type { Calibration } from "../calibration/calibration.types";
import type { StoredState } from "../state/stored-state.types";
import { visitsBeforeRetry } from "./visits-before-retry";

/** Effects that stuttered before and are not yet up for a retry. */
export function learnedBlocks(state: StoredState, calibration: Calibration): string[] {
  return Object.entries(state.blocked)
    .filter(([, entry]) => entry.clean < visitsBeforeRetry(calibration, entry))
    .map(([name]) => name);
}
