---
format: 1920x1080
fps: 30
duration: 57s
message: "Keep the effects. Lose the stutter."
arc: Problem > Idea > Product > How it works (6 beats) > Code > End card
audience: front-end and creative web developers who ship animated sites
mode: autonomous
music: none
---

# framebudget launch video

This video tells front-end developers who ship animated sites that framebudget lets them keep the
effects and lose the stutter. Silent: the on-screen text carries the story, so every frame states
its point in one headline plus at most one supporting line, and every diagram reveals on the beat
the text names it.

## Video direction

- **Palette system (from `frame.md`, never invented).** Ground: `canvas` Night with the top glow,
  painted by each frame on its own full-bleed clip layer. Panels `ink`, sunken tracks and code
  `deep`, hairlines `line`. Text `text` (Chalk), secondary `muted` (Mist). The **only accent** is
  `vsync` pink and it is reserved for the 16.7 ms deadline line (and its "16.7 ms" value label).
  Effect colors are data, not decoration: app work `effect-app`, parallax `effect-parallax`, page
  transition `effect-transition`, canvas `effect-canvas`, sound `effect-sound`, blur
  `effect-blur`. Labels written on an effect fill use `effect-label`. Tier chips use the tier-*
  fg/bg pairs.
- **Type by role.** Headlines `h1`/`h2` (Archivo, wide stretch, heavy, negative tracking, sentence
  case). Supporting line `lead` in `muted`. Measurements, labels, chips and code in Martian Mono
  (`label`, `value`, `stat`, `code`). The product name is always lowercase: framebudget.
- **Shared chrome for the six "how it works" frames (Frames 4 to 9), identical in every one of
  them:** top-left kicker `HOW IT WORKS` and top-right step counter `01 / 06` ... `06 / 06`, both
  `label` in `muted`, at x = pad-x (120px) / right edge 120px, y = 96px baseline-top, opacity 1, no
  motion (they are present at t=0 and never move). Headline block left column x = 120px, top
  y = 210px, width 720px; supporting line under it; diagram in the right column x = 940px to
  1800px, vertically centered on y = 560px. The step counter is the only element that changes.
- **Motion grammar.** Smooth long-tail settles (`power3.out` default, `expo.out` on fast
  arrivals); no bounce, no overshoot, no `back`/`elastic`. Entrances via `fromTo`. Reveals are
  paced to the on-screen text: at t=0 only the headline's first words enter; each diagram piece
  reveals when the text has named it, spreading reveals across the back half of the frame. Frame
  durations are counted generously for reading: a held read is fine.
- **Rhythm.** Frames 1, 2, 7 carry the most motion (the stutter, the budget overflow, the governor).
  Frame 3 (the name and tagline) and Frame 11 (end card) are deliberate held, calm beats. Frames 4
  to 9 are brisk, one diagram each, then hold.
- **Stutter is the only intentional jank.** In Frame 1 the phone mockup's animation advances in
  uneven held steps (deterministic, index-derived). Everywhere else motion is smooth: framebudget's
  own world never drops a frame.
- **Negative list.** No second accent color, no pink outside the deadline, no gradients on
  surfaces, no shadows, no glassmorphism, no bokeh, no "AI" glows, no emoji, no icons standing in
  for real UI. No em-dashes or en-dashes in any on-screen text. No slideshow (everything dumped at
  t=0 then frozen) and no screensaver (many elements drifting independently). No lazy breathing, no
  slow back-half camera push. No `repeat: -1`, no `Math.random`, no CSS animations.
- **Assets.** Fonts from `assets/fonts/` via the `@font-face` block in `frame.md`. GSAP from the
  local file `assets/vendor/gsap.min.js` (never a CDN). Logos from `assets/`.

## Frame 1: The stutter

- scene: A beautiful animated site plays on a phone, then stutters as frame-time bars overshoot the pink 16.7 ms line
- voiceover: ""
- duration: 7s
- transition_in: cut
- status: animated
- src: compositions/frames/01-stutter.html
- type: hook
- persuasion: Pain validation
- beat: tension + frustration
- blueprint: dataviz-countup (Adapt)
- focal: a reconstructed phone mockup running a layered animated site
- roles: phone = cutout · frame-time chart = supporting · ground = background
- asset_candidates: none, typography and reconstructed UI only (no captured assets exist for this beat)
- sfx: none
- on_screen_text: "Your site looks beautiful." / "On a slow phone, it stutters." / kicker "FRAME TIME" / chart value "16.7 ms" / readout "60 fps" to "24 fps" with small label "example: slow phone"

