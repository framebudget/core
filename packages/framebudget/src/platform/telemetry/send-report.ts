import type { ShareOptions, TelemetryReport } from "../../core/telemetry/telemetry.types";
import { safe } from "../scope/safe";
import type { Scope } from "../scope/scope.types";

/** Sends the report with sendBeacon. Returns whether the browser queued it. */
export function sendReport(scope: Scope, share: ShareOptions, report: TelemetryReport): boolean {
  const navigator = safe(() => scope.navigator);
  return (
    typeof navigator?.sendBeacon === "function" &&
    safe(() => navigator.sendBeacon(share.endpoint, JSON.stringify(report))) === true
  );
}
