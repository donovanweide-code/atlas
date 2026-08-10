from math import ceil
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
SHOTS = WEBSITE / "output" / "screenshots" / "SPW-BEDRUKKING-PILOT-001-20260809"
OUTPUT = ROOT / "output" / "pdf" / "SPORTPALEIS-BEDRUKKING-PILOT-BUILD-REVIEW.pdf"

RED = colors.HexColor("#d71920")
BLACK = colors.HexColor("#111111")
CREAM = colors.HexColor("#f4ead5")
GREY = colors.HexColor("#666666")
LIGHT = colors.HexColor("#f5f5f5")

font_regular = Path("C:/Windows/Fonts/arial.ttf")
font_bold = Path("C:/Windows/Fonts/arialbd.ttf")
pdfmetrics.registerFont(TTFont("Review", str(font_regular)))
pdfmetrics.registerFont(TTFont("ReviewBold", str(font_bold)))


def wrap(pdf, text, x, y, width, size=10, leading=14, font="Review", color=BLACK):
    pdf.setFont(font, size)
    pdf.setFillColor(color)
    words = text.split()
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if pdf.stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            pdf.drawString(x, y, line)
            y -= leading
            line = word
    if line:
        pdf.drawString(x, y, line)
        y -= leading
    return y


def header(pdf, title, subtitle, page_size=landscape(A4)):
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
    pdf.drawRightString(width - 28, height - 31, subtitle)
    return width, height


def footer(pdf, page_number, page_size):
    width, _ = page_size
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, width, 18, fill=1, stroke=0)
    pdf.setFillColor(GREY)
    pdf.setFont("Review", 7)
    pdf.drawString(24, 6, "Lokale review · geen deployment · geen echte mail · geen hardware-send")
    pdf.drawRightString(width - 24, 6, str(page_number))


def text_page(pdf, title, kicker, bullets, page_number):
    size = landscape(A4)
    width, height = header(pdf, title, "SPW-BEDRUKKING-PILOT-001-20260809", size)
    pdf.setFillColor(RED)
    pdf.setFont("ReviewBold", 9)
    pdf.drawString(34, height - 92, kicker.upper())
    y = height - 125
    for label, body in bullets:
        pdf.setFillColor(BLACK)
        pdf.setFont("ReviewBold", 12)
        pdf.drawString(42, y, label)
        y -= 18
        y = wrap(pdf, body, 58, y, width - 116, 10, 14, "Review", GREY) - 10
    footer(pdf, page_number, size)
    pdf.showPage()


