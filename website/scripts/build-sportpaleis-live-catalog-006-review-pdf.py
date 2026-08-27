from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image as RLImage,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
SITE = ROOT / "website"
SCREENSHOT_DIR = SITE / "output" / "sportpaleis-live-catalog-006-review"
OUTPUT = ROOT / "output" / "pdf" / "SPORTPALEIS-WORKSPACE-LIVE-CATALOG-006-REVIEW.pdf"
RELEASE = "SPW-BEDRUKKING-LIVE-CATALOG-006-20260810"

PAGE_W, PAGE_H = landscape(A4)
MARGIN_X = 17 * mm
MARGIN_TOP = 15 * mm
MARGIN_BOTTOM = 14 * mm

BLACK = colors.HexColor("#0A0A0A")
RED = colors.HexColor("#DF002B")
CREAM = colors.HexColor("#F7F3EA")
SOFT_RED = colors.HexColor("#FFF1F3")
MUTED = colors.HexColor("#6A6A6A")
LINE = colors.HexColor("#D9D9D9")


ARTICLES = [
    ("A.S.C. Waterwijk", "137294", "SELECTIE", "Wedstrijdshirt selectie", "Rugnummer"),
    ("A.S.C. Waterwijk", "137295", "BREEDTE", "Wedstrijdshirt breedte", "Rugnummer"),
    ("A.S.C. Waterwijk", "134826", "420002", "Wedstrijdshort", "Shortnummer"),
    ("A.S.C. Waterwijk", "140218", "410001", "Reserve shirt", "Rugnummer"),
    ("A.S.C. Waterwijk", "140219", "420000", "Reserve short", "Shortnummer"),
    ("A.S.C. Waterwijk", "140221", "410015", "Training shirt", "Initialen"),
    ("A.S.C. Waterwijk", "109097", "420002", "Trainingsshort", "Nummer - DATA_GAP"),
    ("A.S.C. Waterwijk", "140224", "408039", "Full zip jack", "Initialen"),
    ("A.S.C. Waterwijk", "140228", "408040", "Zip top", "Initialen"),
    ("A.S.C. Waterwijk", "140304", "432013", "Stadio pants", "Initialen"),
    ("A.S.C. Waterwijk", "140226", "463003", "Presentatie polo", "Initialen"),
    ("A.S.C. Waterwijk", "137293", "415009", "Keepersset breedte", "Rugnummer"),
    ("A.S.C. Waterwijk", "136241", "415009", "Keepersset selectie", "Rugnummer"),
    ("A.S.C. Waterwijk", "109104", "454002", "Regenjack", "Initialen"),
    ("A.S.C. Waterwijk", "111793", "457006", "Winterjas", "Initialen"),
    ("A.S.C. Waterwijk", "139145", "484807", "Rugtas", "Initialen"),
    ("A.S.C. Waterwijk", "109099", "484835", "Voetbaltas", "Initialen"),
    ("A.S.C. Waterwijk", "109098", "484838", "Voetbal rugtas", "Initialen"),
    ("A.S.C. Waterwijk", "124663", "410008", "Presentatieshirt", "Initialen + Nummer"),
    ("A.S.C. Waterwijk", "123689", "408024", "Hoodie", "Initialen"),
    ("A.S.C. Waterwijk", "123692", "408027", "Trainingstop", "Initialen"),
    ("A.S.C. Waterwijk", "123691", "410008", "Training/uit shirt", "Nummer - DATA_GAP"),
    ("FC Almere", "116597", "695904", "Wedstrijdshirt", "Rugnummer"),
    ("FC Almere", "141521", "420004", "Wedstrijd/training short", "Nummer - DATA_GAP"),
    ("Almere Pioneers", "116386", "DM0Q3S25980", "Wedstrijdshirt omkeerbaar", "Rug/borst/short nummer + naam"),
    ("Almere Pioneers", "116388", "FM703C25980", "Shooting shirt", "Rug/borst/short nummer + naam"),
    ("Almere Pioneers", "116387", "FP713Z08260", "Wedstrijdshort", "Rug/borst/short nummer + naam"),
]

