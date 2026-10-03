// Markdown for one release: the CHANGELOG.md section, the GitHub release body,
// the changelog pull request body, and the data the release art shows.
import { AREAS, GROUPS, GROUP_TITLES, countEntries } from "./commits.mjs";

const AREA_TITLES = { library: "Library", website: "Website" };

function formatEntry(commit, repo) {
  const scope = commit.scope ? `**${commit.scope}:** ` : "";
  const short = commit.sha.slice(0, 7);
  const sha = repo ? `[${short}](https://github.com/${repo}/commit/${commit.sha})` : short;
  const pr = commit.pr && repo ? ` ([#${commit.pr}](https://github.com/${repo}/pull/${commit.pr}))` : "";
  return `- ${scope}${commit.description} (${sha})${pr}`;
}

function renderArea(groups, repo, level) {
  if (countEntries(groups) === 0) return "No changes.";
  return GROUPS.filter((group) => groups[group].length > 0)
    .map((group) => {
      const entries = groups[group].map((commit) => formatEntry(commit, repo)).join("\n");
      return `${"#".repeat(level)} ${GROUP_TITLES[group]}\n\n${entries}`;
    })
    .join("\n\n");
}

/** Library and Website sections, headed at `level` (their groups one level deeper). */
export function renderAreas(release, repo, level) {
  return AREAS.map(
    (area) => `${"#".repeat(level)} ${AREA_TITLES[area]}\n\n${renderArea(release[area], repo, level + 1)}`,
  ).join("\n\n");
}

/** The section prepended to CHANGELOG.md. */
export function renderChangelogSection({ version, date, release, repo }) {
  return `## [${version}] - ${date}\n\n${renderAreas(release, repo, 3)}\n`;
}

function compareLine({ repo, previousTag, tag }) {
  if (!repo) return "";
  const path = previousTag ? `compare/${previousTag}...${tag}` : `commits/${tag}`;
  return `\n\n**Full changelog:** https://github.com/${repo}/${path}`;
}

/** The GitHub release body: the art, then the same content as the changelog. */
export function renderReleaseBody(notes) {
  const art = notes.artUrl ? `![framebudget ${notes.tag}](${notes.artUrl})\n\n` : "";
  return `${art}${renderAreas(notes.release, notes.repo, 2)}${compareLine(notes)}\n`;
}

/** The body of the `chore(release)` pull request. */
export function renderPullRequestBody(notes) {
  const release = notes.repo ? `https://github.com/${notes.repo}/releases/tag/${notes.tag}` : notes.tag;
  return [
    `Changelog for ${notes.tag} (${release}).`,
    "",
    "- prepend the release to `CHANGELOG.md`",
    `- set the package version to ${notes.version}`,
    `- add the release art at \`docs/public/releases/${notes.tag}.png\``,
    "",
    renderAreas(notes.release, notes.repo, 2),
    "",
  ].join("\n");
}

/** Up to `limit` entries for the art: breaking first, library before website, no repeats. */
export function highlights(release, limit = 3) {
  const seen = new Map();
  for (const group of GROUPS) {
    for (const area of AREAS) {
      for (const commit of release[area][group]) {
        const entry = seen.get(commit.sha) ?? { text: commit.description, group, areas: [] };
        entry.areas.push(AREA_TITLES[area]);
        seen.set(commit.sha, entry);
      }
    }
  }
  return [...seen.values()].slice(0, limit);
}

/** What render-art.mjs needs to draw the release card. */
export function artNotes({ version, date, release }) {
  return {
    version,
    date,
    counts: Object.fromEntries(AREAS.map((area) => [AREA_TITLES[area], countEntries(release[area])])),
    highlights: highlights(release),
  };
}
