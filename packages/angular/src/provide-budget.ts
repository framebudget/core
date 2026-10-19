import type { Budget } from "@framebudget/core";
import type { Provider } from "@angular/core";
import { BUDGET } from "./budget-token";

/**
 * Only needed to use a budget other than the page's (tests, embedded widgets).
 * Goes in the providers of the application, a route or a component.
 */
export function provideBudget(budget: Budget): Provider {
  return { provide: BUDGET, useValue: budget };
}
