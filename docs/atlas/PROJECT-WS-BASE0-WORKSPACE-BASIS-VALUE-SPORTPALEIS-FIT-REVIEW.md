# WS-BASE.0 — Workspace Basis Value & Sportpaleis Fit Review

**Project:** WBD Workspace Evolution

**Datum:** 7 augustus 2026

**Status:** assessment afgerond; **NO-GO voor Workspace Basis-productacceptatie**

**Implementatie:** niet uitgevoerd

**Productie, providers en klantcontact:** niet uitgevoerd

## Bewijslabels

- **VERIFIED IMPLEMENTED** — actuele code en/of een gerichte test bewijst de capability binnen haar vermelde lokale grens.
- **PLANNED** — canoniek voorzien, maar niet als werkende capability bewezen.
- **HYPOTHESIS** — productwaarde is aannemelijk maar nog niet in de praktijk bewezen.
- **SPORTPALEIS EVIDENCE** — bestaande Sportpaleis-bron ondersteunt de uitspraak.
- **WBD-ONLY** — waardevol voor de interne WBD Workspace, niet automatisch voor een klantworkspace.
- **GENERIC VALUE** — kan aantoonbaar meerdere organisaties dienen zonder klantfork.
- **CUSTOMER-SPECIFIC** — proces, data of configuratie hoort bij één klant of module.

Fitniveaus voor Sportpaleis zijn uitsluitend: **STRONG FIT**, **PLAUSIBLE FIT**, **UNKNOWN**, **NO EVIDENCE** en **POOR FIT**.

## 1. Executive summary

Workspace Basis moet geen lege modulecontainer worden. Het verdedigbare productcontract is een rustige gedeelde werklaag die drie waarden combineert:

1. **Overzicht** — wat speelt, wat veranderde en waar verder te gaan;
2. **Geheugen** — context, documenten, contacten, beslissingen en historie blijven bij de organisatie;
3. **Aandacht** — alleen relevante actie, wachten, aankomend werk en bevestigde veranderingen worden rustig zichtbaar.

De repository bevat hiervoor serieuze bouwstenen: een stabiele route-/runtimeboundary, een sterke shell, lokale organisatiedossiers, documenten, contactnotities, dossierhistorie, kennisreview, factuurworkflow en een aparte Sportpaleis Bedrukking-richtingsproef. De huidige Workspace is echter nog niet de voorgestelde Basis. Home en projecten zijn statisch; attention, gebruikers, rollen, rechten, eigenaarschap, persoonlijke context, centrale data en multi-usergebruik ontbreken.

Bedrukking heeft de sterkste Sportpaleis-fit. De orderstatussen, verenigingscontext, artikel-/personalisatieconcepten en productiewerkplek zijn concreet gemodelleerd en getest, hoewel de data fictief is. Voor een zelfstandige Basis is het bewijs zwakker. De conceptovereenkomst noemt Workspace Basis, rolgebonden toegang en Kevin als praktijkbeoordelaar, maar dat is intentie en contractcontext — geen gebruiksbewijs.

Daarom is het besluit bewust streng:

- **WS-BASE.0 assessment:** inhoudelijk compleet en bruikbaar;
- **Workspace Basis als vastgesteld product:** **NO-GO**;
- **TEST A:** geen geloofwaardig bewezen ja;
- **TEST B:** geen geloofwaardig bewezen ja;
- **volgende stap:** praktijkbewijs verzamelen vóór verdere functionele of visuele implementatie.

Het probleem is niet dat Basis op papier geen waarde kan hebben. Het probleem is dat een aannemelijke producttheorie nog niet gelijk is aan bewezen Sportpaleis-retentie of vrijwillige multi-useradoptie.

## 2. Preflight en uitgevoerde grens

| Onderdeel | Uitkomst |
|---|---|
| Complexiteit | middel tot hoog; brede productreview over canon, code, tests en praktijkcontext |
| Risico | laag; read-only inspectie en één nieuw Markdown-document |
| Geschatte Codex-bandbreedte | €25–€55 |
| Werkelijke eurocredits | niet zichtbaar; niet gereconstrueerd of verzonnen |
| Applicatiecode/CSS/routes/data | niet gewijzigd |
| Packages/infrastructuur/productie | niet gewijzigd |
| Sportpaleis-contact | niet uitgevoerd |

Gerichte actuele verificatie: **39/39 tests PASS** voor routing, runtime, Workspace Foundation, WBD Foundation, facturen, Sportpaleis Order, Article en de lokale Bedrukking-richtingsproef. Het WS.1-eindbewijs blijft **252/252 tests PASS**. Tests bewijzen technische contracten, niet dagelijks klantgebruik.

## 3. Canonieke en feitelijke input

Minimaal gebruikt:

- `PROJECT-WBD-WORKSPACE-CANONICAL-REVIEW.md`;
- `PROJECT-WS1-ROUTE-APPLICATION-BOUNDARY-IMPLEMENTATION.md`;
- `PROJECT-WS-VIS1-WORKSPACE-VISUAL-DIRECTION-CONCEPT.md`;
- `PROJECT-WS-VIS2-VISUAL-SYSTEM-RESPONSIVE-INTERACTION-SPECIFICATION.md`;
- `PROJECT-002C-WORKSPACE-ARCHITECTURE-INPUT.md`;
- `PROJECT-002C-WSP2C-PRODUCTION-PROVIDER-DATA-RESPONSIBILITY-DECISION.md`;
- `WBD-WORKSPACE-FOUNDATION-001B.md`;
- `WBD-DOSSIER-FOUNDATION-V1.md` en `WBD-DOSSIER-BACKUP-RESTORE-V1.md`;
- `sportpaleis/ORDER-FOUNDATION.md` en `sportpaleis/ARTICLE-FOUNDATION.md`;
- de conceptovereenkomstbron onder `output/pdf/ontwikkelpartnerschap-sportpaleis/`;
- actuele Workspace-, dossier-, kennis-, factuur-, route-, runtime- en Sportpaleis-code en tests.

Belangrijke bewijsgrens: de conceptovereenkomst is een bespreekbasis met open juridische en financiële controles. Zij bewijst richting en rollen, geen ondertekende commerciële afspraak of productadoptie.

## 4. Product hypotheses

