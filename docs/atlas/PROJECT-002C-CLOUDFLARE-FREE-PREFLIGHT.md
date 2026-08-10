# Project 002C.7 — Cloudflare Free Preflight

Status: **DOCUMENTED BUT NOT VERIFIED**  
Datum: 2026-08-07  
Eigenaar: We Build & Design (WBD)  
Karakter: read-only preflight; geen Cloudflare-, TransIP-, DNS- of productiehandeling

## 1. Executive Summary

Cloudflare Free voegt voor WBD aantoonbare waarde toe als aanvullende DNS-, reverse-proxy-, DDoS-, TLS-, beperkte WAF- en static-cachelaag. Het is **USEFUL NOW**, maar niet **NEEDED NOW**: de huidige WBD-omgeving is klein en stabiel, terwijl onafhankelijke monitoring, off-provider recovery en de feitelijke zone-reconciliatie nog niet operationeel bewezen zijn.

Het advies is daarom:

- **GO** voor Cloudflare Free als toekomstige ondersteunende WBD-edgelaag;
- **NO-GO nu** voor nameserver-, DNSSEC- of proxycutover;
- beperk een eerste zone tot `webuildanddesign.nl`;
- migreer alle vereiste DNS-records exact, maar start alle webhosts `DNS ONLY`;
- schakel oude DNSSEC veilig uit en wacht tot de oude DS-delegatie aantoonbaar verdwenen is vóór de nameserverwissel;
- activeer Cloudflare DNSSEC pas nadat Cloudflare authoritative DNS aantoonbaar correct werkt;
- proxy pas daarna, in een afzonderlijke GO, eerst alleen apex en `www`;
- houd Experience, preview, wildcard, mail, verificatie en niet-HTTP-diensten aanvankelijk DNS-only.

`CLOUDFLARE IS A LAYER, NOT THE FOUNDATION.` TransIP blijft origin en hostingprovider. Cloudflare vervangt geen backups, monitoring, applicatiebeveiliging, access governance of menselijke verantwoordelijkheid.

## 2. Scope

Binnen scope:

- actuele Cloudflare Free-waarde, functies en limieten;
- WBD-zone-, record-, proxy-, mail-, DNSSEC-, TLS-, WAF-, rate-limit- en cachepreflight;
- Experience- en toekomstige Workspace-grenzen;
- monitoring-, recovery-, accountsecurity-, privacy- en failure-modeanalyse;
- een niet-uitgevoerd 002C.8-cutover- en rollbackrunbook;
- generieke secretvrije templates.

Buiten scope:

- Cloudflare-account of zone aanmaken;
- nameservers, DNSSEC, DNS-records, proxy, SSL-mode, WAF, rate limiting of cache wijzigen;
- TransIP, mail, canonical redirect, monitoring, deployment of Workspace wijzigen;
- Bitwarden, credentials, tokens, private keys, recoverycodes of mailboxinhoud openen;
- 002C.8 starten.

Labels: **VERIFIED**, **DOCUMENTED BUT NOT VERIFIED**, **UNKNOWN**, **RECOMMENDATION**, **CONFLICT** en **HUMAN VERIFICATION REQUIRED**.

## 3. Evidence Reviewed

Canonieke lokale bronnen:

- `PROJECT-002A-INFRASTRUCTURE-FOUNDATION-TRANSIP.md`;
- `PROJECT-002B-SECURITY-BASELINE-RECOVERY-READINESS.md`;
- `PROJECT-002C-PRODUCTION-INFRASTRUCTURE-ASSESSMENT.md`;
- `PROJECT-002C-ENVIRONMENT-RELEASE-CONTROL-BASELINE.md`;
- `PROJECT-002C-EXTERNAL-MONITORING-BASELINE.md`;
- `PROJECT-002C-BACKUP-OFF-PROVIDER-RECOVERY-BASELINE.md`;
- `PROJECT-002C-DNS-CANONICAL-MAIL-AUTH-HYGIENE.md`;
- `PROJECT-002C-ACCESS-DEPLOYMENT-CREDENTIAL-OPERATIONS.md`;
- bestaand release-, productie- en publieke validatiebewijs.

Actuele officiële Cloudflare-bronnen:

