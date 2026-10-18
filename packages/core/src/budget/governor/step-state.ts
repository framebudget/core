import type { BudgetState, StepState } from "../budget-state.types";

/** A step, check or retry starts a new stretch of windows. */
export function restartStretch(steps: StepState): void {
  steps.recentJudged = 0;
  steps.recentGood = 0;
}

/** Turns a stepped-down effect back on (it leaves the stepped list). */
export function unstep(stepped: string[], name: string): void {
  const index = stepped.indexOf(name);
  if (index !== -1) stepped.splice(index, 1);
}

/**
 * Drops what the governor was checking when the device changes under it (a
 * forced tier, a simulated device): guesses come back on unlearned, a retry
 * ends without a verdict, and the governor starts over after a cooldown.
 */
export function dropChecks(state: BudgetState): void {
  const { steps } = state;
  for (const name of steps.trial) unstep(state.stepped, name);
  steps.trial = [];
  steps.trialSource = null;
  steps.retry = null;
  restartStretch(steps);
  state.governor?.reset();
}