| Hypothese | Status | Wat zou haar bewijzen of weerleggen? |
|---|---|---|
| H1. Overzicht + Geheugen + Aandacht vormen samen zelfstandige Basis-waarde. | **HYPOTHESIS** | Sportpaleis gebruikt minstens twee assen terugkerend zonder Bedrukking als ingang. |
| H2. Organisatiegebonden documenten zijn waardevoller dan een losse fileshare. | **HYPOTHESIS met GENERIC VALUE** | Een gebruiker vindt en begrijpt een relevant bestand sneller via dossiercontext. |
| H3. Menselijke historie vermindert mondelinge overdracht. | **HYPOTHESIS** | Collega 2 kan een situatie overnemen zonder aanvullende uitleg van eigenaar 1. |
| H4. Home moet per rol verschillen. | **HYPOTHESIS, architectonisch sterk** | Kevin, productie en administratie kiezen aantoonbaar verschillende relevante starts. |
| H5. Eigenaarschap en volgende stap zijn noodzakelijk voor multi-userwaarde. | **HYPOTHESIS** | Onbeheerde of dubbel uitgevoerde situaties nemen meetbaar af. |
| H6. Hoge personalisatie kan vooral configuratie zijn. | **HYPOTHESIS met GENERIC VALUE** | Klant 2 past via termen, rollen en capabilities zonder nieuwe enginecode. |
| H7. Bedrukking is een betaalde capability, niet Workspace Basis. | **STERK ONDERBOUWD** | Eigen proceslogica, gespecialiseerde data, statussen en productieworkflow bestaan. |
| H8. Projecten zijn niet voor iedere klant een primaire Basis-ingang. | **HYPOTHESIS** | Sportpaleis gebruikt een projectbegrip vanzelf of kiest een ander domeinbegrip. |
| H9. Atlas kan Basis versterken als rustige bevestigde context, niet als AI-dashboard. | **HYPOTHESIS** | Bevestigde context helpt een echte beslissing en wordt als betrouwbaar begrepen. |
| H10. Kevin behoudt Basis en nodigt vrijwillig een collega uit zonder Bedrukking. | **NIET BEWEZEN** | Alleen praktijkgedrag kan TEST A en TEST B positief maken. |

## 5. Current implemented capability inventory

### VERIFIED IMPLEMENTED binnen lokale grens

- expliciete `/workspace/wbd` route- en application boundary;
- canonical routes, aliases, direct links, browserhistorie en expliciete not-found;
- providerneutraal stateless runtimecontract met health/readiness;
- gedeelde Workspace-shell en productwereldswitcher;
- statische WBD Home, projecten, ontwikkelmonitor, historie, partner- en infrastructuurweergaven;
- browserlokale organisaties, dossierdocumenten, contactnotities en tijdlijn;
- browserlokale kennisvoorstellen, menselijke approve/reject en Knowledge Repository;
- lokale dossierexport/import/restore;
- lokale WBD-factuurconcept-, PDF-, definitief- en betaalstatusworkflow;
- lokale ontwikkelfeedback-API met lege dataset;
- Sportpaleis Order- en Article-typecontracten met fictieve demo-data;
- lokale Bedrukking-richtingsproef met verenigingen, producten, standaardbedrukking en afwijkingen.

### Niet als klantproduct bewezen

- geen login, gebruiker, membership, rol of permission;
- geen server-side organisation isolation;
- geen centrale database of private documentopslag;
- geen role-aware of persoonlijke Home;
- geen dynamische attentionbron;
- geen eigenaarschap/responsibilitymodel;
- geen gedeelde recent-changesquery;
- geen echte customer Workspace-instance of tenantselector;
- geen generieke klantconfiguratie;
- geen communicatie/mailcapability;
- geen gebruiksbewijs van Basis door Sportpaleis of een tweede gebruiker.

## 6. Planned capability inventory

De canonieke fasering voorziet:

- **WS.2:** organisation, workspace instance, identity, membership, rollen, rechten en isolatie;
- **WS.3:** duurzame centrale data, private documenten, audit, migratie en recoverycontract;
- **WS.4:** mobile daily shell, navigatie, leesbaarheid en intentionele focusroutes;
- **WS.5:** role-/source-aware Home en attention;
- later: projecten/history/economics, cost evidence, Atlas-context, customer Workspace-configuratie, communicatie en commerciële capabilities.

Gepland betekent hier niet automatisch Basis. De productrol wordt in de hoofdmatrix bepaald.

## 7. Main capability matrix

