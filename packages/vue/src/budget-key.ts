import type { Budget } from "@framebudget/core";
import type { InjectionKey } from "vue";

/** Injects the budget given to provideBudget; without one, components read the page's budget. */
export const budgetKey: InjectionKey<Budget> = Symbol("framebudget budget");
