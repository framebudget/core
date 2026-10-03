#!/usr/bin/env node
// Sound design for the framebudget video, synthesized locally: no samples, no
// network, no accounts. Every sound is built from sines and filtered noise in
// this file, so the output is original and royalty-free by construction.
//
//   node scripts/make-sfx.mjs            render assets/audio/sfx/*.wav, write cues.json, place cues in index.html
//   node scripts/make-sfx.mjs --no-place render and write cues.json only
//
// Timing: every cue time below is derived from the same constants the scene
// timelines use (compositions/frames/*.html) plus the scene starts in
// index.html, then snapped to the first video frame (30 fps) on which the
// change is visible. Sequences (typing, counters, meter slices, overshooting
// frame bars) are rendered as one file per run, with each inner event on its
// own frame.
//
// Mix: SFX play on the "sfx" submix bus (<hf-audio-group>), the music bed
// carries a gain + limiter chain and a volume lane that ducks it slightly
// under dense SFX moments. See assets/audio/sfx/README.md.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "assets/audio/sfx");
const PLACE = !process.argv.includes("--no-place");

const SR = 48000;
const FPS = 30;
const TAU = Math.PI * 2;
const PEAK = 0.708; // every file is normalized to -3 dBFS peak; cue volume sets its level

// ---------------------------------------------------------------- helpers

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * (3 - 2 * u);
};
// First video frame at or after t (the frame on which a change at t is drawn).
const frameAt = (t) => Math.ceil(t * FPS - 1e-6) / FPS;
const r4 = (x) => Math.round(x * 10000) / 10000;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stereo buffer.
function stereo(sec) {
  const n = Math.max(1, Math.ceil(sec * SR));
  return { L: new Float32Array(n), R: new Float32Array(n), n };
}

// Mix a mono signal into a stereo buffer at `at` seconds, equal-power pan (-1..1).
function addMono(dst, mono, at, gain = 1, pan = 0) {
  const s0 = Math.round(at * SR);
  const p = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
  const gl = Math.cos(p) * gain * Math.SQRT2;
  const gr = Math.sin(p) * gain * Math.SQRT2;
  for (let i = 0; i < mono.length; i++) {
    const k = s0 + i;
    if (k < 0 || k >= dst.n) continue;
    dst.L[k] += mono[i] * gl;
    dst.R[k] += mono[i] * gr;
  }
}

function addStereo(dst, src, at, gain = 1) {
  const s0 = Math.round(at * SR);
  for (let i = 0; i < src.n; i++) {
    const k = s0 + i;
    if (k < 0 || k >= dst.n) continue;
    dst.L[k] += src.L[i] * gain;
    dst.R[k] += src.R[i] * gain;
  }
}

// Topology-preserving state-variable filter, safe under per-sample modulation.
function svf() {
  let ic1 = 0;
  let ic2 = 0;
  return (x, fc, q) => {
    const g = Math.tan((Math.PI * clamp(fc, 20, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    return { low: v2, band: v1, high: x - k * v1 - v2 };
  };
}

function onePoleLow(fc) {
  const a = Math.exp((-TAU * fc) / SR);
  let y = 0;
  return (x) => (y = (1 - a) * x + a * y);
}

const mono = (sec) => new Float32Array(Math.max(1, Math.ceil(sec * SR)));

// ---------------------------------------------------------------- voices
// One family: short, rounded, sine-led UI sounds in F major (the bed's key),
// soft noise for air and motion, nothing cartoonish.

// Keyboard key: a soft plastic click, a low "thock" body and a faint key-up.
function key(seed, kind = "key") {
  const r = rng(seed);
  const v = 1 + (r() - 0.5) * 0.12;
  const out = mono(0.1);
  const bp = svf();
  const lp = onePoleLow(9000);
  const body = (kind === "space" ? 150 : kind === "back" ? 190 : kind === "light" ? 270 : 235) * v;
  const tau = kind === "space" ? 0.03 : 0.018;
  const clickGain = kind === "light" ? 0.6 : 0.85;
  const up = 0.034 + r() * 0.012;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const n = r() * 2 - 1;
    const click = bp(n * Math.exp(-t / 0.0012), 3200 * v, 1.1).band * 2.2 * clickGain;
    const res = Math.sin(TAU * 1750 * v * t) * Math.exp(-t / 0.005) * 0.22;
    const b = Math.sin(TAU * body * t) * Math.exp(-t / tau) * (1 - Math.exp(-t / 0.0008)) * 0.55;
    const tu = t - up;
    const release = tu > 0 ? Math.sin(TAU * 2400 * v * tu) * Math.exp(-tu / 0.0025) * 0.12 : 0;
    out[i] = lp(click + res + b + release);
  }
  return out;
}

// UI tap: a short downward glide with a tiny click, rounder than a key.
function tap(f = 900, decay = 0.022, seed = 7) {
  const r = rng(seed);
  const out = mono(0.14);
  const bp = svf();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * f * (1 + 0.35 * Math.exp(-t / 0.006))) / SR;
    const a = (1 - Math.exp(-t / 0.0006)) * Math.exp(-t / decay);
    const click = bp((r() * 2 - 1) * Math.exp(-t / 0.001), 2500, 1).band * 0.8;
    out[i] = Math.sin(ph) * a + click;
  }
  return out;
}

// Counter tick: a very short sine blip.
function tick(f) {
  const out = mono(0.05);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const a = (1 - Math.exp(-t / 0.0004)) * Math.exp(-t / 0.007);
    out[i] = (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t) * Math.exp(-t / 0.004)) * a;
  }
  return out;
}

// Rising blip: a sine that glides up into its pitch.
function blip(f) {
  const out = mono(0.12);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * f * (1 - 0.15 * Math.exp(-t / 0.01))) / SR;
    const a = (1 - Math.exp(-t / 0.001)) * Math.exp(-t / 0.03);
    out[i] = (Math.sin(ph) + 0.15 * Math.sin(3 * ph)) * a;
  }
  return out;
}

// Pop: a round bubble with a quick downward pitch settle. `dull` is the
// over-budget variant: darker, shorter, slightly flat and sagging.
function pop(f, dull = false, seed = 11) {
  const r = rng(seed);
  const out = mono(0.26);
  const bp = svf();
  const lp = onePoleLow(dull ? 1300 : 12000);
  const base = dull ? f * Math.pow(2, -0.3 / 12) : f;
  const decay = dull ? 0.035 : 0.05;
  let ph = 0;
  let ph2 = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const sag = dull ? 1 - 0.06 * Math.min(1, t / 0.1) : 1;
    ph += (TAU * base * sag * (1 + 0.9 * Math.exp(-t / 0.009))) / SR;
    ph2 += (TAU * base * 0.5) / SR;
    const a = (1 - Math.exp(-t / 0.0007)) * Math.exp(-t / decay);
    const click = bp((r() * 2 - 1) * Math.exp(-t / 0.0015), 1800, 1).band * 0.5;
    out[i] = lp(Math.sin(ph) * a + Math.sin(ph2) * 0.15 * Math.exp(-t / 0.03) + click);
  }
  return out;
}

