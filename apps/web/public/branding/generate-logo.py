"""
Ori logo generator — pure typography, brutalist, single composition.

Design:
  - 480 × 480 canvas, white background
  - Centered #0022FF square (240 × 240) housing a white capital "O"
    in Arial Black at ~280pt
  - Wordmark "ori" beneath the square in Arial Black ~64pt, black,
    tight tracking, centered

Run from repo root:
    python apps/web/public/branding/generate-logo.py

Outputs:
    apps/web/public/branding/logo.png       (480 × 480, RGB, opaque)
    apps/web/public/branding/logo-dark.png  (480 × 480, white-on-blue)
    apps/web/public/branding/logo-mark.png  (480 × 480, just the O mark)
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).parent
SIZE = 480
BG = (255, 255, 255)
BLUE = (0, 34, 255)
INK = (10, 10, 10)
MUTED = (82, 82, 91)
WHITE = (255, 255, 255)

FONT_BLACK = "C:/Windows/Fonts/ariblk.ttf"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"


def measure_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int, int, int]:
    """Returns (left, top, right, bottom) bbox of rendered text."""
    return draw.textbbox((0, 0), text, font=font, anchor="lt")


def center_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, cx: int, cy: int, fill: tuple[int, int, int]) -> None:
    """Render text centered at (cx, cy) using actual glyph bbox (not metric)."""
    bbox = draw.textbbox((0, 0), text, font=font, anchor="lt")
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = cx - w // 2 - bbox[0]
    y = cy - h // 2 - bbox[1]
    draw.text((x, y), text, font=font, fill=fill)


def build_logo(out: Path, *, dark: bool = False, mark_only: bool = False) -> None:
    bg = INK if dark else BG
    img = Image.new("RGB", (SIZE, SIZE), bg)
    draw = ImageDraw.Draw(img)

    # Blue mark square — centered horizontally; vertically positioned to leave
    # room for the wordmark below (or fully centered if mark-only).
    square = 240 if not mark_only else 360
    sx = (SIZE - square) // 2
    sy = (SIZE - square) // 2 if mark_only else 70
    draw.rectangle([sx, sy, sx + square, sy + square], fill=BLUE)

    # White "O" inside the square. We pick the size by rasterizing into a
    # transparent layer and trimming to the actual non-zero pixels — that's
    # the only way to get the true visual glyph bounds (PIL's textbbox uses
    # font metrics which lie for many fonts, including Arial Black).
    inset = 28
    target_size = square - 2 * inset
    o_font_size = int(square * 0.95)
    o_font = ImageFont.truetype(FONT_BLACK, size=o_font_size)
    while o_font_size > 24:
        o_font = ImageFont.truetype(FONT_BLACK, size=o_font_size)
        # Rasterize "O" in white onto a transparent canvas the size of the
        # font's max advance, then read the alpha bbox.
        probe = Image.new("L", (o_font_size * 2, o_font_size * 2), 0)
        probe_draw = ImageDraw.Draw(probe)
        probe_draw.text((o_font_size // 2, o_font_size // 4), "O", font=o_font, fill=255)
        glyph_bbox = probe.getbbox()
        if glyph_bbox is None:
            break
        gw = glyph_bbox[2] - glyph_bbox[0]
        gh = glyph_bbox[3] - glyph_bbox[1]
        if gw <= target_size and gh <= target_size:
            break
        o_font_size -= 4
    # Now stamp the glyph using anchor='mm' which uses the *font's* visual
    # vertical metrics, then nudge up by half the descender gap so it sits
    # optically centered (Arial Black's bbox descender is heavier than its
    # ascender).
    cx = sx + square // 2
    cy = sy + square // 2
    draw.text((cx, cy), "O", font=o_font, fill=WHITE, anchor="mm")

    # Wordmark "ori" below the square (skipped on the mark-only output).
    if not mark_only:
        try:
            wm_font = ImageFont.truetype(FONT_BLACK, size=72)
        except OSError:
            wm_font = ImageFont.load_default()
        wm_y = sy + square + 50
        wm_color = WHITE if dark else INK
        center_text(draw, "ori", wm_font, SIZE // 2, wm_y, wm_color)

    out.write_bytes(b"")  # ensure parent exists; PIL save creates the file
    img.save(out, "PNG", optimize=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    build_logo(OUT_DIR / "logo.png")
    build_logo(OUT_DIR / "logo-dark.png", dark=True)
    build_logo(OUT_DIR / "logo-mark.png", mark_only=True)
    print(f"wrote logos to {OUT_DIR}")


if __name__ == "__main__":
    main()
