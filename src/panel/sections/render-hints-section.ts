import type { BudgetSnapshot } from "../../budget/budget.types";
import { formatNumber } from "../format-number";
import { renderSection } from "./render-section";

export function renderHintsSection(body: HTMLElement, snapshot: BudgetSnapshot): void {
  const { hints } = snapshot;
  renderSection(body, "Hints", [
    ["cores", formatNumber(hints?.cores)],
    ["memory GB", formatNumber(hints?.memoryGb, 2)],
    ["save-data", String(hints?.saveData === true)],
    ["2g", String(hints?.slowNetwork === true)],
    ["reduced motion", String(hints?.reducedMotion === true)],
    ["pressure", snapshot.pressure ?? "n/a"],
  ]);
}
