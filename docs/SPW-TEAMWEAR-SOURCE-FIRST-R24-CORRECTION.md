# Sportpaleis Teamwear Source First R2.4 correction

This candidate succeeds immutable R2.3 after interactive Chrome review proved five concrete defects. R2.3 itself remains unchanged.

## Correction scope

- Keep the source-first Teamwear start and optional association context.
- Align the visible flow with the canonical `Artikelbron -> Bedrukking -> Maten & voorstel -> Akkoord -> Afhandeling` sequence.
- Keep planning values in the canonical proposal form and expose their save action where those values are entered.
- Allow a back placement to activate the controlled back-view placeholder only for products that permit a back side; backpacks remain fail-closed.
- Pass the immutable proposal source into PDF garment rendering so Studio, preview and PDF use the same bytes and hash.
- Keep the mobile navigation backdrop present until the click is consumed, preventing the same tap from reaching bottom navigation.

## Preserved boundaries

- No production deployment or production data mutation.
- No fabricated product image, back image, asset or production rule.
- No relaxation of product-specific printable-side truth.
- No external mail, hardware or production execution.
- The original `SPW-TEAMWEAR-SOURCE-FIRST-CANDIDATE-R2.3-20260829` tag and artifact remain immutable.

## Automated evidence before immutable packaging

- Targeted Teamwear/mobile/Proposal regression: 16/16 PASS.
- Full Sportpaleis regression: 529/529 PASS.
- Public production build: PASS.
- Workspace production build: PASS.

Real Chrome acceptance is required against the packaged R2.4 artifact before any deployment readiness claim.
