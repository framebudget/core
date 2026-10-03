import { afterEach, describe, expect, it, vi } from "vitest";
import type { ShareOptions } from "../../../src/core/telemetry/telemetry.types";
import { STORAGE_KEY } from "../../../src/platform/storage/storage.constants";
import type { FakeStorage } from "../../support/fake-browser.types";
import { createFakeStorage } from "../../support/fake-storage";
import { loadedPage, SHARE } from "../loaded-page";

const DAY = 86_400_000;
const FIRST_DAY = Date.UTC(2026, 9, 1);

/** A visit on day `day`, sharing the same localStorage across visits. Returns the beacons sent. */
async function visit(local: FakeStorage, day: number, share: ShareOptions = SHARE): Promise<number> {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(FIRST_DAY + day * DAY));
  const { browser } = await loadedPage({ local }, share);
  browser.fire("pagehide");
  vi.useRealTimers();
  return browser.beacons.length;
}

describe("one report per browser per interval", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports on the first visit, waits out the interval, then reports again", async () => {
    const local = createFakeStorage();
    expect(await visit(local, 0)).toBe(1);
    expect(await visit(local, 1)).toBe(0);
    expect(await visit(local, 6)).toBe(0);
    expect(await visit(local, 7)).toBe(1);
    expect(await visit(local, 8)).toBe(0);
  });

  it("honors a custom interval, and 0 reports every visit", async () => {
    const local = createFakeStorage();
    const daily = { ...SHARE, minIntervalDays: 1 };
    expect(await visit(local, 0, daily)).toBe(1);
    expect(await visit(local, 1, daily)).toBe(1);

    const always = createFakeStorage();
    const every = { ...SHARE, minIntervalDays: 0 };
    expect(await visit(always, 0, every)).toBe(1);
    expect(await visit(always, 0, every)).toBe(1);
  });

  it("reports again at once when the calibration version changes", async () => {
    const local = createFakeStorage();
    expect(await visit(local, 0)).toBe(1);
    const stored = JSON.parse(local.getItem(STORAGE_KEY) ?? "{}") as Record<string, unknown>;
    local.setItem(STORAGE_KEY, JSON.stringify({ ...stored, reportedCal: "an-older-calibration" }));
    expect(await visit(local, 1)).toBe(1);
  });

  it("does not start the interval when nothing was sent", async () => {
    const local = createFakeStorage();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(FIRST_DAY));
    const { browser } = await loadedPage({ local, gpc: true }, SHARE);
    browser.fire("pagehide");
    vi.useRealTimers();
    expect(browser.beacons).toEqual([]);
    expect(await visit(local, 0)).toBe(1);
  });

  it("treats a clock set back before the last report as due", async () => {
    const local = createFakeStorage();
    expect(await visit(local, 10)).toBe(1);
    expect(await visit(local, 2)).toBe(1);
  });
});
