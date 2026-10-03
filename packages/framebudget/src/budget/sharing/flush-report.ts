import { buildReport } from "../../core/telemetry/build-report";
import { isSharingAllowed } from "../../core/telemetry/is-sharing-allowed";
import { readHints } from "../../platform/hints/read-hints";
import { sendReport } from "../../platform/telemetry/send-report";
import type { BudgetState } from "../budget-state.types";
import { currentFps } from "../decision/current-fps";

/** Sends the one report of this page view, unless it was sent, sharing is off, or the device is not real. */
export function flushReport(state: BudgetState): void {
  const { scope, context, decision } = state;
  if (!scope || !context || !decision || state.wasReported || state.score === null) return;
  const hints = readHints(scope); // GPC or Save-Data may have changed since load.
  const share = state.config.share ?? undefined;
  if (!isSharingAllowed(share, hints) || context.forced || context.simulated !== null) return;
  const report = buildReport({
    calibration: context.calibration,
    score: decision.score,
    cold: state.cold,
    warm: state.warm,
    hints,
    pressure: state.pressure,
    tier: decision.tier,
    effects: decision.effects,
    stepped: state.stepped,
    fps: currentFps(state),
  });
  state.wasReported = sendReport(scope, share, report);
}
