import type { Budget, Tier } from "@framebudget/core";

/** A budget double for the binding tests. */
export interface FakeBudget {
  budget: Budget;
  /** How many change listeners are subscribed. */
  listeners(): number;
  /** Replaces the allowed effects and the tier, then emits "change". */
  change(effects: readonly string[], tier: Tier): void;
}