narrativeRole: open on the pain every animation-heavy site has on cheap phones.
keyMessage: the effects that make a site beautiful are the ones that make it stutter.

Adapt: keep the dataviz signature (a chart is the hero of the argument and a number counts to land it), but the chart is a live frame-time strip with a fixed vsync line, and it shares the stage with the phone it measures.

Scene 1 (0.0-2.2s): layout asymmetric 40/60. Left: a phone mockup (panel radius, `ink` body, 1px `line` border, about 380x780) shows a reconstructed animated landing page: layered parallax hills/shapes in `effect-parallax` amber, `effect-transition` violet and `effect-canvas` mint tints, a headline placeholder (two Chalk bars), and a small orbit of dots like a canvas animation. Everything inside the phone moves smoothly. Right column: headline line 1 "Your site looks beautiful." enters per-word staggered reveal (`dynamic-content-sequencing`), `h1`.
Scene 2 (2.2-4.6s): line 2 "On a slow phone, it stutters." reveals under line 1 (`dynamic-content-sequencing`). At the same moment the phone's animation starts to hitch: it advances in uneven held steps (holds of 2 to 5 video frames, then jumps), derived deterministically from index. Under the headline, a frame-time strip draws in: kicker `FRAME TIME`, a `deep` track with a horizontal pink `vsync` line labelled "16.7 ms", and thin bars streaming in from the right one per beat (`stat-bars-and-fills`). The first bars sit under the line; then several overshoot it; overshooting bars stay their effect-mix color but the part above the line is drawn at full height and a small mono "dropped" tick appears above each.
Scene 3 (4.6-7.0s): a mono readout at the right of the strip counts down from "60 fps" to "24 fps" (`counting-dynamic-scale`, value shrinks rather than grows) with a small `label` "example: slow phone". Bars keep streaming, mostly over the line, phone keeps hitching. Last 0.8s holds the read.

## Frame 2: Every effect costs frame time

- scene: Effect segments fill one frame budget, overflow the 16.7 ms line, then the expensive ones drop out and it fits
- voiceover: ""
- duration: 6.5s
- transition_in: crossfade
- status: animated
- src: compositions/frames/02-cost.html
- type: product_intro
- persuasion: Show-don't-tell proof
- beat: clarity
- blueprint: compose
- focal: one wide frame-budget bar with the vsync line
- roles: budget bar = cutout · ground = background
- asset_candidates: none, typography and diagram only
- sfx: none
- on_screen_text: "Every effect costs frame time." / axis "0 ms" and "16.7 ms" / segment labels "app", "parallax", "pageTransition", "canvasHiRes", "sound", "blur" / overflow label "over budget" / "Spend it where the device can pay."

narrativeRole: the idea in one picture, so every later frame reads as a variation of it.
keyMessage: a frame is a budget; effects spend it; framebudget keeps the spend under the line.

Compose from `stat-bars-and-fills` and `dynamic-content-sequencing`.
Scene 1 (0.0-1.4s): headline "Every effect costs frame time." (`h1`) top-left at pad. Below, centered horizontally, a wide `deep` track (about 1500x96, segment radius) draws in from the left with mono axis labels "0 ms" at its left end; the pink `vsync` line stands vertically at 57% of the track width (17 of 30 units) with its label "16.7 ms" above it and small `label` "60 Hz" under it.
Scene 2 (1.4-4.0s): segments fill the track left to right, one per beat, each a flush block with 2px gaps and its id in `value` type written in `effect-label` inside (or under it when narrow): app (`effect-app`), parallax, pageTransition, canvasHiRes, sound, blur (`stat-bars-and-fills`). Segment widths are proportional to the library's own relative costs: app 7, parallax 5, pageTransition 3, canvasHiRes 8, sound 1, blur 6 (units, not ms; draw no numbers). The pink line sits at 17 units, so the running total crosses it during canvasHiRes; the segments that extend past the line keep their colors and a mono `label` "over budget" appears to the right of the track in `muted`.
Scene 3 (4.0-6.5s): the most expensive segments (canvasHiRes, then blur) drop out downward and fade into outlined "off" chips under the track (`ease-drop` feel, smooth, no bounce); the remaining segments slide left to close the gaps and the total settles under the pink line. "over budget" swaps to "fits" (`discrete-text-sequence`). The supporting line "Spend it where the device can pay." (`lead`, `muted`) reveals under the headline. Hold the last 1.2s.

