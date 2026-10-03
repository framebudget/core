/**
 * Threshold with hysteresis. An effect that was on stays on down to
 * threshold * (1 - margin); one that was off needs threshold * (1 + margin).
 * Without history the plain threshold decides.
 */
export function isQualified(score: number, threshold: number, margin: number, wasOn: boolean | undefined): boolean {
  if (wasOn === undefined) return score >= threshold;
  return score >= threshold * (wasOn ? 1 - margin : 1 + margin);
}
