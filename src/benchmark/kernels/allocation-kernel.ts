import type { Kernel } from "../benchmark.types";
import type { AllocationEntry } from "./allocation-kernel.types";

const RING_SIZE = 64;

/** Small object allocation; a ring keeps the last 64 alive, so some survive a young collection. */
export function createAllocationKernel(): Kernel {
  const ring = Array.from<AllocationEntry | undefined>({ length: RING_SIZE });
  let slot = 0;
  return {
    name: "alloc",
    batch: 16,
    run(units) {
      let sum = 0;
      for (let index = 0; index < units; index++) {
        const previous = ring[slot];
        const entry = { x: index, y: index * 0.5, previous: previous ? previous.x : 0 };
        ring[slot] = entry;
        slot = (slot + 1) & (RING_SIZE - 1);
        sum += entry.x + entry.y + entry.previous;
      }
      return sum;
    },
  };
}
