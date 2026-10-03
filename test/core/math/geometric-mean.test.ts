import { describe, expect, it } from "vitest";
import { geometricMean } from "../../../src/core/math/geometric-mean";

describe("geometricMean", () => {
  it("is the n-th root of the product and rejects non-positive values", () => {
    expect(geometricMean([4, 1])).toBeCloseTo(2, 12);
    expect(geometricMean([2, 8, 4])).toBeCloseTo(4, 12);
    expect(geometricMean([1, 0])).toBeNaN();
    expect(geometricMean([1, -2])).toBeNaN();
    expect(geometricMean([])).toBeNaN();
  });
});
