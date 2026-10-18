import type { Decision, WidenInput } from "../decision/decision.types";
import { isThresholdOnly } from "../decision/off-reason";

/** An effect's frame cost on this device: its cost on the reference device, scaled by how slow the device is for it. */
export function effectLoad(cost: number, score: number): number {
  return (cost * 100) / Math.max(score, 1);
}

/** The candidates, in order, that fit the room left, each one taking its load from it. */
function fitting(candidates: readonly string[], load: (name: string) => number, room: number): string[] {
  const [first, ...rest] = candidates;
  if (first === undefined) return [];
  const cost = load(first);
  return cost <= room ? [first, ...fitting(rest, load, room - cost)] : fitting(rest, load, room);
}

/**
 * With a capacity, used effects that only miss their threshold are added, the
 * lightest first, while the load of the page's used effects fits it. Effects
 * the governor stepped down still count: the page could not afford them.
 */
export function promotedEffects(input: WidenInput, decision: Decision): string[] {
  const { calibration, used } = input;
  if (!(calibration.capacity > 0)) return [];
  const load = (name: string): number => effectLoad(calibration.effects[name]?.cost ?? 0, decision.scores[name] ?? 0);
  const spent = used
    .filter((name) => decision.effects.includes(name) || input.stepped?.includes(name))
    .reduce((sum, name) => sum + load(name), 0);
  const candidates = used
    .filter((name) => isThresholdOnly(input, decision, name))
    .sort((left, right) => load(left) - load(right));
  return fitting(candidates, load, calibration.capacity - spent);
}
