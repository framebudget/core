import type { Budget } from "@framebudget/core";
import { afterNextRender, DestroyRef, inject, signal, type Signal } from "@angular/core";
import { BUDGET } from "./budget-token";

/**
 * The budget to read, signalled on every change. It stays undefined until the
 * first render in the browser, so server rendering and hydration answer like
 * the server and effects only start on the client. The subscription ends with
 * the injector (component, service or application).
 */
export function liveBudget(): Signal<Budget | undefined> {
  const budget = inject(BUDGET);
  const lifetime = inject(DestroyRef);
  // A change keeps the same budget object, so every set must notify.
  const live = signal<Budget | undefined>(undefined, { equal: () => false });
  afterNextRender(() => {
    live.set(budget);
    const stop = budget.on("change", () => {
      live.set(budget);
    });
    lifetime.onDestroy(stop);
  });
  return live.asReadonly();
}
