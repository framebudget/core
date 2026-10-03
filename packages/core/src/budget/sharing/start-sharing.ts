import type { ShareOptions } from "../../core/telemetry/telemetry.types";
import { isReportDue } from "../../core/telemetry/is-report-due";
import { isSharingAllowed } from "../../core/telemetry/is-sharing-allowed";
import { safe } from "../../platform/scope/safe";
import type { Scope } from "../../platform/scope/scope.types";
import { DEFAULT_SAMPLE_RATE } from "../budget.constants";
import type { BudgetState } from "../budget-state.types";
import { flushReport } from "./flush-report";
import { refreshRemoteCalibration } from "./refresh-remote-calibration";

/** The report goes out when the page is left or hidden, the last moment its numbers are known. */
function armReportFlush(state: BudgetState, scope: Scope): void {
  const flush = (): void => {
    flushReport(state);
  };
  safe(() => {
    scope.addEventListener?.("pagehide", flush);
  });
  safe(() => {
    scope.document?.addEventListener("visibilitychange", () => {
      if (scope.document?.visibilityState === "hidden") flush();
    });
  });
}

function isSampled(state: BudgetState, share: ShareOptions): boolean {
  const rate = typeof share.sampleRate === "number" ? share.sampleRate : DEFAULT_SAMPLE_RATE;
  const random = state.init.random ?? Math.random;
  return random() < rate;
}

/** Starts opt-in sharing after load: refreshes the calibration and arms the report for sampled page views. */
export function startSharing(state: BudgetState): void {
  const { scope, context } = state;
  if (!scope || !context || !state.isLoaded) return;
  const share = state.config.share ?? undefined;
  if (!isSharingAllowed(share, context.hints)) return;
  if (share.calibrationUrl) refreshRemoteCalibration(scope, context, share.calibrationUrl);
  if (state.isSharingArmed) return;
  state.isSharingArmed = true;
  if (!isReportDue(share, context.stored, context.calibration.version, Date.now())) return;
  if (isSampled(state, share)) armReportFlush(state, scope);
}