ASSOCIATIONS = [
    ("A.S.C. Waterwijk", 41), ("Echtnaton", 6), ("Almere Pioneers", 10),
    ("Almere'81", 20), ("Almere City Youth", 15), ("AS'80", 53),
    ("Brouwer Sports", 8), ("Buitenhout", 22), ("DCG", 28),
    ("DCG Selectie", "HTTP 500"), ("EKVA", 17), ("FC Almere", 31),
    ("FC Almere Selectie", 21), ("Hasselbaink", 6), ("HBSA", 11),
    ("Het Nieuwe Land", 19), ("Koriander", 14), ("Najaden", 3),
    ("MHC Lelystad", 19), ("SC Buitenboys", 35), ("Sloeproeien", 5),
    ("s.v. Huizen", 20), ("Trainers", 27), ("Sporting Almere", 26),
    ("SV Geinburgia", 23), ("United Dance", 14), ("VVA/Spartaan", 29),
    ("Wooter", 18),
]

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverKicker", fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=RED, spaceAfter=7))
styles.add(ParagraphStyle(name="CoverTitle", fontName="Helvetica-Bold", fontSize=25, leading=28, textColor=BLACK, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverBody", fontName="Helvetica", fontSize=11, leading=15, textColor=BLACK, spaceAfter=7))
styles.add(ParagraphStyle(name="H1x", fontName="Helvetica-Bold", fontSize=18, leading=21, textColor=BLACK, spaceAfter=9))
styles.add(ParagraphStyle(name="H2x", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=BLACK, spaceBefore=5, spaceAfter=4))
styles.add(ParagraphStyle(name="Bodyx", fontName="Helvetica", fontSize=8.5, leading=11.2, textColor=BLACK, spaceAfter=4))
styles.add(ParagraphStyle(name="Smallx", fontName="Helvetica", fontSize=7, leading=9, textColor=MUTED))
styles.add(ParagraphStyle(name="Status", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=BLACK, spaceAfter=5))
styles.add(ParagraphStyle(name="ShotTitle", fontName="Helvetica-Bold", fontSize=15, leading=18, textColor=BLACK, spaceAfter=4))
styles.add(ParagraphStyle(name="ShotMeta", fontName="Helvetica", fontSize=8.5, leading=11, textColor=MUTED, spaceAfter=7))


def safe(text):
    return str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(MARGIN_X, 9.5 * mm, PAGE_W - MARGIN_X, 9.5 * mm)
    canvas.setFont("Helvetica", 6.8)
    canvas.setFillColor(MUTED)
    canvas.drawString(MARGIN_X, 5.8 * mm, RELEASE)
    canvas.drawRightString(PAGE_W - MARGIN_X, 5.8 * mm, f"Pagina {doc.page}")
    canvas.restoreState()


def paragraph(text, style="Bodyx"):
    return Paragraph(text, styles[style])


def pill_table(items):
    cells = []
    for label, value, tone in items:
        bg = SOFT_RED if tone == "red" else CREAM
        cells.append([paragraph(label.upper(), "Smallx"), paragraph(value, "Status"), bg])
    table = Table([[c[0] for c in cells], [c[1] for c in cells]], colWidths=[(PAGE_W - 2 * MARGIN_X) / len(cells)] * len(cells))
    backgrounds = []
    for index, cell in enumerate(cells):
        backgrounds.append(("BACKGROUND", (index, 0), (index, 1), cell[2]))
    table.setStyle(TableStyle([
        *backgrounds,
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def data_table(rows, widths, font_size=7):
    table = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLACK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), font_size),
        ("LEADING", (0, 0), (-1, -1), font_size + 2),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]))
    return table


def screenshot_flowable(path, max_width, max_height):
    with Image.open(path) as im:
        width, height = im.size
    scale = min(max_width / width, max_height / height)
    return RLImage(str(path), width=width * scale, height=height * scale)


class ReviewDocTemplate(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=landscape(A4), leftMargin=MARGIN_X, rightMargin=MARGIN_X,
                         topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="main")
        self.addPageTemplates([PageTemplate(id="review", frames=[frame], onPage=footer)])


story = []

# Cover
story += [
    Spacer(1, 15 * mm),
    paragraph("SPORT 2000 SPORTPALEIS WORKSPACE", "CoverKicker"),
    paragraph("Live catalog reconciliation &amp; pilot readiness review", "CoverTitle"),
    paragraph("Deze review legt vast wat aantoonbaar live is, wat technisch is gevalideerd en welke productiegegevens bewust geblokkeerd blijven als DATA_GAP.", "CoverBody"),
    Spacer(1, 5 * mm),
    pill_table([
        ("Live pilotartikelen", "27", "neutral"),
        ("Pilotverenigingen", "3", "neutral"),
        ("Volledige tests", "448 / 448 PASS", "neutral"),
        ("Productieready", "0 live artikelen", "red"),
    ]),
    Spacer(1, 8 * mm),
    paragraph(f"Release: <b>{RELEASE}</b>", "CoverBody"),
    paragraph("Reviewdatum: 10 augustus 2026 · Omgeving: lokaal · Geen deployment, mail, DNS, WinPlot, Summa of Direct Print", "CoverBody"),
    Spacer(1, 7 * mm),
    paragraph("Kernbesluit", "H2x"),
    paragraph("De commerciële live-catalogus en multi-vereniging-orderlogica zijn aantoonbaar aanwezig. De fysieke productie blijft NO-GO zolang positie, referentieafstand, rotatie en spiegeling niet per relevant profiel zijn bevestigd.", "CoverBody"),
    PageBreak(),
]

