import type { EffectDefinition, KernelRatios } from "../calibration/calibration.types";
import { KERNEL_NAMES } from "../calibration/kernel-names";

/**
 * The score an effect sees. With kernel weights and known ratios, the weighted
 * geometric mean of the ratios over the kernels that have both, times 100;
 * otherwise the device score.
 */
export function effectScore(definition: EffectDefinition, score: number, ratios: KernelRatios | undefined): number {
  const { weights } = definition;
  if (!weights || !ratios) return score;
  const kernels = KERNEL_NAMES.filter((name) => (weights[name] ?? 0) > 0 && (ratios[name] ?? 0) > 0);
  const total = kernels.reduce((sum, name) => sum + (weights[name] ?? 0), 0);
  if (total === 0) return score;
  const logSum = kernels.reduce((sum, name) => sum + (weights[name] ?? 0) * Math.log(ratios[name] ?? 1), 0);
  return 100 * Math.exp(logSum / total);
}
