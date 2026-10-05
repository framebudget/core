import type { CreateBudgetOptions } from "./budget.types";
import type { BudgetState } from "./budget-state.types";

/** A budget that has not started: nothing is read from the page until first use. */
export function createBudgetState(init: CreateBudgetOptions): BudgetState {
  return {
    init,
    listeners: new Set(),
    defaults: [],
    patches: [],
    config: {},
    stepped: [],
    hasStarted: false,
    scope: undefined,
    context: null,
    remote: undefined,
    decision: null,
    score: null,
    source: null,
    cold: null,
    warm: null,
    pressure: undefined,
    learned: [],
    governor: null,
    isLoaded: false,
    isSharingArmed: false,
    wasReported: false,
    now: () => Date.now(),
  };
}
