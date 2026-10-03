import type { BudgetSnapshot } from "../../budget/budget.types";
import type { KernelName } from "../../core/calibration/calibration.types";
import { formatNumber } from "../format-number";
import type { PanelRow } from "../panel.types";
import { renderSection } from "./render-section";

function kernelRow(name: string, rate: number | undefined, reference: number): PanelRow {
  const percent = rate === undefined ? undefined : (rate / reference) * 100;
  return [name, `${formatNumber(rate)} / ${formatNumber(reference)} = ${formatNumber(percent)}`];
}

/** Rates of the latest benchmark, warm when there is one, against the reference they are scored by. */
export function renderKernelSection(body: HTMLElement, snapshot: BudgetSnapshot): void {
  const bench = snapshot.warm ?? snapshot.cold;
  if (bench === null) return;
  const isWarm = snapshot.warm !== null;
  const references = isWarm ? snapshot.calibration.reference : snapshot.calibration.coldReference;
  const rows = Object.entries(bench.rates).map(([name, rate]) => kernelRow(name, rate, references[name as KernelName]));
  renderSection(body, `Kernels, ${isWarm ? "warm" : "cold"} (rate / reference)`, rows);
}
