import type { Tier } from "../core/tier/tier.enum";
import type { ColorPair } from "./panel.types";

export const PANEL_COLORS = {
  background: "#0f1225",
  surface: "#161a2e",
  line: "#2a3052",
  text: "#e8ebf2",
  muted: "#9aa3bc",
  accent: "#ff5a92",
};

export const TIER_COLORS: Record<Tier, ColorPair> = {
  Full: ["#5fd6a2", "#133a30"],
  High: ["#8db4ff", "#1b2d57"],
  Medium: ["#f5c35b", "#3a2f1c"],
  Lite: ["#b4bbcf", "#272c4a"],
};

export const PANEL_ROOT_STYLE =
  `position:fixed;right:12px;bottom:12px;z-index:2147483647;width:300px;max-height:80vh;overflow:auto;padding:12px;` +
  `border-radius:12px;border:1px solid ${PANEL_COLORS.line};background:${PANEL_COLORS.background};color:${PANEL_COLORS.text};` +
  `font:11px/1.5 "Martian Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;box-shadow:inset 0 1px 0 rgb(232 235 242 / .05)`;

export const REFRESH_INTERVAL_MS = 1000;
