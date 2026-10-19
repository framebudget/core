import { describe, expect, it } from "vitest";
import { bootedPage as page } from "../../support/booted-page";
import { smooth, stutter } from "../../support/frames";
import { stored } from "../../support/stored";

describe("governor checks", () => {
  it("keeps the block while a retry is pending, even when the visit would be clean", async () => {
    const { browser, budget, local } = page(200);
    budget.configure({ governor: { cleanWindows: 4 } });
    await browser.settle();
    stutter(budget, "entrances");
    smooth(budget, 4); // the retry starts; 4 of 5 windows good would make the visit clean
    expect(budget.allows("entrances")).toBe(true);
    expect(stored(local).blocked).toEqual({ entrances: { clean: 0, fails: 1 } });
    stutter(budget, "entrances");
    expect(budget.snapshot().stepped).toEqual(["entrances"]);
    expect(stored(local).blocked).toEqual({ entrances: { clean: 0, fails: 1 } });
  });

  it("retries nothing after guesses that did not help, but still steps down an effect for its own frames", async () => {
    const { browser, budget } = page(200);
    await browser.settle();
    stutter(budget, "entrances");
    for (const effect of ["hover", "parallax", "blur", "shimmer"]) budget.allows(effect);
    for (let index = 0; index < 4; index++) stutter(budget); // 3 guesses, given back
    smooth(budget, 4);
    expect(budget.allows("entrances")).toBe(false);
    stutter(budget, "shimmer");
    expect(budget.snapshot().stepped).toEqual(["entrances", "shimmer"]);
  });

  it("drops a guess unlearned when a tier is forced, and starts over cleanly after", async () => {
    const { browser, budget, local } = page(200);
    await browser.settle();
    stutter(budget);
    expect(budget.snapshot().stepped).toEqual(["canvasHiRes"]);
    budget.force("Lite");
    smooth(budget, 4);
    expect(budget.snapshot().stepped).toEqual([]);
    expect(stored(local).blocked).toEqual({});
    budget.force("auto");
    stutter(budget);
    expect(budget.snapshot().stepped).toEqual(["canvasHiRes"]);
  });

  it("drops the governor's check when a device is simulated", async () => {
    const { browser, budget } = page(200);
    await browser.settle();
    stutter(budget);
    budget.simulate(150);
    stutter(budget, "entrances"); // judged at once: no check of the real device holds it back
    expect(budget.snapshot().stepped).toEqual(["entrances"]);
  });

  it("ignores names outside the calibration when choosing what to step down", async () => {
    const { browser, budget } = page(200);
    await browser.settle();
    budget.allows("notAnEffect");
    stutter(budget);
    expect(budget.snapshot()).toMatchObject({ stepped: ["canvasHiRes"], used: [] });
  });
});