// Bell: sine with a few soft inharmonic partials that die faster than the fundamental.
function bell(f, decay = 0.9, bright = 1) {
  const out = mono(decay * 4);
  const parts = [
    [1, 1, 1],
    [2, 0.18 * bright, 0.5],
    [2.76, 0.1 * bright, 0.3],
    [5.4, 0.05 * bright, 0.12],
  ];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const atk = 1 - Math.exp(-t / 0.002);
    let s = 0;
    for (const [m, g, d] of parts) s += Math.sin(TAU * f * m * t) * g * Math.exp(-t / (decay * d));
    out[i] = s * atk;
  }
  return out;
}

// Soft pad chord: three detuned voices per note, attack / hold / release, low-passed.
function pad(notes, attack, hold, release, bright = 2600) {
  const len = attack + hold + release;
  const out = mono(len);
  const lp = onePoleLow(bright);
  const det = [-4, 0, 4].map((c) => Math.pow(2, c / 1200));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let e;
    if (t < attack) e = smooth(t / attack);
    else if (t < attack + hold) e = 1;
    else e = Math.pow(1 - (t - attack - hold) / release, 2.2);
    let s = 0;
    for (const f of notes) for (const d of det) s += Math.sin(TAU * f * d * t) + 0.12 * Math.sin(TAU * 2 * f * d * t);
    out[i] = lp((s / (notes.length * 3)) * e);
  }
  return out;
}

// Low thud for a frame that overshoots the 16.7 ms line: a pitch-dropping
// body, a muffled transient and a faint bit-crushed glitch on top.
function thud(intensity = 1, seed = 3, decay = 0.11) {
  const r = rng(seed);
  const out = mono(0.5);
  const lpN = onePoleLow(500);
  const bp = svf();
  let ph = 0;
  let hold = 0;
  let held = 0;
  const bursts = [
    [0.0, 0.012],
    [0.03, 0.042],
    [0.06, 0.068],
  ];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * (46 + 64 * Math.exp(-t / 0.035))) / SR;
    const body = Math.tanh(1.6 * Math.sin(ph) * (1 - Math.exp(-t / 0.001)) * Math.exp(-t / decay)) / Math.tanh(1.6);
    const trans = lpN((r() * 2 - 1) * Math.exp(-t / 0.008)) * 1.4;
    if (hold-- <= 0) {
      held = Math.round((r() * 2 - 1) * 8) / 8; // 4-bit sample and hold
      hold = 20;
    }
    let gl = 0;
    for (const [a, b] of bursts) if (t >= a && t < b) gl = held;
    const glitch = bp(gl, 1800, 2).band * 0.5 * intensity;
    out[i] = body + trans + glitch;
  }
  return out;
}

// Short digital stutter: one crushed slice repeated and fading.
function glitch(seed = 5) {
  const r = rng(seed);
  const out = mono(0.16);
  const slice = Math.round(0.02 * SR);
  const src = new Float32Array(slice);
  let held = 0;
  for (let i = 0; i < slice; i++) {
    const t = i / SR;
    if (i % 12 === 0) held = r() * 2 - 1;
    const tone = Math.tanh(3 * Math.sin(TAU * 620 * t));
    src[i] = Math.round((0.6 * tone + 0.4 * held) * 16) / 16;
  }
  const bp = svf();
  const reps = [
    [0, 1],
    [0.028, 0.7],
    [0.056, 0.5],
    [0.084, 0.3],
  ];
  for (const [at, g] of reps) {
    const s0 = Math.round(at * SR);
    for (let i = 0; i < slice; i++) {
      const w = Math.min(1, i / 48, (slice - i) / 48);
      out[s0 + i] += src[i] * g * w;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] = bp(out[i], 1200, 0.9).band * 1.5;
  return out;
}

// Whoosh: filtered noise whose band sweeps up to a peak and back down,
// with an amplitude bell and a pan sweep. Mid/side noise for a little width.
function whoosh({ dur, peak, f0, f1, f2, q = 0.9, pan0 = 0, pan1 = 0, rise = 2.2, fall = 1.6, body = 0.3, seed = 1 }) {
  const r = rng(seed);
  const out = stereo(dur);
  const fM = svf();
  const fS = svf();
  const pinkM = onePoleLow(3000);
  const pinkS = onePoleLow(3000);
  for (let i = 0; i < out.n; i++) {
    const t = i / SR;
    let fc;
    let a;
    if (t < peak) {
      const u = t / peak;
      fc = f0 * Math.pow(f1 / f0, smooth(u));
      a = Math.pow(u, rise);
    } else {
      const u = (t - peak) / (dur - peak);
      fc = f1 * Math.pow(f2 / f1, smooth(u));
      a = Math.pow(1 - u, fall);
    }
    const wm = r() * 2 - 1;
    const ws = r() * 2 - 1;
    const m = fM(pinkM(wm) + wm * 0.3, fc, q);
    const s = fS(pinkS(ws) + ws * 0.3, fc * 1.07, q);
    const mid = (m.band + m.low * body) * a;
    const side = (s.band + s.low * body) * a * 0.3;
    const pan = pan0 + (pan1 - pan0) * smooth(t / dur);
    const p = ((pan + 1) * Math.PI) / 4;
    const L = mid + side;
    const R = mid - side;
    out.L[i] = L * Math.cos(p) * Math.SQRT2;
    out.R[i] = R * Math.sin(p) * Math.SQRT2;
  }
  return out;
}

// Zip: a narrow noise band sweeping across a line being drawn, left to right.
function zip(dur, f0, f1, { q = 5, pan0 = -0.4, pan1 = 0.4, seed = 9 } = {}) {
  const r = rng(seed);
  const out = stereo(dur);
  const f = svf();
  let ph = 0;
  for (let i = 0; i < out.n; i++) {
    const t = i / SR;
    const u = t / dur;
    const fc = f0 * Math.pow(f1 / f0, u);
    ph += (TAU * fc) / SR;
    const a = Math.min(1, t / 0.01) * (0.7 - 0.4 * u) * Math.min(1, (dur - t) / 0.06);
    const s = (f(r() * 2 - 1, fc, q).band * 1.6 + Math.sin(ph) * 0.08) * a;
    const p = ((pan0 + (pan1 - pan0) * u + 1) * Math.PI) / 4;
    out.L[i] = s * Math.cos(p) * Math.SQRT2;
    out.R[i] = s * Math.sin(p) * Math.SQRT2;
  }
  return out;
}

// Riser: the device heating up, a band of noise and a low tone climbing.
function riser(dur, seed = 21) {
  const r = rng(seed);
  const out = mono(dur + 0.15);
  const f = svf();
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const u = clamp(t / dur, 0, 1);
    const a = t < dur ? Math.pow(u, 1.5) : Math.max(0, 1 - (t - dur) / 0.15);
    ph += (TAU * (55 + 25 * u)) / SR;
    const n = f(r() * 2 - 1, 300 * Math.pow(1400 / 300, u), 3).band * 1.4;
    out[i] = (n + Math.sin(ph) * 0.35) * a;
  }
  return out;
}

