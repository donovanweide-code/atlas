# SPORTPALEIS — DIGITALE VOORSTEL / TEAMKIT MODULE V1

## Candidate report — 24 augustus 2026

SCOPE: SPORTPALEIS ONLY
PARALLEL WORK UNTOUCHED: Ja. Atlas, WBD Owner, BijCees/AquaFlask en ordercleanup zijn niet gewijzigd.
SEPARATE CLEAN WORKTREE: `codex/spw-teamkit-proposals-v1-20260824`, geïsoleerde clone vanaf `031a66249c3c6b8eeb64fc211e8c57b3bba93b78` / `SPW-QUICK-INTAKE-ADAPTIVE-NESTING-V1-R7-20260824`.

## Executive outcome

Er staat een production-shaped, niet-geactiveerde kandidaat voor de volledige proposal-kern:

aanmaken → private intake → meerdere bronbestanden → teamkitopmaak → klantpreview → feedback → revision → expliciet akkoord → immutable PDF/evidence → interne, externe of onbepaalde afhandeling → kopiëren naar nieuw seizoen.

De kandidaat hergebruikt de bestaande Sportpaleis-store, rollen, Mail Foundation, Search, Production Assets, veilige SVG-inspectie en audit. Er is geen tweede klantdatabase, assetbibliotheek, mailclient, searchindex of productieflow gebouwd.

Niet gereed voor production switch: echte visuele medewerker-/klantacceptatie kon niet worden uitgevoerd omdat in deze sessie geen browserverbinding beschikbaar was. Ook de feitelijke overdracht van een complete `INTERN_BEDRUKKEN`-taak naar een bestaande echte orderwachtstand vraagt praktijkvalidatie; V1 maakt bewust nog geen PlotJob of fysieke productie.

## Foundation scan en hergebruik

FOUNDATION SCAN: bestaande monolithische Sportpaleis Workspace, schema 12, file/MariaDB-store, HTTP-boundary, runtime, rollen, audit, Search, Mail, private bronnen, Production Assets, SVG group/object-candidates, PDF-parser en productie-Human-GO onderzocht.
REUSED CUSTOMER FOUNDATION: bestaande order-/contactcontext; proposal houdt alleen de noodzakelijke proposal-contactsnapshot. Er bestaat nog geen zelfstandige centrale customer-master.
REUSED CLUB FOUNDATION: `associations` met stabiele association ID/name.
REUSED MAIL FOUNDATION: drie declaratieve templates; preview/capture/idempotency/permission/audit via bestaande foundation.
REUSED ASSET FOUNDATION: bestaande `productionAssetSources` en `productionElements`.
REUSED SOURCE STORAGE: bestaande centrale runtime-state en private binaire routes; originele bytes en SHA-256 blijven immutable.
REUSED SEARCH: proposals toegevoegd aan dezelfde Workspace-index.
REUSED AUDIT: alle proposal-events landen in dezelfde auditcollectie.
REUSED ROLES: admin/operator/store; geen nieuw rollenplatform.

## Proposal capability

PROPOSAL DATA MODEL: klant/vereniging → voorstel → revisions → sources → feedback → approvals → fulfillment tasks.
PROPOSAL STATUS FLOW: Concept, Wacht op klant, Klaar voor opmaak, In opmaak, Klaar voor controle, Bij klant, Feedback ontvangen, Klaar voor akkoord, Akkoord, Gearchiveerd.
PROPOSAL VERSIONING: betekenisvolle editor-save maakt V2/V3/etc.; aggregate revision voorkomt stale overwrite.
PROPOSAL NUMBER: `PV-YYYY-xxxx`; hetzelfde proposal-ID blijft over revisions gelijk.

CUSTOMER REQUEST EMAIL: professionele intake- en reviewtemplate met veilige link en vector-first uitleg.
CUSTOMER INTAKE: private tokenroute zonder Workspace-login, concept bewaren en expliciet indienen.
MOBILE INTAKE: mobile-first CSS met 390- en 320-px regels; Human QA pending.
MULTI-FILE UPLOAD: SVG/EPS/AI/PDF/PNG/JPG, 8 MB per bron en 24 MB per voorstel.
VECTOR HANDLING: veilige SVG-parser; actieve/externe/font-/rasterafhankelijke SVG faalt gesloten. AI/PDF blijft inspectie-/reviewbron.
RASTER QUALITY WARNING: high-res review, low-res betere-bron-verzoek en unknown review zijn zichtbaar; PNG/JPG wordt niet automatisch productieklaar.

