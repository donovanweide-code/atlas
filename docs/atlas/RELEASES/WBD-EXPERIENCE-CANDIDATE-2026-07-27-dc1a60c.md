# WBD Experience Candidate — Canonicalization 003

**Status:** canonieke candidate — geen deployment
**Datum:** 27 juli 2026
**Broncommit:** `dc1a60c7b37c1e88ba260b3c3750c932547d0a41`
**Branch:** `codex/candidate-canonicalization-003`
**Build:** `npm run build` vanuit een geïsoleerde export van de broncommit
**Artefact:** `website/.codex-tmp/wbd-experience-candidate-dc1a60c.zip`
**Artefact SHA-256:** `5299447DA5E992D3233F0EC904FAEE789D06DD2F2FFB7DFC3C40AF3C181CE6B9`
**Bestanden:** 27
**Uitgepakte omvang:** 2.328.753 bytes

## Canonieke release-identiteit

Deze candidate wordt uitsluitend geïdentificeerd door de combinatie van:

1. broncommit `dc1a60c7b37c1e88ba260b3c3750c932547d0a41`;
2. artefact `wbd-experience-candidate-dc1a60c.zip`;
3. artefacthash `5299447DA5E992D3233F0EC904FAEE789D06DD2F2FFB7DFC3C40AF3C181CE6B9`.

Een andere commit, artefacthash of bundelnaam is niet dezelfde candidate.

## Buildidentiteit

| Bestand | Bytes | SHA-256 |
|---|---:|---|
| `index.html` | 1.293 | `1AAF62D0A1968502F3918E70D4EA9DD8C103F19846193F61071D59EF95C7D004` |
| `assets/index-8FEdSOJ-.js` | 60.555 | `B44D057118BEC7048A09B14C130C522302E4AE67E879D4F2F01E8023AEA38095` |
| `assets/index-Lu4_j9t0.css` | 166.990 | `1B08A10CC5DBA691DB8F66CF46CD21C2A514B11F1C14ED41751C70D1EA117155` |
| `robots.txt` | 77 | `A247B573EB85259C7C0CC575F930F9978476343E1A681D75CE4B0AA3D14B723A` |
| `sitemap.xml` | 868 | `75195EAB8FBA3A17B186BCC45C79D2D7E8397085EBD779D0FD31D04624701A97` |

## Gecanoniseerde bron

De broncommit bevat uitsluitend de publieke Experience-wijzigingen die de build bepalen:

- publieke HTML-entry en metadata;
- publieke buildverificatie;
- homepage-rendering, methodecopy en sceneconfiguratie;
- publieke route- en kennispagina’s;
- publieke Experience-styling;
- vijf publiceerbare Experience-beelden;
- `robots.txt` en `sitemap.xml`.

Workspace Sync 001, Understanding, interne Workspace-data en overige documentatie- of onderzoeksbestanden maken geen deel uit van deze broncommit.

## Reproduceerbaarheid

De broncommit is buiten de actieve werkmap geëxporteerd en opnieuw opgebouwd.

Daarbij zijn uitgevoerd:

- 43 van 43 geautomatiseerde tests;
- TypeScript-compilatie;
- Vite-productiebouw;
- public-only verificatie;
- vergelijking van alle 27 uitgepakte artefactbestanden met de geïsoleerde build.

De volledige bestandsmanifesten waren gelijk in pad, bytegrootte en SHA-256.

## Releasegrens

Deze canonicalization heeft:

- niets naar preview gepubliceerd;
- niets naar productie gepubliceerd;
- geen DocumentRoot gewijzigd;
- geen bestaande live release vervangen;
- geen Production GO of deploymenttoestemming geïntroduceerd.

Preview en productie blijven hun bestaande, afzonderlijke releasewerkelijkheid serveren totdat een nieuwe expliciete opdracht en GO anders bepalen.
