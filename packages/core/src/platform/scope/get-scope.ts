import type { Scope } from "./scope.types";

/** The current window, or undefined outside a browser. */
export function getScope(): Scope | undefined {
  return typeof window === "undefined" ? undefined : globalThis;
}
