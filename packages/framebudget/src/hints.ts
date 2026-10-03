import { safe, type Scope } from "./env";

/** Signals read from the browser besides the benchmark. */
export interface Hints {
  cores?: number;
  memoryGb?: number;
  saveData: boolean;
  /** effectiveType is 2g or slow-2g. */
  slowNetwork: boolean;
  reducedMotion: boolean;
  /** Global Privacy Control. Only used to suppress sharing; never reported. */
  gpc: boolean;
}

interface NavigatorHints {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  globalPrivacyControl?: boolean;
  connection?: { saveData?: boolean; effectiveType?: string };
}

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function readHints(scope: Scope): Hints {
  const nav = safe(() => scope.navigator) as NavigatorHints | undefined;
  const conn = safe(() => nav && nav.connection);
  const cores = safe(() => nav && nav.hardwareConcurrency);
  const memoryGb = safe(() => nav && nav.deviceMemory);
  const effectiveType = safe(() => conn && conn.effectiveType);
  return {
    cores: typeof cores === "number" && cores > 0 ? cores : undefined,
    memoryGb: typeof memoryGb === "number" && memoryGb > 0 ? memoryGb : undefined,
    saveData: safe(() => conn && conn.saveData) === true,
    slowNetwork: effectiveType === "2g" || effectiveType === "slow-2g",
    reducedMotion: safe(() => scope.matchMedia && scope.matchMedia(REDUCED_MOTION_QUERY).matches) === true,
    gpc: safe(() => nav && nav.globalPrivacyControl) === true,
  };
}
