import type { ReactNode } from "react";
import type { Budget } from "@framebudget/core";

export interface BudgetProviderProperties {
  budget: Budget;
  children?: ReactNode;
}
