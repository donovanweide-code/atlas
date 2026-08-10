# WS-VIS.0 — Current Workspace Visual Baseline

**Baseline date:** 2026-08-07  
**Repository commit at capture:** `1ec9898`  
**Environment:** actual existing local WBD Workspace, Vite development runtime at `http://127.0.0.1:5177/`  
**Purpose:** pre-update visual reference only  
**Status:** **GO — baseline captured; not functional or production validation**

No mock-up, redesign, CSS change, application change, provider environment or production environment was used. The existing local application and its existing visible state were captured. The working tree already contained user-owned changes; this baseline records that actual current state and does not claim a clean release candidate.

## Capture register

| # | File | Route / view | Requested CSS viewport | Saved bitmap | Visible state |
|---:|---|---|---:|---:|---|
| 1 | `desktop-01-home-overzicht-1440x900.png` | `/` | 1440×900 | 1424×1180, full page | Home, “De actuele bedrijfspraktijk”, dated 5 August 2026; existing WBD shell |
| 2 | `desktop-02-organisaties-1440x900.png` | organisation overview | 1440×900 | 1424×1052, full page | Organisation list and organisation-first entry points |
| 3 | `desktop-03-organisatiedossier-sportpaleis-1440x900.png` | Sportpaleis organisation dossier | 1440×900 | 1424×1439, full page | Dossier context, contacts/documents and forms |
| 4 | `desktop-04-projecten-1440x900.png` | projects | 1440×900 | 1424×2365, full page | Existing long project/history view |
| 5 | `desktop-05-finance-facturen-1440x900.png` | finance / invoices | 1440×900 | 1424×900 | Existing invoice preparation state |
| 6 | `desktop-06-business-foundation-finance-1440x900.png` | business foundation / finance | 1440×900 | 1424×1221, full page | Financial overview and current information hierarchy |
| 7 | `desktop-07-navigatieshell-1440x900.png` | navigation shell | 1440×900 | 1425×891, viewport | Persistent desktop shell, brand and primary navigation |
| 8 | `mobile-08-home-overzicht-390x844.png` | `/` | 390×844 | 375×1754, full page | Mobile Home and current stacked content |
| 9 | `mobile-09-navigatie-390x844.png` | mobile navigation | 390×844 | 375×811, viewport | Brand/workspace control and horizontal primary navigation |
| 10 | `mobile-10-organisatiedossier-sportpaleis-390x844.png` | Sportpaleis organisation dossier | 390×844 | 375×811, viewport | Dossier top and mobile hierarchy |
| 11 | `mobile-11-finance-facturen-390x844.png` | finance / invoices | 390×844 | 375×1012, full page | Invoice preparation on mobile |
| 12 | `mobile-12-lange-dossierjourney-sportpaleis-390x844.png` | Sportpaleis long dossier journey | 390×844 | 375×2287, full page | Supplementary browser full-page capture; sticky-layout artefacts can occur |
| 12a | `mobile-12a-lange-dossierjourney-top-390x844.png` | same, top | 390×844 | 375×811, viewport | Canonical segment: dossier top |
| 12b | `mobile-12b-lange-dossierjourney-midden-390x844.png` | same, middle | 390×844 | 375×811, viewport | Canonical segment: document/contact workflow |
| 12c | `mobile-12c-lange-dossierjourney-einde-390x844.png` | same, end | 390×844 | 375×811, viewport | Canonical segment: end of dossier forms |

The browser’s captured content area is slightly smaller than the requested CSS viewport because browser chrome/scrollbar handling is excluded from the saved bitmap. Runtime inspection confirmed a CSS viewport of 390×844 and no horizontal document overflow at the measured mobile routes.

There is no separate current Documents route that adds a distinct baseline view. Documents are visibly represented inside the organisation dossier, so screenshot 3 and the mobile dossier journey are the relevant evidence.

## Factual visual observations

### KEEP

- The existing WBD visual language is strong and recognisable: warm dark green/navy, cream, restrained gold accents, serif display typography and a calm professional tone.
- The desktop shell provides a stable brand and navigation boundary.
- The organisation-first dossier model, finance flow and Atlas provenance/context are visibly present.
- Candidate/Confirmed and human-review language fit the established trust model.

### IMPROVE in later approved Workspace phases

- Mobile primary navigation is horizontally scrollable; only part of the navigation is visible at once.
- Measured mobile navigation items are approximately 31 px high; most form controls are about 38–41 px and submit buttons about 37 px. These are factual baseline measurements, not a redesign prescription.
- Large headings wrap substantially on mobile and compete with dense dossier content.
- The Sportpaleis dossier is a long mobile flow (about 2287 px document height) with multiple forms in one journey.
- Desktop project/history content is also long (about 2365 px document height), while some finance states use considerable open space.
- Home content is currently static and date-led; dynamic attention is not yet the visible organising principle.

### Boundary

These images prove only what was visibly rendered in the local browser on the baseline date. They do **not** prove that authentication, permissions, organisation isolation, writes, backups, recovery, production routing or deployment work correctly.

