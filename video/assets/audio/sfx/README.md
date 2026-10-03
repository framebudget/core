# Sound effects

Every file in this folder is synthesized locally by `scripts/make-sfx.mjs`.
There are no samples, no downloads and no accounts, so the sounds are original
and royalty-free by construction. The script is deterministic: seeded noise,
fixed parameters, and the same output on every run.

```bash
node scripts/make-sfx.mjs            # render the WAVs, write cues.json, place the cues in index.html
node scripts/make-sfx.mjs --no-place # render the WAVs and cues.json only
```

`scripts/assemble.sh` runs it after rebuilding `index.html`, so the mix
survives a re-assembly.

## Format

48 kHz, 16-bit, stereo WAV. Every file is normalized to a -3 dBFS peak, so
the `data-volume` on each cue is its level relative to the others.
`cues.json` lists every cue with its start time, duration, volume, Studio
lane and, for sequences, the time of every inner event.

## Timing

Cue times come from the same constants the scene timelines use
(`compositions/frames/*.html`) plus the scene starts in `index.html`. Each
time is moved to the first 30 fps frame on which its change is drawn.
Sequences such as typing, counters, meter slices and overshooting frame bars
are rendered as one file per run, with every inner event on its own frame.

- Typing: per-character reveal times use the scene's own spread (spaces 1.7,
  letters and digits 1, punctuation 0.85). At most two key sounds play per
  frame, the second 16 ms later.
- Counters: one tick for each frame on which the displayed number changes,
  using the scene's easing (GSAP `power3.out` is quartic).
- Overshoot (Frame 1): the bar stacks are read from `01-stutter.html`. A bar
  at left `L` enters the track at `2.9 + L / 220` s. All overshoots before the
  fps readout get a thud, and after that only the tallest bars.
- Overshoot (Frame 7): the scene's own heat ramp and jitter, one bar every
  1/15 s, so it plays one pulse per overshooting bar. Each pulse's level
  follows how far the bar goes past 16.7 ms.

## The family

All sounds are short and rounded and lead with sine tones, with soft filtered
noise for air and motion. Tonal sounds are tuned to F major, the key of the
music bed: F, G, A, C and D.

| Voice | How it is made |
| ----- | -------------- |
| key | A 3.2 kHz band-passed noise click (1.2 ms decay), a 1.75 kHz plastic resonance, a 150 to 270 Hz "thock" body (18 to 30 ms) and a faint key-up click about 40 ms later, low-passed at 9 kHz. Seeded pitch and level vary by +/-6 %. The variants are `space` (lower and longer), `back` and `light` (punctuation). |
| tap | A sine that glides down 35 % into its pitch (6 ms), with a 2.5 kHz noise click. |
| tick | A sine blip, 0.4 ms attack and 7 ms decay, plus a quick second harmonic. |
| blip | A sine that glides up into its pitch (10 ms), 30 ms decay, with a little third harmonic. |
| pop | A bubble: pitch settles from 1.9x to 1x in 9 ms, 50 ms decay, with a sub-octave and a soft click. The `dull` variant is 0.3 semitone flat, sags 6 %, decays in 35 ms and is low-passed at 1.3 kHz. |
| bell | A fundamental plus partials at 2x, 2.76x and 5.4x, each decaying faster than the one below. |
| pad | Three voices per note detuned by -4, 0 and +4 cents, a soft second harmonic, attack, hold and release, low-passed at 2.6 kHz. |
| thud | A sine body that drops from 110 to 46 Hz with tanh saturation, a 500 Hz low-passed noise transient and three short 4-bit sample-and-hold glitch bursts band-passed at 1.8 kHz. |
| glitch | A 20 ms slice of a crushed 620 Hz tone mixed with sample-and-hold noise, repeated four times as it fades, band-passed at 1.2 kHz. |
| whoosh | Pink-ish noise through a state-variable band-pass whose cutoff sweeps up to a peak and back down. The level rises and falls like a bell, the pan sweeps, and mid/side noise adds a little width. |
| zip | A narrow (Q 5) noise band sweeping up as a line draws, panned left to right like the pen. |
| riser | A noise band climbing from 300 Hz to 1.4 kHz over a low tone rising from 55 to 80 Hz. |

## Files

