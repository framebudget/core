import { describe, expect, it } from "vitest";
import type { BudgetSnapshot } from "../../src/budget/budget.types";
import { STORAGE_KEY } from "../../src/platform/storage/storage.constants";
import { bootedPage } from "../support/booted-page";
import { createFakeStorage } from "../support/fake-storage";
import { smooth, stutter } from "../support/frames";
import { stored } from "../support/stored";

describe("learning across visits", () => {
  it("starts the next visit without the effect that stuttered, then retries it after clean visits", async () => {
    const local = createFakeStorage();

    const first = bootedPage(200, local);
    await first.browser.settle();
    stutter(first.budget);
    smooth(first.budget); // the step helped: it is learned
    expect(first.budget.snapshot().stepped).toEqual(["canvasHiRes"]);

    const visits: BudgetSnapshot[] = [];
    for (let index = 0; index < 5; index++) {
      const visit = bootedPage(200, local);
      await visit.browser.settle();
      visits.push(visit.budget.snapshot());
      smooth(visit.budget, 2);
    }
    for (const snapshot of visits) {
      expect(snapshot.off.canvasHiRes).toBe("learned");
      expect(snapshot.tier).toBe("High");
    }

    const retry = bootedPage(200, local);
    await retry.browser.settle();
    expect(retry.budget.allows("canvasHiRes")).toBe(true);
    smooth(retry.budget, 2);
    expect(stored(local).blocked).toEqual({});
  });

  it("makes no visit clean while a step down is in force", async () => {
    const local = createFakeStorage();
    const first = bootedPage(200, local);
    await first.browser.settle();
    stutter(first.budget);
    smooth(first.budget);
    expect(stored(local).blocked).toEqual({ canvasHiRes: { clean: 0, fails: 1 } });
  });

  it("counts a visit with a few bad windows as clean, and one with too many as not", async () => {
    for (const [bad, clean] of [
      [1, 1],
      [2, 0],
    ] as const) {
      const local = createFakeStorage();
      local.setItem(STORAGE_KEY, JSON.stringify({ v: 1, blocked: { blur: { clean: 0, fails: 1 } } }));
      const visit = bootedPage(200, local);
      visit.budget.configure({ governor: { strikes: 3, cleanWindows: 4 } });
      await visit.browser.settle();
      for (let index = 0; index < bad; index++) {
        stutter(visit.budget);
        smooth(visit.budget); // a good window clears the strikes
      }
      smooth(visit.budget, 4 - bad);
      expect(stored(local).blocked.blur).toEqual({ clean, fails: 1 });
    }
  });
});
