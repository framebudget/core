import { useCallback, useContext, useSyncExternalStore } from "react";
import { BudgetContext } from "./budget-context";

/**
 * May this effect run? Re-renders when the budget changes. Server rendering
 * and hydration answer false, so effects only start on the client.
 */
export function useBudget(effect: string): boolean {
  const budget = useContext(BudgetContext);
  const subscribe = useCallback((onChange: () => void) => budget.on("change", onChange), [budget]);
  return useSyncExternalStore(
    subscribe,
    () => budget.allows(effect),
    () => false,
  );
}
