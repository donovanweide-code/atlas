import json
import sys
import unittest
from decimal import Decimal
from pathlib import Path


MODULE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MODULE_DIR))

from invoice import calculation_response, calculate_invoice, calculate_line, validate_release_state  # noqa: E402


class InvoiceCalculationTests(unittest.TestCase):
    def test_sportpaleis_data_instance_is_exact(self):
        data_path = MODULE_DIR / "data" / "sportpaleis-f00248-concept.json"
        data = json.loads(data_path.read_text(encoding="utf-8"))
        lines, totals = calculate_invoice(data["lines"])

        self.assertEqual(lines[0].description, "Bedrukkingsmodule – voorschot Codex-credits")
        self.assertEqual(lines[0].input_unit_price, Decimal("100.00"))
        self.assertEqual(lines[0].input_mode, "inclusive")
        self.assertEqual(lines[1].description, "Bedrukkingsmodule – reeds gemaakte ontwikkelkosten")
        self.assertEqual(lines[1].input_unit_price, Decimal("231.01"))
        self.assertEqual(lines[1].input_mode, "inclusive")
        self.assertEqual(totals.gross, Decimal("331.01"))

    def test_inclusive_prices_match_sportpaleis_concept(self):
        lines, totals = calculate_invoice(
            [
                {
                    "description": "Line 1",
                    "quantity": "1",
                    "unit_price": "100.00",
                    "vat_rate": "21",
                    "price_mode": "inclusive",
                },
                {
                    "description": "Line 2",
                    "quantity": "1",
                    "unit_price": "231.01",
                    "vat_rate": "21",
                    "price_mode": "inclusive",
                },
            ]
        )

        self.assertEqual(lines[0].net, Decimal("82.64"))
        self.assertEqual(lines[0].vat, Decimal("17.36"))
        self.assertEqual(lines[1].net, Decimal("190.92"))
        self.assertEqual(lines[1].vat, Decimal("40.09"))
        self.assertEqual(totals.net, Decimal("273.56"))
        self.assertEqual(totals.vat, Decimal("57.45"))
        self.assertEqual(totals.gross, Decimal("331.01"))

    def test_exclusive_subscription_price(self):
        line = calculate_line(
            {
                "description": "Workspace Basis",
                "quantity": "1",
                "unit_price": "75.00",
                "vat_rate": "21",
                "price_mode": "exclusive",
            }
        )

        self.assertEqual(line.net, Decimal("75.00"))
        self.assertEqual(line.vat, Decimal("15.75"))
        self.assertEqual(line.gross, Decimal("90.75"))

    def test_workspace_calculation_response_uses_existing_decimal_logic(self):
        response = calculation_response(
            [
                {
                    "description": "Inclusive",
                    "quantity": "1",
                    "unit_price": "100.00",
                    "vat_rate": "21",
                    "price_mode": "inclusive",
                },
                {
                    "description": "Exclusive",
                    "quantity": "1",
                    "unit_price": "75.00",
                    "vat_rate": "21",
                    "price_mode": "exclusive",
                },
            ]
        )

        self.assertEqual(response["lines"][0], {"net": "82.64", "vat": "17.36", "gross": "100.00"})
        self.assertEqual(response["lines"][1], {"net": "75.00", "vat": "15.75", "gross": "90.75"})
        self.assertEqual(response["totals"], {"exclusive": "157.64", "vat": "33.11", "inclusive": "190.75"})

    def test_final_document_is_blocked_while_blockers_remain(self):
        with self.assertRaisesRegex(ValueError, "validation blockers"):
            validate_release_state(
                {
                    "document_status": "final",
                    "validation": {"blockers": ["Confirm VAT number"]},
                }
            )


if __name__ == "__main__":
    unittest.main()
