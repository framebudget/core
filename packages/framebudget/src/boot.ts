import { BOOT_SOURCE } from "./boot/source.generated";
import type { CalibrationPatch } from "./calibration";

export interface BootOptions {
  /** Same patch you pass to `configure({ calibration })`, so boot and core agree. */
  calibration?: CalibrationPatch;
  /** Cold benchmark slice budget in ms. Default 1.6 (about 2 ms for the whole boot script). */
  coldMs?: number;
}

const PLACEHOLDER = "__FRAMEBUDGET_OPTIONS__";

/**
 * The boot script with your options inlined, ready for an inline
 * `<script>` in `<head>`. Escaped so the options cannot close the tag.
 */
export function createBootScript(options: BootOptions = {}): string {
  const json = JSON.stringify(options)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return BOOT_SOURCE.replace(PLACEHOLDER, () => json);
}

/** The boot script with default options. */
export const bootScript: string = /* #__PURE__ */ createBootScript();
