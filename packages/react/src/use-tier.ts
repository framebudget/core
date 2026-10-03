import { useCallback, useContext, useSyncExternalStore } from "react";
import { Tier } from "@framebudget/core";
import { BudgetContext } from "./budget-context";

/** The current tier. Server rendering and hydration answer Lite. */
export function useTier(): Tier {
  const budget = useContext(BudgetContext);
  const subscribe = useCallback((onChange: () => void) => budget.on("change", onChange), [budget]);
  return useSyncExternalStore(
    subscribe,
    () => budget.tier,
    () => Tier.Lite,
  );
}
