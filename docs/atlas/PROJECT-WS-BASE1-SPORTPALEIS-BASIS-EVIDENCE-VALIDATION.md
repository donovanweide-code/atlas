# WS-BASE.1 — Sportpaleis Basis Evidence Validation

**Project:** WBD Workspace Evolution

**Practice partner:** Sport 2000 Sportpaleis B.V.

**Datum:** 7 augustus 2026

**Status:** **WS-BASE.1 PREPARATION GO**

**Practice evidence:** **PENDING**

**Workspace Basis product acceptance:** **NO-GO / PENDING EVIDENCE**

**Application implementation:** niet uitgevoerd

## Bewijstaal

- **EXISTING EVIDENCE** — aantoonbaar bestaand bronitem, artefact of technisch gedrag.
- **OBSERVATION** — rechtstreeks gezien bestaand menselijk werkgedrag.
- **CUSTOMER STATEMENT** — door Kevin of een andere bevoegde gebruiker werkelijk uitgesproken.
- **BEHAVIOR** — daadwerkelijke handeling, niet alleen een mening.
- **HYPOTHESIS** — toetsbare aanname die nog niet bewezen is.
- **INFERENCE** — voorzichtige afleiding uit bewijs; blijft als afleiding herkenbaar.
- **VALIDATED INSIGHT** — herhaald en voldoende sterk bewijs dat vooraf bepaalde criteria haalt.

Een WBD-document, werkend scherm of test kan sterke technische evidence zijn zonder customer evidence te zijn.

## 1. Executive summary

WS-BASE.1 bereidt één kleine praktijkvalidatie voor. Zij valideert niet de volledige capabilitylijst uit WS-BASE.0 en bouwt niets nieuws.

De sterkste bestaande Sportpaleis-evidence betreft Bedrukking: er zijn uniforme Order- en Article-modellen, verenigingscontext, een productiewerkplek-richtingsproef, standaardbedrukking, afwijkingen en echte lokale productbeelden. De demo-orders en artikelrecords zijn expliciet fictief; er is geen vastgelegde guided validation met Kevin en geen herhaald echt gebruik.

Voor Workspace Basis is de evidence zwakker. De conceptovereenkomst beschrijft Kevin als praktijkbeoordelaar, rolgebonden toegang, klein beginnen en een Workspace-context. Dat is een WBD-opgestelde conceptuele/contractuele richting, geen ondertekend customer statement of gebruiksbewijs. De repository bevat geen canonieke waarneming dat Sportpaleis met papier, Excel, Illustrator of WhatsApp een Basis-probleem oplost, dat meerdere collega's Bedrukking uitvoeren, of dat documentversies en overdracht daadwerkelijk vastlopen.

De kleinste aanbevolen validatiekandidaat is daarom:

> **Relatiegeheugen + veilige overdracht:** één vereniging/relatie, één relevant document, één betekenisvolle historie/recente verandering, één eigenaar/volgende stap en een expliciet verschil tussen Kevin-view en collega-view.

Home is tijdens deze validatie alleen een samenvatting van deze onderliggende context, geen zelfstandig te verkopen dashboard. Projecten en Atlas blijven buiten de eerste demonstratie tenzij Kevin ze zelf als mentaal model of informatiebehoefte introduceert.

### Belangrijke outputvraag

**Kan de volgende validatie met de huidige Workspace worden uitgevoerd?**

**B — JA, met uitsluitend synthetic/demo content.**

De bestaande lokale Sportpaleis-dossierroute, WS-VIS.1-conceptbeelden en Bedrukking-richtingsproef zijn voldoende om context fit, verwachtingen, privacygrenzen en een eerste guided reaction te onderzoeken. Zij zijn niet voldoende voor echte permissionvalidatie, tweede-usergebruik of repeated real use. Toon rolverschillen daarom als expliciet gelabeld concept; geef geen collega echte toegang.

## 2. Scope and boundary

### Uitgevoerd

- bestaande canon, code, tests, Sportpaleis-documenten en visuals onderzocht;
- evidence per bron en capability geclassificeerd;
- evidence ladder en scorecard opgesteld;
- Minimum, Strong en Expanded Basis-hypothesen bepaald;
- Kevin- en tweede-userhypothese opgesteld;
- sessieprotocol, vragen, observatieformulier en post-session template voorbereid;
- TEST A/B-criteria vooraf vastgelegd;
- demo-readiness beoordeeld.

### Niet uitgevoerd

- application code, CSS, routes, database, identity of permissions;
- nieuwe feature, prototypecode, screenshot of redesign;
- production, deployment, provider, DNS of subscription;
- analytics, pricing of contractwijziging;
- echte Sportpaleis-data, credentials of gebruikers;
- contact met Kevin of een collega;
- VIS-IMP.1 of WS.2–WS.5.

### Preflight

| Onderdeel | Uitkomst |
|---|---|
| Complexiteit | 🟡 middel |
| Repositoryrisico | laag |
| Latere sessierisico | laag/middel door privacy, dubbele rol van Donovan en klantcontext |
| Indicatieve Codex-bandbreedte | €15–€35 |
| Werkelijke eurocredits | niet zichtbaar; niet verzonnen |
| Menselijke sessietijd | 20–30 minuten |
| Maandelijkse/providerkosten | geen |

### Canonieke input

