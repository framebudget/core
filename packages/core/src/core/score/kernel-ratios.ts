import type { KernelName, KernelRatios } from "../calibration/calibration.types";
import { KERNEL_NAMES } from "../calibration/kernel-names";
import { fromEntries } from "../object/from-entries";

/** Rate over reference per kernel, for the kernels that have both. */
export function kernelRatios(
  rates: Partial<Record<KernelName, number>>,
  reference: Readonly<Record<KernelName, number>>,
): KernelRatios {
  return fromEntries(
    KERNEL_NAMES.filter((name) => (rates[name] ?? 0) > 0 && reference[name] > 0).map((name) => [
      name,
      (rates[name] ?? 0) / reference[name],
    ]),
  );
}

/** New ratios averaged with earlier ones, kernel by kernel, the way the cached score is smoothed. */
export function blendRatios(earlier: KernelRatios | undefined, next: KernelRatios): KernelRatios {
  return fromEntries(
    KERNEL_NAMES.filter((name) => next[name] !== undefined).map((name) => {
      const value = next[name] ?? 0;
      const previous = earlier?.[name];
      return [name, previous === undefined ? value : (previous + value) / 2];
    }),
  );
}
