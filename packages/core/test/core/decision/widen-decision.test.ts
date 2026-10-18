import { describe, expect, it } from "vitest";
import { defaultCalibration } from "../../../src/core/calibration/default-calibration";
import { mergeCalibration } from "../../../src/core/calibration/merge/merge-calibration";
import { decide } from "../../../src/core/decision/decide";
import type { WidenInput } from "../../../src/core/decision/decision.types";
import { widenDecision } from "../../../src/core/decision/widen-decision";
import type { Hints } from "../../../src/core/device/device.types";
import { pickVictim } from "../../../src/core/step-down/pick-victim";
import { Tier } from "../../../src/core/tier/tier.enum";

const hints: Hints = { saveData: false, slowNetwork: false, reducedMotion: false, gpc: false };

/** A score-60 device on a page that uses hover, parallax and blur; capacity in cost units. */
function widen(capacity: number, extra: Partial<WidenInput> = {}) {
  const input: WidenInput = {
    calibration: mergeCalibration(defaultCalibration, { capacity }),
    score: 60,
    hints,
    used: ["hover", "parallax", "blur"],
    explored: null,
    ...extra,
  };
  return widenDecision(input, decide(input));
}

describe("capacity", () => {
  it("adds used effects that only miss their threshold while the page's load fits, lightest first", () => {
    // Loads at score 60: hover 1.7 (on), parallax 8.3, blur 10.
    expect(widen(0).effects).not.toContain("parallax");
    const decision = widen(12);
    expect(decision.promoted).toEqual(["parallax"]);
    expect(decision.effects).toContain("parallax");
    expect(decision.effects).not.toContain("blur");
    expect(decision.off.parallax).toBeUndefined();
    expect(decision.qualified).not.toContain("parallax");
    expect(decision.tier).toBe(Tier.Medium);
    expect(widen(21).promoted).toEqual(["parallax", "blur"]);
  });

  it("never adds an effect that is off by preference, by learning or by the governor", () => {
    expect(widen(21, { hints: { ...hints, reducedMotion: true } }).promoted).toEqual(["blur"]);
    expect(widen(21, { learned: ["parallax"] }).promoted).toEqual(["blur"]);
    // A stepped-down blur still spends its load: 1.7 + 10 leaves no room for parallax under 19.
    expect(widen(19).promoted).toEqual(["parallax"]);
    expect(widen(19, { stepped: ["blur"] }).promoted).toEqual([]);
  });

  it("adds the explored effect only when its threshold is all that keeps it off", () => {
    expect(widen(0, { explored: "parallax" })).toMatchObject({ explored: "parallax", promoted: [] });
    expect(widen(0, { explored: "parallax", learned: ["parallax"] }).effects).not.toContain("parallax");
  });
});

describe("kernel weights", () => {
  it("judges a weighted effect on its own kernels, pressure and caps included", () => {
    const calibration = mergeCalibration(defaultCalibration, { effects: { blur: { weights: { path: 3, typed: 1 } } } });
    const ratios = { float: 2, typed: 1.6, alloc: 1.6, path: 0.8 };
    const decision = decide({ calibration, score: 140, ratios, hints });
    // blur: 100 * (0.8^3 * 1.6)^(1/4) = 95, over its 90 threshold; under serious pressure, 66.
    expect(decision.scores.blur).toBeCloseTo(100 * Math.pow(0.8 ** 3 * 1.6, 0.25), 6);
    expect(decision.effects).toContain("blur");
    expect(decide({ calibration, score: 140, ratios, hints, pressure: "serious" }).off.blur).toBe("threshold");
    expect(decide({ calibration, score: 140, hints }).scores.blur).toBe(140);
  });

  it("keeps only valid kernel weights from a patch", () => {
    const merged = mergeCalibration(defaultCalibration, {
      effects: { blur: { weights: { path: 2, typed: -1, canvas: 3 } as unknown as Record<string, number> } },
    });
    expect(merged.effects.blur!.weights).toEqual({ path: 2 });
  });
});

describe("step-down order", () => {
  it("steps down suspects first, riskiest group first, then by cost and threshold", () => {
    const calibration = defaultCalibration;
    expect(pickVictim(calibration, ["hover", "blur", "parallax"], [])).toBe("blur");
    expect(pickVictim(calibration, ["hover", "blur", "parallax"], [[], ["hover"], ["parallax"]])).toBe("hover");
    expect(pickVictim(calibration, ["canvasLowRes", "pageTransition"], [])).toBe("pageTransition");
  });
});
