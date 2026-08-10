# WBD Logo Candidate 004C.1 - Provenance

Status: `OWNER_APPROVED`  
Owner approval: `YES - owner / Donovan - 2026-08-09`  
Redesign: `NO`

## Authority chain

- The public WBD website introduced the current `W / BD` component in commit `ca3d1bd90128ae25c033eae2c9b73d95b0c1d512` on 26 July 2026. The component is visible in `website/src/public-pages.ts` and its exact layout rules are in `website/src/styles/public-pages.css`.
- The reusable document implementation in `invoices/wbd/brand.py` was introduced in commit `e91b80a0eddf1cf495d66587b1c71e0d081ac5da` on 4 August 2026. Its own documentation states that it follows the current public brand component. The WBD invoice generator uses this vector component directly.
- Candidate version `WBD-LOGO-CANDIDATE-004C1` preserves the invoice component's 118 x 43 coordinate system, Georgia/Arial typography, W/BD relationship, diagonal divider and tracked company name. A 2-unit transparent export margin prevents glyph clipping; the logo geometry itself is unchanged. No new visual variant or redesigned geometry was introduced.

## Candidate set

- `wbd-logo-master-candidate.svg`: scalable dark master candidate for light/cream surfaces.
- `wbd-logo-light-candidate.svg`: color-only derivative for night-green surfaces.
- `wbd-logo-mail-safe-dark-candidate.png`: transparent raster derivative for light surfaces.
- `wbd-logo-mail-safe-light-candidate.png`: transparent raster derivative for dark surfaces and future email use.
- `provenance.json`: hashes, version, dates, sources and intended usage.

The files are stored under `output/wbd-brand-candidate-004c1/` and mirrored locally under `website/public/assets/organizations/we-build-and-design/logo-candidate-004c1/`. WBD Mail 004C.2 records Donovan's explicit visual GO and registers the same files and hashes as `OWNER_APPROVED` in the Organization Brand Foundation.

## Activation boundary

The approved mail-safe PNG is activated through the Brand Foundation as a controlled CID asset. The former text rendering remains only as failure fallback. Existing Workspace, website, document and invoice applications are not changed by 004C.2; future WBD applications may read this authority but may not autonomously alter or reapprove it.
