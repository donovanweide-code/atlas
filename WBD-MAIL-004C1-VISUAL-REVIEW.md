# WBD Mail 004C.1 - Visual Review

Date: 2026-08-09  
Scope: local review only  
Real mail sent: `NO`  
Production deployment: `NO`

## Human decisions applied

- Owner-approved tagline: `Onze naam begint met bouwen. Ons werk begint met begrijpen.`
- The tagline is registered in Organization Brand Foundation version `WBD-BRAND-FOUNDATION-003` and is used subtly in the corporate footer.
- The personal signature remains separate from the corporate footer.

## Corporate footer

The shared footer now has one mail-client-safe, table-based night-green zone with a gold top rule and two clear information layers:

1. Contact: phone, template-specific email address, website and postal address.
2. Corporate identity: We Build And Design, the owner-approved tagline, KvK and BTW.

`WBD_GENERAL` uses `info@webuildanddesign.nl`; `WBD_INVOICE` uses `facturen@webuildanddesign.nl`. No bank details were added because the existing WBD source still requires explicit IBAN reconfirmation. The invoice subject, facts block, amount, payment term, due date, sender routing, PDF attachment and no-CTA contract remain unchanged.

## WBD official logo candidate

- External original required: `NO`.
- Existing implementation found: `YES`.
- Website origin: commit `ca3d1bd90128ae25c033eae2c9b73d95b0c1d512`, 2026-07-26.
- Reusable invoice vector origin: commit `e91b80a0eddf1cf495d66587b1c71e0d081ac5da`, 2026-08-04.
- Candidate version: `WBD-LOGO-CANDIDATE-004C1`.
- Candidate status: `REVIEW_REQUIRED`.
- Owner approval applied: `NO`.
- Logo redesigned: `NO`.

The candidate preserves the existing 118 x 43 geometry and adds only a transparent export margin to prevent glyph clipping. The asset set contains a scalable SVG master, a color-only light SVG derivative and transparent mail-safe PNG derivatives. Source and derivative SHA-256 hashes are recorded in `output/wbd-brand-candidate-004c1/provenance.json`.

The Brand Foundation registers the candidate assets as `draft`. Actual general and invoice templates therefore still use the safe text fallback. The review page demonstrates how the exact candidate would appear on cream, on night green, in the mail header, in the corporate footer and at 390 px after a future owner GO.

## Review result

- Desktop general mail: `PASS`.
- Desktop invoice mail: `PASS`.
- General and invoice footer at exact 390 px width: `PASS`.
- Logo candidate applications and small format: `PASS FOR HUMAN REVIEW`.
- Full regression: `393/393 PASS`.
- Existing invoice PDF SHA-256 unchanged: `8c1eb5550064da4fe777e34697a60018eefd4834fa4ed667b27b81561db8fb1b`.

The next permitted action is human visual review. No SMTP test, production activation or owner approval is part of 004C.1.
