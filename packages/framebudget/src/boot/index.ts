import { BOOT_OPTIONS_PLACEHOLDER } from "./boot.constants";
import type { BootOptions } from "./boot.types";
import { BOOT_SOURCE } from "./source.generated";

export type { BootOptions } from "./boot.types";

/**
 * The boot script with your options inlined, ready for an inline
 * `<script>` in `<head>`. Escaped so the options cannot close the tag.
 */
export function createBootScript(options: BootOptions = {}): string {
  const json = JSON.stringify(options)
    .replace(/</g, String.raw`\u003c`)
    .replace(/\u{2028}/gu, String.raw`\u2028`)
    .replace(/\u{2029}/gu, String.raw`\u2029`);
  // A function replacer, so `$` sequences in the options are not read as replacement patterns.
  return BOOT_SOURCE.replace(BOOT_OPTIONS_PLACEHOLDER, () => json);
}

/** The boot script with default options. */
export const bootScript: string = /* #__PURE__ */ createBootScript();