- `PROJECT-WS-BASE0-WORKSPACE-BASIS-VALUE-SPORTPALEIS-FIT-REVIEW.md`;
- `PROJECT-WS1-ROUTE-APPLICATION-BOUNDARY-IMPLEMENTATION.md`;
- `PROJECT-WBD-WORKSPACE-CANONICAL-REVIEW.md`;
- `PROJECT-WS-VIS1-WORKSPACE-VISUAL-DIRECTION-CONCEPT.md`;
- `PROJECT-WS-VIS2-VISUAL-SYSTEM-RESPONSIVE-INTERACTION-SPECIFICATION.md`;
- `WBD-WORKSPACE-FOUNDATION-001B.md` en `WBD-WORKSPACE-BUSINESS-FOUNDATION-V1.md`;
- `sportpaleis/ORDER-FOUNDATION.md`, `sportpaleis/ARTICLE-FOUNDATION.md`, de V3-richtingsproef, actuele Sportpaleis-code/tests en de conceptovereenkomstbron.

## 3. Existing evidence inventory

| SOURCE | DATE | OBSERVATION / STATEMENT | WHO | WORK CONTEXT | RELATED BASIS CAPABILITY | EVIDENCE STRENGTH | LIMITATION |
|---|---|---|---|---|---|---|---|
| `WBD-WORKSPACE-FOUNDATION-001B.md` | 5 aug 2026 | Sportpaleis is eerste officiële ontwikkelpartner; praktijkcontext is Workspace + Bedrukking | WBD canon | partnerschap/productontwikkeling | Workspace identity, praktijkvalidatie | medium **EXISTING EVIDENCE** voor relatie | geen customer behavior of Basis-gebruik |
| Conceptovereenkomstbron | 1 aug 2026 | Kevin beoordeelt praktische waarde en organiseert waar nodig praktijktests | WBD-opgestelde concepttekst over partijen | governance | Kevin-view, validation authority | medium context evidence | concept, juridische controle/open afspraken; niet gelijk aan Kevin-statement |
| Conceptovereenkomstbron | 1 aug 2026 | beide partijen kunnen dezelfde gegevens vanuit eigen rol/bevoegdheid zien; toegang beperkt tot wie ze nodig heeft | WBD-opgestelde concepttekst | ontwikkelpartnerschap | roles/permissions | medium context evidence | gewenste richting, geen geïmplementeerde of gevalideerde permission |
| Conceptovereenkomstbron | 1 aug 2026 | ontwikkeling begint klein en groeit uit praktijkervaring | WBD-opgestelde concepttekst | productmethode | Minimum Basis | medium method evidence | geen capabilitybewijs |
| `ORDER-FOUNDATION.md` | datum onbekend | één ordermodel voor Winkel/Webshop; vereniging en vijf statussen | WBD model | Bedrukking | relaties, historie, work state | medium artefact evidence | demo-orders volledig fictief; geen UI/opslag/klantobservatie |
| `ARTICLE-FOUNDATION.md` | datum onbekend | artikelen dragen categorie, beeldreferentie, verenigingsreferentie en personalisatiecapaciteiten | WBD model | Bedrukking | relaties, documenten/assets | medium artefact evidence | records/referenties fictief; geen echt beheer of gebruik |
| `sportpaleis-proof.ts` + V3 visuals | datum niet canoniek vastgelegd | productiewerkplek met verenigingen, standaardbedrukking, artikelkeuze, afwijking en controle | WBD synthetic demo | Bedrukking | relatiecontext, attention/exception | sterk technisch/visueel artefact; ladderniveau 1 | reset na reload; niets opgeslagen/verwerkt; geen customer validation record |
| Sportpaleis proof-tests | actuele repository | 7 tests bewijzen simulatie, contactcontext, verenigingsprofiel, logo en lokale productbeelden | technische tests | Bedrukking-demo | demo-readiness | sterke technische evidence | tests meten geen begrip, nut of gedrag van Kevin |
| Order/Article-tests | actuele repository | 10 tests bewijzen schema, statussen, bronnen, associations en bewuste uitgestelde velden | technische tests | Bedrukking-model | modulegrens | sterke technische evidence | geen productadoptie |
| Sportpaleis dossierseed + WS.1-routes | 7 aug 2026 current state | direct bereikbaar organisatiedossier en document-/notitiefocusroutes | WBD lokale app | WBD intern | dossier, documenten, historie | medium demo-instrument | WBD-context, browserlokaal, geen customer tenant/permissions |
| `WBD-WORKSPACE-BUSINESS-FOUNDATION-V1.md` | 4–5 aug 2026 | F00248 is definitieve WBD-factuur aan Sportpaleis | WBD bedrijfsadministratie | WBD→Sportpaleis commercieel | admin/accountcontext | sterk voor zakelijke relatie | bewijst niet dat Sportpaleis eigen finance in Workspace nodig heeft |
| WS-VIS.1 concepten | 7 aug 2026 | synthetic Home en Sportpaleis-dossier tonen aandacht, document, historie en contactsamenvatting | WBD visual concept | toekomstige Workspace | sessie-instrument | medium concept evidence | gegenereerd beslismateriaal; geen klantreactie of functioneel gedrag |
| WS-VIS.2 specification | 7 aug 2026 | role-aware attention, dossiers, permission states en mobile patterns zijn gespecificeerd | WBD specification | toekomstige Workspace | interaction contract | sterk specificatiebewijs | niets ervan is Sportpaleis-productbewijs of permissionimplementatie |
| Repositorybrede bronzoekslag | 7 aug 2026 | geen canonieke Sportpaleis-waarneming gevonden voor papier, Excel, actuele Illustrator-/WhatsApp-workaround, documentversieconflict, meerdere Bedrukkingcollega's of persoonsafhankelijkheid | Codex repository inspection | evidence audit | alle Basis-hypothesen | sterk absence finding binnen repository | afwezig in repository betekent niet dat het in praktijk niet bestaat; vragen/observeren nodig |

### Niet promoveren tot bewijs