| CAPABILITY | IMPLEMENTED? | STATIC / LOCAL / DYNAMIC? | WBD VALUE | SPORTPALEIS VALUE | EVIDENCE | GENERIC CUSTOMER VALUE | MULTI-USER VALUE | SECURITY / PERMISSION NEED | PRODUCT ROLE | ACTION |
|---|---|---|---|---|---|---|---|---|---|---|
| Shell + routing | **VERIFIED IMPLEMENTED** | dynamic routecontract, lokale/Node-runtime | hoog | ondersteunend | WS.1 + routetests | hoog | gedeelde oriëntatie | auth vóór inhoud; route is geen recht | WORKSPACE BASIS | KEEP |
| Workspace identity/selector | productwereldswitcher bestaat; tenantselector ontbreekt | static/local | middel | **PLAUSIBLE FIT** | `workspace-config.ts`; VIS.2 | hoog | contextwissel zonder datalek | membership en context reset | WORKSPACE BASIS | BUILD |
| Home / Overzicht | renderer bestaat | static curated | hoog | **PLAUSIBLE FIT** | `wbd-foundation-data.ts`; VIS.1 | hoog | gedeelde start, rolverschil | server-authorized query | WORKSPACE BASIS | POLISH |
| Attention | visuele labels/static copy; geen engine | static/PLANNED | hoog | **PLAUSIBLE FIT** | Canonical Review §8; VIS.2 §12 | hoog | voorkomt dubbel werk en gemiste actie | bron, rol, eigenaar, verborgen tellingen | WORKSPACE BASIS | BUILD |
| Organisaties/relaties | vier lokale seeds + routes | local IndexedDB | hoog | **STRONG FIT voor verenigingen/relaties**, niet voor tenantmodel | dossierstore; Order `association` | hoog | gedeelde relatiecontext | organisation scope + isolation | WORKSPACE BASIS | BUILD |
| Levend organisatiedossier | lokale dossierweergave | local IndexedDB | hoog | **PLAUSIBLE FIT** | dossiercode; Sportpaleis als seed/concept | hoog | één gedeeld contextpunt | object-/organisatie-autorisatie | WORKSPACE BASIS | POLISH |
| Contacten/contactcontext | contactnotities, geen contactregister | local IndexedDB | hoog | **PLAUSIBLE FIT** | contactnotities; proof heeft contactcontext | hoog | minder mondelinge herhaling | privacy, read/write/delete | BASIS — CONFIGURABLE | SIMPLIFY |
| Contextuele documenten | upload/metadata lokaal | local IndexedDB/Blob | hoog | **PLAUSIBLE FIT**; logo/productbeelden relevant | dossiercode; proof-assets | hoog | niet op één computer | private objects, uploadpolicy, zichtbaarheid | WORKSPACE BASIS | BUILD |
| Tijdlijn/historie | dossier-events + statische ontwikkelhistorie | local + static | hoog | **UNKNOWN** | dossierstore; Foundation-history | hoog | overdracht en traceerbaarheid | actor, visibility, non-surveillance | WORKSPACE BASIS | BUILD |
| Recent changes | niet als gedeelde query | PLANNED | hoog | **NO EVIDENCE** | VIS.2 attentioncategorie | hoog | collega ziet relevante wijziging | permission-filter vóór telling | WORKSPACE BASIS | BUILD |
| Eigenaarschap/volgende stap | niet geïmplementeerd | HYPOTHESIS | hoog | **PLAUSIBLE FIT** | overeenkomst beschrijft rollen; geen gebruik | hoog | kern tegen dubbel/verlaten werk | assign/reassign/audit | WORKSPACE BASIS | VALIDATE |
| Gebruikers/memberships | niet geïmplementeerd | PLANNED WS.2 | essentieel | **PLAUSIBLE FIT** | overeenkomst rolgebonden toegang | hoog | noodzakelijke voorwaarde | invite/revoke/session/MFA | WORKSPACE BASIS | BUILD |
| Rollen/rechten | niet geïmplementeerd | PLANNED WS.2 | essentieel | **PLAUSIBLE FIT** | Kevin/medewerker/adminconcept; geen praktijkbewijs | hoog | veilig delen zonder alles te zien | deny-by-default server-side | WORKSPACE BASIS | BUILD |
| Persoonlijke/rolgerichte Home | niet geïmplementeerd | PLANNED WS.5 | hoog | **PLAUSIBLE FIT** | VIS.2; rolscheiding concept | hoog | iedere rol ziet eigen vervolg | permission- en source-aware | WORKSPACE BASIS | VALIDATE |
| Zoeken/terugvinden | niet geïmplementeerd | PLANNED bij volume | middel | **NO EVIDENCE** | VIS.2 noemt 50-documentenscenario | middel/hoog bij volume | gedeelde vindbaarheid | alleen toegestane index/resultaten | VALIDATE FIRST | DEFER |
| Projecten | statische WBD-cards | static | hoog WBD | **UNKNOWN** | Canonical Review §21; geen Sportpaleis-gebruik | wisselend | context en overdracht bij projectwerk | capability + project scope | BASIS — CONFIGURABLE | VALIDATE |
| Workspace admin/commerciële accountcontext | niet generiek | PLANNED | middel | **PLAUSIBLE FIT voor Kevin/admin** | concept €75 en rolcontext, niet ondertekend | hoog | beheer gebruikers/capabilities | admin-only, contentrechten apart | WORKSPACE BASIS | BUILD |
| Klantbusiness-finance | alleen WBD-weergaven | static/local WBD | hoog WBD | **UNKNOWN** | geen Sportpaleis-boekhoudbewijs | wisselend | beperkt | zeer gevoelig; aparte scope | PAID CAPABILITY / MODULE | DEFER |
| WBD facturen | lokaal werkende workflow | local/repository/Python | hoog | **POOR FIT als klant-Basis** | factuurtests; F00248 is WBD→Sportpaleis | laag als generieke Basis | admin/finance-team | finance permissions/audit | WBD-INTERNAL | KEEP |
| Bevestigde Atlas-context | lokale knowledge/reviewbouwstenen | local, deels static | hoog | **NO EVIDENCE** | Knowledge Repository + provenancecanon | mogelijk hoog | gedeelde herleidbare context | provenance, Candidate/Confirmed, scope | BASIS — CONFIGURABLE | VALIDATE |
| Kennisvoorstellen | lokaal werkend voor WBD | local IndexedDB | hoog WBD | **NO EVIDENCE** | knowledge store/tests | onbekend | menselijke correctie | reviewerrol en provenance | WBD-INTERNAL | HIDE BY DEFAULT |
| Infrastructuurcontext | statische WBD-index | static | middel WBD | **POOR FIT** | 002C is autoritatief | laag | geen dagelijkse klantwaarde | admin/ops only | WBD-INTERNAL | HIDE BY DEFAULT |
| Ontwikkeling/monitor/historie/feedback | statisch + lokale feedback-API | static/local | hoog WBD | **POOR FIT als Basis** | Foundation; lege feedbackdata | laag | ontwikkelpartnercontext beperkt | partner-/WBD-scope | WBD-INTERNAL | HIDE BY DEFAULT |
| Bedrukking: orders/artikelen/productie | modellen + lokale richtingsproef; geen echte app/data | local demo | indirect | **STRONG FIT** | Order/Article Foundation; proof; 17 tests | alleen relevante sector/subset | productie-overdracht | capability-, order- en datascopes | PAID CAPABILITY / MODULE | VALIDATE |
| Communicatie/mail | niet geïmplementeerd | PLANNED | mogelijk | **NO EVIDENCE** | alleen contactnotitietype e-mail | wisselend | kan fragmentatie verminderen | mailbox, sender, privacy, delivery | VALIDATE FIRST | DEFER |
| Export/back-up/recovery | lokale dossierexport/restore | local | hoog als proef | **UNKNOWN** | backup/restorecode | hoog als datarecht/continuïteit | overdraagbaarheid | admin/export, encryption, audit | WORKSPACE BASIS | BUILD |
| Configuratie/terminologie | niet geïmplementeerd | PLANNED | middel | **PLAUSIBLE FIT** | customer-boundarycanon | hoog | relevante interface per rol | admin-only; veilige defaults | BASIS — CONFIGURABLE | BUILD |
| Subscription/entitlements | niet geïmplementeerd | PLANNED later | commercieel | **NO EVIDENCE** | conceptcontract, geen applicatiemodel | hoog voor schaal | bepaalt capabilities, niet permissions | billing ≠ authorization | DO NOT BUILD / DEFER | DEFER |

