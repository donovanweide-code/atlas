from __future__ import annotations

from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
REVIEW = ROOT / "output" / "mail-foundation-004c2-review"
ASSETS = ROOT / "website" / "public" / "assets" / "organizations" / "we-build-and-design" / "logo-candidate-004c1"
PDF = ROOT / "output" / "pdf" / "WBD-MAIL-004C2-FINAL-REVIEW.pdf"

PAGE_W, PAGE_H = landscape(A4)
NIGHT = colors.HexColor("#08161A")
INK = colors.HexColor("#17221F")
CREAM = colors.HexColor("#F7F4EE")
GOLD = colors.HexColor("#C7A166")
MOSS = colors.HexColor("#173A31")
MUTED = colors.HexColor("#66736D")


def register_fonts() -> tuple[str, str, str]:
    paths = (Path("C:/Windows/Fonts/arial.ttf"), Path("C:/Windows/Fonts/arialbd.ttf"), Path("C:/Windows/Fonts/georgia.ttf"))
    if all(path.exists() for path in paths):
        pdfmetrics.registerFont(TTFont("WBD004C2Sans", str(paths[0])))
        pdfmetrics.registerFont(TTFont("WBD004C2Bold", str(paths[1])))
        pdfmetrics.registerFont(TTFont("WBD004C2Serif", str(paths[2])))
        return "WBD004C2Sans", "WBD004C2Bold", "WBD004C2Serif"
    return "Helvetica", "Helvetica-Bold", "Times-Roman"


SANS, BOLD, SERIF = register_fonts()


def wrapped(pdf: canvas.Canvas, value: str, x: float, y: float, width: float, size: float = 9, leading: float = 13, color=INK, font=SANS) -> float:
    words = value.split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = word if not line else f"{line} {word}"
        if pdfmetrics.stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    for line in lines:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def page_header(pdf: canvas.Canvas, kicker: str, title: str, page: int) -> None:
    pdf.setFillColor(NIGHT)
    pdf.rect(0, PAGE_H - 62, PAGE_W, 62, stroke=0, fill=1)
    pdf.setFillColor(GOLD)
    pdf.setFont(BOLD, 7.5)
    pdf.drawString(30, PAGE_H - 21, kicker.upper())
    pdf.setFillColor(CREAM)
    pdf.setFont(SERIF, 20)
    pdf.drawString(30, PAGE_H - 46, title)
    pdf.setFillColor(GOLD)
    pdf.rect(0, PAGE_H - 64, PAGE_W, 2, stroke=0, fill=1)
    pdf.setFillColor(MUTED)
    pdf.setFont(SANS, 7)
    pdf.drawRightString(PAGE_W - 24, 17, f"WBD Mail 004C.2 - Page {page}")


def pill(pdf: canvas.Canvas, label: str, x: float, y: float, fill=MOSS) -> float:
    width = pdfmetrics.stringWidth(label, BOLD, 7.5) + 22
    pdf.setFillColor(fill)
    pdf.roundRect(x, y - 14, width, 18, 9, stroke=0, fill=1)
    pdf.setFillColor(CREAM)
    pdf.setFont(BOLD, 7.5)
    pdf.drawString(x + 11, y - 8, label)
    return width


def image_box(pdf: canvas.Canvas, path: Path, x: float, y: float, width: float, height: float, label: str, background=colors.white) -> None:
    pdf.setFillColor(background)
    pdf.roundRect(x, y, width, height, 4, stroke=0, fill=1)
    pdf.setStrokeColor(colors.HexColor("#D7D1C6"))
    pdf.roundRect(x, y, width, height, 4, stroke=1, fill=0)
    pdf.setFillColor(GOLD)
    pdf.setFont(BOLD, 7)
    pdf.drawString(x + 10, y + height - 15, label.upper())
    if not path.exists():
        wrapped(pdf, "Render missing", x + 10, y + height / 2, width - 20, color=colors.red)
        return
    with Image.open(path) as source:
        image_width, image_height = source.size
    scale = min((width - 20) / image_width, (height - 34) / image_height)
    draw_width, draw_height = image_width * scale, image_height * scale
    pdf.drawImage(str(path), x + (width - draw_width) / 2, y + 8, width=draw_width, height=draw_height, preserveAspectRatio=True, mask="auto")


