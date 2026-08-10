from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[1]
CURRENT = ROOT / "output" / "sportpaleis-readiness-005-review"
CONTINUITY = ROOT / "output" / "sportpaleis-readiness-004-review"
OUTPUT = ROOT / "output" / "pdf" / "SPORTPALEIS-WORKSPACE-PILOT-READINESS-005-CORRECTION-REVIEW.pdf"

PAGE = landscape(A4)
PAGE_W, PAGE_H = PAGE
RED = HexColor("#e30613")
INK = HexColor("#191919")
MUTED = HexColor("#666666")
PAPER = HexColor("#f5f3ef")


def install_fonts() -> tuple[str, str]:
    regular = Path(r"C:\Windows\Fonts\arial.ttf")
    bold = Path(r"C:\Windows\Fonts\arialbd.ttf")
    if regular.exists() and bold.exists():
        pdfmetrics.registerFont(TTFont("ReviewRegular", str(regular)))
        pdfmetrics.registerFont(TTFont("ReviewBold", str(bold)))
        return "ReviewRegular", "ReviewBold"
    return "Helvetica", "Helvetica-Bold"


FONT, FONT_BOLD = install_fonts()


CURRENT_PAGES = [
    ("Kevin / Admin", "Artikelbeheer", "Overzicht van pilotartikelen, verenigingsrelatie en expliciete validatiestatus.", "01-kevin-artikelbeheer-desktop.png"),
    ("Kevin / Admin", "Artikel bewerken", "SKU, afbeelding, varianten, kledingmaten, bedrukking, profiel en provenance in een gereviseerd beheerformulier.", "02-kevin-artikel-validatie-provenance-desktop.png"),
    ("Kevin / Admin", "Artikelbeheer - 390 px", "Mobiele leesbaarheid en bediening van dezelfde beheerroute.", "03-kevin-artikelbeheer-390px.png"),
    ("Kevin / Admin", "Verenigingsbeheer", "Bekende vereniging als entiteit; bronwaarden en ontbrekende catalogus blijven gescheiden.", "04-kevin-verenigingsbeheer-desktop.png"),
    ("Kevin / Admin", "Junior-validatie", "Fysieke Junior-hoogte in millimeters plus bronnotitie; status alleen is onvoldoende.", "05-kevin-junior-fysieke-mm-provenance-desktop.png"),
    ("Kevin / Admin", "Productieprofielen", "Onbewezen positie, afstand, rotatie en spiegeling staan als DATA_GAP en zijn niet productiegereed.", "06-kevin-productieprofielen-datagap-desktop.png"),
    ("Kevin / Admin", "Profielvalidatie", "Beheerbare bronstatus per productieveld en zichtbare productieblokkade.", "07-kevin-profiel-validatie-productieblokkade-desktop.png"),
    ("Winkelmedewerker", "Nieuwe order", "Catalogusstatus blijft zichtbaar; onbekende artikeldata wordt niet als bevestigd gepresenteerd.", "08-winkelmedewerker-normale-order-catalogus-datagap-desktop.png"),
    ("Winkelmedewerker", "Artikelkeuze", "Artikelbeleid en toegestane bedrukking sturen de keuze; gedeeltelijke catalogus blijft herkenbaar.", "09-winkelmedewerker-artikelkaarten-beleid-datagap-desktop.png"),
    ("Winkelmedewerker", "Orderdetail", "Gedeeltelijk gevalideerd artikel blokkeert productie na opslaan.", "14-winkelmedewerker-orderdetail-productieblokkade-desktop.png"),
    ("Patrick / Productie", "Orderdetail", "Dezelfde blokkade wordt server-side gehandhaafd; volgende productiestap is uitgeschakeld.", "15-patrick-productie-orderdetail-datagap-blokkade-desktop.png"),
]


