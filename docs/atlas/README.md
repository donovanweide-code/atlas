# Atlas-documentatie

Lees eerst [`../../Foundation.md`](../../Foundation.md). Dat document is de enige bron van waarheid.

Deze map vertaalt de Foundation naar dagelijks gebruik:

1. [`ATLAS_WORKFLOW.md`](ATLAS_WORKFLOW.md) — begin en sluit een werkdag bewust af.
2. [`DECISIONS.md`](DECISIONS.md) — bewaar keuzes en hun reden.
3. [`ATLAS_LOGBOOK.md`](ATLAS_LOGBOOK.md) — bewaar lessen, successen en momentum.
4. [`SPRINTS/Sprint-001.md`](SPRINTS/Sprint-001.md) — doel, afbakening en verificatie van Sprint 001A–001F.
5. [`SPRINTS/Sprint-002.md`](SPRINTS/Sprint-002.md) — handmatige bewijssprint voor de laatst bevestigde werkelijkheid.
6. [`SPRINTS/Sprint-004.md`](SPRINTS/Sprint-004.md) — gecontroleerde route van lokale releasecandidate via staging naar productie.
7. [`RELEASES/WBD-2026-07-26-ca3d1bd.md`](RELEASES/WBD-2026-07-26-ca3d1bd.md) — broncommit, artefacthash en validatie van de actuele publieke releasecandidate.
8. [`OBSERVATIONS.md`](OBSERVATIONS.md) — domeingrens, opslag en werkende keten van Waarnemen.
9. [`PRINCIPLES.md`](PRINCIPLES.md) — groeiboek van Candidate via Decision naar Foundation.

Klantgebonden feiten blijven in het betreffende dossier onder [`../../clients/`](../../clients/). De Atlas-map bewaart methode, besluiten, sprintgeschiedenis en herbruikbare lessen; zij dupliceert geen volledige klantdossiers.

De manifest-, principes- en Foundation-bestanden zijn korte toegangspunten tot de canonieke Foundation. Zij introduceren geen tweede filosofie.

## Redactioneel bevestigd casebeeld

Een `CASE-SNAPSHOT.json` naast het betreffende klantdossier is het redactioneel bevestigde casebeeld waarvoor Atlas op dat moment durft te staan. Alleen een revision met status `confirmed` mag de Workspace voeden. Nieuwe documenten, commits, observaties en onderzoeksresultaten wijzigen de Workspace niet automatisch; een nieuwe revision wordt pas actueel nadat Atlas het casebeeld heeft samengesteld, Donovan het heeft bevestigd en Codex de bronnen en technische geldigheid heeft geborgd.

Een snapshot is geen volledige kopie van het dossier. Een Candidate gebruikt `confirmationMode: "editorial-confirmation-pending"` en heeft nog geen `confirmedBy` of bevestigingstijdstip. Candidate-revisions blijven buiten de interface, superseded-revisions blijven via de repository herleidbaar en een withdrawn-revision levert geen oude inhoudelijke fallback op.

## Operationele ontwikkelafspraak — lokale interfacebeoordeling

Controleer vóór iedere interfacebeoordeling welke lokale werkelijkheid daadwerkelijk wordt getoond:

- welke projectmap wordt geserveerd;
- welke branch actief is;
- welke commit draait.

Start de beoordeling pas wanneer deze drie gegevens overeenkomen met de bedoelde werkboom. Bij een afwijking wordt eerst de lokale serveercontext gecorrigeerd; er volgt nog geen conclusie over de interface of sprint.
