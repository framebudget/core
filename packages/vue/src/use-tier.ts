import { Tier } from "@framebudget/core";
import { computed, type ComputedRef } from "vue";
import { liveBudget } from "./live-budget";

/** The current tier, as a computed ref. In a component it answers Lite until mount. */
export function useTier(): ComputedRef<Tier> {
  const live = liveBudget();
  return computed(() => live.value?.tier ?? Tier.Lite);
}
