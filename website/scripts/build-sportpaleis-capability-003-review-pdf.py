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
RELEASE = "SPW-BEDRUKKING-CAPABILITY-003-20260810"
CONFIGURATION = "SPW-CONFIG-BEDRUKKING-003B-20260810"
SHOTS = ROOT / "output" / "sportpaleis-capability-003-review" / "screenshots"
OUTPUT = ROOT / "output" / "pdf" / "SPORTPALEIS-BEDRUKKING-CAPABILITY-003-REVIEW.pdf"

RED = colors.HexColor("#d71920")
BLACK = colors.HexColor("#111111")
CREAM = colors.HexColor("#f4ead5")
GREY = colors.HexColor("#626262")
LIGHT = colors.HexColor("#f4f4f4")

pdfmetrics.registerFont(TTFont("Review", "C:/Windows/Fonts/arial.ttf"))
pdfmetrics.registerFont(TTFont("ReviewBold", "C:/Windows/Fonts/arialbd.ttf"))


def wrap(pdf, text, x, y, width, size=9.5, leading=13, font="Review", color=BLACK):
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    line = ""
    for word in text.split():
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


def header(pdf, title, meta, page_size):
    pdf.setPageSize(page_size)
    width, height = page_size
    pdf.setFillColor(BLACK)
    pdf.rect(0, height - 54, width, 54, fill=1, stroke=0)
    pdf.setFillColor(RED)
    pdf.rect(0, height - 58, width, 4, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("ReviewBold", 15)
    pdf.drawString(28, height - 32, title)
    pdf.setFont("Review", 7.5)
    pdf.drawRightString(width - 28, height - 31, meta)
    return width, height


def footer(pdf, page, page_size):
    width, _ = page_size
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, width, 18, fill=1, stroke=0)
    pdf.setFillColor(GREY)
    pdf.setFont("Review", 7)
    pdf.drawString(24, 6, "Lokale review · geen deployment · geen echte mail · geen hardware-send")
    pdf.drawRightString(width - 24, 6, str(page))


def text_page(pdf, title, kicker, sections, page):
    size = landscape(A4)
    width, height = header(pdf, title, RELEASE, size)
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
    footer(pdf, page, size)
    pdf.showPage()


