import { safe } from "../platform/scope/safe";
import type { Scope } from "../platform/scope/scope.types";
import type { BudgetState } from "./budget-state.types";
import { recomputeDecision } from "./recompute-decision";

/** Follows the Compute Pressure API where the browser has it. */
export function watchPressure(state: BudgetState, scope: Scope): void {
  safe(() => {
    const Observer = scope.PressureObserver;
    if (!Observer) return;
    const observer = new Observer((records) => {
      const last = records[records.length - 1];
      if (!last || last.state === state.pressure) return;
      state.pressure = last.state;
      recomputeDecision(state, "pressure");
    });
    void Promise.resolve(observer.observe("cpu")).catch(() => null);
  });
}
