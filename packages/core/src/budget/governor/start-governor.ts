import { createGovernor } from "../../governor/create-governor";
import { defaultGovernorOptions } from "../../governor/default-governor-options";
import type { GovernorOptions } from "../../governor/governor.types";
import type { Scope } from "../../platform/scope/scope.types";
import { INITIAL_SAMPLING_MS } from "../budget.constants";
import type { BudgetState } from "../budget-state.types";
import { countWindow } from "./count-window";
import { checkTrial } from "./check-trial";
import { startFrameSampler } from "./frame-sampler";
import { strikeOut } from "./strike-out";

export function startGovernor(state: BudgetState, scope: Scope): void {
  const { auto, ...tuning } = state.config.governor ?? {};
  const options: GovernorOptions = { ...defaultGovernorOptions, ...tuning };
  state.governor = createGovernor(options, state.now, {
    strikeOut: (frameSource) => strikeOut(state, frameSource),
    trialChecked: (hasHelped) => checkTrial(state, hasHelped),
    judged: (isGood) => {
      countWindow(state, options.cleanWindows, isGood);
    },
  });
  if (auto === false) return;
  startFrameSampler(state, scope, options.warmupMs + INITIAL_SAMPLING_MS);
}
