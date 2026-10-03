import { describe, expect, it } from "vitest";
import { defaultCalibration } from "../../../src/core/calibration/default-calibration";
import { decide } from "../../../src/core/decision/decide";
import type { DecideInput } from "../../../src/core/decision/decision.types";
import type { Hints } from "../../../src/core/device/device.types";
import { tierEffects } from "../../../src/core/calibration/tier-effects";
import { Tier } from "../../../src/core/tier/tier.enum";

const hints: Hints = { saveData: false, slowNetwork: false, reducedMotion: false, gpc: false };
const calibration = defaultCalibration;
const run = (input: Partial<DecideInput> & { score: number }) => decide({ calibration, hints, ...input });
const sorted = (names: readonly string[]): string[] => [...names].sort((left, right) => left.localeCompare(right));

describe("decide", () => {
  it("allows exactly the effects the score affords and names the tier", () => {
    // 100 affords blur (90) but not canvasHiRes (120): more than High, less than Full.
    const decision = run({ score: 100 });
    expect(decision.tier).toBe(Tier.High);
    expect(sorted(decision.effects)).toEqual(sorted([...tierEffects(calibration, Tier.High), "blur"]));
    expect(decision.off.canvasHiRes).toBe("threshold");
    expect(run({ score: 130 }).tier).toBe(Tier.Full);
    expect(run({ score: 40 }).tier).toBe(Tier.Medium);
    expect(run({ score: 5 })).toMatchObject({ tier: Tier.Lite, effects: [] });
  });

  it("turns motion effects off under reduced motion without lowering the tier", () => {
    const decision = run({ score: 130, hints: { ...hints, reducedMotion: true } });
    expect(decision.tier).toBe(Tier.Full);
    expect(sorted(decision.effects)).toEqual(["blur", "hover", "sound"]);
    expect(decision.off.parallax).toBe("motion");
  });

  it("turns data-heavy effects off under Save-Data and on 2g", () => {
    for (const dataHints of [
      { ...hints, saveData: true },
      { ...hints, slowNetwork: true },
    ]) {
      const decision = run({ score: 130, hints: dataHints });
      expect(decision.off.sound).toBe("data");
      expect(decision.off.canvasHiRes).toBe("data");
      expect(decision.effects).toContain("blur");
    }
  });

  it("drops learned and stepped-down effects and lowers the tier accordingly", () => {
    const learned = run({ score: 130, learned: ["blur"] });
    expect(learned.off.blur).toBe("learned");
    expect(learned.tier).toBe(Tier.High);
    const stepped = run({ score: 130, stepped: ["parallax"] });
    expect(stepped.off.parallax).toBe("governor");
    expect(stepped.tier).toBe(Tier.Medium);
  });
});
