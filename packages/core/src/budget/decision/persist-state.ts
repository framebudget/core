import { saveState } from "../../platform/storage/save-state";
import type { BudgetState } from "../budget-state.types";

export function persistState(state: BudgetState): void {
  if (state.context) saveState(state.context.storage, state.context.stored);
}