## Frame 3: framebudget

- scene: The Deadline mark builds itself, the wordmark joins it, and the primary tagline lands
- voiceover: ""
- duration: 4s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/03-intro.html
- type: product_intro
- persuasion: Feature-to-benefit translation
- beat: relief + confidence
- blueprint: logo-assemble-lockup (Adapt)
- focal: assets/mark-on-dark.svg
- roles: mark-on-dark = cutout (rebuilt as inline SVG from its five rects so each bar can animate) · wordmark-dark = supporting
- asset_candidates: assets/mark-on-dark.svg - the Deadline mark without tile, amber, violet and mint bars stepping down to a pink vsync line; assets/wordmark-dark.svg - lowercase "framebudget" wordmark in light ink for dark grounds
- sfx: none
- on_screen_text: wordmark "framebudget" / "Keep the effects. Lose the stutter."

narrativeRole: name the product right after the idea, and land the value claim.
keyMessage: framebudget: keep the effects, lose the stutter.

Adapt: keep the built-from-parts signature (the mark comes to exist from its own pieces), resolved into a lockup plus the primary tagline.
Scene 1 (0.0-1.5s): cleared stage, centered. The pink vsync bar of the mark grows from its center vertically (`svg-path-draw` feel, scaleY), then the amber, violet and mint bars arrive one after another, each sliding in from the left onto its step, stepping down toward the line (smooth `power3` settle, no overshoot). The mark is large (about 220px tall), centered.
Scene 2 (1.5-2.5s): the mark eases left as the "framebudget" wordmark reveals to its right with a short left-to-right mask wipe; together they form the centered lockup (about 900px wide).
Scene 3 (2.5-4.0s): under the lockup the tagline "Keep the effects. Lose the stutter." (`h2`, Chalk) reveals per-word (`dynamic-content-sequencing`). Hold still.

## Frame 4: Decides before the first paint

- scene: A page-load timeline where a tiny boot script sets every effect before the first paint marker
- voiceover: ""
- duration: 4.5s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/04-first-paint.html
- type: feature_showcase
- persuasion: Friction reduction
- beat: control
- blueprint: compose
- focal: a horizontal page-load timeline
- roles: timeline = cutout · ground = background
- asset_candidates: none, typography and diagram only
- sfx: none
- on_screen_text: kicker "HOW IT WORKS" / step "01 / 06" / "Decides before the first paint." / "A tiny inline boot script runs first. No flash of animation that then freezes." / timeline labels "html", "boot script", "first paint", "load" / chips "parallax", "pageTransition", "canvasHiRes"

narrativeRole: first mechanism beat: the decision happens before anything is visible.
keyMessage: no flash of animation that then freezes.

Compose from `dynamic-content-sequencing`, `svg-path-draw`, `stat-bars-and-fills`. Shared chrome per Video direction (step "01 / 06").
Scene 1 (0.0-1.2s): headline "Decides before the first paint." (`h2`) reveals per-word in the left column. Right column: a horizontal timeline hairline draws left to right (`svg-path-draw`) with four mono tick labels revealing as the line passes them: "html", "boot script", "first paint", "load".
Scene 2 (1.2-3.0s): a small Chalk-outlined block sits on the timeline at "boot script" (narrow, it is tiny), and a playhead (thin Chalk vertical line) travels along the timeline. When it reaches the boot script block, three effect chips stack above it and resolve on/off at once (parallax on, pageTransition on, canvasHiRes off with strike) (`discrete-text-sequence`). Then the playhead reaches "first paint" and that tick brightens to Chalk.
Scene 3 (3.0-4.5s): supporting line "A tiny inline boot script runs first. No flash of animation that then freezes." (`lead`, `muted`) reveals under the headline. Hold.

## Frame 5: Measures what the device can do

- scene: Four benchmark kernels fill in short slices, then a score counts up cold, then warm
- voiceover: ""
- duration: 4.5s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/05-benchmark.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: curiosity + trust
- blueprint: dataviz-countup (Adapt)
- focal: a big mono score number
- roles: score = cutout · kernel meters = supporting · ground = background
- asset_candidates: none, typography and diagram only
- sfx: none
- on_screen_text: kicker "HOW IT WORKS" / step "02 / 06" / "Measures what the device can really do." / "A fixed-time CPU benchmark, cold before paint and warm at load. The warm score is cached for the next page." / kernels "float math", "typed arrays", "allocation", "canvas paths" / "cold 61", "warm 87" / "100 = reference phone" / "example device"

