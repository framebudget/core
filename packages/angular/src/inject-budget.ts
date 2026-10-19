import { computed, type Signal } from "@angular/core";
import { liveBudget } from "./live-budget";

/**
 * May this effect run? A signal that follows the budget. It answers false
 * until the first render in the browser (server rendering and hydration
 * included), so effects only start on the client. Call it in an injection
 * context, such as a field initializer or constructor. The effect name may be
 * a signal, such as an input.
 */
export function injectBudget(effect: string | (() => string)): Signal<boolean> {
  const live = liveBudget();
  return computed(() => live()?.allows(typeof effect === "string" ? effect : effect()) ?? false);
}
