import { budget as pageBudget, type Budget } from "@framebudget/core";
import {
  getCurrentInstance,
  getCurrentScope,
  hasInjectionContext,
  inject,
  onMounted,
  onScopeDispose,
  shallowRef,
  triggerRef,
  type ShallowRef,
} from "vue";
import { budgetKey } from "./budget-key";

/**
 * The budget to read, triggered on every change. In a component it stays
 * undefined until mount, so server rendering and hydration answer like the
 * server and effects only start on the client. The subscription ends with the
 * component or effect scope.
 */
export function liveBudget(): Readonly<ShallowRef<Budget | undefined>> {
  const budget = hasInjectionContext() ? inject(budgetKey, pageBudget) : pageBudget;
  const live = shallowRef<Budget>();
  let stop: (() => void) | undefined;
  const connect = (): void => {
    live.value = budget;
    stop = budget.on("change", () => {
      triggerRef(live);
    });
  };
  if (getCurrentInstance()) onMounted(connect);
  else connect();
  if (getCurrentScope()) onScopeDispose(() => stop?.());
  return live;
}
