import { isTier } from "../../core/tier/is-tier";
import type { Tier } from "../../core/tier/tier.enum";
import { safe } from "../scope/safe";
import type { Scope } from "../scope/scope.types";
import { FORCE_PARAM, FORCE_SESSION_KEY } from "./overrides.constants";
import { readUrlParameter } from "./read-url-parameter";
import { readSessionItem, writeSessionItem } from "./session-item";

function parseTier(value: string): Tier | "auto" | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "auto") return "auto";
  const name = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return isTier(name) ? name : null;
}

/** Stores a forced tier for the session (or clears it with "auto"). */
export function writeForcedTier(scope: Scope, tier: Tier | "auto"): void {
  writeSessionItem(scope, FORCE_SESSION_KEY, tier === "auto" ? null : tier);
}

/**
 * `?framebudget-tier=Full|High|Medium|Lite|auto` forces a tier for the rest of
 * the session; without the parameter the session value applies.
 */
export function readForcedTier(scope: Scope): Tier | null {
  const raw = readUrlParameter(scope, FORCE_PARAM);
  const fromUrl = raw === undefined ? null : parseTier(safe(() => decodeURIComponent(raw)) ?? "");
  if (fromUrl) {
    writeForcedTier(scope, fromUrl);
    return fromUrl === "auto" ? null : fromUrl;
  }
  const stored = readSessionItem(scope, FORCE_SESSION_KEY);
  return isTier(stored) ? stored : null;
}
