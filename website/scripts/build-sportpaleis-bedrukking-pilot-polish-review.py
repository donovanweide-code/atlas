from io import BytesIO
from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas


ROOT = Path(__file__).resolve().parents[2]
WEBSITE = ROOT / "website"
RELEASE = "SPW-BEDRUKKING-PILOT-POLISH-002-20260810"
BASELINE = "SPW-BEDRUKKING-PILOT-001-20260809"
SHOTS = WEBSITE / "output" / "screenshots" / RELEASE
OUTPUT = ROOT / "output" / "pdf" / "SPORTPALEIS-BEDRUKKING-UX-SIMPLIFICATION-PILOT-POLISH-REVIEW.pdf"

RED = colors.HexColor("#d71920")
BLACK = colors.HexColor("#111111")
CREAM = colors.HexColor("#f4ead5")
GREY = colors.HexColor("#626262")
LIGHT = colors.HexColor("#f4f4f4")

pdfmetrics.registerFont(TTFont("Review", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("ReviewBold", "C:/Windows/Fonts/arialbd.ttf"))


def crop_mobile_sources():
    for source_name, target_name in (
        ("14-mobile-store-new-order.raw.png", "14-mobile-store-new-order-390.png"),
        ("15-mobile-store-orders.raw.png", "15-mobile-store-orders-390.png"),
        ("16-mobile-production-batches.raw.png", "16-mobile-production-batches-390.png"),
    ):
        with Image.open(SHOTS / source_name) as source:
            crop = source.crop((0, 0, min(390, source.width), source.height))
            crop.save(SHOTS / target_name, "PNG", optimize=True)
            crop.close()


def wrap(pdf, text, x, y, width, size=10, leading=14, font="Review", color=BLACK):
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    words = text.split()
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if not line or pdf.stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            pdf.drawString(x, y, line)
            y -= leading
            line = word
    if line:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def page_header(pdf, title, meta, page_size):
    pdf.setPageSize(page_size)
    width, height = page_size
    pdf.setFillColor(BLACK)
    pdf.rect(0, height - 54, width, 54, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(0, height - 58, width, 4, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("ReviewBold", 15)
    pdf.drawString(28, height - 32, title)
    pdf.setFont("Review", 8)
    pdf.drawRightString(width - 28, height - 31, meta)
    return width, height


def page_footer(pdf, page, page_size):
    width, _ = page_size
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, width, 18, fill=1, stroke=0)
    pdf.setFillColor(GREY)
    pdf.setFont("Review", 7)
    pdf.drawString(24, 6, "Lokale review - geen deployment - geen echte mail - geen hardware-send")
    pdf.drawRightString(width - 24, 6, str(page))


def text_page(pdf, title, kicker, sections, page):
    size = landscape(A4)
    width, height = page_header(pdf, title, RELEASE, size)
    pdf.setFillColor(RED)
    pdf.setFont("ReviewBold", 9)
    pdf.drawString(34, height - 91, kicker.upper())
    y = height - 122
    for label, body in sections:
        pdf.setFillColor(BLACK)
        pdf.setFont("ReviewBold", 11.5)
        pdf.drawString(42, y, label)
        y -= 17
        y = wrap(pdf, body, 58, y, width - 116, 9.5, 13, "Review", GREY) - 9
    page_footer(pdf, page, size)
    pdf.showPage()


def screenshot_page(pdf, filename, role, title, scenario, page):
    path = SHOTS / filename
    with Image.open(path) as image:
        image.load()
        mobile = image.width <= 500
        size = A4 if mobile else landscape(A4)
        width, height = page_header(pdf, title, f"ROL - {role}", size)
        pdf.setFillColor(RED)
        pdf.setFont("ReviewBold", 8.5)
        pdf.drawString(28, height - 77, "GETEST SCENARIO")
        wrap(pdf, scenario, 123, height - 77, width - 151, 8, 10, "Review", GREY)

        max_w = width - (64 if mobile else 48)
        max_h = height - 130
        scale = min(max_w / image.width, max_h / image.height)
        draw_w = image.width * scale
        draw_h = image.height * scale
        x = (width - draw_w) / 2
        y = 27 + (max_h - draw_h) / 2
        pdf.setFillColor(LIGHT)
        pdf.roundRect(x - 4, y - 4, draw_w + 8, draw_h + 8, 5, fill=1, stroke=0)
        raster = image.convert("RGB")
        buffer = BytesIO()
        raster.save(buffer, "JPEG", quality=88, optimize=True)
        buffer.seek(0)
        pdf.drawImage(ImageReader(buffer), x, y, draw_w, draw_h, preserveAspectRatio=True)
        raster.close()
        page_footer(pdf, page, size)
        pdf.showPage()


def cover(pdf):
    size = landscape(A4)
    width, height = size
    pdf.setPageSize(size)
    pdf.setFillColor(BLACK)
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.circle(88, height - 92, 38, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("ReviewBold", 13)
    pdf.drawCentredString(88, height - 87, "SPORT")
    pdf.drawCentredString(88, height - 104, "2000")
    pdf.setFont("ReviewBold", 27)
    pdf.drawString(146, height - 90, "SPORTPALEIS BEDRUKKING")
    pdf.setFont("Review", 15)
    pdf.drawString(147, height - 118, "UX Simplification & Pilot Polish Review")
    pdf.setFont("ReviewBold", 12)
    pdf.drawString(58, height - 190, RELEASE)
    pdf.setFont("Review", 10)
    pdf.drawString(58, height - 213, f"Baseline: {BASELINE}")
    pdf.drawString(58, height - 232, "Desktop en 390px - functionele rollen - lokale reviewomgeving")
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, width, 68, fill=1, stroke=0)
    pdf.setFillColor(BLACK)
    pdf.setFont("ReviewBold", 10)
    pdf.drawString(58, 27, "READY FOR HUMAN VISUAL REVIEW")
    pdf.drawRightString(width - 58, 27, "10 augustus 2026")
    pdf.showPage()


def build():
    crop_mobile_sources()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    pdf.setTitle("Sportpaleis Bedrukking UX Simplification & Pilot Polish Review")
    pdf.setAuthor("We Build And Design")
    pdf.setSubject("Lokale menselijke visuele review van de Sportpaleis Bedrukking pilot")
    cover(pdf)
    page = 2

    text_page(pdf, "Vereenvoudiging zonder procesverlies", "Release-overzicht", [
        ("Een herkenbare orderroute", "Nieuwe order volgt Klant, Bedrukking, Vereniging, Artikelen en Controleren. Alleen informatie die op dat moment nodig is staat in de eerste laag."),
        ("Gewone werktaal", "Technische en ontwikkelaarstaal is uit operationele schermen verwijderd. Status, aandacht en vervolgstap zijn afzonderlijk en menselijk benoemd."),
        ("Orders en productie gescheiden", "Orders blijft de klantorderadministratie. Productie toont alleen gecontroleerd maakbaar werk, gegroepeerd per foliekleur."),
        ("Beheer blijft beheersbaar", "Verenigingen zijn zoekbaar en scrollbaar; gebruikersbeheer onderscheidt rol, toegang en concrete rolrechten zonder een onbeveiligde uitnodigingsflow te suggereren."),
    ], page)
    page += 1

    shots = [
        ("01-admin-header-overview.png", "Kevin / Beheer", "Workspace-identiteit", "Uniforme zwarte header, zichtbare Workspace-identiteit en rustige actieve navigatie."),
        ("02-store-new-order-sequence.png", "Winkelmedewerker", "Nieuwe order - start", "Een nieuwe medewerker ziet direct waar te beginnen en welke vijf stappen volgen."),
        ("03-store-progressive-print-fields.png", "Winkelmedewerker", "Bedrukking - wanneer relevant", "Junior/Senior verschijnt pas nadat een rugnummer is ingevuld; optionele velden zijn herkenbaar optioneel."),
        ("04-store-association-article-catalog.png", "Winkelmedewerker", "Vereniging en artikelen", "Visuele verenigingkeuze opent alleen de bijbehorende artikelcatalogus in bronvolgorde."),
        ("05-store-selected-article-size.png", "Winkelmedewerker", "Gekozen artikel", "Maat, aantal en geërfde bedrukking staan bij het artikel; selectie houdt focus en scrollpositie."),
        ("06-production-orders-active.png", "Patrick / Productie", "Orders - actief", "Actieve orders staan los van gereed werk; aandacht is een aparte rode indicator."),
        ("07-production-batches.png", "Patrick / Productie", "Productie - batches", "Alleen controleerbaar maakbaar werk verschijnt per foliekleur met één duidelijke actie."),
        ("08-production-order-detail.png", "Patrick / Productie", "Productie - orderdetail", "Order-, artikel- en bedrukcontext blijven samen zichtbaar zonder winkelvelden te dupliceren."),
        ("09-admin-users-overview.png", "Kevin / Beheer", "Gebruikers", "Rol en toegang zijn direct herkenbaar; onbeveiligde uitnodiging blijft bewust niet actief."),
        ("10-admin-user-rights-detail.png", "Kevin / Beheer", "Gebruiker en rechten", "Beheer ziet de afgeleide rolrechten en toegang zonder schijnbare individuele override."),
        ("11-admin-association-sidebar.png", "Kevin / Beheer", "Verenigingen - schaalbaar overzicht", "Zoekbare, scrollbare verenigingslijst schaalt zonder lange kaartmuur of tweede datamodel."),
        ("12-admin-association-detail.png", "Kevin / Beheer", "Vereniging - technische verdieping", "Artikelen blijven eerst zichtbaar; productieprofielen en techniek liggen één niveau dieper."),
        ("13-production-attention-state.png", "Patrick / Productie", "Aandacht en veilige correctie", "Aandacht is zichtbaar maar verandert de orderstatus niet; corrigeren blijft gecontroleerd en herleidbaar."),
        ("14-mobile-store-new-order-390.png", "Winkelmedewerker", "Nieuwe order - 390px", "De primaire orderstart past op 390px zonder horizontale overflow of verborgen systeemkennis."),
        ("15-mobile-store-orders-390.png", "Winkelmedewerker", "Orders - 390px", "Zoeken, filters, status en aandacht blijven mobiel herkenbaar en compact."),
        ("16-mobile-production-batches-390.png", "Patrick / Productie", "Productie - 390px", "Foliebatches en orders blijven op mobiel leesbaar en actiegericht."),
    ]
    for filename, role, title, scenario in shots:
        screenshot_page(pdf, filename, role, title, scenario, page)
        page += 1

    text_page(pdf, "New employee / low digital skill review", "Acceptatiecriterium", [
        ("Verder vereenvoudigd", "Nieuwe order, Orders, Productie, gebruikersbeheer en verenigingenbeheer gebruiken één primaire taak, korte labels, progressieve keuzes en vaste vervolgacties."),
        ("Nog uitleg nodig", "Uitzonderingen zoals een bewuste artikelafwijking, een ontbrekende beheerde prijs en fysieke Junior-maatvalidatie vragen nog om vakinhoudelijke uitleg, niet om systeemtraining."),
        ("Mogelijke twijfel", "Een nieuwe medewerker kan twijfelen wanneer een klant meerdere verenigingen combineert of wanneer een artikel afwijkt van de orderstandaard. De bestaande labels en rode afwijkingsmarkering beperken dit risico."),
        ("Zonder handleiding", "De normale flow - order starten, klant invullen, bedrukking kiezen, vereniging en artikel selecteren, controleren en opslaan - is op basis van browserreview zonder handleiding te begrijpen."),
        ("Resterend risico", "Echte winkelobservatie blijft nodig voor tempo, woordgebruik en uitzonderingssituaties. Training is geen acceptatievoorwaarde voor de normale primaire flow."),
    ], page)
    page += 1

    text_page(pdf, "Technisch bewijs en veiligheidsgrenzen", "Validatie", [
        ("Volledige regressie", "418 van 418 tests slagen. De publieke build en de Workspace-build slagen inclusief buildverificatie."),
        ("Browsercontrole", "Desktop heeft geen horizontale overflow. De lokale capture-route heeft exact 390px client- en scrollbreedte. Artikelkeuze houdt focus bij het gekozen artikel."),
        ("Rollen", "Winkelmedewerker en Patrick krijgen geen toegang tot beheerpagina's. Kevin behoudt gebruikers-, verenigingen-, folie- en commerciële beheercontext."),
        ("Niet uitgevoerd", "Geen deployment, DNS-wijziging, echte mail, Direct Print, WinPlot, Summa of hardware-send. Hardware-send staat uit in health."),
    ], page)
    page += 1

    text_page(pdf, "Uitgesteld en eerlijk zichtbaar", "Pilotgrenzen", [
        ("Nieuwe gebruiker", "Uitgesteld totdat een veilige uitnodigings- en activatiestroom bestaat."),
        ("Individuele rechten", "Uitgesteld; server-side RBAC blijft authority en er zijn geen schijnrechten toegevoegd."),
        ("Verenigingsassets", "Geen logo's of artikeldata verzonnen. De huidige bron bevat twee verenigingen; de interface is schaalbaar zonder kunstmatige demo-verenigingen."),
        ("Productiedata", "Onbekende prijzen en de nog niet fysiek bevestigde Junior-rugnummermaat blijven expliciet onbekend en blokkeren waar nodig."),
        ("Beslispunt", "Deze release is gereed voor menselijke visuele review. Verdere pilotbesluiten volgen pas na die review en praktijkobservatie."),
    ], page)

    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
