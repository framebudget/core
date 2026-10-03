import type { BudgetSnapshot } from "../budget/budget.types";
import { formatNumber } from "./format-number";
import { renderSection } from "./render-section";

export function renderScoreSection(body: HTMLElement, snapshot: BudgetSnapshot): void {
  const bench = snapshot.warm ?? snapshot.cold;
  renderSection(body, "Score", [
    ["source", snapshot.source ?? "n/a"],
    ["before caps", formatNumber(snapshot.rawScore)],
    ["cold", formatNumber(snapshot.cold?.score)],
    ["warm", formatNumber(snapshot.warm?.score)],
    ["clock tick ms", formatNumber(bench?.tickMs, 3)],
  ]);
}