// ---------------------------------------------------------------- composites

// an effect switching on: a pop at the row's pitch with a tick an octave up
function toggleOn(m) {
  const out = stereo(0.4);
  addMono(out, pop(midi(m), false, m + 300), 0, 0.8);
  addMono(out, tick(midi(m + 12)), 0.02, 0.3);
  return out;
}

function toggleSound(f, on = true) {
  // physical switch: press click, then a latch click with a small tone
  const out = stereo(0.22);
  addMono(out, tap(1300, 0.008, 31), 0, 0.6);
  addMono(out, tap(2600, 0.004, 32), 0.045, 0.45);
  addMono(out, bell(on ? f : f * 0.75, 0.08, 0.5), 0.045, 0.35);
  return out;
}

function stepDown() {
  // the governor turns one effect down: an off click and a falling, consonant pair
  const out = stereo(1.6);
  addStereo(out, toggleSound(midi(81), false), 0, 0.7);
  addMono(out, bell(midi(81), 0.45), 0.02, 0.5, 0.1);
  addMono(out, bell(midi(77), 0.5), 0.11, 0.45, -0.1);
  return out;
}

function resolveSound() {
  // frames fit again: a rising F major arpeggio over a soft pad
  const out = stereo(3.4);
  const notes = [72, 77, 81, 84];
  notes.forEach((m, i) => addMono(out, bell(midi(m), 1.1), i * 0.075, 0.55 - i * 0.07, -0.25 + i * 0.17));
  addMono(out, pad([midi(65), midi(69), midi(72)], 0.12, 0.2, 1.3), 0, 0.5);
  addMono(out, bell(midi(89), 0.6, 0.6), 0.3, 0.12, 0.3);
  return out;
}

function confirmSound() {
  const out = stereo(2.6);
  addMono(out, bell(midi(81), 0.6), 0, 0.5, -0.1);
  addMono(out, bell(midi(84), 0.6), 0.07, 0.45, 0.1);
  return out;
}

function vsyncSound() {
  // the pink 16.7 ms line: a quick zip into an F6 / C7 ping (recurring motif)
  const out = stereo(1.9);
  addStereo(out, zip(0.18, 900, 2600, { q: 4, pan0: -0.2, pan1: 0.2 }), 0, 0.35);
  addMono(out, bell(midi(89), 0.45, 0.6), 0.04, 0.6);
  addMono(out, bell(midi(96), 0.35, 0.5), 0.04, 0.22);
  return out;
}

function pasteSound() {
  const out = stereo(0.3);
  addMono(out, key(77, "space"), 0, 0.8);
  addStereo(out, whoosh({ dur: 0.16, peak: 0.03, f0: 2500, f1: 5000, f2: 3000, q: 1, pan0: -0.2, pan1: 0.3, seed: 78 }), 0.005, 0.5);
  return out;
}

function markerSound() {
  const out = stereo(0.3);
  let ph = 0;
  const m = mono(0.12);
  for (let i = 0; i < m.length; i++) {
    const t = i / SR;
    ph += (TAU * (700 + 500 * Math.exp(-t / 0.02))) / SR;
    m[i] = Math.sin(ph) * (1 - Math.exp(-t / 0.0006)) * Math.exp(-t / 0.03);
  }
  addMono(out, m, 0, 0.8);
  addMono(out, tick(2093), 0.0, 0.25);
  return out;
}

function strikeSound(seed = 41) {
  const out = stereo(0.2);
  addStereo(out, zip(0.14, 2600, 1700, { q: 2.5, pan0: -0.2, pan1: 0.3, seed }), 0.004, 0.9);
  addMono(out, tick(3136), 0, 0.15);
  return out;
}

// Logo build (Frame 3): vsync ping as the line grows, three bar notes as
// amber, violet and mint step down toward it (C6, A5, F5), then a soft
// whoosh as the mark moves into the lockup and a chord bloom under the wordmark wipe.
function stingLogo(ev) {
  const out = stereo(ev.bloom + 3.2);
  addStereo(out, vsyncSound(), 0, 0.8);
  [84, 81, 77].forEach((m, i) => {
    addMono(out, bell(midi(m), 0.7), ev.bars[i], 0.55, -0.35 + i * 0.12);
    addMono(out, pop(midi(m), false, 50 + i), ev.bars[i], 0.25, -0.35 + i * 0.12);
  });
  addStereo(out, whoosh({ dur: 0.95, peak: 0.4, f0: 300, f1: 1800, f2: 500, q: 0.8, pan0: 0.1, pan1: -0.3, seed: 61 }), ev.move, 0.45);
  addStereo(out, zip(0.7, 2000, 6000, { q: 1.5, pan0: -0.5, pan1: 0.5, seed: 62 }), ev.bloom, 0.12);
  addMono(out, pad([midi(53), midi(60), midi(69), midi(79), midi(84)], 0.25, 0.5, 1.6), ev.bloom, 0.9);
  addMono(out, bell(midi(89), 0.7, 0.6), ev.bloom + 0.05, 0.16, 0.25);
  return out;
}

// End card (Frame 11): a short swell into a warm Fmaj9 bloom, the three-bar
// motif again, a soft low landing and a sparkle, decaying under the fade.
function stingEnd(hit) {
  const out = stereo(hit + 4.4);
  addStereo(out, whoosh({ dur: hit + 0.25, peak: hit, f0: 300, f1: 1500, f2: 600, q: 0.7, rise: 1.6, fall: 2, seed: 71 }), 0, 0.5);
  const sub = mono(0.6);
  let ph = 0;
  for (let i = 0; i < sub.length; i++) {
    const t = i / SR;
    ph += (TAU * (52 + 30 * Math.exp(-t / 0.05))) / SR;
    sub[i] = Math.sin(ph) * (1 - Math.exp(-t / 0.003)) * Math.exp(-t / 0.16);
  }
  addMono(out, sub, hit, 0.45);
  addMono(out, pad([midi(53), midi(60), midi(69), midi(76), midi(79)], 0.08, 0.6, 3.0), hit, 1.0);
  [84, 81, 77].forEach((m, i) => addMono(out, bell(midi(m), 0.9), hit + i * 0.12, 0.42, -0.3 + i * 0.3));
  addMono(out, bell(midi(89), 0.8, 0.6), hit + 0.36, 0.14, 0.3);
  return out;
}

