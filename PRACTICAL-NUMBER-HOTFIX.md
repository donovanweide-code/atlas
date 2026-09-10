# Practical number and input hotfix

Based exclusively on LIVE `c03d8604cb1ce232c73a34f8996d0ad193f17024` / `SPW-OPERATOR-ARTICLE-TRUTH-20260908-C03D860`, confirmed twice through the actual runtime symlink and manifest. No central candidate was merged.

Fonts now compose the complete number using the existing fontkit layout, preserving advances, side bearings and kerning. Existing per-digit contour IDs and physical-member provenance remain available inside the single rigid production object. Packing, mirroring and orientation still use their existing code.

SVG/glyph sources lacking their own spacing authority retain 18 mm, explicitly classified as `FALLBACK_SPACING_AUTHORITY`, following Donovan's correction. Existing valid source-specific contour spacing can take precedence. The authoritative Pioneers source keeps its explicit 5 mm override. No source reassignment or datastore backfill was added.

The existing Pioneers front-name article mapping supplies the 90 mm uniform-width exception. It scales both axes together and retains the existing font. Other names remain height-led. The existing standard identifier input already accepts up to five alphanumeric characters and needs no duplicate rule.

## Proof

Run `node --experimental-strip-types practical-number-proof.mjs` from this checkout. Optional `PROOF_WEBSITE_ROOT` selects an unpacked/runtime artifact; `PROOF_OUTPUT` selects a local evidence directory. It never uses production storage or real principals: its order tests initialize separate synthetic file storage under the OS temporary directory. All vector builds disable artifact persistence except explicit proof output. Font bytes are read from the target artifact.

The proof covers Spain and Schluber 11/14/18/44/88/10 against native fontkit metrics and exact existing full-run contour composition; back/short/chest placement equivalence; DCG shorts 14/44/18; Pioneers 11/14/44 at 5 mm; all existing SVG fallbacks at 18 mm; three Pioneers names at exactly 90 mm; AA/JS/14 retained as INITIALS after synthetic order storage; overlength rejection; Waterwijk Spain/Schluber bindings and Senior 220/Junior 200 mm.

Warm 200-sample comparison on the local machine: native p95 about 0.036 ms for both fonts; previous digit-split/fixed-gap composition p95 0.090 ms (Spain) and 0.062 ms (Schluber). These are composition timings, not HTTP latency. No contour engine or expensive new per-render analysis was introduced.

Workspace build passed. Existing article production tests passed 7/7, existing height-led font tests 2/2. The targeted 46-test production suite had one obsolete font-18-mm expectation; after replacing that assertion with a native-source comparison, the complete affected composition suite plus polling/revision tests passed 8/8. The other 40 tests were already green, including SVG/hockey behavior, source admission, color flow, human acceptance, orientation and artifact reservation. Initial failure remains in the evidence log.

Additional packing, direct-print, profile-truth and immutable-execution tests passed 35/35. Total unique conventional tests: 92 passing (48 targeted production/sync, 7 article, 2 font, 35 packing/execution), plus the standalone practical proof above.

Release activation is permitted only after clean source/remote tag checks, deterministic artifact/hash comparison, immutable prepare and unchanged LIVE-base checks. Deployment and final LIVE proof are recorded separately after execution, not claimed in advance. No central release engine configuration or storage work is part of this hotfix.
