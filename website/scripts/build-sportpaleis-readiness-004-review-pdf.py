from pathlib import Path

from PIL import Image
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
CAPTURE_DIR = ROOT / "website" / "output" / "sportpaleis-readiness-004-review"
OUTPUT = ROOT / "output" / "pdf" / "SPORTPALEIS-WORKSPACE-FINAL-PILOT-READINESS-004-REVIEW.pdf"

PAGES = [
    ("01-winkelmedewerker-overzicht-desktop.png", "Winkelmedewerker", "Overzicht", "Laatste order herkennen en direct een nieuwe order starten"),
    ("02-winkelmedewerker-nieuwe-order-desktop.png", "Winkelmedewerker", "Nieuwe order", "Klant, bedrukking, vereniging en artikelen in één rustige volgorde"),
    ("03-winkelmedewerker-orders-desktop.png", "Winkelmedewerker", "Orders", "Orders terugvinden; secundaire ordersoorten blijven beschikbaar"),
    ("04-winkelmedewerker-teamorder-start-desktop.png", "Winkelmedewerker", "Teamorder", "Eerst groepsinformatie, pilotartikelen en nummerreeks"),
    ("05-winkelmedewerker-teamorder-18x2-desktop.png", "Winkelmedewerker", "Teamorder", "Reeks 1-18 met twee artikeltypen maakt 36 controleerbare regels"),
    ("06-winkelmedewerker-teamorder-afwijking-desktop.png", "Winkelmedewerker", "Teamorder", "Eén afwijkend rugnummer 99 expliciet aanpassen"),
    ("07-winkelmedewerker-nieuwe-order-390px.png", "Winkelmedewerker", "Nieuwe order - 390px", "Primaire orderflow blijft mobiel leesbaar en taakgericht"),
    ("08-winkelmedewerker-teamorder-390px.png", "Winkelmedewerker", "Teamorder - 390px", "Groepsinformatie en volgende stap op mobiel"),
    ("12-patrick-orders-bulk-desktop.png", "Patrick / Productie", "Orders", "10/20/30/alles-selectie en productievoorstel"),
    ("10-patrick-productie-desktop.png", "Patrick / Productie", "Productie", "Maakbaar werk per foliekleur; geen automatische hardwarestap"),
    ("13-patrick-productievoorstel-datagap-geblokkeerd-desktop.png", "Patrick / Productie", "Productievoorstel", "DATA_GAP is zichtbaar en blokkeert menselijke GO"),
    ("11-patrick-technische-profielen-desktop.png", "Patrick / Productie", "Technische profielen", "Maat, positie, letterprofiel, afstand en rotatie alleen-lezen"),
    ("14-kevin-beheer-overzicht-desktop.png", "Kevin / Beheer", "Beheer", "Beheercontext en bestaande financiële/commerciële routes"),
    ("15-kevin-verenigingen-desktop.png", "Kevin / Beheer", "Verenigingen", "Brondata, DATA_GAP, catalogusstatus en beheerde correctie"),
    ("17-kevin-verkoopnummer-beheer-desktop.png", "Kevin / Beheer", "Gebruiker beheren", "Verkoopnummer en rol server-owned beheren"),
    ("18-kevin-verenigingen-390px.png", "Kevin / Beheer", "Verenigingen - 390px", "Verenigingslijst zonder geneste scroll op mobiel"),
    ("21-feedback-met-bijlage-desktop.png", "Samenwerken / Beheer", "Feedback", "Context wordt automatisch meegenomen; screenshot of foto is optioneel"),
    ("22-feedback-met-geselecteerde-bijlage-390px.png", "Samenwerken / Mobiel", "Feedback - 390px", "Mobiele afbeelding geselecteerd; limiet en bestandstype blijven zichtbaar"),
    ("19-sportpaleis-mailtemplate-desktop.png", "Klantmail / Capture", "Order ontvangen", "Zwarte header en groter officieel Sportpaleis-logo - desktop"),
    ("20-sportpaleis-mailtemplate-390px.png", "Klantmail / Capture", "Order ontvangen - 390px", "Mailtemplate mobiel; capture-only, geen echte mail"),
]


