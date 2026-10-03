import { createGovernor } from "../../src/governor/create-governor";
import { defaultGovernorOptions } from "../../src/governor/default-governor-options";
import type { GovernorOptions } from "../../src/governor/governor.types";
import type { GovernorHarness } from "./governor-harness.types";

export const OPTIONS: GovernorOptions = {
  ...defaultGovernorOptions,
  targetFps: 50, // bad window: median gap over 20 ms
  windowFrames: 4,
  strikes: 3,
  warmupMs: 1000,
  cooldownMs: 500,
  cleanWindows: 3,
};

export function harness(options: GovernorOptions = OPTIONS): GovernorHarness {
  const clock = { time: 0 };
  const strikeOuts: string[] = [];
  let cleans = 0;
  const governor = createGovernor(options, () => clock.time, {
    strikeOut(source) {
      strikeOuts.push(source);
      return true;
    },
    clean() {
      cleans += 1;
    },
  });
  const frames = (count: number, gap: number, source?: string): void => {
    for (let index = 0; index < count; index++) {
      clock.time += gap;
      governor.report(gap, source);
    }
  };
  return { clock, governor, strikeOuts, frames, cleans: () => cleans };
}
