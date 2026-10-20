import { safe } from "../../../platform/scope/safe";
import type { Scope } from "../../../platform/scope/scope.types";
import type { BudgetState, RunWatch } from "../../budget-state.types";

/**
 * Ends the runs of effects that went silent. While a run is open, a timer
 * checks every `idleMs`; a run silent that long has ended (a longer gap would
 * not count as a frame anyway). Hiding or leaving the page ends every run, and
 * these listeners are added before the report's, so the report sees the verdicts.
 */
export function startRunWatch(state: BudgetState, scope: Scope, idleMs: number): RunWatch {
  const timer = { isArmed: false };
  const arm = (): void => {
    if (timer.isArmed || !scope.setTimeout) return;
    timer.isArmed = true;
    scope.setTimeout(() => {
      timer.isArmed = false;
      if ((state.governor?.endRuns(idleMs) ?? 0) > 0) arm();
    }, idleMs);
  };
  const endAll = (): void => {
    state.governor?.endRuns(0);
  };
  safe(() => {
    scope.addEventListener?.("pagehide", endAll);
  });
  safe(() => {
    scope.document?.addEventListener("visibilitychange", () => {
      if (scope.document?.visibilityState === "hidden") endAll();
    });
  });
  return { touch: arm };
}
