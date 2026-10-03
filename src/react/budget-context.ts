import { createContext } from "react";
import type { Budget } from "../budget/budget.types";
import { budget as pageBudget } from "../budget/page-budget";

/** Defaults to the page's budget, so no provider is needed. */
export const BudgetContext = createContext<Budget>(pageBudget);
