from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape, portrait
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "output" / "screenshots" / "SPW-007B-20260807"
OUTPUT = ROOT / "output" / "pdf" / "Sportpaleis-Workspace-007B-Operational-Review.pdf"

RED = colors.HexColor("#E30613")
BLACK = colors.HexColor("#151515")
LIGHT = colors.HexColor("#F2F2F2")
MUTED = colors.HexColor("#666666")

PAGES = [
    ("Winkelmedewerker", "Overzicht", "Dagstart, snelle klantzoeking, aandachtspunten en vaste winkelgrens.", "01-winkel-overzicht.png"),
    ("Winkelmedewerker", "Nieuwe order", "Compacte klant- en standaardbedrukking; artikelen vroeg zichtbaar; geen beloofdatum in de normale flow.", "02-winkel-nieuwe-order.png"),
    ("Winkelmedewerker", "Nieuwe order - Artikelen", "Beeldgestuurde artikelkeuze met SKU als secundaire controle.", "03-winkel-artikelselectie.png"),
    ("Winkelmedewerker", "Nieuwe order - Varianten", "Gelijke regels gegroepeerd; afwijkende maat of bedrukking via progressive disclosure.", "04-winkel-gegroepeerde-varianten.png"),
    ("Winkelmedewerker", "Orders", "Zoeken op klant, order-ID, telefoon, e-mail, vereniging of artikel.", "05-winkel-zoeken-orders.png"),
    ("Winkelmedewerker", "Orderdetail SP-2026-0103", "Gedeelde order vanuit winkelperspectief; bewerkbaar tot productie start; geen productiebediening.", "06-winkel-orderdetail-gedeelde-order.png"),
    ("Patrick / Productie", "Productie", "Werkvoorraad per foliekleur; Direct Print en barcodehardware zichtbaar vergrendeld.", "07-patrick-productie-overzicht.png"),
    ("Patrick / Productie", "Productie - Foliebatches", "Wit, zwart en rood gescheiden; rode kleurblokkade blijft onafhankelijk zichtbaar.", "07b-patrick-foliebatches.png"),
    ("Patrick / Productie", "Orders - Bulkselectie", "Selecteer individueel of alles in het filter; atomaire volgende productiestap.", "08-patrick-bulkselectie.png"),
    ("Patrick / Productie", "Orderdetail SP-2026-0103", "Dezelfde order vanuit productieperspectief met statusbediening en technische context.", "09-patrick-orderdetail-instructie-gedeelde-order.png"),
    ("Patrick / Productie", "Orderdetail - Instructie", "Productie-instructie op aanvraag: positie, afstand in cm, maat, profiel en 90 graden.", "09b-patrick-productie-instructie.png"),
    ("Kevin / Admin", "Overzicht", "Beheerdersdagstart met aandacht, productiebeeld en recente auditgebeurtenissen.", "10-kevin-overzicht.png"),
    ("Kevin / Admin", "Beheer - Gebruikers en rollen", "Duidelijke Winkelmedewerker-, Productie- en Beheerderrollen; commerciele connectors blijven buiten scope.", "11-kevin-beheer-gebruikers-rollen.png"),
    ("Kevin / Admin", "Beheer - Artikelen", "Beeldgestuurde catalogus, SKU, actiefstatus en gekoppeld productieprofiel.", "12-kevin-artikelbeheer.png"),
    ("Kevin / Admin", "Beheer - Productieprofielen", "Beheerde fysieke instructies in cm met positie, formaat, letterprofiel en rotatie.", "13-kevin-productieprofielen.png"),
    ("Kevin / Admin", "Beheer - Folie en rollen", "Financiele bronvelden gescheiden van productie; onbekende kosten blijven onbekend.", "14-kevin-folie-finance.png"),
    ("Kevin / Admin", "Orderdetail SP-2026-0103", "Dezelfde order vanuit beheerperspectief; volledige context zonder hardware- of mailactie.", "15-kevin-orderdetail-gedeelde-order.png"),
]


