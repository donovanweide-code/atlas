# Evidence and root-cause report - SPW-WINPLOT-VECTOR-PDF-003-20260811

## Human status correction

The historical v1 PDF remains evidence of: WinPlot vector-PDF import **PASS**, generated cut geometry **FAIL**. It has not been overwritten. This v3 build is not CUT-READY until Donovan explicitly passes it in the real Sportpaleis WinPlot installation.

## Real WinPlot references compared

- `Import (1).ISI` - 36426 bytes - `77E5B884F92260A3D7A0754A54496E8D90EF0A5847DB862915BB527238017E5A`
- `Import (2).ISI` - 3448 bytes - `3C7292BDEFA623ACA99D7A6CC9F46A5A20A0CDA647E6897F9AAE50C8CEDC8749`
- `Import Test.ISI` - 31658 bytes - `9F2EA1C840567518C55D9A364E18CD66EEA99BE210064C27332D4A54E1864CF2`
- `Import initialen 3cm.ISI` - 24928 bytes - `9B47E43C10A990BC82A0761BA46802B722E2F7B69B0C32F9C584F63524E253BB`
- `Import Groot.ISI` - 201550 bytes - `063A558CD4CD9D58A2724281C8C9D55145A80F81945A3ADF640C458B6FC4E561`
- `Import 22 cm.ISI` - 7328 bytes - `5F193ABCA4E5485E23EFDEBCF04D906B73718E7C59DC957EBA0E48528B261970`

All six references share a 129-byte archive prefix, the embedded `SummaWinplot/Winplot.exe` origin, and the serialized `CVectorArticle`, `CSplineItem`, `CColourPalette`, `CVectorStyle`, `CDesignParamBlk` and `CGrid` object-family markers. In all six, the little-endian payload-length field at offset `0x81` equals file size minus 1551 bytes. This is reliable common-structure evidence, not a complete undocumented ISI writer specification; no ISI has been synthesized.

The supplied WinPlot screenshot (SHA-256 `A09A46F792AD25CA7CD18969D4DE8F35EE9235A2227CEB8B303786EE0067F35E`) visibly shows clean continuous production outlines for letters, digits, initials/names and other shapes. It does not show an unambiguous object-specific numeric dimension panel, so no size has been inferred from screenshot pixels.

## Located fault

- Validated source: one closed filled Illustrator path, 18 anchors, 15 straight segments, 3 cubic Bezier segments, no open or zero-length paths.
- Faulty v1 conversion: the three original Bezier segments were flattened into a 39-line polygon; export used a stroke-only zero-width path and relied on PDF `closepath` for the final connection.
- WinPlot import: format transport is proven working, but Human Acceptance showed the simplified path construction did not preserve a safe closed production contour in actual WinPlot.
- Corrected v3: preserves all 18 original anchors and Bezier handles, emits 15 `l` and 3 `c` operators, explicitly returns the last endpoint to the first, then closes and fills the single path. No redraw, guessed points or output scaling.

## Acceptance boundary

Offline validation passes geometry and PDF structure only. Donovan must verify form, closure, straight/connected lines, one contour, 200.00 x 99.06 mm display dimensions, 1:1 scale and practical cut suitability in WinPlot. Do not plot or send to hardware.
