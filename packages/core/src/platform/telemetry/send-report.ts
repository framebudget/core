import { SHARE_REPORT_URL } from "../../core/telemetry/telemetry.constants";
import type { ShareOptions, TelemetryReport } from "../../core/telemetry/telemetry.types";
import { safe } from "../scope/safe";
import type { Scope } from "../scope/scope.types";

/** framebudget.dev always, then the site's own endpoint when it set one. */
function destinations(share: ShareOptions): string[] {
  const extra = share.alsoSendTo;
  return typeof extra === "string" && extra !== "" && extra !== SHARE_REPORT_URL
    ? [SHARE_REPORT_URL, extra]
    : [SHARE_REPORT_URL];
}

/** Sends the report with one sendBeacon per destination. Returns whether the browser queued any of them. */
export function sendReport(scope: Scope, share: ShareOptions, report: TelemetryReport): boolean {
  const navigator = safe(() => scope.navigator);
  if (typeof navigator?.sendBeacon !== "function") return false;
  const body = JSON.stringify(report);
  const queued = destinations(share).map((url) => safe(() => navigator.sendBeacon(url, body)) === true);
  return queued.includes(true);
}