def fit_image(image_width, image_height, box_width, box_height):
    scale = min(box_width / image_width, box_height / image_height)
    return image_width * scale, image_height * scale


def cover(pdf):
    width, height = A4
    pdf.setPageSize(A4)
    pdf.setFillColor(HexColor("#000000"))
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#D10019"))
    pdf.rect(0, height - 12, width, 12, fill=1, stroke=0)
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(42, height - 72, "SPORT 2000 SPORTPALEIS")
    pdf.setFont("Helvetica", 10)
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.drawString(42, height - 91, "WORKSPACE - LOKALE PILOTREVIEW")
    pdf.setFont("Helvetica-Bold", 28)
    pdf.drawString(42, height - 160, "FINAL PILOT READINESS 004")
    pdf.setFont("Helvetica", 13)
    pdf.drawString(42, height - 190, "Winkelmedewerker -> Patrick / Productie -> Kevin / Beheer")
    pdf.setFillColor(HexColor("#151515"))
    pdf.roundRect(42, height - 380, width - 84, 132, 8, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(62, height - 283, "READY FOR FINAL HUMAN PILOT REVIEW")
    pdf.setFont("Helvetica", 10)
    lines = [
        "Release: SPW-BEDRUKKING-PILOT-READINESS-004-20260810",
        "434/434 regressietests PASS - Workspace build PASS",
        "Desktop + 390px - drie rollen - mail capture - geen deployment",
        "DATA_GAP blijft zichtbaar en blokkeert productie-GO",
    ]
    y = height - 310
    for line in lines:
        pdf.drawString(62, y, line)
        y -= 20
    pdf.setFillColor(HexColor("#AFAFAF"))
    pdf.setFont("Helvetica", 9)
    pdf.drawString(42, 42, "10 augustus 2026 - lokaal reviewartefact - geen echte mail of hardware-send")
    pdf.showPage()


def screenshot_page(pdf, image_path, role, page_name, scenario, number, total):
    with Image.open(image_path) as image:
        image_width, image_height = image.size
    page_size = landscape(A4) if image_width >= image_height else A4
    width, height = page_size
    pdf.setPageSize(page_size)
    pdf.setFillColor(HexColor("#F3F3F3"))
    pdf.rect(0, 0, width, height, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#000000"))
    pdf.rect(0, height - 54, width, 54, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#D10019"))
    pdf.rect(0, height - 57, width, 3, fill=1, stroke=0)
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(24, height - 22, f"{role}  |  {page_name}")
    pdf.setFont("Helvetica", 8.5)
    pdf.drawString(24, height - 39, scenario)
    margin_x = 22
    footer_height = 25
    box_top = height - 68
    box_height = box_top - footer_height
    draw_width, draw_height = fit_image(image_width, image_height, width - 2 * margin_x, box_height)
    x = (width - draw_width) / 2
    y = footer_height + (box_height - draw_height) / 2
    pdf.setFillColor(HexColor("#FFFFFF"))
    pdf.rect(x - 2, y - 2, draw_width + 4, draw_height + 4, fill=1, stroke=0)
    pdf.drawImage(str(image_path), x, y, width=draw_width, height=draw_height, preserveAspectRatio=True, mask="auto")
    pdf.setFillColor(HexColor("#555555"))
    pdf.setFont("Helvetica", 7.5)
    pdf.drawRightString(width - 22, 10, f"Beeld {number}/{total} - SPW Readiness 004")
    pdf.showPage()


def main():
    missing = [name for name, *_ in PAGES if not (CAPTURE_DIR / name).exists()]
    if missing:
        raise FileNotFoundError(f"Ontbrekende reviewbeelden: {missing}")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
    pdf.setTitle("Sportpaleis Workspace - Final Pilot Readiness 004 Review")
    pdf.setAuthor("We Build And Design")
    cover(pdf)
    for index, (filename, role, page_name, scenario) in enumerate(PAGES, start=1):
        screenshot_page(pdf, CAPTURE_DIR / filename, role, page_name, scenario, index, len(PAGES))
    pdf.save()
    print(OUTPUT)


if __name__ == "__main__":
    main()
