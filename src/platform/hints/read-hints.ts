import type { Hints } from "../../core/device/device.types";
import { safe } from "../scope/safe";
import type { Scope } from "../scope/scope.types";
import { REDUCED_MOTION_QUERY } from "./hints.constants";
import type { NavigatorHints } from "./hints.types";

const toPositiveNumber = (value: unknown): number | undefined =>
  typeof value === "number" && value > 0 ? value : undefined;

export function readHints(scope: Scope): Hints {
  const navigatorHints = safe(() => scope.navigator) as NavigatorHints | undefined;
  const connection = safe(() => navigatorHints?.connection);
  const effectiveType = safe(() => connection?.effectiveType);
  return {
    cores: toPositiveNumber(safe(() => navigatorHints?.hardwareConcurrency)),
    memoryGb: toPositiveNumber(safe(() => navigatorHints?.deviceMemory)),
    saveData: safe(() => connection?.saveData) === true,
    slowNetwork: effectiveType === "2g" || effectiveType === "slow-2g",
    reducedMotion: safe(() => scope.matchMedia?.(REDUCED_MOTION_QUERY).matches) === true,
    gpc: safe(() => navigatorHints?.globalPrivacyControl) === true,
  };
}
