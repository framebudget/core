#!/usr/bin/env node
// Renders the release card (assets/brand/build/release.html) to a 1200x630 PNG
// with headless Chrome.
//
//   node scripts/release/render-art.mjs --version 0.2.0 --date 2026-10-03 --notes notes.json --out art.png
//
// --notes is the notes.json written by notes.mjs. Chrome comes from CHROME_PATH
// or `google-chrome` on PATH. Fails when the brand fonts did not load.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const TEMPLATE = fileURLToPath(new URL("../../assets/brand/build/release.html", import.meta.url));
const KINDS = { breaking: "Breaking", features: "Feature", fixes: "Fix", performance: "Performance", other: "Change" };

const { values: options } = parseArgs({
  options: {
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

function renderChange({ group, text, areas }) {
  const description = text.charAt(0).toUpperCase() + text.slice(1);
  return `<div class="change ${group}"><span class="kind">${KINDS[group]}</span><span class="text">${escapeHtml(description)}</span><span class="areas">${escapeHtml(areas.join(", ").toLowerCase())}</span></div>`;
}

function slots({ version, date, counts, highlights }) {
  const tag = `v${version.replace(/^v/, "")}`;
  const changes = highlights.length > 0 ? highlights.map(renderChange) : [];
  const empty = '<div class="change empty"><span class="text">Maintenance release: no listed changes.</span></div>';
  return {
    date: `<div class="date"><span>released</span> ${escapeHtml(date)}</div>`,
    version: `<h1 class="version" style="--chars: ${tag.length}">${escapeHtml(tag)}</h1>`,
    counts: `<div class="counts">${Object.entries(counts)
      .map(([area, count]) => `<div class="count ${area.toLowerCase()}"><b>${count}</b><span>${area}</span></div>`)
      .join("")}</div>`,
    changes: `<div class="changes">${changes.length > 0 ? changes.join("") : empty}</div>`,
  };
}

function fillTemplate(values) {
  const html = Object.entries(values).reduce(
    (text, [slot, content]) =>
      text.replace(new RegExp(`<!-- fb:${slot} -->[\\s\\S]*?<!-- /fb:${slot} -->`), () => content),
    readFileSync(TEMPLATE, "utf8"),
  );
  // The filled page lives in a temp dir; resolve its relative links from the template's folder.
  return html.replace("<head>", `<head>\n<base href="${pathToFileURL(path.dirname(TEMPLATE))}/">`);
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

if (!options.notes || !options.out)
  fail("usage: render-art.mjs --version X.Y.Z --date YYYY-MM-DD --notes notes.json --out art.png");
const notes = JSON.parse(readFileSync(options.notes, "utf8"));
const values = { ...notes, version: options.version ?? notes.version, date: options.date ?? notes.date };
if (!values.version || !values.date) fail("--version and --date are required when notes.json lacks them");

const work = mkdtempSync(path.join(tmpdir(), "framebudget-art-"));
try {
  const page = path.join(work, "release.html");
  writeFileSync(page, fillTemplate(slots(values)));
  const url = pathToFileURL(page).href;
  const fonts = /data-fonts="(\w+)"/.exec(chrome(["--dump-dom", url], path.join(work, "profile")))?.[1];
  if (fonts !== "loaded")
    fail(`brand fonts did not load from ${path.dirname(TEMPLATE)} (status: ${fonts ?? "unknown"})`);
  const out = path.resolve(options.out);
  mkdirSync(path.dirname(out), { recursive: true });
  chrome([`--screenshot=${out}`, "--window-size=1200,630", url], path.join(work, "profile"));
  console.log(`wrote ${out}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
