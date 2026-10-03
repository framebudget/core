import { describe, expect, it } from "vitest";
import type { Budget, BudgetSnapshot } from "../../src/budget/budget.types";
import type { StoredState } from "../../src/core/state/stored-state.types";
import { STORAGE_KEY } from "../../src/platform/storage/storage.constants";
import { bootedPage } from "../support/booted-page";
import type { FakeStorage } from "../support/fake-browser.types";
import { createFakeStorage } from "../support/fake-storage";

function smooth(budget: Budget): void {
  for (let index = 0; index < 4; index++) budget.reportFrame(16.7);
}

function blocked(local: FakeStorage): StoredState["blocked"] {
  return (JSON.parse(local.getItem(STORAGE_KEY)!) as StoredState).blocked;
}

describe("learning across visits", () => {
  it("starts the next visit without the effect that stuttered, then retries it after clean visits", async () => {
    const local = createFakeStorage();

    const first = bootedPage(200, local);
    await first.browser.settle();
    first.budget.reportFrame(40);
    first.budget.reportFrame(40);
    expect(first.budget.snapshot().stepped).toEqual(["canvasHiRes"]);

    const visits: BudgetSnapshot[] = [];
    for (let index = 0; index < 5; index++) {
      const visit = bootedPage(200, local);
      await visit.browser.settle();
      visits.push(visit.budget.snapshot());
      smooth(visit.budget);
    }
    for (const snapshot of visits) {
      expect(snapshot.off.canvasHiRes).toBe("learned");
      expect(snapshot.tier).toBe("High");
    }

    const retry = bootedPage(200, local);
    await retry.browser.settle();
    expect(retry.budget.allows("canvasHiRes")).toBe(true);
    smooth(retry.budget);
    expect(blocked(local)).toEqual({});
  });

  it("does not count a visit as clean when the governor stepped something down", async () => {
    const local = createFakeStorage();
    const first = bootedPage(200, local);
    await first.browser.settle();
    first.budget.reportFrame(40);
    first.budget.reportFrame(40);
    smooth(first.budget);
    expect(blocked(local)).toEqual({ canvasHiRes: { clean: 0, fails: 1 } });
  });
});
