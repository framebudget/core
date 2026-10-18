import type { Budget } from "../../src/budget/budget.types";

/** One bad window for the test governor of `bootedPage` (2 frames): 20 fps, under minFps. */
export function stutter(budget: Budget, source?: string): void {
  budget.reportFrame(50, source);
  budget.reportFrame(50, source);
}

/** Good windows for the test governor of `bootedPage` (2 frames each, 60 fps). */
export function smooth(budget: Budget, windows = 1): void {
  for (let index = 0; index < 2 * windows; index++) budget.reportFrame(16.7);
}