- De opdracht noemt voorbeelden zoals papier, Excel en Illustrator. Zonder canonieke Sportpaleis-bron blijven dit onderzoeksonderwerpen, geen feiten.
- De proof gebruikt verenigingen en productbeelden, maar is synthetic; dat bewijst context fit, niet dagelijks relatiebeheer.
- De conceptovereenkomst beschrijft rollen, maar is geen ondertekende gebruiksovereenkomst en geen opgenomen uitspraak van Kevin.
- Een werkende WBD-dossierfunctie bewijst technische mogelijkheid, niet dat Sportpaleis haar nodig heeft.

## 4. Evidence ladder

| Niveau | Naam | Geldig bewijs | Niet voldoende |
|---:|---|---|---|
| 0 | IDEA | theoretisch interessant | WBD heeft al een route/scherm |
| 1 | CONTEXT FIT | sluit aantoonbaar aan bij bekende context/artefacten | “lijkt handig” |
| 2 | EXPRESSED NEED | Kevin/medewerker benoemt werkelijk probleem of gewenste uitkomst | antwoord op sturende featurevraag |
| 3 | OBSERVED BEHAVIOR | bestaand werkgedrag/workaround toont frictie | herinnering zonder bron of concrete situatie |
| 4 | GUIDED VALIDATION | gebruiker handelt betekenisvol met concrete oplossing/scenario | compliment of visuele voorkeur |
| 5 | REPEATED REAL USE | herhaald echt gebruik en gemis bij afwezigheid | één demosessie |

### Huidig niveau per kandidaat

| Kandidaat | Niveau | Reden |
|---|---:|---|
| Home + rustige Attention | **1** | past bij orderstatus/afwijking en visual concept; geen customerbron |
| Organisaties/relaties | **1** | vereniging is expliciet Bedrukking-contextobject; generieke Basiswaarde onbewezen |
| Levend dossier + contactcontext | **1** | technisch beschikbaar en logisch bij vereniging; geen Sportpaleis-gebruik |
| Contextuele documenten | **1** | logo/productbeelden bestaan; zoek-/deel-/versieprobleem niet bewezen |
| Historie | **1** | orderstatus/timestamps en lokale timeline bieden context fit |
| Recent changes | **0** | alleen specification; geen Sportpaleis-probleem of gedrag |
| Eigenaarschap + volgende stap | **1** | rollen bestaan als governancecontext; geen operationele assignment-evidence |
| Users, roles, veilige toegang | **1** | concepttekst vereist role-bound toegang; geen customerstatement/behavior |
| Persoonlijke/rolgerichte context | **0** | concept/specification, geen concrete tweede-userbehoefte |
| Admin/configuratie/continuïteit | **1** | Workspace-/rolcontext in conceptovereenkomst; geen gebruik |
| Configureerbare Projecten | **0** | uitsluitend sterke WBD-fit; geen Sportpaleis-mentaal model |
| Bevestigde Atlas-context | **0** | methodisch passend, maar te abstract en zonder Sportpaleis-evidence |
| Bedrukking module | **1** | rijk synthetic artefact en domain fit; geen vastgelegde customerreactie/real use |

Artefactvolwassenheid verhoogt het evidence-ladderniveau niet zonder menselijk praktijkbewijs.

## 5. Candidate Basis core

WS-BASE.0 leverde elf kandidaten. WS-BASE.1 behandelt ze niet als pakket.

### In eerste validatie

- relaties/verenigingen;
- één contextueel document of asset;
- historie en één recente verandering;
- lichte eigenaar/volgende stap;
- veilige rolgrens Kevin versus collega;
- Home uitsluitend als afgeleide samenvatting.

### Niet in eerste validatie

- Projecten;
- Atlas als benoemde capability;
- volledige Workspace-admin;
- finance;
- communicatie/mail;
- search;
- brede personalisatie;
- featuretour van bestaande WBD-routes.

## 6. Minimum / Strong / Expanded Basis hypotheses

| Variant | Samenstelling | Waardehypothese | Risico |
|---|---|---|---|
| **MINIMUM** | relatie/vereniging + document/asset + historie + veilige toegang | context blijft vindbaar en deelbaar | mist duidelijke volgende handeling; kan fileshare+dossier voelen |
| **STRONG** | Minimum + eigenaar/volgende stap + recent change + rustige Home-samenvatting | maakt overdracht en hervatten concreet | ownership/attention nog onbewezen |
| **EXPANDED** | Strong + admin/config + configureerbare Projecten + confirmed Atlas-context | brede organisatiegeheugenlaag | feature accumulation; abstract; te vroeg voor eerste sessie |

## 7. Recommended validation core

**Primair advies: STRONG, maar als één scenario en niet als zeven-featuretour.**

Scenario:

> Eén synthetic vereniging heeft een herkenbaar logo-/productdocument. Er is één betekenisvolle recente wijziging. Kevin kan zien wat er veranderde, wie/waar de volgende stap ligt en welke collega alleen de relevante operationele context zou zien.

Deze kern test tegelijk:

- of relatiecontext buiten een losse order waarde heeft;
- of document + betekenis sterker is dan bestandopslag;
- of historie/recent change bijpraten vermindert;
- of lichte responsibility helpt;
- of permissions Kevin bereidwilliger maken om te delen;
- of Home een nuttige afgeleide start kan zijn.

Geen echte collega krijgt toegang. De colleague-view is een duidelijk gelabelde synthetic rolweergave of mondeling afgedekte variant.

## 8. Kevin-view hypothesis

