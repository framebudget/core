import type { BootState } from "../../src/platform/scope/scope.types";

export interface BootSandbox {
  /** Attributes the script set on the document root. */
  attributes: Record<string, string>;
  window: Record<string, unknown> & { __framebudget?: BootState };
}
