import { Tier } from "@framebudget/core";
import { computed, type Signal } from "@angular/core";
import { liveBudget } from "./live-budget";

/** The current tier, as a signal. It answers Lite until the first render in the browser. */
export function injectTier(): Signal<Tier> {
  const live = liveBudget();
  return computed(() => live()?.tier ?? Tier.Lite);
}