// Render a run of events into one buffer. Events: { t, fn: () => mono|stereo, gain, pan }.
function sequence(events, tail = 0.3) {
  const len = Math.max(...events.map((e) => e.t)) + tail;
  const out = stereo(len);
  for (const e of events) {
    const s = e.fn();
    if (s instanceof Float32Array) addMono(out, s, e.t, e.gain ?? 1, e.pan ?? 0);
    else addStereo(out, s, e.t, e.gain ?? 1);
  }
  return out;
}

// ---------------------------------------------------------------- the score
// Scene starts in index.html (seconds).
const S = { 1: 0, 2: 7, 3: 13.5, 4: 17.5, 5: 22, 6: 26.5, 7: 31, 8: 36, 9: 40, 10: 44.5, 11: 52 };
const ease = {
  // GSAP power3 is a quartic curve
  power3Out: (p) => 1 - Math.pow(1 - clamp(p, 0, 1), 4),
};

const files = new Map(); // name -> stereo buffer
const cues = []; // { id, file, start, volume, lane, label, events? }

function one(name, make) {
  if (!files.has(name)) {
    const s = make();
    files.set(name, s instanceof Float32Array ? monoToStereo(s) : s);
  }
  return name;
}
function monoToStereo(m) {
  const out = stereo(m.length / SR);
  addMono(out, m, 0, 1, 0);
  return out;
}
function cue(id, file, at, volume, lane, label, events) {
  cues.push({ id, file, start: r4(at), volume, lane, label, ...(events ? { events } : {}) });
}
// A sequence cue starts on its first event's frame; inner events are relative to it.
function seqCue(id, name, events, volume, lane, label, tail = 0.3) {
  const t0 = Math.min(...events.map((e) => e.at));
  const rel = events.map((e) => ({ ...e, t: e.at - t0 }));
  files.set(name, sequence(rel, tail));
  cue(id, name, t0, volume, lane, label, events.map((e) => r4(e.at)));
}

const W = {
  push: () => one("whoosh-push", () => whoosh({ dur: 0.7, peak: 0.25, f0: 350, f1: 2600, f2: 700, q: 0.9, pan0: 0.6, pan1: -0.6, seed: 101 })),
  soft: () => one("whoosh-soft", () => whoosh({ dur: 0.9, peak: 0.32, f0: 250, f1: 1500, f2: 450, q: 0.7, rise: 1.6, seed: 102 })),
  zoom: () => one("whoosh-zoom", () => whoosh({ dur: 0.75, peak: 0.25, f0: 300, f1: 3200, f2: 600, q: 1, rise: 2.6, fall: 1.4, body: 0.5, seed: 103 })),
  swell: () => one("swell-in", () => whoosh({ dur: 1.0, peak: 0.55, f0: 200, f1: 1200, f2: 600, q: 0.7, rise: 1.4, fall: 1.8, seed: 104 })),
  text: () => one("swish-text", () => whoosh({ dur: 0.35, peak: 0.1, f0: 2500, f1: 6000, f2: 3500, q: 0.8, seed: 105 })),
  inR: () => one("swish-in", () => whoosh({ dur: 0.4, peak: 0.12, f0: 900, f1: 3500, f2: 1800, q: 0.9, pan0: 0.5, pan1: 0.2, seed: 106 })),
  slide: () => one("swish-slide", () => whoosh({ dur: 0.45, peak: 0.12, f0: 1200, f1: 3000, f2: 1500, q: 1.2, pan0: 0.3, pan1: -0.2, seed: 107 })),
  drop: () => one("swoosh-drop", () => whoosh({ dur: 0.55, peak: 0.35, f0: 2400, f1: 900, f2: 400, q: 1.2, rise: 1.4, pan0: 0, pan1: -0.15, seed: 108 })),
};
const lineDraw = (dur, name) => one(name, () => zip(dur, 800, 3000));

// ---- Frame 1, the stutter (0 to 7.5 s)
{
  const s = S[1];
  cue("sfx-01-phone-in", W.swell(), s + 0, 0.35, "motion", "phone enters");
  cue("sfx-01-line1", W.text(), frameAt(s + 0.2), 0.2, "motion", "headline line 1");
  cue("sfx-01-line2", W.text(), frameAt(s + 2.2), 0.22, "motion", "headline line 2, stutter begins");
  cue("sfx-01-vsync", one("vsync", vsyncSound), frameAt(s + 2.8), 0.35, "tonal", "vsync line draws");

  // Overshooting frame bars: bar at left L enters the track at 2.9 + L / 220 s.
  // A bar overshoots when its stack tops the line (stack height above 76.8 px).
  const src = readFileSync(join(ROOT, "compositions/frames/01-stutter.html"), "utf8");
  const bars = [...src.matchAll(/class="f01-stutter-bar" style="left:([\d.]+)px;bottom:[\d.]+px">(.*?)<\/div><\/div>/g)].map((m) => {
    const hs = [...m[2].matchAll(/height:([\d.]+)px/g)].map((h) => Number(h[1]));
    return { left: Number(m[1]), stack: hs.reduce((a, b) => a + b, 0) + 2 * (hs.length - 1) };
  });
  const over = bars.filter((b) => b.stack > 76.8).map((b) => ({ ...b, at: frameAt(s + 2.9 + b.left / 220) }));
  // every overshoot before the fps readout counts down, then only the tallest ones
  const hits = over.filter((b) => b.at < s + 4.65 || b.stack > 180).filter((b) => b.at <= s + 7.0);
  const ev = hits.map((b, i) => ({
    at: b.at,
    fn: () => thud(b.at < s + 4.65 ? 0.6 + i * 0.07 : 0.8, 200 + i),
    gain: b.at < s + 4.65 ? 0.55 + i * 0.06 : 0.6,
    pan: 0.35, // the frame-time strip sits right of center
  }));
  seqCue("sfx-01-overshoot", "seq-01-overshoot", ev, 0.62, "impact", "frames overshoot 16.7 ms", 0.5);

  cue("sfx-01-readout", one("tap-soft", () => tap(1046.5, 0.03, 12)), frameAt(s + 4.5), 0.25, "ui", "fps readout appears");
  // 60 fps counts down to 24 fps (power3.out over 1.5 s from 4.7 s), one falling tick per change
  const ticks = [];
  let shown = 60;
  for (let f = Math.ceil((s + 4.7) * FPS); f <= Math.ceil((s + 6.2) * FPS); f++) {
    const t = f / FPS;
    const v = Math.round(60 - 36 * ease.power3Out((t - s - 4.7) / 1.5));
    if (v !== shown) {
      shown = v;
      ticks.push({ at: t, fn: () => tick(520 * Math.pow(2, ((v - 24) / 36) * 1.6)), gain: 0.8 });
    }
  }
  seqCue("sfx-01-fps", "seq-01-fps", ticks, 0.32, "counter", "60 fps falls to 24 fps");
  cue("sfx-01-out", W.soft(), s + 7.0, 0.42, "motion", "crossfade to Frame 2");
}

