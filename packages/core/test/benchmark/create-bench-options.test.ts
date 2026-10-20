import { describe, expect, it } from "vitest";
import type { BenchOptions } from "../../src/benchmark/benchmark.types";
import { defaultCalibration } from "../../src/core/calibration/default-calibration";
import type { Scope } from "../../src/platform/scope/scope.types";
import { createBenchOptions } from "../../src/startup/create-bench-options";
import { elementScope, offscreenScope } from "./fake-canvas";

const warm = (scope: Scope): BenchOptions => createBenchOptions(scope, defaultCalibration, 24, true);
const cold = (scope: Scope): BenchOptions => createBenchOptions(scope, defaultCalibration, 4, false);
const warmNames = (scope: Scope): string[] => warm(scope).kernels.map((kernel) => kernel.name);
const coldNames = (scope: Scope): string[] => cold(scope).kernels.map((kernel) => kernel.name);

describe("createBenchOptions", () => {
  it("measures raster in the warm run only, when a canvas works", () => {
    expect(warmNames(offscreenScope())).toEqual(["float", "typed", "alloc", "path", "raster"]);
    expect(coldNames(offscreenScope())).toEqual(["float", "typed", "alloc", "path"]);
  });

  it("draws raster on a canvas element without OffscreenCanvas", () => {
    expect(warmNames(elementScope())).toEqual(["float", "typed", "alloc", "raster"]);
    expect(coldNames(elementScope())).toEqual(["float", "typed", "alloc"]);
  });

  it("leaves raster out without a canvas, or when the canvas refuses the readback", () => {
    expect(warmNames({})).toEqual(["float", "typed", "alloc"]);
    const refusing = offscreenScope(() => {
      throw new Error("The canvas has been tainted");
    });
    expect(warmNames(refusing)).toEqual(["float", "typed", "alloc", "path"]);
  });

  it("scores raster against the warm reference and never against the cold one", () => {
    expect(warm({}).reference.raster).toBeGreaterThan(0);
    expect(cold({}).reference.raster).toBe(0);
  });
});
