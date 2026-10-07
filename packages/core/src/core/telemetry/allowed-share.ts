import type { Hints } from "../device/device.types";
import type { ShareSetting, ShareOptions } from "./telemetry.types";

/**
 * The sharing options in effect, or null when the site left sharing off or the
 * browser asks for no sharing: Global Privacy Control or Save-Data. `true` means
 * sharing with every default.
 */
export function allowedShare(share: ShareSetting | undefined, hints: Hints): ShareOptions | null {
  if (!share || hints.gpc || hints.saveData) return null;
  return share === true ? {} : share;
}
