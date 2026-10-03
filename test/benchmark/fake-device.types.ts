import type { Kernel } from "../../src/benchmark/benchmark.types";
import type { KernelName } from "../../src/core/calibration/calibration.types";

/**
 * A device on a fake clock. `speed` is relative to the reference device per
 * kernel. Each clock read costs a little time, like a real one; `resolution`
 * quantizes what the clock reports, like a coarsened performance.now().
 */
export interface FakeDevice {
  now: () => number;
  kernels: Kernel[];
  state: { time: number; units: Record<string, number> };
}

export interface FakeDeviceSettings {
  resolution?: number;
  slowUnits?: Partial<Record<KernelName, (unit: number) => number>>;
}
