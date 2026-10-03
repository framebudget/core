import { describe, expect, it } from "vitest";
import type { TelemetryReport } from "../../../src/core/telemetry/telemetry.types";
import { sorted } from "../../support/sorted";
import { loadedPage, SHARE } from "../loaded-page";

describe("telemetry", () => {
  it("sends one anonymous report when the page is hidden, only if the site opted in", async () => {
    const { browser, budget } = await loadedPage({}, SHARE);
    expect(budget.snapshot().warm).not.toBeNull();
    browser.fire("pagehide");
    browser.fire("pagehide");
    expect(browser.beacons).toHaveLength(1);
    expect(browser.beacons[0]!.url).toBe(SHARE.endpoint);

    const report = JSON.parse(browser.beacons[0]!.body) as TelemetryReport;
    expect(sorted(Object.keys(report))).toEqual(
      sorted(["cal", "cold", "effects", "fps", "hints", "kernels", "score", "stepped", "tickMs", "tier", "v", "warm"]),
    );
    expect(sorted(Object.keys(report.hints))).toEqual(["cores", "memoryGb", "reducedMotion"]);
    expect(report.tier).toBe(budget.tier);
    expect(report.effects).toEqual(sorted(budget.effects()));
  });

  it("sends nothing when sharing is not configured", async () => {
    const { browser } = await loadedPage();
    browser.fire("pagehide");
    expect(browser.beacons).toEqual([]);
  });

  it("sends nothing under Global Privacy Control or Save-Data", async () => {
    for (const options of [{ gpc: true }, { saveData: true }]) {
      const { browser } = await loadedPage(options, SHARE);
      browser.fire("pagehide");
      expect(browser.beacons).toEqual([]);
    }
  });

  it("checks Global Privacy Control again at send time", async () => {
    const { browser } = await loadedPage({}, SHARE);
    browser.navigator.globalPrivacyControl = true;
    browser.fire("pagehide");
    expect(browser.beacons).toEqual([]);
  });

  it("sends nothing from page views outside the sample or with a forced tier", async () => {
    const outside = await loadedPage({}, { ...SHARE, sampleRate: 0.1 }, () => 0.5);
    outside.browser.fire("pagehide");
    expect(outside.browser.beacons).toEqual([]);

    const forced = await loadedPage({ search: "?framebudget-tier=Full" }, SHARE);
    forced.browser.fire("pagehide");
    expect(forced.browser.beacons).toEqual([]);
  });
});
