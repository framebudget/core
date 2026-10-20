import { describe, expect, it } from "vitest";
import { defaultCalibration } from "../../../src/core/calibration/default-calibration";
import { mergeCalibration } from "../../../src/core/calibration/merge/merge-calibration";

describe("mergeCalibration", () => {
  it("ignores invalid values from storage or the network", () => {
    const merged = mergeCalibration(defaultCalibration, {
      reference: { float: -1, typed: NaN, alloc: 7 },
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

  it("accepts raster rates, raster weights and a cold raster reference of 0", () => {
    const merged = mergeCalibration(
      defaultCalibration,
      { coldReference: { raster: 5 } },
      {
        reference: { raster: 40 },
        coldReference: { raster: 0, path: 2000 },
        effects: { blur: { weights: { raster: 2, path: 1 } } },
      },
    );
    expect(merged.reference.raster).toBe(40);
    expect(merged.coldReference.raster).toBe(0);
    expect(merged.coldReference.path).toBe(2000);
    expect(merged.effects.blur!.weights).toEqual({ path: 1, raster: 2 });
  });
});
