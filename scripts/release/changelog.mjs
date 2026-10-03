// Places a release section in CHANGELOG.md: newest first, under the intro.
// Running it again for the same version replaces that version's section.

export const CHANGELOG_INTRO = `# Changelog

Every release of framebudget, newest first, split by what shipped: the library (the npm package) and the website (framebudget.dev).
`;

const SECTION_START = /^## \[/m;

function escapeRegExp(text) {
  return text.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`);
}

/** The changelog text with `section` for `version` in place. */
export function insertSection(changelog, version, section) {
  const text = changelog.trim() ? changelog : CHANGELOG_INTRO;
  const existing = new RegExp(String.raw`^## \[${escapeRegExp(version)}\][^\n]*\n[\s\S]*?(?=^## \[|(?![\s\S]))`, "m");
  const start = SECTION_START.exec(text);
  if (existing.test(text)) return `${text.replace(existing, `${section}\n`).trimEnd()}\n`;
  if (!start) return `${text.trimEnd()}\n\n${section}`;
  return `${text.slice(0, start.index)}${section}\n${text.slice(start.index)}`;
}
