from __future__ import annotations

from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
REVIEW = ROOT / "output" / "mail-foundation-004c1-review"
PDF = ROOT / "output" / "pdf" / "WBD-MAIL-004C1-VISUAL-REVIEW.pdf"
PREVIOUS_FOOTER = ROOT / "output" / "mail-foundation-004c-review" / "corporate-footer.jpg"

PAGE_W, PAGE_H = landscape(A4)
NIGHT = colors.HexColor("#08161A")
INK = colors.HexColor("#17221F")
CREAM = colors.HexColor("#F7F4EE")
PAPER = colors.HexColor("#F0E8D8")
GOLD = colors.HexColor("#C7A166")
MOSS = colors.HexColor("#173A31")
MUTED = colors.HexColor("#66736D")


def fonts() -> tuple[str, str, str]:
    regular = Path("C:/Windows/Fonts/arial.ttf")
    bold = Path("C:/Windows/Fonts/arialbd.ttf")
    serif = Path("C:/Windows/Fonts/georgia.ttf")
    if all(path.exists() for path in (regular, bold, serif)):
        pdfmetrics.registerFont(TTFont("WBDReviewSans", str(regular)))
        pdfmetrics.registerFont(TTFont("WBDReviewSansBold", str(bold)))
        pdfmetrics.registerFont(TTFont("WBDReviewSerif", str(serif)))
        return "WBDReviewSans", "WBDReviewSansBold", "WBDReviewSerif"
    return "Helvetica", "Helvetica-Bold", "Times-Roman"


SANS, BOLD, SERIF = fonts()


def header(pdf: canvas.Canvas, kicker: str, title: str, page: int) -> None:
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
    pdf.drawRightString(PAGE_W - 24, 17, f"WBD Mail 004C.1 - Page {page}")


def text(pdf: canvas.Canvas, value: str, x: float, y: float, width: float, size: float = 9, leading: float = 13, color=INK, font=SANS) -> float:
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = word if not current else f"{current} {word}"
        if pdfmetrics.stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    pdf.setFillColor(color)
    pdf.setFont(font, size)
    for line in lines:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def pill(pdf: canvas.Canvas, label: str, x: float, y: float, fill=MOSS, fg=CREAM) -> float:
    width = pdfmetrics.stringWidth(label, BOLD, 7.5) + 22
    pdf.setFillColor(fill)
    pdf.roundRect(x, y - 14, width, 18, 9, stroke=0, fill=1)
    pdf.setFillColor(fg)
    pdf.setFont(BOLD, 7.5)
    pdf.drawString(x + 11, y - 8, label)
    return width


def image_box(pdf: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float, label: str) -> None:
    pdf.setFillColor(colors.white)
    pdf.roundRect(x, y, w, h, 4, stroke=0, fill=1)
    pdf.setStrokeColor(colors.HexColor("#D7D1C6"))
    pdf.roundRect(x, y, w, h, 4, stroke=1, fill=0)
    pdf.setFillColor(GOLD)
    pdf.setFont(BOLD, 7)
    pdf.drawString(x + 10, y + h - 15, label.upper())
    if not path.exists():
        text(pdf, "Render missing", x + 10, y + h / 2, w - 20, color=colors.red)
        return
    with Image.open(path) as image:
        iw, ih = image.size
    max_w, max_h = w - 20, h - 34
    scale = min(max_w / iw, max_h / ih)
    draw_w, draw_h = iw * scale, ih * scale
    pdf.drawImage(str(path), x + (w - draw_w) / 2, y + 8, width=draw_w, height=draw_h, preserveAspectRatio=True, mask="auto")


def cover(pdf: canvas.Canvas) -> None:
    pdf.setFillColor(NIGHT)
    pdf.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    pdf.setFillColor(GOLD)
    pdf.setFont(BOLD, 8)
    pdf.drawString(42, PAGE_H - 58, "W / BD  MAIL REVIEW")
    pdf.setFillColor(CREAM)
    pdf.setFont(SERIF, 32)
    pdf.drawString(42, PAGE_H - 120, "WBD Mail 004C.1")
    pdf.setFont(SERIF, 18)
    pdf.drawString(42, PAGE_H - 151, "Corporate footer polish and official logo candidate")
    text(pdf, "The tagline is owner-approved. The footer is polished. The existing W/BD implementation has been converted into a review-only master candidate without redesign.", 42, PAGE_H - 190, 510, 11, 16, colors.HexColor("#D8DED9"))
    x = 42
    for label in ("393/393 PASS", "REAL MAIL SENT: NO", "LOGO: REVIEW_REQUIRED"):
        x += pill(pdf, label, x, PAGE_H - 242) + 10
    pdf.setStrokeColor(colors.HexColor("#345047"))
    pdf.line(42, 118, PAGE_W - 42, 118)
    text(pdf, "Human decision boundary", 42, 96, 180, 8, 11, GOLD, BOLD)
    text(pdf, "Footer and tagline are ready for review. The logo candidate is not owner-approved and does not replace the live text fallback.", 212, 96, PAGE_W - 254, 9, 13, colors.HexColor("#D8DED9"))
    pdf.setFillColor(colors.HexColor("#82918A"))
    pdf.setFont(SANS, 7)
    pdf.drawString(42, 35, "Local visual review - no SMTP - no deployment - 9 August 2026")
    pdf.showPage()


