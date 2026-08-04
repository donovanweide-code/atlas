from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


TWOPLACES = Decimal("0.01")
MONEY_ROUNDING = ROUND_HALF_UP

INK = colors.HexColor("#17221F")
MIDNIGHT = colors.HexColor("#0B1517")
MOSS = colors.HexColor("#526A58")
HORIZON = colors.HexColor("#D4A86A")
SUMMIT = colors.HexColor("#F7F4EE")
PAPER = colors.HexColor("#EFE9DC")
MUTED = colors.HexColor("#66706C")
HAIRLINE = colors.HexColor("#D8D5CC")
WHITE = colors.white


def money(value: Decimal | str | int | float) -> Decimal:
    return Decimal(str(value)).quantize(TWOPLACES, rounding=MONEY_ROUNDING)


def parse_decimal(value: Decimal | str | int | float) -> Decimal:
    return Decimal(str(value))


def format_eur(value: Decimal) -> str:
    value = money(value)
    sign = "-" if value < 0 else ""
    absolute = abs(value)
    whole, cents = f"{absolute:.2f}".split(".")
    groups: list[str] = []
    while whole:
        groups.append(whole[-3:])
        whole = whole[:-3]
    return f"{sign}€ {'.'.join(reversed(groups))},{cents}"


def format_quantity(value: Decimal) -> str:
    normalized = value.normalize()
    rendered = format(normalized, "f")
    return rendered.replace(".", ",")


def format_date(value: str) -> str:
    return datetime.strptime(value, "%Y-%m-%d").strftime("%d-%m-%Y")


@dataclass(frozen=True)
class CalculatedLine:
    description: str
    quantity: Decimal
    input_unit_price: Decimal
    input_mode: str
    vat_rate: Decimal
    net: Decimal
    vat: Decimal
    gross: Decimal


@dataclass(frozen=True)
class InvoiceTotals:
    net: Decimal
    vat: Decimal
    gross: Decimal


def calculate_line(line: dict[str, Any]) -> CalculatedLine:
    quantity = parse_decimal(line.get("quantity", 1))
    unit_price = money(line["unit_price"])
    vat_rate = parse_decimal(line.get("vat_rate", 21)) / Decimal("100")
    input_mode = str(line["price_mode"]).lower()

    if quantity <= 0:
        raise ValueError("Quantity must be greater than zero")
    if vat_rate < 0:
        raise ValueError("VAT rate cannot be negative")

    if input_mode == "inclusive":
        gross = money(unit_price * quantity)
        net = money(gross / (Decimal("1") + vat_rate))
        vat = gross - net
    elif input_mode == "exclusive":
        net = money(unit_price * quantity)
        vat = money(net * vat_rate)
        gross = net + vat
    else:
        raise ValueError("price_mode must be 'inclusive' or 'exclusive'")

    return CalculatedLine(
        description=str(line["description"]),
        quantity=quantity,
        input_unit_price=unit_price,
        input_mode=input_mode,
        vat_rate=vat_rate,
        net=money(net),
        vat=money(vat),
        gross=money(gross),
    )


def calculate_invoice(lines: list[dict[str, Any]]) -> tuple[list[CalculatedLine], InvoiceTotals]:
    calculated = [calculate_line(line) for line in lines]
    totals = InvoiceTotals(
        net=money(sum((line.net for line in calculated), Decimal("0"))),
        vat=money(sum((line.vat for line in calculated), Decimal("0"))),
        gross=money(sum((line.gross for line in calculated), Decimal("0"))),
    )
    return calculated, totals


def validate_expected_totals(data: dict[str, Any], totals: InvoiceTotals) -> None:
    expected = data.get("expected_totals")
    if not expected:
        return
    checks = {
        "exclusive": totals.net,
        "vat": totals.vat,
        "inclusive": totals.gross,
    }
    mismatches = [
        f"{key}: expected {money(expected[key])}, calculated {value}"
        for key, value in checks.items()
        if key in expected and money(expected[key]) != value
    ]
    if mismatches:
        raise ValueError("Expected total validation failed: " + "; ".join(mismatches))