// ---- Frame 2, the cost (7 to 14.1 s)
{
  const s = S[2];
  cue("sfx-02-track", lineDraw(0.5, "zip-draw"), frameAt(s + 0.3), 0.2, "motion", "budget track draws");
  cue("sfx-02-vsync", one("vsync", vsyncSound), frameAt(s + 0.8), 0.35, "tonal", "vsync line grows");
  const SEG = ["app", "parallax", "pageTransition", "canvasHiRes", "sound", "blur"];
  const PITCH = { app: 77, parallax: 79, pageTransition: 81 };
  SEG.forEach((name, i) => {
    const at = frameAt(s + 1.4 + i * 0.35);
    if (PITCH[name]) {
      cue(`sfx-02-seg-${name}`, one(`pop-${PITCH[name]}`, () => pop(midi(PITCH[name]), false, PITCH[name])), at, 0.42, "tonal", `${name} snaps into the budget`);
    } else if (name === "canvasHiRes") {
      cue("sfx-02-seg-canvasHiRes", one("thud", () => thud(1, 3)), at, 0.62, "impact", "canvasHiRes pushes past 16.7 ms");
    } else {
      const m = name === "sound" ? 74 : 72;
      cue(`sfx-02-seg-${name}`, one(`pop-dull-${m}`, () => pop(midi(m), true, m)), at, 0.36, "tonal", `${name} lands over budget`);
    }
  });
  cue("sfx-02-over", one("glitch", () => glitch(5)), frameAt(s + 2.75), 0.3, "impact", "status: over budget");
  cue("sfx-02-drop-canvas", W.drop(), frameAt(s + 4.0), 0.34, "motion", "canvasHiRes drops out");
  cue("sfx-02-drop-blur", W.drop(), frameAt(s + 4.3), 0.3, "motion", "blur drops out");
  cue("sfx-02-strike-canvas", one("strike", () => strikeSound(41)), frameAt(s + 4.6), 0.22, "ui", "canvasHiRes struck off");
  cue("sfx-02-slide-sound", W.slide(), frameAt(s + 4.7), 0.24, "motion", "sound slides left");
  cue("sfx-02-strike-blur", one("strike", () => strikeSound(41)), frameAt(s + 4.9), 0.2, "ui", "blur struck off");
  cue("sfx-02-fits", one("resolve", resolveSound), frameAt(s + 5.3), 0.5, "tonal", "status: fits");
  cue("sfx-02-out", W.soft(), s + 6.5, 0.42, "motion", "blur crossfade to Frame 3");
}

// ---- Frame 3, the logo build (13.5 to 18 s)
{
  const s = S[3];
  const t0 = frameAt(s + 0.05);
  const ev = {
    bars: [0.45, 0.68, 0.91].map((b) => frameAt(s + b) - t0),
    move: frameAt(s + 1.5) - t0,
    bloom: frameAt(s + 1.72) - t0,
  };
  files.set("sting-logo", stingLogo(ev));
  cue("sfx-03-sting", "sting-logo", t0, 0.6, "sting", "logo build sting", [t0, ...ev.bars.map((b) => t0 + b), t0 + ev.move, t0 + ev.bloom].map(r4));
  cue("sfx-03-tagline", W.text(), frameAt(s + 2.5), 0.2, "motion", "tagline words");
  cue("sfx-03-out", W.push(), s + 4.0, 0.45, "motion", "push to Frame 4");
}

// ---- Frame 4, first paint (17.5 to 22.5 s)
{
  const s = S[4];
  // the pen draws 40..800 px from 0.2 s over 0.9 s; each tick label pops as it passes
  const rail = [40, 230, 560, 800].map((x) => ({ at: frameAt(s + 0.2 + ((x - 40) / 760) * 0.9), fn: () => tick(1568), gain: 0.5, pan: -0.4 + ((x - 40) / 760) * 0.8 }));
  rail.unshift({ at: frameAt(s + 0.2), fn: () => zip(0.9, 700, 2400, { q: 5, seed: 401 }), gain: 0.35 });
  seqCue("sfx-04-rail", "seq-04-rail", rail, 0.3, "motion", "timeline draws, tick labels");
  cue("sfx-04-boot", one("tap-land", () => tap(520, 0.05, 13)), frameAt(s + 1.2), 0.35, "ui", "boot script block lands");
  const chips = [0, 1, 2].map((k) => ({ at: frameAt(s + 1.82 + k * 0.08), fn: () => tap(midi(84 + [0, 2, 5][k]), 0.02, 410 + k), gain: 0.7 }));
  seqCue("sfx-04-chips", "seq-04-chips", chips, 0.26, "ui", "effect chips stack");
  cue("sfx-04-decide", one("switch", () => toggleSound(midi(81))), frameAt(s + 2.3), 0.45, "ui", "chips resolve on and off");
  cue("sfx-04-paint", one("chime-paint", () => {
    const o = stereo(3.2);
    addMono(o, bell(midi(89), 0.8), 0, 0.6, 0.15);
    addMono(o, bell(midi(77), 0.8), 0, 0.3, 0.15);
    return o;
  }), frameAt(s + 2.8), 0.32, "tonal", "first paint lights up");
  cue("sfx-04-out", W.push(), s + 4.5, 0.45, "motion", "push to Frame 5");
}

