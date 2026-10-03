// release.config.json: the card label and the sections a release is split into.
// A section path ending in `/` matches by prefix, any other path matches exactly.
import { readFileSync } from "node:fs";

const ID = /^[a-z][\w-]*$/;

function isText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function checkSection(section, index) {
  const where = `sections[${index}]`;
  if (!section || typeof section !== "object") return `${where} must be an object`;
  if (!ID.test(section.id ?? "")) return `${where}.id must match ${ID}`;
  if (!isText(section.title)) return `${where}.title must be a non-empty string`;
  if (!Array.isArray(section.paths) || section.paths.length === 0 || !section.paths.every(isText)) {
    return `${where}.paths must be a non-empty array of paths`;
  }
  return null;
}

/** The problems with a parsed config, empty when it is valid. */
export function configErrors(config) {
  if (!config || typeof config !== "object") return ["the config must be an object"];
  const errors = isText(config.label) ? [] : ["label must be a non-empty string"];
  if (!Array.isArray(config.sections) || config.sections.length === 0) {
    return [...errors, "sections must be a non-empty array"];
  }
  errors.push(...config.sections.map(checkSection).filter(Boolean));
  const ids = config.sections.map((section) => section?.id);
  const repeated = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (repeated.length > 0) errors.push(`section ids must be unique: ${[...new Set(repeated)].join(", ")}`);
  return errors;
}

/** Reads and validates a release config; throws with every problem found. */
export function loadConfig(file) {
  const config = JSON.parse(readFileSync(file, "utf8"));
  const errors = configErrors(config);
  if (errors.length > 0) throw new Error(`${file}: ${errors.join("; ")}`);
  return config;
}

/** True when `file` is under a `dir/` path or equals a file path. */
export function matchesPath(path, file) {
  return path.endsWith("/") ? file.startsWith(path) : file === path;
}

/** The ids of the sections the changed `files` touch, in config order. */
export function sectionsOf(files, sections) {
  return sections
    .filter((section) => section.paths.some((path) => files.some((file) => matchesPath(path, file))))
    .map((section) => section.id);
}
