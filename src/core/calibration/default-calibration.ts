import type { Calibration } from "./calibration.types";

export const defaultCalibration: Calibration = {
  version: "provisional-1",
  // Provisional: a desktop Chrome measurement divided by 5, standing in for a
  // mid-range phone until real devices are calibrated.
  reference: { float: 10_800, typed: 219_000, alloc: 30_900, path: 4860 },
  coldReference: { float: 5500, typed: 45_000, alloc: 12_400, path: 1780 },
  effects: {
    hover: { threshold: 20, cost: 1 },
    canvasLowRes: { threshold: 30, cost: 3, motion: true },
    entrances: { threshold: 35, cost: 2, motion: true },
    shimmer: { threshold: 45, cost: 2, motion: true },
    sound: { threshold: 50, cost: 1, data: true },
    pageTransition: { threshold: 55, cost: 3, motion: true },
    parallax: { threshold: 70, cost: 5, motion: true },
    blur: { threshold: 90, cost: 6 },
    canvasHiRes: { threshold: 120, cost: 8, motion: true, data: true },
  },
  tiers: { Full: 120, High: 70, Medium: 35, Lite: 20 },
  hysteresis: 0.1,
  fallbackScore: 50,
  caps: { lowMemoryGb: 1, lowCores: 2, lowScore: 60 },
  pressure: { serious: 0.7, critical: 0.4 },
  scoreMaxAgeDays: 14,
  retryVisits: 5,
};
