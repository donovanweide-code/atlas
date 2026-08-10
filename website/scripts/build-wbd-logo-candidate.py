from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "website" / "public" / "assets" / "organizations" / "we-build-and-design" / "logo-candidate-004c1"
OUTPUT = ROOT / "output" / "wbd-brand-candidate-004c1"
VERSION = "WBD-LOGO-CANDIDATE-004C1"
GEOMETRY = (118, 43)
EXPORT_PADDING = 2
INK = "#08161A"
CREAM = "#F7F4EE"


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def svg(color: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="122" height="47" viewBox="-2 -2 122 47" role="img" aria-labelledby="title desc">
  <title id="title">We Build And Design logo candidate</title>
  <desc id="desc">Existing W slash BD mark with the tracked company name, preserved from the current WBD website and invoice implementation.</desc>
  <g fill="{color}">
    <text x="0" y="22" font-family="Georgia, 'Times New Roman', serif" font-size="21" font-weight="400">W</text>
    <text x="36.5" y="25.5" font-family="Georgia, 'Times New Roman', serif" font-size="8.8" font-weight="400">BD</text>
    <text x="0" y="40.5" font-family="Arial, Helvetica, sans-serif" font-size="6.8" font-weight="700" letter-spacing="1.05">WE BUILD AND DESIGN</text>
  </g>
  <line x1="27" y1="25" x2="34.5" y2="5" stroke="{color}" stroke-width="0.75" stroke-opacity="0.48"/>
</svg>
'''


def tracked_text(draw: ImageDraw.ImageDraw, xy: tuple[float, float], value: str, font: ImageFont.FreeTypeFont, fill: str, tracking: float) -> None:
    x, y = xy
    for character in value:
        draw.text((x, y), character, font=font, fill=fill, anchor="ls")
        x += draw.textlength(character, font=font) + tracking


def png(color: str, destination: Path, scale: int = 8) -> None:
    width, height = GEOMETRY
    padding = EXPORT_PADDING * scale
    image = Image.new("RGBA", ((width + EXPORT_PADDING * 2) * scale, (height + EXPORT_PADDING * 2) * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    georgia = ImageFont.truetype("C:/Windows/Fonts/georgia.ttf", 21 * scale)
    georgia_small = ImageFont.truetype("C:/Windows/Fonts/georgia.ttf", round(8.8 * scale))
    arial_bold = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", round(6.8 * scale))
    draw.text((padding, padding + 22 * scale), "W", font=georgia, fill=color, anchor="ls")
    draw.line((padding + 27 * scale, padding + 25 * scale, padding + 34.5 * scale, padding + 5 * scale), fill=color + "7A", width=max(1, round(0.75 * scale)))
    draw.text((padding + 36.5 * scale, padding + 25.5 * scale), "BD", font=georgia_small, fill=color, anchor="ls")
    tracked_text(draw, (padding, padding + 40.5 * scale), "WE BUILD AND DESIGN", arial_bold, color, 1.05 * scale)
    image.save(destination, optimize=True)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    assets = {
        "wbd-logo-master-candidate.svg": svg(INK),
        "wbd-logo-light-candidate.svg": svg(CREAM),
    }
    for filename, contents in assets.items():
        for target_root in (PUBLIC, OUTPUT):
            (target_root / filename).write_text(contents, encoding="utf-8")
    for filename, color in (
        ("wbd-logo-mail-safe-dark-candidate.png", INK),
        ("wbd-logo-mail-safe-light-candidate.png", CREAM),
    ):
        for target_root in (PUBLIC, OUTPUT):
            png(color, target_root / filename)

    sources = [
        ROOT / "website" / "src" / "public-pages.ts",
        ROOT / "website" / "src" / "styles" / "public-pages.css",
        ROOT / "invoices" / "wbd" / "brand.py",
        ROOT / "invoices" / "wbd" / "invoice.py",
    ]
    derivatives = sorted(path for path in OUTPUT.iterdir() if path.suffix in {".svg", ".png"})
    provenance = {
        "candidate_version": VERSION,
        "status": "OWNER_APPROVED",
        "owner_approved": True,
        "logo_redesigned": False,
        "created_on": "2026-08-09",
        "approval": {"approved_by": "owner / Donovan", "approval_date": "2026-08-09", "decision": "GO - WBD Mail 004C.2"},
        "origin": {
            "website_component_commit": "ca3d1bd90128ae25c033eae2c9b73d95b0c1d512",
            "website_component_date": "2026-07-26",
            "invoice_vector_commit": "e91b80a0eddf1cf495d66587b1c71e0d081ac5da",
            "invoice_vector_date": "2026-08-04",
            "basis": "Exact geometry, type choices and proportions from invoices/wbd/brand.py, itself documented as the vector translation of the current public WBD mark.",
        },
        "source_hashes_sha256": {str(path.relative_to(ROOT)).replace("\\", "/"): sha256(path) for path in sources},
        "derived_assets": {path.name: {"sha256": sha256(path), "intended_usage": {
            "wbd-logo-master-candidate.svg": "owner-approved scalable WBD master authority",
            "wbd-logo-light-candidate.svg": "owner-approved light derivative for night-green WBD surfaces",
            "wbd-logo-mail-safe-dark-candidate.png": "owner-approved transparent dark raster derivative for light WBD surfaces",
            "wbd-logo-mail-safe-light-candidate.png": "owner-approved mail-safe CID derivative for WBD mail header and footer",
        }[path.name]} for path in derivatives},
        "fonts": ["Georgia Regular (C:/Windows/Fonts/georgia.ttf)", "Arial Bold (C:/Windows/Fonts/arialbd.ttf)"],
        "master_geometry": {"source_coordinate_system": "0 0 118 43", "export_viewbox": "-2 -2 122 47", "source_aspect_ratio": 118 / 43, "export_padding_units": EXPORT_PADDING},
    }
    payload = json.dumps(provenance, indent=2, ensure_ascii=False) + "\n"
    for target_root in (PUBLIC, OUTPUT):
        (target_root / "provenance.json").write_text(payload, encoding="utf-8")
    print(json.dumps({"public": str(PUBLIC), "output": str(OUTPUT), "status": provenance["status"]}, indent=2))


if __name__ == "__main__":
    main()
