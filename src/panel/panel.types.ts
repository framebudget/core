import type { Tier } from "../core/tier/tier.enum";

/** A label and its value, one line of a panel section. */
export type PanelRow = readonly [label: string, value: string];

export type ColorPair = readonly [foreground: string, background: string];

/** What a force button sets: a tier, or `auto` to measure again. */
export type ForceChoice = Tier | "auto";

export interface PanelFrame {
  root: HTMLElement;
  /** Re-rendered on every update. */
  body: HTMLElement;
  closeButton: HTMLElement;
}
