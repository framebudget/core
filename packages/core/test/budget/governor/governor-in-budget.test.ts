import { describe, expect, it } from "vitest";
import type { ChangeReason } from "../../../src/budget/budget.types";
import { bootedPage as page } from "../../support/booted-page";
import { smooth, stutter } from "../../support/frames";
import { stored } from "../../support/stored";

describe("governor in the budget", () => {
  it("steps down the most expensive used effect on a guess, and keeps it when the frames recover", async () => {
    const { browser, budget, local } = page(200);
    await browser.settle();
    for (const effect of ["hover", "entrances", "parallax"]) budget.allows(effect);
    stutter(budget);
    // canvasHiRes and blur cost more, but this page does not use them.
    expect(budget.snapshot().stepped).toEqual(["parallax"]);
    expect(budget.allows("canvasHiRes")).toBe(true);
    expect(browser.attributes["data-framebudget-effects"]!.split(" ")).not.toContain("parallax");
    smooth(budget);
    expect(budget.snapshot().stepped).toEqual(["parallax"]);
    expect(stored(local).blocked).toEqual({ parallax: { clean: 0, fails: 1 } });
  });

  it("adds guesses while the frames do not recover, then turns them all back on, learns nothing and stops", async () => {
    const { browser, budget, local } = page(200);
    await browser.settle();
    const reasons: ChangeReason[] = [];
    budget.on("change", (_snapshot, reason) => {
      reasons.push(reason);
    });
    stutter(budget); // no use reported: every allowed effect is a candidate
    expect(budget.snapshot().stepped).toEqual(["canvasHiRes"]);
    stutter(budget); // one step may not move frames past a vsync: one more
    stutter(budget);
    expect(budget.snapshot().stepped).toEqual(["canvasHiRes", "blur", "parallax"]);
    stutter(budget);
    expect(budget.snapshot().stepped).toEqual([]);
    expect(budget.allows("canvasHiRes")).toBe(true);
    for (let index = 0; index < 4; index++) stutter(budget);
    expect(budget.snapshot().stepped).toEqual([]);
    expect(reasons).toEqual(["governor", "governor", "governor", "governor"]);
    expect(stored(local).blocked).toEqual({});
  });

  it("steps down the effect whose own frames are slow, for good, and counts it as used", async () => {
    const { browser, budget, local } = page(200);
    await browser.settle();
    stutter(budget, "entrances");
    expect(budget.snapshot()).toMatchObject({ stepped: ["entrances"], used: ["entrances"] });
    expect(budget.allows("canvasHiRes")).toBe(true);
    expect(stored(local).blocked).toEqual({ entrances: { clean: 0, fails: 1 } });
  });

  it("steps nothing down for frames of an effect that is already off", async () => {
    const { browser, budget } = page(40);
    await browser.settle();
    stutter(budget, "canvasHiRes");
    expect(budget.snapshot().stepped).toEqual([]);
  });

  it("does not step down while a tier is forced", async () => {
    const { browser, budget } = page(200);
    await browser.settle();
    budget.force("Full");
    stutter(budget);
    expect(budget.snapshot().stepped).toEqual([]);
    expect(budget.allows("canvasHiRes")).toBe(true);
  });
});
