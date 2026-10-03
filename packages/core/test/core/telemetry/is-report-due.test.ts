import { describe, expect, it } from "vitest";
import type { StoredState } from "../../../src/core/state/stored-state.types";
import { isReportDue } from "../../../src/core/telemetry/is-report-due";
import type { ShareOptions } from "../../../src/core/telemetry/telemetry.types";

const DAY = 86_400_000;
const REPORTED_AT = 1000 * DAY;
const SHARE: ShareOptions = { endpoint: "https://collect.example/fb" };
const REPORTED: StoredState = { v: 1, blocked: {}, reportedAt: REPORTED_AT, reportedCal: "cal-1" };

const isDueAfter = (days: number, share: ShareOptions = SHARE): boolean =>
  isReportDue(share, REPORTED, "cal-1", REPORTED_AT + days * DAY);

describe("isReportDue", () => {
  it("is due when this browser never reported or reported under another calibration", () => {
    expect(isReportDue(SHARE, { v: 1, blocked: {} }, "cal-1", REPORTED_AT)).toBe(true);
    expect(isReportDue(SHARE, { ...REPORTED, reportedCal: undefined }, "cal-1", REPORTED_AT)).toBe(true);
    expect(isReportDue(SHARE, REPORTED, "cal-2", REPORTED_AT)).toBe(true);
  });

  it("waits 7 days by default, due exactly at the boundary", () => {
    expect(isDueAfter(0)).toBe(false);
    expect(isDueAfter(7 - 1 / DAY)).toBe(false);
    expect(isDueAfter(7)).toBe(true);
  });

  it("falls back to 7 days for a negative or non-number interval, and 0 turns the wait off", () => {
    expect(isDueAfter(6, { ...SHARE, minIntervalDays: -1 })).toBe(false);
    expect(isDueAfter(6, { ...SHARE, minIntervalDays: "2" as unknown as number })).toBe(false);
    expect(isDueAfter(2, { ...SHARE, minIntervalDays: 2 })).toBe(true);
    expect(isDueAfter(0, { ...SHARE, minIntervalDays: 0 })).toBe(true);
  });

  it("is due when the clock was set back before the last report", () => {
    expect(isDueAfter(-1 / DAY)).toBe(true);
  });
});
