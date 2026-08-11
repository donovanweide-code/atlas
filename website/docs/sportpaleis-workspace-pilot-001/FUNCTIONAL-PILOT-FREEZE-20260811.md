# Sportpaleis Workspace — Functional Pilot Freeze

Datum: 11 augustus 2026  
Build-ID: `SPW-FUNCTIONAL-PILOT-FREEZE-READY-001-20260811`
Schema: `12`  
Oordeel: `FREEZE READY` voor lokale Human Acceptance/release-preflight.

## Recovery-snapshot

De na de onverwachte afsluiting aangetroffen Sportpaleis pre-pilot worktree is vóór hervatting als een afzonderlijk Git-snapshot vastgelegd:

- commit: `4557e5c6382278f68c70cb3070e655497561e542`
- tree: `3e723b67873233ee98954e2257dc5cb903b1d6c3`
- tijd: `2026-08-11T22:27:16+02:00`
- tijdelijke fixture `.codex-tmp/sp-freeze-browser`: na inspectie verwijderd; bevatte alleen schema-12 teststate, 10 seedorders en 2 seedjobs en geen broncode, fonts of productie-evidence.

Het recovery-snapshot begrenst exact deze 30 bestanden:

```text
website/docs/sportpaleis-workspace-pilot-001/FINAL-COVERAGE-CHECK-20260811.md
website/docs/sportpaleis-workspace-pilot-001/FUNCTIONAL-PILOT-FREEZE-20260811.md
website/docs/sportpaleis-workspace-pilot-001/PRE-PILOT-MASTER-20260811-REPORT.md
website/package.json
website/public/assets/organizations/sportpaleis/fonts/LICENSE_LIBERATION.txt
website/public/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf
website/scripts/generate-sportpaleis-prepilot-winplot-acceptance.mjs
website/scripts/generate-sportpaleis-production-gap-matrix.mjs
website/scripts/sportpaleis-pilot-development-api.mjs
website/scripts/sportpaleis-pilot-foundation.mjs
website/src/sportpaleis-workspace.ts
website/src/sportpaleis/pilot-api.ts
website/src/sportpaleis/team-production-lines.ts
website/src/sportpaleis/workspace-data.ts
website/src/styles/sportpaleis-workspace.css
website/tests/production-persistence.test.mjs
website/tests/sportpaleis-bedrukking-minimal-pilot-001.test.mjs
website/tests/sportpaleis-capability-build-003.test.mjs
website/tests/sportpaleis-final-coverage-20260811.test.mjs
website/tests/sportpaleis-functional-pilot-freeze-012.test.mjs
website/tests/sportpaleis-operational-review-007b.test.mjs
website/tests/sportpaleis-pilot-readiness-007.test.mjs
website/tests/sportpaleis-prepilot-master-20260811.test.mjs
website/tests/sportpaleis-production-history-011.test.mjs
website/tests/sportpaleis-store-simplification-008a.test.mjs
website/tests/sportpaleis-ux-pilot-polish-002.test.mjs
website/vite.workspace.config.ts
website/workspace-public/sportpaleis-pwa-icon.svg
website/workspace-public/sportpaleis-sw.js
website/workspace-public/sportpaleis.webmanifest
```

## Definitieve freeze-status

- De functionele consolidatie, rollen, productiebronprovenance, PlotJob/history en auditable replot blijven intact.
- Donovan heeft de pre-mirror A/B-route als `PASS` bevestigd: de vooraf horizontaal gespiegelde batch kwam via Illustrator → Summa Send To WinPlot direct correct in WinPlot binnen, zonder handmatige spiegeling of andere correctie.
- De A/B-job is `WINPLOT_VALIDATED`; dit verhoogt hem niet stil naar `PHYSICALLY_VALIDATED`.
- Het oorspronkelijke A/B-generatiemanifest blijft als pre-review evidence ongewijzigd op `PENDING`; de latere menselijke uitkomst staat afzonderlijk en auditable als `PASS` in de productiejobregistratie en dit freeze-rapport.
- Nieuwe PlotJobs gebruiken hierdoor vooraf spiegelen en leggen `manualHorizontalFlipInWinPlot: false` vast.
- Golden Physical Case 001 en Golden Physical Batch 001 blijven beide exact `PHYSICALLY_VALIDATED` en zijn inhoudelijk noch bytegewijs gewijzigd.
- Een bevoegd beheerder/operator kan het bij een PlotJob vastgelegde `.ai`-artefact downloaden. Iedere download leest exact het immutable bestand en controleert eerst de vastgelegde SHA-256.
- Een replot behoudt dezelfde snapshot en levert later exact dezelfde `.ai`-bytes en SHA-256; het origineel wordt niet overschreven.
- Winkelgebruikers kunnen productieartefacten server-side niet downloaden.
- De primaire browserfavicon en het PWA-manifest gebruiken `/sportpaleis-pwa-icon.svg`; de WBD-favicon is niet de primaire Sportpaleis-identiteit.
- Workspace verstuurt niets naar Illustrator, WinPlot, Summa of hardware. Direct-to-Summa blijft buiten scope.