| Element | WHY KEVIN? | EVIDENCE? | VALIDATION NEEDED? |
|---|---|---|---|
| één aandachtwaardige verandering | eigenaar/praktijkbeoordelaar moet mogelijk kunnen beslissen | niveau 1 via status/afwijkingscontext | welke situaties werkelijk zijn aandacht vragen |
| relevante vereniging/relatie | Bedrukking-model organiseert rond association | niveau 1 | waarde buiten orderflow en gebruikte term |
| document/asset in context | logo/productbeeld is herkenbare operationele asset | niveau 1 | huidige locatie, gebruiker, terugvinden, versie/context |
| korte historie | kan uitleg/besluitcontext bewaren | niveau 1 | kijkt Kevin werkelijk terug? |
| eigenaar/volgende stap | kan overdracht en wachten expliciet maken | niveau 1 inference | gebruikt Sportpaleis dit mentale model? |
| colleague visibility | kan veilig delen mogelijk maken | niveau 1 contractcontext | welke collega, waarom, wel/niet zichtbaar |
| Workspace account/admin | Kevin is eigenaar in concepttekst | niveau 1 | relevantie zonder commercieel gesprek; niet demonstreren tenzij spontaan |

Kevin krijgt in de validatie geen WBD-projecten, WBD-finance, infrastructuur of Atlas-tooling te zien als Basisargument.

## 9. Second-user hypothesis

**HYPOTHESIS:** een medewerker betrokken bij Bedrukking is de meest realistische tweede-userpersona omdat de repository een productiewerkplek toont. Er is geen canoniek bewijs dat een specifieke collega deze rol werkelijk heeft of wil gebruiken.

### Zou mogelijk nodig hebben

- relevante toegewezen situatie/ordercontext;
- vereniging, contact en relevante product-/logo-informatie;
- actuele toegestane bestanden;
- wat recent veranderde;
- eigen/te nemen volgende stap;
- operationele historie die overname mogelijk maakt.

### Hoeft nadrukkelijk niet te zien

- WBD-abonnement of Workspacefacturen;
- ontwikkelbijdrage/25%-regeling;
- user-/capabilityadmin;
- bedrijfsbrede of persoonlijke finance;
- WBD-ontwikkeling, infrastructuur of Atlas-review;
- andere organisaties/situaties buiten diens scope.

### Waardetest

Gebruiker 2 creëert alleen extra waarde wanneer hij/zij een situatie met minder mondelinge uitleg kan begrijpen of overnemen. Een tweede login zonder role-filtered context is geen positief resultaat.

## 10. Permission-value hypothesis

### NEED FOR PERMISSION

De conceptovereenkomst en tweede-userhypothese maken aannemelijk dat Kevin eerder context deelt wanneer hij kan bepalen welke capability en informatie een collega ziet. Dit is evidence level 1, geen gevalideerd customer statement.

Te toetsen:

- noemt Kevin spontaan informatie die verborgen moet blijven?
- koppelt hij een concrete collega aan een concrete informatiebehoefte?
- verandert veilige afbakening zijn bereidheid tot uitnodigen?
- is capability-level toegang voldoende, of bestaat ook organisatie-/objectscope?

### IMPLEMENTED PERMISSION

**Ontbreekt.** De huidige Workspace heeft geen auth, membership, role of server-side enforcement. Visueel verbergen is geen security. Tijdens validatie:

- geen echte collega uitnodigen;
- geen gevoelige echte data tonen;
- role views expliciet als synthetic concept labelen;
- niet suggereren dat de demo veilig gescheiden accounts heeft.

## 11. Documents hypothesis

**Huidig niveau: 1 — CONTEXT FIT.**

Echte/relevante productbeelden en het Sportpaleis-logo bestaan als assets. Niet bewezen zijn:

- waar operationele bestanden nu leven;
- wie dezelfde bestanden gebruikt;
- hoe men zoekt;
- of versies of onduidelijke context problemen veroorzaken;
- of centrale beschikbaarheid overdracht vermindert.

Validatieobject is geen “documentmanagement”. Gebruik één synthetic logo-/productdocument in een verenigingcontext en observeer:

1. welke betekenis Kevin eraan geeft;
2. waar hij zoiets nu verwacht;
3. wie het naast hem nodig heeft;
4. welke historie/afspraak erbij moet staan;
5. of hij buiten Bedrukking naar deze context zou terugkeren.

Succes betekent contextual organisational memory. Alleen “handig om bestanden te bewaren” blijft een zwak fileshare-signaal.

## 12. Relations / verenigingen

**Huidig niveau: 1 — CONTEXT FIT; sterkste Basis-kandidaat.**

`association` is verplicht in het Order-model; Article kan een association reference dragen; de proof toont meerdere verenigingen. Dit ondersteunt een bestaand domeinbegrip, niet automatisch een generiek CRM.

Te valideren:

- is de vereniging ook buiten een order een stabiele context?
- horen contact, logo, productinformatie, afspraken en historie bij elkaar?
- gebruiken Kevin/collega “vereniging”, “klant”, “team” of een ander begrip?
- is relatiecontext gedeeld of uitsluitend onderdeel van Bedrukking?

Als waarde alleen binnen de order-/productieflow bestaat, blijft Verenigingen modulecontext en wordt `Organisaties/relaties` niet op basis hiervan tot zelfstandige Basis gepromoveerd.

## 13. History and recent changes

### Historie

Vraag: “Wat is hier eerder gebeurd en waarom?”

Huidig niveau 1 door status/timestamps en lokale dossier-timeline. Geen bewijs dat Sportpaleis terugkijkt om werk over te nemen.

### Recent changes

Vraag: “Wat veranderde sinds mijn vorige relevante moment?”

Huidig niveau 0. Alleen de visuele specificatie bestaat.

In het synthetic scenario krijgt één document/afspraak een duidelijke wijziging. Observeer of Kevin uit zichzelf vraagt naar wie, wanneer, reden of gevolg. Toon geen activity feed, personeelscontrole of technische auditlog.

