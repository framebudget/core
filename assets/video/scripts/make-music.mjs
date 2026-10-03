#!/usr/bin/env node
// Generates the video's music bed locally: a deterministic synth pad, a soft
// arpeggio and a gentle low pulse, written as a 16-bit stereo WAV. No samples,
// no network, no accounts: the output is original and royalty-free.
//
//   node scripts/make-music.mjs [--out assets/audio/bed.wav] [--seconds 57]
//
// Chord changes land on the frame boundaries of STORYBOARD.md. During the first
// frame (the stutter) the pad is gated in uneven drops, echoing the dropped frames.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
};
const OUT = arg("out", "assets/audio/bed.wav");
const SECONDS = Number(arg("seconds", "57"));
const SR = 44100;
const N = Math.round(SECONDS * SR);
const TAU = Math.PI * 2;

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// [start seconds, chord as MIDI notes]. Key of F major / D minor.
const CHORDS = [
  [0.0, [50, 57, 60, 64, 65]], // Dm9 (D A C E F)
  [7.0, [46, 53, 57, 60, 62]], // Bbmaj9
  [13.5, [41, 53, 57, 60, 64]], // Fmaj7 (release, the product name)
  [17.5, [50, 57, 60, 65, 69]], // Dm7
  [22.0, [46, 53, 58, 62, 65]], // Bbmaj7
  [26.5, [41, 53, 57, 60, 64]], // Fmaj7
  [31.0, [48, 55, 60, 64, 67]], // C
  [36.0, [50, 57, 60, 65, 69]], // Dm7
  [40.0, [46, 53, 58, 62, 65]], // Bbmaj7
  [44.5, [43, 55, 58, 62, 65]], // Gm7 (the code)
  [48.5, [48, 55, 60, 64, 67]], // C
  [52.0, [41, 53, 57, 60, 64, 67]], // Fmaj9 (end card)
];

const chordAt = (t) => {
  let idx = 0;
  for (let i = 0; i < CHORDS.length; i++) if (t >= CHORDS[i][0]) idx = i;
  return idx;
};

// Smooth crossfade weight for chord i at time t (1.2 s overlap).
const XF = 1.2;
const chordWeight = (i, t) => {
  const start = CHORDS[i][0];
  const end = i + 1 < CHORDS.length ? CHORDS[i + 1][0] : SECONDS + 10;
  const fadeIn = i === 0 ? 1 : Math.min(1, Math.max(0, (t - start + XF / 2) / XF));
  const fadeOut = Math.min(1, Math.max(0, (end + XF / 2 - t) / XF));
  const w = Math.min(fadeIn, fadeOut);
  return w * w * (3 - 2 * w);
};

// Uneven gate during the stutter (2.2 s to 7.0 s): drops of 2 to 5 video frames.
const FRAME = 1 / 30;
const STUTTER = [];
{
  let t = 2.2;
  let k = 0;
  const holds = [7, 3, 9, 2, 5, 11, 4, 6, 3, 8, 2, 10, 5, 3, 7, 4];
  const drops = [2, 4, 3, 5, 2, 3, 4, 2, 5, 3, 4, 2, 3, 5, 2, 4];
  while (t < 7.0) {
    t += holds[k % holds.length] * FRAME;
    const d = drops[k % drops.length] * FRAME;
    STUTTER.push([t, t + d]);
    t += d;
    k++;
  }
}
const gate = (t) => {
  for (const [a, b] of STUTTER) {
    if (t >= a - 0.004 && t < b + 0.004) {
      const edge = Math.min(t - (a - 0.004), b + 0.004 - t) / 0.004;
      return 0.18 + 0.82 * (1 - Math.min(1, edge));
    }
  }
  return 1;
};

const L = new Float32Array(N);
const R = new Float32Array(N);

// Pad: each note is three slightly detuned voices with a few soft harmonics,
// through a one-pole low-pass whose cutoff opens over the film.
const detune = [-0.07, 0, 0.065];
const phases = new Map();
const lp = { l: 0, r: 0 };
for (let n = 0; n < N; n++) {
  const t = n / SR;
  let l = 0;
  let r = 0;
  const ci = chordAt(t);
  for (let i = Math.max(0, ci - 1); i <= Math.min(CHORDS.length - 1, ci + 1); i++) {
    const w = chordWeight(i, t);
    if (w <= 0) continue;
    const notes = CHORDS[i][1];
    for (let j = 0; j < notes.length; j++) {
      const f0 = midi(notes[j]);
      for (let v = 0; v < 3; v++) {
        const key = `${i}:${j}:${v}`;
        const f = f0 * Math.pow(2, detune[v] / 12);
        const ph = (phases.get(key) ?? (j * 0.37 + v * 0.21)) + f / SR;
        phases.set(key, ph - Math.floor(ph));
        const x = Math.sin(TAU * ph) + 0.32 * Math.sin(TAU * 2 * ph) + 0.12 * Math.sin(TAU * 3 * ph);
        const pan = 0.5 + 0.35 * Math.sin(j * 1.7 + v * 2.3);
        const amp = (notes[j] < 48 ? 0.9 : 0.55) * w;
        l += x * amp * (1 - pan);
        r += x * amp * pan;
      }
    }
  }
  const cutoff = 700 + 1100 * Math.min(1, t / 20);
  const a = 1 - Math.exp((-TAU * cutoff) / SR);
  lp.l += a * (l - lp.l);
  lp.r += a * (r - lp.r);
  const g = gate(t) * 0.055;
  L[n] = lp.l * g;
  R[n] = lp.r * g;
}

