import type { Budget, ConfigureOptions } from "./budget.types";
import { createBudget } from "./create-budget";

/** The page's budget. Starts on first use; safe to import during server rendering. */
export const budget: Budget = /* #__PURE__ */ createBudget();

/** Same as `budget.configure`. */
export function configure(options: ConfigureOptions): void {
  budget.configure(options);
}
