import { describe, expect, it } from "vitest";
import { bootedPage as page } from "../../support/booted-page";
import { smooth, stutter } from "../../support/frames";

describe("guess order", () => {
  it("guesses the effects the page used first, then the allowed effects it never reported", async () => {
    const { browser, budget } = page(200);
    await browser.settle();
    budget.allows("hover"); // the page asks for hover only; its other effects may be gated in CSS
    stutter(budget);
    expect(budget.snapshot().stepped).toEqual(["hover"]);
    stutter(budget); // hover did not help: the most expensive effect the page never reported
    expect(budget.snapshot().stepped).toEqual(["hover", "canvasHiRes"]);
    smooth(budget);
    expect(budget.snapshot().stepped).toEqual(["hover", "canvasHiRes"]);
  });
});
