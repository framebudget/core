import { safe } from "../scope/safe";
import type { Scope } from "../scope/scope.types";

/** The raw (still encoded) value of a query parameter, or undefined when it is absent. */
export function readUrlParameter(scope: Scope, name: string): string | undefined {
  const search = safe(() => scope.location?.search) ?? "";
  return new RegExp(`[?&]${name}=([^&#]*)`).exec(search)?.[1];
}
