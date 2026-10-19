import { describe, expect, it } from "vitest";
import { bootedPage as page } from "../../support/booted-page";
import { smooth, stutter } from "../../support/frames";
import { stored } from "../../support/stored";

describe("in-page retry verdicts", () => {
  it("steps a retry back down when it gets no verdict in twice its stretch", async () => {
    const { browser, budget, local } = page(200);
    budget.configure({ governor: { strikes: 3 } });
    await browser.settle();
    for (let index = 0; index < 3; index++) stutter(budget, "entrances");
    smooth(budget, 2);
    expect(budget.allows("entrances")).toBe(true);
    // Half the windows bad, never three in a row: not smooth enough to forgive, not bad enough to strike.
    for (let index = 0; index < 2; index++) {
      stutter(budget);
      smooth(budget);
    }
    expect(budget.snapshot().stepped).toEqual(["entrances"]);
    expect(stored(local).blocked).toEqual({ entrances: { clean: 0, fails: 1 } });
    smooth(budget, 6);
    expect(budget.allows("entrances")).toBe(false); // no second retry
  });

  it("waits a cooldown after a retry before judging its frames", async () => {
    const { browser, budget } = page(200);
    budget.configure({ governor: { cooldownMs: 1000 } });
    await browser.settle();
    stutter(budget, "entrances");
    browser.clock.t += 1000;
    smooth(budget, 2); // the retry turns entrances back on
    stutter(budget, "entrances"); // its start-up frames, inside the cooldown
    expect(budget.snapshot().stepped).toEqual([]);
    browser.clock.t += 1000;
    stutter(budget, "entrances");
    expect(budget.snapshot().stepped).toEqual(["entrances"]);
  });
});
