import type { Tier } from "../../core/tier/tier.enum";
import { safe } from "../scope/safe";
import type { Scope } from "../scope/scope.types";
import { EFFECTS_ATTRIBUTE, TIER_ATTRIBUTE } from "./document.constants";

/** Exposes the decision to CSS: `html[data-framebudget-effects~="parallax"]`. */
export function applyToDocument(scope: Scope, tier: Tier, effects: readonly string[]): void {
  const root = safe(() => scope.document?.documentElement);
  if (!root) return;
  safe(() => {
    root.setAttribute(TIER_ATTRIBUTE, tier);
    root.setAttribute(EFFECTS_ATTRIBUTE, effects.join(" "));
  });
}
