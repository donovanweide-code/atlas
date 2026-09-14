# Isolated webshop software acceptance fixture

`acceptance.pdf` contains 30 synthetic operator-test orders, 39 printed article rows, no real customer contact data. All original 36 rows remain. `expected.json` records the input quantities, sizes and personalizations independently of the parser. References intentionally use a different prefix from the historical bare `26…` form; they are explicitly labelled.

Patterns reuse FC Almere 116597/141521, Pioneers 138505 and FC Huizen 131247/131252 from the real supplied PDF. Existing catalog/truth cases add MHC Lelystad 100664 and Pioneers 116386/116388 for ZWART, chest numbers and multiplicity. Profiles are never altered by the test. ReportLab generated the text PDF; its rendered page 6 was inspected. The real 138-page source is tested separately through `SPORTPALEIS_BATCH_PDF`.

This fixture covers WIT, ZWART and BLAUW. Three added SC Buitenboys 141598 rows use the existing article-level `foilColorOverride: Blauw`, introduced in commit `6fa4fdd` and confirmed read-only on LIVE on 2026-09-14 (article revision 7, order SP-2026-0167 and earlier orders). The profile is `profile-source-sc-buitenboys-backNumber`; the garment color remains WIT. No test sets or changes the override or any Product Truth. Junior and Senior cases share an order with a WIT production item, exercising the existing proposal continuation. Rendered page 4 was checked.

Run from the repository root:

```powershell
node --test website/tests/sportpaleis-webshop-30.integration.mjs
```

Optional `SPORTPALEIS_30_PROOF` selects the JSON proof output path. All order/production changes run in a newly created temporary FileStore. Physical devices and outgoing customer mail are not used.
