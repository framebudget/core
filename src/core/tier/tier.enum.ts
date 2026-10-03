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
