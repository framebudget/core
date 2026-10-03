import type { Tier } from "./tiers";

export type KernelName = "float" | "typed" | "alloc" | "path";

export const KERNEL_NAMES: readonly KernelName[] = ["float", "typed", "alloc", "path"];

/** One effect in the registry. */
export interface EffectDefinition {
  /** Score (100 = reference device) the device needs for the effect to run. */
  threshold: number;
  /** Relative frame cost. The governor steps the most expensive effect down first. */
  cost: number;
  /** Turned off under `prefers-reduced-motion: reduce`. */
  motion?: boolean;
  /** Turned off under Save-Data or a 2g connection. */
  data?: boolean;
}

/**
 * Everything that turns raw measurements into decisions. Sites override parts
 * of it with `configure({ calibration })` and the boot script options.
 * The numbers are provisional until calibrated on real devices.
 */
export interface Calibration {
  /** Bump when the numbers change in a way that invalidates cached scores. */
  version: string;
  /** Work units per millisecond of each kernel on the reference device, warm (optimized code, at load). */
  reference: Record<KernelName, number>;
  /**
   * The same rates measured cold, before the first paint. Cold code runs in
   * the engine's lower tiers, several times slower than warm, so cold scores
   * need their own reference to land on the same scale.
   */
  coldReference: Record<KernelName, number>;
  /** The effect registry. */
  effects: Record<string, EffectDefinition>;
  /** Tier floors. A tier's effect set is every effect whose threshold is at or below its floor. */
  tiers: Record<Tier, number>;
  /** Fraction of a threshold. On stays on down to threshold * (1 - h); off turns on from threshold * (1 + h). */
  hysteresis: number;
  /** Score used when the clock is too coarse to measure anything. */
  fallbackScore: number;
  /** Hardware hints that cap the score. */
  caps: {
    /** `navigator.deviceMemory` at or below this caps the score. */
    lowMemoryGb: number;
    /** `navigator.hardwareConcurrency` at or below this caps the score. */
    lowCores: number;
    /** The cap. */
    lowScore: number;
  };
  /** Score multipliers for Compute Pressure states. */
  pressure: { serious: number; critical: number };
  /** A cached warm score older than this is ignored. */
  scoreMaxAgeDays: number;
  /** Clean visits before an effect that stuttered is tried again (doubles after each new stutter). */
  retryVisits: number;
}

type Patch<T> = { [K in keyof T]?: T[K] extends object ? Partial<T[K]> : T[K] };

export interface CalibrationPatch extends Omit<Patch<Calibration>, "effects"> {
  effects?: Record<string, Partial<EffectDefinition>>;
}

export const defaultCalibration: Calibration = {
  version: "provisional-1",
  // Provisional: a desktop Chrome measurement divided by 5, standing in for a
  // mid-range phone until real devices are calibrated.
  reference: { float: 10800, typed: 219000, alloc: 30900, path: 4860 },
  coldReference: { float: 5500, typed: 45000, alloc: 12400, path: 1780 },
  effects: {
    hover: { threshold: 20, cost: 1 },
    canvasLowRes: { threshold: 30, cost: 3, motion: true },
    entrances: { threshold: 35, cost: 2, motion: true },
    shimmer: { threshold: 45, cost: 2, motion: true },
    sound: { threshold: 50, cost: 1, data: true },
    pageTransition: { threshold: 55, cost: 3, motion: true },
    parallax: { threshold: 70, cost: 5, motion: true },
    blur: { threshold: 90, cost: 6 },
    canvasHiRes: { threshold: 120, cost: 8, motion: true, data: true },
  },
  tiers: { Full: 120, High: 70, Medium: 35, Lite: 20 },
  hysteresis: 0.1,
  fallbackScore: 50,
  caps: { lowMemoryGb: 1, lowCores: 2, lowScore: 60 },
  pressure: { serious: 0.7, critical: 0.4 },
  scoreMaxAgeDays: 14,
  retryVisits: 5,
};

const isNum = (v: unknown): v is number => typeof v === "number" && isFinite(v) && v >= 0;

/** Copies validated values for the keys `target` already has: numbers, short strings, nested objects. */
function mergeKnown(target: Record<string, unknown>, patch: unknown): void {
  if (!patch || typeof patch !== "object") return;
  for (const key of Object.keys(target)) {
    const t = target[key];
    const p = (patch as Record<string, unknown>)[key];
    if (typeof t === "number" ? isNum(p) : typeof t === "string" && typeof p === "string" && p.length <= 64) {
      target[key] = p;
    } else if (t && typeof t === "object" && key !== "effects") mergeKnown(t as Record<string, unknown>, p);
  }
}

/**
 * Merges patches over a base calibration, later patches winning. Every value is
 * validated, so patches can come from storage or the network. A new effect is
 * only added when the patch gives both its threshold and its cost.
 */
export function mergeCalibration(
  base: Calibration,
  ...patches: (CalibrationPatch | null | undefined)[]
): Calibration {
  const out = JSON.parse(JSON.stringify(base)) as Calibration;
  for (const patch of patches) {
    mergeKnown(out as unknown as Record<string, unknown>, patch);
    const effects = patch && patch.effects;
    if (!effects || typeof effects !== "object") continue;
    for (const name of Object.keys(effects)) {
      const p = effects[name];
      if (!p || typeof p !== "object") continue;
      let def = out.effects[name];
      if (!def) {
        if (!(isNum(p.threshold) && isNum(p.cost))) continue;
        def = out.effects[name] = { threshold: 0, cost: 0 };
      }
      mergeKnown(def as unknown as Record<string, unknown>, p);
      if (typeof p.motion === "boolean") def.motion = p.motion;
      if (typeof p.data === "boolean") def.data = p.data;
    }
  }
  out.hysteresis = Math.min(out.hysteresis, 0.5);
  out.pressure.serious = Math.min(out.pressure.serious, 1);
  out.pressure.critical = Math.min(out.pressure.critical, 1);
  out.retryVisits = Math.round(out.retryVisits);
  return out;
}

/**
 * Identifies the units of a score. A cached score is only reused when the key
 * matches, so overriding reference rates invalidates old scores.
 */
export function calibrationKey(cal: Calibration): string {
  return cal.version + ":" + KERNEL_NAMES.map((k) => cal.reference[k]).join(",");
}

/** Effects in a tier's set: threshold at or below the tier floor. */
export function tierEffects(cal: Calibration, tier: Tier): string[] {
  const floor = cal.tiers[tier];
  return Object.keys(cal.effects).filter((name) => cal.effects[name]!.threshold <= floor);
}
