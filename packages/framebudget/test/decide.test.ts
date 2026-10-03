import { describe, expect, it } from "vitest";
import { defaultCalibration, mergeCalibration, tierEffects } from "../src/calibration";
import { decide, passes, type DecideInput } from "../src/decide";
import type { Hints } from "../src/hints";
import { Tier } from "../src/tiers";

const hints: Hints = { saveData: false, slowNetwork: false, reducedMotion: false, gpc: false };
const cal = defaultCalibration;
const run = (input: Partial<DecideInput> & { score: number }) => decide({ cal, hints, ...input });

describe("threshold with hysteresis", () => {
  it("uses the plain threshold without history", () => {
    expect(passes(69.9, 70, 0.1, undefined)).toBe(false);
    expect(passes(70, 70, 0.1, undefined)).toBe(true);
  });

  it("keeps an effect on down to threshold * (1 - margin)", () => {
    expect(passes(63, 70, 0.1, true)).toBe(true);
    expect(passes(62.9, 70, 0.1, true)).toBe(false);
  });

  it("keeps an effect off up to threshold * (1 + margin)", () => {
    expect(passes(76.9, 70, 0.1, false)).toBe(false);
    expect(passes(77, 70, 0.1, false)).toBe(true);
  });

  it("does not flip an effect while scores wander around its threshold", () => {
    // parallax: threshold 70, margin 10%.
    let prev: string[] | undefined;
    const seen: boolean[] = [];
    for (const score of [72, 66, 74, 64, 71, 60, 72, 76, 78]) {
      const d = run({ score, prev });
      seen.push(d.effects.includes("parallax"));
      prev = d.qualified;
    }
    expect(seen).toEqual([true, true, true, true, true, false, false, false, true]);
  });
});

describe("decide", () => {
  it("allows exactly the effects the score affords and names the tier", () => {
    // 100 affords blur (90) but not canvasHiRes (120): more than High, less than Full.
    const d = run({ score: 100 });
    expect(d.tier).toBe(Tier.High);
    expect(d.effects.sort()).toEqual([...tierEffects(cal, Tier.High), "blur"].sort());
    expect(d.off.canvasHiRes).toBe("threshold");
    expect(run({ score: 130 }).tier).toBe(Tier.Full);
    expect(run({ score: 40 }).tier).toBe(Tier.Medium);
    expect(run({ score: 5 })).toMatchObject({ tier: Tier.Lite, effects: [] });
  });

  it("turns motion effects off under reduced motion without lowering the tier", () => {
    const d = run({ score: 130, hints: { ...hints, reducedMotion: true } });
    expect(d.tier).toBe(Tier.Full);
    expect(d.effects.sort()).toEqual(["blur", "hover", "sound"]);
    expect(d.off.parallax).toBe("motion");
  });

  it("turns data-heavy effects off under Save-Data and on 2g", () => {
    for (const h of [{ ...hints, saveData: true }, { ...hints, slowNetwork: true }]) {
      const d = run({ score: 130, hints: h });
      expect(d.off.sound).toBe("data");
      expect(d.off.canvasHiRes).toBe("data");
      expect(d.effects).toContain("blur");
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
    const d = decide({ cal: custom, hints, score: 100 });
    expect(d.effects).toContain("confetti");
    expect(d.effects).not.toContain("parallax");
    expect(d.tier).toBe(Tier.High);
    expect(tierEffects(custom, Tier.High)).toContain("confetti");
  });
});

describe("mergeCalibration", () => {
  it("ignores invalid values from storage or the network", () => {
    const merged = mergeCalibration(defaultCalibration, {
      reference: { float: -1, typed: Number.NaN, alloc: 7 },
      hysteresis: 3,
      effects: { ghost: { threshold: 10 }, hover: { cost: "high" as unknown as number } },
      version: 42 as unknown as string,
    });
    expect(merged.reference.float).toBe(defaultCalibration.reference.float);
    expect(merged.reference.typed).toBe(defaultCalibration.reference.typed);
    expect(merged.reference.alloc).toBe(7);
    expect(merged.hysteresis).toBe(0.5);
    expect(merged.effects.ghost).toBeUndefined();
    expect(merged.effects.hover!.cost).toBe(defaultCalibration.effects.hover!.cost);
    expect(merged.version).toBe(defaultCalibration.version);
    expect(defaultCalibration.reference.alloc).not.toBe(7);
  });
});
