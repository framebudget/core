import type { Scope } from "../../platform/scope/scope.types";
import { saveState } from "../../platform/storage/save-state";
import { refreshCalibration } from "../../platform/telemetry/refresh-calibration";
import type { StartContext } from "../../startup/startup.types";

/** Keeps the fetched calibration for the next visit; this page keeps its calibration. */
export function refreshRemoteCalibration(scope: Scope, context: StartContext, url: string): void {
  const { storage } = context;
  if (!storage) return;
  refreshCalibration(scope, {
    url,
    lastFetchedAt: context.stored.remoteAt,
    nowMs: Date.now(),
    onPatch: (patch, fetchedAt) => {
      context.stored = { ...context.stored, remote: patch, remoteAt: fetchedAt };
      saveState(storage, context.stored);
    },
  });
}
