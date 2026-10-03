import type { GovernorOptions } from "./governor.types";

export const defaultGovernorOptions: GovernorOptions = {
  targetFps: 45,
  windowFrames: 30,
  strikes: 3,
  warmupMs: 3000,
  cooldownMs: 2000,
  cleanWindows: 20,
  maxGapMs: 1000,
};
