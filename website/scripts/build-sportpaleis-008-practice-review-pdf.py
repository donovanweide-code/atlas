from pathlib import Path
import textwrap

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A3, landscape, portrait
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "output" / "screenshots" / "SPW-008-20260807"
OUTPUT = ROOT / "output" / "pdf" / "Sportpaleis-Workspace-008-Praktijktest-Review.pdf"

RED = colors.HexColor("#E30613")
BLACK = colors.HexColor("#151515")
LIGHT = colors.HexColor("#F2F2F2")
MID = colors.HexColor("#D8D8D8")
MUTED = colors.HexColor("#666666")
GREEN = colors.HexColor("#2D7B4F")

SCREENSHOT_PAGES = [
    ("Winkelmedewerker", "Overzicht", "Dagstart, snelle orderzoeking, aandacht en vaste rolgrens.", "01-winkel-overzicht.png"),
    ("Winkelmedewerker", "Nieuwe order", "Contact en standaardbedrukking staan boven de beeldcatalogus.", "02-winkel-nieuwe-order.png"),
    ("Winkelmedewerker", "Complexe varianten", "Gegroepeerde artikelen en de huidige grenzen van variantbedrukking.", "03-winkel-complexe-varianten.png"),
    ("Winkelmedewerker", "Nieuwe order - mobiel", "390 px review: geen horizontale overflow, wel een lange verticale flow.", "04-winkel-mobiel.png"),
    ("Winkelmedewerker", "Order zoeken", "Zoekresultaat na bugfix: alleen de passende order blijft zichtbaar.", "05-winkel-order-zoeken.png"),
    ("Winkelmedewerker", "Orderdetail - bewerkbaar", "Contactcorrectie is mogelijk zolang de order nog niet in productie is.", "06-winkel-orderdetail-bewerkbaar.png"),
    ("Winkelmedewerker", "Orderdetail - vergrendeld", "Vanaf Controle is de order alleen-lezen; aandacht blijft zichtbaar.", "07-winkel-orderdetail-vergrendeld.png"),
    ("Patrick / Productie", "Productie", "Foliebatches, herkomst, veiligheidsregels en harde hardwareblokkades.", "08-patrick-productie.png"),
    ("Patrick / Productie", "Batchselectie", "Alles in filter selecteert ook gemengde statussen en zichtbare kleurholds.", "09-patrick-batchselectie.png"),
    ("Patrick / Productie", "Productie-instructie", "Volledig profiel met positie, afstand in cm, maat, letterprofiel en rotatie.", "10-patrick-productie-instructie.png"),
    ("Kevin / Admin", "Beheer", "Rollen, communicatiebasis en beheergrenzen zonder externe connectors.", "11-kevin-beheer.png"),
    ("Kevin / Admin", "Artikelbeleid", "Vereniging, profiel en actiefstatus zijn beheerbaar; bedrukbeleid nog niet.", "12-kevin-artikelbeleid.png"),
    ("Kevin / Admin", "Persoonlijke weergave", "Optionele werkweergave met vaste klant-, status- en veiligheidsinformatie.", "13-kevin-persoonlijke-weergave.png"),
]


def page_header(pdf, title, subtitle, page_number):
    width, height = landscape(A3)
    pdf.setPageSize((width, height))
    pdf.setFillColor(colors.white)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(0, height - 12, width, 12, fill=1, stroke=0)
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica-Bold", 25)
    pdf.drawString(54, height - 62, title)
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 11)
    pdf.drawString(54, height - 83, subtitle)
    pdf.drawRightString(width - 54, 24, f"Sportpaleis Workspace 008 | pagina {page_number}")
    return width, height


def wrapped(pdf, text, x, y, max_width, font="Helvetica", size=11, leading=15, color=BLACK):
    words = text.split()
    lines = []
    line = ""
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


def bullet_list(pdf, items, x, y, width, size=10.5, leading=14, gap=7):
    for item in items:
        pdf.setFillColor(RED)
        pdf.circle(x + 3, y + 3, 2.2, fill=1, stroke=0)
        y = wrapped(pdf, item, x + 14, y, width - 14, size=size, leading=leading)
        y -= gap
    return y


