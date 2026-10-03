import type { BlockEntry } from "../../core/state/stored-state.types";
import { isRecord } from "./is-record";
import { toFiniteNumber } from "./to-finite-number";

function parseBlockEntry(value: unknown): BlockEntry | undefined {
  if (!isRecord(value)) return undefined;
  const clean = toFiniteNumber(value.clean);
  const fails = toFiniteNumber(value.fails);
  return clean !== undefined && fails !== undefined ? { clean, fails } : undefined;
}

/** The learned blocks, keeping only entries with numeric counters. */
export function parseBlocked(value: unknown): Record<string, BlockEntry> {
  const blocked: Record<string, BlockEntry> = {};
  if (!isRecord(value)) return blocked;
  for (const [name, entry] of Object.entries(value)) {
    const parsed = parseBlockEntry(entry);
    if (parsed) blocked[name] = parsed;
  }
  return blocked;
}