// ---- Frame 5, the benchmark (22 to 27 s)
{
  const s = S[5];
  // four kernel meters, 14 slices each at 35 ms, rows 0.2 s apart
  const sl = [];
  for (let r = 0; r < 4; r++) {
    const seen = new Map();
    for (let j = 0; j < 14; j++) {
      const at = frameAt(s + 0.3 + r * 0.2 + j * 0.035);
      const n = seen.get(at) ?? 0;
      seen.set(at, n + 1);
      sl.push({ at: at + n * 0.015, fn: () => tick(900 * Math.pow(2, (j / 13) * 0.5 + r * 0.12)), gain: 0.55, pan: -0.3 + r * 0.2 });
    }
  }
  seqCue("sfx-05-kernels", "seq-05-kernels", sl, 0.22, "counter", "kernel meters fill");
  // score counts 0 to 61 (1.4 to 2.25 s), then 61 to 87 (2.4 to 3.05 s), one rising blip per change
  const C0 = 1.4, C1 = 2.25, W0 = 2.4, W1 = 3.05;
  const scoreAt = (t) => (t < C0 ? 0 : t < C1 ? 61 * ease.power3Out((t - C0) / (C1 - C0)) : t < W0 ? 61 : t < W1 ? 61 + 26 * ease.power3Out((t - W0) / (W1 - W0)) : 87);
  const bl = [];
  let shown = 0;
  for (let f = Math.ceil((s + C0) * FPS); f <= Math.ceil((s + W1) * FPS); f++) {
    const v = Math.round(scoreAt(f / FPS - s));
    if (v !== shown) {
      shown = v;
      bl.push({ at: f / FPS, fn: () => blip(600 * Math.pow(2, (v / 87) * 1.5)), gain: 0.75 });
    }
  }
  seqCue("sfx-05-score", "seq-05-score", bl, 0.3, "counter", "score counts cold then warm");
  cue("sfx-05-cold", one("tick-lock", () => tap(1318.5, 0.015, 14)), frameAt(s + C1), 0.3, "ui", "cold reading lands (61)");
  cue("sfx-05-warm", one("confirm", confirmSound), frameAt(s + W1), 0.36, "tonal", "warm reading lands (87)");
  cue("sfx-05-cached", one("tap", () => tap(880, 0.022, 7)), frameAt(s + 3.4), 0.28, "ui", "cached chip");
  cue("sfx-05-out", W.push(), s + 4.5, 0.45, "motion", "push to Frame 6");
}

// ---- Frame 6, per-effect thresholds (26.5 to 31.5 s)
{
  const s = S[6];
  const rows = [0, 1, 2, 3, 4].map((i) => ({ at: frameAt(s + 0.3 + i * 0.12), fn: () => tap(midi(77 + [0, 2, 4, 7, 9][i]), 0.018, 600 + i), gain: 0.7 }));
  seqCue("sfx-06-rows", "seq-06-rows", rows, 0.3, "ui", "five effect rows");
  // the scene's own easing (cubic out, quadratic in-out)
  const p3 = (x) => 1 - Math.pow(1 - x, 3);
  const p2io = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const scoreAt = (t) => {
    if (t < 1.3) return 0;
    if (t < 2.3) return 87 * p3((t - 1.3) / 1.0);
    if (t < 2.45) return 87;
    if (t < 2.75) return 87 - 4 * p2io((t - 2.45) / 0.3);
    if (t < 3.1) return 83 + 4 * p3((t - 2.75) / 0.35);
    return 87;
  };
  const tk = [];
  let shown = 0;
  for (let f = Math.ceil((s + 1.3) * FPS); f <= Math.ceil((s + 3.1) * FPS); f++) {
    const v = Math.round(scoreAt(f / FPS - s));
    if (v !== shown) {
      shown = v;
      tk.push({ at: f / FPS, fn: () => tick(650 * Math.pow(2, (v / 87) * 1.4)), gain: 0.75, pan: -0.3 + (v / 150) * 0.8 });
    }
  }
  seqCue("sfx-06-score", "seq-06-score", tk, 0.34, "counter", "score sweeps to 87, dips to 83, returns");
  // an effect turns on once the rising score clears its band (threshold x 1.1)
  const cross = (sc) => 1.3 + 1.0 * (1 - Math.cbrt(1 - sc / 87));
  [["sound", 50, 84], ["pageTransition", 55, 86], ["parallax", 70, 89]].forEach(([name, th, m]) => {
    cue(`sfx-06-on-${name}`, one(`toggle-on-${m}`, () => toggleOn(m)), frameAt(s + cross(th * 1.1)), 0.34, "tonal", `${name} switches on`);
  });
  cue("sfx-06-strike-blur", one("strike", () => strikeSound(41)), frameAt(s + 2.3), 0.2, "ui", "blur stays off");
  cue("sfx-06-strike-canvas", one("strike", () => strikeSound(41)), frameAt(s + 2.38), 0.18, "ui", "canvasHiRes stays off");
  const tiers = [0, 1, 2, 3].map((k) => ({ at: frameAt(s + 3.3 + k * 0.08), fn: () => tap(midi(89 - [0, 3, 5, 8][k]), 0.016, 620 + k), gain: 0.7 }));
  seqCue("sfx-06-tiers", "seq-06-tiers", tiers, 0.28, "ui", "tiers Full, High, Medium, Lite");
  cue("sfx-06-out", W.push(), s + 4.5, 0.45, "motion", "push to Frame 7");
}

// ---- Frame 7, the governor (31 to 36.5 s)
{
  const s = S[7];
  cue("sfx-07-vsync", one("vsync", vsyncSound), frameAt(s + 0.3), 0.33, "tonal", "vsync line draws");
  cue("sfx-07-heat", one("riser-heat", () => riser(1.05)), frameAt(s + 0.9), 0.24, "motion", "device heats up");
  // bar i enters at the right edge at t = i / 15; same stack the scene draws
  const heat = (t) => smooth((t - 0.9) / 1.05);
  const jitter = (i) => 0.6 * Math.sin(i * 1.7) + 0.4 * Math.sin(i * 0.63 + 1.1);
  const ev = [];
  for (let i = 0; i <= 75; i++) {
    const t = i / 15;
    const k = 1 + heat(t);
    let ms = 4.2 * k + jitter(i) + 1.2 * k + 1.0 * k;
    if (i < 44) ms += 2.6 * k;
    if (i < 30) ms += 3.0 * k;
    const over = ms - 16.85; // the line sits 202 px above the baseline at 12 px per ms
    if (over <= 0) continue;
    const first = ev.length === 0;
    ev.push({ at: frameAt(s + t), fn: () => thud(first ? 1 : clamp(over / 6, 0.2, 1), 700 + i, first ? 0.11 : 0.05), gain: first ? 1 : clamp(0.3 + over / 10, 0.3, 0.8), pan: 0.35 });
  }
  seqCue("sfx-07-overshoot", "seq-07-overshoot", ev, 0.55, "impact", "hot frames overshoot", 0.5);
  cue("sfx-07-canvas-off", one("step-down", stepDown), frameAt(s + 30 / 15), 0.42, "tonal", "governor: canvasHiRes off");
  cue("sfx-07-blur-off", one("marker", markerSound), frameAt(s + 44 / 15), 0.32, "ui", "governor: blur off");
  cue("sfx-07-fit", one("resolve", resolveSound), frameAt(s + 44 / 15), 0.5, "tonal", "frames fit again");
  cue("sfx-07-out", W.push(), s + 5.0, 0.45, "motion", "push to Frame 8");
}

