# Atlas Runtime Implementation V1

## Status

**Lokale implementatiekandidaat — GO voor een gecontroleerde live-praktijkreview na afzonderlijke productie-uitrol.**

Deze werkstroom heeft geen productieomgeving gewijzigd. De publieke website, Atlas Workspace en Sportpaleis zijn niet aangepast. De geratificeerde Foundation, Continuous Inquiry Loop V1, Cognitive Engine V1 en Runtime Architecture V1 zijn niet gewijzigd.

Er is geen Foundation Conflict Candidate ontstaan: tijdens de implementatie is geen onoplosbare tegenspraak tussen de geratificeerde regels gevonden.

## Wat nu werkelijk draait

Nieuwe Experience-sessies krijgen versie `6.0-runtime-v1`. Hun zichtbare gesprek wordt niet meer door `currentStep` of een vaste vraagroute bepaald. De bestaande Experience-shell rendert uitsluitend de actuele `Runtime Decision`.

De uitvoeringsketen is:

> deelnemer-event → begrensde Runtime Boundary → actuele Field-revisie → Candidate Transition → Constitutional Gate → atomische Field- en Journal-commit → Runtime Decision → bestaande Experience

Bestaande sessies van 2.1, 3.0, 4.0 en 5.0 behouden hun oorspronkelijke route en opslagcontract.

## Kleine, zelfstandig getoetste implementatiestappen

### 1. Pure Runtime-kern

`website/src/atlas-runtime.ts` bevat een deterministische, opslag-onafhankelijke kern met:

- één canoniek Cognitive Field per inquiry;
- werkelijkheidscontacten met event, actor, directheid en tijd;
- afzonderlijke betekenissen, hypotheses, alternatieven, tegenaanwijzingen en open punten;
- kwalitatieve onzekerheid;
- risicogrens en verplichte externe correctie;
- kandidaatvorming zonder rechtstreeks commitrecht;
- een afzonderlijke constitutionele pre-commitcontrole;
- Runtime Decisions met reden, onzekerheid, risicogrens, deelnemersopties, vervolggrens en foundationverwijzingen;
- een append-only Journal-record per geaccepteerde transitie;
- consolidatie op inhoudelijke belasting en revisieafstand, nooit als gespreks-einde;
- een afzonderlijk Resume-event dat tijd, context, frame en actualiteit opnieuw opent vóór een volgende vraag.

Herleiding: RA-01 t/m RA-17, in het bijzonder RA-02, RA-05 t/m RA-08, RA-11 t/m RA-17; CI §5, §8–15, §17 en §20–22; CE §4–7, §13, §18, §20 en §23–24.

### 2. Centrale en lokale opslag

Nieuwe MySQL-tabellen:

- `experience_runtime_states`: exact één actuele Field-revisie en Decision per sessie;
- `experience_runtime_journal`: append-only event- en transitiehistorie met unieke event-id en unieke gecommitteerde revisie.

De productie-API vergrendelt de actuele sessie en Runtime State, controleert de basisrevisie, verwerkt dubbele events idempotent en schrijft State plus Journal binnen één database-transactie. Zonder volledige commit komt geen nieuwe Decision vrij.

De lokale validatieserver bewaart hetzelfde contract in de bestaande afgeschermde JSON-testopslag en geeft het Journal niet terug aan de deelnemerinterface.

Herleiding: RA-04, RA-06, RA-07, RA-12, RA-16 en RA-17.

### 3. Bestaande Experience als uitvoeroppervlak

De bestaande WBD-shell, branding, footer, privacy-uitleg, feedback, verwijderactie en browser-terugbescherming blijven behouden. Er is geen redesign uitgevoerd.

De Runtime bepaalt nu:

- welke beweging is toegestaan;
- waarom die beweging volgt;
- welke vraag zichtbaar wordt;
- hoeveel onzekerheid geldt;
- of intern vervolg verantwoord is of externe correctie nodig is.

De deelnemer kan na iedere beweging vrijwillig stoppen. De Runtime bevat geen maximumaantal beurten en geen route die vanzelf “op” raakt. Hervatten maakt eerst een gecommitteerde `resume-revalidation` en hergebruikt dus niet rechtstreeks oude output.

Herleiding: RA-12, RA-13, RA-15 en RA-17; CI §14.5–6 en §20–22.

### 4. Experience Observatory

Het Observatory toont voor een Runtime-sessie:

- Experience-versie;
- betekenisvolle Runtime-events;
- afzonderlijke deelnemerbijdragen;
- actuele revisie en onderzoeksbeweging;
- hypothesestatus en kwalitatieve zekerheid;
- het verplichte alternatief bij iedere hypothese.

