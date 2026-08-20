# Sportpaleis live source recovery — 2026-08-20

Status: ORIGINAL SOURCE RECOVERED. Dit document is provenancebewijs; het autoriseert geen deployment of productiewijziging.

## Historische release

- Release: `SPW-PILOT-RELEASE1-HAPPY-PATH-20260817`
- Oorspronkelijke commit: `c36419c669873923392680633b61f7e9c3684244`
- Parent: `5b80a7bd58913ab39ce7133cfea824e4ee361d39`
- Tree: `1962c8b4500ba07720604a924cf47835d24707c6`
- Herstelde centrale branch: `recovery/spw-pilot-release1-happy-path-20260817`
- Herstelde immutable tag: `spw-pilot-release1-happy-path-20260817`
- Herstelde base-tag: `spw-pilot-ux-bulk-production-ready-closeout-20260817`

De drie refs zijn zonder force-push op `origin` vastgelegd. De historische commitidentiteit is niet opnieuw gemaakt of herschreven.

## Immutable artifact

- Release-artifact SHA-256: `b9bfebfe75bbaf855f8db81374131003bde32ee2745cd058660621c84ed353b5`
- Extern manifest SHA-256: `3203e9623537e8d2eba5c2cdda6d2c62f7721637d5ced9c4ae94eb0f26c85c73`
- Embedded manifest/live manifest SHA-256: `4c627bd5c95d95f7caa04d64b8b189be4a2118178fa736be1570950350dbdb7d`
- Live assetmanifest-fingerprint: `04692e7d66e9d0369c99525c57abd87897256fbfe2c354cb3b1c5fc5576631a4`
- Live hoofdasset: `workspace-C8_l-zZ4.js`
- Live hoofdasset SHA-256: `55dfbd8cfc7bfb36589b047ea98cbd8df1a380022a526f60c8dd2c781815be08`

## Rebuild-equivalence

Een schone clone van de oorspronkelijke commit is met het gelockte packagecontract en Vite 8.1.5 gebouwd. Van de 219 outputbestanden waren 210 direct byte-identiek. De overige negen pad-/hashverschillen kwamen uitsluitend voort uit twee paren content-identieke WebP-bronnen die met hetzelfde `[hash]`-patroon naar dezelfde assetnaam leiden. De volgorde van een schone checkout bepaalde daardoor de suffix `2`; dit wijzigde alleen twee assetnamen en de daarvan afgeleide hoofdchunk-, bootstrapchunk- en HTML-referenties.

Na de volgende uitsluitend naamgevende normalisatie waren 219 van 219 bestanden byte-identiek, met nul resterende inhoudelijke verschillen:

- `workspace-C9L6PBSI2.webp` → `workspace-C9L6PBSI.webp`
- `workspace-XAiBJ0OB2.webp` → `workspace-XAiBJ0OB.webp`
- `workspace-DipaTt5b.js` → `workspace-C8_l-zZ4.js`
- `workspace-B6TWVOzs.js` → `workspace-BJSaUvWA.js`

De originele release blijft het immutable rollback- en runtimebewijs. Een nieuw gebouwde bundle is niet in productie geplaatst.
