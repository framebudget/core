import { createElement, type ReactElement } from "react";
import { BudgetContext } from "./budget-context";
import type { BudgetProviderProperties } from "./react.types";

/** Only needed to use a budget other than the page's (tests, embedded widgets). */
export function BudgetProvider(props: BudgetProviderProperties): ReactElement {
  return createElement(BudgetContext.Provider, { value: props.budget }, props.children);
}