De interne WBD-observaties blijven gescheiden van deelnemerswoorden en van het Cognitive Field.

## Compatibiliteitsgrens

| Sessieversie | Uitvoering |
| --- | --- |
| 6.0 | Runtime Field, Gate, Journal en Decision |
| 5.0 | Bestaande Flow Recomposition blijft intact |
| 4.0 | Bestaande Living Research Loop blijft intact |
| 3.0 | Bestaande Conversation & Insight blijft intact |
| 2.1/legacy | Bestaande legacyflow blijft intact |

Alleen nieuw aangemaakte sessies starten op 6.0. Er vindt geen stilzwijgende migratie van bestaande gesprekken plaats.

## Browseracceptatie

Uitgevoerd op de lokale releasebuild via de echte Experience-API en centrale testopslag:

1. nieuwe organische sessie gestart;
2. versie `6.0-runtime-v1` bevestigd;
3. eerste werkelijkheidscontact ingestuurd;
4. tijdsgrens als toestandsgedreven vervolgstap ontvangen;
5. tweede werkelijkheidscontact ingestuurd;
6. voorlopige hypothese en tegenvoorbeeldvraag ontvangen;
7. refresh uitgevoerd en sessie centraal hervat;
8. expliciete correctie ingestuurd;
9. hypothese veranderde naar `contested / weakened`;
10. browser-terug uitgevoerd: het gesprek bleef staan en de bewuste vertrekdialoog verscheen;
11. vrijwillig gestopt en daarna hervat;
12. Observatory geopend: revisie, drie bijdragen, Runtime-events, beweging en hypothesestatus waren zichtbaar;
13. mobiel op 390 × 844 gecontroleerd: geen horizontale overflow, invoerveld volledig binnen viewport en CTA 44 px hoog;
14. deelnemer- en Observatory-console gecontroleerd: geen errors of warnings.

De persistente testtoestand eindigde met revisie 3, drie werkelijkheidscontacten, één verzwakte hypothese, drie Journal-records en nul vermengde wereldkennisrecords.

## Geautomatiseerde acceptatie

- `npm.cmd test`: **176/176 geslaagd**;
- `npm.cmd run build:experience`: **geslaagd**;
- Runtime-helper aanwezig in het deploypakket, SHA-256 `123E1C7D9E89042E0D4C4D4C8E0993E8703308AAC445F3ABEDC6A3252F253274`;
- `npm.cmd run build`: **geslaagd**;
- public-only verificatie: **geslaagd**, 29 bestanden en 9 tekstbestanden gecontroleerd;
- TypeScript: geen fouten;
- PHP-runtime kon lokaal niet met een PHP CLI worden uitgevoerd; het productiepad is daarom statisch, contractueel en via de lokale equivalente server getoetst, maar vereist bij uitrol nog de bestaande PHP-productiepreflight.

## Productie-uitrolgrens

Deze kandidaat is bewust niet gepubliceerd. Een veilige latere uitrol moet als afzonderlijke opdracht minimaal:

1. een volledige databaseback-up en rollbackpunt maken;
2. migratie `004-atlas-runtime.sql` uitvoeren;
3. het nieuwe Experience-pakket inclusief `api/atlas-runtime.php` publiceren;
4. PHP-syntax en API-health in de doelruntime controleren;
5. bevestigen dat bestaande 2.1–5.0-sessies intact blijven;
6. één volledig nieuwe 6.0-sessie starten;
7. stop/hervat controleren en verifiëren dat hervatten een nieuwe Journal-revisie maakt;
8. Observatory, HTTPS, noindex en rollback opnieuw accepteren.

## Bewuste V1-grenzen

Deze implementatie voegt geen AI, taalmodel, connector of automatische wereldkennis toe. De eerste Processor gebruikt kleine, deterministische signalen om uitsluitend reeds geratificeerde onderzoeksbewegingen te kiezen. Wereldkennis blijft technisch afgescheiden en in deze versie leeg.

Externe bronnen en bevoegde menselijke correctie hebben nog geen eigen invoerkanaal. Bij een hoog-risicosignaal begrenst de Gate daarom het gesprek tot het vragen om een passende werkelijkheidstoets; zij simuleert die toets niet.

Dit zijn implementatiegrenzen, geen nieuwe constitutionele regels.

## Eindoordeel

De bestaande Experience heeft nu een volledige eerste verticale Runtime-slice: denken, veranderen, corrigeren, begrenzen, bewaren, hervatten en verantwoorden lopen via één herleidbare cognitieve toestand. De kandidaat is lokaal gereed voor gecontroleerde productie-uitrol en daarna voor Donovans live praktijkreview.