## 14. Ownership and next step

**Huidig niveau: 1 als context fit; VALIDATE FIRST.**

Gebruik maximaal deze simpele staten in woorden:

- bij Kevin;
- bij collega;
- wacht op klant/vereniging;
- wacht op leverancier;
- volgende stap;
- gereed.

Geen taakmanager, deadlinesysteem of bord ontwerpen. De validatie zoekt bewijs dat één label overdracht vermindert. Succes: Kevin corrigeert of gebruikt de owner/next-stepcontext om een concrete situatie uit te leggen. Falen: het label voelt administratief, dubbel of betekenisloos.

## 15. Home and Attention

Home is geen onafhankelijke databron. In de eerste validatie vat zij alleen het relation-memoryscenario samen.

### Mogelijke Kevin-situaties — uitsluitend hypothesen

1. actie/besluit wacht op hem;
2. een relevante vereniging-/documentcontext veranderde;
3. iets wacht op een externe partij;
4. een collega heeft een situatie overgenomen of afgerond;
5. Workspace-admin/accountcontext, alleen wanneer werkelijk relevant.

### Mogelijke collega-situaties — uitsluitend hypothesen

1. toegewezen controle of volgende stap;
2. wijziging in relevante vereniging-/productcontext;
3. document/asset nodig voor werk;
4. wachtstatus die verder werk bepaalt.

Toon in de sessie maximaal één primary en één recent-change. Geen KPI-wall, tellingen, badges of fictieve urgentie. Wanneer Kevin de onderliggende context niet waardevol vindt, kan Home haar niet redden.

## 16. Projects

**Status: DEFER / WBD-PROMINENT / evidence level 0.**

Projecten zijn sterk voor WBD en bestaan als statische route. Er is geen bewijs dat Sportpaleis hetzelfde mentale model gebruikt. Gebruik het woord niet in de eerste demonstratie. Registreer alleen wanneer Kevin spontaan werk groepeert als traject/project. Anders blijft de capability configureerbaar of verborgen.

## 17. Atlas context

**Status: DEFER / evidence level 0.**

Valideer Atlas niet als AI. Alleen als Kevin spontaan vraagt waarom iets bekend is of hoe document, afspraak en beslissing samenhangen, kan Donovan doorvragen naar provenance/organisatiegeheugen. Geen Atlas-card, chat of uitleg in de eerste sessie.

## 18. Validation session plan

**Duur:** 20–30 minuten, bij voorkeur gekoppeld aan een natuurlijk Bedrukking-/Sportpaleismoment, niet als formele workshop.

| Tijd | Onderdeel | Doel | Bewijsdiscipline |
|---:|---|---|---|
| 0–2 min | opening en grens | geen verkoop/goedkeuring gevraagd | noteer eerste reactie niet als productbewijs |
| 2–5 min | huidige Workspace-/dossiercontext zonder uitleg | mentale ingang observeren | DID vóór SAID |
| 5–12 min | synthetic vereniging + document + historie | relatiegeheugen testen | niet vertellen wat “handig” hoort te zijn |
| 12–17 min | één recent change + owner/next step | continuïteit/overdracht testen | laat Kevin betekenis corrigeren |
| 17–21 min | conceptueel Kevin-view versus colleague-view | permission-value testen | expliciet: geen echte accounts/rechten |
| 21–24 min | Bedrukking-proof pas nu tonen | Basis/modulegrens toetsen | voorkomt dat module Basisreactie stuurt |
| 24–28 min | maximaal zes open vragen waar nog nodig | ontbrekend bewijs aanvullen | geen feature voting |
| 28–30 min | samenvatten in Kevins woorden | interpretatiecheck | geen roadmap- of prijsbelofte |

## 19. Donovan opening

> “We zijn begonnen met Bedrukking. Onderweg zag ik dat sommige informatie en overdracht mogelijk breder zijn dan één orderflow. Ik wil je kort laten zien wat we daarvan denken te hebben geleerd en vooral kijken of dit aansluit op hoe jullie echt werken. Je hoeft nu niets te kopen of goed te keuren; als iets niet klopt of niet nuttig is, is dat juist belangrijke informatie.”

## 20. Demonstration sequence

1. Open de bestaande lokale Workspace in een schone synthetic/demo-state; benoem dat dit geen live Sportpaleis-omgeving is.
2. Toon zonder tour de Sportpaleis/verenigingcontext en laat Kevin zelf kijken; registreer eerste focus, woorden en verwachting.
3. Open één synthetic vereniging met één document/asset en één korte historie. Geef geen featurelabels.
4. Laat Kevin uitleggen wat hij denkt dat de context betekent en wat hij nu zou doen.
5. Toon één recente verandering en een lichte owner/next-stepregel; laat hem corrigeren wat niet natuurlijk voelt.
6. Leg twee conceptuele views naast elkaar: Kevin ziet context + beheergrens, collega alleen operationeel relevant. Zeg expliciet dat dit nog geen werkende permissions zijn.
7. Open pas daarna de bestaande Bedrukking-proof en vraag wat volgens hem algemene Workspacecontext is en wat specifiek Bedrukking blijft.
8. Gebruik alleen de nog relevante open vragen en sluit af met een teruglezing van SAID/DID, zonder productbelofte.

## 21. Maximum six open questions

1. “Zonder dat ik uitleg geef: waar zou je hier als eerste kijken en wat verwacht je daar te vinden?”
2. “Als je deze vereniging en situatie ziet, welke informatie heb je nodig voordat je verder kunt?”
3. “Waar vind je die informatie nu, en wat doe je wanneer je haar niet direct vindt?”
4. “Wie heeft deze context naast jou nodig, en wat hoort die persoon juist niet te zien?”
5. “Als je morgen terugkomt, welke verandering wil je hier kunnen begrijpen zonder iemand te vragen?”
6. “Welk onderdeel zou je ook openen op een moment dat Bedrukking zelf niet relevant is — of zou je dat niet doen?”

