import { expect } from "vitest";
import type { BenchOptions, Kernel } from "../../src/benchmark/benchmark.types";
import type { KernelName } from "../../src/core/calibration/calibration.types";
import type { FakeDevice, FakeDeviceSettings } from "./fake-device.types";

export const REFERENCE: Record<KernelName, number> = { float: 4000, typed: 8000, alloc: 2000, path: 1000 };
const BATCH: Record<KernelName, number> = { float: 40, typed: 80, alloc: 20, path: 10 };
export const NAMES = Object.keys(REFERENCE) as KernelName[];

export function device(speed: Partial<Record<KernelName, number>> = {}, settings: FakeDeviceSettings = {}): FakeDevice {
  const state = { time: 0, units: {} as Record<string, number> };
  const now = (): number => {
    state.time += 2e-5; // about 20 ns per read
    const resolution = settings.resolution;
    return resolution ? Math.floor(state.time / resolution) * resolution : state.time;
  };
  const kernels: Kernel[] = NAMES.map((name) => ({
    name,
    batch: BATCH[name],
    run(units) {
      for (let index = 0; index < units; index++) {
        const unit = (state.units[name] = (state.units[name] ?? 0) + 1);
        const factor = settings.slowUnits?.[name]?.(unit) ?? 1;
        state.time += factor / (REFERENCE[name] * (speed[name] ?? 1));
      }
      return units;
    },
  }));
  return { now, kernels, state };
}

/** Relative closeness; reading the clock costs time, so scores carry a small known bias. */
export function expectNear(actual: number, expected: number, tolerance = 0.01): void {
  expect(Math.abs(actual / expected - 1)).toBeLessThan(tolerance);
}

export function options(fake: FakeDevice, overrides: Partial<BenchOptions> = {}): BenchOptions {
  return {
    now: fake.now,
    kernels: fake.kernels,
    reference: REFERENCE,
    budgetMs: 2,
    sliceMs: 0.1,
    maxRounds: 4,
    maxTickMs: 1,
    ...overrides,
  };
}
