import sys
import unittest
from decimal import Decimal
from pathlib import Path


MODULE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(MODULE_DIR))

from invoice import calculate_invoice, calculate_line, validate_release_state  # noqa: E402


class InvoiceCalculationTests(unittest.TestCase):
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
