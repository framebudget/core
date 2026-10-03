import { isValidScore } from "../../core/score/is-valid-score";
import type { Scope } from "../scope/scope.types";
import { SIMULATE_PARAM, SIMULATE_SESSION_KEY } from "./overrides.constants";
import { readUrlParameter } from "./read-url-parameter";
import { readSessionItem, writeSessionItem } from "./session-item";

/** Stores a simulated score for the session (or clears it with null). */
export function writeSimulatedScore(scope: Scope, score: number | null): void {
  writeSessionItem(scope, SIMULATE_SESSION_KEY, score === null ? null : String(score));
}

/**
 * Debug and demo aid. `?framebudget-score=40` simulates a device with that
 * score for the rest of the session; `?framebudget-score=off` returns to the
 * real device. Without the parameter the session value applies.
 */
export function readSimulatedScore(scope: Scope): number | null {
  const raw = readUrlParameter(scope, SIMULATE_PARAM);
  if (raw !== undefined) {
    const value = Number.parseFloat(raw);
    const score = isValidScore(value) ? value : null;
    writeSimulatedScore(scope, score);
    return score;
  }
  const stored = Number.parseFloat(readSessionItem(scope, SIMULATE_SESSION_KEY) ?? "");
  return isValidScore(stored) ? stored : null;
}