CENTRAL SOURCE STORAGE: filename, MIME, format, SHA-256, timestamp, uploader, proposal, vereniging, versie, kwaliteit en immutable bytes.
PRODUCTION ASSET LINK: “Bewaar als Production Asset” maakt via de bestaande foundation een hash-identieke bron en koppelt die terug aan het voorstel.
MULTI-ASSET SVG: bestaande Production Assets group/object-candidateflow wordt gebruikt; geen vector-editor toegevoegd.
CLUB ASSOCIATION: proposal en bron bewaren association ID/name; bestaande association-assets zijn direct selecteerbaar.

PROPOSAL EDITOR: begrensde teamkit-editor, geen Illustrator/Figma-vervanger.
TEAMKIT MULTI-PRODUCT: meerdere artikelen, aantallen, maten, kleur, team en notities.
FRONT/BACK: afzonderlijke garment canvases.
PLACEMENT PRESETS: borst/rug/mouw/short/broek/tas.
ASSET POSITIONING: veilige preset en percentagebreedte; geen vrije pixel-editor.
TEXT/NUMBER/INITIALS: naam, initialen, rugnummer, shortnummer en vrije tekst.

CUSTOMER PREVIEW: aparte Sportpaleis-afzenderervaring, zonder interne Workspace-UI.
CUSTOMER FEEDBACK: algemeen of per artikel, “dit klopt”/“aanpassen”.
REVISION FLOW: feedback kan aan de volgende immutable revision worden gekoppeld en verwerkt.
CUSTOMER APPROVAL: expliciete checkbox, naam, e-mail, tokencontext en exacte revision.
APPROVED VERSION IMMUTABLE: snapshot-, preview- en PDF-hash; nieuwe revision bewaart eerdere approval, PDF en taken in `approvalHistory`.

FINAL DIGITAL VERSION: exacte opgeslagen klantpreview.
FINAL PDF: PDF 1.7 met Sportpaleis-kop, voorstelgegevens, artikelen, bedrukking en eenvoudige front/back-visual; concept en approved routes zijn privé.
MAIL SEND: kandidaat gebruikt capturetransport; SMTP-switch blijft buiten deze kandidaat en vereist productie-Human-GO.
MAIL AUDIT: template, actor, status, attempt-ID, proposal en revision.

SEARCH: voorstelnummer, titel, type, klant, contact, e-mail, vereniging, team, seizoen, status, product en artikelnummer.
CUSTOMER/CLUB CONTEXT: association is gekoppeld en Search opent het voorstel. Een afzonderlijke reverse customer-master is bewust niet geïntroduceerd.
COPY/REUSE PROPOSAL: nieuw proposal-ID, nieuw nummer, nieuwe revisioncontext; artikelen/layout/assets worden gekopieerd, historische approval niet.

HISTORY: revisions, feedback, approval history, fulfillment en audit.
SOURCE TRACEABILITY: proposal → source ID/version/SHA-256/uploader.
ASSET VERSION TRACEABILITY: placement en fulfillment taak bewaren asset/source en versie/hash.
APPROVAL EVIDENCE: revision, timestamp, contact, tokencontext, snapshot-, preview- en PDF-hash.

SECURITY: signed random 256-bit token, alleen hash in state, 30-dagen-expiry, revocation bij heruitgifte, rate limit, origin checks, CSRF voor medewerkers, CSP, noindex.
PRIVATE FILES: geen directorylisting of openbare bron-URL.
EXTERNAL LINK SECURITY: token is proposal-scoped; public projection verbergt tokenhash, raw bytes, promoted asset IDs en interne fulfillment.
CONCURRENCY: employee aggregate-revision en customer proposal-revision checks.
FAILURE UX: specifieke foutcodes en vervolgstappen voor link, source, revision, approval, PDF en mail.

## Afhandeling na akkoord

Per bedrukking: `INTERN_BEDRUKKEN`, `EXTERNE_BEDRUKKER`, `NOG_TE_BEPALEN`.

- Intern: immutable approved bron, item, placement en exacte assetversie worden als `INTERNAL_PRODUCTION`-taak klaargezet. Ontbrekende maat/aantal/bron blijft Human Check. Geen PlotJob start automatisch.
- Extern: `EXTERNAL_SUPPLIER`-taak met artikelen, aantallen, maten, kleur, positie en assetref; aanlevermailpreview via bestaande Mail Foundation; statussen te versturen/verstuurd/bevestigd/retour/gereed.
- Onbepaald: approved proposal blijft geldig, maar `ROUTE_DECISION` houdt uitvoering tegen.
- Gemengd: iedere placement krijgt een afzonderlijke deterministische taak.
- Herladen/dubbel akkoord: dezelfde approval en taken; geen duplicaten.
- Wijziging na akkoord: nieuwe revision; eerdere approval/PDF/taken blijven onveranderlijk opvraagbaar.

