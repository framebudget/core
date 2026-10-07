import { buildReport } from "../../core/telemetry/build-report";
import { allowedShare } from "../../core/telemetry/allowed-share";
import { readHints } from "../../platform/hints/read-hints";
import { sendReport } from "../../platform/telemetry/send-report";
import type { StartContext } from "../../startup/startup.types";
import type { BudgetState } from "../budget-state.types";
import { currentFps } from "../decision/current-fps";
import { persistState } from "../decision/persist-state";

/** Records the beacon outcome; a queued report starts the interval, kept with its calibration for later visits. */
function recordReport(state: BudgetState, context: StartContext, wasQueued: boolean): void {
  state.wasReported = wasQueued;
  if (!wasQueued) return;
  context.stored = { ...context.stored, reportedAt: Date.now(), reportedCal: context.calibration.version };
  persistState(state);
}

/** Sends the one report of this page view, unless it was sent, sharing is off, or the device is not real. */
export function flushReport(state: BudgetState): void {
  const { scope, context, decision } = state;
  if (!scope || !context || !decision || state.wasReported || state.score === null) return;
  const hints = readHints(scope); // GPC or Save-Data may have changed since load.
  const share = allowedShare(state.config.share, hints);
  if (!share || context.forced || context.simulated !== null) return;
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
  recordReport(state, context, sendReport(scope, share, report));
}