CONTINUITY_PAGES = [
    ("Winkelmedewerker", "Teamorder - start", "Continuiteitsbeeld uit readiness 004. De flow is in 005 niet herontworpen en is opnieuw door regressietests gevalideerd.", "04-winkelmedewerker-teamorder-start-desktop.png"),
    ("Winkelmedewerker", "Teamorder - 18 spelers x 2 artikelen", "Continuiteitsbeeld uit readiness 004. Readiness 005 test opnieuw meerdere artikelen per speler en een nummerafwijking.", "05-winkelmedewerker-teamorder-18x2-desktop.png"),
    ("Winkelmedewerker", "Teamorder - 390 px", "Continuiteitsbeeld uit readiness 004 voor de mobiele richting; 005 bewaakt dezelfde order- en artikelregels.", "08-winkelmedewerker-teamorder-390px.png"),
]


def wrapped_text(canvas: Canvas, text: str, x: float, y: float, width: float, size: float, leading: float, color=INK, bold=False) -> float:
    canvas.setFont(FONT_BOLD if bold else FONT, size)
    canvas.setFillColor(color)
    words = text.split()
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if canvas.stringWidth(candidate, FONT_BOLD if bold else FONT, size) <= width:
            line = candidate
            continue
        canvas.drawString(x, y, line)
        y -= leading
        line = word
    if line:
        canvas.drawString(x, y, line)
        y -= leading
    return y


