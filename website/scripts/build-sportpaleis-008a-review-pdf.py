from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape, portrait
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "output" / "screenshots" / "SPW-008A-BIJSTURING-20260808"
OUTPUT = ROOT / "output" / "pdf" / "Sportpaleis-Workspace-008A-Bijsturing-Review.pdf"

RED = colors.HexColor("#E30613")
BLACK = colors.HexColor("#151515")
LIGHT = colors.HexColor("#F3F3F3")
MID = colors.HexColor("#D3D3D3")
MUTED = colors.HexColor("#626262")
GREEN = colors.HexColor("#23734B")

SCREENSHOT_PAGES = [
    ("Winkelmedewerker", "Nieuwe order", "Klantgegevens en één orderstandaard voor initialen, naam en rug-/shortnummer.", "01-klant-en-orderstandaard.png"),
    ("Winkelmedewerker", "Artikelcatalogus", "Vereniging eerst kiezen; daarna uitsluitend de bijbehorende visuele artikelcatalogus.", "02-artikelcatalogus.png"),
    ("Winkelmedewerker", "Eenvoudige artikelregel", "Maat en aantal zonder herhaling van geërfde standaardbedrukking.", "03-eenvoudige-artikelregel-maat-aantal.png"),
    ("Winkelmedewerker", "Afwijkende bedrukking", "Alleen de expliciete uitzondering wordt op artikelniveau vastgelegd.", "04-een-afwijkende-bedrukking.png"),
    ("Winkelmedewerker", "Tussenvoegsel", "Semantische naamdelen produceren aantoonbaar de productiecode DvdW.", "05-tussenvoegsel-productiebetekenis.png"),
    ("Winkelmedewerker", "Orderoverzicht", "Controle van artikel, maat, aantal, overerving, uitzondering en expliciet ontbrekende prijsbron.", "06-orderoverzicht-prijs.png"),
    ("Winkelmedewerker", "Vereniging wisselen", "FC Almere toont alleen de gekoppelde artikelen; ontbrekende SKU blijft zichtbaar onbekend.", "12-verenigingfilter-fc-almere.png"),
    ("Winkelmedewerker", "Eén klantorder, twee verenigingen", "Waterwijk en FC Almere blijven samen in één order met dezelfde standaardinitialen en eigen productieprofiel.", "13-een-order-twee-verenigingen.png"),
    ("Kevin / Admin", "Navigatie", "Verenigingen, Folie & rollen en WBD & commercieel zijn direct bereikbaar voor de eigenaar/admin.", "07-kevin-admin-navigatie.png"),
    ("Kevin / Admin", "Verenigingen - Waterwijk", "Bestaand verenigingsmodel met artikelen, bedrukbeleid en technische productiecontext.", "14-kevin-verenigingcontext-beheer.png"),
    ("Kevin / Admin", "Verenigingen - FC Almere", "Tweede verenigingscontext; ontbrekend officieel logo en SKU worden niet verzonnen.", "15-kevin-fc-almere-context.png"),
    ("Kevin / Admin", "Folie & rollen", "Financiële rolgegevens en verbruikscontext zijn bereikbaar; onbekende bronwaarden blijven onbekend.", "08-kevin-folie-rollen-financieel.png"),
    ("Kevin / Admin", "WBD & commercieel", "Seat-/afspraakcontext en factuursectie zijn bereikbaar zonder fictieve bedragen of facturen.", "09-kevin-wbd-commercieel-facturen.png"),
    ("Patrick / Productie", "Toegangsgrens", "Directe toegang tot financiële beheerroute wordt server-/rolmatig geweigerd.", "10-patrick-admin-finance-geweigerd.png"),
    ("Winkelmedewerker", "Toegangsgrens", "Directe toegang tot financiële beheerroute wordt voor de winkelrol geweigerd.", "11-winkel-admin-finance-geweigerd.png"),
]


