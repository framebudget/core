import { budget as pageBudget, type Budget } from "@framebudget/core";
import { createContext } from "react";

/** Defaults to the page's budget, so no provider is needed. */
export const BudgetContext = createContext<Budget>(pageBudget);
