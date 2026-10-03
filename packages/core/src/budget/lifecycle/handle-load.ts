import { safe } from "../../platform/scope/safe";
import { PANEL_PARAM } from "../budget.constants";
import type { Budget } from "../budget.types";
import type { BudgetState } from "../budget-state.types";
import { startGovernor } from "../governor/start-governor";
import { startSharing } from "../sharing/start-sharing";
import { runWarmBenchmark } from "./warm-benchmark";

/** The diagnostics panel is a separate chunk, loaded only when the URL asks for it. */
function mountPanelOnRequest(state: BudgetState, budget: Budget): void {
  const search = safe(() => state.scope?.location?.search) ?? "";
  if (state.config.panel === false || !PANEL_PARAM.test(search)) return;
  void import("../../panel/index").then((panel) => panel.mountPanel(budget)).catch(() => null);
}

/** Work that waits for load so it does not compete with the page: governor, warm benchmark, sharing, panel. */
export function handleLoad(state: BudgetState, budget: Budget): void {
  const { scope, context } = state;
  if (!scope || !context || state.isLoaded) return;
  state.isLoaded = true;
  startGovernor(state, scope);
  void runWarmBenchmark(state, scope, context).then(() => {
    startSharing(state);
  });
  mountPanelOnRequest(state, budget);
}
