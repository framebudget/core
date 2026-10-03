import { calibrationKey } from "../core/calibration/calibration-key";
import type { StartContext } from "./startup.types";

const DAY_MS = 86_400_000;

/** The cached warm score, when it is recent and in the same units. */
export function cachedScore(context: StartContext, nowMs: number): number | undefined {
  const { stored, calibration } = context;
  const isFresh = stored.at !== undefined && nowMs - stored.at < calibration.scoreMaxAgeDays * DAY_MS;
  return isFresh && stored.score !== undefined && stored.key === calibrationKey(calibration) ? stored.score : undefined;
}
