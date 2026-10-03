import { describe, expect, it } from "vitest";
import { bootedPage as page } from "../support/booted-page";

describe("governor in the budget", () => {
  it("steps the most expensive allowed effect down first, one per strike-out", async () => {
    const { browser, budget } = page(200);
    await browser.settle();
    const reasons: string[] = [];
    budget.on("change", (_snapshot, reason) => {
      reasons.push(reason);
    });
    const order: string[] = [];
    for (let index = 0; index < 4; index++) {
      const before = budget.effects();
      budget.reportFrame(40);
      budget.reportFrame(40);
      order.push(...before.filter((effect) => !budget.effects().includes(effect)));
    }
    // By cost; pageTransition and canvasLowRes cost the same, the higher threshold goes first.
    expect(order).toEqual(["canvasHiRes", "blur", "parallax", "pageTransition"]);
    expect(reasons).toEqual(["governor", "governor", "governor", "governor"]);
    expect(budget.snapshot().stepped).toEqual(order);
    expect(budget.tier).toBe("Medium");
    expect(browser.attributes["data-framebudget"]).toBe("Medium");
    expect(browser.attributes["data-framebudget-effects"]!.split(" ")).not.toContain("parallax");
  });

  it("steps down the effect whose own frames are slow", async () => {
    const { browser, budget } = page(200);
    await browser.settle();
    budget.reportFrame(40, "entrances");
    budget.reportFrame(40, "entrances");
    expect(budget.snapshot().stepped).toEqual(["entrances"]);
    expect(budget.allows("canvasHiRes")).toBe(true);
  });

  it("does not step down while a tier is forced", async () => {
    const { browser, budget } = page(200);
    await browser.settle();
    budget.force("Full");
    budget.reportFrame(40);
    budget.reportFrame(40);
    expect(budget.snapshot().stepped).toEqual([]);
    expect(budget.allows("canvasHiRes")).toBe(true);
  });
});
