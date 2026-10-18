import { describe, expect, it } from "vitest";
import { createBudget } from "../../../src/budget/create-budget";
import type { BootState } from "../../../src/platform/scope/scope.types";
import { animationFrames } from "../../support/frames";
import { pauseForever } from "../../support/booted-page";
import { fakeBrowser } from "../../support/fake-browser";
import { stored } from "../../support/stored";

const BOOT: BootState = {
  v: 1,
  score: 200,
  source: "cold",
  cold: null,
  tier: "Full",
  effects: [],
  qualified: [],
  forced: null,
};

describe("main-thread frame sampling", () => {
  it("keeps sampling past the interaction window until a guess has its verdict", async () => {
    const browser = fakeBrowser();
    browser.scope.__framebudget = BOOT;
    const runFrames = animationFrames(browser);
    const budget = createBudget({ scope: browser.scope, pause: pauseForever });
    budget.configure({ governor: { warmupMs: 0, cooldownMs: 5000, windowFrames: 2, strikes: 1, cleanWindows: 2 } });
    await browser.settle();
    const steps: string[][] = [];
    budget.on("change", (snapshot) => {
      steps.push(snapshot.stepped);
    });

    runFrames(16.7); // the first seconds after load, until sampling stops
    browser.fire("scroll"); // 3 s of sampling
    runFrames(50, 3);
    expect(steps).toEqual([["canvasHiRes"]]);

    // The 5 s cooldown alone outlasts the 3 s of interaction sampling; sampling stops once the guess is judged.
    expect(runFrames(16.7, 2000)).toBeGreaterThan(5000 / 16.7);
    expect(runFrames(16.7)).toBe(0);
    expect(steps).toEqual([["canvasHiRes"]]);
    expect(stored(browser.local).blocked).toEqual({ canvasHiRes: { clean: 0, fails: 1 } });
  });
});
