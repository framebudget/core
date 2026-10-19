import { budget as pageBudget, type Budget } from "@framebudget/core";
import { InjectionToken } from "@angular/core";

/** The budget to read: the page's, unless provideBudget gives another one. */
export const BUDGET = new InjectionToken<Budget>("framebudget budget", {
  providedIn: "root",
  factory: () => pageBudget,
});