Geen vervolgvraag wordt gebruikt om instemming met een feature af te dwingen. Een korte verduidelijking op een concreet antwoord blijft toegestaan.

## 22. Observation form

### Session metadata

| Veld | Registratie |
|---|---|
| Datum/tijd | |
| Locatie/context | |
| Deelnemer(s) en rol | |
| Toestemming voor notities | ja / nee / beperking |
| Getoonde artefacten + versie | |
| Synthetic scenario-ID | |
| Observator | Donovan |

### Evidence log

| Tijd | Type: SAID / DID / INFERRED | Letterlijke woorden of concrete handeling | Context/scherm | Capability/hypothese | Ladderniveau kandidaat | Alternatieve verklaring | Privacygevoelig? |
|---|---|---|---|---|---:|---|---|
| | | | | | | | |

### Verplichte observatiepunten

| Punt | Waarneming |
|---|---|
| eerste spontane reactie | |
| eerste klik/focus en verwachting | |
| eigen woorden voor vereniging/relatie/dossier | |
| informatie gezocht | |
| informatie gemist | |
| genegeerd onderdeel | |
| bestaande workaround | |
| spontaan genoemde collega + waarom | |
| informatie die die collega niet mag zien | |
| reactie op document + context | |
| reactie op historie versus recent change | |
| reactie op owner/next step | |
| “handig”-reactie zonder gedrag | markeer WEAK SIGNAL |
| concrete intentie tot terugkeer/gebruik | |
| onverwachte behoefte of afwijzing | |

### Scheiding

- **SAID:** alleen wat werkelijk is gezegd, liefst kort en letterlijk.
- **DID:** zichtbare handeling/keuze/zoekroute.
- **INFERRED:** Donovan/Codex-interpretatie met alternatieve verklaring; nooit als statement opslaan.

## 23. TEST A evidence criteria

**Vraag:** zou Kevin Basis houden zonder Bedrukking?

| Status | Vooraf criterium |
|---|---|
| **FAIL** | geen non-Bedrukking-probleem gekoppeld; kern genegeerd/afgewezen; waarde uitsluitend modulegerelateerd |
| **WEAK SIGNAL** | compliment, “handig/mooi”, algemene bewaarbehoefte of antwoord op sturende vraag zonder concrete terugkeerintentie |
| **PROMISING** | Kevin koppelt de kern spontaan aan bestaand non-Bedrukking-werk, noemt concrete informatie/context, wil die bewaren/terugvinden of vraagt om gebruik buiten de module |
| **VALIDATED** | na veilige implementatie en aparte GO wordt de kern op minimaal twee afzonderlijke echte werkmomenten buiten Bedrukking gebruikt, keert Kevin zelfstandig terug en blijkt de capability gemist/benoemd wanneer zij ontbreekt |

Eén sessie kan maximaal **PROMISING** opleveren. TEST A blijft na alleen deze voorbereiding **PENDING**.

## 24. TEST B evidence criteria

**Vraag:** wil Kevin uit zichzelf gebruiker 2 toevoegen omdat samenwerken beter wordt?

| Status | Vooraf criterium |
|---|---|
| **FAIL** | geen concrete tweede gebruiker/overdracht; delen levert geen waarde of privacyrisico is onoplosbaar binnen eenvoudige scopes |
| **WEAK SIGNAL** | “medewerkers zouden dit misschien kunnen gebruiken” zonder persoon, taak, informatie of grens |
| **PROMISING** | Kevin noemt spontaan een concrete collega/rol, waarom toegang nodig is, wat wel/niet zichtbaar mag zijn en vraagt naar toegang/uitnodigen |
| **VALIDATED** | na echte server-side permissions en aparte GO gebruikt gebruiker 2 de kern op minimaal twee echte werksituaties; overdracht of dubbele vragen nemen aantoonbaar af en ongeoorloofde data blijft afgeschermd |

Een conceptueel colleague-view kan maximaal **PROMISING** opleveren. Geen echte invitation in WS-BASE.1.

## 25. Privacy and safety

- Gebruik uitsluitend synthetic/demo namen, documenten, bedragen en contactgegevens.
- Gebruik geen echte productieorder, klantpersoon, e-mailadres, financieel of contractdetail.
- Het officiële Sportpaleis-logo/productbeelden worden alleen gebruikt binnen de reeds bestaande lokale demo en niet als toestemming voor breder hergebruik beschouwd.
- Benoem expliciet dat de huidige Workspace geen login of role separation heeft.
- Geef geen collega toegang en deel geen lokale URL buiten de gecontroleerde sessie.
- Toon gevoelige ontwikkelpartner-/financecontext niet.
- Maak alleen notities met toestemming; leg bewaartermijn en locatie vóór de sessie vast.
- Markeer statements met actor en context; voorkom organisatiebrede conclusies uit één persoon.
- Donovan bewaakt zijn dubbele rol werknemer/WBD en maakt duidelijk vanuit welke rol de sessie plaatsvindt.
- Geen audio/video-opname zonder afzonderlijke expliciete toestemming.

## 26. Cheapest valid validation methods

