import type { Kernel } from "../benchmark.types";

/** Strided reads and writes over a 16 KB typed array. */
export function createTypedArrayKernel(): Kernel {
  const buffer = new Float32Array(4096);
  let cursor = 0;
  return {
    name: "typed",
    batch: 128,
    run(units) {
      let sum = 0;
      for (let index = 0; index < units; index++) {
        const slot = (cursor + index * 7) & 4095;
        const value = (buffer[slot] ?? 0) * 0.5 + (index & 255);
        buffer[slot] = value;
        sum += value;
      }
      cursor = (cursor + units) & 4095;
      return sum;
    },
  };
}
