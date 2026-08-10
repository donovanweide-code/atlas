# Sportpaleis Bedrukking — Capability Build 003

Release-ID: `SPW-BEDRUKKING-CAPABILITY-003-20260810`  
Configuratie: `SPW-CONFIG-BEDRUKKING-003B-20260810`  
Status: **READY FOR HUMAN VISUAL REVIEW**  
Deploymentstatus: **NOT READY FOR DEPLOYMENT — afzonderlijke HUMAN GO vereist**

## Resultaat

Bouwfase 2 is lokaal afgerond bovenop Pilot 001 / Polish 002. De rustige Workspace-opzet, klantorder als leidend object, vereniging als context, visuele artikelkeuze, orderbrede standaardbedrukking, rode afwijkingsmarkering, productiecontrole en bestaande rolverdeling zijn behouden.

Nieuw of functioneel compleet gemaakt:

- **Eigen artikel**: ordergebonden uitzondering, geen stil catalogusartikel, prijs blijft onbekend, ontbrekend productieprofiel blokkeert productie.
- **Teamorder**: klant en artikel één keer, individuele spelerregels met maat/aantal/initialen/rugnummer/Junior-Senior, alles in één klantorder en revisiemodel.
- **Klantcommunicatie**: ontvangst, in productie, gereed en vraag via de generieke Mail Foundation; lokale preview/capture, geen echte verzending.
- **Gebruikersactivatie**: admin-only uitnodiging, willekeurige eenmalige token, alleen SHA-256-hash opgeslagen, 24 uur geldig, lokale activatielink, wachtwoord met scrypt, sessies ingetrokken bij deactiveren.
- **Verenigingsconfiguratie**: twintig bronregels reproduceerbaar als server-owned organisatieconfiguratie.
- **Productieveiligheid**: ontbrekende fysieke Junior-maat of productieprofiel houdt doorgang naar productie tegen.

## Bronhiërarchie en provenance

1. `info bedrukkingen 2026.xlsx`, `Blad1!A2:J21` — primaire bron voor vereniging, letterprofiel, foliekleur, bronmaten en notities.
2. `Untitled-43.ai` — primaire praktijkreferentie voor algemene productie-opbouw, compound paths, groepering, rotatie, maatvoering, afstand en folie-indeling.
3. `Pioneers nummers.ai` — uitsluitend aanvullende bron voor specifieke Pioneers-cijfercontouren; niet gebruikt als algemene productie-authority.
4. `NEW2025-CID_Manual_BENE sep 25.pdf` — primaire design authority.
5. `Alle Sport2000 Sportpaleis logo's 2026.pdf` — authority voor de gekozen Sportpaleis-logovariant.

Het mail-safe Sportpaleis-logo is rechtstreeks uit de bestaande gevalideerde 2026-bronuitsnede afgeleid, zonder redesign. Provenance en hashes staan in `public/assets/organizations/sportpaleis/brand-006/provenance.json`.

## SPORTPALEIS CONFIGURATION READINESS

### Verenigingen

Twintig bronverenigingen zijn ingericht: Almere'81, Almerer Pioneers, As,8o, A.S.C. Waterwijk, Brouwersports, Buitenhout MHC, DCG, EKVA, FC Almere, FC Huizen, HBSA, MHC Lelystad, Najaden, SC Buitenboys, SC Geinburgia, Sporting Almere, VVA / Spartaan, Wooter, Sloeproeien en Hasselbaink.

Per vereniging zijn uitsluitend waarden uit de spreadsheet overgenomen. Lege cellen blijven `Onbekend`; Junior-bronwaarden zijn niet als fysiek gevalideerde productiemaat gepromoveerd.

### Artikelen en assets