narrativeRole: show that the decision rests on a real measurement of this device.
keyMessage: a score, measured warm, where 100 is the reference phone.

Adapt: keep the count-up hero number; the supporting data is four small kernel meters instead of a chart. Shared chrome per Video direction (step "02 / 06").
Scene 1 (0.0-1.4s): headline "Measures what the device can really do." (`h2`) reveals in the left column. Right column, top half: four kernel rows (mono `value` labels "float math", "typed arrays", "allocation", "canvas paths"), each with a thin `deep` track; the tracks fill in short discrete slices, staggered by row (`stat-bars-and-fills`), in Chalk.
Scene 2 (1.4-3.0s): right column, bottom half: a big `stat` number counts up to "61" with a small `label` "cold, before paint" (`counting-dynamic-scale`); then it continues counting to "87" as the label swaps to "warm, at load" (`discrete-text-sequence`). Under it a hairline scale with a tick at 100 labelled "100 = reference phone" and a small `label` "example device".
Scene 3 (3.0-4.5s): supporting line reveals under the headline (`lead`, `muted`). A small chip "cached for the next page" appears next to the score. Hold.

## Frame 6: Every effect has its own threshold

- scene: Five effect rows each with its own threshold and hysteresis band; the device score line decides each one
- voiceover: ""
- duration: 4.5s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/06-thresholds.html
- type: feature_showcase
- persuasion: Negative contrast
- beat: clarity + control
- blueprint: compose
- focal: the five threshold rows crossed by one score line
- roles: rows = cutout · tier chips = supporting · ground = background
- asset_candidates: none, typography and diagram only
- sfx: none
- on_screen_text: kicker "HOW IT WORKS" / step "03 / 06" / "Every effect has its own threshold." / "With hysteresis: off only clearly below, back on only clearly above. Not one global tier." / rows "sound", "pageTransition", "parallax", "blur", "canvasHiRes" / "score 87" / tier chips "Full 120", "High 70", "Medium 35", "Lite 20" with label "tiers are shortcuts" / note "prefers-reduced-motion respected"

narrativeRole: show the decision is per effect, not one blunt tier.
keyMessage: each effect turns on or off on its own threshold, without flicker.

Compose from `stat-bars-and-fills`, `dynamic-content-sequencing`, `discrete-text-sequence`. Shared chrome per Video direction (step "03 / 06").
Scene 1 (0.0-1.3s): headline "Every effect has its own threshold." (`h2`) reveals left. Right column: five rows reveal top to bottom, each: effect swatch + mono id, a `deep` score track (scale 0 to 150, shared by all rows) with its own threshold tick wrapped in a soft hysteresis band of plus or minus 10% (a slightly lighter `ink-raised` zone). Real default thresholds from the library: sound 50, pageTransition 55, parallax 70, blur 90, canvasHiRes 120 (band = threshold x 0.9 to x 1.1). Show the threshold value as a tiny mono number at its tick.
Scene 2 (1.3-3.0s): a vertical Chalk score line labelled "score 87" sweeps in from the left across all rows and settles; rows whose threshold sits left of the line light up (swatch filled, text Chalk): sound, pageTransition, parallax; blur and canvasHiRes stay off (outlined swatch, `muted` text, strike) (`discrete-text-sequence`). Score 87 sits inside blur's band (81 to 99): the blur row gets a tiny `label` "inside band: no change" and does not flicker, while the score line makes a small dip and return inside the band to show it.
Scene 3 (3.0-4.5s): supporting line reveals under the headline (`lead`, `muted`). Under the rows a row of four tier chips "Full 120", "High 70", "Medium 35", "Lite 20" (tier fg/bg pairs; the numbers are the tier score floors) with a `label` "tiers are shortcuts", and a small `label` "prefers-reduced-motion respected". Hold.

## Frame 7: A governor watches real frames

- scene: As the device heats up, frame times climb over the line and the governor switches off the most expensive effect, one at a time, until frames fit again
- voiceover: ""
- duration: 5s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/07-governor.html
- type: feature_showcase
- persuasion: Risk reversal
- beat: tension > relief
- blueprint: compose
- focal: a streaming frame-time chart with the pink vsync line
- roles: chart = cutout · effect chips + heat meter = supporting · ground = background
- asset_candidates: none, typography and diagram only
- sfx: none
- on_screen_text: kicker "HOW IT WORKS" / step "04 / 06" / "A governor watches real frames." / "When frames run long as the device heats up, it steps the most expensive effect down. One at a time." / "16.7 ms" / chips "parallax", "pageTransition", "blur", "canvasHiRes" / events "canvasHiRes off", "blur off" / heat label "device heating up" / "main thread + workers"