def section(pdf, title, items, x, y, width):
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica-Bold", 15)
    pdf.drawString(x, y, title)
    y -= 22
    return bullet_list(pdf, items, x, y, width)


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
    pdf.setFont("Helvetica-Bold", 58)
    pdf.drawString(62, height - 185, "008 Praktijktest Review")
    pdf.setFillColor(RED)
    pdf.setFont("Helvetica-Bold", 20)
    pdf.drawString(64, height - 224, "Reviewpakket SPW-008-20260807 | baseline SPW-007B-20260807")
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica", 15)
    pdf.drawString(64, height - 266, "Werkdagvolgorde: Winkelmedewerker -> Patrick / Productie -> Kevin / Admin")
    pdf.drawString(64, height - 292, "13 actuele screenshots, praktijktestkaart, risicoanalyse en expliciet testbesluit.")
    pdf.setFillColor(LIGHT)
    pdf.roundRect(62, 110, width - 124, 252, 14, fill=1, stroke=0)
    statuses = [
        ("CURRENT BASELINE PRESERVED", "YES"),
        ("PRACTICE TEST READY", "YES"),
        ("EMPLOYEE LIGHT WORKFLOW READY", "NO"),
        ("PRODUCTION WORKFLOW READY", "YES"),
        ("ADMIN WORKFLOW READY", "YES"),
        ("BARCODE FOUNDATION READY FOR LATER HARDWARE TEST", "YES"),
        ("EXTERNAL COMMUNICATION ACTIVATED", "NO"),
        ("DIRECT PRINT HARDWARE ACTIVATED", "NO"),
        ("PRODUCTION DEPLOYMENT", "NO"),
    ]
    y = 334
    for label, value in statuses:
        pdf.setFillColor(BLACK)
        pdf.setFont("Helvetica-Bold", 12.5)
        pdf.drawString(88, y, label)
        pdf.setFillColor(GREEN if value == "YES" else RED)
        pdf.drawRightString(width - 88, y, value)
        y -= 23
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 10)
    pdf.drawString(64, 72, "GO geldt alleen voor een gecontroleerde medewerkerspraktijktest met fictieve orders en alle externe/hardwarefuncties uit.")
    pdf.showPage()


