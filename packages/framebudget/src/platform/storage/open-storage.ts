import { safe } from "../scope/safe";
import type { Scope } from "../scope/scope.types";

/** A storage area, or null when it is missing or access throws (privacy modes, sandboxed frames). */
export function openStorage(scope: Scope, area: "localStorage" | "sessionStorage"): Storage | null {
  const storage = safe(() => scope[area]);
  return storage && typeof storage.getItem === "function" ? storage : null;
}
