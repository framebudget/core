import { createGovernor } from "../../src/governor/create-governor";
import { defaultGovernorOptions } from "../../src/governor/default-governor-options";
import type { GovernorOptions, StepKind } from "../../src/governor/governor.types";
import type { GovernorHarness } from "./governor-harness.types";

export const OPTIONS: GovernorOptions = {
  ...defaultGovernorOptions,
  maxLateFraction: 0.25, // a window of 4 frames is bad with 2 late frames
  windowFrames: 4,
  strikes: 3,
  warmupMs: 1000,
  cooldownMs: 500,
  cleanWindows: 3,
};

/**
 * `step` is what the strike-out hook answers: an effect stepped down for good,
 * on a guess, or none. The first `extensions` unhelpful checks step one more effect down.
 */
export function harness(
  step: StepKind | null = "kept",
  options: GovernorOptions = OPTIONS,
  extensions = 0,
): GovernorHarness {
  let extensionsLeft = extensions;
  const clock = { time: 0 };
  const strikeOuts: string[] = [];
  const trials: boolean[] = [];
  const verdicts: boolean[] = [];
  const governor = createGovernor(options, () => clock.time, {
    strikeOut(source) {
      strikeOuts.push(source);
      return step;
    },
    trialChecked(hasHelped) {
      trials.push(hasHelped);
      if (hasHelped || extensionsLeft === 0) return false;
      extensionsLeft -= 1;
      return true;
    },
    judged(isGood) {
      verdicts.push(isGood);
      return false;
    },
    isEffect: (source) => source !== "main" && source !== "worker",
  });
  const frames = (count: number, gap: number, source?: string): void => {
    for (let index = 0; index < count; index++) {
      clock.time += gap;
      governor.report(gap, source);
    }
  };
  return { clock, governor, strikeOuts, trials, verdicts, frames };
}