# Source hierarchy and association inventory
story += [
    paragraph("1. Bronhiërarchie en live verenigingsinventaris", "H1x"),
    paragraph("Commerciële artikelgegevens komen uit de live Sportpaleis-catalogus. Productiegegevens komen uitsluitend uit bevestigde Sportpaleis-bronnen of fysieke testbewijzen. Ontbrekende technische waarden blijven DATA_GAP.", "Bodyx"),
    Spacer(1, 2 * mm),
]
association_rows = [["Verenigingscatalogus", "Live artikelen", "Inventarisstatus"]]
for name, count in ASSOCIATIONS:
    status = "SITE_ERROR" if isinstance(count, str) else "LIVE"
    association_rows.append([name, str(count), status])
story.append(data_table(association_rows, [92 * mm, 34 * mm, 42 * mm], font_size=6.8))
story += [
    Spacer(1, 4 * mm),
    paragraph("Uitkomst: 27 van 28 gecontroleerde categorieën waren live. DCG Selectie gaf HTTP 500. De technische pilotset bevat bewust 27 bedrukking-relevante artikelen uit Waterwijk, FC Almere en Pioneers; dit is geen Waterwijk-only architectuur.", "Bodyx"),
    PageBreak(),
]

# Article inventory split over two pages
for page_index, subset in enumerate((ARTICLES[:14], ARTICLES[14:]), start=1):
    story += [
        paragraph(f"2. Geselecteerde live pilotartikelen ({page_index}/2)", "H1x"),
        paragraph("SKU, leveranciercode, naam en commerciële bedrukoptie zijn uit de live bron overgenomen. 'Nummer' blijft productie-technisch geblokkeerd waar de precieze betekenis niet is bevestigd.", "Bodyx"),
    ]
    rows = [["Vereniging", "SKU", "Leverancier", "Artikel", "Live bedrukoptie"]]
    rows += [[safe(value) for value in article] for article in subset]
    story.append(data_table(rows, [34 * mm, 20 * mm, 28 * mm, 67 * mm, 66 * mm], font_size=6.3))
    story.append(PageBreak())

# Reconciliation summary
story += [
    paragraph("3. Besluit-/bronnenreconciliation", "H1x"),
]
reconciliation_rows = [
    ["Besluit/bron", "Huidige implementatie", "Testdekking", "Status"],
    ["Live artikeldata", "Vereniging, SKU, leverancier, beeld, maten, opties en URL per artikel", "Live catalog 006", "GEÏMPLEMENTEERD"],
    ["Vereniging -> artikelen", "Generieke associatie per artikel voor normale order en Teamorder", "Multi-vereniging tests", "GEÏMPLEMENTEERD"],
    ["Meerdere verenigingen per order", "Iedere regel houdt eigen vereniging en productieprofiel", "SP-2026-0105 + serverpolicy", "PASS"],
    ["Toegestane bedrukking", "Alleen live opties; onbekend 'Nummer' wordt niet technisch geïnterpreteerd", "Negatieve servervalidatie", "VEILIG GEBLOKKEERD"],
    ["Pioneers Snijtest 001", "Senior 200 mm; fysieke snijlijnen 2, 34 en 77", "Provenance-assertions", "VALIDATED - beperkte scope"],
    ["Positie/afstand/rotatie/spiegelen", "Zichtbaar als DATA_GAP en blokkeert productie", "Readiness + Patrick review", "DATA_GAP"],
    ["End-to-end live productiepad", "Geen artikel voldoet aan alle technische productie-eisen", "Volledige readinesssuite", "NO-GO"],
]
story.append(data_table(reconciliation_rows, [42 * mm, 98 * mm, 55 * mm, 48 * mm], font_size=6.6))
story += [
    Spacer(1, 5 * mm),
    paragraph("Pioneers bewijsgrens", "H2x"),
    paragraph("Human confirmation bewijst de fysieke snijlijnen voor rugnummers 2, 34 en 77 op 200 mm. De aangetroffen documentatie bewijst geen Junior 160 mm, shortnummer 80 mm, positionering, referentieafstand, spiegeling of rotatie. Deze waarden zijn daarom niet gepromoveerd naar VALIDATED en de test is niet als Golden Production Reference gemarkeerd.", "Bodyx"),
    paragraph("Testresultaat: 7/7 gerichte catalogustests PASS · 448/448 volledige repositorytests PASS · Workspace-build PASS.", "Status"),
    PageBreak(),
]