## 8. Workspace Basis definition — productcontract

### Primaire waarde

Workspace Basis bewaart gedeelde, toegestane werkcontext bij de organisatie en helpt iedere gebruiker rustig zien wat voor hem of haar relevant is. De waarde is minder zoeken, minder mondelinge overdracht, minder afhankelijkheid van één persoon en een veiliger vervolg van werk.

### Voorgestelde standaardnavigatie

1. **Home** — rolgerichte aandacht, recent relevant en hervatten;
2. **Organisaties** — relaties en levende dossiers;
3. **Meer** — documentenoverzicht indien nodig, persoonlijke context en toegestane beheerfuncties.

`Projecten` wordt alleen een primaire ingang wanneer het klantbegrip en gebruik dat rechtvaardigen. Documenten, contacten en historie starten standaard vanuit hun organisatiecontext; geen losse fileshare- of CRM-hoofdnavigatie.

### Maximaal tien kerncapabilities

| # | Kerncapability | Standaard/configureerbaar | Huidige realiteit |
|---:|---|---|---|
| 1 | Home + rustige Attention | standaard | Home static; attention niet dynamisch |
| 2 | Organisaties/relaties | standaard | lokaal aanwezig |
| 3 | Levend dossier + contactcontext | standaard | lokaal gedeeltelijk aanwezig |
| 4 | Contextuele documenten | standaard | lokaal aanwezig, niet duurzaam/gedeeld |
| 5 | Gedeelde historie + recent changes | standaard | dossierhistorie lokaal; recent changes ontbreekt |
| 6 | Eigenaarschap + volgende stap | standaard | ontbreekt; eerst valideren |
| 7 | Gebruikers, rollen en veilige toegang | standaard | ontbreekt |
| 8 | Persoonlijke/rolgerichte context | standaard | ontbreekt |
| 9 | Workspace admin, configuratie en continuïteit | standaard, grotendeels admin-only | ontbreekt; lokale exportproef bestaat |
| 10 | Projecten en bevestigde Atlas-context | configureerbaar | WBD static/lokaal; klantfit onbewezen |

### Data/context die iedere Workspace kan dragen

- workspace instance en organisatie-eigenaarschap;
- gebruikers, memberships en role/capability access;
- organisaties/relaties en contactcontext;
- documenten met bron, auteur, datum, zichtbaarheid en relaties;
- menselijke notities, beslissingen en betekenisvolle events;
- eigenaar, status, volgende stap en relevante tijd;
- role-authorized attention en recent changes;
- configuratie, audit, export- en recoverymetadata.

### Gebruikers- en adminmodel

- één Workspace kan meerdere gebruikers dragen;
- toegang komt uitsluitend uit membership en server-side rechten;
- Workspace Admin beheert users, rollen, zichtbare capabilities en commerciële Workspace-context;
- Standard User ziet en bewerkt alleen toegewezen capability/data;
- adminrechten geven niet automatisch infrastructuurtoegang;
- productadmin en toegang tot gevoelige operationele inhoud moeten afzonderlijk kunnen worden begrensd.

### Bewust niet in Basis

- een complete boekhouding;
- Bedrukking of andere gespecialiseerde operationele processen;
- generieke mailbox/inbox zonder bewezen behoefte;
- WBD-ontwikkelmonitor, infrastructuurbeheer en interne kennisreview;
- vrije dashboard-/appbuilder;
- AI-chat als verplichte productlaag;
- branchespecifieke integraties en gespecialiseerde process engines.

## 9. Overzicht / Geheugen / Aandacht value model

| Waardeas | Huidige staat | Waarde op papier | Bewijsgrens |
|---|---|---|---|
| **Overzicht** | rustige maar statische Home; statische projecten/status | sterk wanneer role-/source-aware | geen echte actuele gebruiker of klantbron |
| **Geheugen** | lokale dossiers, documenten, notities, tijdlijn en kennis | sterk en meest tastbaar | browsergebonden, niet multi-user of duurzaam centraal |
| **Aandacht** | statische tekst en visuele contracten | potentieel sterk | geen situatiebron, eigenaar, permissionfilter of herstel |

Samen vormen de drie assen een coherent zelfstandig productcontract. Zij vormen nog geen bewezen product. Geheugen is de sterkste huidige bouwsteen; Overzicht is vooral presentatie; Aandacht is vooral specificatie.

## 10. Sportpaleis fit

| Onderdeel | Fit | Bestaand bewijs | Conclusie |
|---|---|---|---|
| Home / Attention | **PLAUSIBLE FIT** | productieorders hebben status en controlebehoefte | niet bewezen buiten Bedrukking |
| Medewerkers / rollen | **PLAUSIBLE FIT** | overeenkomst onderscheidt Kevin, Sportpaleis en WBD; role-bound access is richting | concrete medewerkerrollen nog valideren |
| Documenten | **PLAUSIBLE FIT** | logo en productbeelden zijn operationeel relevant in proof | geen bewezen dossier-/documentgebruik |
| Logo's/bestanden | **STRONG FIT binnen Bedrukking** | officieel logo en echte lokale productbeelden in proof | moduledata; niet automatisch Basisbewijs |
| Verenigingen/relaties | **STRONG FIT** | `association` is orderveld; proof navigeert verenigingen | generieke relatiecapability past, terminologie configureerbaar |
| Contactcontext | **PLAUSIBLE FIT** | contactvalidatie is secundaire proofcontext | dagelijkse overdrachtswaarde onbekend |
| Historie | **UNKNOWN** | orderstatus/timestamps bestaan conceptueel | geen observatie dat historie wordt teruggekeken |
| Eigenaarschap | **PLAUSIBLE FIT** | duidelijke verantwoordingsrollen in conceptovereenkomst | operationele assignmentbehoefte niet gemeten |
| Recente wijzigingen | **NO EVIDENCE** | alleen modeltimestamps en visuele richting | eerst observeren |
| Overdracht tussen collega's | **NO EVIDENCE** | producthypothese, geen gebruiksdata | kern van TEST B; eerst valideren |
| Bedrukking | **STRONG FIT** | uniforme orders, artikelen, personalisatie, verenigingen, productieproof | betaalde capability/module |
| Finance | **PLAUSIBLE FIT voor Workspace-account**, **UNKNOWN voor eigen boekhouding** | concept €75, ontwikkelbijdrage en WBD-factuur | admin-only accountcontext; geen boekhoudpakket |
| Projectconcept | **UNKNOWN** | ontwikkelpartnerschap is projectmatig | geen bewijs dat Sportpaleis dagelijks “Projecten” gebruikt |

