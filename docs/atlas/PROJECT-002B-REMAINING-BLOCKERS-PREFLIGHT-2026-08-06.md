# Project 002B — Remaining Blockers Preflight

**Datum:** 2026-08-06  
**Status:** uitvoering voorbereid; Project 002B blijft **NO-GO** voor afsluiting  
**Scope:** uitsluitend legacy credentials, twee ingetrokken private keys, recovery readiness en voorbereiding van één geïsoleerde restoretest

> **Scopecorrectie 2026-08-06:** `Wachtwoorden.txt` en `Analytics@webuildanddesign.nl.txt` zijn door de eigenaar expliciet uitgesteld. Codex verwerkt, leest, valideert of verwijdert deze bestanden niet. Zij gelden binnen de huidige closure-opdracht niet als blocker. Sectie 2 blijft uitsluitend als historische voorbereiding staan en autoriseert geen handeling.

## 1. Scopebewaking

Deze preflight heeft geen hosting-, DNS-, deployment- of productiewijziging uitgevoerd. Er zijn geen credentials geopend in rapportage, geen wachtwoorden gewijzigd, geen private keys verwijderd, geen accountinstellingen opgeslagen en geen back-up gedownload of hersteld.

De status per stap maakt onderscheid tussen:

- **Preflight:** is de blocker voldoende onderzocht en veilig uitvoerbaar gemaakt?
- **Closure:** is de blocker feitelijk en aantoonbaar opgelost?

## 2. Stap 1 — Legacy credentials en Bitwarden-migratie

### Doel en begrenzing

Inventariseer de bekende lokale credentialnotities zonder secretwaarden te reproduceren en maak een migratie- en rotatieplan. De feitelijke invoer in Bitwarden, loginvalidatie, rotatie en lokale verwijdering vallen buiten deze voorbereidende uitvoering.

### Vastgestelde inventaris

| Bron | Technische status | Inhoudscategorie | Geheimwaarde gerapporteerd |
|---|---|---|---|
| `/Wachtwoorden.txt` | 91 bytes, 5 regels, ontracked en genegeerd | Meerdere service- en accountmarkeringen | Nee |
| `/Analytics@webuildanddesign.nl.txt` | 43 bytes, 2 regels, ontracked en genegeerd | Analytics-/accountmarkering | Nee |

Beide bestanden zijn leesbaar, staan fysiek in de workspace, worden door de root-`.gitignore` uitgesloten en komen niet voor in `git ls-files`. Bitwarden CLI is lokaal niet geïnstalleerd. Bij slechts enkele records is handmatige invoer veiliger en beter controleerbaar dan een plaintext CSV-import; Bitwarden waarschuwt bovendien dat importeren duplicaten kan maken.

### Uitvoerplan

1. Maak of bevestig een **WBD Bitwarden Organization**; deel operationele geheimen via collections en niet via één gedeeld persoonlijk vaultaccount.
2. Gebruik minimaal de collections `WBD — Core accounts`, `WBD — Hosting & DNS` en `WBD — Mail & Analytics`, of een aantoonbaar gelijkwaardige minimale indeling.
3. Wijs per item een eigenaar toe en leg vast: service, login-URL, gebruikersnaam, classificatie `Actief`, `Onzeker` of `Verouderd`, laatste validatiedatum en recoverykanaal. Kopieer nooit lokale paden of overbodige context mee.
4. Voer de records handmatig in. Toon of exporteer geen secrets in logs, screenshots of dit dossier.
5. Verifieer elk nieuw vaultitem via een gecontroleerde login. Bij twijfel over afhankelijkheden: eerst inventariseren, niet blind roteren.
6. Roteer ieder actief of onzeker wachtwoord in een afzonderlijk change-window: vaultitem bijwerken, login testen, oude waarde intrekken en datum/eigenaar vastleggen.
7. Laat een tweede bevoegde WBD-beheerder de noodzakelijke gedeelde items vanaf een eigen account controleren; deel geen master password.
8. Maak na inrichting een met wachtwoord beveiligde encrypted JSON-export van de organisatie naar goedgekeurde offline opslag. Bewaar geen plaintext export en verwijder tijdelijke import-/exportbestanden direct na validatie.
9. Vraag daarna afzonderlijke destructieve goedkeuring om de twee lokale notitiebestanden exact te verwijderen. Controleer vervolgens dat beide paden ontbreken, geen kopie in prullenbak/synchronisatiemap staat en `git status` geen equivalent secretbestand toont.

