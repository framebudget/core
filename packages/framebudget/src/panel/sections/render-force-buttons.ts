import type { Budget, BudgetSnapshot } from "../../budget/budget.types";
import { TIERS } from "../../core/tier/tier-order";
import { createElement } from "../create-element";
import { PANEL_COLORS } from "../panel.constants";
import type { ForceChoice } from "../panel.types";

function createForceButton(choice: ForceChoice, snapshot: BudgetSnapshot, budget: Budget): HTMLElement {
  const isActive = choice === "auto" ? snapshot.forced === null : snapshot.forced === choice;
  const border = isActive ? PANEL_COLORS.accent : PANEL_COLORS.line;
  const button = createElement(
    "button",
    `font:inherit;cursor:pointer;padding:3px 8px;border-radius:6px;border:1px solid ${border};background:${PANEL_COLORS.surface};color:${PANEL_COLORS.text}`,
    choice,
  );
  button.addEventListener("click", () => {
    budget.force(choice);
  });
  return button;
}

/** One button per tier to force it, plus `auto` to go back to measuring. */
export function renderForceButtons(body: HTMLElement, snapshot: BudgetSnapshot, budget: Budget): void {
  const buttons = createElement("div", "display:flex;flex-wrap:wrap;gap:6px;margin-top:10px");
  const choices: readonly ForceChoice[] = [...TIERS, "auto"];
  for (const choice of choices) buttons.append(createForceButton(choice, snapshot, budget));
  body.append(buttons);
}
