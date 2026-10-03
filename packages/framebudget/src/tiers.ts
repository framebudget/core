/**
 * Named tiers are shortcuts for sets of effects. A tier's set is every effect
 * whose threshold is at or below the tier floor in the calibration.
 */
export const Tier = {
  Full: "Full",
  High: "High",
  Medium: "Medium",
  Lite: "Lite",
} as const;

export type Tier = (typeof Tier)[keyof typeof Tier];

/** Highest tier first. */
export const TIERS: readonly Tier[] = [Tier.Full, Tier.High, Tier.Medium, Tier.Lite];

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}
