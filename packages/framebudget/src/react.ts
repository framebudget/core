import { createContext, createElement, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Budget } from "./budget";
import { budget as pageBudget } from "./index";
import { Tier } from "./tiers";

const BudgetContext = createContext<Budget>(pageBudget);

/** Only needed to use a budget other than the page's (tests, embedded widgets). */
export function BudgetProvider(props: { budget: Budget; children?: ReactNode }) {
  return createElement(BudgetContext.Provider, { value: props.budget }, props.children);
}

/**
 * May this effect run? Re-renders when the budget changes. Server rendering
 * and hydration answer false, so effects only start on the client.
 */
export function useBudget(effect: string): boolean {
  const b = useContext(BudgetContext);
  const subscribe = useCallback((onChange: () => void) => b.on("change", onChange), [b]);
  return useSyncExternalStore(
    subscribe,
    () => b.allows(effect),
    () => false,
  );
}

/** The current tier. Server rendering and hydration answer Lite. */
export function useTier(): Tier {
  const b = useContext(BudgetContext);
  const subscribe = useCallback((onChange: () => void) => b.on("change", onChange), [b]);
  return useSyncExternalStore(
    subscribe,
    () => b.tier,
    () => Tier.Lite,
  );
}
