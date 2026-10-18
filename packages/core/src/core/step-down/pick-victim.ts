import type { Calibration } from "../calibration/calibration.types";

/**
 * The effect a strike-out steps down. Suspect groups come first, riskiest
 * group first; then the highest cost; between equal costs, the higher threshold.
 */
export function pickVictim(
  calibration: Calibration,
  candidates: readonly string[],
  suspects: readonly (readonly string[])[],
): string | undefined {
  const rank = (name: string): number => {
    const group = suspects.findIndex((names) => names.includes(name));
    return group === -1 ? suspects.length : group;
  };
  const cost = (name: string): number => calibration.effects[name]?.cost ?? 0;
  const threshold = (name: string): number => calibration.effects[name]?.threshold ?? 0;
  return [...candidates].sort(
    (left, right) => rank(left) - rank(right) || cost(right) - cost(left) || threshold(right) - threshold(left),
  )[0];
}
