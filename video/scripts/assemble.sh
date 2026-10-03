#!/usr/bin/env bash
# Rebuilds index.html from STORYBOARD.md and compositions/frames/*.html, then makes it
# fully offline: GSAP from assets/vendor, no CDN, no em/en dashes in the output.
# Requires the product-launch-video HyperFrames skill (npx hyperframes skills update product-launch-video).
set -euo pipefail
cd "$(dirname "$0")/.."
SKILL="${HF_SKILLS_DIR:-$HOME/.claude/skills}/product-launch-video/scripts"

[ -f assets/audio/bed.wav ] || node scripts/make-music.mjs
node "$SKILL/assemble-index.mjs" --storyboard ./STORYBOARD.md --hyperframes . --audio-meta ./audio_meta.json
node "$SKILL/transitions.mjs" inject --storyboard ./STORYBOARD.md --hyperframes .
node "$SKILL/transitions.mjs" verify --storyboard ./STORYBOARD.md --index ./index.html
# Sound design: synthesizes assets/audio/sfx/*.wav and places the bed chain,
# duck lane, SFX bus and cues in index.html (assemble-index.mjs only knows plain clips).
node scripts/make-sfx.mjs

sed -i -E \
  -e 's#<script src="https://cdn\.jsdelivr\.net/npm/gsap@[^"]*/dist/gsap\.min\.js"[^>]*></script>#<script src="assets/vendor/gsap.min.js"></script>#' \
  -e 's/ \xE2\x80\x94 /, /g' -e 's/\xE2\x80\x94/-/g' -e 's/\xE2\x80\x93/-/g' \
  index.html

if grep -q 'https\?://' index.html; then
  grep -n 'https\?://' index.html >&2
  echo "assemble.sh: index.html still references a network URL" >&2
  exit 1
fi
echo "assemble.sh: index.html is offline"
