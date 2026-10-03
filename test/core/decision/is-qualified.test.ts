import { describe, expect, it } from "vitest";
import { defaultCalibration } from "../../../src/core/calibration/default-calibration";
import { decide } from "../../../src/core/decision/decide";
import type { DecideInput } from "../../../src/core/decision/decision.types";
import type { Hints } from "../../../src/core/device/device.types";
import { isQualified } from "../../../src/core/decision/is-qualified";

const hints: Hints = { saveData: false, slowNetwork: false, reducedMotion: false, gpc: false };
const calibration = defaultCalibration;
const run = (input: Partial<DecideInput> & { score: number }) => decide({ calibration, hints, ...input });

describe("threshold with hysteresis", () => {
  it("uses the plain threshold without history", () => {
    expect(isQualified(69.9, 70, 0.1, undefined)).toBe(false);
    expect(isQualified(70, 70, 0.1, undefined)).toBe(true);
  });

  it("keeps an effect on down to threshold * (1 - margin)", () => {
    expect(isQualified(63, 70, 0.1, true)).toBe(true);
    expect(isQualified(62.9, 70, 0.1, true)).toBe(false);
  });

  it("keeps an effect off up to threshold * (1 + margin)", () => {
    expect(isQualified(76.9, 70, 0.1, false)).toBe(false);
    expect(isQualified(77, 70, 0.1, false)).toBe(true);
  });

  it("does not flip an effect while scores wander around its threshold", () => {
    // parallax: threshold 70, margin 10%.
    let previous: string[] | undefined;
    const seen: boolean[] = [];
    for (const score of [72, 66, 74, 64, 71, 60, 72, 76, 78]) {
      const decision = run({ score, previous });
      seen.push(decision.effects.includes("parallax"));
      previous = decision.qualified;
    }
    expect(seen).toEqual([true, true, true, true, true, false, false, false, true]);
  });
});
