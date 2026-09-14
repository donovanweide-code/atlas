# Isolated webshop software acceptance fixture

`acceptance.pdf` contains 30 synthetic operator-test orders, 36 printed article rows, no real customer contact data. `expected.json` records the input quantities, sizes and personalizations independently of the parser. References intentionally use a different prefix from the historical bare `26…` form; they are explicitly labelled.

Patterns reuse FC Almere 116597/141521, Pioneers 138505 and FC Huizen 131247/131252 from the real supplied PDF. Existing catalog/truth cases add MHC Lelystad 100664 and Pioneers 116386/116388 for ZWART, chest numbers and multiplicity. Profiles are never altered by the test. ReportLab generated the text PDF; its rendered page 6 was inspected. The real 138-page source is tested separately through `SPORTPALEIS_BATCH_PDF`.

This fixture proves WIT and ZWART. It does **not** claim the requested BLAUW end-to-end coverage: no authoritative blue article profile was found in current LIVE. Existing generic color-continuity tests cover the color engine independently, which is not a substitute for a PDF/article binding.

Run from the repository root:

```powershell
node --test website/tests/sportpaleis-webshop-30.integration.mjs
```

Optional `SPORTPALEIS_30_PROOF` selects the JSON proof output path. All order/production changes run in a newly created temporary FileStore. Physical devices and outgoing customer mail are not used.