| Hypothese | Goedkoopste geldige methode nu | Waarom voldoende/limiet | Latere sterkere stap |
|---|---|---|---|
| relatiecontext | bestaande dossierroute + synthetic vereniging | test taal/verwachting; geen real use | echt toegestane relatiecontext |
| contextueel document | één synthetic asset in dossier/scenario | test betekenis en vindverwachting | herhaald echt terugvinden |
| historie | synthetic 2–3 events | onderscheid context/ruis | echte overname met historie |
| recent changes | één before/after-situatie | test behoefte, niet bronbetrouwbaarheid | server-authorized change query |
| owner/next step | tekstlabel in scenario | test mentaal model zonder taskmanager | echt reassignment/overname |
| Home/Attention | bestaand VIS.1-beeld of eenvoudige synthetic summary | test prioriteit/verwachting | echte data-driven Home |
| permission-value | twee gelabelde conceptviews | test wel/niet-zien; geen securityclaim | WS.2 negative tests + echte pilot |
| tweede-userwaarde | scenario + open vraag | maximaal promising | veilig echt gebruik later |
| Projecten | niet tonen; alleen spontane taal registreren | voorkomt selling | aparte validatie indien genoemd |
| Atlas-context | defer; alleen doorvragen bij provenancebehoefte | voorkomt abstract AI-frame | confirmed-contextproef later |
| Bedrukkingmodule | bestaande proof ná Basis-scenario | bewaakt modulegrens | aparte modulevalidatie |

Geen prototypeaanpassing is nu noodzakelijk. Als de session zonder synthetic role comparison niet begrijpelijk blijkt, volgt pas daarna een aparte prototype-preflight; niet anticiperend bouwen.

## 27. Evidence scorecard

| CAPABILITY | CURRENT LEVEL 0–5 | SPORTPALEIS FIT | MULTI-USER VALUE | VALIDATION METHOD | SUCCESS SIGNAL | FAILURE SIGNAL | NEXT DECISION |
|---|---:|---|---|---|---|---|---|
| Home/Attention | 1 | plausible | high indien echt/contextueel | one-situation summary | Kevin identificeert echte relevante situatie/actie | ziet dashboarddecoratie of moduleduplicaat | keep dependent / defer |
| Organisaties/relaties | 1 | strongest context fit | high | synthetic verenigingdossier | gebruikt relatie als bredere context | alleen orderfilter binnen Bedrukking | Basis candidate / module-only |
| Dossier/contactcontext | 1 | plausible | high | open existing dossier | verwacht gedeelde context/continuity | voelt CRM/administratie | keep / simplify / defer |
| Contextuele documenten | 1 | plausible | high | one asset with context | benoemt hergebruik, context of shared retrieval | alleen bestandopslag, geen probleem | Basis candidate / defer |
| Historie | 1 | unknown/plausible | high | 2–3 meaningful events | gebruikt historie om situatie te begrijpen | negeert of vindt ruis | candidate / simplify |
| Recent changes | 0 | unknown | high | one before/after | wil zonder bijpraten weten wat veranderde | geen relevante verandering te noemen | hypothesis / defer |
| Ownership/next step | 1 | plausible | high | simple state label | corrigeert/gebruikt owner om vervolg te bepalen | voelt task admin | candidate / defer |
| Users/roles/safe access | 1 | plausible | prerequisite | Kevin/colleague concepts | concrete role, scope en invitation intent | alleen algemene privacywens | WS.2 candidate / pending |
| Personal/role context | 0 | unknown | high | compare two views | verschillende starts zijn betekenisvol | dezelfde info voor iedereen volstaat | hypothesis / defer |
| Admin/config/continuity | 1 | plausible owner fit | medium | open discussion only | concrete adminbehoefte ontstaat spontaan | alleen WBD/commercial concern | configurable / defer |
| Projects | 0 | unknown | unknown | do not show | Kevin gebruikt spontaan project/trajecttaal | geen mentaal model | validate later / hide |
| Confirmed Atlas-context | 0 | unknown | possible | defer/provenance probe | vraagt waarom/bron/verband | abstract of irrelevant | validate later / hide |
| Bedrukking | 1 | strong specialised context fit | likely | existing proof last | concrete workflowreaction | artifact past niet | module validate / revise |

Deze tabel wordt na de sessie gekopieerd met nieuwe kolommen `NEW LEVEL`, `EVIDENCE IDS` en `HUMAN DECISION`. Geen score stijgt door Codex-inference alleen.

## 28. Decision rules

- **IF strong evidence + generic value →** candidate `WORKSPACE BASIS`.
- **IF strong Sportpaleis evidence + specialised process →** `SPORTPALEIS CAPABILITY / MODULE`.
- **IF plausible but unproven →** `KEEP AS HYPOTHESIS`.
- **IF ignored, poor fit or no meaningful problem →** `HIDE / DEFER / DO NOT BUILD`.
- **IF WBD-only →** `WBD INTERNAL / CONFIGURABLE`, niet customer default.
- **IF only SAID after prompting →** nooit hoger dan weak signal / level 2 uitsluitend als de behoefte werkelijk en concreet is.
- **IF DID contradicts SAID →** gedrag krijgt meer gewicht; afwijking blijft expliciet.
- **IF one session is positive →** maximaal PROMISING; geen level 5 en geen productacceptatie.
- **IF privacy/permission niet veilig te demonstreren is →** concept only; geen echte access.
- **IF Home geen betrouwbare source heeft →** afhankelijk houden van onderliggende capabilities.

Geen roadmappromotie zonder menselijke review van evidence records.

## 29. Post-session evidence template

### A. Session result

| Veld | Resultaat |
|---|---|
| Datum/deelnemer/context | |
| Consent/notitiegrens | |
| Artefactversies | |
| Onverwachte gebeurtenis | |
| Privacy-incident of zorg | none / omschrijving |

### B. Evidence records

