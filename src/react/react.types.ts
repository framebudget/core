import type { ReactNode } from "react";
import type { Budget } from "../budget/budget.types";

export interface BudgetProviderProperties {
  budget: Budget;
  children?: ReactNode;
}