def footer(canvas: Canvas, page_number: int, label: str) -> None:
    canvas.setStrokeColor(HexColor("#d8d5cf"))
    canvas.line(28, 24, PAGE_W - 28, 24)
    canvas.setFont(FONT, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(28, 11, f"SPW-BEDRUKKING-PILOT-READINESS-005-20260810 - {label}")
    canvas.drawRightString(PAGE_W - 28, 11, str(page_number))


def cover(canvas: Canvas, page_number: int) -> None:
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(RED)
    canvas.rect(0, 0, 18, PAGE_H, fill=1, stroke=0)
    canvas.setFont(FONT_BOLD, 12)
    canvas.setFillColor(RED)
    canvas.drawString(48, PAGE_H - 62, "SPORT 2000 SPORTPALEIS WORKSPACE")
    canvas.setFont(FONT_BOLD, 29)
    canvas.setFillColor(INK)
    canvas.drawString(48, PAGE_H - 108, "Pilot Readiness 005")
    canvas.setFont(FONT, 18)
    canvas.drawString(48, PAGE_H - 138, "Gerichte correctiefase - review")
    y = PAGE_H - 196
    y = wrapped_text(canvas, "Doel: controle van Artikelbeheer, kledingmaten en varianten, Junior/Senior, productieprofielen en veilige DATA_GAP-blokkades.", 48, y, 620, 12, 17)
    y -= 12
    y = wrapped_text(canvas, "Bronhierarchie: eerder goedgekeurde Sportpaleis-besluiten en de vastgelegde fixture van info bedrukkingen 2026.xlsx. Onbevestigde artikel- en productiegegevens zijn niet ingevuld.", 48, y, 620, 11, 16, MUTED)
    y -= 24
    canvas.setFont(FONT_BOLD, 11)
    canvas.setFillColor(INK)
    canvas.drawString(48, y, "VALIDATIE")
    y -= 22
    for line in [
        "441/441 regressietests geslaagd",
        "Workspace-only build geslaagd",
        "20/20 verenigingsbronregels reproduceerbaar",
        "Geen deployment, mail, DNS-wijziging of hardwareactie",
    ]:
        canvas.setFillColor(RED)
        canvas.circle(54, y + 3, 2.5, fill=1, stroke=0)
        canvas.setFillColor(INK)
        canvas.setFont(FONT, 10.5)
        canvas.drawString(66, y, line)
        y -= 20
    footer(canvas, page_number, "reviewcover")
    canvas.showPage()


def screenshot_page(canvas: Canvas, page_number: int, role: str, page: str, scenario: str, image_path: Path, continuity: bool = False) -> None:
    if not image_path.exists():
        raise FileNotFoundError(image_path)
    canvas.setFillColor(white)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(RED)
    canvas.rect(0, PAGE_H - 46, PAGE_W, 46, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont(FONT_BOLD, 10)
    canvas.drawString(28, PAGE_H - 18, role.upper())
    canvas.setFont(FONT_BOLD, 16)
    canvas.drawString(28, PAGE_H - 37, page)
    marker = "CONTINUITEITSBEWIJS 004" if continuity else "ACTUELE BUILD 005"
    canvas.setFont(FONT_BOLD, 8)
    canvas.drawRightString(PAGE_W - 28, PAGE_H - 28, marker)

    description_y = PAGE_H - 61
    wrapped_text(canvas, scenario, 28, description_y, PAGE_W - 56, 8.5, 11, MUTED)
    top = PAGE_H - 83
    bottom = 34
    available_w = PAGE_W - 56
    available_h = top - bottom
    image = ImageReader(str(image_path))
    image_w, image_h = image.getSize()
    scale = min(available_w / image_w, available_h / image_h)
    draw_w = image_w * scale
    draw_h = image_h * scale
    x = (PAGE_W - draw_w) / 2
    y = bottom + (available_h - draw_h) / 2
    canvas.setFillColor(PAPER)
    canvas.roundRect(x - 3, y - 3, draw_w + 6, draw_h + 6, 4, fill=1, stroke=0)
    canvas.drawImage(image, x, y, draw_w, draw_h, preserveAspectRatio=True, mask="auto")
    footer(canvas, page_number, "screenshot review")
    canvas.showPage()


def conclusion(canvas: Canvas, page_number: int) -> None:
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(INK)
    canvas.setFont(FONT_BOLD, 23)
    canvas.drawString(44, PAGE_H - 64, "Conclusie en veilige grens")
    y = PAGE_H - 106
    sections = [
        ("Aantoonbaar gecorrigeerd", "Artikelbeheer is gereviseerd en persistent; vereniging is een bekende entiteit; kledingmaten en bedrukmaten zijn gescheiden; Junior-validatie vereist millimeters en provenance; profielvelden hebben eigen bronstatus; order en Teamorder erven artikelbeleid."),
        ("Bewust resterende DATA_GAP", "De volledige productcatalogi voor 20 verenigingen, goedgekeurde SKU's, productbeelden, kledingmaten en varianten ontbreken grotendeels. Exacte positie, referentieafstand, rotatie en spiegeling zijn niet bronbevestigd. Deze waarden worden niet verzonnen."),
        ("Reviewgrens", "Er is geen werkelijk bronbevestigd productieartikel waarmee een normale order als productiegereed kan worden afgebeeld. De review toont daarom de correcte blokkade. Een test-only VALIDATED fixture bewijst de positieve codeflow zonder die waarde als Sportpaleis-productdata op te slaan."),
        ("Eindstatus", "ARTIKELINRICHTING PILOT: GEDEELTELIJK\nPILOT READINESS: NOT READY"),
    ]
    for title, body in sections:
        canvas.setFillColor(RED)
        canvas.setFont(FONT_BOLD, 11)
        canvas.drawString(44, y, title.upper())
        y -= 18
        for paragraph in body.split("\n"):
            y = wrapped_text(canvas, paragraph, 44, y, PAGE_W - 88, 10.5, 15, INK, bold=title == "Eindstatus")
        y -= 18
    footer(canvas, page_number, "conclusie")
    canvas.showPage()


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    expected = [CURRENT / item[3] for item in CURRENT_PAGES] + [CONTINUITY / item[3] for item in CONTINUITY_PAGES]
    missing = [str(path) for path in expected if not path.exists()]
    if missing:
        raise FileNotFoundError("Ontbrekende reviewbeelden:\n" + "\n".join(missing))
    canvas = Canvas(str(OUTPUT), pagesize=PAGE, pageCompression=1)
    page_number = 1
    cover(canvas, page_number)
    page_number += 1
    for role, page, scenario, filename in CURRENT_PAGES:
        screenshot_page(canvas, page_number, role, page, scenario, CURRENT / filename)
        page_number += 1
    for role, page, scenario, filename in CONTINUITY_PAGES:
        screenshot_page(canvas, page_number, role, page, scenario, CONTINUITY / filename, continuity=True)
        page_number += 1
    conclusion(canvas, page_number)
    canvas.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
