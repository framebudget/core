import type { CreateBudgetOptions } from "./budget.types";
import type { BudgetState, StepState } from "./budget-state.types";

/** No step, trial or retry yet, and no window judged. */
export function createStepState(): StepState {
  return {
    trial: [],
    trialSource: null,
    isHalted: false,
    recorded: {},
    retry: null,
    retried: [],
    hasRetryFailed: false,
    judged: 0,
    good: 0,
    recentJudged: 0,
    recentGood: 0,
    isCleanMarked: false,
  };
}

/** A budget that has not started: nothing is read from the page until first use. */
export function createBudgetState(init: CreateBudgetOptions): BudgetState {
  return {
    init,
    listeners: new Set(),
    defaults: [],
    patches: [],
    config: {},
    stepped: [],
    used: new Set(),
    steps: createStepState(),
    pendingFrames: [],
    hasStarted: false,
    scope: undefined,
    context: null,
    remote: undefined,
    decision: null,
    score: null,
    source: null,
    cold: null,
    ratios: undefined,
    warm: null,
    pressure: undefined,
    learned: [],
    explored: null,
    isCapacityPending: false,
    governor: null,
    runWatch: null,
    isLoaded: false,
    isSharingArmed: false,
    wasReported: false,
    now: () => Date.now(),
  };
}
