import type { StoredState } from "../state/stored-state.types";
import { DAY_MS, DEFAULT_REPORT_INTERVAL_DAYS } from "./telemetry.constants";
import type { ShareOptions } from "./telemetry.types";

function intervalDays(share: ShareOptions): number {
  const days = share.minIntervalDays;
  return typeof days === "number" && days >= 0 ? days : DEFAULT_REPORT_INTERVAL_DAYS;
}

/** Whether this browser may report again: never reported, a new calibration, or the interval has passed. */
export function isReportDue(
  share: ShareOptions,
  state: StoredState,
  calibrationVersion: string,
  nowMs: number,
): boolean {
  const { reportedAt } = state;
  if (reportedAt === undefined || state.reportedCal !== calibrationVersion) return true;
  // A clock set back past the last report counts as due, so a broken clock never silences a device for good.
  return nowMs < reportedAt || nowMs - reportedAt >= intervalDays(share) * DAY_MS;
}
