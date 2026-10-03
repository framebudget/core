import type { BenchResult } from "../../benchmark/benchmark.types";
import type { KernelName } from "../calibration/calibration.types";
import { roundSignificant } from "../math/round-significant";
import { fromEntries } from "../object/from-entries";
import type { ReportInput, TelemetryReport } from "./telemetry.types";

/** Code unit order, the same as the default sort of a string array. */
const byCodeUnits = (left: string, right: string): number => Number(left > right) - Number(left < right);

/** Kernel rates at 3 significant digits. */
function roundedRates(bench: BenchResult | null): Partial<Record<KernelName, number>> {
  return bench ? fromEntries(Object.entries(bench.rates).map(([name, rate]) => [name, roundSignificant(rate, 3)])) : {};
}

export function buildReport(input: ReportInput): TelemetryReport {
  const bench = input.warm ?? input.cold;
  return {
    v: 1,
    cal: input.calibration.version,
    score: Math.round(input.score),
    cold: input.cold ? Math.round(input.cold.score) : null,
    warm: input.warm ? Math.round(input.warm.score) : null,
    kernels: roundedRates(bench),
    tickMs: bench ? roundSignificant(bench.tickMs, 2) : null,
    hints: {
      cores: input.hints.cores,
      memoryGb: input.hints.memoryGb,
      pressure: input.pressure,
      reducedMotion: input.hints.reducedMotion,
    },
    tier: input.tier,
    effects: [...input.effects].sort(byCodeUnits),
    stepped: [...input.stepped],
    fps: fromEntries(Object.entries(input.fps).map(([name, value]) => [name, Math.round(value)])),
  };
}
