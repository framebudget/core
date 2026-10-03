---
version: alpha
name: framebudget Deadline Dark (video / frame layer)
description: >
  Frame-scale design system for the framebudget launch video, 1920x1080 at 30 fps. Built from the
  broadside preset's structure (flat dark plane, one dominant type moment per frame, mono chrome,
  1px hairlines) and re-cast on the framebudget "Deadline" dark brand: Night ground, Chalk text,
  one pink vsync line as the only accent, and the effect colors that spend frame time.
unit: the frame, 1920x1080
principle: atoms are sacred, composition is free, numbers come from the brief

colors:
  canvas: "#0F1225"        # Night. Page ground of every frame.
  deep: "#0B0E1E"          # Deep. Sunken: chart tracks, code background, terminal.
  ink: "#161A2E"           # Ink. Panels, cards, the mark tile.
  ink-raised: "#1F2440"    # Ink raised. Controls, selected rows, chips.
  line: "#2A3052"          # Hairlines, grid, axis.
  line-strong: "#5F6896"   # Control borders, emphasized hairline.
  text: "#E8EBF2"          # Chalk. Primary text.
  muted: "#9AA3BC"         # Mist. Secondary text, labels.
  vsync: "#FF5A92"         # The 16.7 ms deadline line. The ONLY accent. Once per view.
  on-vsync: "#0F1225"      # Text on a vsync fill (rare; never a button).
  glow: "#1A1F3D"          # Page glow color, radial over Night.
  effect-app: "#7D86A6"        # Pewter. The site's own work, not an effect.
  effect-parallax: "#F2B21B"   # Amber
  effect-transition: "#9474F2" # Violet. Page transitions.
  effect-canvas: "#2FB67C"     # Mint. Canvas animations.
  effect-sound: "#1FA6CA"      # Cyan
  effect-blur: "#6482F5"       # Blue
  effect-label: "#0F1225"      # Labels written ON an effect fill.
  tier-full: "#5FD6A2"
  tier-full-bg: "#133A30"
  tier-high: "#8DB4FF"
  tier-high-bg: "#1B2D57"
  tier-medium: "#F5C35B"
  tier-medium-bg: "#3A2F1C"
  tier-lite: "#B4BBCF"
  tier-lite-bg: "#272C4A"
  code-keyword: "#C4B1FF"
  code-string: "#86E3B9"
  code-function: "#F7CD63"
  code-number: "#FF8FB6"
  code-comment: "#9AA3BC"
  code-text: "#E8EBF2"

typography:
  # Reading ramp. cqw = px / 1920 * 100.
  label:   { fontFamily: "Martian Mono", cqw: 0.94, weight: 500, tracking: "0.12em", upper: true }
  caption: { fontFamily: "Archivo", cqw: 1.25, weight: 450, lineHeight: 1.4 }
  body:    { fontFamily: "Archivo", cqw: 1.46, weight: 450, lineHeight: 1.45 }
  lead:    { fontFamily: "Archivo", cqw: 1.9, weight: 450, lineHeight: 1.35 }
  value:   { fontFamily: "Martian Mono", cqw: 1.25, weight: 500, tabular: true }
  code:    { fontFamily: "Martian Mono", cqw: 1.6, weight: 400, lineHeight: 1.6 }
  # Display ramp. Archivo at wdth 112-116, weight 700-780, negative tracking.
  h3:      { fontFamily: "Archivo", cqw: 2.7, weight: 700, stretch: "112%", lineHeight: 1.12, tracking: "-0.02em" }
  h2:      { fontFamily: "Archivo", cqw: 3.9, weight: 760, stretch: "114%", lineHeight: 1.05, tracking: "-0.03em" }
  h1:      { fontFamily: "Archivo", cqw: 5.4, weight: 780, stretch: "116%", lineHeight: 1.0, tracking: "-0.035em" }
  stat:    { fontFamily: "Martian Mono", cqw: 6.2, weight: 600, lineHeight: 1.0, tracking: "-0.02em", tabular: true }

spacing:
  pad-x: "6.25cqw"   # 120px
  pad-y: "5.5cqw"    # ~106px
  gap-lg: "3.3cqw"
  gap-md: "1.7cqw"
  gap-sm: "0.8cqw"

radius:
  segment: "2px"     # frame-time segments, bars
  control: "6px"     # chips, toggles, pills
  panel: "12px"      # cards, phone screen, code panel
  tile: "25%"        # the mark tile