De sterkste generieke brug van Bedrukking naar Basis is niet de orderflow zelf, maar de behoefte aan relaties, documenten, historie, eigenaarschap en rolgebonden context. Alleen praktijkobservatie mag bevestigen dat die brug werkelijk bestaat.

## 11. Sportpaleis example configuration — concept, niet geïmplementeerd

### Kevin / eigenaar — HYPOTHESIS

Ziet waarschijnlijk:

- Home met bedrijfsbrede relevante aandacht;
- relaties/verenigingen en relevante dossiers;
- gedeelde documenten en recente historie;
- eigenaarschap/volgende stappen;
- Bedrukking als geactiveerde capability;
- Workspace users, rollen, actieve capabilities en commerciële accountcontext;
- Ontwikkelpartnerschap uitsluitend wanneer dit apart is toegestaan.

### Bedrukkingmedewerker — HYPOTHESIS

Ziet waarschijnlijk:

- persoonlijke Home met relevante orders/controles;
- Bedrukking, verenigingen, relevante documenten en contactcontext;
- eigen/toegewezen aandacht en recente wijzigingen;
- geen Workspace-abonnement, facturen, userbeheer of WBD-ontwikkelcontext.

### Administratie — HYPOTHESIS

Ziet mogelijk:

- eigen relevante aandacht;
- toegestane documenten en commerciële Workspacefacturen;
- eventueel een afzonderlijke klantfinance-capability wanneer later aangeschaft;
- geen onnodige productie-, ontwikkel- of infrastructuurcontext.

### Verborgen tenzij later relevant

- Projecten;
- Atlas Knowledge Repository en kennisvoorstellen;
- WBD Infrastructuur en Ontwikkeling;
- WBD-factuurgenerator;
- communicatie/mail;
- uitgebreide customer business-finance;
- Ontwikkelpartnerschap voor niet-bevoegde gebruikers.

Dit is informatiearchitectuur, geen permissionimplementatie en geen bevestigde Sportpaleis-inrichting.

## 12. Multi-user value

Gebruiker 2 maakt de Workspace alleen beter wanneer gedeelde context daadwerkelijk overdraagbaar wordt. De noodzakelijke effecten zijn:

- een collega ziet wat veranderd is zonder eerst iemand te bellen;
- documenten en context staan niet alleen op één computer of in één mailbox;
- eigenaar en volgende stap zijn zichtbaar;
- een taak/situatie kan bij afwezigheid worden overgenomen;
- relevante historie voorkomt dezelfde vragen en beslissingen opnieuw;
- iedere rol ziet alleen relevante informatie;
- acties en wijzigingen zijn herleidbaar zonder een surveillancefeed te worden.

Minimaal benodigde capabilities:

1. centrale duurzame data en private documenten;
2. users/memberships en deny-by-default permissions;
3. organisation- en capabilityscopes;
4. eigenaarschap en volgende stap;
5. menselijke historie/recent changes;
6. role-aware Home/Attention;
7. begrijpelijke actor/provenance bij wijzigingen.

**Conclusie:** de multi-userwaardelogica is geloofwaardig, maar de waarde is niet bewezen. Login voor gebruiker 2 zou zonder deze zeven punten alleen extra bereik zijn, geen extra productwaarde.

## 13. Roles and permissions product needs

### Minimum rollenconcept

**ADMIN**

- gebruikers uitnodigen en toegang intrekken;
- rollen en capabilityzichtbaarheid beheren;
- commerciële Workspace-informatie zien;
- configuratie en uitbreidingen beheren/aanvragen;
- exports en continuïteitsacties uitvoeren wanneer toegestaan.

**STANDARD USER**

- ziet alleen toegewezen capabilities en data;
- kan binnen die scope lezen, toevoegen of wijzigen volgens expliciete rechten;
- ziet geen commerciële/admininformatie tenzij apart toegestaan.

**ROLGEBASEERDE CAPABILITYTOEGANG**

- een functioneel profiel zoals Bedrukking of Administratie is geen tweede tenant;
- het profiel combineert capabilityzichtbaarheid, organisatiescope en acties;
- een profiel mag niet uitsluitend client-side navigatie verbergen.

### Functionele permissiondimensies voor WS.2

- workspace membership;
- capability visibility/access;
- organisatie- of relationscope;
- read/create/edit/archive/delete/export per objectsoort;
- assignment/reassignment;
- user/role/configuration administration;
- commerciële accountinformatie;
- audit/provenance visibility.

Geen technisch permission-schema is in WS-BASE.0 vastgesteld. Menselijke keuze blijft nodig of een Workspace Admin standaard alle operationele inhoud mag zien of alleen beheerrechten krijgt.

## 14. Home per gebruiker

Zelfde Workspace is niet dezelfde Home.

Home moet server-side worden samengesteld uit:

- membership en role/capability permissions;
- eigen/toegewezen situaties;
- toegestane organisatiecontext;
- concrete acties, wachten, aankomend en recent gewijzigd;
- laatste relevante hervatcontext;
- hoogstens één bevestigde Atlas-relatie wanneer direct relevant.

Kevin kan bedrijfsbrede aandacht, admin/accountcontext en Bedrukking zien. Een Bedrukkingmedewerker krijgt productiecontext en relevante verenigingsdocumenten. Administratie krijgt toegestane finance-/documentcontext. Verborgen data levert geen titels, aantallen of badges op.

Deze richting is **PLANNED / HYPOTHESIS** en vraagt na WS.2/WS.3 een echte attentionbron; geen client-side personalisatie mag permissions simuleren.

## 15. Documents assessment

**Productrol:** **WORKSPACE BASIS**.

Documenten zijn generiek waardevol wanneer zij context dragen:

- gekoppeld aan organisatie en optioneel project/capability;
- auteur/uploader, datum en provenance;
- zichtbaarheid/rechten;
- versie of betekenisvolle wijzigingshistorie;
- relatie met contact, beslissing of situatie;
- recent relevant en terugvindbaar.