De automatische interne taak is nog geen echte order of PlotJob. Koppeling aan een bestaande order kan menselijk worden geregistreerd; automatische materialisatie naar een concrete productie-wachtstand is BEWUST LATER tot praktijkacceptatie bevestigt welke ordercontext Sportpaleis gebruikt.

## Source-to-experience coverage

| Eis | Status | Zichtbaar bewijs / grens |
|---|---|---|
| 0–3 scope, doel, integratie, foundation scan | ZICHTBAAR | Sportpaleis-only branch; hergebruik bestaande foundations |
| 4–5 ingang en voorstelstart | ZICHTBAAR | Voorstellen-nav, werkbakken, + Nieuw voorstel |
| 6 aanvraagmail | ZICHTBAAR | Mailpreview + Human GO, vector-first tekst |
| 7 klantformulier | ZICHTBAAR | Private intake, draft en submit |
| 8–9 uploads en evidence | ZICHTBAAR | Zes formaten, checksums, originele bytes |
| 10 Production Assets | ZICHTBAAR | Hash-identieke promotie naar bestaande review |
| 11 multi-asset SVG | ZICHTBAAR | Bestaande group/object-candidateflow |
| 12–16 editor/canvas/presets/teamkit/reuse | ZICHTBAAR | Begrensde front/back teamkiteditor en vereniging-assets |
| 17 revisions | ZICHTBAAR | V1…Vn en optimistic concurrency |
| 18–19 preview/feedback | ZICHTBAAR | Aparte klantpreview en centrale feedback |
| 20 workflow/Attention | ZICHTBAAR | Statussen en zeven proposalwerkbakken |
| 21 Human GO | ZICHTBAAR | Save verstuurt nooit; mail en status zijn apart |
| 22 approval | ZICHTBAAR | Exacte revision, contact, tokencontext, hashes |
| 23–24 output/nummer | ZICHTBAAR | Digitale preview, PDF, `PV-YYYY-xxxx` |
| 25 Mail verzenden | ZICHTBAAR | Preview + capture; echte SMTP-switch vereist productie-GO |
| 26 mailreplymatching | BEWUST LATER | Feedbackformulier is V1-canoniek; geen fragile parsing |
| 27 Search | ZICHTBAAR | Bestaande Workspace Search-index |
| 28 klant/vereniging reverse context | BEWUST LATER | Associationlink + Search aanwezig; geen nieuwe customer-master |
| 29–30 kopiëren/seizoen/team | ZICHTBAAR | Nieuwe proposalcontext met gekopieerde kit |
| 31–32 quality en ontbrekende bron | ZICHTBAAR | Vector/raster/low-res/unknown + Attention |
| 33–34 productiegrens/asset reuse | ZICHTBAAR | Fulfillment task; geen auto-PlotJob; expliciete assetpromotie |
| 35 coverage matrix | ZICHTBAAR | Dit hoofdstuk |
| 36 security | ZICHTBAAR | Token, expiry, revoke, validation, private routes, rate limit |
| 37 audit | ZICHTBAAR | Proposal-, source-, mail-, feedback-, approval- en task-events |
| 38 history/immutability | ZICHTBAAR | Approval history en oude PDF blijven hash-identiek |
| 39 mobile/desktop | ZICHTBAAR | Responsive 1440/390/320 contract; Human QA pending |
| 40 performance | ZICHTBAAR | Direct editor; busy/disabled dubbele submits |
| 41 failure UX | ZICHTBAAR | Contextspecifieke fouten |
| 42 concurrency | ZICHTBAAR | Aggregate/revision conflicts |
| 43 rollen | ZICHTBAAR | Bestaande admin/operator/store |
| 44–45 visuele kwaliteit/geen AI-taal | ZICHTBAAR | Sportpaleis-afzender; geen AI/Atlas-copy |
| 46 acceptance A–O | ZICHTBAAR | Gerichte Teamkit + bestaande SVG/asset-tests |
| 47 echte Human Acceptance | BLOCKED | Geen browserverbinding; externe klant nog niet getest |
| 48 production regression | ZICHTBAAR | 49 relevante regressies groen; full suite baseline gedocumenteerd |
| 49 development strategy | ZICHTBAAR | Eén verticale kandidaat in veilige slices |
| 50 dependencies | ZICHTBAAR | Geen nieuwe dependency/SaaS |
| 51 deployment | BEWUST LATER | Candidate packaging kan; productie-switch stopt bij Human GO |
| 52 geen cleanup | ZICHTBAAR | Geen orders/history verwijderd |
| 53 eindrapport | ZICHTBAAR | Dit document |
| 54 Definition of Done | BLOCKED | Technische flow staat; echte Human Acceptance en interne orderwachtstandvalidatie ontbreken |
| Aanvulling A–H route-afhandeling | ZICHTBAAR | Mixed routing, unresolved Attention, idempotency, version pinning en audit getest |