components:
  ground:
    background: "{colors.canvas} + radial-gradient(120% 60% at 50% -10%, {colors.glow}, transparent 60%)"
    description: "Every frame paints this ground on its own full-bleed clip layer. Flat otherwise."
  chrome:
    kicker: "{typography.label} in {colors.muted}, top-left at pad-x / pad-y"
    step: "{typography.label} in {colors.muted}, top-right at pad-x / pad-y, e.g. 03 / 06"
    description: "Mono uppercase eyebrow. Present on every 'how it works' frame at identical positions."
  vsync-line:
    stroke: "3px solid {colors.vsync}"
    label: "{typography.value} '16.7 ms' in {colors.vsync}, set beside the line"
    description: "The deadline. A frame-time bar that crosses it is a dropped frame. The only pink in a view."
  frame-bar:
    fill: "an effect color or {colors.effect-app}; radius {radius.segment}"
    track: "{colors.deep} with 1px {colors.line} border"
    description: "Stacked segments of one frame's work. Segments are flush, 2px gaps."
  effect-chip:
    shape: "{radius.control} pill, {colors.ink-raised} background, 1px {colors.line} border"
    swatch: "10px square in the effect color, radius 2px"
    label: "{typography.value} lowercase effect id, {colors.text}; off state: {colors.muted} text, swatch outline only, strike line"
  panel:
    background: "{colors.ink}; border 1px {colors.line}; radius {radius.panel}"
  code-panel:
    background: "{colors.deep}; border 1px {colors.line}; radius {radius.panel}"
    typography: "{typography.code} with the code-* colors"
  tier-chip:
    description: "Full / High / Medium / Lite pills, fg on bg pairs from tier-*"
---

# framebudget Deadline Dark (frame layer)

## Overview

A launch film for an engineering library. It should read like an instrument panel built by a type
designer: a calm Night ground, big confident Archivo headlines, small mono measurements, and one
pink line that never moves: the 16.7 ms deadline. Color carries meaning. The effect colors only
ever appear as **work that spends frame time** (segments, swatches, the bars of the mark). The pink
vsync line is the only accent and appears at most once per view.

## The Frame

- 1920x1080. Author type in `cqw` against a `container-type: size` ground.
- Safe area: pad-x 120px, pad-y ~106px. Nothing load-bearing in the bottom 8% edge.
- One dominant type moment per frame (h1 or h2). Diagrams sit beside or under it, never competing.
- No captions in this video (silent). The bottom band is still kept calm.

## Colors

Ground `{colors.canvas}` with the soft top glow. Panels `{colors.ink}`; sunken tracks and code
`{colors.deep}`; hairlines `{colors.line}`. Text `{colors.text}`, secondary `{colors.muted}`.

Effect fills keep their identity across the whole film:

| effect | id in code | color |
| --- | --- | --- |
| app work (the site itself) | - | `{colors.effect-app}` |
| parallax | `parallax` | `{colors.effect-parallax}` |
| page transition | `pageTransition` | `{colors.effect-transition}` |
| canvas animation | `canvasHiRes` (also `canvasLowRes`) | `{colors.effect-canvas}` |
| sound | `sound` | `{colors.effect-sound}` |
| blur | `blur` | `{colors.effect-blur}` |

## Typography

- **Archivo** (variable, wght 400-800, wdth 100-125) carries headlines and copy. Headlines use
  `font-stretch` 112-116% and weight 700-780 with negative tracking. Sentence case. Never uppercase
  display. Product name always lowercase: framebudget.
- **Martian Mono** (variable, wght 400-700) carries measured values (ms, fps, scores), labels, and
  code only. Labels uppercase tracked 0.12em. Values use tabular numbers.
- Legibility floor for load-bearing text: 1.4cqw (27px). Mono labels are chrome and may sit at 0.94cqw (18px).

## Depth and Surface

Flat. No drop shadows, no gradients on surfaces (the single top glow on the ground is the
exception). Hierarchy from size, weight, the Chalk/Mist ladder, and 1px hairlines. Radii follow
hierarchy: the smaller the thing, the sharper it is (segment 2px, control 6px, panel 12px).

## Composition Rules

### Do

- Let the vsync line be the hero of any chart: it is fixed, everything else moves relative to it.
- Show effects as stacked segments of one frame bar; on/off states as chips.
- Keep numbers honest: 16.7 ms, 60 Hz, "100 = reference phone" come from the product. Any other
  figure is labelled as an example.
- Lean left on statement frames; diagrams on the right or below.

### Don't

- No second accent color; never use pink for anything but the deadline.
- No stock "AI" gradients, bokeh, neon glows, glassmorphism.
- No em-dashes or en-dashes in any on-screen text.
- No uppercase headlines, no italic, no underline.

## Font loading

The brand fonts ship as local files in `assets/fonts/`. Paste this `<style>` into every frame's
`<template>`:

```html
<style>
@font-face{font-family:"Archivo";font-weight:400 800;font-stretch:100% 125%;font-style:normal;font-display:block;src:url("assets/fonts/archivo-var.woff2") format("woff2");}
@font-face{font-family:"Martian Mono";font-weight:400 700;font-style:normal;font-display:block;src:url("assets/fonts/martian-mono-var.woff2") format("woff2");}
</style>
```
