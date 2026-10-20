import { createGovernor } from "../../governor/create-governor";
import { defaultGovernorOptions } from "../../governor/default-governor-options";
import type { GovernorOptions } from "../../governor/governor.types";
import type { Scope } from "../../platform/scope/scope.types";
import { INITIAL_SAMPLING_MS } from "../budget.constants";
import type { BudgetState } from "../budget-state.types";
import { isEffect } from "../commands/mark-used";
import { countWindow } from "./count-window";
import { checkTrial } from "./check-trial";
import { replayFrames } from "./frames/frame-intake";
import { startFrameSampler } from "./frames/frame-sampler";
import { startRunWatch } from "./frames/run-watch";
import { strikeOut } from "./strike-out";

/** Starts the governor at load, then hands it the frames the page reported while loading. */
export function startGovernor(state: BudgetState, scope: Scope): void {
  const { auto, ...tuning } = state.config.governor ?? {};
  const options: GovernorOptions = { ...defaultGovernorOptions, ...tuning };
  state.governor = createGovernor(options, state.now, {
    strikeOut: (frameSource) => strikeOut(state, frameSource),
    trialChecked: (hasHelped) => checkTrial(state, hasHelped),
    judged: (isGood) => countWindow(state, options.cleanWindows, isGood),
    isEffect: (frameSource) => isEffect(state, frameSource),
  });
  state.runWatch = startRunWatch(state, scope, options.maxGapMs);
  replayFrames(state);
  if (auto === false) return;
  startFrameSampler(state, scope, options.warmupMs + INITIAL_SAMPLING_MS);
}
