#!/usr/bin/env node
// Renders the release card (framebudget/assets brand/build/release.html) to a
// 1200x630 PNG with headless Chrome.
//
//   node scripts/release/render-art.mjs --template .brand/brand/build/release.html \
//     --version 0.2.0 --date 2026-10-03 --notes notes.json --out art.png
//
// --notes is the notes.json written by notes.mjs (1 to 3 counts). Chrome comes from
// CHROME_PATH or `google-chrome` on PATH. Fails when the brand fonts did not load.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const KINDS = { breaking: "Breaking", features: "Feature", fixes: "Fix", performance: "Performance", other: "Change" };
const USAGE =
  "usage: render-art.mjs --template release.html [--version X.Y.Z] [--date YYYY-MM-DD] --notes notes.json --out art.png";

const { values: options } = parseArgs({
  options: {
    template: { type: "string" },
    version: { type: "string" },
    date: { type: "string" },
    notes: { type: "string" },
    out: { type: "string" },
  },
});

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function escapeHtml(text) {
  return String(text).replaceAll(/[&<>"']/g, (char) => `&#${char.codePointAt(0)};`);
}

// A break opportunity after each `/`, so `@framebudget/react` wraps as a scope over a name.
function breakable(title) {
  return escapeHtml(title).replaceAll("/", "/<wbr>");
}

// Each section keeps its card's position color (1 to 3) wherever it appears.
function renderSection(title, counts) {
  const position = counts.findIndex((count) => count.title === title) + 1;
  return `<span class="section s${position}">${escapeHtml(title)}</span>`;
}

function renderChange({ group, text, sections }, counts) {
  const description = text.charAt(0).toUpperCase() + text.slice(1);
  const titles = sections.map((title) => renderSection(title, counts)).join("");
  return `<div class="change ${group}"><span class="kind">${KINDS[group]}</span><span class="text">${escapeHtml(description)}</span><span class="sections">${titles}</span></div>`;
}

function renderCount({ title, count }, index) {
  return `<div class="count s${index + 1}"><b>${count}</b><span>${breakable(title)}</span></div>`;
}

function slots({ version, date, label, counts, highlights }) {
  const tag = `v${version.replace(/^v/, "")}`;
  const changes = highlights.map((entry) => renderChange(entry, counts));
  const empty = '<div class="change empty"><span class="text">Maintenance release: no listed changes.</span></div>';
  return {
    date: `<div class="date"><span>released</span> ${escapeHtml(date)}</div>`,
    label: `<div class="label">${escapeHtml(label)}</div>`,
    version: `<h1 class="version" style="--chars: ${tag.length}"><span>${escapeHtml(tag)}</span></h1>`,
    counts: `<div class="counts">${counts.map(renderCount).join("")}</div>`,
    changes: `<div class="changes">${changes.length > 0 ? changes.join("") : empty}</div>`,
  };
}

function fillTemplate(template, values) {
  const html = Object.entries(values).reduce(
    (text, [slot, content]) => {
      const pattern = new RegExp(`<!-- fb:${slot} -->[\\s\\S]*?<!-- /fb:${slot} -->`);
      if (!pattern.test(text)) fail(`${template} has no fb:${slot} slot`);
      return text.replace(pattern, () => content);
    },
    readFileSync(template, "utf8"),
  );
  // The filled page lives in a temp dir; resolve its relative links from the template's folder.
  return html.replace("<head>", `<head>\n<base href="${pathToFileURL(path.dirname(template))}/">`);
}

function chrome(args, profile) {
  const binary = process.env.CHROME_PATH || "google-chrome";
  // GitHub's Ubuntu runners forbid the sandbox's user namespaces; the page is our own local file.
  const sandbox = process.env.CI ? ["--no-sandbox"] : [];
  const common = ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${profile}`];
  return execFileSync(binary, [...common, ...sandbox, "--virtual-time-budget=10000", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024,
  });
}

if (!options.template || !options.notes || !options.out) fail(USAGE);
const template = path.resolve(options.template);
const notes = JSON.parse(readFileSync(options.notes, "utf8"));
const values = { ...notes, version: options.version ?? notes.version, date: options.date ?? notes.date };
if (!values.version || !values.date) fail("--version and --date are required when notes.json lacks them");
if (typeof values.label !== "string") fail("notes.json has no label (write it with notes.mjs)");
if (!Array.isArray(values.counts) || values.counts.length < 1 || values.counts.length > 3) {
  fail("notes.json must have 1 to 3 counts (release.config.json sections)");
}
if (!Array.isArray(values.highlights)) fail("notes.json has no highlights");

const work = mkdtempSync(path.join(tmpdir(), "framebudget-art-"));
try {
  const page = path.join(work, "release.html");
  writeFileSync(page, fillTemplate(template, slots(values)));
  const url = pathToFileURL(page).href;
  const fonts = /data-fonts="(\w+)"/.exec(chrome(["--dump-dom", url], path.join(work, "profile")))?.[1];
  if (fonts !== "loaded")
    fail(`brand fonts did not load from ${path.dirname(template)} (status: ${fonts ?? "unknown"})`);
  const out = path.resolve(options.out);
  mkdirSync(path.dirname(out), { recursive: true });
  chrome([`--screenshot=${out}`, "--window-size=1200,630", url], path.join(work, "profile"));
  console.log(`wrote ${out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