SCREENSHOTS = [
    ("01-kevin-artikelbeheer-live-desktop.png", "Kevin / Admin", "Artikelbeheer", "Live SKU, leveranciercode, afbeelding, opties en provenance zijn praktisch bereikbaar."),
    ("02-kevin-pioneers-bewezen-scope-desktop.png", "Kevin / Admin", "Technische profielen", "Pioneers 200 mm en snijlijnen 2, 34 en 77 zijn bewezen; short en overige technische velden blijven DATA_GAP."),
    ("03-winkelmedewerker-live-catalogus-desktop.png", "Winkelmedewerker", "Nieuwe order", "Live Waterwijk-artikelkaarten met beeld, SKU en snelle selectie."),
    ("04-winkelmedewerker-teamorder-live-desktop.png", "Winkelmedewerker", "Teamorder", "Generieke groepsinvoer met vereniging, live artikelen en snelle nummerreeks."),
    ("05-winkelmedewerker-pioneers-390px.png", "Winkelmedewerker", "Nieuwe order - 390 px", "Mobiele Pioneers-catalogus met echte productbeelden en geselecteerd live artikel."),
    ("06-winkelmedewerker-multi-vereniging-orderdetail-desktop.png", "Winkelmedewerker", "Orderdetail SP-2026-0105", "Eén klantorder bevat Waterwijk en FC Almere, met productieblokkades per regel."),
    ("07-patrick-productie-datagap-desktop.png", "Patrick / Productie", "Productieorder", "Exacte ontbrekende productievelden zijn zichtbaar; doorzetten blijft geblokkeerd."),
]

for filename, role, page, scenario in SCREENSHOTS:
    path = SCREENSHOT_DIR / filename
    max_height = 125 * mm if "390px" not in filename else 132 * mm
    story += [
        paragraph(page, "ShotTitle"),
        paragraph(f"Rol: <b>{safe(role)}</b> · Scenario: {safe(scenario)}", "ShotMeta"),
        screenshot_flowable(path, PAGE_W - 2 * MARGIN_X, max_height),
        PageBreak(),
    ]

# Final conclusion
story += [
    paragraph("4. Eindconclusie en beslisstatus", "H1x"),
    paragraph("De live commerciële basis is aantoonbaar, vereniging-onafhankelijk en server-side bewaakt. Dat maakt de huidige release geschikt voor human review van catalogus en orderflow, maar nog niet voor een fysieke productiepilot.", "CoverBody"),
    Spacer(1, 3 * mm),
    pill_table([
        ("Live pilotcatalogus", "GEDEELTELIJK", "red"),
        ("End-to-end productieready", "NEE", "red"),
        ("Pilot readiness", "NOT READY", "red"),
    ]),
    Spacer(1, 6 * mm),
    paragraph("MULTI-VERENIGING LIVE CATALOGUS: PASS", "Status"),
    paragraph("MULTI-VERENIGING ORDER: PASS", "Status"),
    paragraph("HARDCODED WATERWIJK-AFHANKELIJKHEID: GEEN", "Status"),
    Spacer(1, 4 * mm),
    paragraph("Resterende blokkade", "H2x"),
    paragraph("Minimaal één live artikel moet nog een volledig bevestigd productieprofiel krijgen: exacte positie, referentieafstand, rotatie, spiegeling en alle artikel-/vereniging-specifieke uitvoerwaarden. Dat moet uit Sportpaleis-praktijkvalidatie komen; deze review vult niets op basis van aannames in.", "Bodyx"),
    Spacer(1, 4 * mm),
    paragraph("Niet uitgevoerd", "H2x"),
    paragraph("Geen productie-deployment, SMTP-send, DNS-wijziging, Direct Print-activatie, WinPlot-output of Summa-output.", "Bodyx"),
]


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = ReviewDocTemplate(str(OUTPUT))
doc.build(story)
print(OUTPUT)
