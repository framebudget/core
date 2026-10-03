import type { Kernel } from "../benchmark.types";

/** Dependent floating point arithmetic with a square root. */
export function createFloatKernel(): Kernel {
  let first = 1.5;
  let second = 0.25;
  return {
    name: "float",
    batch: 8,
    run(units) {
      for (let index = 0; index < units; index++) {
        first = first * 0.999 + Math.sqrt(second + index) * 0.001;
        second = (second + first * 1.618) % 7.3;
      }
      return first + second;
    },
  };
}