narrativeRole: the runtime safety net; the hero mechanism.
keyMessage: sustained slow frames step effects down, gracefully, one at a time.

Compose from `stat-bars-and-fills`, `discrete-text-sequence`, `dynamic-content-sequencing`. Shared chrome per Video direction (step "04 / 06").
Scene 1 (0.0-1.2s): headline "A governor watches real frames." (`h2`) reveals left. Right column: a row of four effect chips (parallax, pageTransition, blur, canvasHiRes, all on) above a frame-time chart: a `deep` panel with the horizontal pink `vsync` line labelled "16.7 ms" and thin bars streaming in from the right, all under the line. A small heat meter (a short horizontal gauge in `muted` with a Chalk fill) labelled "device heating up" sits beside the chips. Small `label` "main thread + workers" under the chart.
Scene 2 (1.2-3.4s): the heat meter fills; streaming bars grow until several in a row cross the line. A marker drops on the chart at that moment, labelled "canvasHiRes off" (the most expensive effect goes first), and the canvasHiRes chip turns off (outline, strike, `muted`); bars drop a little but still cross; a second marker "blur off" and the blur chip turns off (`discrete-text-sequence`).
Scene 3 (3.4-5.0s): bars settle back under the line and stay there. Supporting line reveals under the headline (`lead`, `muted`). Hold.

## Frame 8: It remembers what stuttered

- scene: Three visit cards: visit 1 flags canvasHiRes as stuttering, visit 2 starts without it, a later visit with headroom retries it
- voiceover: ""
- duration: 4s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/08-learning.html
- type: feature_showcase
- persuasion: Future pacing
- beat: trust + peace of mind
- blueprint: grid-card-assemble (Adapt)
- focal: three visit cards in a row
- roles: visit cards = cutout · privacy note = supporting · ground = background
- asset_candidates: none, typography and diagram only
- sfx: none
- on_screen_text: kicker "HOW IT WORKS" / step "05 / 06" / "It remembers what stuttered." / "Local learning, always on. The next visit starts without it. Nothing leaves the device." / cards "visit 1" "canvasHiRes stuttered", "visit 2" "starts without it", "visit 7" "5 clean visits: retry" / note "stored on this device"

narrativeRole: show the library gets better per device over time, privately.
keyMessage: it learns on the device, and nothing leaves it.

Adapt: keep the staggered self-assembling cards; three cards in one row that read as a sequence over time, connected by a hairline. Shared chrome per Video direction (step "05 / 06").
Scene 1 (0.0-1.2s): headline "It remembers what stuttered." (`h2`) reveals left. Right column: card "visit 1" (`ink` panel) assembles, inside it a canvasHiRes chip with a small `label` "stuttered".
Scene 2 (1.2-2.8s): card "visit 2" assembles to its right along a hairline (`grid-card-assemble` cascade), inside it the canvasHiRes chip is off (outline, strike) and `label` "starts without it"; a faint "visits 3 to 6" ellipsis on the hairline; then card "visit 7" assembles, its canvasHiRes chip outlined dashed then filled, `label` "5 clean visits: retry". (The library retries after 5 clean visits.)
Scene 3 (2.8-4.0s): supporting line reveals under the headline (`lead`, `muted`); under the cards a small `label` "stored on this device". Hold.

## Frame 9: Telemetry is opt-in

- scene: A telemetry switch is off by default; the site developer turns it on; an anonymous sampled payload card shows what is sent and what never is
- voiceover: ""
- duration: 4.5s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/09-telemetry.html
- type: feature_showcase
- persuasion: Risk reversal
- beat: trust
- blueprint: compose
- focal: the payload card
- roles: switch = supporting · payload card = cutout · ground = background
- asset_candidates: none, typography and diagram only
- sfx: none
- on_screen_text: kicker "HOW IT WORKS" / step "06 / 06" / "Telemetry is opt-in." / "Off by default, switched on by the site developer. Anonymous and sampled. Never sent with Global Privacy Control or Save-Data." / switch "telemetry: off" to "on, by the site developer" / payload rows "score", "kernel rates", "hardware hints", "effects", "fps per effect", struck "identifiers" / badges "GPC: not sent", "Save-Data: not sent" / "calibrated thresholds: cached, never blocks first paint"

