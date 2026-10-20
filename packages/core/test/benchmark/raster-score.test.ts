import { describe, it } from "vitest";
import { runBenchmark } from "../../src/benchmark/run-benchmark";
import { device, expectNear, NAMES, options, REFERENCE } from "./fake-device";

const WITH_RASTER = { names: [...NAMES, "raster" as const] };
const COLD_REFERENCE = { ...REFERENCE, raster: 0 };

describe("raster in the score", () => {
  it("counts raster in the warm score like every other kernel", () => {
    // Painting 4x slower than the reference moves the score by 4^(1/5).
    const result = runBenchmark(options(device({ raster: 0.25 }, WITH_RASTER)))!;
    expectNear(result.rates.raster! / REFERENCE.raster, 0.25);
    expectNear(result.score, 100 * Math.pow(0.25, 0.2));
  });

  it("leaves the cold score as it was: a cold reference of 0 skips raster", () => {
    const withRaster = runBenchmark(
      options(device({ float: 2, raster: 0.25 }, WITH_RASTER), { reference: COLD_REFERENCE }),
    )!;
    const without = runBenchmark(options(device({ float: 2 }), { reference: COLD_REFERENCE }))!;
    expectNear(without.score, 100 * Math.pow(2, 0.25));
    expectNear(withRaster.score, without.score);
  });
});
