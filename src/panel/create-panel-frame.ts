import { createElement } from "./create-element";
import { PANEL_COLORS, PANEL_ROOT_STYLE } from "./panel.constants";
import type { PanelFrame } from "./panel.types";

/** The overlay shell: a title bar with the close button above the body that updates re-render. */
export function createPanelFrame(): PanelFrame {
  const root = createElement("aside", PANEL_ROOT_STYLE);
  root.setAttribute("aria-label", "framebudget diagnostics");
  const bar = createElement("div", "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px");
  const closeButton = createElement(
    "button",
    `font:inherit;cursor:pointer;background:none;border:0;color:${PANEL_COLORS.muted}`,
    "close",
  );
  bar.append(createElement("strong", `color:${PANEL_COLORS.accent}`, "framebudget"), closeButton);
  const body = createElement("div", "");
  root.append(bar, body);
  return { root, body, closeButton };
}