## Acceptance en regressie

DESKTOP QA: technische build en responsive contract groen; visuele Human QA PENDING.
MOBILE QA: 390/320 responsive regels aanwezig; visuele Human QA PENDING.
TARGETED TESTS: 2/2 Teamkit end-to-end; 49/49 gecombineerde relevante Sportpaleis-regressies.
FULL SPORTPALEIS REGRESSION: relevante selectie groen.
FULL REPOSITORY: 717/722 groen. De vijf failures bestonden al in baseline en liggen buiten Sportpaleis Teamkit: drie ontbrekende historische WBD-factuurfixtures, één bestaande releasegraphverwachting en één WBD Owner-sessiefixture.
BUILD: `npm run build:workspace` groen; 221 bestanden geverifieerd.
PRODUCTION DEPENDENCY AUDIT: geen nieuwe dependencies; bestaande auditbaseline 1 moderate + 1 high blijft ongewijzigd.

TECHNICAL ACCEPTANCE: PASS voor de geïmplementeerde kandidaatgrens.
HUMAN ACCEPTANCE: PENDING.
CUSTOMER HUMAN ACCEPTANCE: PENDING.

## Production en release boundary

CURRENT PRODUCTION HEALTH: niet opnieuw gemuteerd of omgeschakeld; bestaande productie bleef buiten scope.
PRODUCTION UNCHANGED: Ja.
CANDIDATE RELEASE: `SPW-TEAMKIT-PROPOSALS-V1-RC1-20260824` (te vormen na finale checks).
COMMIT: te vormen.
ARTIFACT SHA256: te vormen.
MANIFEST SHA256: te vormen.
DEPLOYPLAN SHA256: te vormen.
AUTOMATED PREPARE: niet gestart vóór artifactvorming.
ROLLBACK READY: bronrollback naar `SPW-QUICK-INTAKE-ADAPTIVE-NESTING-V1-R7-20260824`; runtime rollback moet in staging worden bewezen.
STALE STATE: voor deploy opnieuw vaststellen.
READY FOR HUMAN GO: NEE.
BLOCKER: echte medewerker-/klantacceptatie op desktop/390/320 en validatie van de gewenste interne orderwachtstand na approval.

## STOP-list

- Geen production switch.
- Geen automatische PlotJob of fysieke productie.
- Geen automatische supplier- of klantmail zonder preview/Human GO.
- Geen mailreplyparser.
- Geen tweede klantdatabase, assetbibliotheek, mailclient, search of auditmodel.
- Geen automatische vectorisatie van PNG/JPG.
- Geen volledige vector-/pixel-editor.
- Geen bestaande ordercleanup.
- Geen Atlas-, WBD Owner-, BijCees- of AquaFlask-integratie.
- Geen betaalde SaaS/dependency.

## Exact volgende Human Acceptance

Gebruik Donovan als medewerker én klant op een production-shaped stagingruntime:

1. bestaand A.S.C. Waterwijk-dossier openen en voorstel maken;
2. private intake op iPhone 390 en kleine mobiel 320 invullen;
3. echte multi-asset SVG plus lage PNG en latere betere vector uploaden;
4. bron via bestaande Bibliotheek selecteren/promoten;
5. kit met minimaal shirt en jas, front/back en gemengde routes opmaken;
6. intake- en reviewmailpreview controleren;
7. klantfeedback geven, V2 maken en exact V2 goedkeuren;
8. final PDF visueel controleren;
9. intern/extern/onbepaald bakjes controleren;
10. gewenste bestaande orderwachtstand voor `INTERN_BEDRUKKEN` bevestigen;
11. wijziging na akkoord maken en aantonen dat oude preview/PDF/taken identiek blijven;
12. voorstel via Search en verenigingscontext terugvinden en naar nieuw seizoen kopiëren.

Pas na deze acceptance: releasecandidate opnieuw bouwen, staging deployen, runtime/rollbackbewijs verzamelen en opnieuw stoppen bij production Human GO.
