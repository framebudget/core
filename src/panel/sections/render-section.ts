import { createElement } from "../create-element";
import { PANEL_COLORS } from "../panel.constants";
import type { PanelRow } from "../panel.types";

export function renderSection(parent: HTMLElement, title: string, rows: readonly PanelRow[]): void {
  parent.append(
    createElement(
      "div",
      `margin:10px 0 4px;color:${PANEL_COLORS.muted};text-transform:uppercase;letter-spacing:.08em`,
      title,
    ),
  );
  for (const [label, value] of rows) {
    const row = createElement("div", "display:flex;justify-content:space-between;gap:12px");
    row.append(
      createElement("span", `color:${PANEL_COLORS.muted}`, label),
      createElement("span", "text-align:right", value),
    );
    parent.append(row);
  }
}
