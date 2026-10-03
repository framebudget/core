import type { Tier } from "../tier/tier.enum";

export type KernelName = "float" | "typed" | "alloc" | "path";

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
