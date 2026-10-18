import type { BudgetSnapshot } from "../../budget/budget.types";
import type { PanelRow } from "../panel.types";
import { renderSection } from "./render-section";

/** "on", with why when the effect runs below its threshold; else why it is off. */
function effectState(snapshot: BudgetSnapshot, name: string): string {
  if (name === snapshot.explored && snapshot.effects.includes(name)) return "on: explored";
  if (snapshot.promoted.includes(name)) return "on: capacity";
  return snapshot.effects.includes(name) ? "on" : `off: ${snapshot.off[name] ?? "unknown"}`;
}

export function renderEffectsSection(body: HTMLElement, snapshot: BudgetSnapshot): void {
  const rows = Object.entries(snapshot.calibration.effects).map(([name, definition]): PanelRow => [
    `${name} (${String(definition.threshold)}, ${String(definition.cost)})${snapshot.used.includes(name) ? " used" : ""}`,
    effectState(snapshot, name),
  ]);
  renderSection(body, "Effects (threshold, cost)", rows);
}