Voor WBD is dit lokaal bewezen. Voor Sportpaleis is bestandsrelevantie aannemelijk en binnen Bedrukking sterk, maar Basis-gebruik is niet bewezen. De huidige browser-Blobopslag is geen productiebasis. WS.3 blijft vereist voor private objectstorage, uploadpolicy, audit en recovery.

## 16. Timeline/history assessment

**Productrol:** **WORKSPACE BASIS**.

De Basis-tijdlijn beantwoordt: “Wat is er gebeurd, door wie en waarom is dat relevant?” Zij kan document-, notitie-, beslissing-, status-, eigenaarschap- en capability-events verbinden.

Normen:

- betekenisvolle events, geen complete technische logdump;
- actor/rol/tijd alleen waar toegestaan;
- correcties en provenance blijven herkenbaar;
- geen ranglijst, aanwezigheidstracking of performance-monitoring;
- filters/groepering bij volume;
- delete/archive bewaart een begrijpelijk auditgevolg.

De huidige dossier-tijdlijn is een lokale bouwsteen. Sportpaleis-fit blijft **UNKNOWN** totdat een collega haar daadwerkelijk gebruikt om context over te nemen.

## 17. Projects assessment

**Productrol:** **BASIS — CONFIGURABLE**, onder voorbehoud van validatie.

Projecten zijn voor WBD belangrijk, maar mogen niet op basis van een bestaande route tot universele klantnavigatie worden verklaard. De engine kan generiek doel, organisatie, status, besluit, document, eigenaar, resultaat en geschiedenis dragen. Klantterminologie kan “project”, “traject”, “case” of iets anders zijn.

Voor Sportpaleis is de fit **UNKNOWN**. Bedrukking gebruikt orders en verenigingen; die mogen niet kunstmatig als projecten worden gemodelleerd. Projecten blijven verborgen totdat een werkelijk Sportpaleis-werkpatroon ze rechtvaardigt.

## 18. Finance assessment

Drie grenzen:

### A. Workspace/commerciële accountcontext

Onderdeel van **WORKSPACE BASIS**, admin-only: abonnement/context, WBD-facturen aan klant, actieve users/licenties, actieve capabilities en support-/servicecontext. Nog niet generiek geïmplementeerd.

### B. Klantbusiness-finance

Geen standaard Basis. Alleen als **PAID CAPABILITY / MODULE** of aparte configuratie na bewezen behoefte. De Workspace wordt geen grootboek, bankkoppeling, btw-aangifte- of boekhoudpakket.

### C. WBD-facturatiecapability

**WBD-INTERNAL**. De werkende factuurworkflow is WBD-bedrijfsvoering. Sportpaleis is klantdata-instance op F00248, niet gebruiker van de WBD-generator.

Het bedrag €75 in de conceptovereenkomst is founding/pilotcontext en geen gevalideerde marktprijs of definitieve afspraak.

## 19. Atlas assessment

Atlas kan Basis versterken via:

- bevestigde context;
- provenance en bronrelatie;
- Candidate/Confirmed;
- waarom iets bekend is;
- relaties tussen organisatie, document, beslissing en verandering.

Extern moet dit rustig blijven. Geen verplichte AI-chat, magic cards, onverklaarde ranking of automatische waarheid. De interne kennisvoorstellen/reviewlaag blijft in beginsel **WBD-INTERNAL**. Een compacte bevestigde contextweergave is **BASIS — CONFIGURABLE** en **VALIDATE FIRST** voor Sportpaleis.

## 20. Basis versus Module criteria

### Workspace Basis

Een capability hoort in Basis wanneer zij:

- voor uiteenlopende organisaties dezelfde kernverantwoordelijkheid heeft;
- Overzicht, Geheugen, Aandacht of veilige samenwerking direct versterkt;
- geen branchespecifieke process engine vereist;
- met configuratie kan verschillen zonder klantfork;
- noodzakelijk is om een niet-lege, betrouwbare Workspace te leveren;
- redelijke marginale beheerlast heeft binnen de Basisdienst.

### Paid capability / Module

Een capability is waarschijnlijk een module wanneer zij:

- alleen voor een subset klanten relevant is;
- eigen proceslogica, statussen en gespecialiseerde data heeft;
- gespecialiseerde UI, integraties of operationele validatie vraagt;
- substantiële implementatie-, support- of beheerlast heeft;
- aantoonbare afzonderlijke bedrijfswaarde levert.

**Bedrukking bevestigt de grens:** orders, artikelen, verenigingen, personalisatie, productiecontrole en toekomstige integraties vormen gespecialiseerde proceswaarde. Basis levert er identity, dossiers, documenten, historie, attention en rechten omheen; Bedrukking blijft module.

## 21. Configuration versus custom development

### CONFIGURATION

- Workspace-naam en herkenbare markering;
- zichtbare capabilities en standaard Home;
- toegestane termen zoals organisaties/verenigingen/projecten;
- relation types;
- rollen en permissionprofielen;
- attentiontypes en bronnen;
- navigatievolgorde binnen vaste regels;
- beperkte visuele merkconfig binnen WBD-systematiek.

### CUSTOM DEVELOPMENT / MODULE

- nieuwe process engine;
- gespecialiseerde workflow/statusmachine;
- nieuwe externe integraties;
- branchespecifieke data en validatie;
- geavanceerde automatisering of gespecialiseerde rapportage.

Doel: hoge ervaren relevantie met één platform en lage marginale ontwikkelkosten. Configuratie mag geen oncontroleerbare vrije appbuilder worden.

## 22. WBD versus Sportpaleis architecture

### Hetzelfde platform

- shell, routing en runtimecontract;
- identity/sessionmodel;
- workspace instances en organisations;
- memberships, rollen, permissions en isolation;
- dossiers, documenten, historiestructuur en attentioncontract;
- component- en visueel systeem;
- audit, export, recovery en trustprincipes;
- capabilityconfiguratie.

### Verschillende configuratie/data

- Workspace-identiteit, organisatiecontext en gebruikers;
- rollen en scopes;
- zichtbare navigatie/capabilities;
- termen en relation types;
- Home-/attentionbronnen;
- content en documenten;
- Bedrukking en andere modules;
- commerciële context.

