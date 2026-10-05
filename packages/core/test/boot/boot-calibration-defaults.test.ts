import { describe, expect, it } from "vitest";
import { createBootScript } from "../../src/boot/index";
import type { BootOptions } from "../../src/boot/boot.types";
import { createBudget } from "../../src/budget/create-budget";
import { pauseForever } from "../support/booted-page";
import type { FakeStorage } from "../support/fake-browser.types";
import { sorted } from "../support/sorted";
import { cached, runBoot } from "./run-boot";

const options: BootOptions = {
  calibrationDefaults: {
    effects: { parallax: { threshold: 150 }, blur: { threshold: 150 }, shimmer: { threshold: 200 } },
  },
  calibration: { effects: { blur: { threshold: 120 } } },
};
const remote = { effects: { parallax: { threshold: 80 }, blur: { threshold: 95 } } };

/** A score cached on an earlier visit, with the calibration fetched then. */
const storedRemote = (): FakeStorage => cached(100, { remote });

describe("boot script calibration defaults", () => {
  it("uses the same precedence as the core: defaults, fetched calibration, calibration", () => {
    const { attributes } = runBoot(createBootScript(options), { localStorage: storedRemote() });
    const effects = attributes["data-framebudget-effects"]!.split(" ");
    expect(effects).toContain("parallax"); // the fetched 80 refines the default 150
    expect(effects).not.toContain("blur"); // `calibration` 120 beats the fetched 95
    expect(effects).not.toContain("shimmer"); // the default 200, nothing fetched
  });

  it("hands off a decision the core reaches again with the same options", () => {
    const { window } = runBoot(createBootScript(options), { localStorage: storedRemote() });
    const budget = createBudget({ scope: window, pause: pauseForever });
    budget.configure(options);
    expect(budget.tier).toBe(window.__framebudget!.tier);
    expect(sorted(budget.effects())).toEqual(sorted(window.__framebudget!.effects));
    expect(budget.snapshot().source).toBe("cached");
  });

  it("decides exactly as before without the option", () => {
    const before = runBoot(createBootScript({ calibration: options.calibration }), { localStorage: storedRemote() });
    const after = runBoot(createBootScript({ ...options, calibrationDefaults: undefined }), {
      localStorage: storedRemote(),
    });
    expect(after.attributes).toEqual(before.attributes);
    expect(before.attributes["data-framebudget-effects"]!.split(" ")).not.toContain("blur");
  });
});
