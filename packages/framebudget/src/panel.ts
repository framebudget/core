import type { Budget, BudgetSnapshot } from "./budget";
import type { KernelName } from "./calibration";
import { TIERS, type Tier } from "./tiers";

const COLORS = {
  bg: "#0f1225",
  surface: "#161a2e",
  line: "#2a3052",
  text: "#e8ebf2",
  muted: "#9aa3bc",
  accent: "#ff5a92",
};

const TIER_COLORS: Record<Tier, [string, string]> = {
  Full: ["#5fd6a2", "#133a30"],
  High: ["#8db4ff", "#1b2d57"],
  Medium: ["#f5c35b", "#3a2f1c"],
  Lite: ["#b4bbcf", "#272c4a"],
};

function el(tag: string, style: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.setAttribute("style", style);
  if (text !== undefined) node.textContent = text;
  return node;
}

const fmt = (n: number | null | undefined, digits = 0): string =>
  typeof n === "number" && isFinite(n) ? n.toFixed(digits) : "n/a";

function section(parent: HTMLElement, title: string, rows: [string, string][]): void {
  parent.appendChild(el("div", `margin:10px 0 4px;color:${COLORS.muted};text-transform:uppercase;letter-spacing:.08em`, title));
  for (const [label, value] of rows) {
    const row = el("div", "display:flex;justify-content:space-between;gap:12px");
    row.appendChild(el("span", `color:${COLORS.muted}`, label));
    row.appendChild(el("span", "text-align:right", value));
    parent.appendChild(row);
  }
}

function render(body: HTMLElement, s: BudgetSnapshot, b: Budget): void {
  body.textContent = "";
  const [fg, bg] = TIER_COLORS[s.tier];
  const head = el("div", "display:flex;align-items:center;gap:8px;margin-bottom:6px");
  head.appendChild(el("span", `padding:2px 8px;border-radius:999px;color:${fg};background:${bg}`, s.tier));
  head.appendChild(el("span", "", `score ${fmt(s.score)}` + (s.forced ? " (forced)" : "")));
  body.appendChild(head);

  section(body, "Score", [
    ["source", s.source || "n/a"],
    ["before caps", fmt(s.rawScore)],
    ["cold", fmt(s.cold && s.cold.score)],
    ["warm", fmt(s.warm && s.warm.score)],
    ["clock tick ms", fmt((s.warm || s.cold) && (s.warm || s.cold)!.tickMs, 3)],
  ]);

  const bench = s.warm || s.cold;
  if (bench) {
    const reference = s.warm ? s.calibration.reference : s.calibration.coldReference;
    section(
      body,
      `Kernels, ${s.warm ? "warm" : "cold"} (rate / reference)`,
      (Object.keys(bench.rates) as KernelName[]).map((k) => {
        const rate = bench.rates[k]!;
        return [k, `${fmt(rate)} / ${fmt(reference[k])} = ${fmt((rate / reference[k]) * 100)}`];
      }),
    );
  }

  const h = s.hints;
  section(body, "Hints", [
    ["cores", fmt(h && h.cores)],
    ["memory GB", fmt(h && h.memoryGb, 2)],
    ["save-data", String(!!h && h.saveData)],
    ["2g", String(!!h && h.slowNetwork)],
    ["reduced motion", String(!!h && h.reducedMotion)],
    ["pressure", s.pressure || "n/a"],
  ]);

  section(
    body,
    "Effects (threshold, cost)",
    Object.keys(s.calibration.effects).map((name) => {
      const def = s.calibration.effects[name]!;
      return [`${name} (${def.threshold}, ${def.cost})`, s.effects.includes(name) ? "on" : `off: ${s.off[name] || "unknown"}`];
    }),
  );

  const fps = Object.keys(s.fps);
  if (fps.length) section(body, "Frames per second", fps.map((k) => [k, fmt(s.fps[k])]));

  const buttons = el("div", "display:flex;flex-wrap:wrap;gap:6px;margin-top:10px");
  for (const t of [...TIERS, "auto" as const]) {
    const active = t === "auto" ? !s.forced : s.forced === t;
    const button = el(
      "button",
      `font:inherit;cursor:pointer;padding:3px 8px;border-radius:6px;border:1px solid ${active ? COLORS.accent : COLORS.line};background:${COLORS.surface};color:${COLORS.text}`,
      t,
    );
    button.addEventListener("click", () => b.force(t));
    buttons.appendChild(button);
  }
  body.appendChild(buttons);
}

/**
 * Mounts the diagnostics overlay. The core loads this module on demand when
 * the URL has `?framebudget`. Returns a function that removes it.
 */
export function mountPanel(b: Budget): () => void {
  const root = el(
    "aside",
    `position:fixed;right:12px;bottom:12px;z-index:2147483647;width:300px;max-height:80vh;overflow:auto;padding:12px;` +
      `border-radius:12px;border:1px solid ${COLORS.line};background:${COLORS.bg};color:${COLORS.text};` +
      `font:11px/1.5 "Martian Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;box-shadow:inset 0 1px 0 rgb(232 235 242 / .05)`,
  );
  root.setAttribute("aria-label", "framebudget diagnostics");
  const bar = el("div", "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px");
  bar.appendChild(el("strong", `color:${COLORS.accent}`, "framebudget"));
  const close = el("button", `font:inherit;cursor:pointer;background:none;border:0;color:${COLORS.muted}`, "close");
  bar.appendChild(close);
  const body = el("div", "");
  root.appendChild(bar);
  root.appendChild(body);
  document.body.appendChild(root);

  const update = (): void => render(body, b.snapshot(), b);
  update();
  const off = b.on("change", update);
  const timer = setInterval(update, 1000);
  const unmount = (): void => {
    off();
    clearInterval(timer);
    root.remove();
  };
  close.addEventListener("click", unmount);
  return unmount;
}
