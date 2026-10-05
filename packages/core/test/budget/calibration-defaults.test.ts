import { describe, expect, it } from "vitest";
import type { Budget, ConfigureOptions } from "../../src/budget/budget.types";
import { createBudget } from "../../src/budget/create-budget";
import { defaultCalibration } from "../../src/core/calibration/default-calibration";
import { mergeCalibration } from "../../src/core/calibration/merge/merge-calibration";
import { STORAGE_KEY } from "../../src/platform/storage/storage.constants";
import { bootedPage, pauseForever } from "../support/booted-page";
import { fakeBrowser } from "../support/fake-browser";
import type { FakeStorage } from "../support/fake-browser.types";
import { createFakeStorage } from "../support/fake-storage";

const remote = { effects: { parallax: { threshold: 80 } } };
const defaults = { effects: { parallax: { threshold: 150 }, shimmer: { threshold: 200 } } };

/** Local storage holding a calibration fetched on an earlier visit. */
function withRemote(): FakeStorage {
  const local = createFakeStorage();
  local.setItem(STORAGE_KEY, JSON.stringify({ v: 1, blocked: {}, remote }));
  return local;
}

/** A first page view configured before first use, so the first decision already uses the options. */
function firstDecision(local: FakeStorage, options: ConfigureOptions): Budget {
  const browser = fakeBrowser({ local });
  const budget = createBudget({ scope: browser.scope, pause: pauseForever });
  budget.configure({ ...options, governor: { auto: false } });
  return budget;
}

describe("calibration defaults precedence", () => {
  it("applies the defaults alone on a first visit with no stored calibration", () => {
    const budget = firstDecision(createFakeStorage(), { calibrationDefaults: defaults });
    expect(budget.snapshot().calibration).toEqual(mergeCalibration(defaultCalibration, defaults));
  });

  it("lets the fetched calibration refine the defaults", () => {
    const { effects } = firstDecision(withRemote(), { calibrationDefaults: defaults }).snapshot().calibration;
    expect(effects.parallax!.threshold).toBe(80);
    expect(effects.shimmer!.threshold).toBe(200);
  });

  it("keeps `calibration` above the fetched calibration and `register` above everything", () => {
    const calibration = { effects: { parallax: { threshold: 120 } } };
    const budget = firstDecision(withRemote(), { calibrationDefaults: defaults, calibration });
    expect(budget.snapshot().calibration.effects.parallax!.threshold).toBe(120);
    budget.register("parallax", { threshold: 60, cost: 5 });
    budget.configure({ calibrationDefaults: { effects: { parallax: { threshold: 300 } } } });
    expect(budget.snapshot().calibration.effects.parallax!.threshold).toBe(60);
  });

  it("changes nothing without the option", () => {
    const calibration = { effects: { blur: { threshold: 95 } } };
    const budget = firstDecision(withRemote(), { calibration });
    expect(budget.snapshot().calibration).toEqual(mergeCalibration(defaultCalibration, remote, calibration));
  });

  it("uses the defaults without a browser too", () => {
    const budget = createBudget({ scope: null });
    budget.configure({ calibrationDefaults: defaults, calibration: { effects: { shimmer: { threshold: 40 } } } });
    const { effects } = budget.snapshot().calibration;
    expect(effects.parallax!.threshold).toBe(150);
    expect(effects.shimmer!.threshold).toBe(40);
  });
});

describe("configure({ calibrationDefaults }) after start", () => {
  it("appends the defaults in order and recomputes the decision", () => {
    const { budget } = bootedPage(100);
    const reasons: string[] = [];
    budget.on("change", (_snapshot, reason) => {
      reasons.push(reason);
    });
    expect(budget.allows("parallax")).toBe(true);
    budget.configure({ calibrationDefaults: defaults });
    budget.configure({ calibrationDefaults: { effects: { shimmer: { threshold: 30 } } } });
    const { effects } = budget.snapshot().calibration;
    expect([effects.parallax!.threshold, effects.shimmer!.threshold]).toEqual([150, 30]);
    expect(budget.allows("parallax")).toBe(false);
    expect(reasons).toContain("configure");
  });
});