def validate_release_state(data: dict[str, Any]) -> None:
    status = str(data.get("document_status", "concept")).lower()
    blockers = data.get("validation", {}).get("blockers", [])
    if status == "final" and blockers:
        raise ValueError("A final invoice cannot be generated while validation blockers remain")


def register_fonts() -> tuple[str, str, str, str]:
    candidates = [
        (
            Path("C:/Windows/Fonts/georgia.ttf"),
            Path("C:/Windows/Fonts/georgiab.ttf"),
            Path("C:/Windows/Fonts/arial.ttf"),
            Path("C:/Windows/Fonts/arialbd.ttf"),
        )
    ]
    for serif, serif_bold, sans, sans_bold in candidates:
        if all(path.exists() for path in (serif, serif_bold, sans, sans_bold)):
            pdfmetrics.registerFont(TTFont("WBDSerif", str(serif)))
            pdfmetrics.registerFont(TTFont("WBDSerifBold", str(serif_bold)))
            pdfmetrics.registerFont(TTFont("WBDSans", str(sans)))
            pdfmetrics.registerFont(TTFont("WBDSansBold", str(sans_bold)))
            return "WBDSerif", "WBDSerifBold", "WBDSans", "WBDSansBold"
    return "Times-Roman", "Times-Bold", "Helvetica", "Helvetica-Bold"


def paragraph(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), style)


def build_styles(fonts: tuple[str, str, str, str]) -> dict[str, ParagraphStyle]:
    serif, serif_bold, sans, sans_bold = fonts
    base = getSampleStyleSheet()
    return {
        "label": ParagraphStyle(
            "WBDLabel",
            parent=base["Normal"],
            fontName=sans_bold,
            fontSize=7.2,
            leading=9,
            textColor=MOSS,
            spaceAfter=3,
            uppercase=True,
        ),
        "card_title": ParagraphStyle(
            "WBDCardTitle",
            parent=base["Normal"],
            fontName=serif,
            fontSize=13,
            leading=16,
            textColor=INK,
        ),
        "body": ParagraphStyle(
            "WBDBody",
            parent=base["Normal"],
            fontName=sans,
            fontSize=8.6,
            leading=12.2,
            textColor=INK,
        ),
        "body_bold": ParagraphStyle(
            "WBDBodyBold",
            parent=base["Normal"],
            fontName=sans_bold,
            fontSize=8.6,
            leading=12.2,
            textColor=INK,
        ),
        "muted": ParagraphStyle(
            "WBDMuted",
            parent=base["Normal"],
            fontName=sans,
            fontSize=7.4,
            leading=10.2,
            textColor=MUTED,
        ),
        "table_header": ParagraphStyle(
            "WBDTableHeader",
            parent=base["Normal"],
            fontName=sans_bold,
            fontSize=7.2,
            leading=9,
            textColor=SUMMIT,
        ),
        "table_body": ParagraphStyle(
            "WBDTableBody",
            parent=base["Normal"],
            fontName=sans,
            fontSize=8.2,
            leading=11.4,
            textColor=INK,
        ),
        "table_body_right": ParagraphStyle(
            "WBDTableBodyRight",
            parent=base["Normal"],
            fontName=sans,
            fontSize=8.2,
            leading=11.4,
            alignment=TA_RIGHT,
            textColor=INK,
        ),
        "total": ParagraphStyle(
            "WBDTotal",
            parent=base["Normal"],
            fontName=sans,
            fontSize=8.8,
            leading=12,
            textColor=INK,
        ),
        "total_right": ParagraphStyle(
            "WBDTotalRight",
            parent=base["Normal"],
            fontName=sans,
            fontSize=8.8,
            leading=12,
            alignment=TA_RIGHT,
            textColor=INK,
        ),
        "payable": ParagraphStyle(
            "WBDPayable",
            parent=base["Normal"],
            fontName=sans_bold,
            fontSize=10.2,
            leading=13,
            textColor=SUMMIT,
        ),
        "payable_right": ParagraphStyle(
            "WBDPayableRight",
            parent=base["Normal"],
            fontName=sans_bold,
            fontSize=10.2,
            leading=13,
            alignment=TA_RIGHT,
            textColor=SUMMIT,
        ),
        "note": ParagraphStyle(
            "WBDNote",
            parent=base["Normal"],
            fontName=serif,
            fontSize=10.2,
            leading=14.4,
            textColor=INK,
        ),
        "concept": ParagraphStyle(
            "WBDConcept",
            parent=base["Normal"],
            fontName=sans_bold,
            fontSize=7.2,
            leading=10,
            textColor=colors.HexColor("#765A2B"),
        ),
    }