def wrapped(pdf, text, x, y, max_width, font="Helvetica", size=11, leading=15, color=BLACK):
    words = text.split()
    lines, line = [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if stringWidth(candidate, font, size) <= max_width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    for current in lines:
        pdf.drawString(x, y, current)
        y -= leading
    return y


def draw_cover(pdf):
    width, height = landscape(A3)
    pdf.setPageSize((width, height))
    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(0, height - 18, width, 18, fill=1, stroke=0)
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica-Bold", 34)
    pdf.drawString(62, height - 105, "SPORT 2000 SPORTPALEIS WORKSPACE")
    pdf.setFont("Helvetica-Bold", 56)
    pdf.drawString(62, height - 184, "008A Bijsturing Review")
    pdf.setFillColor(RED)
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(64, height - 222, "Build SPW-008A-20260808 | baseline SPW-007B-20260807")
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica", 15)
    pdf.drawString(64, height - 264, "Winkelmedewerker -> Patrick / Productie -> Kevin / Admin")
    pdf.drawString(64, height - 290, "15 lokale reviewscreenshots; geen deployment en geen hardwareactivatie.")
    pdf.setFillColor(LIGHT)
    pdf.roundRect(62, 102, width - 124, 246, 14, fill=1, stroke=0)
    statuses = [
        ("ORDERSTANDAARD DIRECT ONDER KLANT", "YES"),
        ("ARTIKELEN ERVEN DE ORDERSTANDAARD", "YES"),
        ("ALLEEN AFWIJKINGEN OP ARTIKELNIVEAU", "YES"),
        ("TUSSENVOEGSEL -> DvdW", "YES"),
        ("VERENIGINGSCONTEXT HERSTELD", "YES"),
        ("MEERDERE VERENIGINGEN IN EEN ORDER", "YES"),
        ("ADMIN FINANCIEEL/COMMERCIEEL BEREIKBAAR", "YES"),
        ("EXTERNE COMMUNICATIE OF HARDWARE ACTIEF", "NO"),
    ]
    y = 320
    for label, value in statuses:
        pdf.setFillColor(BLACK)
        pdf.setFont("Helvetica-Bold", 12.5)
        pdf.drawString(88, y, label)
        pdf.setFillColor(GREEN if value == "YES" else RED)
        pdf.drawRightString(width - 88, y, value)
        y -= 25
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(64, 68, "Reviewbewijs van de lokale omgeving; onbekende prijzen, SKU's, logo's en factuurbronnen zijn bewust niet ingevuld.")
    pdf.showPage()


def draw_status(pdf):
    width, height = landscape(A3)
    pdf.setPageSize((width, height))
    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(0, height - 12, width, 12, fill=1, stroke=0)
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica-Bold", 26)
    pdf.drawString(56, height - 65, "Regressiestatus en harde reviewgrenzen")
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 11)
    pdf.drawString(56, height - 87, "Herstel van bestaande capability; geen nieuw financieel systeem en geen fictieve brondata.")
    rows = [
        ("ADMIN FINANCIAL REGRESSION FOUND", "YES", "Recente simplificatie had de praktische bereikbaarheid van admin-capabilities verzwakt."),
        ("FOLIE/ROLLEN RESTORED", "YES", "Directe adminnavigatie en financieel/verbruikscontext zichtbaar."),
        ("WBD COMMERCIAL SECTION RESTORED", "YES", "Seat- en afspraakcontext opnieuw praktisch bereikbaar."),
        ("WBD INVOICES VISIBLE TO KEVIN", "YES", "Factuursectie zichtbaar; momenteel 0 records en geen gekoppelde bron."),
        ("HIDDEN/FORBIDDEN FOR PATRICK", "YES", "Directe routecontrole toont Geen toegang."),
        ("HIDDEN/FORBIDDEN FOR WINKELMEDEWERKER", "YES", "Directe routecontrole wijst de winkelrol af."),
    ]
    y = height - 140
    for label, value, explanation in rows:
        pdf.setFillColor(LIGHT)
        pdf.roundRect(56, y - 51, width - 112, 62, 8, fill=1, stroke=0)
        pdf.setFillColor(BLACK)
        pdf.setFont("Helvetica-Bold", 13)
        pdf.drawString(76, y - 10, label)
        pdf.setFillColor(GREEN)
        pdf.drawRightString(width - 76, y - 10, value)
        wrapped(pdf, explanation, 76, y - 32, width - 180, size=10.5, leading=13, color=MUTED)
        y -= 76
    pdf.setFillColor(colors.HexColor("#FFF2F2"))
    pdf.roundRect(56, 60, width - 112, 88, 10, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(76, 121, "Nog geen pilotvrijgave")
    wrapped(pdf, "Officiele verenigingslogo's, gevalideerde FC Almere-SKU en gekoppelde prijs-/factuurbronnen ontbreken nog. De lokale reviewomgeving en regressiebewijzen zijn wel gereed voor beoordeling.", 76, 98, width - 152, size=11, leading=16)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 9)
    pdf.drawRightString(width - 56, 24, "Sportpaleis Workspace 008A | pagina 2")
    pdf.showPage()


def rounded_label(pdf, x, y, text, label_width):
    pdf.setFillColor(BLACK)
    pdf.roundRect(x, y - 18, label_width, 24, 12, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(x + 10, y - 10, text)


def draw_screenshot_page(pdf, page_number, scenario_number, role, page, scenario, filename):
    path = SCREENSHOTS / filename
    if not path.exists():
        raise FileNotFoundError(path)
    with Image.open(path) as image:
        image_width, image_height = image.size
    page_size = landscape(A3) if image_width / image_height > 1.15 else portrait(A3)
    width, height = page_size
    pdf.setPageSize(page_size)
    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(0, height - 10, width, 10, fill=1, stroke=0)
    rounded_label(pdf, 36, height - 32, role, 170 if role == "Winkelmedewerker" else 160)
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica-Bold", 17)
    pdf.drawString(36, height - 78, page)
    wrapped(pdf, scenario, 36, height - 98, width - 72, size=10.5, leading=13, color=MUTED)
    available_width = width - 72
    available_height = height - 154
    scale = min(available_width / image_width, available_height / image_height)
    draw_width, draw_height = image_width * scale, image_height * scale
    draw_x = 36 + (available_width - draw_width) / 2
    draw_y = 38 + (available_height - draw_height) / 2
    pdf.setStrokeColor(MID)
    pdf.rect(draw_x - 1, draw_y - 1, draw_width + 2, draw_height + 2, fill=0, stroke=1)
    pdf.drawImage(str(path), draw_x, draw_y, width=draw_width, height=draw_height, preserveAspectRatio=True, mask="auto")
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(36, 18, f"Sportpaleis Workspace 008A - scenario {scenario_number:02d}")
    pdf.drawRightString(width - 36, 18, f"Build SPW-008A-20260808 | pagina {page_number}")
    pdf.showPage()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=landscape(A3), pageCompression=1)
    pdf.setTitle("Sportpaleis Workspace 008A Bijsturing Review")
    pdf.setAuthor("Sport 2000 Sportpaleis B.V. / We Build And Design")
    pdf.setSubject("Winkelmedewerker-, vereniging- en adminregressiereview")
    draw_cover(pdf)
    draw_status(pdf)
    for scenario_number, item in enumerate(SCREENSHOT_PAGES, start=1):
        draw_screenshot_page(pdf, scenario_number + 2, scenario_number, *item)
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
