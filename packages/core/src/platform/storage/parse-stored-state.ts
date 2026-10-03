import type { StoredState } from "../../core/state/stored-state.types";
import { isRecord } from "./is-record";
import { parseBlocked } from "./parse-blocked";
import { toFiniteNumber } from "./to-finite-number";

const isString = (value: unknown): value is string => typeof value === "string";

/** Stored JSON from any version or tampering, reduced to the fields that are valid. */
export function parseStoredState(value: unknown): StoredState {
  if (!isRecord(value) || value.v !== 1) return { v: 1, blocked: {} };
  return {
    v: 1,
    blocked: parseBlocked(value.blocked),
    ...(isString(value.key) && { key: value.key }),
    score: toFiniteNumber(value.score),
    at: toFiniteNumber(value.at),
    ...(Array.isArray(value.qualified) && { qualified: value.qualified.filter(isString) }),
    ...(isRecord(value.remote) && { remote: value.remote }),
    remoteAt: toFiniteNumber(value.remoteAt),
    reportedAt: toFiniteNumber(value.reportedAt),
    ...(isString(value.reportedCal) && { reportedCal: value.reportedCal }),
  };
}