def status_rows(pdf: canvas.Canvas, rows: list[tuple[str, str]], x: float, y: float, width: float) -> None:
    for label, value in rows:
        pdf.setFillColor(colors.white)
        pdf.roundRect(x, y - 25, width, 32, 3, stroke=0, fill=1)
        pdf.setFillColor(MUTED)
        pdf.setFont(SANS, 7.7)
        pdf.drawString(x + 11, y - 8, label)
        positive = value in {"YES", "PASS", "393/393 PASS", "OWNER_APPROVED"}
        pdf.setFillColor(MOSS if positive else GOLD)
        pdf.setFont(BOLD, 7.7)
        pdf.drawRightString(x + width - 11, y - 8, value)
        y -= 40


def build() -> None:
    PDF.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(PDF), pagesize=landscape(A4))
    pdf.setTitle("WBD Mail 004C.2 - Final Review")
    pdf.setAuthor("We Build And Design")

    pdf.setFillColor(NIGHT)
    pdf.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    pdf.setFillColor(GOLD)
    pdf.setFont(BOLD, 8)
    pdf.drawString(42, PAGE_H - 58, "W / BD  MAIL FINAL REVIEW")
    pdf.setFillColor(CREAM)
    pdf.setFont(SERIF, 32)
    pdf.drawString(42, PAGE_H - 120, "WBD Mail 004C.2")
    pdf.setFont(SERIF, 18)
    pdf.drawString(42, PAGE_H - 151, "Owner approval and final brand activation")
    wrapped(pdf, "The exact 004C.1 W/BD candidate is now the owner-approved Organization Brand Foundation asset. Both WBD mail families use the controlled mail-safe derivative.", 42, PAGE_H - 190, 540, 11, 16, colors.HexColor("#D8DED9"))
    x = 42
    for label in ("OWNER_APPROVED", "393/393 PASS", "REAL MAIL SENT: NO"):
        x += pill(pdf, label, x, PAGE_H - 244, MOSS if label != "REAL MAIL SENT: NO" else colors.HexColor("#5B4A2C")) + 10
    pdf.setStrokeColor(colors.HexColor("#345047"))
    pdf.line(42, 118, PAGE_W - 42, 118)
    wrapped(pdf, "Boundary", 42, 96, 150, 8, 11, GOLD, BOLD)
    wrapped(pdf, "No SMTP send, production deployment, DNS mutation or Sportpaleis mail change was performed.", 200, 96, PAGE_W - 242, 9, 13, colors.HexColor("#D8DED9"))
    pdf.setFillColor(colors.HexColor("#82918A"))
    pdf.setFont(SANS, 7)
    pdf.drawString(42, 35, "Local final review - 9 August 2026")
    pdf.showPage()

    page_header(pdf, "Organization Brand Foundation", "Owner-approved W/BD authority and provenance", 2)
    image_box(pdf, ASSETS / "wbd-logo-mail-safe-light-candidate.png", 30, 290, 360, 210, "Approved mail-safe asset", NIGHT)
    y = 486
    entries = [
        ("Organization", "we-build-and-design"),
        ("Foundation", "WBD-BRAND-FOUNDATION-004C2"),
        ("Status", "OWNER_APPROVED"),
        ("Approved by", "owner / Donovan"),
        ("Approved at", "2026-08-09"),
        ("Redesign", "NO"),
    ]
    for label, value in entries:
        pdf.setFillColor(MUTED)
        pdf.setFont(SANS, 8)
        pdf.drawString(420, y, label)
        pdf.setFillColor(INK)
        pdf.setFont(BOLD, 8)
        pdf.drawString(525, y, value)
        y -= 26
    pdf.setFillColor(colors.white)
    pdf.roundRect(30, 72, PAGE_W - 60, 184, 5, stroke=0, fill=1)
    wrapped(pdf, "REGISTERED ASSETS", 48, 232, 180, 8, 11, GOLD, BOLD)
    hashes = [
        "Master SVG   b82bcb75111105cf5017c61ae9661be3ae7cccfdecd77e3f0f723585d99524c5",
        "Mail-safe PNG   342ecff3490157106f4a71161d54407b3f6aad71be48c09e5720bdc183e4d9f4",
        "Light SVG   1e0f76446e922204b6ac36e01d5abb3daeed1dda43c49e6ef6464100789ad525",
        "Dark PNG   19fa7ab551dbefbd69f49733c5ccdd6c9aa046dc3d2d1d6e8c7d2d0df8ce6052",
    ]
    y = 207
    for line in hashes:
        y = wrapped(pdf, line, 48, y, PAGE_W - 96, 7.4, 23, INK)
    wrapped(pdf, "Authority: Organization Brand Foundation -> approved master -> hash-validated mail-safe derivative -> WBD mail. Atlas can read, but cannot alter or reapprove this authority.", 48, 96, PAGE_W - 96, 8.5, 12, MUTED)
    pdf.showPage()

    page_header(pdf, "WBD General", "Desktop render - official header logo and preserved corporate footer", 3)
    image_box(pdf, REVIEW / "general-desktop-top.png", 30, 70, 385, 430, "Desktop top")
    image_box(pdf, REVIEW / "general-desktop-footer.png", 427, 70, 385, 430, "Desktop footer")
    pdf.showPage()

    page_header(pdf, "WBD Invoice", "Desktop render - invoice facts and PDF contract preserved", 4)
    image_box(pdf, REVIEW / "invoice-desktop-top.png", 30, 70, 385, 430, "Desktop top")
    image_box(pdf, REVIEW / "invoice-desktop-footer.png", 427, 70, 385, 430, "Desktop footer")
    pdf.showPage()

    page_header(pdf, "Mobile review", "Exact 390 px mail width", 5)
    image_box(pdf, REVIEW / "general-mobile-390-top.png", 30, 286, 385, 214, "General top")
    image_box(pdf, REVIEW / "general-mobile-390-footer.png", 427, 286, 385, 214, "General footer")
    image_box(pdf, REVIEW / "invoice-mobile-390-top.png", 30, 63, 385, 214, "Invoice top")
    image_box(pdf, REVIEW / "invoice-mobile-390-footer.png", 427, 63, 385, 214, "Invoice footer")
    pdf.showPage()

    page_header(pdf, "Controls", "Failure safety, regression and release boundary", 6)
    image_box(pdf, REVIEW / "images-off.png", 30, 270, 350, 230, "Images-off alt fallback")
    image_box(pdf, REVIEW / "header-footer.png", 400, 270, 412, 230, "Shared approved footer authority")
    status_rows(pdf, [
        ("Official logo - general", "YES"),
        ("Official logo - invoice", "YES"),
        ("Plain text", "PASS"),
        ("Desktop", "PASS"),
    ], 30, 235, 240)
    status_rows(pdf, [
        ("Mobile 390 px", "PASS"),
        ("Full regression", "393/393 PASS"),
        ("Invoice PDF modified", "NO"),
        ("Payment / Mollie added", "NO"),
    ], 300, 235, 240)
    status_rows(pdf, [
        ("Real customer mail sent", "NO"),
        ("Production deployment", "NO"),
        ("DNS mutations", "NO"),
        ("Controlled SMTP ready", "YES"),
    ], 570, 235, 242)
    pdf.showPage()

    pdf.save()
    print(PDF)


if __name__ == "__main__":
    build()
