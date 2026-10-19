import { describe, expect, it } from "vitest";
import type { ChangeReason } from "../../../src/budget/budget.types";
import type { TelemetryReport } from "../../../src/core/telemetry/telemetry.types";
import { bootedPage } from "../../support/booted-page";
import { smooth, stutter } from "../../support/frames";
import { stored } from "../../support/stored";
import { SHARE } from "../loaded-page";

describe("capacity in the budget", () => {
  it("lets a newly used effect run once the current task ends, when the page's load fits", async () => {
    const { browser, budget } = bootedPage(60);
    budget.configure({ calibration: { capacity: 12 } });
    await browser.settle();
    const reasons: ChangeReason[] = [];
    budget.on("change", (_snapshot, reason) => {
      reasons.push(reason);
    });
    expect(budget.allows("parallax")).toBe(false); // never changes inside the call, so renders stay pure
    await Promise.resolve();
    expect(budget.allows("parallax")).toBe(true);
    expect(budget.snapshot()).toMatchObject({ promoted: ["parallax"], tier: "Medium" });
    expect(reasons).toEqual(["capacity"]);
    budget.allows("blur"); // blur's load would not fit next to parallax
    await Promise.resolve();
    expect(budget.allows("blur")).toBe(false);
  });
});

describe("exploration", () => {
  it("turns one used effect on below its threshold, reports it, and learns nothing from its stutter", async () => {
    const { browser, budget, local } = bootedPage(60);
    await browser.settle();
    budget.allows("parallax"); // threshold 70: within 25% of a score of 60
    budget.allows("hover");
    budget.configure({ uses: ["sound", "unknownEffect"], share: { ...SHARE, explore: 1 } });
    expect(budget.snapshot()).toMatchObject({ explored: "parallax", tier: "Medium" });
    expect(budget.allows("parallax")).toBe(true);

    stutter(budget);
    smooth(budget);
    expect(budget.snapshot().stepped).toEqual(["parallax"]);
    expect(stored(local).blocked).toEqual({});
    expect(stored(local).qualified).not.toContain("parallax");

    browser.fire("pagehide");
    const report = JSON.parse(browser.beacons[0]!.body) as TelemetryReport;
    // Declared uses count; names outside the calibration are left out.
    expect(report).toMatchObject({ explored: "parallax", stepped: ["parallax"], used: ["hover", "parallax", "sound"] });
  });

  it("does not explore without the site's explore rate", async () => {
    const { browser, budget } = bootedPage(60);
    await browser.settle();
    budget.allows("parallax");
    budget.configure({ share: SHARE });
    expect(budget.snapshot().explored).toBeNull();
    expect(budget.allows("parallax")).toBe(false);
  });
});
