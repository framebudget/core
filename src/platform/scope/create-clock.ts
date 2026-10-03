import { safe } from "./safe";
import type { Scope } from "./scope.types";

/** A clock that works without `performance`. */
export function createClock(scope: Scope): () => number {
  const timer = safe(() => scope.performance);
  return timer && typeof timer.now === "function" ? () => timer.now() : () => Date.now();
}