def screenshot_page(pdf, filename, role, title, scenario, page):
    path = SHOTS / filename
    if not path.exists():
        raise FileNotFoundError(path)
    with Image.open(path) as image:
        image.load()
        mobile = image.width <= 500
        size = A4 if mobile else landscape(A4)
        width, height = header(pdf, title, f"ROL · {role}", size)
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
        footer(pdf, page, size)
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
    pdf.drawString(147, height - 118, "Bouwfase 2 · Capability 003 Review")
    pdf.setFont("ReviewBold", 12)
    pdf.drawString(58, height - 190, RELEASE)
    pdf.setFont("Review", 10)
    pdf.drawString(58, height - 213, f"Configuratie: {CONFIGURATION}")
    pdf.drawString(58, height - 232, "Desktop en 390px · drie rollen · lokale reviewomgeving")
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, width, 68, fill=1, stroke=0)
    pdf.setFillColor(BLACK)
    pdf.setFont("ReviewBold", 10)
    pdf.drawString(58, 27, "READY FOR HUMAN VISUAL REVIEW")
    pdf.drawRightString(width - 58, 27, "10 augustus 2026")
    pdf.showPage()


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    pdf.setTitle("Sportpaleis Bedrukking Capability 003 Review")
    pdf.setAuthor("We Build And Design")
    pdf.setSubject("Lokale menselijke review van Sportpaleis Bedrukking Bouwfase 2")
    cover(pdf)
    page = 2

    text_page(pdf, "Bouwfase 2 afgerond voor review", "Release-overzicht", [
        ("Behouden", "De rustige Polish 002-layout, klantorder als leidend object, vereniging als context, artikelkaarten, orderbrede bedrukking, rode afwijkingen en rolgerichte navigatie blijven intact."),
        ("Eigen artikel", "Een meegebracht artikel blijft uitsluitend aan de order gekoppeld. Prijs en ontbrekend productieprofiel worden niet verzonnen; onvolledige productiedata blokkeert productie."),
        ("Teamorder", "Klant en artikel worden één keer vastgelegd. Spelernaam, maat, aantal, initialen, rugnummer en Junior/Senior blijven als afzonderlijke varianten in één klantorder."),
        ("Mail en gebruikers", "De generieke Mail Foundation ondersteunt ontvangst, in productie en gereed. Veilige eenmalige accountactivatie is admin-only en bewaart uitsluitend een tokenhash."),
    ], page)
    page += 1

    text_page(pdf, "Authority en echte Sportpaleis-data", "Configuratie", [
        ("Productiebron", "info bedrukkingen 2026.xlsx is authority voor verenigingsdata. Untitled-43.ai is de algemene productie-opbouwreferentie; Pioneers nummers.ai alleen voor specifieke cijfercontouren."),
        ("Verenigingen", "Twintig bronverenigingen zijn server-owned ingericht. Lege waarden blijven onbekend; er zijn geen fictieve catalogi, SKU's, afbeeldingen of prijzen toegevoegd."),
        ("A.S.C. broncorrectie", "Senior rugnummer is 22 cm / 220 mm, shortnummer 7,5 cm en initialen 3 cm. Junior blijft DATA_GAP tot fysieke Sportpaleis-validatie."),
        ("Design authority", "De CID Manual bepaalt huisstijlregels. Het logo-overzicht 2026 bepaalt de gekozen Sportpaleis-variant; de mail-safe asset is zonder redesign uit die bron afgeleid."),
    ], page)
    page += 1

    shots = [
        ("08-winkel-overzicht-desktop.png", "Winkelmedewerker", "Overzicht · desktop", "Een nieuwe medewerker herkent de start, actuele orders en primaire winkelacties."),
        ("09-winkel-nieuwe-order-desktop.png", "Winkelmedewerker", "Nieuwe order · desktop", "Normale orderflow met zichtbare keuzes voor Teamorder en Eigen artikel."),
        ("10-winkel-eigen-artikel-desktop.png", "Winkelmedewerker", "Eigen artikel · desktop", "Ordergebonden uitzondering met eerlijke prijs- en productieprofielstatus."),
        ("11-winkel-teamorder-desktop.png", "Winkelmedewerker", "Teamorder · desktop", "Gedeelde gegevens één keer en één duidelijke regel per speler, zonder horizontale overflow."),
        ("12-winkel-orders-desktop.png", "Winkelmedewerker", "Orders · desktop", "Klantorders blijven gezamenlijk vindbaar en worden niet per vereniging opgesplitst."),
        ("13-winkel-overzicht-mobile-390.png", "Winkelmedewerker", "Overzicht · 390px", "Herkenbare mobiele start zonder technische kennis."),
        ("14-winkel-nieuwe-order-mobile-390.png", "Winkelmedewerker", "Nieuwe order · 390px", "De normale flow en uitzonderingskeuzes blijven op 390px direct zichtbaar."),
        ("15-winkel-eigen-artikel-mobile-390.png", "Winkelmedewerker", "Eigen artikel · 390px", "Velden stapelen logisch en blijven zonder horizontale overflow bedienbaar."),
        ("16-winkel-teamorder-mobile-390.png", "Winkelmedewerker", "Teamorder · 390px", "Spelerregels stapelen in gewone werktaal en houden één ordercontext."),
        ("01-patrick-overzicht-desktop.png", "Patrick / Productie", "Overzicht · desktop", "Productierol ziet werkstatus en aandacht zonder admin- of winkelruis."),
        ("02-patrick-productie-desktop.png", "Patrick / Productie", "Productie · desktop", "Alleen maakbaar werk verschijnt per foliekleur; data-gaps blijven buiten productie."),
        ("03-patrick-orderdetail-productie-desktop.png", "Patrick / Productie", "Orderdetail · desktop", "Productiecontext, maatklasse en expliciete Junior-blokkade blijven bij het artikel."),
        ("20-winkel-mailfoundation-desktop.png", "Patrick / Productie", "Klantcommunicatie · desktop", "Lokale Mail Foundation-preview met officiële Sportpaleis-asset; niets wordt extern verstuurd."),
        ("17-patrick-productie-mobile-390.png", "Patrick / Productie", "Productie · 390px", "Productiebatches blijven mobiel leesbaar en actiegericht."),
        ("04-kevin-overzicht-desktop.png", "Kevin / Admin", "Overzicht · desktop", "Beheer behoudt operationele, financiële en configuratierechten."),
        ("05-kevin-verenigingen-desktop.png", "Kevin / Admin", "Verenigingen · desktop", "Twintig bronverenigingen, source ranges en expliciete catalogus-/maatgaten."),
        ("06-kevin-gebruikers-desktop.png", "Kevin / Admin", "Gebruikers · desktop", "Veilige uitnodiging, rolkeuze en bestaande toegang in één beheerpagina."),
        ("07-kevin-productieprofielen-desktop.png", "Kevin / Admin", "Productieprofielen · desktop", "Bronmaten en technische instructies blijven beheerbaar en verdiept."),
        ("18-kevin-verenigingen-mobile-390.png", "Kevin / Admin", "Verenigingen · 390px", "Zoekbare bronconfiguratie en expliciete onbekenden op mobiel."),
        ("19-kevin-gebruikers-mobile-390.png", "Kevin / Admin", "Gebruikers · 390px", "Uitnodigen en toegang blijven mobiel compact en rolgebonden."),
    ]
    for filename, role, title, scenario in shots:
        screenshot_page(pdf, filename, role, title, scenario, page)
        page += 1

    text_page(pdf, "Security en technisch bewijs", "Validatie", [
        ("Volledige regressie", "425 van 425 tests slagen. De Workspace-only TypeScript/Vite-build en buildverificatie slagen."),
        ("Server-side", "RBAC, CSRF, revisiecontrole, idempotency, audit/history, sessie-invalidering en productieblokkades blijven server-side authority."),
        ("Activatie", "Tokens zijn willekeurig, eenmalig en 24 uur geldig; alleen SHA-256-hash wordt opgeslagen en wachtwoorden worden met scrypt verwerkt."),
        ("Veiligheidsgrenzen", "Geen echte mail, deployment, DNS-wijziging, TransIP/VDX-mutatie, Direct Print, WinPlot, Summa of hardware-send. hardwareSendEnabled staat uit."),
    ], page)
    page += 1

    text_page(pdf, "New employee / low digital skill review", "Praktijkgebruiker", [
        ("Zonder handleiding", "De normale flow — beginnen, klant, bedrukking, vereniging, artikelen, controleren — is in de browserreview zonder voorafgaande systeemkennis te begrijpen."),
        ("Vereenvoudigd", "Nieuwe formulieren gebruiken dezelfde veldbreedte, spacing, knoptaal en mobiele stapeling als de bestaande Workspace. Dubbele klant- en artikelinvoer in Teamorder is verwijderd."),
        ("Redelijke twijfel", "Bij Eigen artikel kan profielkeuze vakinhoudelijke hulp vereisen. De veilige keuze Nog niet bekend blokkeert productie en voorkomt een stille aanname."),
        ("Resterend risico", "Verenigingen zonder gevalideerde catalogus tonen nog geen artikelen. Praktijkobservatie blijft nodig voor snelheid en uitzonderingen, niet als trainingseis voor de normale orderflow."),
    ], page)
    page += 1

    text_page(pdf, "Datagaps en reviewbesluit", "Open punten", [
        ("Input Sportpaleis", "Junior-fysieke maten; ontbrekende bronmaten; verenigingcatalogi, SKU's, beelden en prijzen; FC Almere-polo-SKU; folie-inkoopgegevens; productieprofiel per Eigen artikel."),
        ("Mailheaders", "SPF, DKIM en DMARC van de eerdere 005-test wachten nog op bevestiging via volledige ontvangen headers; deze build heeft mail of DNS niet gewijzigd."),
        ("Migratie", "SQL en configuratiemigratie zijn reviewkandidaten. Productiebackup, secret provisioning, migratie en readinesscontrole vereisen later een afzonderlijke HUMAN GO."),
        ("Beslispunt", "De softwarebuild heeft geen open blocker voor menselijke review. Bekende praktijkdata blijft zichtbaar als datagat en wordt niet als fictieve compleetheid gepresenteerd."),
    ], page)

    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