narrativeRole: close the mechanism with privacy and calibration, so the developer trusts it.
keyMessage: off by default, anonymous when on, and the thresholds keep getting better.

Compose from `discrete-text-sequence`, `dynamic-content-sequencing`, `stat-bars-and-fills`. Shared chrome per Video direction (step "06 / 06").
Scene 1 (0.0-1.2s): headline "Telemetry is opt-in." (`h2`) reveals left. Right column top: a switch control (control radius, `ink-raised`, `line-strong` border) labelled in mono "telemetry: off", knob left.
Scene 2 (1.2-3.0s): the knob slides right and the label swaps to "on, by the site developer" (`discrete-text-sequence`); a payload card (`ink` panel) assembles below with mono rows revealing one per beat: score, kernel rates, hardware hints, effects, fps per effect, and a last row "identifiers" shown struck through in `muted`. Next to it two small badges "GPC: not sent" and "Save-Data: not sent".
Scene 3 (3.0-4.5s): supporting line reveals under the headline (`lead`, `muted`); a small `label` under the card "calibrated thresholds: cached, never blocks first paint". Hold.

## Frame 10: The code

- scene: A terminal types npm i framebudget, then a code panel types the API: budget.allows, budget.on, useBudget
- voiceover: ""
- duration: 7.5s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/10-code.html
- type: cta
- persuasion: Friction reduction
- beat: ease + confidence
- blueprint: prompt-type-submit-generate (Adapt)
- focal: the code panel typing the API
- roles: terminal pill = supporting · code panel = cutout · ground = background
- asset_candidates: none, typography and code only
- sfx: none
- on_screen_text: kicker "THE API" / "Ask before you animate." / terminal "$ npm i framebudget" / code lines exactly as listed in Scene 2 and Scene 3

narrativeRole: show how small the integration is.
keyMessage: one install, one question per effect.

Adapt: keep the typed command as the engine (the install-command card), then extend into a code panel that types the API; no submit, no generated answer.
Scene 1 (0.0-1.6s): kicker `THE API` and headline "Ask before you animate." (`h2`) top-left. Below-left, a terminal pill (`deep`, control radius, `line` border) types `$ npm i framebudget` character by character behind a caret (`discrete-text-sequence` + `context-sensitive-cursor`), `code` type, the `$` in `muted`.
Scene 2 (1.6-4.6s): to the right, a large code panel (`deep`, panel radius, `line` border, a small mono tab label "app.js") types, with syntax colors from `frame.md` code-* tokens, these exact lines:
`import { budget } from "framebudget";`
(blank line)
`if (budget.allows("parallax")) startParallax();`
`budget.on("change", update);`
Scene 3 (4.6-7.5s): a second tab "Hero.jsx" appears in the same panel below a hairline and types:
`import { useBudget } from "framebudget/react";`
(blank line)
`const animate = useBudget("pageTransition");`
Caret stops at the end. Hold the full read for the last 1.5s.

## Frame 11: End card

- scene: The framebudget lockup, the primary tagline, and the install command, held
- voiceover: ""
- duration: 5s
- transition_in: blur-crossfade
- status: animated
- src: compositions/frames/11-end.html
- type: branding
- persuasion: Value stacking
- beat: confidence + urgency-to-act
- blueprint: titlecard-reveal (Adapt)
- focal: assets/lockup-dark.svg
- roles: lockup-dark = cutout · install pill = supporting · ground = background
- asset_candidates: assets/lockup-dark.svg - mark plus lowercase "framebudget" wordmark in light ink, for dark grounds
- sfx: none
- on_screen_text: lockup "framebudget" / "Keep the effects. Lose the stutter." / "npm i framebudget"

narrativeRole: the sign-off: who, what, how to get it.
keyMessage: keep the effects, lose the stutter; npm i framebudget.

Adapt: one restrained move per element, then a still hold to the end; this is the only frame with an exit.
Scene 1 (0.0-1.2s): centered, the lockup (about 880px wide) rises a few pixels and fades in (one slide-up crossfade).
Scene 2 (1.2-2.4s): under it the tagline "Keep the effects. Lose the stutter." (`h2`, Chalk) slides up and fades in; then the install pill (`deep`, control radius, `line` border) with `npm i framebudget` in `code` type fades in under the tagline.
Scene 3 (2.4-5.0s): hold completely still. In the last 0.5s everything fades to the ground color (the only exit in the film).
