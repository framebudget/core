import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import { liveBudget } from "./live-budget";

/**
 * May this effect run? A computed ref that follows the budget. In a component
 * it answers false until mount (server rendering and hydration included), so
 * effects only start on the client. The effect name may be a ref or a getter.
 */
export function useBudget(effect: MaybeRefOrGetter<string>): ComputedRef<boolean> {
  const live = liveBudget();
  return computed(() => live.value?.allows(toValue(effect)) ?? false);
}