def customer_card(data: dict[str, Any], styles: dict[str, ParagraphStyle]) -> Table:
    customer = data["customer"]
    contact = customer.get("contact_person", "[Contactpersoon]")
    address = customer.get("address", "[Straat en huisnummer]")
    postal_code = customer.get("postal_code", "[Postcode]")
    city = customer.get("city", "[Plaats]")
    reference = customer.get("reference", "[Klantreferentie]")
    rows = [
        [paragraph("FACTUUR AAN", styles["label"])],
        [paragraph(f"<b>{customer['company_name']}</b>", styles["card_title"])],
        [paragraph(f"t.a.v. {contact}<br/>{address}<br/>{postal_code} {city}", styles["body"])],
        [paragraph(f"Referentie&nbsp;&nbsp; {reference}", styles["muted"])],
    ]
    table = Table(rows, colWidths=[104 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), SUMMIT),
                ("BOX", (0, 0), (-1, -1), 0.5, HAIRLINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, 0), 12),
                ("TOPPADDING", (0, 1), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -2), 3),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 12),
            ]
        )
    )
    return table


def metadata_card(data: dict[str, Any], styles: dict[str, ParagraphStyle]) -> Table:
    invoice = data["invoice"]
    due = date.fromisoformat(invoice["date"]) + timedelta(days=int(invoice["payment_term_days"]))
    values = [
        ("Factuurnummer", invoice["number"]),
        ("Factuurdatum", format_date(invoice["date"])),
        ("Betalingstermijn", f"{invoice['payment_term_days']} dagen"),
        ("Vervaldatum", due.strftime("%d-%m-%Y")),
        ("Project", invoice["project"]),
        ("Referentie", invoice.get("reference", "[Referentie]")),
    ]
    rows = [
        [paragraph(label, styles["muted"]), paragraph(str(value), styles["body"])]
        for label, value in values
    ]
    table = Table(rows, colWidths=[33 * mm, 48 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("BOX", (0, 0), (-1, -1), 0.5, HAIRLINE),
                ("LINEBELOW", (0, 0), (-1, -2), 0.35, HAIRLINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def items_table(lines: list[CalculatedLine], styles: dict[str, ParagraphStyle]) -> Table:
    rows: list[list[Any]] = [
        [
            paragraph("OMSCHRIJVING", styles["table_header"]),
            paragraph("AANTAL", styles["table_header"]),
            paragraph("BEDRAG", styles["table_header"]),
            paragraph("BTW", styles["table_header"]),
            paragraph("TOTAAL", styles["table_header"]),
        ]
    ]
    for line in lines:
        mode_label = "Incl. btw ingevoerd" if line.input_mode == "inclusive" else "Excl. btw ingevoerd"
        description = paragraph(
            f"<b>{line.description}</b><br/><font color='#66706C' size='7'>{mode_label} · "
            f"excl. {format_eur(line.net)} · btw {format_eur(line.vat)}</font>",
            styles["table_body"],
        )
        rows.append(
            [
                description,
                paragraph(format_quantity(line.quantity), styles["table_body_right"]),
                paragraph(format_eur(line.input_unit_price), styles["table_body_right"]),
                paragraph(f"{format_quantity(line.vat_rate * 100)}%", styles["table_body_right"]),
                paragraph(format_eur(line.gross), styles["table_body_right"]),
            ]
        )
    table = Table(
        rows,
        colWidths=[86 * mm, 20 * mm, 27 * mm, 15 * mm, 29 * mm],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), MIDNIGHT),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, 0), 7),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 7),
                ("TOPPADDING", (0, 1), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 1), (-1, -1), 10),
                ("LINEBELOW", (0, 1), (-1, -1), 0.45, HAIRLINE),
            ]
        )
    )
    return table


