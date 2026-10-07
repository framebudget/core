import { describe, expect, it } from "vitest";
import type { TelemetryReport } from "../../../src/core/telemetry/telemetry.types";
import { sorted } from "../../support/sorted";
import { loadedPage, OWN_ENDPOINT, SHARE } from "../loaded-page";

const FRAMEBUDGET_REPORT_URL = "https://framebudget.dev/api/report";

describe("telemetry", () => {
  it("sends one anonymous report to framebudget.dev when the page is hidden, only if the site opted in", async () => {
    const { browser, budget } = await loadedPage({}, SHARE);
    expect(budget.snapshot().warm).not.toBeNull();
    browser.fire("pagehide");
    browser.fire("pagehide");
    expect(browser.beacons).toHaveLength(1);
    expect(browser.beacons[0]!.url).toBe(FRAMEBUDGET_REPORT_URL);

    const report = JSON.parse(browser.beacons[0]!.body) as TelemetryReport;
    expect(sorted(Object.keys(report))).toEqual(
      sorted(["cal", "cold", "effects", "fps", "hints", "kernels", "score", "stepped", "tickMs", "tier", "v", "warm"]),
    );
    expect(sorted(Object.keys(report.hints))).toEqual(["cores", "memoryGb", "reducedMotion"]);
    expect(report.tier).toBe(budget.tier);
    expect(report.effects).toEqual(sorted(budget.effects()));
  });

  it("turns on with every default from share: true", async () => {
    const { browser } = await loadedPage({}, true);
    browser.fire("pagehide");
    expect(browser.beacons.map((beacon) => beacon.url)).toEqual([FRAMEBUDGET_REPORT_URL]);
  });

  it("sends the same report to framebudget.dev and to the site's own endpoint", async () => {
    const { browser } = await loadedPage({}, { ...SHARE, alsoSendTo: OWN_ENDPOINT });
    browser.fire("pagehide");
    expect(browser.beacons.map((beacon) => beacon.url)).toEqual([FRAMEBUDGET_REPORT_URL, OWN_ENDPOINT]);
    expect(browser.beacons[1]!.body).toBe(browser.beacons[0]!.body);

    const same = await loadedPage({}, { ...SHARE, alsoSendTo: FRAMEBUDGET_REPORT_URL });
    same.browser.fire("pagehide");
    expect(same.browser.beacons.map((beacon) => beacon.url)).toEqual([FRAMEBUDGET_REPORT_URL]);
  });

  it("sends nothing when sharing is not configured or set to false", async () => {
    for (const share of [undefined, false, null]) {
      const { browser } = await loadedPage({}, share);
      browser.fire("pagehide");
      expect(browser.beacons).toEqual([]);
    }
  });

  it("sends nothing under Global Privacy Control or Save-Data, not even to the site's own endpoint", async () => {
    for (const options of [{ gpc: true }, { saveData: true }]) {
      const { browser } = await loadedPage(options, { ...SHARE, alsoSendTo: OWN_ENDPOINT });
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
