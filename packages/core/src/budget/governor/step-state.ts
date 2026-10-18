import type { StepState } from "../budget-state.types";

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
