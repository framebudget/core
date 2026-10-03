import { safe } from "../scope/safe";
import type { Scope } from "../scope/scope.types";
import type { CalibrationRequest } from "./calibration-request.types";

const DAY_MS = 86_400_000;

const isFetchedToday = (request: CalibrationRequest): boolean =>
  request.lastFetchedAt !== undefined && request.nowMs - request.lastFetchedAt < DAY_MS;

async function requestPatch(fetchPatch: typeof fetch, request: CalibrationRequest): Promise<void> {
  try {
    const response = await fetchPatch(request.url, { credentials: "omit" });
    const body: unknown = response.ok ? await response.json() : null;
    if (body && typeof body === "object") request.onPatch(body, request.nowMs);
  } catch {
    // Offline, blocked or malformed: the stored calibration stays as it is.
  }
}

/**
 * Fetches the calibration patch at most once a day and hands it to the caller
 * for the next visit. Never awaited by anything on the page; failures are ignored.
 */
export function refreshCalibration(scope: Scope, request: CalibrationRequest): void {
  const fetchPatch = safe(() => scope.fetch);
  if (!fetchPatch || isFetchedToday(request)) return;
  void requestPatch(fetchPatch, request);
}