def rounded_label(pdf, x, y, text, width):
    pdf.setFillColor(BLACK)
    pdf.roundRect(x, y - 18, width, 24, 12, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(x + 10, y - 10, text)


def draw_cover(pdf):
    width, height = landscape(A3)
    pdf.setPageSize((width, height))
    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(0, height - 18, width, 18, fill=1, stroke=0)
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica-Bold", 34)
    pdf.drawString(62, height - 110, "SPORT 2000 SPORTPALEIS WORKSPACE")
    pdf.setFont("Helvetica-Bold", 62)
    pdf.drawString(62, height - 190, "007B Operational Review")
    pdf.setFillColor(RED)
    pdf.setFont("Helvetica-Bold", 22)
    pdf.drawString(64, height - 232, "SPW-007B-20260807 - lokale reviewbuild")
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica", 16)
    pdf.drawString(64, height - 280, "Logische volgorde: Winkelmedewerker -> Patrick / Productie -> Kevin / Admin")
    pdf.drawString(64, height - 309, "17 verplichte screenshots; dezelfde order SP-2026-0103 vanuit alle drie rollen.")
    pdf.setFillColor(LIGHT)
    pdf.roundRect(62, 112, width - 124, 270, 14, fill=1, stroke=0)
    statuses = [
        "FUNCTIONAL REGRESSIONS: PASS (339 tests)",
        "STORE EMPLOYEE FLOW READY FOR REVIEW: YES",
        "PRODUCTION FLOW READY FOR REVIEW: YES",
        "ADMIN FLOW READY FOR REVIEW: YES",
        "ROLE SEPARATION VERIFIED: YES",
        "ORDER VARIANTS VERIFIED: YES",
        "BARCODE FOUNDATION READY: YES - FEATURE FLAG OFF",
        "BARCODE HARDWARE VALIDATED: NO",
        "DIRECT PRINT HARDWARE VALIDATED: NO",
        "READY FOR VISUAL REVIEW: YES",
        "READY FOR STAFF PRACTICE TEST: NO - eerst visuele review",
        "READY FOR PILOT USE: NO - staff practice en fysieke hardwarevalidatie vereist",
    ]
    pdf.setFont("Helvetica-Bold", 13)
    pdf.setFillColor(BLACK)
    y = 350
    for status in statuses:
        pdf.drawString(86, y, status)
        y -= 19
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(MUTED)
    pdf.drawString(64, 76, "Geen productie-deploy, DNS-wijziging, mailverzending, scanneractie, WinPlot/Summa-send of WBD-facturatie toegevoegd.")
    pdf.showPage()


def draw_screenshot_page(pdf, number, role, page, scenario, filename):
    path = SCREENSHOTS / filename
    if not path.exists():
        raise FileNotFoundError(path)
    with Image.open(path) as image:
        image_width, image_height = image.size
    page_size = landscape(A3) if image_width / image_height > 1.24 else portrait(A3)
    width, height = page_size
    pdf.setPageSize(page_size)
    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(0, height - 10, width, 10, fill=1, stroke=0)

    rounded_label(pdf, 36, height - 32, role, 160 if role == "Winkelmedewerker" else 150)
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica-Bold", 17)
    pdf.drawString(36, height - 78, page)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 10.5)
    pdf.drawString(36, height - 98, scenario)

    available_x = 36
    available_y = 38
    available_width = width - 72
    available_height = height - 154
    scale = min(available_width / image_width, available_height / image_height)
    draw_width = image_width * scale
    draw_height = image_height * scale
    draw_x = available_x + (available_width - draw_width) / 2
    draw_y = available_y + (available_height - draw_height) / 2
    pdf.setStrokeColor(colors.HexColor("#D8D8D8"))
    pdf.rect(draw_x - 1, draw_y - 1, draw_width + 2, draw_height + 2, fill=0, stroke=1)
    pdf.drawImage(str(path), draw_x, draw_y, width=draw_width, height=draw_height, preserveAspectRatio=True, mask="auto")

    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(36, 18, f"Sportpaleis Workspace 007B - scenario {number:02d}")
    pdf.drawRightString(width - 36, 18, f"Build SPW-007B-20260807 | pagina {number + 1}")
    pdf.showPage()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=landscape(A3), pageCompression=1)
    pdf.setTitle("Sportpaleis Workspace 007B Operational Review")
    pdf.setAuthor("Sport 2000 Sportpaleis B.V. / We Build And Design")
    pdf.setSubject("Lokale visuele review per rol en workflow")
    draw_cover(pdf)
    for number, (role, page, scenario, filename) in enumerate(PAGES, start=1):
        draw_screenshot_page(pdf, number, role, page, scenario, filename)
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
