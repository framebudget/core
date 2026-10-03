import type { Budget } from "../budget/budget.types";
import { renderEffectsSection } from "./sections/render-effects-section";
import { renderForceButtons } from "./sections/render-force-buttons";
import { renderFpsSection } from "./sections/render-fps-section";
import { renderHeader } from "./sections/render-header";
import { renderHintsSection } from "./sections/render-hints-section";
import { renderKernelSection } from "./sections/render-kernel-section";
import { renderScoreSection } from "./sections/render-score-section";

/** Replaces the panel body with the budget's current snapshot. */
export function renderPanel(body: HTMLElement, budget: Budget): void {
  const snapshot = budget.snapshot();
  body.textContent = "";
  renderHeader(body, snapshot);
  renderScoreSection(body, snapshot);
  renderKernelSection(body, snapshot);
  renderHintsSection(body, snapshot);
  renderEffectsSection(body, snapshot);
  renderFpsSection(body, snapshot);
  renderForceButtons(body, snapshot, budget);
}
