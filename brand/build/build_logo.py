"""Build every framebudget logo SVG from one geometry source.

Run from the brand/ directory:
    uv run --with fonttools --with brotli --with uharfbuzz python build/build_logo.py

The wordmark is set in Archivo (OFL) and converted to outlines, so the SVGs
need no font at render time.
"""

from io import BytesIO
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / "logo"
FONT = ROOT / "fonts" / "archivo-var.woff2"

WORD = "framebudget"
WEIGHT = 680
WIDTH = 108
TRACKING = -0.012  # em

INK = "#161A2E"
CHALK = "#E8EBF2"  # text on Night, the default dark page
WHITE = "#FFFFFF"
VSYNC = "#FF5A92"
AMBER = "#F2B21B"
VIOLET = "#9474F2"
MINT = "#2FB67C"

# Mark geometry on a 32 unit grid. Three pieces of work run end to end
# (script, render, paint), each on its own row like a profiler flame chart,
# and all of it finishes before the vsync line at x=25.
TILE = (0, 0, 32, 32, 8)
BARS = [
    (4, 5, 9, 6, AMBER),
    (13, 13, 6, 6, VIOLET),
    (19, 21, 4, 6, MINT),
]
LINE = (25, 3, 2.5, 26)
BAR_RX = 1
LINE_RX = 1.25

ASCENDER_TOP = 5.0  # wordmark ascenders align with the top of the first bar
BASELINE = 27.0  # wordmark baseline aligns with the bottom of the last bar
GAP = 9.0  # space between mark and wordmark in the lockup


def n(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def rect(x, y, w, h, rx, fill=None) -> str:
    f = f' fill="{fill}"' if fill else ""
    return f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}" rx="{n(rx)}"{f}/>'


def rounded_rect_path(x, y, w, h, r) -> str:
    """Clockwise rounded rectangle as path data (for even-odd knockouts)."""
    return (
        f"M{n(x + r)} {n(y)}H{n(x + w - r)}A{n(r)} {n(r)} 0 0 1 {n(x + w)} {n(y + r)}"
        f"V{n(y + h - r)}A{n(r)} {n(r)} 0 0 1 {n(x + w - r)} {n(y + h)}"
        f"H{n(x + r)}A{n(r)} {n(r)} 0 0 1 {n(x)} {n(y + h - r)}"
        f"V{n(y + r)}A{n(r)} {n(r)} 0 0 1 {n(x + r)} {n(y)}Z"
    )


def wordmark_path():
    """Return (path_data, width, top, bottom) in mark units, baseline at BASELINE."""
    font = TTFont(FONT)
    static = instancer.instantiateVariableFont(font, {"wght": WEIGHT, "wdth": WIDTH})
    static.flavor = None
    buf = BytesIO()
    static.save(buf)
    data = buf.getvalue()

    upem = static["head"].unitsPerEm
    hb_font = hb.Font(hb.Face(hb.Blob(data)))
    hb_buf = hb.Buffer()
    hb_buf.add_str(WORD)
    hb_buf.guess_segment_properties()
    hb.shape(hb_font, hb_buf, {"kern": True, "liga": False})

    glyph_set = static.getGlyphSet()
    order = static.getGlyphOrder()

    asc_pen = BoundsPen(glyph_set)
    glyph_set[static.getBestCmap()[ord("b")]].draw(asc_pen)
    ascender = asc_pen.bounds[3]
    scale = (BASELINE - ASCENDER_TOP) / ascender
    track = TRACKING * upem

    pen = SVGPathPen(glyph_set, ntos=n)
    bounds = BoundsPen(glyph_set)
    x = 0.0
    for i, (info, pos) in enumerate(zip(hb_buf.glyph_infos, hb_buf.glyph_positions)):
        name = order[info.codepoint]
        t = (scale, 0, 0, -scale, (x + pos.x_offset) * scale, BASELINE)
        glyph_set[name].draw(TransformPen(pen, t))
        glyph_set[name].draw(TransformPen(bounds, t))
        x += pos.x_advance + (track if i < len(WORD) - 1 else 0)
    xmin, ymin, xmax, ymax = bounds.bounds
    return pen.getCommands(), xmin, xmax, ymin, ymax


def svg(view_w, view_h, body, title, x0=0) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{n(x0)} 0 {n(view_w)} {n(view_h)}" '
        f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
    )


def mark_body(tile_fill, line_fill, bar_fills=None, tile=True) -> str:
    parts = []
    if tile:
        x, y, w, h, r = TILE
        parts.append(rect(x, y, w, h, r, tile_fill))
    for i, (x, y, w, h, c) in enumerate(BARS):
        parts.append(rect(x, y, w, h, BAR_RX, bar_fills[i] if bar_fills else c))
    lx, ly, lw, lh = LINE
    parts.append(rect(lx, ly, lw, lh, LINE_RX, line_fill))
    return "".join(parts)


def mono_mark_body(color) -> str:
    """Single color: the tile with bars and vsync line knocked out."""
    x, y, w, h, r = TILE
    d = rounded_rect_path(x, y, w, h, r)
    for bx, by, bw, bh, _ in BARS:
        d += rounded_rect_path(bx, by, bw, bh, BAR_RX)
    lx, ly, lw, lh = LINE
    d += rounded_rect_path(lx, ly, lw, lh, LINE_RX)
    return f'<path fill="{color}" fill-rule="evenodd" d="{d}"/>'


def main() -> None:
    LOGO.mkdir(exist_ok=True)
    word_d, wx0, wx1, wy0, wy1 = wordmark_path()
    word_w = wx1 - wx0
    top = min(0, wy0)
    bottom = max(32, wy1)

    files = {}

    # Marks
    files["mark.svg"] = svg(32, 32, mark_body(INK, VSYNC), "framebudget")
    files["mark-on-dark.svg"] = svg(32, 32, mark_body(None, VSYNC, tile=False), "framebudget")
    files["mark-mono-ink.svg"] = svg(32, 32, mono_mark_body(INK), "framebudget")
    files["mark-mono-white.svg"] = svg(32, 32, mono_mark_body(WHITE), "framebudget")
    files["favicon.svg"] = files["mark.svg"]

    # Wordmarks (tight box around the outlines)
    def word(fill):
        g = f'<path fill="{fill}" d="{word_d}" transform="translate({n(-wx0)} {n(-wy0)})"/>'
        return svg(word_w, wy1 - wy0, g, "framebudget")

    files["wordmark-light.svg"] = word(INK)
    files["wordmark-dark.svg"] = word(CHALK)

    # Lockups: mark, gap, wordmark. Wordmark baseline sits on the last bar.
    def lockup(mark, fill):
        shift = 32 + GAP - wx0
        g = f'{mark}<path fill="{fill}" d="{word_d}" transform="translate({n(shift)} 0)"/>'
        total = 32 + GAP + word_w
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {n(top)} {n(total)} {n(bottom - top)}" '
            f'role="img" aria-label="framebudget"><title>framebudget</title>{g}</svg>\n'
        )

    files["lockup-light.svg"] = lockup(mark_body(INK, VSYNC), INK)
    files["lockup-dark.svg"] = lockup(mark_body(None, VSYNC, tile=False), CHALK)
    files["lockup-mono-ink.svg"] = lockup(mono_mark_body(INK), INK)
    files["lockup-mono-white.svg"] = lockup(mono_mark_body(WHITE), WHITE)

    for name, content in files.items():
        (LOGO / name).write_text(content)
        print(f"{name:26} {len(content):6} bytes")


if __name__ == "__main__":
    main()