def totals_table(totals: InvoiceTotals, styles: dict[str, ParagraphStyle]) -> Table:
    rows = [
        [paragraph("Totaal exclusief btw", styles["total"]), paragraph(format_eur(totals.net), styles["total_right"])],
        [paragraph("Btw", styles["total"]), paragraph(format_eur(totals.vat), styles["total_right"])],
        [paragraph("Totaal inclusief btw", styles["total"]), paragraph(format_eur(totals.gross), styles["total_right"])],
        [paragraph("Te betalen", styles["payable"]), paragraph(format_eur(totals.gross), styles["payable_right"])],
    ]
    table = Table(rows, colWidths=[48 * mm, 39 * mm])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -2), SUMMIT),
                ("BACKGROUND", (0, -1), (-1, -1), MIDNIGHT),
                ("BOX", (0, 0), (-1, -2), 0.5, HAIRLINE),
                ("LINEBELOW", (0, 0), (-1, -3), 0.35, HAIRLINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -2), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -2), 7),
                ("TOPPADDING", (0, -1), (-1, -1), 10),
                ("BOTTOMPADDING", (0, -1), (-1, -1), 10),
            ]
        )
    )
    return table


def draw_page(canvas: Any, doc: SimpleDocTemplate, data: dict[str, Any], fonts: tuple[str, str, str, str]) -> None:
    serif, _serif_bold, sans, sans_bold = fonts
    sender = data["sender"]
    invoice = data["invoice"]
    is_concept = str(data.get("document_status", "concept")).lower() != "final"
    width, height = A4

    canvas.saveState()
    canvas.setFillColor(MIDNIGHT)
    canvas.rect(0, height - 49 * mm, width, 49 * mm, stroke=0, fill=1)
    canvas.setFillColor(HORIZON)
    canvas.rect(17 * mm, height - 13 * mm, 1.2 * mm, 7 * mm, stroke=0, fill=1)

    canvas.setFillColor(SUMMIT)
    canvas.setFont(sans_bold, 12.8)
    canvas.drawString(22 * mm, height - 10.5 * mm, "WE BUILD")
    canvas.setFont(sans, 10.4)
    canvas.drawString(22 * mm, height - 16 * mm, "AND DESIGN")

    canvas.setFont(serif, 29)
    canvas.drawString(17 * mm, height - 35 * mm, "Factuur")
    canvas.setFillColor(colors.HexColor("#B9C3BD"))
    canvas.setFont(sans, 8.2)
    canvas.drawString(17.5 * mm, height - 42 * mm, f"{invoice['number']}  ·  {format_date(invoice['date'])}")

    if is_concept:
        pill_width = 45 * mm
        pill_height = 8 * mm
        pill_x = width - 17 * mm - pill_width
        pill_y = height - 16 * mm
        canvas.setStrokeColor(HORIZON)
        canvas.setLineWidth(0.7)
        canvas.roundRect(pill_x, pill_y, pill_width, pill_height, 4 * mm, stroke=1, fill=0)
        canvas.setFillColor(HORIZON)
        canvas.setFont(sans_bold, 7.2)
        canvas.drawCentredString(pill_x + pill_width / 2, pill_y + 2.7 * mm, "CONCEPT · NIET VERSTUREN")

    canvas.setFillColor(colors.HexColor("#C9D0CB"))
    canvas.setFont(sans, 7.2)
    canvas.drawRightString(width - 17 * mm, height - 30.5 * mm, sender["company_name"])
    canvas.drawRightString(width - 17 * mm, height - 35 * mm, sender["address"])
    canvas.drawRightString(width - 17 * mm, height - 39.5 * mm, f"{sender['postal_code']} {sender['city']}")

    footer_y = 14 * mm
    canvas.setStrokeColor(HAIRLINE)
    canvas.setLineWidth(0.5)
    canvas.line(17 * mm, footer_y + 13 * mm, width - 17 * mm, footer_y + 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont(sans, 6.8)
    canvas.drawString(
        17 * mm,
        footer_y + 7.5 * mm,
        f"Betaling binnen {invoice['payment_term_days']} dagen · IBAN {sender['iban']} · BIC {sender['bic']}",
    )
    canvas.drawString(
        17 * mm,
        footer_y + 3.5 * mm,
        f"KvK {sender['kvk']} · BTW {sender['vat_number']} · {sender['email']} · {sender['website']}",
    )
    canvas.drawRightString(width - 17 * mm, footer_y + 3.5 * mm, f"Pagina {doc.page}")

    canvas.setTitle(f"{invoice['number']} - {data['customer']['company_name']} - conceptfactuur")
    canvas.setAuthor(sender["company_name"])
    canvas.setSubject(invoice["project"])
    canvas.restoreState()


def build_pdf(data: dict[str, Any], output_path: Path) -> InvoiceTotals:
    validate_release_state(data)
    lines, totals = calculate_invoice(data["lines"])
    validate_expected_totals(data, totals)
    fonts = register_fonts()
    styles = build_styles(fonts)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=17 * mm,
        rightMargin=17 * mm,
        topMargin=57 * mm,
        bottomMargin=35 * mm,
        title=f"{data['invoice']['number']} - conceptfactuur",
        author=data["sender"]["company_name"],
    )

    info = Table(
        [[customer_card(data, styles), metadata_card(data, styles)]],
        colWidths=[104 * mm, 73 * mm],
        hAlign="LEFT",
    )
    info.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, 0), 8),
                ("RIGHTPADDING", (1, 0), (1, 0), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    totals_layout = Table(
        [["", totals_table(totals, styles)]],
        colWidths=[90 * mm, 87 * mm],
        hAlign="LEFT",
    )
    totals_layout.setStyle(
        TableStyle(
            [
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )

    sender = data["sender"]
    note = KeepTogether(
        [
            paragraph("BETALING", styles["label"]),
            paragraph(
                f"Gelieve {format_eur(totals.gross)} binnen {data['invoice']['payment_term_days']} dagen over te maken "
                f"naar <b>{sender['iban']}</b> ten name van {sender['company_name']}, "
                f"onder vermelding van <b>{data['invoice']['number']}</b>.",
                styles["note"],
            ),
        ]
    )

    story: list[Any] = [
        info,
        Spacer(1, 9 * mm),
        paragraph("FACTUURREGELS", styles["label"]),
        Spacer(1, 1.5 * mm),
        items_table(lines, styles),
        Spacer(1, 6 * mm),
        totals_layout,
        Spacer(1, 7 * mm),
        note,
    ]

    if str(data.get("document_status", "concept")).lower() != "final":
        story.extend(
            [
                Spacer(1, 5 * mm),
                Table(
                    [[paragraph(
                        "Conceptdocument. Bevestig het factuurnummer en het btw-nummer voordat deze factuur definitief wordt gebruikt.",
                        styles["concept"],
                    )]],
                    colWidths=[177 * mm],
                    style=TableStyle(
                        [
                            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4E9D6")),
                            ("BOX", (0, 0), (-1, -1), 0.5, HORIZON),
                            ("LEFTPADDING", (0, 0), (-1, -1), 9),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                            ("TOPPADDING", (0, 0), (-1, -1), 7),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                        ]
                    ),
                ),
            ]
        )

    doc.build(story, onFirstPage=lambda c, d: draw_page(c, d, data, fonts), onLaterPages=lambda c, d: draw_page(c, d, data, fonts))
    return totals


def load_data(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a fixed WBD invoice PDF from JSON data")
    parser.add_argument("data", type=Path, help="Path to invoice JSON data")
    parser.add_argument("output", type=Path, help="Path for the generated PDF")
    args = parser.parse_args()

    data = load_data(args.data)
    totals = build_pdf(data, args.output)
    print(
        f"Created {args.output} | exclusive={totals.net} vat={totals.vat} inclusive={totals.gross}"
    )


if __name__ == "__main__":
    main()
