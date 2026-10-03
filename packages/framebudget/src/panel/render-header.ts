import type { BudgetSnapshot } from "../budget/budget.types";
import { createElement } from "./create-element";
import { formatNumber } from "./format-number";
import { TIER_COLORS } from "./panel.constants";

export function renderHeader(body: HTMLElement, snapshot: BudgetSnapshot): void {
  const [foreground, background] = TIER_COLORS[snapshot.tier];
  const header = createElement("div", "display:flex;align-items:center;gap:8px;margin-bottom:6px");
  const forcedNote = snapshot.forced === null ? "" : " (forced)";
  header.append(
    createElement(
      "span",
      `padding:2px 8px;border-radius:999px;color:${foreground};background:${background}`,
      snapshot.tier,
    ),
    createElement("span", "", `score ${formatNumber(snapshot.score)}${forcedNote}`),
  );
  body.append(header);
}
