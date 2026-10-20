import type { GovernorOptions } from "./governor.types";

export const defaultGovernorOptions: GovernorOptions = {
  targetFps: 60,
  minFps: 30,
  maxLateFraction: 0.1,
  windowFrames: 30,
  strikes: 3,
  warmupMs: 3000,
  cooldownMs: 2000,
  cleanWindows: 8,
  maxGapMs: 1000,
  minRunMs: 250,
};
