import { describe, expect, it } from "vitest";
import { median } from "../../../src/core/math/median";

describe("median", () => {
  it("takes the middle of odd and even lists without mutating them", () => {
    const list = [5, 1, 3];
    expect(median(list)).toBe(3);
    expect(list).toEqual([5, 1, 3]);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBeNaN();
  });
});
