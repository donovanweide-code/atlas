# Human Review - SPW-PHYSICAL-MULTI-ORDER-001-20260811

## Open this file

`Sportpaleis-Pioneers-10-Orders-Human-Acceptance-001.ai`

Open it in Adobe Illustrator. Use **File -> Summa -> Send To WinPlot**. Direct PDF/AI import into WinPlot is not the accepted route.

## Mandatory before physical output

**DONOVAN MUST FLIP THE COMPLETE BATCH HORIZONTALLY IN WINPLOT BEFORE PHYSICAL OUTPUT.**

The Illustrator file is deliberately **not pre-mirrored**. Do not send anything to the cutter until the batch has passed visual Human Review and Donovan gives a separate explicit GO.

## Ten fictive orders

| Order | Number | Expected upright size | Bounds on rotated plate | Closed contours |
|---|---:|---:|---:|---:|
| SPW-HA-01 | 2 | 99.06 x 200.00 mm | 200.00 x 99.06 mm | 1 |
| SPW-HA-02 | 34 | 215.14 x 200.00 mm | 200.00 x 215.14 mm | 2 |
| SPW-HA-03 | 77 | 211.92 x 200.00 mm | 200.00 x 211.92 mm | 2 |
| SPW-HA-04 | 2 | 99.06 x 200.00 mm | 200.00 x 99.06 mm | 1 |
| SPW-HA-05 | 34 | 215.14 x 200.00 mm | 200.00 x 215.14 mm | 2 |
| SPW-HA-06 | 77 | 211.92 x 200.00 mm | 200.00 x 211.92 mm | 2 |
| SPW-HA-07 | 2 | 99.06 x 200.00 mm | 200.00 x 99.06 mm | 1 |
| SPW-HA-08 | 34 | 215.14 x 200.00 mm | 200.00 x 215.14 mm | 2 |
| SPW-HA-09 | 77 | 211.92 x 200.00 mm | 200.00 x 211.92 mm | 2 |
| SPW-HA-10 | 2 | 99.06 x 200.00 mm | 200.00 x 99.06 mm | 1 |

Only complete, locally reliable Pioneers numbers `2`, `34` and `77` are used. Repetition is intentional because no other complete number composition may be reconstructed or guessed.

## Expected production plate

- foil working width: **440.00 mm**
- occupied width including edge margins: **416.40 mm**
- production plate length: **872.72 mm**
- object groups: **10**
- closed cut contours: **16**
- edge margin: **5.00 mm**
- minimum contour gap: **6.40 mm** (measured 6.39995 mm at 0.001 mm validation flatness)
- scale: **1:1**
- strategy: `DETERMINISTIC_MULTI_HEURISTIC_CONTOUR_SAFE_NO_SCALE`
- exact-size simple shelf baseline: **875.91 mm**
- optimized length saving: **3.20 mm**
- bounding-box efficiency: **87.37%**; estimated bounding waste **48514 mm2**

## Visual checks in Illustrator and WinPlot

1. Ten recognisable object groups are present: four `2`, three `34`, three `77`.
2. There are 16 closed contours and no accidental extra marks, labels or clipping objects.
3. All numbers retain their original Pioneers form; straight lines and the three curved transitions of every `2` remain clean.
4. Overall plate bounds and every object dimension match the table.
5. No objects overlap; the compact lower pair still has at least 6.40 mm contour distance.
6. The complete batch arrives in WinPlot unmirrored.
7. Select the complete batch and apply **Flip Horizontally** exactly once in WinPlot.

## Physical acceptance target

After visual PASS and a separate explicit Human GO, the intended physical acceptance is the **complete ten-object plate**, because this test is specifically about batch composition, nesting, spacing and material use. Without that GO: do not plot, cut or send to Summa hardware.

Status now: **offline geometry PASS / full production flow PARTIAL / Human Acceptance pending**.
