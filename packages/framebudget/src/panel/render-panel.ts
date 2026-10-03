import type { Budget } from "../budget/budget.types";
import { renderEffectsSection } from "./render-effects-section";
import { renderForceButtons } from "./render-force-buttons";
import { renderFpsSection } from "./render-fps-section";
import { renderHeader } from "./render-header";
import { renderHintsSection } from "./render-hints-section";
import { renderKernelSection } from "./render-kernel-section";
import { renderScoreSection } from "./render-score-section";

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
