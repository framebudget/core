import type { CalibrationPatch } from "../core/calibration/calibration.types";
import { defaultCalibration } from "../core/calibration/default-calibration";
import { mergeCalibration } from "../core/calibration/merge-calibration";
import { readHints } from "../platform/hints/read-hints";
import { readForcedTier } from "../platform/overrides/forced-tier";
import { readSimulatedScore } from "../platform/overrides/simulated-score";
import type { Scope } from "../platform/scope/scope.types";
import { loadState } from "../platform/storage/load-state";
import { openStorage } from "../platform/storage/open-storage";
import type { StartContext } from "./startup.types";

/** Calibration precedence: built-in numbers, then the fetched calibration, then the site's patches in order. */
export function loadContext(scope: Scope, patches: readonly (CalibrationPatch | undefined)[]): StartContext {
  const storage = openStorage(scope, "localStorage");
  const stored = loadState(storage);
  return {
    storage,
    stored,
    calibration: mergeCalibration(defaultCalibration, stored.remote, ...patches),
    hints: readHints(scope),
    forced: readForcedTier(scope),
    simulated: readSimulatedScore(scope),
  };
}
