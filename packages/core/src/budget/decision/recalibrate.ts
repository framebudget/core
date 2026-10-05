import { defaultCalibration } from "../../core/calibration/default-calibration";
import { mergeCalibration } from "../../core/calibration/merge/merge-calibration";
import { learnedBlocks } from "../../core/learning/learned-blocks";
import type { BudgetState } from "../budget-state.types";

/** Calibration precedence: built-in numbers, the site's defaults, the fetched calibration, the site's patches. */
export function recalibrate(state: BudgetState): void {
  const { context } = state;
  if (!context) return;
  context.calibration = mergeCalibration(defaultCalibration, ...state.defaults, state.remote, ...state.patches);
  state.learned = learnedBlocks(context.stored, context.calibration);
}
