import type { Hints } from "../device/device.types";
import type { ShareOptions } from "./telemetry.types";

/** Sharing needs an endpoint and is never done under Global Privacy Control or Save-Data. */
export function isSharingAllowed(share: ShareOptions | undefined, hints: Hints): share is ShareOptions {
  return !!share && typeof share.endpoint === "string" && share.endpoint !== "" && !hints.gpc && !hints.saveData;
}
