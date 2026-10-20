import { describe, expect, it } from "vitest";
import { createBudget } from "../../../src/budget/create-budget";
import { fakeBrowser } from "../../support/fake-browser";
import { pauseForever } from "../../support/booted-page";
import { createFakeStorage } from "../../support/fake-storage";
import { stored } from "../../support/stored";

/** A page with the default governor (warm-up, windows of 30, 3 strikes) that has not loaded yet. */
function loadingPage(local = createFakeStorage()) {
  const browser = fakeBrowser({ local });
  browser.scope.__framebudget = {
    v: 1,
    score: 200,
    source: "cold",
    cold: null,
    tier: "Full",
    effects: [],
    qualified: [],
    forced: null,
  };
  const budget = createBudget({ scope: browser.scope, pause: pauseForever });
  budget.configure({ governor: { auto: false } });
  return { browser, budget };
}

describe("short effects", () => {
  it("judges an effect that ran at 20 fps while the page loaded, and the next visit starts without it", async () => {
    const { browser, budget } = loadingPage();
    for (let index = 0; index < 40; index++) budget.reportFrame(50, "entrances"); // a 2 s draw-in, before load
    expect(budget.snapshot().stepped).toEqual([]);
    await browser.settle(); // load: the queued frames reach the governor, the run ends once it is silent
    expect(budget.snapshot().stepped).toEqual(["entrances"]);
    expect(stored(browser.local).blocked).toEqual({ entrances: { clean: 0, fails: 1 } });

    const { budget: nextBudget } = loadingPage(browser.local);
    expect(nextBudget.allows("entrances")).toBe(false);
    expect(nextBudget.snapshot().off.entrances).toBe("learned");
  });

  it("keeps an effect that ran at 60 fps while the page loaded", async () => {
    const { browser, budget } = loadingPage();
    for (let index = 0; index < 60; index++) budget.reportFrame(16.7, "entrances");
    await browser.settle();
    expect(budget.snapshot().stepped).toEqual([]);
    expect(budget.allows("entrances")).toBe(true);
  });

  it("judges a page transition cut short when the page is hidden", async () => {
    const { browser, budget } = loadingPage();
    await browser.settle();
    for (let index = 0; index < 16; index++) budget.reportFrame(50, "pageTransition"); // 800 ms at 20 fps
    expect(budget.snapshot().stepped).toEqual([]);
    browser.fire("pagehide");
    expect(budget.snapshot().stepped).toEqual(["pageTransition"]);
  });
});
