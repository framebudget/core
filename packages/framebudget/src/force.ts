import { safe, type Scope } from "./env";
import { openStorage } from "./storage";
import { isTier, type Tier } from "./tiers";

export const FORCE_PARAM = "framebudget-tier";
const SESSION_KEY = "framebudget-tier";

function parseTier(value: string): Tier | "auto" | null {
  const v = value.trim().toLowerCase();
  if (v === "auto") return "auto";
  const name = v.charAt(0).toUpperCase() + v.slice(1);
  return isTier(name) ? name : null;
}

/** Stores a forced tier for the session (or clears it with "auto"). */
export function writeForcedTier(scope: Scope, tier: Tier | "auto"): void {
  const session = openStorage(scope, "sessionStorage");
  if (!session) return;
  safe(() => (tier === "auto" ? session.removeItem(SESSION_KEY) : session.setItem(SESSION_KEY, tier)));
}

/**
 * `?framebudget-tier=Full|High|Medium|Lite|auto` forces a tier for the rest of
 * the session; without the parameter the session value applies.
 */
export function readForcedTier(scope: Scope): Tier | null {
  const search = safe(() => scope.location && scope.location.search) || "";
  const match = new RegExp("[?&]" + FORCE_PARAM + "=([^&#]*)").exec(search);
  const fromUrl = match ? parseTier(safe(() => decodeURIComponent(match[1]!)) || "") : null;
  if (fromUrl) {
    writeForcedTier(scope, fromUrl);
    return fromUrl === "auto" ? null : fromUrl;
  }
  const session = openStorage(scope, "sessionStorage");
  const stored = session ? safe(() => session.getItem(SESSION_KEY)) : null;
  return isTier(stored) ? stored : null;
}

export const SIMULATE_PARAM = "framebudget-score";
const SIMULATE_KEY = "framebudget-score";

/** A usable score: finite and not negative. */
export const isValidScore = (v: number): boolean => isFinite(v) && v >= 0;

/** Stores a simulated score for the session (or clears it with null). */
export function writeSimulatedScore(scope: Scope, score: number | null): void {
  const session = openStorage(scope, "sessionStorage");
  if (!session) return;
  safe(() => (score === null ? session.removeItem(SIMULATE_KEY) : session.setItem(SIMULATE_KEY, String(score))));
}

/**
 * Debug and demo aid. `?framebudget-score=40` simulates a device with that
 * score for the rest of the session; `?framebudget-score=off` returns to the
 * real device. Without the parameter the session value applies.
 */
export function readSimulatedScore(scope: Scope): number | null {
  const search = safe(() => scope.location && scope.location.search) || "";
  const match = new RegExp("[?&]" + SIMULATE_PARAM + "=([^&#]*)").exec(search);
  if (match) {
    const value = parseFloat(match[1]!);
    const score = isValidScore(value) ? value : null;
    writeSimulatedScore(scope, score);
    return score;
  }
  const session = openStorage(scope, "sessionStorage");
  const stored = parseFloat((session && safe(() => session.getItem(SIMULATE_KEY))) || "");
  return isValidScore(stored) ? stored : null;
}