- [Free/pricing en inbegrepen kernfuncties](https://www.cloudflare.com/plans/);
- [WAF en planbeschikbaarheid](https://developers.cloudflare.com/waf/);
- [Free Managed Ruleset](https://developers.cloudflare.com/waf/managed-rules/);
- [Custom Rules-limieten](https://developers.cloudflare.com/waf/custom-rules/);
- [Rate Limiting-limieten](https://developers.cloudflare.com/waf/rate-limiting-rules/);
- [Cache Rules-limieten](https://developers.cloudflare.com/cache/how-to/cache-rules/);
- [Standaard cachegedrag](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/);
- [Proxy status en DNS-only](https://developers.cloudflare.com/dns/proxy-status/);
- [Niet-HTTP- en mailproxygrenzen](https://developers.cloudflare.com/dns/proxy-status/use-cases/);
- [Zone-import/-export](https://developers.cloudflare.com/dns/manage-dns-records/how-to/import-and-export/);
- [Full setup en nameserverwissel](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/);
- [DNSSEC-validatie en sleutels](https://developers.cloudflare.com/dns/dnssec/validation-and-key-management/);
- [Full (strict) TLS](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/);
- [2FA en recoverycodes](https://developers.cloudflare.com/fundamentals/user-profiles/2fa/);
- [API-token least privilege](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/);
- [Cloudflare DPA](https://www.cloudflare.com/en-gb/cloudflare-customer-dpa/).

Actuele officiële TransIP-bronnen:

- [DNS en nameservers beheren](https://www.transip.nl/knowledgebase/305-dns-nameservers-aanpassen-via-controlepaneel/);
- [Externe nameservers en DS-boundary](https://www.transip.nl/knowledgebase/5179-een-ds-record-instellen/);
- eerdere canonieke TransIP-bronnen over webhosting-DNS en Let's Encrypt.

Bewijsgrens: geen dashboard-, account-, zone-, registrar- of vaultinzage. Productfuncties zijn providerclaims; WBD-configuratie is alleen VERIFIED waar bestaand publiek/repositorybewijs dat draagt.

Aanvullende publieke DNS-over-HTTPS-momentopname op 2026-08-07: de drie TransIP-nameservers waren authoritative gepubliceerd; één DS-record met algoritme 13, digesttype 2 en TTL 3600 was aanwezig; en één MX met TTL 300 wees naar de TransIP-mailroute. De publieke DS-digest is niet in dit document overgenomen. **VERIFIED op meetmoment**

## 4. Current Architecture

```text
USER
  ↓ direct public DNS / HTTPS
TRANSIP AUTHORITATIVE DNS + DNSSEC
  ↓
TRANSIP SHARED-HOSTING ORIGIN
  ↓
WBD WEBSITE / PREVIEW / EXPERIENCE
```

- TransIP is registrar, authoritative DNS, mail- en hostingprovider. **VERIFIED**
- `webuildanddesign.nl`, `www`, `preview` en `experience` zijn aantoonbare WBD-hosts. **VERIFIED**
- Apex en wildcard hebben dual-stack shared-hostingrecords; `www` is CNAME naar apex. **VERIFIED**
- DNSSEC is publiek actief met TransIP-nameservers en een DS-record. **VERIFIED**
- Mail gebruikt TransIP MX, SPF, DKIM, DMARC en clientconfigrecords. **VERIFIED / gedeeltelijk DOCUMENTED BUT NOT VERIFIED**
- Het origin gebruikt Let's Encrypt; hostnamedekking en actuele geldigheid waren publiek bevestigd, maar renewal onder externe DNS/proxy is nog niet operationeel bewezen. **DOCUMENTED BUT NOT VERIFIED / HUMAN VERIFICATION REQUIRED**
- Externe monitoring en off-provider recovery zijn ontworpen maar niet operationeel. **VERIFIED als huidige gap**
- Cloudflare-account, zone, tokens en configuratie bestaan niet aantoonbaar. **UNKNOWN; niets is aangemaakt in 002C.7**

Gewenst toekomstbeeld:

```text
USER → CLOUDFLARE EDGE → TRANSIP ORIGIN → WBD APPLICATION
```

## 5. Cloudflare Value Assessment

| Onderdeel | Beoordeling | WBD-redenering |
|---|---|---|
| Authoritative DNS | USEFUL NOW | robuuste DNS-laag, maar migratie introduceert beheer- en DNSSEC-risico |
| DDoS-bescherming | USEFUL NOW | beschermt proxied webtraffic; origin blijft zichtbaar via DNS-only/shared-hostinghosts |
| Reverse proxy | USEFUL NOW | voegt edgecontrole toe, maar is nieuwe dependency/failure mode |
| Edge TLS | USEFUL NOW | extra client-edge TLS; origin-TLS moet strikt geldig blijven |
| Free Managed WAF | USEFUL NOW | beperkte automatische baseline, geen volledige WAF-suite |
| Custom WAF | USEFUL LATER | pas na observatie en concrete abusecase |
| Rate limiting | USEFUL LATER | één beperkte regel; server-side Experience-limiet bestaat al |
| Bot Fight Mode | AVOID op day 1 | on/off, niet fijnmazig overslaan; risico op legitieme bot/monitor-flow |
| Static asset cache | USEFUL NOW | lichte performance/originreductie zonder HTML “cache everything” |
| HTML/dynamic cache | NOT NEEDED | huidige schaal rechtvaardigt risico niet |
| Security Analytics | USEFUL NOW | sampled zichtbaarheid; geen monitoring- of logarchiefvervanger |
| Origin hiding | PARTIAL ONLY | wildcard/preview/Experience of andere DNS-only hosts kunnen origin onthullen |
| Betaalde functies | NOT NEEDED | geen huidige requirement boven Free bewezen |

Cloudflare is architectonisch gerechtvaardigd, maar de veiligheidswinst ontstaat pas bij beheerdiscipline. Zonder recordreconciliatie, monitoring en rollbackbewijs kan de extra laag netto risico toevoegen.

## 6. Free Plan Verification

Actueel officieel bevestigd op 2026-08-07:

| Functie/limiet | Free | Beoordeling |
|---|---:|---|
| Authoritative DNS, CDN, Universal SSL | inbegrepen | VERIFIED |
| DDoS-bescherming | unmetered volgens planpagina | VERIFIED providerclaim |
| Free Managed Ruleset | subset van volledige Cloudflare Managed Ruleset | VERIFIED |
| Managed-rule request-body-inspectie | maximaal 1 MB op Free | VERIFIED |
| Zone-level Custom Rules | 5 | VERIFIED; geen `Log`-actie en geen regex op Free |
| Rate Limiting Rules | 1 | VERIFIED |
| Free rate-limitkarakteristiek | IP; match op Path/Verified Bot; 10 s telperiode en 10 s mitigatie | VERIFIED |
| Cache Rules | 10 | VERIFIED |
| Standaard cache | geen HTML/JSON; `private`, `no-store`, `no-cache`, `max-age=0`, Set-Cookie en non-GET worden niet gecachet | VERIFIED |
| Proxied uploadlimiet | 100 MB | VERIFIED; relevant voor toekomstige uploads |
| Bot Fight Mode | beschikbaar | VERIFIED; niet customize-/skipbaar |
| Security Events | sampled logs only | VERIFIED |
| Security Events-alerts | niet inbegrepen | VERIFIED |
| Uptime-SLA | niet inbegrepen | VERIFIED via planpagina |
| Support | communitygericht | VERIFIED via planpagina |

De voorlopige 002C.1-aannames “één rate-limitregel” en “tien cache rules” zijn dus herbevestigd. Functies en limieten moeten vlak vóór 002C.8 opnieuw worden gecontroleerd omdat productplannen kunnen wijzigen.

## 7. Zone / Domain Scope

Een full setup verhuist de authoritative DNS voor de gehele zone. “Niet geproxied” betekent daarom meestal `DNS ONLY`, niet dat een vereist record kan worden weggelaten.

| Host/zone | Zone opnemen | Initiële proxyclassificatie | Status/redenering |
|---|---|---|---|
| `webuildanddesign.nl` | ja | PROXIED, maar pas na DNS/DNSSEC-validatie | publieke canonical website |
| `www.webuildanddesign.nl` | ja | PROXIED tegelijk met apex | webalias; redirect apart uitvoeren |
| `preview.webuildanddesign.nl` | ja | DNS ONLY | publieke releasecontrole; edgewaarde niet noodzakelijk |
| `experience.webuildanddesign.nl` | ja | DNS ONLY / VERIFY FIRST | dynamische sessie/API, no-store en gevoelige flow |
| wildcard `*.webuildanddesign.nl` | alleen exact migreren om regressie te voorkomen | DNS ONLY / ATTENTION | verwijderen is aparte DNS-hygiënewijziging |
| toekomstige Workspace/API/status | nee, nog niet bestaand | NOT MIGRATED | afzonderlijk ontwerp en GO |
| Fara | nee | NOT MIGRATED | zelfstandige klant-/governancegrens |
| Sportpaleis/andere klanten | nee | NOT MIGRATED | nooit automatisch onderdeel van WBD-cutover |

## 8. DNS Migration Plan

De verplichte bewijsstroom is:

```text
TRANSIP SOURCE EXPORT
        ↓
CLOUDFLARE IMPORT WITH PROXY DEFAULT OFF
        ↓
RECORD-BY-RECORD RECONCILIATION
        ↓
HUMAN REVIEW
        ↓
CUTOVER GO
```

Werkwijze voor 002C.8-preparation:

1. Exporteer de volledige TransIP-zone en registreer exporttijd, TTL's, NS en DS-status.
2. Maak afzonderlijk een publieke read-only recordinventaris voor A, AAAA, CNAME, MX, TXT, SPF, DKIM, DMARC, CAA, NS, DS, wildcard en verificatierecords.
3. Importeer pas na aparte GO in een niet-authoritative Cloudflare-zone, met “Proxy imported DNS records” uit.
4. Vergelijk per record naam, type, genormaliseerde waarde, prioriteit, TTL-intentie en proxyclassificatie.
5. Gebruik hashes/status voor gevoelige verificatie-TXT-evidence; commit geen volledige gevoelige waarden.
6. Markeer auto-ontdekte extra records als `UNKNOWN`; auto-import is nooit bewijs.
7. Laat een bevoegde mens de reconciliatiematrix accorderen.
8. Exporteer de voorbereide Cloudflare-zone en bewaar die naast de TransIP-export in de beveiligde recoverylocatie.

Cutoverblockers: een ontbrekend/mismatched record, onbekende wildcardwerking, onverklaard mailrecord, niet-bewezen proxyclassificatie of ontbrekende rollbackexport.

## 9. Mail Safety

Altijd DNS-only/inherent non-proxy:

- MX;
- SPF/TXT;
- DKIM CNAME/TXT;
- DMARC TXT;
- TransIP mail-auth/verificatie-TXT;
- `autoconfig`/`autodiscover` en mailhost-CNAME/A/AAAA waar aanwezig;
- iedere host die SMTP/IMAP/POP of andere niet-HTTP-mailprotocollen bedient.

Cloudflare proxy ondersteunt SMTP niet standaard; een mailhost achter orange cloud kan levering breken. MX en TXT zijn technisch niet proxybaar, maar bijbehorende A/AAAA/CNAME-mailhosts moeten expliciet grijs blijven.

Open punten uit 002C.5:

- sender inventory: onafhankelijk en **geen blocker** als records exact worden gemigreerd, wel blocker voor gelijktijdige SPF/DMARC-wijziging;
- DKIM-selector C conflict: **geen blocker** voor exacte migratie, wel blocker voor verwijderen/herstellen tijdens cutover;
- DMARC `p=none`: **geen blocker**; beleid niet tegelijk aanscherpen;
- mailbox/alias/forwardingdetails onbekend: geen record mag worden verwijderd; receiving/sending smoke test door mens is verplicht.

Mail wordt in 002C.8 niet “verbeterd”; alleen aantoonbaar behouden.

## 10. DNSSEC Cutover

### Gekozen strategie

Cloudflare documenteert twee routes: DNSSEC uitschakelen vóór nameservermigratie, of een geavanceerde multi-signerroute met wederzijdse ZSK-publicatie. TransIP-ondersteuning voor de vereiste externe DNSKEY/ZSK-uitwisseling is niet aangetoond. Daarom is multi-signer **NO-GO** en geldt de conservatieve uitschakel-/herinschakelroute.

### State machine

| State | Delegatie en DNSSEC | Toegangspoort naar volgende state |
|---|---|---|
| A — TRANSIP DNS + TRANSIP DNSSEC | huidige TransIP NS; huidige DS actief | exports, monitors, zoneplan en rollback gereed |
| B — PREPARED CLOUDFLARE ZONE | Cloudflare-zone pending/niet authoritative; alle records gereconcilieerd en DNS-only | Human review 100% match |
| C — SAFE DNSSEC TRANSITION | TransIP NS blijven; huidige DNSSEC uit; oude DS bij parent aantoonbaar afwezig | wacht minimaal oude DS-TTL en ga alleen door als meerdere controles geen DS zien |
| D — NAMESERVER CUTOVER | alleen parentdelegatie naar toegewezen Cloudflare NS wijzigen | Cloudflare active; parent NS en directe CF-answers correct |
| E — CLOUDFLARE DNS VERIFIED | Cloudflare authoritative, records nog DNS-only, DNS unsigned | web, mail-DNS en resolvervalidatie gezond |
| F — CLOUDFLARE DNSSEC ACTIVE | Cloudflare DNSSEC aan; nieuwe Cloudflare DS gepubliceerd | DS/DNSKEY/RRSIG-chain valide, geen SERVFAIL |
| G — FINAL EDGE VALIDATION | aparte GO: apex/`www` proxied; overige startclassificatie behouden | Full (strict), app, mail, headers, monitoring en rollbackbewijs gezond |

### Kritieke regels

- Verander nooit nameservers terwijl de oude TransIP-DS nog bij de parent wordt gepubliceerd; de Cloudflare KSK matcht die DS niet en validating resolvers kunnen `SERVFAIL` geven.
- Tijdsverloop alleen is geen bewijs. Controleer parentdelegatie, directe authoritative servers en meerdere validating resolvers.
- De publiek waargenomen oude DS-TTL is 3600 seconden; Cloudflare waarschuwt dat verwijdering in de praktijk tot 24 uur kan propagaten. Wacht ten minste de actuele TTL én tot DS aantoonbaar afwezig is.
- De publieke NS-TTL is 86400 seconden; een nameserverrollback kan daardoor lang gemengde resolvertoestand geven.
- Exacte TransIP-control-panelstappen voor DNSSEC bij externe nameservers zijn **HUMAN VERIFICATION REQUIRED** vóór uitvoering.

### Rollback per state

- A/B: geen productiecutover; verwijder desgewenst alleen na aparte GO de pending zone.
- C vóór NS-wissel: laat TransIP NS staan; herstel TransIP DNSSEC alleen nadat de oorzaak is opgelost en publiceer/valideer de juiste TransIP DS-route.
- D/E vóór Cloudflare DS: zet NS na GO terug naar de exact opgeslagen TransIP-set; valideer TransIP DNS; activeer TransIP DNSSEC pas daarna opnieuw.
- F/G met Cloudflare DS: verwijder/deactiveer eerst de Cloudflare DS-keten, wacht tot DS aantoonbaar afwezig is, zet dan NS terug, valideer TransIP DNS en herstel pas als laatste TransIP DNSSEC.
- Alleen proxyprobleem in G: zet uitsluitend getroffen webrecord(s) DNS-only; laat authoritative DNS en DNSSEC intact.

## 11. Origin / SSL Model

Doel:

`CLIENT --TLS--> CLOUDFLARE --TLS + CERT VALIDATION--> TRANSIP ORIGIN`

- Gebruik **Full (strict)**. Cloudflare vereist dan origin HTTPS op 443, een onverlopen publiek vertrouwd of Origin CA-certificaat en passende CN/SAN.
- Gebruik nooit Flexible; dat verbreekt end-to-end encryptie en kan HTTP↔HTTPS-redirectloops veroorzaken.
- Verifieer vóór proxyactivatie vanaf een origin-gerichte controle dat Let's Encrypt geldig is voor apex, `www`, preview en Experience.
- Behoud origin HTTP→HTTPS en bestaande HSTS/CSP; wijzig geen redirect- en SSL-laag tegelijk.
- Activeer Cloudflare HSTS, preload of includeSubDomains niet op day 1. Dit vraagt apart ontwerp vanwege preview, Experience en toekomstige hosts.
- Verifieer bij TransIP hoe Let's Encrypt automatisch blijft vernieuwen bij externe authoritative DNS en proxied webrecords. Dit is **HUMAN VERIFICATION REQUIRED**.
- Origin IP restriction is op shared hosting niet bewezen. DNS-only wildcard/hosts onthullen mogelijk dezelfde origin; Cloudflare levert daarom geen volledige origin isolation.

## 12. Canonical Interaction

Keuze: **C — na Cloudflare-cutover, in een afzonderlijke gecontroleerde wijziging**.

Apex en `www` geven nu beide 200 terwijl metadata apex kiest. Een canonical redirect tegelijk met DNSSEC, nameservers, proxy en TLS maakt fouten slecht isoleerbaar en rollback ambigu. Behoud tijdens cutover exact huidig gedrag. Implementeer later een 308 (of 301 indien nodig) van `www` naar apex met path/querybehoud, eigen Human GO, tests en rollback. Preview en Experience vallen buiten die redirect.

## 13. Proxy Scope

| Record/hostklasse | Classificatie | Day-1-regel |
|---|---|---|
| apex A/AAAA | PROXIED na State F | eerste publieke webhost |
| `www` CNAME | PROXIED na State F | samen met apex, nog zonder nieuwe redirect |
| `experience` A/AAAA | DNS ONLY / VERIFY FIRST | pas later na afzonderlijke appcompatibiliteitstest |
| `preview` A/AAAA | DNS ONLY | geen directe noodzaak; behoud releasecontrole |
| wildcard A/AAAA | DNS ONLY / ATTENTION | niet proxyen; latere verwijdering apart onderzoeken |
| MX, TXT, SPF, DKIM, DMARC | DNS ONLY | MX/TXT inherent; CNAME-mailrecords grijs |
| autoconfig/autodiscover/mailhosts | DNS ONLY | mailclient-/protocolveiligheid |
| verificatie-CNAME/TXT | DNS ONLY | proxy kan eigendomsverificatie breken |
| FTP/SFTP/SSH | DO NOT PROXY | niet-HTTP; Cloudflare-proxy ondersteunt dit niet standaard |
| database/providerbeheer | DO NOT PROXY | nooit via publieke webproxy |
| toekomstige Workspace/API | UNKNOWN | eigen security-, cache- en uploadpreflight |

Omdat preview/Experience/wildcard mogelijk hetzelfde originadres tonen, blijft gerichte origin-DDoS mogelijk. Noteer dit als geaccepteerde shared-hostingbeperking, niet als verborgen origin.

## 14. WAF Baseline

### DAY-1

- automatische DDoS-bescherming;
- Cloudflare Free Managed Ruleset in providerdefault;
- Security Events alleen observeren;
- geen custom block/challenge rules;
- geen Bot Fight Mode;
- geen IP allow-rules die andere WAF-lagen kunnen omzeilen.

### LATER AFTER OBSERVATION

- maximaal één concrete custom rule per bewezen abusepatroon;
- eerst simuleren met reproduceerbare requests en sampled events;
- aparte uitzonderingen voor monitoring, callbacks en legitieme automation vóór challenge/block;
- Experience pas proxyen na GET/POST/session/API-tests.

### NOT RECOMMENDED

- agressieve land-, ASN-, user-agent- of algemene botblokkades zonder evidence;
- vijf Free Custom Rules direct vullen;
- een commerciële volledige WAF claimen op basis van de Free subset;
- origin/app-validatie vervangen door edge-WAF.

## 15. Rate Limiting

Free heeft één regel, met beperkte matching/counting. Reserveer die regel; activeer niets tijdens eerste cutover.

Prioriteit wanneer een concrete route bestaat:

1. toekomstige login/auth of password-reset;
2. duur/abusegevoelig public form/API-endpoint;
3. toekomstige Workspace API;
4. Experience alleen als de bestaande server-side database-rate-limit aantoonbaar tekortschiet.

Eerst verkeer observeren, normale mobiele/NAT-/accessibilitypatronen bepalen en vervolgens threshold testen. Een Free IP-teller kan meerdere gebruikers achter NAT samen raken en is geen applicatie-identiteitslimiet.

## 16. Caching

| Contentklasse | Startbeleid |
|---|---|
| Static public assets met content hash | standaard edgecache toegestaan; origin headers behouden |
| Publieke HTML | niet “cache everything”; standaardgedrag behouden |
| Dynamic Experience | volledige host/path bypass bij latere proxy; `no-store`/Set-Cookie behouden |
| Authenticated Workspace | NEVER CACHE PRIVATE CONTENT; hostbrede bypass als veilige start |
| API | bypass tenzij een expliciet publieke, idempotente response apart is bewezen |
| Private/user-specific documents | nooit publiek cachen |

Cloudflare cachet HTML/JSON standaard niet en respecteert op Free origin `private`/`no-store`/`no-cache`/Set-Cookie. Cache Rules kunnen deze veilige grens overschrijven; gebruik de tien regels niet preventief. Een gehashte JS/CSS/imageasset kan via default extension-based caching profiteren zonder custom “cache everything”.

## 17. Experience Safety

Bewezen ontwerpkenmerken: publieke frontend, PHP/API, sessies/cookies, same-origincontrole, databasegestuurde rate limit, `no-store`, noindex, HSTS en CSP. Productieconfig is deels **DOCUMENTED BUT NOT VERIFIED**.

Conservatieve positie:

- tijdens nameservercutover DNS-only;
- geen cache-, WAF-, bot- of rate-limitwijziging;
- later alleen proxyen na route-inventaris van HTML, assets, API, POST en beheer;
- alle dynamische/API-responses cache-bypass;
- `Set-Cookie`, Secure, HttpOnly, SameSite, Host/Origin, echte client-IP-verwerking en CSRF opnieuw valideren;
- WAF false positives testen op volledige menselijke Experience-flow;
- no-store/noindex/CSP/HSTS end-to-end vergelijken;
- geen query-, cookie-, body- of persoonsdata in Cloudflare-evidence opnemen.

## 18. Future Workspace Safety

Voor een online/mobile Workspace gelden vóór proxying:

- sterke app-auth en autorisatie blijven originverantwoordelijkheid;
- Secure/HttpOnly/SameSite cookies, CSRF en sessie-expiry getest achter proxy;
- correcte trusted-proxy/client-IP-configuratie zonder spoofbare headers;
- organisatie-isolatie in app en data, nooit via alleen hostname/WAF;
- authenticated HTML/API/uploads/downloads/private documenten/communicatie/finance standaard cache-bypass;
- uploadlimiet van 100 MB op Free meewegen;
- audit/evidence zonder inhoud, tokens of persoonsgegevens;
- routegerichte WAF/rate-limitregels pas na verkeers- en false-positiveanalyse;
- directe originroute en failover expliciet ontwerpen;
- Cloudflare-accountrol geeft geen Workspace-apprecht en andersom.

## 19. Monitoring Interaction

Koppeling met 002C.3:

| Signaal | Meetroute |
|---|---|
| edge bereikbaar | publieke proxied apex/`www` vanaf externe monitor |
| origin bereikbaar | aparte veilige originprobe of DNS-only controlhost; geen publiek geheim pad |
| TLS geldig | client-edge én origin-certificaat afzonderlijk |
| application bereikbaar | herkenbare release-/contentassertie, niet alleen HTTP 200 |
| DNS gezond | parent NS/DS, authoritative answers en validating resolvers |
| canonical | apex/`www` status en Location na latere redirect |
| Experience | route, no-store/noindex, herkenbare appassertie zonder mutatie |

Cloudflare kan gecachete content tonen terwijl origin faalt. Daarom is onafhankelijke originobservatie een harde cutovervoorwaarde. Monitoring wordt niet in deze opdracht geactiveerd. Gezond = stil; alerts dedupliceren en herstel bevestigen.

## 20. Backup / Recovery Interaction

Voor cutover vereist:

- volledige TransIP source-export in beveiligde off-provider locatie;
- gereconcilieerde Cloudflare-recordset en export;
- oude nameservers en actuele NS-TTL;
- oude DS/DNSSEC-status en actuele DS-TTL, zonder geheime sleuteldata;
- per-state rollbackwaarden en besliscriteria;
- timestamps, autorisator en Human GO;
- monitoring- en validatiebewijs;
- account-/2FA-/recoveryreadiness.

Cloudflare is geen origin-, database-, mail- of applicatiebackup. Een zone-export alleen is ook geen registrar-/delegatiebackup. 002C.4/002C.5 blijven canoniek.

## 21. Access / Account Security

Toekomstige human-only baseline:

- één werkelijke WBD-accountowner met organisatiebeheerautoriteit;
- uniek sterk wachtwoord in Bitwarden, human-only;
- phishing-resistente security key waar haalbaar, anders TOTP; e-mail-2FA niet als enige voorkeur;
- Cloudflare backupcodes veilig in Bitwarden, nooit in Git/chat/evidence;
- accountmailbox met aantoonbare recovery en geen afhankelijkheid van alleen de gemigreerde WBD-mailroute;
- actieve sessies en auditlog na gevoelige handelingen reviewen;
- geen fictieve tweede beheerder; later alleen een werkelijk bevoegde tweede route;
- rollen minimaal wanneer extra leden daadwerkelijk bestaan;
- geen API-token voor handmatige preflight/cutover;
- later alleen resource-scoped token met minimale Read/Edit, IP-filter/TTL waar passend;
- nooit Global API Key wanneer een beperkte token volstaat.

Geen account, lid, token of vault-item is in 002C.7 aangemaakt of geopend.

## 22. Privacy / Data Processing

Als reverse proxy ontvangt Cloudflare IP-adressen en verkeersmetadata, terminateert het client-TLS en kan het request-/securitymetadata verwerken. Dat introduceert een extra verwerker/ontvanger en internationale infrastructuurlaag.

Vóór account/edge-GO: **HUMAN VERIFICATION REQUIRED** voor:

- toepasselijkheid en acceptatie van de actuele Cloudflare DPA;
- controller/processorrollen en grondslag/doelbinding;
- actuele subprocessors en internationale overdrachtswaarborgen/SCC's;
- bewaartermijnen en sampled analytics/securityevents;
- eventuele cookies/challenges/botfuncties;
- privacyverklaring en leveranciersregister;
- minimale dashboards, analytics en logretentie;
- bijzondere/gevoelige data in Experience en toekomstige Workspace.

Dit is een technische privacypreflight, geen definitief juridisch advies. Begin met minimale providerdefaults en zet geen optionele analytics-, bot- of client-side features aan zonder doel en review.

## 23. Failure Modes

| Scenario | Detectie/impact | Preventie | Rollback/herstel + Human Action |
|---|---|---|---|
| verkeerd/ontbrekend DNS-record | diff, NXDOMAIN/verkeerde target; service-uitval | 100% reconciliatie | corrigeer CF-record of state-gebonden NS-rollback na GO |
| ontbrekend MX/TXT/DKIM | DNS-check/mailtest; mailverlies/authfail | mailmatrix, DNS-only | herstel exact uit export; mens test ontvangen/verzenden |
| oude DS met nieuwe NS | validating resolver `SERVFAIL`; volledige zone-uitval | DS eerst verwijderen en verifiëren | geen NS-cutover; bij actief CF-DS juiste state-rollback |
| verkeerde proxystatus | mail/SSH/verification stuk | per-record classificatie, default off | affected record DNS-only zetten na GO |
| verkeerde SSL-mode | 525/526, downgrade/loop | Full (strict) vooraf; certcheck | proxy DNS-only, herstel mode; nooit Flexible |
| redirectloop | browser/curl hops; website onbereikbaar | canonical apart; huidige redirects behouden | proxy DNS-only of routingconfig herstellen |
| WAF false positive | 403/challenge/securityevent | day-1 defaults, routeflowtest | feature/rule uit na GO; app niet verzwakken |
| rate-limit false positive | 1015/challenge; NAT/mobile geraakt | regel reserveren/observeren | regel uitschakelen; server-side limiet behouden |
| private/dynamic cache | verkeerde usercontent/oud state | host/path bypass; nooit cache-everything | affected cache rule uit, purge, incidentreview |
| Cloudflare edge outage | edge monitor faalt, origin gezond | externe edge+originmeting | records DNS-only; geen impulsieve NS-rollback |
| TransIP origin outage | edge kan cache tonen, originprobe faalt | originmonitor/rollback | originincidentroute; Cloudflare is geen originfailover |
| account lockout | dashboard/API onbereikbaar | 2FA/recovery/accountmail | human recovery; geen gedeeld noodaccount |
| origin IP blijft zichtbaar | DNS-only hosts/shared IP tonen origin | expliciet accepteren/beperken | geen valse securityclaim; toekomstige hostingarchitectuur |
| foutieve NS-rollback | mixed delegation/SERVFAIL | state-aware runbook en TTL's | stop; herstel consistente DS/NS-state met human lead |

## 24. Cutover Runbook

Dit runbook is uitsluitend ontwerp voor een mogelijke 002C.8 en is niet uitgevoerd.

### PRE-CUTOVER

1. Herverifieer Free-features, TransIP-controls en publieke NS/DS/recordstate.
2. Activeer eerst onafhankelijke edge-, origin-, DNS-, TLS-, app- en mail-DNS-monitoring.
3. Bevestig accountowner, 2FA, recoverycodes, recoverymail en privacy/DPA-review.
4. Leg Human GO vast voor zone-addition; voeg zone toe zonder delegation change.
5. Exporteer TransIP DNS; importeer met proxy default uit.
6. Reconcileer 100% record voor record en laat mens accorderen.
7. Zet Full (strict) als toekomstige mode en valideer origin-certificaten/renewalroute.
8. Bevestig dat apex, `www`, preview, Experience en wildcard nog DNS-only staan.
9. Bewaar oude NS, DS-status, TTL's, exports, proxyplan en rollback per state.
10. Freeze DNS/mail/canonical/deployment gedurende window; maak geen andere wijziging.
11. Controleer monitoring en communicatie/decision owner.
12. Geef afzonderlijke Human GO voor State A→C.

### CUTOVER — DNSSEC TRANSITION

1. Schakel via TransIP de huidige DNSSEC-delegatie uit volgens de dan actuele providerprocedure.
2. Noteer tijd en control-planebevestiging.
3. Controleer parent DS rechtstreeks en via meerdere validating resolvers.
4. Wacht minstens de actuele oude DS-TTL en zolang nodig tot DS aantoonbaar afwezig is; houd rekening met maximaal 24 uur propagation.
5. Bevestig dat TransIP NS nog exact en zonder `SERVFAIL` antwoorden.
6. Bij enige onduidelijkheid: stop in State C; geen nameserverwijziging.

### CUTOVER — NAMESERVERS

1. Geef afzonderlijke Human GO voor State C→D.
2. Vervang alleen de TransIP-nameservers door exact de toegewezen Cloudflare-nameservers.
3. Noteer timestamp en oude/nieuwe NS-classificatie in evidence.
4. Controleer parentdelegatie, directe Cloudflare-authoritative answers en zone `active`.
5. Bevestig via meerdere publieke resolvers A/AAAA/CNAME/MX/TXT/DKIM/DMARC en wildcard.
6. Valideer website, `www`, preview, Experience, TLS en mail-DNS terwijl alles DNS-only is.
7. Houd rekening met de oude NS-TTL van 86400 seconden en mogelijke gemengde caches.

### CUTOVER — CLOUDFLARE DNSSEC

1. Geef afzonderlijke Human GO voor State E→F.
2. Activeer Cloudflare DNSSEC en verkrijg de nieuwe DS-gegevens als niet-geheime delegatiedata.
3. Publiceer de Cloudflare DS via de bij TransIP ondersteunde externe-nameserver/DNSSEC-route.
4. Controleer DS bij parent, DNSKEY/RRSIG bij Cloudflare en valideer de chain vanaf meerdere resolvers.
5. Ga niet door bij `SERVFAIL`, mismatch of onduidelijke dubbele DS.

### CUTOVER — EDGE PROXY

1. Wacht tot State F stabiel is en geef een aparte proxy-GO.
2. Bevestig Full (strict), geldig origin-certificaat, huidige redirects en monitorstatus.
3. Proxy alleen apex en `www`; laat Experience, preview, wildcard, mail, verificatie en non-HTTP DNS-only.
4. Valideer edge/origin-IP, HTTP/HTTPS, TLS, assets, headers, canonicalgedrag en release-identiteit.
5. Activeer geen extra WAF-, bot-, rate-limit-, redirect- of cache rules.

### POST-CUTOVER

- authoritative NS/DS/DNSKEY/RRSIG en publieke resolvers;
- apex/`www`, preview, Experience en relevante routes;
- client-edge TLS én origin-TLS;
- MX/SPF/DKIM/DMARC/autoconfig/autodiscover;
- actuele canonical zonder nieuwe redirect;
- assets/hash/release-identiteit;
- CSP/HSTS/no-store/noindex en cookie-/sessieflow;
- edge- en originmonitoring;
- desktop/mobile waar relevant;
- exports, timestamps, resultaten en access closure in cutoverevidence.

### ROLLBACK TRIGGERS

`SERVFAIL`, ontbrekende DNS/mailrecords, mailimpact, TLS 525/526, website/Experience failure, onverwachte WAF/cache/challenge, inconsistente resolverstate zonder hersteltrend of onduidelijke DNSSEC/delegatiestate.

### ROLLBACK

1. Stop wijzigingen en bepaal actuele state A–G.
2. Proxy-only failure: zet getroffen host DNS-only en valideer; verander NS/DNSSEC niet.
3. Pre-Cloudflare-DS DNS failure: herstel records of zet NS terug naar TransIP; herstel TransIP DNSSEC pas na NS-validatie.
4. Post-Cloudflare-DS rollback: verwijder eerst Cloudflare DS, wacht tot parent DS afwezig is, herstel TransIP NS, valideer, activeer daarna TransIP DNSSEC opnieuw.
5. Mailrecordfout: herstel exact uit export; mens voert secretvrije send/receive-test uit.
6. Leg beslisser, tijden, state, impact en herstelbewijs vast.

## 25. Observation Window

| Moment | Controle | Ritme |
|---|---|---|
| na iedere state | directe authoritative/parent/validator-checks | eenmalige gate, geen volgende stap zonder groen |
| eerste 2 uur na NS/proxy | edge, origin, DNS, TLS, app, mail-DNS | geautomatiseerd 5–15 min; alleen alerts |
| 6 en 12 uur | resolvers, mailtest, Experience, headers | gerichte check |
| 24 uur | volledige matrix; oude NS-TTL verstreken | formele review |
| 48 en 72 uur | afwijkingen, cert, WAF/events, origin | korte review |
| dagen 4–7 | dagelijkse samenvatting alleen bij attention | gezond = stil |

Bij gezonde toestand geen continue menselijke refresh. Een tijdelijke resolverafwijking binnen TTL zonder service-impact is observatie, geen automatische rollback.

## 26. Cost / Plan Boundary

Free kost volgens de actuele planpagina $0/maand en is technisch voldoende voor de huidige WBD-edgebaseline. Er is geen huidige betaalde requirement bewezen. Cloudflare positioneert Free als geschikt voor persoonlijk/hobby- en niet-businesskritisch gebruik; de toepasselijkheid van actuele self-servicevoorwaarden op WBD is daarom **HUMAN VERIFICATION REQUIRED**, zonder daaruit een niet-gedocumenteerd gebruiksverbod af te leiden.

Free mist onder meer uptime-SLA, volledige managed/OWASP-rulesets, uitgebreide custom/rate-limitcapaciteit, volledige securityeventzichtbaarheid/-alerts en professionele support. Betaald pas beoordelen bij concrete eis: businesskritische SLA/support, meer rules, betere logs/alerts, geavanceerde bot/WAF-functies, grotere uploads of bewezen performancebehoefte.

Geen abonnement of betaalgegevens gebruiken in 002C.7/002C.8 zonder afzonderlijk zakelijk besluit.

## 27. Repository Guardrails

Toegevoegd zijn alleen kleine secretvrije templates onder `docs/atlas/cloudflare/`.

- Geen Cloudflare automation, Terraform, API-client of tokenconfig.
- Geen account-/zone-ID, login, mailadres, API-token, Global API Key of recoverycode in Git.
- DNS-evidence mag recordnaam/type/status bevatten; gevoelige verificatiewaarden alleen als matchstatus/hash.
- Geen origincredentials/private configuratie of mailboxinhoud.
- Templates zijn geen uitvoeringsautorisatie.
- Iedere mogelijke secretvondst wordt alleen als pad + klasse gemeld met `SECURITY ATTENTION`.

## 28. Atlas / Workspace Future Integration

```text
CLOUDFLARE / DNS / MONITORING
        ↓
CONNECTOR / NORMALIZER
        ↓
SECURITY OBSERVATION
        ↓
ATLAS INTERPRETATION
        ↓
WORKSPACE TRUST / ATTENTION
```

Toekomstige secretvrije observaties: `dnssec_healthy`, `edge_healthy`, `origin_unreachable`, `waf_anomaly`, `certificate_issue`, `configuration_drift`, `human_action_required`. Gezond blijft stil. Connectors gebruiken later alleen minimale read-only tokens en tonen geen raw IP-/request-/cookie-/accountdata aan customer workspaces.

Geen connector of Workspace UI is gebouwd.

## 29. Human Actions

De aparte checklist staat in `cloudflare/CLOUDFLARE-HUMAN-ACTION-CHECKLIST.md`. Voorgestelde toekomstige reeks, niet uitgevoerd:

- **CF-H1 — Account creation:** menselijke eigenaar kiest WBD-accountmail, accepteert voorwaarden/DPA en maakt na GO het account.
- **CF-H2 — Account security:** uniek Bitwarden-wachtwoord, sterke 2FA, backupcodes en recoveryroute human-only.
- **CF-H3 — Zone addition without cutover:** WBD-zone toevoegen, geen nameserverwijziging, alle imports proxy-off.
- **CF-H4 — DNS reconciliation review:** TransIP/Cloudflare exact vergelijken, mail/proxy/DNSSEC/rollback accorderen.
- **CF-H5 — Cutover readiness confirmation:** monitoring, origin TLS/renewal, privacy, account recovery, state-machine en rollback formeel GO/NO-GO.

Codex vraagt tijdens 002C.7 niet om deze stappen uit te voeren.

## 30. Deferred Items

- Cloudflare-account, zone, leden, 2FA, recovery en DPA-acceptatie;
- echte TransIP-export en Cloudflare-import/reconciliatie;
- controle van TransIP DNSSEC-interface voor externe nameservers;
- origin-certificaatrenewal met externe DNS/proxy;
- onafhankelijke monitoringactivatie;
- off-provider opslag van cutover-/DNS-recoverybewijs;
- sender/mailboxinventaris en DKIM-C-conflictoplossing;
- wildcardverwijdering;
- canonical `www`→apex redirect;
- Experience-proxying en routecompatibiliteit;
- Workspace/API/Access/connectorontwerp;
- WAF/custom/bot/rate-limit/cache rules;
- paid plan;
- 002C.8 en iedere productiehandeling.

## 31. Open Questions

1. Welk recovery-onafhankelijk accountmailadres wordt eigenaar van Cloudflare?
2. Zijn DPA, subprocessors, internationale transfers en privacyverklaring menselijk/juridisch acceptabel?
3. Hoe beheert TransIP bij externe nameservers exact de parent-DS voor `.nl`?
4. Blijft TransIP Let's Encrypt automatisch vernieuwen met Cloudflare authoritative DNS en proxy?
5. Welke niet-publiek geïnventariseerde records/verificatiewaarden staan in de actuele TransIP-export?
6. Welke wildcardhosts worden werkelijk gebruikt?
7. Welke onafhankelijke edge- én originmonitor is vóór cutover operationeel?
8. Welke veilige origincheck is op shared hosting mogelijk zonder een geheim endpoint?
9. Moet Experience ooit worden geproxied, en welke volledige route-/sessietest bewijst dat?
10. Is gedeeltelijke originblootstelling via DNS-only hosts als huidige shared-hostingbeperking acceptabel?
11. Wie autoriseert Fara-gerelateerde wijzigingen als een gedeelde providerblast-radius ontstaat?

## 32. GO / NO-GO Recommendation

### A — Cloudflare Free is architectonisch zinvol voor WBD

**GO.** Het is een waardevolle aanvullende edge-laag, niet de foundation en niet urgent.

### B — Cloudflare-account mag na menselijke beoordeling worden aangemaakt

**CONDITIONAL GO.** Pas na owner-, recoverymail-, 2FA-, Bitwarden-, voorwaarden-/DPA- en privacyreview met afzonderlijke Human GO. Niet uitvoeren in 002C.7.

### C — Zone mag zonder cutover worden toegevoegd

**CONDITIONAL GO.** Pas na B, actuele TransIP-export en bewijs dat import proxy-off gebeurt. Geen nameserver- of productie-effect toestaan. Niet uitvoeren in 002C.7.

### D — 002C.8 nameserver/edge cutover mag worden voorbereid

**NO-GO CURRENTLY.** Maak dit pas GO wanneer CF-H1–H5 klaar zijn, onafhankelijke monitoring actief is, alle records matchen, origin-TLS-renewal is bevestigd en recoverybewijs off-provider beschikbaar is.

### E — daadwerkelijke nameserver/DNSSEC cutover

**NO-GO.** Vereist een afzonderlijke expliciete productie-GO na alle gates, actuele providerherverificatie en een bemenst rollbackwindow.

Er is geen Cloudflare-account of zone aangemaakt en geen configuratie of productie gewijzigd. Project 002C.8 is niet gestart.