Officiële Bitwarden-onderbouwing: [Organizations en collections](https://bitwarden.com/help/about-organizations/), [organization export](https://bitwarden.com/help/export-organization-items/), [encrypted exports](https://bitwarden.com/help/encrypted-export/) en [import-FAQ](https://bitwarden.com/help/import-faqs/).

### Nieuwe preflight-inschatting

| Veld | Inschatting |
|---|---|
| Omvang | S |
| Menselijke uitvoering | 30–60 minuten, exclusief onbekende accountrecovery |
| Codex-/technisch verbruik | Laag |
| Veranderingsrisico | Laag bij handmatige invoer; middelmatig tijdens credentialrotatie |
| Reversibiliteit | Vaultinvoer is corrigeerbaar; rotatie en lokale verwijdering vereisen voorafgaande validatie |
| Afhankelijkheid | Bitwarden-organisatie, minimaal één bevoegde eigenaar en bij voorkeur een tweede controleur |

**Preflight: GO.** De bronnen en veilige uitvoervolgorde zijn bekend.  
**Closure: NO-GO.** Migratie, loginvalidatie, eventuele rotaties en lokale verwijdering zijn nog niet uitgevoerd.

## 3. Stap 2 — Twee ingetrokken private keys

### Identificatie

| Key | Identiteit en bewijs | Lokale status | Remote status |
|---|---|---|---|
| Atlas Runtime deploykey | `/.codex-tmp/atlas-runtime-production-v1/transip-runtime-v1-ed25519`; ED25519; fingerprint `SHA256:dTU/5YYdW2a/3LL6Kb3a0A2IfU6HzNkQrfw9VgzrgmE`; commentaar `codex-atlas-runtime-prod-20260804` | 432 bytes; leesbaar; ACL: Administrators/SYSTEM full control, sandbox read | TransIP toont op 2026-08-06 read-only **Geen SSH-key**; eerdere deployreview bevestigt geweigerde login na intrekking |
| Living Experience validatiekey | `/.codex-tmp/living-online-validation-v1/transip-deploy-ed25519`; doel en directory koppelen de key aan de online validatie van Living Experience | 444 bytes; niet leesbaar door Windows-ACL; huidige gebruiker read, Administrators/SYSTEM full control | TransIP toont op 2026-08-06 read-only **Geen SSH-key**; de validatiereview bevestigt dezelfde ingetrokken toestand |

Beide bestanden staan onder de genegeerde `/.codex-tmp/`-boom en zijn niet tracked. Voor de tweede key is bewust geen ACL-omzeiling uitgevoerd alleen om de private key te lezen; identiteit via exact pad, taakcontext, metadata en remote intrekking is voor het verwijderplan voldoende.

### Veilig verwijderplan

1. Herhaal direct vóór verwijdering de read-only controle dat het WBD-hostingpakket geen SSH-key bevat.
2. Controleer met exacte-padzoeking dat geen actief script, proces of geplande taak naar een van beide keypaden verwijst.
3. Resolve beide absolute paden en bevestig dat zij reguliere bestanden zijn binnen `C:\Users\donov\Documents\Atlas\.codex-tmp\`; volg geen reparse points of symlinks.
4. Maak geen back-up van ingetrokken private keys.
5. Vraag expliciete destructive-actiongoedkeuring voor precies deze twee bestanden.
6. Verwijder de Atlas Runtime key met een literal exact-path operatie.
7. Voor de Living Experience key: vraag tevens verhoogde ACL-goedkeuring, herstel uitsluitend de ACL van dit exacte bestand en verwijder daarna alleen dat bestand. Pas geen recursieve ACL-wijziging toe.
8. Verifieer dat beide `Test-Path`-controles `False` geven, dat geen gelijknamige kopie bestaat en dat TransIP nog steeds **Geen SSH-key** toont.
9. Leg datum, uitvoerder en controles vast; registreer geen private keymateriaal.

### Nieuwe preflight-inschatting

| Veld | Inschatting |
|---|---|
| Omvang | XS |
| Menselijke/technische uitvoering | 10–20 minuten |
| Codex-/technisch verbruik | Zeer laag |
| Veranderingsrisico | Laag; één bestand vereist exact begrensde ACL-escalatie |
| Reversibiliteit | Verwijdering is bewust niet reversibel; remote keys zijn al ingetrokken |
| Afhankelijkheid | Expliciete verwijdergoedkeuring en voor één bestand verhoogde ACL-goedkeuring |

**Preflight: GO.** Beide targets en hun ingetrokken remote toestand zijn voldoende vastgesteld.  
**Closure: GO op 2026-08-06.** De bevoegde mens heeft de ACL-/verwijderhandeling uitgevoerd. Codex heeft daarna uitsluitend met `Test-Path` gevalideerd dat beide exacte bestanden ontbreken. Er zijn geen mappen of andere targets verwijderd.

## 4. Stap 3 — Recovery readiness

### Read-only controle op 2026-08-06

| Controle | Status | Bevinding |
|---|---|---|
| Authenticator-2FA | PASS | De beveiligingspagina toont de 2FA-regeling actief; er is niets opnieuw gegenereerd of opgeslagen. |
| IP-binding | REVIEW | De huidige custom control maakte de stand in de read-only DOM niet eenduidig zichtbaar; de baseline van 2026-08-05 registreert `Uit`. Er is niets gewijzigd. Controleer de zichtbare stand tijdens het toekomstige recovery-change-window en leg vast hoe een IP-wijziging wordt afgehandeld. |
| API | PASS | API staat uit; geen keypairs, geen actieve access tokens en geen geautoriseerde IP-ranges. |
| Hosting SSH-register | PASS | WBD-hosting toont **Geen SSH-key**. |
| Onafhankelijke recoveryroute | PASS — menselijk bevestigd | Een adres buiten de WBD/TransIP-mailomgeving en praktische ontvangst via testmail zijn bevestigd; het adres is niet aan Codex verstrekt. |
| Tweede bevoegde menselijke beheerder | UITGESTELD / N.V.T. | WBD is momenteel een eenpersoonsorganisatie. Geen fictieve beheerder of gedeeld wachtwoord; herbeoordeling bij aanstelling van een tweede bevoegde beheerder. |
| Break-glass en device loss | PASS — huidig model | Recoverymiddelen, onafhankelijk recoverypad en officiële providerroute zijn door de beheerder bevestigd; er is geen werkelijk apparaat uitgeschakeld. |
| Privésessie-login met 2FA | PASS — menselijk bevestigd | Nieuwe login met wachtwoord en 2FA is als succesvol bevestigd; geen authenticatiegegevens gedeeld. |
| Back-upbestaan | PARTIAL/PASS | Concrete file- en databaserestorepunten zijn op 2026-08-05 read-only vastgesteld; herstelbaarheid is nog niet getest. |
| Contractuele accountpunten | REVIEW | Nieuwe verwerkers-/subverwerkersovereenkomsten wachten op menselijke beoordeling; niet gewijzigd. |

### Menselijke closurebevestiging

Op 2026-08-06 heeft de bevoegde beheerder zonder geheimwaarden te delen bevestigd dat het onafhankelijke recoverypad praktisch werkt, recoverycodes beveiligd zijn opgeslagen, een nieuwe 2FA-login slaagt en de device-loss-/providerroute is doorlopen. De break-glassprocedure is passend gemaakt voor de huidige eenpersoonsorganisatie. Een tweede beheerder is een toekomstige security-uitbreiding zodra die rol werkelijk bestaat.

### Nieuwe preflight-inschatting

| Veld | Inschatting |
|---|---|
| Omvang | M |
| Menselijke uitvoering | Afgerond door de huidige bevoegde beheerder |
| Codex-/technisch verbruik | Laag |
| Veranderingsrisico | Laag tot middelmatig; verkeerd ingerichte recovery kan account-lockout veroorzaken |
| Reversibiliteit | Contact- en autorisatiegegevens zijn corrigeerbaar; testvolgorde moet een actieve veilige sessie behouden |
| Afhankelijkheid | Herbeoordeling bij aanstelling van een tweede bevoegde beheerder |

**Preflight: GO.** Huidige sterke en ontbrekende herstelmaatregelen zijn vastgesteld.  
**Closure: GO op 2026-08-06.** Recovery readiness is passend bij de huidige eenpersoonsorganisatie bevestigd. Het ontbreken van een tweede beheerder is vastgelegd als toekomstig restrisico, niet als actuele blocker.

## 5. Stap 4 — Geïsoleerde restoretest voorbereiden

### Gekozen test

Test één geselecteerde **Experience-databaseback-up** in een tijdelijke, niet-productieve database. Dit is kleiner en veiliger dan een pakketrestore, terwijl het de centrale open vraag — is de providerback-up werkelijk importeerbaar en applicatieconsistent? — direct beantwoordt.

Er wordt in deze preflight niets gedownload, geïmporteerd, hersteld of aan productie gekoppeld.

### Preconditions

1. Afzonderlijke GO voor uitvoering van de restoretest.
2. Exact geselecteerd back-uppunt met datum/tijd, bron-database en verantwoordelijke.
3. Een geïsoleerde MariaDB-runtime met dezelfde major version en charset/collation als productie, zonder productiecredentials of uitgaande app-koppelingen.
4. Tijdelijke versleutelde opslag buiten de repository; automatische verwijdertermijn maximaal 24 uur na testafronding.
5. Tijdelijke least-privilege databasecredentials buiten Git en logs.
6. Acceptatie van de voorlopige RPO/RTO-meting; geen productie-SLA wordt door één test bewezen.

### Dry-run

1. Download in de toekomstige uitvoer uitsluitend het gekozen databaseback-uppunt en leg providerbron, timestamp, bestandsgrootte en SHA-256 vast.
2. Scan het bestand lokaal op onverwacht formaat en controleer dat het uitsluitend de bedoelde database bevat. Toon geen persoonsgegevens of secrets in het verslag.
3. Start een lege geïsoleerde database; blokkeer productiehostnames en uitgaande mail/webhooks.
4. Importeer zonder `DROP`, truncate of andere productieactie.
5. Valideer importstatus, tabellen/schema, row-counts per tabel, foreign-keyintegriteit, encoding/collation en de voor Experience noodzakelijke sessie-/eventrelaties. Vergelijk met de manifestwaarden uit precies hetzelfde back-uppunt; gebruik geen vooraf hardcoded tabelaantal.
6. Verbind desgewenst alleen een lokale Experience-build met een testconfiguratie aan deze database en voer read-only health-/compatibiliteitschecks uit. Start geen nieuwe productiesessie en schrijf niet naar productie.
7. Meet download-, import- en validatieduur; leg feitelijke test-RPO en test-RTO vast.
8. Verwijder na bewijsverzameling de tijdelijke database, dump en credentials; verifieer dat er niets in repository, logs, prullenbak of synchronisatiemap achterblijft.

### Acceptatiecriteria

- checksum en bronmetadata zijn vastgelegd;
- import eindigt zonder databasefout;
- schema, charset/collation en integriteitscontroles slagen;
- applicatiekritische relaties zijn aanwezig en logisch consistent;
- geen productie- of externe side-effect is ontstaan;
- gemeten herstelduur en datapuntleeftijd zijn vastgelegd;
- alle tijdelijke data en credentials zijn aantoonbaar verwijderd.

Bij mislukking is de rollback uitsluitend het vernietigen van de geïsoleerde testomgeving. Productie blijft onaangeraakt. De blocker blijft dan NO-GO en de fout wordt geclassificeerd als download-, formaat-, databaseversie-, integriteits- of applicatiecompatibiliteitsprobleem.

### Nieuwe preflight-inschatting

| Veld | Inschatting |
|---|---|
| Omvang | S voor uitvoering; plan is gereed |
| Menselijke/technische uitvoering | 60–120 minuten, afhankelijk van back-upgrootte en lokale databasebeschikbaarheid |
| Codex-/technisch verbruik | Laag tot gemiddeld |
| Veranderingsrisico | Laag wanneer netwerk- en credentialisolatie aantoonbaar zijn; geen productierisico |
| Reversibiliteit | Volledig: tijdelijke testomgeving wordt vernietigd |
| Afhankelijkheid | Goedgekeurde back-updownload, geïsoleerde MariaDB-runtime en secure tijdelijke opslag |

**Preflight: GO.** Testobject, isolatie, procedure en acceptatiecriteria zijn gereed.  
**Closure: GO op 2026-08-06.** De aangewezen back-up is in een tijdelijke netwerkloze MySQL 8.0.36-omgeving geïmporteerd. Alle 11 tabellen, 10 foreign-keyrelaties, engines, collations en `CHECK TABLE`-resultaten zijn geslaagd; zie het afzonderlijke resultaatdocument.

## 6. Gecombineerd besluit

| Stap | Preflight | Blocker gesloten |
|---|---|---|
| Legacy `.txt`-bestanden | UITGESTELD | Geen blocker binnen huidige opdracht |
| Ingetrokken private keys | GO | GO — beide exacte paden ontbreken |
| Recoverydocumentatie/checklist | GO | GO — menselijk bevestigd voor huidige organisatiestructuur |
| Restoretest | GO | GO — geïsoleerd uitgevoerd en volledig opgeruimd |

**Project 002B is GO voor afsluiting.** Documentatie, private-keyverwijdering, recovery readiness en de geïsoleerde restoretest zijn gereed. Project 002C kan na een afzonderlijke project-GO starten; deze preflight autoriseert zelf geen productie- of infrastructuurwijziging.

Deze preflight start Project 002C niet en autoriseert geen hosting-, DNS-, deployment- of productiehandeling.