// Arpeggio: soft plucks on eighth notes (120 BPM) from 17.5 s to 52 s.
const EIGHTH = 0.25;
const PATTERN = [1, 2, 3, 2, 4, 3, 2, 3];
for (let k = 0; ; k++) {
  const t0 = 17.5 + k * EIGHTH;
  if (t0 >= 52.0) break;
  const notes = CHORDS[chordAt(t0 + 0.01)][1];
  const note = notes[PATTERN[k % PATTERN.length] % notes.length] + 12;
  const f = midi(note);
  const accent = k % 4 === 0 ? 1 : 0.65;
  const pan = 0.5 + 0.3 * Math.sin(k * 0.9);
  const len = Math.round(1.1 * SR);
  const s0 = Math.round(t0 * SR);
  for (let m = 0; m < len && s0 + m < N; m++) {
    const tt = m / SR;
    const env = (1 - Math.exp(-tt * 400)) * Math.exp(-tt * 5.5);
    const x = (Math.sin(TAU * f * tt) + 0.2 * Math.sin(TAU * 2 * f * tt) * Math.exp(-tt * 12)) * env * 0.05 * accent;
    L[s0 + m] += x * (1 - pan);
    R[s0 + m] += x * pan;
  }
}

// Low pulse on each beat during the mechanism section, felt more than heard.
for (let k = 0; ; k++) {
  const t0 = 17.5 + k * 0.5;
  if (t0 >= 44.5) break;
  const s0 = Math.round(t0 * SR);
  const len = Math.round(0.35 * SR);
  for (let m = 0; m < len && s0 + m < N; m++) {
    const tt = m / SR;
    const f = 55 + 40 * Math.exp(-tt * 30);
    const x = Math.sin(TAU * f * tt) * Math.exp(-tt * 14) * (k % 2 === 0 ? 0.11 : 0.06);
    L[s0 + m] += x;
    R[s0 + m] += x;
  }
}

// Small Schroeder reverb for space.
function reverb(input, seed) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + seed), i: 0, f: 0 }));
  const aps = [225, 556].map((d) => ({ buf: new Float32Array(d + seed), i: 0 }));
  const out = new Float32Array(input.length);
  for (let n = 0; n < input.length; n++) {
    const x = input[n];
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.f = y * 0.8 + c.f * 0.2;
      c.buf[c.i] = x + c.f * 0.84;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    s *= 0.25;
    for (const ap of aps) {
      const y = ap.buf[ap.i];
      ap.buf[ap.i] = s + y * 0.5;
      ap.i = (ap.i + 1) % ap.buf.length;
      s = y - s * 0.5;
    }
    out[n] = s;
  }
  return out;
}
const wetL = reverb(L, 0);
const wetR = reverb(R, 23);

// Mix, master fade in/out, normalize to -3 dBFS peak.
const outL = new Float32Array(N);
const outR = new Float32Array(N);
let peak = 0;
for (let n = 0; n < N; n++) {
  const t = n / SR;
  const fade = Math.min(1, t / 0.6) * Math.min(1, Math.max(0, (SECONDS - t) / 2.5));
  outL[n] = (L[n] * 0.75 + wetL[n] * 0.45) * fade;
  outR[n] = (R[n] * 0.75 + wetR[n] * 0.45) * fade;
  peak = Math.max(peak, Math.abs(outL[n]), Math.abs(outR[n]));
}
const norm = peak > 0 ? 0.708 / peak : 1;

const data = Buffer.alloc(N * 4);
for (let n = 0; n < N; n++) {
  const l = Math.max(-1, Math.min(1, outL[n] * norm));
  const r = Math.max(-1, Math.min(1, outR[n] * norm));
  data.writeInt16LE(Math.round(l * 32767), n * 4);
  data.writeInt16LE(Math.round(r * 32767), n * 4 + 2);
}
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + data.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(SR, 24);
header.writeUInt32LE(SR * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(data.length, 40);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, Buffer.concat([header, data]));
console.log(`wrote ${OUT} (${SECONDS}s, peak normalized from ${peak.toFixed(3)})`);
