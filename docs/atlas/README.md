# Atlas-documentatie

Lees eerst [`../../Foundation.md`](../../Foundation.md). Dat document is de enige bron van waarheid.

Deze map vertaalt de Foundation naar dagelijks gebruik:

1. [`ATLAS_WORKFLOW.md`](ATLAS_WORKFLOW.md) — begin en sluit een werkdag bewust af.
2. [`DECISIONS.md`](DECISIONS.md) — bewaar keuzes en hun reden.
3. [`ATLAS_LOGBOOK.md`](ATLAS_LOGBOOK.md) — bewaar lessen, successen en momentum.
4. [`SPRINTS/Sprint-001.md`](SPRINTS/Sprint-001.md) — doel, afbakening en verificatie van Sprint 001A–001F.
5. [`SPRINTS/Sprint-002.md`](SPRINTS/Sprint-002.md) — handmatige bewijssprint voor de laatst bevestigde werkelijkheid.
6. [`SPRINTS/Sprint-004.md`](SPRINTS/Sprint-004.md) — gecontroleerde route van lokale releasecandidate via staging naar productie.
7. [`SPRINTS/Sprint-005.md`](SPRINTS/Sprint-005.md) — iteratieve Experience-ontwikkeling met de actuele preview als voortschrijdende nulmeting.
8. [`RELEASES/WBD-2026-07-26-ca3d1bd.md`](RELEASES/WBD-2026-07-26-ca3d1bd.md) — broncommit, artefacthash en validatie van de actuele publieke releasecandidate.
9. [`OBSERVATIONS.md`](OBSERVATIONS.md) — domeingrens, opslag en werkende keten van Waarnemen.
10. [`PRINCIPLES.md`](PRINCIPLES.md) — groeiboek van Candidate via Decision naar Foundation.
11. [`WBD-WORKSPACE-BUSINESS-FOUNDATION-V1.md`](WBD-WORKSPACE-BUSINESS-FOUNDATION-V1.md) — permanente merk- en documentbasis voor WBD-facturen en toekomstige zakelijke documenten.
12. [`WBD-WORKSPACE-FOUNDATION-001B.md`](WBD-WORKSPACE-FOUNDATION-001B.md) — afgesloten WBD Workspace Foundation en Atlas Workspace Sync, actuele ontwikkelpartner en grens van Experience Polish naar Project 002.
13. [`PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md`](PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md) — read-only inventarisatie, risicoanalyse, doelarchitectuur en gefaseerd implementatieplan voor de TransIP-infrastructuur.
14. [`PROJECT-002B-SECURITY-BASELINE-RECOVERY-READINESS.md`](PROJECT-002B-SECURITY-BASELINE-RECOVERY-READINESS.md) — credentialhygiëne, TransIP-accountbeveiliging, DNS-export, backup-/herstelbaseline, eigenaarschap en GO/NO-GO voor Project 002C.
15. [`PROJECT-001-FINAL-RELEASE-REVIEW-2026-08-05.md`](PROJECT-001-FINAL-RELEASE-REVIEW-2026-08-05.md) — laatste geïntegreerde releasecandidatevalidatie van Project 001.
16. [`PROJECT-001-FINAL-HANDOFF-TO-PROJECT-002.md`](PROJECT-001-FINAL-HANDOFF-TO-PROJECT-002.md) — canonieke inhoudelijke afsluiting van Project 001, infrastructuuroverdracht en heropeningscriteria.
17. [`PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md`](PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md) — canonieke productie-infrastructuurbeoordeling en gefaseerde doelrichting voor Project 002C.
18. [`PROJECT-002C-ENVIRONMENT-RELEASE-CONTROL-BASELINE.md`](PROJECT-002C-ENVIRONMENT-RELEASE-CONTROL-BASELINE.md) — minimale professionele environment-, release-, bewijs- en rollbackbaseline van Project 002C.2.
19. [`PROJECT-002C-EXTERNAL-MONITORING-BASELINE.md`](PROJECT-002C-EXTERNAL-MONITORING-BASELINE.md) — onafhankelijke availability-, SSL-, application-health- en attentionbaseline van Project 002C.3, zonder externe activatie.
20. [`PROJECT-002C-BACKUP-OFF-PROVIDER-RECOVERY-BASELINE.md`](PROJECT-002C-BACKUP-OFF-PROVIDER-RECOVERY-BASELINE.md) — providerneutraal backupregister, off-provider recovery-, RPO/RTO-, restore- en attentionbeleid van Project 002C.4, zonder data-export of opslagactivatie.
21. [`PROJECT-002C-DNS-CANONICAL-MAIL-AUTH-HYGIENE.md`](PROJECT-002C-DNS-CANONICAL-MAIL-AUTH-HYGIENE.md) — publieke DNS-, canonical-, SPF-, DKIM-, DMARC-, MX-, CAA- en DNSSEC-baseline van Project 002C.5, zonder record- of productiewijzigingen.
22. [`PROJECT-002C-ACCESS-DEPLOYMENT-CREDENTIAL-OPERATIONS.md`](PROJECT-002C-ACCESS-DEPLOYMENT-CREDENTIAL-OPERATIONS.md) — access-, deploymentcredential-, least-privilege-, recovery- en auditbaseline van Project 002C.6, zonder login of account-, credential- en productiewijzigingen.
23. [`PROJECT-002C-CLOUDFLARE-FREE-PREFLIGHT.md`](PROJECT-002C-CLOUDFLARE-FREE-PREFLIGHT.md) — Cloudflare Free-waarde-, DNS-, DNSSEC-, proxy-, TLS-, WAF-, cache-, privacy-, cutover- en rollbackpreflight van Project 002C.7, zonder account, zone of productiehandeling.

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
