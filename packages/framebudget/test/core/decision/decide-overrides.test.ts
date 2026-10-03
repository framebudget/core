import { describe, expect, it } from "vitest";
import { defaultCalibration } from "../../../src/core/calibration/default-calibration";
import { decide } from "../../../src/core/decision/decide";
import type { DecideInput } from "../../../src/core/decision/decision.types";
import type { Hints } from "../../../src/core/device/device.types";
import { tierEffects } from "../../../src/core/calibration/tier-effects";
import { Tier } from "../../../src/core/tier/tier.enum";
import { mergeCalibration } from "../../../src/core/calibration/merge-calibration";

const hints: Hints = { saveData: false, slowNetwork: false, reducedMotion: false, gpc: false };
const calibration = defaultCalibration;
const run = (input: Partial<DecideInput> & { score: number }) => decide({ calibration, hints, ...input });

describe("decide with caps, forced tiers and overrides", () => {
  it("caps the score on low-memory or low-core devices and scales it under pressure", () => {
    expect(run({ score: 300, hints: { ...hints, memoryGb: 1 } }).score).toBe(60);
    expect(run({ score: 300, hints: { ...hints, cores: 2 } }).score).toBe(60);
    expect(run({ score: 300, hints: { ...hints, memoryGb: 4, cores: 8 } }).score).toBe(300);
    expect(run({ score: 150, pressure: "critical" }).score).toBeCloseTo(60, 9);
    expect(run({ score: 150, pressure: "serious" }).tier).toBe(Tier.High);
  });

  it("forces a tier's exact set, ignoring score and learning but not preferences", () => {
    const lite = run({ score: 500, forced: Tier.Lite, learned: ["hover"] });
    expect(lite).toMatchObject({ tier: Tier.Lite, effects: ["hover"] });
    const full = run({ score: 1, forced: Tier.Full, hints: { ...hints, reducedMotion: true } });
    expect(full.tier).toBe(Tier.Full);
    expect(full.effects).toContain("blur");
    expect(full.effects).not.toContain("parallax");
  });

  it("decides custom effects and calibration overrides like built-ins", () => {
    const custom = mergeCalibration(defaultCalibration, {
      effects: { confetti: { threshold: 95, cost: 4, motion: true }, parallax: { threshold: 110 } },
      tiers: { High: 100 },
    });
    const decision = decide({ calibration: custom, hints, score: 100 });
    expect(decision.effects).toContain("confetti");
    expect(decision.effects).not.toContain("parallax");
    expect(decision.tier).toBe(Tier.High);
    expect(tierEffects(custom, Tier.High)).toContain("confetti");
  });
});
