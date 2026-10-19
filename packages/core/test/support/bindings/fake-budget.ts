import type { Budget, BudgetSnapshot, ChangeListener, Tier } from "@framebudget/core";
import type { FakeBudget } from "./fake-budget.types";

/** A budget that answers from a fixed list of effects and counts its listeners. */
export function fakeBudget(effects: readonly string[], tier: Tier): FakeBudget {
  const listeners = new Set<ChangeListener>();
  let state = { effects, tier };
  const budget = {
    allows: (effect: string) => state.effects.includes(effect),
    get tier() {
      return state.tier;
    },
    on: (_type: "change", listener: ChangeListener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  } as unknown as Budget;
  return {
    budget,
    listeners: () => listeners.size,
    change(next: readonly string[], nextTier: Tier) {
      state = { effects: next, tier: nextTier };
      for (const listener of listeners) listener({} as BudgetSnapshot, "governor");
    },
  };
}