- A.S.C. Waterwijk: tien bestaande pilotartikelen met bestaande artikelbeelden en productieprofielkoppelingen.
- FC Almere: één bestaande pilotregel voor Presentatiepolo; SKU blijft expliciet `nog te valideren`.
- Overige verenigingen: geen fictieve producten, SKU's, afbeeldingen of prijzen toegevoegd.
- Geen artikel uit **Eigen artikel** wordt automatisch aan de catalogus toegevoegd.

### Prijzen

Er zijn geen door Sportpaleis bevestigde verkoopprijzen beschikbaar in de aangeleverde bron. Alle ontbrekende prijzen blijven onbekend; de Workspace rekent geen bedrag op basis van een aanname.

### Productieprofielen

De A.S.C.-pilotprofielen zijn op de spreadsheetbron gecorrigeerd:

- senior rugnummer: **22 cm / 220 mm**;
- shortnummer: **7,5 cm / 75 mm**;
- initialen: **3 cm / 30 mm**;
- Junior-rugnummer: **DATA_GAP**, ook waar de bron 20 cm noemt;
- rotatie en bestaande productie-instructies blijven onderdeel van het profiel; geen hardwareactie is gekoppeld.

Configuratiemigratie `003B` past deze bronwaarden éénmalig toe op oudere lokale schema-3-data en overschrijft latere beheerwijzigingen niet bij iedere herstart.

### Gebruikers en rollen

- Kevin — Beheerder.
- Patrick — Productie.
- Winkelmedewerker — Winkelrol.
- WBD technische ondersteuning — supportrol, alleen waar noodzakelijk en niet als klantseat getoond.

Activering is technisch voorbereid, maar er zijn geen productie-uitnodigingen of echte accounts verzonden/geactiveerd.

### Mail

- Afzendercontext: `bedrukking@sportpaleis.nl`.
- Sportpaleis-branding gebruikt de Organization Brand Foundation en mail-safe CID-logoasset.
- Templates: ontvangstbevestiging, in productie, gereed en vraag/toelichting.
- SPF/DKIM/DMARC blijven onderdeel van het eerdere 005-headercontrolepunt; deze build wijzigde DNS noch VDX.
- In deze bouwfase is geen echte mail verzonden.

### Deployment/migratie

Voor een latere deployment zijn nodig: databasebackup, gecontroleerd uitvoeren van `sportpaleis-server/migrations/pilot-001-to-capability-003.sql`, import/validatie van configuratie `003B`, secret provisioning buiten de repository, readinesscontrole en afzonderlijke GO. Geen productie- of TransIP-database is gewijzigd.

## DATA GAP LIST

Uitsluitend input die nog van Sportpaleis nodig is:

1. Fysiek gevalideerde Junior-rugnummerhoogte per relevante vereniging/productieprofiel.
2. Bevestiging van alle lege maatvelden in `info bedrukkingen 2026.xlsx` waar die bedrukking in de praktijk wel wordt gebruikt.
3. Per vereniging de werkelijke artikelcatalogus: naam, SKU/artikelnummer, beschikbaarheid en gekoppeld productieprofiel.
4. Goedgekeurde artikelbeelden waar nog geen bestaande bronasset beschikbaar is.
5. Bevestigde verkoopprijzen; voor folie/rollen daarnaast inkoopprijs, oorspronkelijke rollengte en leverancier/type waar nog onbekend.
6. Bevestiging van de FC Almere Presentatiepolo-SKU.
7. Definitieve productieprofielkeuze voor ieder aangeleverd Eigen artikel voordat productie mag starten.
8. Volledige mailheaders van de ontvangen Sportpaleis 005-test voor afzonderlijke SPF/DKIM/DMARC-bevestiging.

## Security, rechten en veiligheid

- RBAC, CSRF, revisiecontrole, idempotency, audit/history en sessiecontrole blijven server-side.
- Alleen admin kan uitnodigingen maken en gebruikers beheren.
- Productie en winkel krijgen geen admin-/financiële data.
- Activatietokens worden nooit plaintext opgeslagen en zijn eenmalig.
- Deactiveren trekt bestaande sessies in.
- Onvolledige productiegegevens leveren een server-side blokkade op.
- `hardwareSendEnabled=false`; geen WinPlot, Summa of Direct Print aangestuurd.
- Geen DNS-, Cloudflare-, VDX-, TransIP- of productiemutatie uitgevoerd.

