import type { Budget } from "../budget/budget.types";
import { createPanelFrame } from "./create-panel-frame";
import { REFRESH_INTERVAL_MS } from "./panel.constants";
import { renderPanel } from "./render-panel";

/**
 * Mounts the diagnostics overlay. The core loads this module on demand when
 * the URL has `?framebudget`. Returns a function that removes it.
 */
export function mountPanel(budget: Budget): () => void {
  const frame = createPanelFrame();
  document.body.append(frame.root);
  const update = (): void => {
    renderPanel(frame.body, budget);
  };
  update();
  const unsubscribe = budget.on("change", update);
  const timer = setInterval(update, REFRESH_INTERVAL_MS);
  const unmount = (): void => {
    unsubscribe();
    clearInterval(timer);
    frame.root.remove();
  };
  frame.closeButton.addEventListener("click", unmount);
  return unmount;
}
