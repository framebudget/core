import { describe, expect, it } from "vitest";
import type { TelemetryReport } from "../../../src/core/telemetry/telemetry.types";
import { bootedPage } from "../../support/booted-page";
import { stutter } from "../../support/frames";
import { SHARE } from "../loaded-page";

describe("explored effect and report step-downs", () => {
  it("stops exploring an effect once it passes its threshold on its own", async () => {
    const { browser, budget } = bootedPage(60);
    await browser.settle();
    budget.allows("parallax");
    budget.configure({ share: { ...SHARE, explore: 1 } });
    expect(budget.snapshot().explored).toBe("parallax");
    budget.configure({ calibration: { effects: { parallax: { threshold: 40 } } } });
    expect(budget.snapshot().explored).toBeNull();
    browser.fire("pagehide");
    expect((JSON.parse(browser.beacons[0]!.body) as TelemetryReport).explored).toBeNull();
  });

  it("keeps exploring through a forced tier", async () => {
    const { browser, budget } = bootedPage(60);
    await browser.settle();
    budget.allows("parallax");
    budget.configure({ share: { ...SHARE, explore: 1 } });
    budget.force("Full");
    budget.force("auto");
    expect(budget.snapshot().explored).toBe("parallax");
    expect(budget.allows("parallax")).toBe(true);
  });

  it("leaves guesses still being checked out of the report's step-downs", async () => {
    const { browser, budget } = bootedPage(200);
    await browser.settle();
    budget.configure({ share: SHARE });
    stutter(budget);
    expect(budget.snapshot().stepped).toEqual(["canvasHiRes"]);
    browser.fire("pagehide");
    const report = JSON.parse(browser.beacons[0]!.body) as TelemetryReport;
    expect(report.stepped).toEqual([]);
    expect(report.effects).not.toContain("canvasHiRes");
  });
});
