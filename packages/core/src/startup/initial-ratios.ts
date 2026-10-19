import type { KernelRatios } from "../core/calibration/calibration.types";
import { kernelRatios } from "../core/score/kernel-ratios";
import type { InitialScore, StartContext } from "./startup.types";

/** Kernel ratios behind the first score: the cached ones with a cached score, the cold run's after a cold run. */
export function initialRatios(
  context: StartContext,
  first: Pick<InitialScore, "source" | "cold">,
): KernelRatios | undefined {
  if (first.source === "cached") return context.stored.ratios;
  return first.cold ? kernelRatios(first.cold.rates, context.calibration.coldReference) : undefined;
}