Geen WBD-clone en geen Sportpaleis-fork. Sportpaleis wordt een workspace instance met configuratie en modules op dezelfde motor.

## 23. Do-not-build-yet register

1. generieke AI-chat of AI-dashboard;
2. notification center, unread-countcultuur of realtime activity feed;
3. volledig CRM/contactmanagementpakket;
4. losse algemene fileshare;
5. volledig boekhoudpakket, bankkoppeling, OCR of btw-aangifte;
6. universele projectmanagement-/taskboard-suite;
7. mail/inbox/WhatsApp-integratie zonder bewezen workflow en securityboundary;
8. vrije dashboardbuilder of onbeperkte theming;
9. surveillance, presence tracking of medewerkerperformancefeeds;
10. global search vóór volume, permission-index en terugvindprobleem bewezen zijn;
11. geavanceerde policybuilder vóór twee eenvoudige rollen + capabilityscopes gevalideerd zijn;
12. realtime co-editing, chat of comments als doel op zichzelf;
13. customer-specifieke codeforks;
14. automatische Atlas-aanbevelingen zonder provenance en menselijke review;
15. subscription-/billingengine vóór Basiswaarde en modulegrens gevalideerd zijn;
16. verdere visuele of functionele implementatie om ontbrekend productbewijs te compenseren.

## 24. Sportpaleis validation plan

Geen featurevraaglijst en geen analyticsimplementatie. De volgende validatie observeert werk.

### Deelnemers en privacy

- Kevin als eigenaar/praktijkbeoordelaar;
- één Bedrukkingmedewerker, alleen na toestemming;
- eventueel één administratieve gebruiker als die rol werkelijk bestaat en relevant is;
- uitsluitend gesaniteerde of expliciet toegestane praktijkcontext;
- geen persoonsgegevens of klantbestanden kopiëren zonder afgesproken grens.

### Observaties

1. Waar zoekt ieder nu order-, vereniging-, document- en besliscontext?
2. Welke informatie zit slechts bij één persoon/computer/mailbox?
3. Welke overdrachten worden mondeling, via WhatsApp of mail herhaald?
4. Welke situatie kan collega 2 niet overnemen zonder uitleg?
5. Welke verandering moet iemand actief melden?
6. Welke context is bedrijfsbreed, rolgebonden of privé?
7. Welke niet-Bedrukking-informatie wordt minimaal wekelijks teruggezocht?

### Taakgerichte conceptvalidatie

- laat een deelnemer een relevante organisatie/vereniging en document terugvinden;
- laat collega 2 met alleen dossier/historie uitleggen wat de stand en volgende stap is;
- laat iedere rol een eigen Home-prioriteit kiezen uit dezelfde situaties;
- laat Kevin aangeven welke informatie hij bewust niet aan iedere medewerker toont;
- test een werkovername bij afwezigheid;
- observeer welke secties niet worden geopend en waar men alsnog buiten de Workspace zoekt.

### Acceptatiebewijs

Een positieve Basisbeslissing vereist minimaal:

- twee terugkerende waardevolle journeys buiten de gespecialiseerde Bedrukking-flow;
- één geslaagde overdracht waarbij collega 2 minder aanvullende uitleg nodig heeft;
- één bewezen document/context-retrievalverbetering;
- expliciete relevante rolgrenzen;
- gedrag of concrete commitment om een tweede gebruiker toe te voegen;
- geen prominente Basis-capability zonder waargenomen probleem.

## 25. Customer-2 readiness

### Wat kan vandaag worden aangeboden zonder fundamentele ontwikkeling?

Nog geen veilige online Workspace Basis. Er is een lokaal productconcept, geen verkoopbare generieke multi-userdienst.

### Wat moet generiek klaar zijn?

- WS.2 identity, workspace instance, membership, rollen en isolation;
- WS.3 centrale data, private documents, audit, export/recovery;
- role-aware Home/Attention en recent changes;
- organisation/dossier/document/historycontract;
- ownership/next step indien gevalideerd;
- admin/configuration/capabilitymodel;
- support, service, privacy en releasegrenzen.

### Wat kan configuratie zijn?

Naam, markering, termen, relation types, rollen, zichtbare capabilities, Home-bronnen en beperkte navigatie.

### Wat blijft aparte capability?

Bedrukking, gespecialiseerde finance, communicatie/integraties en iedere nieuwe process engine.

Klant 2 is pas een schaalbaarheidstest wanneer een lege generieke testtenant zonder Sportpaleis-code zinvol gevuld kan worden.

## 26. Pricing inputs

Geen prijsbesluit in WS-BASE.0. Latere Basis-pricing moet rekening houden met:

- bewezen zelfstandige waarde en multi-userwaarde;
- aantal inbegrepen gebruikers en beheerlast per gebruiker;
- onboarding en configuratie;
- hosting, managed database/objectstorage en bandbreedte;
- storage, retention, export en recovery;
- identity, security, monitoring en audit;
- supportniveau en incidentverantwoordelijkheid;
- onderhoud, updates en productverbetering;
- variabele AI-/integratiekosten indien geactiveerd;
- toekomstige kosten per klant en schaalvoordelen;
- duidelijke scheiding tussen Basis en moduleprijs.

Sportpaleis €75 Workspace + Bedrukking blijft founding/pilotcontext. Het is geen automatisch marktprijsanker en wordt door dit document niet gewijzigd.

## 27. Kevin pilot narrative — interne outline

- De pilot begon vanuit een concreet Bedrukking-probleem.
- Tijdens de voorbereiding bleek dat een betrouwbare operationele module een gedeelde basis nodig heeft: users, rechten, organisaties, documenten, historie en rustige aandacht.
- Generieke verbeteringen die meerdere organisaties helpen kunnen onderdeel van Workspace Basis worden.
- Sportpaleis is eerste practice partner en profiteert als eerste van bewezen generieke verbeteringen.
- Niet iedere gespecialiseerde uitbreiding valt automatisch binnen Basis of de founding context.
- Iedere gebruiker ziet alleen wat bij rol en verantwoordelijkheid past.
- Het doel is minder zoeken, minder overdracht en minder afhankelijkheid van één persoon, niet meer software om de software.
- Kevin beoordeelt praktische waarde; WBD bewaakt veiligheid, productgrens en onderhoudbaarheid.

Dit is geen verkoopmail, prijsvoorstel of klantcommunicatie.