def screenshot_page(pdf, filename, role, page, scenario, page_number):
    path = SHOTS / filename
    with Image.open(path) as image:
        image.load()
        ratio = image.width / image.height
        if image.width <= 500:
            parts = min(4, max(1, ceil(image.height / 1100)))
        else:
            parts = min(3, max(1, ceil(image.height / 1900)))
        page_size = landscape(A4) if parts > 1 or ratio >= 0.72 else A4
        width, height = header(pdf, page, f"ROL · {role}", page_size)
        caption_y = height - 78
        pdf.setFillColor(RED)
        pdf.setFont("ReviewBold", 9)
        pdf.drawString(28, caption_y, "GETEST SCENARIO")
        wrap(pdf, scenario, 128, caption_y, width - 156, 8.5, 11, "Review", GREY)

        available_x = 24
        available_y = 30
        available_width = width - 48
        available_height = height - 132
        if parts == 1:
            segments = [image.copy()]
        else:
            segment_height = ceil(image.height / parts)
            segments = [image.crop((0, index * segment_height, image.width, min(image.height, (index + 1) * segment_height))) for index in range(parts)]
        gap = 9
        slot_width = (available_width - gap * (len(segments) - 1)) / len(segments)
        rendered = []
        for segment in segments:
            segment_scale = min(slot_width / segment.width, available_height / segment.height)
            rendered.append((segment, segment.width * segment_scale, segment.height * segment_scale))
        total_width = sum(item[1] for item in rendered) + gap * (len(rendered) - 1)
        x = (width - total_width) / 2
        for index, (segment, draw_width, draw_height) in enumerate(rendered, start=1):
            y = available_y + (available_height - draw_height) / 2
            pdf.setFillColor(LIGHT)
            pdf.roundRect(x - 3, y - 3, draw_width + 6, draw_height + 6, 4, fill=1, stroke=0)
            raster_scale = min(1, 1400 / segment.width, 1000 / segment.height)
            raster = segment.convert("RGB")
            if raster_scale < 1:
                raster = raster.resize((max(1, round(segment.width * raster_scale)), max(1, round(segment.height * raster_scale))), Image.Resampling.LANCZOS)
            buffer = BytesIO()
            raster.save(buffer, format="JPEG", quality=84, optimize=True)
            buffer.seek(0)
            pdf.drawImage(ImageReader(buffer), x, y, draw_width, draw_height, preserveAspectRatio=True)
            if len(rendered) > 1:
                pdf.setFillColor(GREY)
                pdf.setFont("Review", 6)
                pdf.drawCentredString(x + draw_width / 2, y - 10, f"deel {index}/{len(rendered)}")
            x += draw_width + gap
            raster.close()
            segment.close()
        footer(pdf, page_number, page_size)
        pdf.showPage()


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = Canvas(str(OUTPUT), pagesize=landscape(A4), pageCompression=1)
    pdf.setTitle("Sportpaleis Bedrukking Pilot Build Review")
    pdf.setAuthor("We Build And Design")
    pdf.setSubject("Lokale visuele en functionele pilotreview")

    page = 1
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
    pdf.setFont("ReviewBold", 28)
    pdf.drawString(146, height - 91, "SPORTPALEIS BEDRUKKING")
    pdf.setFont("Review", 15)
    pdf.drawString(147, height - 118, "Minimal Pilot Build Review 001")
    pdf.setFillColor(CREAM)
    pdf.rect(0, 0, width, 68, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("ReviewBold", 12)
    pdf.drawString(58, height - 190, "SPW-BEDRUKKING-PILOT-001-20260809")
    pdf.setFont("Review", 10)
    pdf.drawString(58, height - 212, "UX-baseline: SPW-008A-BIJSTURING-20260808")
    pdf.drawString(58, height - 230, "Lokale review · capture-only · Direct Print vergrendeld")
    pdf.setFillColor(BLACK)
    pdf.setFont("ReviewBold", 10)
    pdf.drawString(58, 27, "READY FOR HUMAN VISUAL REVIEW")
    pdf.drawRightString(width - 58, 27, "10 augustus 2026")
    pdf.showPage()
    page += 1

    text_page(pdf, "Wat deze build bewijst", "Scope", [
        ("Bestaande UX behouden", "De rustige 008A-orderflow, verenigingscontext, visuele artikelkaarten, orderbrede standaardbedrukking en rode artikelafwijking zijn behouden."),
        ("Nieuwe pilotkern", "Junior/Senior is alleen zichtbaar en verplicht bij een rugnummer, erft orderbreed en kan per artikel of variant veilig afwijken."),
        ("Veilige communicatie", "Een individuele order legt verplicht ORDER_RECEIVED lokaal vast. Geen externe mail is verzonden; unknown outcome en duplicates blijven fail-safe."),
        ("Productiegrens", "Senior gebruikt de gevalideerde 200 mm. Junior blijft een zichtbaar datagap en kan niet van Order naar Controle."),
    ], page)
    page += 1

    shots = [
        ("01-winkelmedewerker-nieuwe-order-start-desktop.png", "Winkelmedewerker", "Nieuwe order · desktop", "Rustige start zonder rugnummermaat; klant, standaardbedrukking, vereniging en kassa in één bestaande flow."),
        ("02-standaardbedrukking-junior-senior-desktop.png", "Winkelmedewerker", "Standaardbedrukking · desktop", "Rugnummer 34 maakt de verplichte Junior/Senior-keuze zichtbaar; Senior is gekozen."),
        ("03-vereniging-artikelcatalogus-desktop.png", "Winkelmedewerker", "Vereniging en catalogus · desktop", "A.S.C. Waterwijk opent de bestaande visuele artikelcatalogus zonder generiek dropdownformulier."),
        ("04-meerdere-artikelen-orderstandaard-desktop.png", "Winkelmedewerker", "Meerdere artikelen · desktop", "Shirt, short en trainingsjack blijven één klantorder en erven de orderstandaard volgens hun artikelregels."),
        ("05-rode-artikelafwijking-junior-desktop.png", "Winkelmedewerker", "Artikelafwijking · desktop", "Eén shirt wijkt rood gemarkeerd af naar rugnummer 77 Junior; overige artikelen blijven rustig en geërfd."),
        ("06-orderoverzicht-controle-desktop.png", "Winkelmedewerker", "Kassa-overzicht · desktop", "Samenvatting toont de gekozen artikelen, bedrukking en expliciet ontbrekende beheerde prijzen zonder bedragen te gokken."),
        ("07-orderdetail-winkelmedewerker-desktop.png", "Winkelmedewerker", "Orderdetail · desktop", "Aangemaakte individuele order met Junior-datagap, artikelherkomst en veilige correctieroute."),
        ("08-verplichte-ontvangstbevestiging-desktop.png", "Winkelmedewerker", "Klantcommunicatie · desktop", "ORDER_RECEIVED staat lokaal op CAPTURED; duplicaatverzending is geblokkeerd en er is geen internetmail verstuurd."),
        ("09-veilige-correctie-orderfase-desktop.png", "Winkelmedewerker", "Veilige correctie · desktop", "Dezelfde orderflow wordt hergebruikt in fase Order, met revision, auditmelding en productievergrendeling vanaf Controle."),
        ("10-patrick-productiebatches-desktop.png", "Patrick / Productie", "Productie-overzicht · desktop", "Batches per foliekleur met Direct Print en barcodehardware expliciet vergrendeld."),
        ("11-patrick-orderdetail-productiecontext-desktop.png", "Patrick / Productie", "Productie-orderdetail · desktop", "Junior fysieke maat is zichtbaar onbekend; Productiedata vereist blokkeert doorgang naar Controle."),
        ("12-patrick-orderdetail-productiecontext-mobile-390.png", "Patrick / Productie", "Productie-orderdetail · 390 px", "Dezelfde blocker, artikelcontext en status blijven bruikbaar op mobiel."),
        ("13-patrick-productiebatches-mobile-390.png", "Patrick / Productie", "Productiebatches · 390 px", "Foliebatches en veiligheidsgrenzen stapelen zonder horizontale overflow."),
        ("14-winkelmedewerker-nieuwe-order-start-mobile-390.png", "Winkelmedewerker", "Nieuwe order · 390 px", "De bestaande orderinvoer blijft rustig, leesbaar en zonder horizontale overflow."),
        ("15-vereniging-artikelkeuze-junior-senior-mobile-390.png", "Winkelmedewerker", "Artikelkeuze · 390 px", "Vereniging, productkaarten en Junior/Senior passen binnen dezelfde mobiele flow."),
        ("16-rode-artikelafwijking-junior-mobile-390.png", "Winkelmedewerker", "Artikelafwijking · 390 px", "Rode afwijking en Junior-keuze blijven herkenbaar; klantvelden blijven behouden na rerenders."),
        ("17-orderdetail-communicatie-mobile-390.png", "Winkelmedewerker", "Orderdetail en communicatie · 390 px", "Ordercontext, CAPTURED ontvangstbevestiging en datagap blijven mobiel zichtbaar."),
        ("18-veilige-correctie-mobile-390.png", "Winkelmedewerker", "Veilige correctie · 390 px", "Revision- en lockcontext staan boven de bestaande mobiele orderflow."),
    ]
    for filename, role, page_title, scenario in shots:
        screenshot_page(pdf, filename, role, page_title, scenario, page)
        page += 1

    text_page(pdf, "Regressie en technische controle", "Bewijs", [
        ("Volledige suite", "Alle bestaande en nieuwe tests slagen. De pilot suite controleert Junior/Senior, inheritance, overrides, mailgate, retry/unknown/idempotency, correctielock, schema/migratie en responsive contracten."),
        ("Echte browser", "Desktop 1440 en mobiel 390 zijn in de lokale reviewserver doorlopen. document.scrollWidth is gelijk aan clientWidth op beide formaten."),
        ("Persistence", "Schema versie 2, reproduceerbare MariaDB-migratie en row mapping bewaren historische records zonder Junior/Senior te gokken."),
        ("Release hygiene", "Eén release-ID wordt gebruikt. De oude 008A-server en data zijn niet overschreven; de pilotreview gebruikt een eigen datastore."),
    ], page)
    page += 1

    text_page(pdf, "Bekende resterende punten", "Eerlijk zichtbaar", [
        ("DATA BLOCKER: YES", "De fysieke Junior-rugnummerhoogte ontbreekt. Effect: order kan worden vastgelegd en beoordeeld, maar niet naar Controle totdat Sportpaleis productie de maat valideert."),
        ("Prijsdata", "Bestaande ontbrekende artikel- en bedrukprijzen blijven expliciet Prijs ontbreekt. Er zijn geen fictieve bedragen toegevoegd."),
        ("Artikeldata", "De bestaande FC Almere-polo heeft een nog te valideren artikelnummer en blijft als zodanig zichtbaar."),
        ("Mailauthenticatie", "Sportpaleis Mail 005 inboxdelivery is bevestigd; SPF, DKIM en DMARC wachten nog op afzonderlijke volledige-headercontrole."),
    ], page)
    page += 1

    text_page(pdf, "Buiten scope en volgende grens", "Niet uitgevoerd", [
        ("Geen productieactie", "Geen TransIP-deployment, DNS-wijziging, echte mail, VDX-mutatie, Direct Print, Summa, barcodehardware of automatische verzending."),
        ("Geen scope-uitbreiding", "Geen Teamorder, Eigen artikel, externe catalogusconnector, nieuw financieel systeem of nieuwe redesignronde."),
        ("Later pas na GO", "Databasebackup, before-checks, gecontroleerde migratie, after-checks, runtime health en capture-only smoke test staan gedocumenteerd voor een afzonderlijke TransIP-opdracht."),
        ("Beslispunt", "Deze build is gereed voor menselijke visuele review. Pilotproductie met Junior-rugnummers blijft NO-GO totdat de fysieke maat is gevalideerd."),
    ], page)

    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