def draw_outcome(pdf, page_number):
    width, height = page_header(pdf, "Uitkomst en toetsgrens", "Veilig genoeg om te leren, nog niet klaar voor pilotproductie.", page_number)
    left = 58
    right = width / 2 + 20
    column = width / 2 - 82
    y = height - 122
    y = section(pdf, "Aantoonbaar sterk", [
        "Server-side rolgrenzen voor winkel, productie en beheer.",
        "Verplichte contactgegevens en browser- plus servervalidatie van e-mail.",
        "Zoeken op klant, order, telefoon, e-mail, vereniging en artikel/SKU.",
        "Ordervergrendeling voor winkel vanaf Controle.",
        "Foliebatches, orderherkomst, aandacht, holds en atomaire bulkvoortgang.",
        "Productie-instructie met positie, cm, maat, profiel en rotatie.",
        "Barcode als eenvoudige ordersleutel; hardware en Direct Print-send blijven uit.",
        "Gecontroleerde persoonlijke weergave met vaste kerninformatie.",
    ], left, y, column)
    section(pdf, "Reviewbewijs", [
        "Desktop: 1440 x 1000; tablet: 768 x 1024; mobiel: 390 x 844.",
        "Volledige regressiesuite en productiebouw worden na bundeling opnieuw uitgevoerd.",
        "Geen externe communicatie, scanner, printer, Summa of productieomgeving gebruikt.",
    ], left, y - 10, column)
    y2 = height - 122
    y2 = section(pdf, "GO voor de praktijktest", [
        "Gebruik uitsluitend fictieve gegevens in een lokale reviewomgeving.",
        "Laat de medewerker zonder uitleg werken; noteer twijfel en gevraagde hulp.",
        "Gebruik de voorgevulde demo bewust als testonderwerp of start bewust leeg; meng die doelen niet.",
        "Laat Patrick de verwachte batchuitkomst hardop benoemen voordat een statusactie wordt uitgevoerd.",
        "Stop bij iedere hardware-, mail- of productieactie.",
    ], right, y2, column)
    pdf.setFillColor(colors.HexColor("#FFF3F3"))
    pdf.roundRect(right, 112, column, 180, 12, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(right + 22, 264, "Geen GO voor pilotproductie")
    wrapped(pdf, "De medewerkerflow vraagt nog besluiten over artikelgestuurde velden, volledige varianten, een lege startstaat, klant-hergebruik en correctie van artikel/bedrukking voor productie.", right + 22, 238, column - 44, size=11, leading=16)
    pdf.showPage()


def draw_findings(pdf, page_number):
    width, height = page_header(pdf, "Bevindingen uit de werkdag", "Frictie is gerapporteerd; proceskeuzes zijn niet stilzwijgend gebouwd.", page_number)
    left = 58
    right = width / 2 + 20
    column = width / 2 - 82
    section(pdf, "Winkelmedewerker", [
        "De demo start met 27 voorgevulde velden en 3 geselecteerde artikelen.",
        "Nieuwe-orderlengte: circa 2474 px desktop, 3423 px tablet en 4269 px mobiel.",
        "Bestaande klant kan worden gevonden via orders, maar contactgegevens kunnen niet eenvoudig worden hergebruikt.",
        "Standaard- en afwijkende bedrukking tonen generieke velden in plaats van alleen artikeltoegestane opties.",
        "Variantregels ondersteunen maat, aantal en rugnummer, maar geen eigen initialen, naam of shortnummer.",
        "Semantische initialen kunnen tussenvoegsel bewaren; de leidende invoer is nog niet ondubbelzinnig.",
        "Voor productie kan alleen contact worden gecorrigeerd, niet artikel, maat of bedrukking.",
    ], left, height - 122, column)
    section(pdf, "Productie en beheer", [
        "Alles in filter selecteert gemengde statussen en kleurholds; veilig atomair, maar moeilijk voorspelbaar zonder filters.",
        "Oude seedorders kunnen contactgegevens of productionProfileId missen.",
        "De fysieke flow is gecomprimeerd tot Order, Controle, Print en Gereed; communicatie en pickup zijn losse events.",
        "Kevin kan vereniging, profiel en actiefstatus beheren, maar niet het toegestane bedrukbeleid per artikel.",
        "WBD-facturen zijn bewust afwezig zolang die capability niet is aangesloten.",
        "Nieuwe kleine bug hersteld: verborgen zoekresultaten werden door grid-CSS toch getekend; de teller volgt nu het zichtbare aantal. Filterlogica bleef ongewijzigd.",
    ], right, height - 122, column)
    pdf.showPage()


def draw_recommendations(pdf, page_number):
    width, height = page_header(pdf, "Voor en na de praktijktest", "Eerst waarnemen wat medewerkers werkelijk moeilijk vinden.", page_number)
    left = 58
    right = width / 2 + 20
    column = width / 2 - 82
    section(pdf, "Voor de test", [
        "Gebruik een lokale kopie met fictieve data en een resetmogelijkheid.",
        "Gebruik alleen nieuwe contact-complete testorders voor de ketentest.",
        "Behandel incomplete seedorders expliciet als data-afwijking.",
        "Registreer per taak: zonder hulp, twijfel, hulp nodig, fout, tijd, observatie en letterlijke feedback.",
        "Voer geen communicatie- of hardwareactie uit.",
    ], left, height - 122, column)
    section(pdf, "Pas na feedback beslissen", [
        "Lege startstaat en eventuele hergebruikactie voor bestaande klanten.",
        "Policy-driven bedrukvelden per artikel.",
        "Compact variantmodel voor alle toegestane bedruktypen.",
        "Definitieve invoer van hoofdinitialen en tussenvoegsel.",
        "Status-, kleur- en holdfilters voor batchselectie.",
        "Eventuele verkorting of fasering van de mobiele flow.",
        "Uitbreiding van fysieke statussen en tijdsrapportages.",
    ], right, height - 122, column)
    pdf.showPage()


def draw_test_card(pdf, page_number):
    width, height = page_header(pdf, "Praktijktestkaart - verkort overzicht", "De volledige invulkaart is als afzonderlijk Markdown-document geleverd.", page_number)
    left = 58
    right = width / 2 + 20
    column = width / 2 - 82
    store_tasks = [
        "Nieuwe klant: shirt M, rugnummer 10.",
        "Onjuist e-mailadres invoeren en herstellen.",
        "Bestaande order via naam en telefoon vinden.",
        "Drie identieke shirts als een groep.",
        "Hetzelfde shirt in M en L.",
        "Drie shorts met verschillende bedrukking.",
        "Shirt, jack en kousen met artikelbeleid.",
        "Donovan van de Weide als DvdW vastleggen.",
        "Notitie en prioriteit wegens klacht.",
        "Voor productie wijzigen, na Controle opnieuw proberen.",
    ]
    section(pdf, "Winkelmedewerker - 10 taken", store_tasks, left, height - 122, column)
    y = section(pdf, "Patrick - 4 taken", [
        "Aandachtorder en productie-instructie controleren.",
        "Veilige witte groep selecteren zonder hardware-send.",
        "Alles in filter met gemengde status en rode hold beoordelen.",
        "Een fictieve order van Controle naar Gereed volgen.",
    ], right, height - 122, column)
    section(pdf, "Kevin - 4 taken", [
        "Rollen en toegangsgrenzen controleren.",
        "Artikelcontext, profiel en bedrukopties zoeken.",
        "Persoonlijke weergave aanpassen zonder kerninfo te verliezen.",
        "Communicatie en folie/rollen controleren; niets versturen.",
    ], right, y - 10, column)
    pdf.showPage()


def rounded_label(pdf, x, y, text, width):
    pdf.setFillColor(BLACK)
    pdf.roundRect(x, y - 18, width, 24, 12, fill=1, stroke=0)
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
    label_width = 160 if role == "Winkelmedewerker" else 150
    rounded_label(pdf, 36, height - 32, role, label_width)
    pdf.setFillColor(BLACK)
    pdf.setFont("Helvetica-Bold", 17)
    pdf.drawString(36, height - 78, page)
    wrapped(pdf, scenario, 36, height - 98, width - 72, size=10.5, leading=13, color=MUTED)
    available_width = width - 72
    available_height = height - 154
    scale = min(available_width / image_width, available_height / image_height)
    draw_width = image_width * scale
    draw_height = image_height * scale
    draw_x = 36 + (available_width - draw_width) / 2
    draw_y = 38 + (available_height - draw_height) / 2
    pdf.setStrokeColor(MID)
    pdf.rect(draw_x - 1, draw_y - 1, draw_width + 2, draw_height + 2, fill=0, stroke=1)
    pdf.drawImage(str(path), draw_x, draw_y, width=draw_width, height=draw_height, preserveAspectRatio=True, mask="auto")
    pdf.setFillColor(MUTED)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(36, 18, f"Sportpaleis Workspace 008 - scenario {scenario_number:02d}")
    pdf.drawRightString(width - 36, 18, f"Baseline SPW-007B-20260807 | pagina {page_number}")
    pdf.showPage()


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=landscape(A3), pageCompression=1)
    pdf.setTitle("Sportpaleis Workspace 008 Praktijktest Review")
    pdf.setAuthor("Sport 2000 Sportpaleis B.V. / We Build And Design")
    pdf.setSubject("Lokale praktijktest- en pilotvoorbereiding")
    draw_cover(pdf)
    draw_outcome(pdf, 2)
    draw_findings(pdf, 3)
    draw_recommendations(pdf, 4)
    draw_test_card(pdf, 5)
    for scenario_number, (role, page, scenario, filename) in enumerate(SCREENSHOT_PAGES, start=1):
        draw_screenshot_page(pdf, scenario_number + 5, scenario_number, role, page, scenario, filename)
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
