import { defaultCalibration } from "../core/calibration/default-calibration";
import { mergeCalibration } from "../core/calibration/merge-calibration";
import type { Decision } from "../core/decision/decision.types";
import { Tier } from "../core/tier/tier.enum";
import type { BudgetSnapshot } from "./budget.types";
import type { BudgetState } from "./budget-state.types";
import { currentFps } from "./current-fps";

function decisionFields(decision: Decision | null): Pick<BudgetSnapshot, "tier" | "effects" | "score" | "off"> {
  return decision
    ? { tier: decision.tier, effects: [...decision.effects], score: decision.score, off: { ...decision.off } }
    : { tier: Tier.Lite, effects: [], score: null, off: {} };
}

function deviceFields(
  state: BudgetState,
): Pick<BudgetSnapshot, "rawScore" | "source" | "simulated" | "hints" | "forced" | "calibration"> {
  const { context } = state;
  if (!context) {
    const calibration = mergeCalibration(defaultCalibration, ...state.patches);
    return { rawScore: state.score, source: state.source, simulated: null, hints: null, forced: null, calibration };
  }
  return {
    rawScore: context.simulated ?? state.score,
    source: context.simulated === null ? state.source : "simulated",
    simulated: context.simulated,
    hints: { ...context.hints },
    forced: context.forced,
    calibration: context.calibration,
  };
}

/** A copy of the current state; callers may keep or change it. */
export function buildSnapshot(state: BudgetState): BudgetSnapshot {
  const decided = decisionFields(state.decision);
  const device = deviceFields(state);
  return {
    tier: decided.tier,
    effects: decided.effects,
    score: decided.score,
    rawScore: device.rawScore,
    source: device.source,
    simulated: device.simulated,
    cold: state.cold,
    warm: state.warm,
    hints: device.hints,
    pressure: state.pressure,
    forced: device.forced,
    off: decided.off,
    stepped: [...state.stepped],
    learned: [...state.learned],
    fps: currentFps(state),
    calibration: device.calibration,
  };
}
