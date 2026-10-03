import type { BootState } from "../../src/platform/scope/scope.types";
import { createBudget } from "../../src/budget/create-budget";
import { fakeBrowser } from "./fake-browser";
import type { BootedPage } from "./fake-browser.types";
import { createFakeStorage } from "./fake-storage";

/** A pause that never resolves, so the warm benchmark never finishes. */
export function pauseForever(): Promise<never> {
  return new Promise<never>(() => {
    // Never settles.
  });
}

/** A page whose boot script measured `score`; the warm benchmark never finishes. */
export function bootedPage(score: number, local = createFakeStorage(), session = createFakeStorage()): BootedPage {
  const browser = fakeBrowser({ local, session });
  const boot: BootState = {
    v: 1,
    score,
    source: "cold",
    cold: null,
    tier: "Full",
    effects: [],
    qualified: [],
    forced: null,
  };
  browser.scope.__framebudget = boot;
  const budget = createBudget({ scope: browser.scope, pause: pauseForever });
  budget.configure({
    governor: { auto: false, warmupMs: 0, cooldownMs: 0, windowFrames: 2, strikes: 1, cleanWindows: 2 },
  });
  return { browser, budget, local, session };
}
