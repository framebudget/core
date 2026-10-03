import { safe } from "../platform/scope/safe";
import type { Scope } from "../platform/scope/scope.types";
import type { Budget } from "./budget.types";
import type { BudgetState } from "./budget-state.types";
import { handleLoad } from "./handle-load";

/** Runs the load work on the next task when the page already loaded, else on the load event. */
export function wireLoad(state: BudgetState, scope: Scope, budget: Budget): void {
  const onLoad = (): void => {
    handleLoad(state, budget);
  };
  const pageDocument = safe(() => scope.document);
  if (pageDocument?.readyState !== "complete") {
    safe(() => {
      scope.addEventListener?.("load", onLoad, { once: true });
    });
    return;
  }
  if (scope.setTimeout) scope.setTimeout(onLoad, 0);
  else onLoad();
}