// ---- Frame 8, local learning (36 to 40.5 s)
{
  const s = S[8];
  const node = () => one("pop-node", () => pop(midi(88), false, 88));
  cue("sfx-08-card1", one("tap", () => tap(880, 0.022, 7)), frameAt(s + 0.2), 0.32, "ui", "visit 1 card");
  cue("sfx-08-node1", node(), frameAt(s + 0.75), 0.28, "tonal", "visit 1 node");
  cue("sfx-08-seg-a", lineDraw(0.4, "zip-short"), frameAt(s + 1.15), 0.18, "motion", "line to visit 2");
  cue("sfx-08-card2", one("tap", () => tap(880, 0.022, 7)), frameAt(s + 1.3), 0.32, "ui", "visit 2 card");
  cue("sfx-08-node2", node(), frameAt(s + 1.5), 0.28, "tonal", "visit 2 node");
  cue("sfx-08-strike2", one("strike", () => strikeSound(41)), frameAt(s + 1.72), 0.22, "ui", "stuttered effect struck");
  cue("sfx-08-seg-b", lineDraw(0.4, "zip-short"), frameAt(s + 1.95), 0.18, "motion", "line to visit 7");
  cue("sfx-08-card3", one("tap", () => tap(880, 0.022, 7)), frameAt(s + 2.2), 0.32, "ui", "visit 7 card");
  cue("sfx-08-node3", node(), frameAt(s + 2.4), 0.28, "tonal", "visit 7 node");
  cue("sfx-08-chip-on", one("toggle-on-89", () => toggleOn(89)), frameAt(s + 2.62), 0.32, "tonal", "remembered setting applied");
  cue("sfx-08-out", W.push(), s + 4.0, 0.45, "motion", "push to Frame 9");
}

// ---- Frame 9, opt-in telemetry (40 to 44.9 s)
{
  const s = S[9];
  cue("sfx-09-switch", one("switch", () => toggleSound(midi(81))), frameAt(s + 1.2), 0.48, "ui", "telemetry switch flips on");
  // backspace "off" to "o", type "n", ",", then paste the rest
  const ed = [
    { at: frameAt(s + 1.3), fn: () => key(901, "back"), gain: 0.9 },
    { at: frameAt(s + 1.38), fn: () => key(902, "back"), gain: 0.85 },
    { at: frameAt(s + 1.5), fn: () => key(903, "key"), gain: 0.95 },
    { at: frameAt(s + 1.62), fn: () => key(904, "light"), gain: 0.8 },
    { at: frameAt(s + 1.82), fn: pasteSound, gain: 0.9 },
  ];
  seqCue("sfx-09-edit", "seq-09-edit", ed, 0.55, "ui", "label edited: off to on, paste");
  const rows = [1.65, 1.85, 2.05, 2.25, 2.45, 2.65].map((t, i) => ({ at: frameAt(s + t), fn: () => tap(midi(84 - i), 0.016, 930 + i), gain: 0.6, pan: 0.25 }));
  rows.push({ at: frameAt(s + 2.6), fn: () => pop(midi(86), false, 940), gain: 0.5, pan: 0.4 });
  rows.push({ at: frameAt(s + 2.75), fn: () => pop(midi(89), false, 941), gain: 0.45, pan: 0.4 });
  seqCue("sfx-09-rows", "seq-09-rows", rows, 0.32, "ui", "payload rows and badges");
  cue("sfx-09-strike", one("strike", () => strikeSound(41)), frameAt(s + 2.8), 0.22, "ui", "identifiers struck through");
  cue("sfx-09-out", W.zoom(), s + 4.5 - 0.25, 0.5, "motion", "zoom to Frame 10");
}

// ---- Frame 10, the code (44.5 to 52.6 s)
{
  const s = S[10];
  cue("sfx-10-panel", W.inR(), frameAt(s + 0.3), 0.3, "motion", "terminal and code panel arrive");
  // Character reveal times, the same spread the scene uses: spaces weigh 1.7,
  // letters and digits 1, punctuation 0.85, over [start, end].
  const typed = (text, start, end) => {
    const cum = [];
    let acc = 0;
    for (const c of text) {
      cum.push(acc);
      acc += c === " " ? 1.7 : /[A-Za-z0-9]/.test(c) ? 1 : 0.85;
    }
    const last = cum[cum.length - 1] || 1;
    return [...text].map((c, n) => ({ c, t: start + (end - start) * (cum[n] / last) }));
  };
  const lines = [
    ["term", "npm i framebudget", 0.78, 1.42, "terminal: npm i framebudget"],
    ["a1", 'import { budget } from "framebudget";', 1.72, 2.46, "app.js line 1"],
    ["a3", 'if (budget.allows("parallax")) startParallax();', 2.62, 3.62, "app.js line 3"],
    ["a4", 'budget.on("change", update);', 3.78, 4.36, "app.js line 4"],
    ["b1", 'import { useBudget } from "framebudget/react";', 4.78, 5.36, "Hero.jsx line 1"],
    ["b3", 'const animate = useBudget("pageTransition");', 5.46, 6.0, "Hero.jsx line 3"],
  ];
  let seed = 1000;
  for (const [id, text, a, b, label] of lines) {
    const perFrame = new Map();
    const ev = [];
    for (const { c, t } of typed(text, s + a, s + b)) {
      const at = frameAt(t);
      const n = perFrame.get(at) ?? 0;
      perFrame.set(at, n + 1);
      if (n >= 2) continue; // at most two key sounds per frame, or fast lines turn into a buzz
      const kind = c === " " ? "space" : /[A-Za-z0-9]/.test(c) ? "key" : "light";
      const sd = seed++;
      // a second char in the same frame lands half a frame later, like a fast roll
      ev.push({ at: at + n * 0.016, fn: () => key(sd, kind), gain: (0.75 + rng(sd)() * 0.25) * (n ? 0.8 : 1), pan: id === "term" ? -0.25 : 0.15 });
    }
    seqCue(`sfx-10-type-${id}`, `seq-10-type-${id}`, ev, id === "term" ? 0.6 : 0.58, "keys", `typing, ${label}`);
  }
  cue("sfx-10-tab", one("tap", () => tap(880, 0.022, 7)), frameAt(s + 4.62), 0.3, "ui", "Hero.jsx tab opens");
}

// ---- Frame 11, the end card (52 to 57 s)
{
  const s = S[11];
  const hit = frameAt(s + 0.2) - s;
  files.set("sting-end", stingEnd(hit));
  cue("sfx-11-sting", "sting-end", s, 0.62, "sting", "end card sting", [r4(s), r4(s + hit)]);
  cue("sfx-11-tagline", W.text(), frameAt(s + 1.2), 0.2, "motion", "tagline");
  cue("sfx-11-pill", one("tap-soft", () => tap(1046.5, 0.03, 12)), frameAt(s + 1.8), 0.24, "ui", "npm i framebudget pill");
}

// ---------------------------------------------------------------- write files

