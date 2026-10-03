import { describe, expect, it } from "vitest";
import { bootScript, createBootScript } from "../../src/boot/index";
import { createBudget } from "../../src/budget/create-budget";
import { calibrationKey } from "../../src/core/calibration/calibration-key";
import { defaultCalibration } from "../../src/core/calibration/default-calibration";
import { mergeCalibration } from "../../src/core/calibration/merge/merge-calibration";
import { createFakeStorage } from "../support/fake-storage";
import { cached, runBoot } from "./run-boot";

const sorted = (values: readonly string[]): string[] => [...values].sort((left, right) => left.localeCompare(right));

/** The warm benchmark never finishes, so the core keeps the boot decision. */
const neverSettle = (): void => {
  // Leaves the promise pending.
};

describe("boot script options, overrides and hand-off", () => {
  it("forces a tier from the URL for the rest of the session", () => {
    const session = createFakeStorage();
    const forced = runBoot(bootScript, { location: { search: "?a=1&framebudget-tier=lite" }, sessionStorage: session });
    expect(forced.attributes).toEqual({ "data-framebudget": "Lite", "data-framebudget-effects": "hover" });

    const nextPage = runBoot(bootScript, {
      location: { search: "" },
      sessionStorage: session,
      localStorage: cached(130),
    });
    expect(nextPage.attributes["data-framebudget"]).toBe("Lite");

    const auto = runBoot(bootScript, {
      location: { search: "?framebudget-tier=auto" },
      sessionStorage: session,
      localStorage: cached(130),
    });
    expect(auto.attributes["data-framebudget"]).toBe("Full");
    expect(session.getItem("framebudget-tier")).toBeNull();
  });

  it("inlines options, escaped so they cannot close the script tag", () => {
    const calibration = { effects: { confetti: { threshold: 10, cost: 1 } }, version: "</script><script>alert(1)" };
    const source = createBootScript({ calibration });
    expect(source).not.toContain("</script");
    // A cached score in the patched calibration's units, so the boot script does not
    // run a real cold benchmark (a 1 ms clock in the sandbox makes that score noisy).
    const local = cached(50, { key: calibrationKey(mergeCalibration(defaultCalibration, calibration)) });
    const { attributes, window } = runBoot(source, { localStorage: local });
    expect(window.__framebudget!.source).toBe("cached");
    expect(attributes["data-framebudget-effects"]!.split(" ")).toContain("confetti");
  });

  it("hands its decision to the core, which starts from it without measuring again", () => {
    const local = cached(100);
    const { window } = runBoot(bootScript, { localStorage: local });
    const budget = createBudget({ scope: window, pause: () => new Promise<never>(neverSettle) });
    expect(budget.tier).toBe(window.__framebudget!.tier);
    expect(sorted(budget.effects())).toEqual(sorted(window.__framebudget!.effects));
    expect(budget.snapshot()).toMatchObject({ source: "cached", cold: null });
  });
});