| File | Recipe | Used for |
| ---- | ------ | -------- |
| `whoosh-push.wav` | whoosh 0.7 s, peak at 0.25 s (the middle of the 0.5 s push), 350 to 2600 to 700 Hz, pans right to left | slide transitions |
| `whoosh-soft.wav` | whoosh 0.9 s, peak 0.32 s, 250 to 1500 to 450 Hz, centered, slower rise | blur and opacity crossfades |
| `whoosh-zoom.wav` | whoosh 0.75 s, peak 0.25 s, 300 to 3200 to 600 Hz, more body; starts 0.25 s before the cut | zoom from Frame 9 to Frame 10 |
| `swell-in.wav` | whoosh 1.0 s, peak 0.55 s, 200 to 1200 to 600 Hz | the phone entering at 0 s |
| `swish-text.wav` | whoosh 0.35 s, 2.5 to 6 to 3.5 kHz, very soft | headline and tagline reveals |
| `swish-in.wav` | whoosh 0.4 s, 0.9 to 3.5 to 1.8 kHz, panned right | terminal and code panel arriving |
| `swish-slide.wav` | whoosh 0.45 s, 1.2 to 3 to 1.5 kHz, right to left | the sound segment sliding left |
| `swoosh-drop.wav` | whoosh 0.55 s falling 2.4 kHz to 400 Hz, peak late (matches `power2.in`) | segments dropping out of the budget |
| `zip-draw.wav`, `zip-short.wav` | zip 0.5 s and 0.4 s, 800 Hz to 3 kHz | lines drawing |
| `vsync.wav` | a 0.18 s zip into an F6 bell with a C7 overtone bell | the pink 16.7 ms line appearing (recurring motif) |
| `pop-77/79/81.wav` | pop at F5, G5, A5 | segments snapping into the frame budget, rising |
| `pop-dull-74/72.wav` | dull pop at D5, C5 | segments that land over budget |
| `pop-node.wav` | pop at E6 | visit nodes in Frame 8 |
| `toggle-on-84/86/89.wav` | pop plus a tick one octave up (C6, D6, F6) | an effect switching on |
| `thud.wav` | thud | canvasHiRes pushing the budget past 16.7 ms |
| `glitch.wav` | glitch | "over budget" status |
| `switch.wav` | press tap (1.3 kHz), latch tap (2.6 kHz) 45 ms later with a short A5 bell | switches flipped (telemetry, first-paint decision) |
| `tap.wav`, `tap-soft.wav`, `tap-land.wav`, `tick-lock.wav` | tap at A5, C6 (longer), C5 (50 ms) and E6 (short) | cards, chips, readouts, landings |
| `strike.wav` | zip 0.14 s falling 2.6 to 1.7 kHz, Q 2.5, with a G7 tick | strike-throughs |
| `marker.wav` | a sine gliding from 1.2 kHz to 700 Hz, with a C7 tick | governor marker drop |
| `step-down.wav` | an off switch, then bells A5 and F5 falling | the governor turns canvasHiRes off |
| `resolve.wav` | bells C5, F5, A5, C6 rising 75 ms apart over an F major pad, with an F6 sparkle | frames fit again ("fits", blur off) |
| `confirm.wav` | bells A5 then C6 | the warm score landing |
| `chime-paint.wav` | bells F6 and F5 | first paint lighting up |
| `riser-heat.wav` | riser 1.05 s, the same span as the heat meter fill | the device heating up |
| `seq-01-overshoot.wav` | 20 thuds on the overshooting bars, rising in weight | Frame 1 frame-time strip |
| `seq-01-fps.wav` | 22 ticks falling from about 1.58 kHz to 520 Hz as 60 fps drops to 24 | Frame 1 readout |
| `seq-04-rail.wav` | a 0.9 s zip with a G6 tick as the pen passes each label | Frame 4 timeline |
| `seq-04-chips.wav` | taps at C6, D6, F6 | Frame 4 chips stacking |
| `seq-05-kernels.wav` | 56 ticks, 14 per kernel meter, rising within each row and from row to row | Frame 5 kernel meters |
| `seq-05-score.wav` | rising blips (600 Hz to 1.7 kHz), one for each change of the number | Frame 5 score counts |
| `seq-06-rows.wav`, `seq-06-tiers.wav` | tap cascades in F major | Frame 6 rows and tiers |
| `seq-06-score.wav` | ticks that follow the score up to 87, down to 83 and back | Frame 6 sweep |
| `seq-07-overshoot.wav` | 24 thud pulses (50 ms bodies after the first full thud), one for each overshooting bar | Frame 7 hot frames |
| `seq-09-edit.wav` | two backspace keys, two keys and a paste (a space key plus a short swish) | Frame 9 label edit |
| `seq-09-rows.wav` | six taps stepping down from C6 and two pops (D6, F6) | Frame 9 payload rows and badges |
| `seq-10-type-*.wav` | key sounds for `npm i framebudget` and each typed code line | Frame 10 typing |
| `sting-logo.wav` | the vsync motif, bar notes C6, A5 and F5 as the three bars step in (bell plus pop), a whoosh as the mark moves into the lockup, a high zip for the wordmark wipe and an Fmaj9 pad bloom with an F6 sparkle | Frame 3 logo build |
| `sting-end.wav` | a 0.2 s swell into a soft 52 Hz landing, an Fmaj9 pad (F3 C4 A4 E5 G5), the C6, A5, F5 motif again and an F6 sparkle, decaying under the fade | Frame 11 end card |

## Mix

- The SFX submix is `<hf-audio-group id="sfx">` with fader 0.88. Its chain is
  a 35 Hz high-pass (Rumble Guard), then one shared small reverb (size 0.3,
  damping 0.6, wet 0.14, dry 0.92) so every sound sits in the same space, then
  a -6 dBFS limiter (SFX Ceiling).
- The music bed (`el-bgm`) has a gain of +1.9 dB (Bed Level), then a -3 dBFS
  limiter (Bed Ceiling). A volume lane dips it to 0.82 (about -1.7 dB) under
  the dense passages, ramping down over 0.15 s and back up over 0.6 s:
  the budget segments, logo sting, score counters, threshold sweep, governor,
  telemetry edit, code typing and end sting.
- Targets: about -14 LUFS integrated for the full mix, true peak below
  -1 dBTP, and SFX well below the bed so they read as texture.
