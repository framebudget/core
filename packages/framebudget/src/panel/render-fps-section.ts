import type { BudgetSnapshot } from "../budget/budget.types";
import { formatNumber } from "./format-number";
import type { PanelRow } from "./panel.types";
import { renderSection } from "./render-section";

export function renderFpsSection(body: HTMLElement, snapshot: BudgetSnapshot): void {
  const rows = Object.entries(snapshot.fps).map(([source, fps]): PanelRow => [source, formatNumber(fps)]);
  if (rows.length > 0) renderSection(body, "Frames per second", rows);
}
