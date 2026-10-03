// Markdown for one release: the CHANGELOG.md section, the GitHub release body,
// the changelog pull request body, and the data the release art shows. Sections
// come from release.config.json, in config order.
import { GROUPS, GROUP_TITLES, countEntries } from "./commits.mjs";

function formatEntry(commit, repo) {
  const scope = commit.scope ? `**${commit.scope}:** ` : "";
  const short = commit.sha.slice(0, 7);
  const sha = repo ? `[${short}](https://github.com/${repo}/commit/${commit.sha})` : short;
  const pr = commit.pr && repo ? ` ([#${commit.pr}](https://github.com/${repo}/pull/${commit.pr}))` : "";
  return `- ${scope}${commit.description} (${sha})${pr}`;
}

function renderGroups(groups, repo, level) {
  if (countEntries(groups) === 0) return "No changes.";
  return GROUPS.filter((group) => groups[group].length > 0)
    .map((group) => {
      const entries = groups[group].map((commit) => formatEntry(commit, repo)).join("\n");
      return `${"#".repeat(level)} ${GROUP_TITLES[group]}\n\n${entries}`;
    })
    .join("\n\n");
}

/** One heading per section at `level` (its groups one level deeper). */
export function renderSections({ release, sections, repo }, level) {
  return sections
    .map((section) => `${"#".repeat(level)} ${section.title}\n\n${renderGroups(release[section.id], repo, level + 1)}`)
    .join("\n\n");
}

/** The section prepended to CHANGELOG.md. */
export function renderChangelogSection(notes) {
  return `## [${notes.version}] - ${notes.date}\n\n${renderSections(notes, 3)}\n`;
}

function compareLine({ repo, previousTag, tag }) {
  if (!repo) return "";
  const path = previousTag ? `compare/${previousTag}...${tag}` : `commits/${tag}`;
  return `\n\n**Full changelog:** https://github.com/${repo}/${path}`;
}

/** The GitHub release body: the art, then the same content as the changelog. */
export function renderReleaseBody(notes) {
  const art = notes.artUrl ? `![${notes.label} ${notes.tag}](${notes.artUrl})\n\n` : "";
  return `${art}${renderSections(notes, 2)}${compareLine(notes)}\n`;
}

/** The body of the `chore(release)` pull request. */
export function renderPullRequestBody(notes) {
  const release = notes.repo ? `https://github.com/${notes.repo}/releases/tag/${notes.tag}` : notes.tag;
  return [
    `Changelog for ${notes.tag} (${release}).`,
    "",
    `- prepend ${notes.tag} to \`CHANGELOG.md\``,
    "",
    renderSections(notes, 2),
    "",
  ].join("\n");
}

/** Up to `limit` entries for the art: breaking first, sections in config order, no repeats. */
export function highlights({ release, sections }, limit = 3) {
  const seen = new Map();
  for (const group of GROUPS) {
    for (const section of sections) {
      for (const commit of release[section.id][group]) {
        const entry = seen.get(commit.sha) ?? { text: commit.description, group, sections: [] };
        entry.sections.push(section.title);
        seen.set(commit.sha, entry);
      }
    }
  }
  return [...seen.values()].slice(0, limit);
}

/** notes.json: what render-art.mjs needs to draw the release card. */
export function artNotes(notes) {
  return {
    version: notes.version,
    date: notes.date,
    label: notes.label,
    counts: notes.sections.map(({ id, title }) => ({ id, title, count: countEntries(notes.release[id]) })),
    highlights: highlights(notes),
  };
}