| ID | Type | Actor | Exact SAID/DID | Context | Capability | Level vóór | Level-kandidaat na | Counterevidence | Bron/notitie |
|---|---|---|---|---|---|---:|---:|---|---|
| SP-BASIS-001 | | | | | | | | | |

### C. Scorecard delta

| Capability | Old level | New proposed level | Evidence IDs | Reason | Human confirmed? |
|---|---:|---:|---|---|---|
| | | | | | no/pending/yes |

### D. TEST A / TEST B

| Test | FAIL / WEAK / PROMISING / VALIDATED | Evidence IDs | Waarom | Wat ontbreekt |
|---|---|---|---|---|
| A | | | | |
| B | | | | |

### E. Product decision

- Candidate Workspace Basis:
- Sportpaleis module:
- Keep as hypothesis:
- Hide/defer/do not build:
- WBD-internal:
- Exact één volgende vraag/actie:
- Human decision owner/date:

### F. Evidence hygiene

- [ ] SAID, DID en INFERRED gescheiden.
- [ ] Geen persoonsgegevens of gevoelige inhoud onnodig vastgelegd.
- [ ] Alternatieve verklaringen en counterevidence opgenomen.
- [ ] Geen score verhoogd op compliment/featurevote.
- [ ] Kevin-interpretatie waar nodig teruggelezen en gecorrigeerd.
- [ ] Product/pricing/roadmap niet beloofd.

## 30. Open human decisions

1. Geeft Donovan afzonderlijk GO om de 20–30 minuten sessie zelf te organiseren en uit te voeren?
2. Mag de sessie schriftelijk worden genotuleerd, waar en hoe lang worden de notities bewaard?
3. Is Kevin de enige deelnemer in sessie 1, of mag later een werkelijk relevante collega apart deelnemen?
4. Welke synthetic vereniging-, document- en wijzigingscontext voelt realistisch zonder echte klant-/persoonsdata te gebruiken?
5. Mag het bestaande Sportpaleis-logo/productbeeld in de gecontroleerde lokale demo worden getoond, zonder breder gebruik te veronderstellen?
6. Is `Relatiegeheugen + veilige overdracht` de goedgekeurde validatiekern, met Projecten en Atlas expliciet deferred?
7. Welke informatiecategorieën beschouwt Donovan vooraf als gevoelig en dus uitgesloten?
8. Wie beoordeelt na de sessie de evidence-scorewijzigingen en TEST A/B-status voordat iets canoniek promoveert?

## 31. GO / NO-GO

| Status | Besluit | Reden |
|---|---|---|
| **WS-BASE.1 PREPARATION** | **GO** | evidence opnieuw geïnventariseerd, niveaus begrensd, kern/scorecard/protocol/criteria gereed |
| **PRACTICE EVIDENCE** | **PENDING** | geen Kevin-/collegasessie of nieuw customer behavior uitgevoerd |
| **TEST A** | **PENDING / NIET BEWEZEN** | geen non-Bedrukking-gebruik of repeated real use |
| **TEST B** | **PENDING / NIET BEWEZEN** | geen concrete invitation, tweede user of overdrachtsbewijs |
| **WORKSPACE BASIS PRODUCT ACCEPTANCE** | **NO-GO / PENDING EVIDENCE** | beide harde tests missen geloofwaardig praktijkbewijs |
| **CURRENT WORKSPACE VALIDATION READINESS** | **B — GO met synthetic/demo content** | context/guided reaction kan; echte security/multi-user/repeated use kan niet |
| **PROTOTYPE IMPLEMENTATION** | **NO-GO / niet nodig voor eerste sessie** | huidige assets volstaan; eerst menselijk bewijs |
| **WS.2–WS.5 / VIS-IMP.1** | **NO-GO** | geen toestemming vanuit deze fase |
| **PRODUCTION / PROVIDERS / PRICING** | **NO-GO** | hard buiten scope |

## 32. Exact next action

**Exact één aanbevolen vervolgstap:** Donovan reviewt dit protocol en geeft, wanneer privacy-, rol- en synthetic-contentgrenzen akkoord zijn, menselijke GO voor **één 20–30 minuten practicesessie met Kevin** volgens §§18–24. Donovan voert de sessie uit; Codex neemt geen contact op. Na de sessie wordt uitsluitend het template uit §29 ingevuld en menselijk beoordeeld voordat een capability, TEST A/B-status of roadmapstap verandert.

Geen prototype- of productimplementatie gaat hieraan vooraf.

## 33. Pricing and transparency boundary

- Geen prijswijziging, nieuwe Basis-prijs of voorstel aan Kevin.
- Productvalidatie gaat vóór klant-2-pricing.
- Sportpaleis blijft Founding Practice Partner/pilotcontext.
- De bestaande pilotcontext is geen marktprijsbewijs.
- Een latere uitleg aan Kevin onderscheidt oorspronkelijke Bedrukking, generieke Basislessen en gespecialiseerde toekomstige uitbreidingen.
- Geen productie-infrastructuurkosten in deze sessie; dat hoort bij een aparte pre-live commerciële review.

## 34. Uitvoeringsbevestiging

- Toegevoegd: `docs/atlas/PROJECT-WS-BASE1-SPORTPALEIS-BASIS-EVIDENCE-VALIDATION.md`.
- Geen application code, CSS, route, database, identity of permission gewijzigd.
- Geen package, provider, DNS, productie of deployment gewijzigd.
- Geen echte Sportpaleis-data/gebruiker toegevoegd of gemigreerd.
- Geen analytics, pricing, contract of abonnement gewijzigd.
- Kevin of een collega niet gecontacteerd.
- Geen onbewezen hypothese als validated insight opgeslagen.
- Werkelijke Codex-eurocredits zijn niet zichtbaar.

**STOP. Geen volgende fase of implementatie gestart.**
