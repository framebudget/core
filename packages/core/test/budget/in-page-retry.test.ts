import { describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../../src/platform/storage/storage.constants";
import { bootedPage as page } from "../support/booted-page";
import { createFakeStorage } from "../support/fake-storage";
import { smooth, stutter } from "../support/frames";
import { stored } from "../support/stored";

describe("in-page retry", () => {
  it("turns a step down back on after a smooth stretch and forgives it when it holds", async () => {
    const { browser, budget, local } = page(200);
    await browser.settle();
    stutter(budget, "entrances");
    smooth(budget, 2);
    expect(budget.allows("entrances")).toBe(true);
    expect(stored(local).blocked).toEqual({ entrances: { clean: 0, fails: 1 } });
    smooth(budget, 2);
    expect(stored(local).blocked).toEqual({});
  });

  it("puts back the block an earlier visit left when it forgives, even on a visit that is not clean", async () => {
    const local = createFakeStorage();
    // Up for a retry on this visit: 5 clean visits since its one stutter.
    local.setItem(STORAGE_KEY, JSON.stringify({ v: 1, blocked: { entrances: { clean: 5, fails: 1 } } }));
    const { browser, budget } = page(110, local);
    await browser.settle();
    stutter(budget, "canvasHiRes"); // off on this device: bad windows, nothing to step down
    stutter(budget, "canvasHiRes");
    stutter(budget, "entrances");
    expect(stored(local).blocked).toEqual({ entrances: { clean: 0, fails: 2 } });
    smooth(budget, 4); // retried, then held
    expect(budget.allows("entrances")).toBe(true);
    expect(stored(local).blocked).toEqual({ entrances: { clean: 5, fails: 1 } });
  });

  it("keeps the block when the retried effect stutters again, and retries nothing else on the page", async () => {
    const { browser, budget, local } = page(200);
    await browser.settle();
    stutter(budget, "entrances");
    stutter(budget, "shimmer");
    smooth(budget, 2);
    expect(budget.allows("entrances")).toBe(true); // the oldest step down comes back first
    stutter(budget, "entrances");
    smooth(budget, 6);
    expect(budget.snapshot().stepped).toEqual(["shimmer", "entrances"]);
    expect(stored(local).blocked).toEqual({ entrances: { clean: 0, fails: 1 }, shimmer: { clean: 0, fails: 1 } });
  });
});
