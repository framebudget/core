import { safe } from "../scope/safe";
import type { Scope } from "../scope/scope.types";
import { openStorage } from "../storage/open-storage";

export function readSessionItem(scope: Scope, key: string): string | null | undefined {
  const session = openStorage(scope, "sessionStorage");
  return session ? safe(() => session.getItem(key)) : null;
}

/** Stores a value for the session, or removes it when the value is null. */
export function writeSessionItem(scope: Scope, key: string, value: string | null): void {
  const session = openStorage(scope, "sessionStorage");
  if (!session) return;
  safe(() => {
    if (value === null) session.removeItem(key);
    else session.setItem(key, value);
  });
}