def build() -> None:
    PDF.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(PDF), pagesize=landscape(A4))
    pdf.setTitle("WBD Mail 004C.1 - Visual Review")
    pdf.setAuthor("We Build And Design")
    cover(pdf)

    header(pdf, "Corporate footer", "From a light metadata block to a calm corporate zone", 2)
    image_box(pdf, PREVIOUS_FOOTER, 30, 75, 360, 430, "004C before")
    image_box(pdf, REVIEW / "corporate-footer-full.png", 410, 75, 402, 430, "004C.1 after")
    text(pdf, "The personal signature remains in the correspondence layer. The dark footer is a separate corporate layer with contact information first, followed by identity, tagline and legal data.", 410, 62, 402, 8, 11, MUTED)
    pdf.showPage()

    header(pdf, "WBD General", "Desktop render - message and footer", 3)
    image_box(pdf, REVIEW / "general-desktop-top.png", 30, 70, 385, 430, "Desktop top")
    image_box(pdf, REVIEW / "general-desktop-footer.png", 427, 70, 385, 430, "Desktop footer")
    pdf.showPage()

    header(pdf, "WBD Invoice", "Desktop render - facts preserved, shared footer applied", 4)
    image_box(pdf, REVIEW / "invoice-desktop-top.png", 30, 70, 385, 430, "Desktop top")
    image_box(pdf, REVIEW / "invoice-desktop-footer.png", 427, 70, 385, 430, "Desktop footer")
    pdf.showPage()

    header(pdf, "Mobile review", "Exact 390 px mail width", 5)
    image_box(pdf, REVIEW / "general-mobile-390-top.png", 30, 286, 385, 214, "General top")
    image_box(pdf, REVIEW / "general-mobile-390-footer.png", 427, 286, 385, 214, "General footer")
    image_box(pdf, REVIEW / "invoice-mobile-390-top.png", 30, 63, 385, 214, "Invoice top")
    image_box(pdf, REVIEW / "invoice-mobile-390-footer.png", 427, 63, 385, 214, "Invoice footer")
    pdf.showPage()

    header(pdf, "Logo authority", "WBD OFFICIAL LOGO CANDIDATE", 6)
    image_box(pdf, REVIEW / "logo-candidate-top.png", 30, 245, 782, 255, "Master, light, mail header and footer")
    image_box(pdf, REVIEW / "logo-candidate-mobile.png", 30, 63, 410, 170, "Small format and status")
    y = 217
    for line in (
        "Status: REVIEW_REQUIRED",
        "Owner approval applied: NO",
        "Logo redesigned: NO",
        "External original required: NO",
        "Website source: ca3d1bd9 - 26 July 2026",
        "Invoice vector: e91b80a - 4 August 2026",
        "SVG master + transparent PNG derivatives created",
    ):
        y = text(pdf, f"- {line}", 465, y, 347, 9, 17, INK, BOLD if "Status" in line else SANS)
    pdf.showPage()

    header(pdf, "Controls", "Preserved contracts and review outcome", 7)
    left = [
        ("WBD tagline owner approved", "YES"),
        ("Corporate footer polished", "YES"),
        ("General footer applied", "YES"),
        ("Invoice footer applied", "YES"),
        ("Safe live fallback preserved", "YES"),
        ("Desktop review", "PASS"),
        ("Mobile 390 px review", "PASS"),
    ]
    right = [
        ("Full regression", "393/393 PASS"),
        ("Invoice PDF modified", "NO"),
        ("Bank details added", "NO"),
        ("Payment or CTA changed", "NO"),
        ("Real mail sent", "NO"),
        ("Production deployment", "NO"),
        ("Logo candidate status", "REVIEW_REQUIRED"),
    ]
    for column, rows in ((42, left), (430, right)):
        y = 478
        for label, value in rows:
            pdf.setFillColor(colors.white)
            pdf.roundRect(column, y - 28, 350, 35, 3, stroke=0, fill=1)
            pdf.setFillColor(MUTED)
            pdf.setFont(SANS, 8)
            pdf.drawString(column + 12, y - 10, label)
            pdf.setFillColor(MOSS if value in {"YES", "PASS", "393/393 PASS"} else GOLD)
            pdf.setFont(BOLD, 8)
            pdf.drawRightString(column + 338, y - 10, value)
            y -= 47
    pdf.setFillColor(MOSS)
    pdf.roundRect(42, 63, PAGE_W - 84, 58, 5, stroke=0, fill=1)
    pdf.setFillColor(CREAM)
    pdf.setFont(SERIF, 14)
    pdf.drawString(60, 96, "READY FOR FINAL HUMAN VISUAL REVIEW")
    pdf.setFont(SANS, 8)
    pdf.drawString(60, 78, "Next step: Donovan reviews the logo candidate. No SMTP or activation is authorized in this step.")
    pdf.showPage()

    pdf.save()
    print(PDF)


if __name__ == "__main__":
    build()
