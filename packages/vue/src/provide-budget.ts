import type { Budget } from "@framebudget/core";
import { provide } from "vue";
import { budgetKey } from "./budget-key";

/**
 * Only needed to use a budget other than the page's (tests, embedded widgets).
 * Call it in a component's setup; its descendants read that budget.
 */
export function provideBudget(budget: Budget): void {
  provide(budgetKey, budget);
}