## 28. Open human decisions

Onderstaande aanbevelingen zijn niet stilzwijgend vastgesteld:

| Menselijke beslissing | Reviewvoorstel | Nog te besluiten |
|---|---|---|
| Definitieve Basis-capabilityset | de tien kerncapabilities uit §8 | accepteren, inkorten of herschikken |
| Standaard zichtbaar | Home en Organisaties; dossierdetails contextueel | definitieve primaire navigatie |
| Configureerbaar | Projecten, contacten als eigen ingang, bevestigde Atlas-context | welke vanaf klant 1 beschikbaar zijn |
| Minimum included users | eerdere canon noemt richting admin + twee standard users | werkelijk inbegrepen aantal en commerciële betekenis |
| Rollen | Admin + Standard User + capabilityprofielen | admin-inhoudstoegang en eerste Sportpaleis-profielen |
| Sportpaleis-hypotheses | Home, historie, ownership, documentgebruik en overdracht valideren | deelnemers, privacygrens en succescriteria |
| WBD-capabilities buiten customer Basis | facturatie, ontwikkeling, infrastructuur, kennisreview | definitieve hide/retire-regels |
| Bedrukkinggrens | afzonderlijke paid capability op generieke Basis | commerciële en functionele grens later bevestigen |
| Basis zonder module | op papier coherent, in praktijk onbewezen | pas na TEST A/TEST B bewijs beslissen |
| Workspace Admin | beheerrechten niet automatisch gelijk aan alle inhoud | gewenste content-/privacygrens |

## 29. Producttests A en B

### TEST A

> Als Sportpaleis Bedrukking morgen zou verwijderen, zou Kevin Workspace Basis dan nog steeds willen houden?

**Antwoord vandaag: NIET BEWEZEN — dus geen geloofwaardig ja.**

De conceptovereenkomst noemt Workspace Basis en continuïteitswaarde, maar de enige concrete Sportpaleis-productflow is Bedrukking. Er is geen waargenomen zelfstandig gebruik van dossiers, documenten, historie, attention of accountcontext. Een ja zou een optimistische aanname zijn.

### TEST B

> Is Workspace Basis zo nuttig dat Kevin uit zichzelf zou denken: “Geef die collega ook toegang, dan werkt dit beter”?

**Antwoord vandaag: NIET BEWEZEN — dus geen geloofwaardig ja.**

De multi-userwaardelogica is sterk, maar users, permissions, role Home, shared ownership en centrale data bestaan nog niet. Er is geen uitnodiging, tweede gebruiker of werkovername geobserveerd.

## 30. Grootste risico op overbuilding

Het grootste risico is de bestaande rijke WBD-routekaart als productbewijs behandelen en identity, attention, projecten, search, mail, finance en Atlas tegelijk bouwen. Dat zou een indrukwekkende maar onbewezen suite opleveren.

De juiste rem is:

```text
EVIDENCE → FIT → PRODUCT ROLE → ROADMAP
```

Niet:

```text
ROUTE / CONCEPT → FEATURE → IMPLEMENTATIE
```

Bedrukking mag evenmin onbewust de hele Basisarchitectuur dicteren. De module levert praktijkbewijs voor specifieke workflows; de generieke Basis moet via meerdere probleemtypen haar eigen waarde bewijzen.

## 31. GO / NO-GO conclusion

| Besluit | Status | Reden |
|---|---|---|
| Feitelijke current-state-review | **GO** | canon, code en 39 gerichte tests zijn gereconcilieerd |
| Producthypothesen en matrix | **GO voor menselijke review** | aannames zijn expliciet gelabeld |
| Workspace Basis-productacceptatie | **NO-GO** | TEST A en TEST B hebben geen geloofwaardig bewezen ja |
| Bedrukking als modulegrens | **GO als productrichting** | gespecialiseerde proceslogica en sterke Sportpaleis-fit |
| WS.2–WS.5 implementatie | **NO-GO vanuit deze fase** | afzonderlijke preflight en menselijke GO vereist |
| VIS-IMP.1 | **NO-GO vanuit deze fase** | productbewijs mag niet door visuele polish worden vervangen |
| Productie/providers/deployment | **NO-GO** | niet binnen scope en fundamentele gates ontbreken |

WS-BASE.0 krijgt daarmee **NO-GO voor acceptatie van Workspace Basis als voldoende bewezen zelfstandig product**. Het assessment zelf is afgerond en maakt de volgende validatiestap veilig definieerbaar.

## 32. Recommended next phase

**Exact aanbevolen volgende fase:** `WS-BASE.1 — Sportpaleis Basis Evidence Validation`.

Scope:

- observeer huidige informatie-, document- en overdrachtspraktijk;
- valideer Overzicht/Geheugen/Aandacht met taakgerichte scenario's;
- test minstens één werkovername en rolgrens;
- verzamel bewijs voor of tegen TEST A en TEST B;
- actualiseer capabilityset, standaardnavigatie en do-not-buildregister;
- geen application-/CSS-/provider-/productieimplementatie.

Preflightinschatting voor WS-BASE.1:

- complexiteit: middel;
- risico: laag tot middel vanwege menselijke/praktijkcontext en privacygrenzen;
- indicatieve Codex-bandbreedte: €15–€35 voor voorbereiding, instrumenten en synthese, exclusief menselijke sessietijd;
- werkelijke eurocredits: niet zichtbaar;
- vereist: afzonderlijke menselijke GO en door de mens georganiseerde Sportpaleis-deelname/toestemming.

Pas na positief praktijkbewijs hoort een nieuwe preflight te beslissen of WS.2, WS.3 of een zeer kleine Basis-vertical slice de juiste implementatiestap is.

## 33. Uitvoeringsbevestiging

- Eén document toegevoegd: `docs/atlas/PROJECT-WS-BASE0-WORKSPACE-BASIS-VALUE-SPORTPALEIS-FIT-REVIEW.md`.
- Geen application code, CSS, route of package gewijzigd.
- Geen database, real customer data, infrastructuur, provider of productie gewijzigd.
- Geen screenshot, redesign of VIS-IMP.1 uitgevoerd.
- Geen WS.2, WS.3, WS.4 of WS.5 gestart.
- Geen pricing of commerciële afspraak gewijzigd.
- Geen klantcontact uitgevoerd.

**STOP. Geen implementatie gestart.**
