import { describe, expect, it } from "vitest";
import type { ChangeReason } from "../../src/budget/budget.types";
import { STORAGE_KEY } from "../../src/platform/storage/storage.constants";
import { bootedPage } from "../support/booted-page";
import { createFakeStorage } from "../support/fake-storage";
import { sorted } from "../support/sorted";

describe("simulate", () => {
  it("feeds the simulated score through thresholds and always emits change", async () => {
    const { browser, budget } = bootedPage(200);
    await browser.settle();
    const events: [ChangeReason, string, number | null][] = [];
    budget.on("change", (snapshot, reason) => {
      events.push([reason, snapshot.tier, snapshot.simulated]);
    });

    budget.simulate(40);
    expect(budget.tier).toBe("Medium");
    expect(sorted(budget.effects())).toEqual(["canvasLowRes", "entrances", "hover"]);
    expect(budget.snapshot()).toMatchObject({ simulated: 40, source: "simulated", rawScore: 40 });
    expect(browser.attributes["data-framebudget"]).toBe("Medium");

    budget.simulate(40); // same device again: no decision change, still an event
    budget.simulate(null);
    expect(budget.tier).toBe("Full");
    expect(budget.snapshot()).toMatchObject({ simulated: null, source: "cold", rawScore: 200 });
    expect(events).toEqual([
      ["simulate", "Medium", 40],
      ["simulate", "Medium", 40],
      ["simulate", "Full", null],
    ]);
  });

  it("keeps hysteresis between simulated devices", async () => {
    const { browser, budget } = bootedPage(200);
    await browser.settle();
    // parallax: threshold 70, kept on down to 63, turned on again from 77.
    budget.simulate(66);
    expect(budget.allows("parallax")).toBe(true);
    budget.simulate(60);
    expect(budget.allows("parallax")).toBe(false);
    budget.simulate(74);
    expect(budget.allows("parallax")).toBe(false);
    budget.simulate(78);
    expect(budget.allows("parallax")).toBe(true);
  });

  it("lets the governor step down, stores nothing about the real device, and starts each device fresh", async () => {
    const local = createFakeStorage();
    const { browser, budget } = bootedPage(200, local);
    await browser.settle();
    const before = local.getItem(STORAGE_KEY);

    budget.simulate(150);
    budget.reportFrame(40);
    budget.reportFrame(40);
    expect(budget.snapshot().stepped).toEqual(["canvasHiRes"]);
    for (let index = 0; index < 8; index++) budget.reportFrame(16.7); // would make a clean visit
    budget.simulate(50);
    expect(local.getItem(STORAGE_KEY)).toBe(before);
    expect(budget.snapshot().stepped).toEqual([]);

    budget.simulate(null);
    expect(budget.allows("canvasHiRes")).toBe(true);
  });
});
