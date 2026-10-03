import type { BudgetSnapshot } from "../../budget/budget.types";
import type { PanelRow } from "../panel.types";
import { renderSection } from "./render-section";

export function renderEffectsSection(body: HTMLElement, snapshot: BudgetSnapshot): void {
  const { calibration, effects, off } = snapshot;
  const rows = Object.entries(calibration.effects).map(([name, definition]): PanelRow => [
    `${name} (${String(definition.threshold)}, ${String(definition.cost)})`,
    effects.includes(name) ? "on" : `off: ${off[name] ?? "unknown"}`,
  ]);
  renderSection(body, "Effects (threshold, cost)", rows);
}