## Persistence en regressie

- Schema 3 ondersteunt `INDIVIDUAL`, `TEAM`, custom-item provenance/readiness, spelernaam, communicatie en activatie-uitnodigingen.
- Migratie 1/2 → 3, eenmalige configuratiemigratie, roundtrip, back-up, null/unknown-gedrag en legacy-orders blijven ondersteund.
- SQL-migratie is een reviewkandidaat en is niet op productie uitgevoerd.
- Volledige testsuite: **425/425 PASS**.
- Workspace-only TypeScript/Vite-build en buildverificatie: **PASS**.
- Desktop- en 390px-kernroutes: **PASS**, geen horizontale overflow in de gecontroleerde nieuwe formulieren.

## NEW EMPLOYEE / LOW DIGITAL SKILL REVIEW

Verder vereenvoudigd of bevestigd:

- Nieuwe order begint met gewone werktaal en toont Teamorder/Eigen artikel als herkenbare uitzonderingen.
- Eigen artikel vraagt alleen klant, meegebracht artikel en noodzakelijke bedrukcontext; prijs blijft eerlijk onbekend.
- Teamorder voorkomt herhaalde klant- en artikelinvoer en gebruikt één zichtbare regel per speler.
- Gebruikersbeheer zegt concreet wat een activatielink doet en dat geen mail wordt verzonden.
- Bron- en technische details zitten in Beheer; de winkelrol ziet ze niet in de normale flow.
- De nieuwe formulieren gebruiken nu dezelfde veldbreedte, spacing en mobiele stapeling als de bestaande Workspace.

Nog uitleg of praktijkinput nodig:

- Een medewerker kan bij **Eigen artikel** redelijkerwijs hulp van Beheer/Productie nodig hebben om een productieprofiel te kiezen. `Nog niet bekend` is daarom veilig en blokkeert productie.
- Teamorder versus meerdere losse artikelen is herkenbaar, maar moet in de praktijkreview met één echte teamlijst worden bevestigd.
- Verenigingen zonder gevalideerde catalogus tonen bewust geen verzonnen artikelen; dit is een inhoudelijke datagap, geen verborgen interfacefunctie.

Conclusie: de primaire normale orderflow is zonder handleiding te begrijpen. De resterende twijfel zit bij uitzonderingen en ontbrekende Sportpaleis-data; die gevallen worden zichtbaar gemaakt en veilig geblokkeerd in plaats van stil ingevuld.

## Reviewset

De reviewset bevat twintig actuele beelden, geordend per rol en workflow: Winkelmedewerker, Patrick/Productie en Kevin/Admin, inclusief desktop en 390px. De PDF is de primaire menselijke reviewversie.

## Eindstatus

EIGEN ARTIKEL: PASS  
TEAMORDER: PASS  
MAIL FOUNDATION INTEGRATION: PASS — LOCAL CAPTURE ONLY  
SECURE USER ACTIVATION: PASS  
SERVER-SIDE RBAC: PASS  
PRODUCTION DATA-GAP BLOCKING: PASS  
PERSISTENCE / MIGRATION READINESS: PASS — NOT DEPLOYED  
FULL REGRESSION TESTS: 425/425 PASS  
REAL MAIL SENT: NO  
PRODUCTION DEPLOYMENT: NO  
DNS MUTATIONS: NO  
HARDWARE ACTIVATED: NO  
OPEN SOFTWARE BLOCKERS FOR HUMAN REVIEW: 0  
OPEN SPORTPALEIS DATA GAPS: 8 categories above  

**READY FOR HUMAN VISUAL REVIEW**