## Immutable productie-evidence

| Bewijs | SHA-256 | Status |
|---|---|---|
| Golden Physical Case 001 — `pioneers-number-2-200mm-1to1-v3.pdf` | `E1056776DE98673BE07058FD9C8D4F28AF1EF9A41E70B882AA465AE54FF03571` | Ongewijzigd, fysiek gevalideerd |
| Golden Physical Batch 001 — `Sportpaleis-Pioneers-10-Orders-Human-Acceptance-001.ai` | `B226A6B7637BEE219FAB5E646D2DE8E9BA7421DB6822FC82629B8FA5175F507B` | Ongewijzigd, fysiek gevalideerd |
| Auto-mirror A/B — `Sportpaleis-Golden-Physical-Batch-001-Auto-Mirrored-AB-001.ai` | `2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4` | Human PASS, WinPlot gevalideerd |

## Verificatie

| Controle | Resultaat |
|---|---|
| Gerichte functional-pilot-freeze-suite | `8/8 PASS` |
| Volledige relevante regressiesuite | `497/497 PASS` |
| `npm.cmd run build:workspace` | `PASS` |
| Workspace package/boundary-verificatie | `PASS` — 13 bestanden, 8 tekstbestanden gecontroleerd |
| TypeScript en runtime syntaxchecks | `PASS` als onderdeel van `build:workspace` |
| Immutable `.ai`-download, herdownload en replot-download | `PASS` — byte-identiek, gelijke SHA-256 |
| Sportpaleis favicon/PWA-identiteit | `PASS` |
| Chunk-sizewaarschuwing van Vite | Niet-blokkerend; bestaande optimalisatie-aandacht, geen functionele of boundary-fout |

Build-evidence:

- `dist-workspace/sportpaleis-pwa-icon.svg`: `E1AB04AAB044763E4F9F4C7DBA3E292973A7717B3DE2B36A80767BB7EF883E57`
- `dist-workspace/sportpaleis.webmanifest`: `9AA88B9F4298B7EC7C3AFCCD4E7A6F2A91011B8A8C48DDC8762AAB3785C6B0A4`
- `dist-workspace/workspace.html`: `4BF2D683D6E82D63337844D742256A30C97C352CBB80E96AF9028B455B1D0D5B`

## Bewijsgrenzen

- Alleen de exact vastgelegde Golden combinaties dragen fysieke bewijsstatus.
- De A/B-spiegelroute draagt `WINPLOT_VALIDATED`, omdat voor deze opdracht geen nieuwe fysieke snede is uitgevoerd.
- Andere verenigingen, profielen, fonts, logo's en contouren erven dit bewijs niet en blijven op hun eigen feitelijke bewijsniveau of `DATA_GAP`.
- Generieke nieuwe PlotJobs bewaren momenteel een immutable productiemanifest; alleen jobs met een werkelijk vastgelegd `.ai`-bestand tonen de `.ai`-downloadactie.
- Geen deploy, DNS-, TransIP-, mail-, ACA-, ISI-, hardware- of automatische Summa-actie is uitgevoerd.

## Exacte release-preflight

1. Gebruik uitsluitend de definitieve freeze-commit en controleer dat de worktree schoon is.
2. Controleer opnieuw de drie bovenstaande productieartefacthashes zonder de bestanden te openen of te herschrijven.
3. Maak een back-up van de bestaande pilotdatastore en voer de schema-12 migratie eerst op een kopie uit.
4. Controleer de productie-environmentconfiguratie fail-closed; laat hardware-send, direct-to-Summa en mailgates uitgeschakeld.
5. Voer vanuit `website` eenmaal `node --experimental-strip-types --test tests/sportpaleis-functional-pilot-freeze-012.test.mjs` en daarna `npm.cmd test` uit.
6. Bouw met `npm.cmd run build:workspace` en voer daarna `node scripts/verify-workspace-build.mjs` uit.
7. Start de kandidaat lokaal/geïsoleerd en controleer health/readiness, login per rol, Productie → Plot-/printhistorie, de originele A/B-job en een replot-download.
8. Vergelijk beide gedownloade `.ai`-bestanden met SHA-256 `2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4`.
9. Controleer dat de Sportpaleis favicon/PWA-identiteit actief is en geen WBD-favicon primair wordt aangeboden.
10. Laat Donovan de releasekandidaat beoordelen en vraag afzonderlijke menselijke GO vóór iedere release- of fysieke productieactie.

`FUNCTIONAL PILOT FREEZE` is actief. Tot de pilot zijn uitsluitend aantoonbare blockers, regressies of veiligheidsproblemen toegestaan.