function writeWav(path, s) {
  let peak = 0;
  for (let i = 0; i < s.n; i++) peak = Math.max(peak, Math.abs(s.L[i]), Math.abs(s.R[i]));
  const g = peak > 0 ? PEAK / peak : 1;
  // trim trailing near-silence (below -80 dBFS after gain) but keep a 20 ms tail
  let end = s.n;
  while (end > 1 && Math.abs(s.L[end - 1] * g) < 1e-4 && Math.abs(s.R[end - 1] * g) < 1e-4) end--;
  end = Math.min(s.n, end + Math.round(0.02 * SR));
  const data = Buffer.alloc(end * 4);
  const fade = Math.round(0.005 * SR);
  for (let i = 0; i < end; i++) {
    const w = i > end - fade ? (end - i) / fade : 1;
    data.writeInt16LE(Math.round(clamp(s.L[i] * g * w, -1, 1) * 32767), i * 4);
    data.writeInt16LE(Math.round(clamp(s.R[i] * g * w, -1, 1) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write("RIFF", 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28);
  h.writeUInt16LE(4, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([h, data]));
  return end / SR;
}

mkdirSync(OUT_DIR, { recursive: true });
const durations = new Map();
for (const [name, s] of files) durations.set(name, writeWav(join(OUT_DIR, `${name}.wav`), s));

// ---------------------------------------------------------------- lanes and mix

// Studio lanes per sound kind; overlapping cues of one kind spill to the next lane.
const LANE_BASE = { ui: 20, keys: 30, counter: 40, motion: 50, tonal: 60, impact: 70, sting: 80 };
const laneEnds = new Map();
for (const c of cues.sort((a, b) => a.start - b.start || a.id.localeCompare(b.id))) {
  c.duration = r4(durations.get(c.file));
  let lane = LANE_BASE[c.lane];
  while ((laneEnds.get(lane) ?? -1) > c.start + 1e-6) lane++;
  laneEnds.set(lane, c.start + c.duration);
  c.track = lane;
}

// SFX bus: rumble guard, one shared small room so every sound sits in the same
// space, and a ceiling. The fader sets the whole SFX level against the bed.
const SFX_BUS = {
  volume: 0.88,
  chain: {
    version: 1,
    nodes: [
      { type: "highpass", id: "n1", label: "Rumble Guard", params: { frequency: 35, q: 0.707, poles: "2" } },
      { type: "reverb", id: "n2", label: "Shared Room", params: { size: 0.3, damping: 0.6, wet: 0.14, dry: 0.92 } },
      { type: "limiter", id: "n3", label: "SFX Ceiling", params: { limit: -6, attack: 1, release: 60, level_out: 0 } },
    ],
  },
};

// Bed: a level stage and a ceiling, then a volume lane that dips it about
// 1.7 dB under the dense SFX passages and lets it back up slowly.
const BED = {
  volume: 1,
  duck: 0.82,
  chain: {
    version: 1,
    nodes: [
      { type: "gain", id: "n1", label: "Bed Level", params: { gain: 1.9 } },
      { type: "limiter", id: "n2", label: "Bed Ceiling", params: { limit: -4.5, attack: 0.5, release: 120, level_out: 0 } },
    ],
  },
  regions: [
    [8.3, 10.6, "budget segments"],
    [13.55, 16.4, "logo sting"],
    [23.3, 25.3, "score counters"],
    [27.7, 29.7, "threshold sweep"],
    [32.3, 34.4, "governor"],
    [41.15, 42.95, "telemetry edit"],
    [45.2, 50.6, "code typing"],
    [52.0, 54.6, "end sting"],
  ],
};
const lanePoints = [{ t: 0, v: BED.volume }];
for (const [a, b] of BED.regions) {
  lanePoints.push({ t: r4(a - 0.15), v: BED.volume }, { t: r4(a), v: BED.duck }, { t: r4(b), v: BED.duck }, { t: r4(b + 0.6), v: BED.volume });
}
const bedAutomation = { version: 1, lanes: [{ target: "volume", points: lanePoints }] };

writeFileSync(
  join(OUT_DIR, "cues.json"),
  JSON.stringify(
    {
      generatedBy: "scripts/make-sfx.mjs",
      fps: FPS,
      sampleRate: SR,
      filePeakDbfs: -3,
      bus: { id: "sfx", volume: SFX_BUS.volume, chain: SFX_BUS.chain },
      bed: { id: "el-bgm", volume: BED.volume, chain: BED.chain, automation: bedAutomation, duckRegions: BED.regions },
      cues: cues.map(({ id, file, start, duration, volume, track, label, events }) => ({ id, file: `assets/audio/sfx/${file}.wav`, start, duration, volume, track, label, ...(events ? { events } : {}) })),
    },
    null,
    2,
  ) + "\n",
);

console.log(`make-sfx: ${files.size} files, ${cues.length} cues in assets/audio/sfx/`);

// ---------------------------------------------------------------- place in index.html

if (PLACE) {
  const attr = (o) => JSON.stringify(o).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const indexPath = join(ROOT, "index.html");
  let html = readFileSync(indexPath, "utf8");
  const bed = [
    `      <!-- BGM -->`,
    `      <audio`,
    `        id="el-bgm"`,
    `        src="assets/audio/bed.wav"`,
    `        data-start="0"`,
    `        data-duration="57"`,
    `        data-track-index="11"`,
    `        data-volume="${BED.volume}"`,
    `        data-fx-chain="${attr(BED.chain)}"`,
    `        data-automation="${attr(bedAutomation)}"`,
    `      ></audio>`,
  ].join("\n");
  const sfx = [
    `      <!-- SFX (generated by scripts/make-sfx.mjs, do not edit by hand) -->`,
    `      <hf-audio-group id="sfx" data-label="SFX" data-volume="${SFX_BUS.volume}" data-fx-chain="${attr(SFX_BUS.chain)}"></hf-audio-group>`,
    ...cues.map(
      (c) =>
        `      <audio id="${c.id}" src="assets/audio/sfx/${c.file}.wav" data-start="${c.start}" data-duration="${c.duration}" data-track-index="${c.track}" data-volume="${c.volume}" data-audio-group="sfx"></audio>`,
    ),
    `      <!-- /SFX -->`,
  ].join("\n");
  const bedRe = /      <!-- BGM -->\n      <audio\n        id="el-bgm"[\s\S]*?<\/audio>/;
  if (!bedRe.test(html)) throw new Error("make-sfx: BGM block not found in index.html");
  html = html.replace(bedRe, bed);
  const sfxRe = /\n      <!-- SFX \(generated[\s\S]*?<!-- \/SFX -->/;
  if (sfxRe.test(html)) html = html.replace(sfxRe, `\n${sfx}`);
  else html = html.replace(bed, `${bed}\n\n${sfx}`);
  writeFileSync(indexPath, html);
  console.log("make-sfx: placed bed chain, duck lane, SFX bus and cues in index.html");
}
