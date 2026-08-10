# Project 002C.5 — DNS, Canonical & Mail-auth Hygiene

**Datum:** 7 augustus 2026  
**Status:** **GO — read-only ontwerpbaseline gereed; NO-GO voor iedere DNS-, redirect- of mailwijziging zonder afzonderlijke preflight en Human GO**  
**Productie-impact:** geen

## Bewijsstatus

- **VERIFIED** — publiek of rechtstreeks in de repository bevestigd.
- **DOCUMENTED BUT NOT VERIFIED** — canoniek beschreven, maar in 002C.5 niet onafhankelijk herbevestigd.
- **UNKNOWN** — niet aantoonbaar.
- **RECOMMENDATION** — voorgestelde toekomstige toestand.
- **CONFLICT** — records of bronnen zijn technisch niet in overeenstemming.
- **HUMAN VERIFICATION REQUIRED** — alleen veilig via bevoegde mens/provider/mailheadercontrole vast te stellen.

---

## 1. Executive Summary

WBD gebruikt aantoonbaar TransIP als registrar/authoritative DNS voor `webuildanddesign.nl` en `faraouderenzorg.nl`. Beide zones publiceren de drie TransIP-nameservers, een DS-record met algoritme 13/digesttype 2, dual-stack webrecords, één TransIP-MX, één syntactisch geldig SPF-record, drie DKIM-selector-CNAME's en DMARC `p=none`. Er is geen CAA-record. **VERIFIED op 2026-08-07**

De WBD-apex is inhoudelijk als canonical ingericht: de HTML, `robots.txt` en sitemap wijzen naar `https://webuildanddesign.nl`. De transportlaag is echter niet volledig canonical: apex en `www` geven via HTTPS beide `200` met dezelfde lengte en ETag, en `/diensten` plus `/diensten/` geven eveneens beide `200`. **VERIFIED**

De huidige mailauthbasis is geschikt voor de gedocumenteerde TransIP-mailstroom, maar niet klaar voor verharding. SPF gebruikt `~all`; actuele echte afzenders en alignment zijn niet uit mailheaders bewezen; DMARC heeft geen rapportageadres; en de gepubliceerde `transip-c`-selector wijst publiek naar een ontbrekend doel terwijl selectors A en B wel op RSA-public keys uitkomen. De C-selector is daarom **CONFLICT / HUMAN VERIFICATION REQUIRED**, niet automatisch een verwijderkandidaat.

**Besluit:** 002C.5 is **GO als ontwerpbaseline**. Alle daadwerkelijke wijzigingen zijn **NO-GO** totdat de betreffende kleine vervolgopdracht eigen bronbewijs, rollback, observatievenster en expliciete Human GO heeft.

---

## 2. Scope

Binnen scope: publieke DNS/HTTP-inspectie, canonical en mailauthanalyse, risico-/wijzigingsclassificatie, monitoring/recoverykoppeling, change sequence en generieke secretvrije repositoryguardrails.

Buiten scope: DNS, nameservers, DNSSEC, mailrecords, redirects, hosting, mailboxen, certificaten, Cloudflare, accounts, monitoring, backups of productie wijzigen; mailboxinhoud/credentials/secrets lezen; een vervolgopdracht uitvoeren.

---

## 3. Evidence Reviewed

| Bron | Gebruik | Status |
|---|---|---|
| 002A TransIP Infrastructure Foundation | zones, hosting, mail, SSL en ownership | canoniek voorgangerbewijs |
| 002B Security/Recovery Baseline | gemaskeerde DNS-export, account/recoverygrens | canoniek voorgangerbewijs |
| 002C.1–002C.4 baselines | doelarchitectuur, release/Human GO, monitoring en DNS-recovery | canoniek voorgangerbewijs |
| `infrastructure/TRANSIP-DNS-EXPORT-2026-08-05.json` | volledige zonevergelijking; verificatiewaarden gemaskeerd in analyse | **VERIFIED repositorybewijs** |
| publieke DNS via systeemresolver en Google validating resolver | A/AAAA/CNAME/MX/TXT/NS/DS/CAA, SPF-chain, DKIM targets | **VERIFIED 2026-08-07** |
| publieke HTTP(S)-responses | status, redirects, headers, ETag, robots/sitemap/canonical | **VERIFIED 2026-08-07** |
| repositorymail-/canonicalscan | mailto versus echte verzending; static canonical | **VERIFIED** |
| officiële TransIP-, Cloudflare- en RFC-documentatie | provider- en standaardenboundary | actuele primaire bronnen |

Bewijsgrenzen: geen TransIP-, mailbox-, registrar-, Cloudflare- of Bitwardenlogin; geen mailheaders of mailinhoud; geen providerconfig; geen volledige gevoelige TXT-verificatiewaarden. Tijdens enkele aanvullende bodyprobes trad tijdelijke connectiviteitsschommeling op; succesvolle metingen en DNS-antwoorden zijn afzonderlijk beoordeeld en er is geen outageconclusie uit één mislukte probe getrokken.

---

## 4. Domain Inventory

| Domein/host | Functie | DNS/provider | Eigenaar | Impact | Status |
|---|---|---|---|---|---|
| `webuildanddesign.nl` | WBD publieke canonical, maildomein | TransIP | WBD | productie/web/mail | **VERIFIED** |
| `www.webuildanddesign.nl` | alias van apex; nog geen hostredirect | TransIP | WBD | web/SEO/caching | **VERIFIED** |
| `preview.webuildanddesign.nl` | publieke noindex releasecontrolehost | TransIP | WBD | review/releasebewijs | **VERIFIED** |
| `experience.webuildanddesign.nl` | publieke Experience-ingang | TransIP | WBD | applicatie/data | **VERIFIED** |
| `faraouderenzorg.nl` | zelfstandige WordPress-site en maildomein | TransIP | houder in account WBD; contractuele eindhouder open | klant/web/mail | technisch **VERIFIED**; governance **HUMAN VERIFICATION REQUIRED** |
| `www.faraouderenzorg.nl` | alias, HTTPS redirect naar apex | TransIP/WordPress | idem | klantweb | **VERIFIED** |

Geen zelfstandig Sportpaleis-domein, staging-, Workspace-, Atlas-, Observatory- of statusdomein is in het TransIP-account aangetoond. De wildcard laat enkele niet-expliciete namen wel resolven; dat bewijst geen werkende service.

---

## 5. Current DNS State

### `webuildanddesign.nl`

| Recordgroep | TTL | Veilige samenvatting | Functie/risico | Status |
|---|---:|---|---|---|
| apex A/AAAA | 300 | TransIP shared-hosting IPv4/IPv6 | productie | **VERIFIED** |
| wildcard A/AAAA | 300 | zelfde targets als apex | onbekende hosts resolven; TLS/routingverwarring | **VERIFIED / ATTENTION** |
| `www` CNAME | 300 | apex | DNS-alias, geen HTTP-canonicalisatie | **VERIFIED** |
| `preview`, `experience` A/AAAA | 3600 | WBD shared hosting | expliciete services | A **VERIFIED**; AAAA export **DOCUMENTED BUT NOT VERIFIED** |
| MX | 300 | prioriteit 10, `mx.transip.email` | één publiek MX-hostname; providerredundantie niet aantoonbaar | **VERIFIED** |
| SPF TXT | 300 | `include:_spf.transip.email ~all` | provider-only autorisatie, softfail | **VERIFIED** |
| DKIM CNAME A/B/C | 3600 | TransIP targets | A/B resolven; C-target ontbreekt | **CONFLICT** |
| mail-auth TXT | 300 | twee verschillende waarden, volledig gemaskeerd | TransIP platformverificatie; niet als letterlijke duplicate behandelen | telling **VERIFIED** |
| DMARC TXT | 300 | `p=none`, geen rapportage | observeert zonder zichtbare reporting/enforcement | **VERIFIED** |
| autoconfig/autodiscover | 300 | TransIP mailtargets | clientconfig | export **DOCUMENTED BUT NOT VERIFIED** |
| NS | 86400 | `ns0.transip.net`, `ns1.transip.nl`, `ns2.transip.eu` | authoritative DNS | **VERIFIED** |
| DS | 3600 | algoritme 13, digesttype 2; digest gemaskeerd | DNSSEC-delegatie | **VERIFIED** |
| CAA | n.v.t. | geen answer | geen expliciete CA-beperking | **VERIFIED afwezig** |

### `faraouderenzorg.nl`

Dezelfde mail- en nameserverbasis is publiek zichtbaar. Apex/wildcard A/AAAA en `www`/`ftp` gebruiken TTL 3600; MX/SPF/DMARC hebben TTL 3600; twee mail-auth-TXT's hebben TTL 300. DKIM A/B zijn bruikbaar gepubliceerd en C heeft dezelfde ontbrekende targetconflict. CAA ontbreekt. **VERIFIED waar publiek opnieuw gemeten; overige exacte records DOCUMENTED BUT NOT VERIFIED via export**

Geen record is in 002C.5 gewijzigd.

---

## 6. Canonical Host Assessment

| Controle | Waarneming | Status |
|---|---|---|
| `http://webuildanddesign.nl/` | 301 naar HTTPS-apex | **VERIFIED** |
| `http://www.webuildanddesign.nl/` | 301 naar HTTPS-`www` | **VERIFIED** |
| HTTPS apex / `www` | beide 200, 2571 bytes en dezelfde ETag | **VERIFIED — canonical redirect ontbreekt** |
| canonical/OG in HTML | apex-URL | **VERIFIED** |
| robots/sitemap | sitemap verwijst uitsluitend naar HTTPS-apex | **VERIFIED** |
| `/diensten` / `/diensten/` | beide 200 met dezelfde ETag; geen slashredirect | **VERIFIED** |
| Fara `www` | HTTPS 301 naar Fara-apex | **VERIFIED** |

**RECOMMENDATION:** houd `https://webuildanddesign.nl` als enige WBD-canonical. Implementeer later op de vroegste betrouwbare hosting/routinglaag een permanente `308` van `www` naar apex, met behoud van path en query. `301` is acceptabel als het platform geen betrouwbare 308 ondersteunt. Vermijd een app-only JavaScriptredirect.

Kies voor publieke WBD-routes één slashvorm; de sitemap gebruikt geen trailing slash. Een route als `/diensten/` kan daarom later 308 naar `/diensten`, behalve `/`. Corrigeer tegelijk route-specifieke server-rendered canonical/OG-metadata: de huidige statische HTML declareert voor iedere SPA-route aanvankelijk de homepagecanonical.

Risico's: redirectloop, dubbel HTTP→HTTPS→hosthop, verloren query, cache van foutieve permanent redirect, cookie-domainverschil, preview/Experience onbedoeld meenemen en monitoren van de verkeerde host. Rollback: herstel exact de vorige routingconfig en valideer daarna beide hosts/routes. Preview en Experience worden niet naar de apex gecanonicaliseerd.

---

## 7. SPF Assessment

- precies één effectief apex-SPF-record per zone; **VERIFIED**;
- syntaxis is geldig en eindigt in `~all` (softfail); **VERIFIED**;
- top-level bevat één include; `_spf.transip.email` bevat nog één include en IP-mechanismen; twee DNS-lookupmechanismen liggen onder de RFC-limiet van tien; **VERIFIED op meetmoment**;
- geen `redirect`, `a`, `mx` of expliciete IP-mechanismen in het WBD-record zelf;
- providerinclude kan wijzigen; de eigenaar van het domein beheert die inhoud niet;
- `~all` voorkomt spoofing niet hard, maar wijzigen naar `-all` kan legitieme onbekende afzenders blokkeren.

| Afzenderklasse | Beeld |
|---|---|
| VERIFIED SENDERS | geen afzonderlijke echte verzendstroom via headers bewezen |
| DOCUMENTED SENDERS | menselijke mailbox via TransIP; repository toont publieke WBD-contactmailbox |
| UNKNOWN SENDERS | aliases/forwarding, boekhouding/facturatie, hosting/PHP, externe campagnes of SaaS |
| POSSIBLE LEGACY SENDERS | Fara WordPress/PHP en oudere derde partijen; alleen menselijke/providercontrole kan dit sluiten |

**NO-GO voor SPF-wijziging** totdat representatieve uitgaande mailheaders per werkelijke use case `smtp.mailfrom`, `header.from`, SPF en DKIM alignment bewijzen. Volledige mailinhoud hoeft daarvoor niet te worden gedeeld.

---

## 8. DKIM Assessment

| Selector | Publieke keten | Beoordeling |
|---|---|---|
| `transip-a` | CNAME → TransIP → RSA public key, consistent met 2048 bit | **VERIFIED** |
| `transip-b` | CNAME → TransIP/securemail target → RSA public key, consistent met 2048 bit | **VERIFIED** |
| `transip-c` | CNAME bestaat, eindtarget geeft publiek NXDOMAIN | **CONFLICT / HUMAN VERIFICATION REQUIRED** |

Dit geldt voor beide zones. Een ontbrekende C-target bewijst niet dat actuele mail faalt: alleen een daadwerkelijk gebruikte selector in `DKIM-Signature` bepaalt de actieve stroom. Verwijder of herstel C pas nadat TransIP bevestigt welke selectors het actuele platform gebruikt en representatieve headers dit ondersteunen. Private DKIM keys zijn niet gezocht of gelezen. Rotatiebeleid is **UNKNOWN**.

---

## 9. DMARC Assessment

Beide zones publiceren één geldig record: `v=DMARC1; p=none;`. **VERIFIED**

- `sp` ontbreekt: subdomeinbeleid is niet afzonderlijk gespecificeerd;
- `adkim` en `aspf` ontbreken: relaxed alignment is de standaard;
- `rua` en `ruf` ontbreken: geen zichtbare aggregate/forensic rapportagestroom;
- huidig beleid vraagt geen quarantine/reject;
- daadwerkelijke DMARC-passes zijn zonder headers/rapporten **UNKNOWN**;
- RFC 9989 heeft de oude `pct`-samplingtag verwijderd; een toekomstige rollout mag niet vertrouwen op percentagehandhaving.

Veilige volwassenheidsroute:

```text
OBSERVE MET RUA
        ↓
VALIDATE ALLE WERKELIJKE SENDERS
        ↓
ALIGN SPF EN/OF DKIM
        ↓
QUARANTINE ALS VOLLEDIGE POLICY
        ↓
REJECT ALLEEN NA BEWEZEN NORMALE BEDRIJFSCYCLI
```

Rapportage kan technische bron-IP's en domeinmetadata bevatten. De beheerder kiest daarom zelf een role mailbox of passende verwerker, beoordeelt DPA/retentie/toegang en deelt geen ruwe rapporten in de repository.

---

## 10. Sender Inventory

| Use case | Technische verzendstatus | Bewijsstatus |
|---|---|---|
| menselijke WBD-mailbox | TransIP gedocumenteerd | **DOCUMENTED SENDER; alignment HUMAN VERIFICATION REQUIRED** |
| WBD publieke website | alleen `mailto:`; geen server-side mailtransport gevonden | **VERIFIED geen geautomatiseerde sender** |
| Experience | geen SMTP/API-mailtransport in repository gevonden | repository **VERIFIED**; productieconfig **UNKNOWN** |
| WBD Workspace communication engine | expliciet niet gebouwd | **VERIFIED** |
| Fara WordPress | kan platform/PHP/pluginmail gebruiken; configuratie niet onderzocht | **POSSIBLE LEGACY SENDER** |
| facturatie/boekhouding/campagnes/derden | geen aantoonbare mailprovider in scope | **UNKNOWN** |
| analytics/verificatie | DNS-verificatie is geen mailafzender | als sender **NOT APPLICABLE** |

De generieke registers staan in `dns/SENDER-REGISTER.schema.json` en `dns/SENDER-REGISTER.example.json`. Geen persoonlijke mailbox of echte providercredential is opgenomen.

---

## 11. MX / Receiving Mail

Beide apexzones publiceren één MX-record met prioriteit 10 naar `mx.transip.email`; die hostname is dual-stack bereikbaar via één publiek IPv4- en één IPv6-adres op het meetmoment. **VERIFIED**

Dit bewijst de route naar TransIP, niet de interne providerredundantie, mailboxlijst, catch-all, aliases, forwarding of deliverability. De onafhankelijke recoverymail uit 002B wordt bewust niet geïdentificeerd en hoeft geen DNS-record in deze zones te hebben. Afwijkende subdomein-MX-records zijn niet aangetoond. Iedere MX-wijziging is Class 4 en **NO-GO** zonder mailboxinventaris, ontvang-/verzendtest, backup en rollback.

---

## 12. CAA / Certificate Boundary

CAA ontbreekt op beide zones. Zonder CAA blijft publieke CA-uitgifte toegestaan; TransIP documenteert dat Let's Encrypt standaard voor webhosting wordt gebruikt en dat een aanwezige CAA Let's Encrypt expliciet moet toestaan. **VERIFIED als publieke toestand en providerclaim**

CAA toevoegen is geen cosmetische quick win. Eerst moeten actuele certificaatissuer/SAN's voor apex, `www`, preview, Experience en Fara extern en in het providerpaneel worden bevestigd. Daarna kan alleen de werkelijk benodigde issuer worden toegestaan. Een latere Cloudflare-cutover kan een andere issuer- en proxyboundary introduceren en hoort in 002C.7/002C.8. Geen CAA/SSL-wijziging is nu toegestaan.

---

## 13. DNSSEC / Nameserver Boundary

- beide zones gebruiken publiek `ns0.transip.net`, `ns1.transip.nl`, `ns2.transip.eu`; **VERIFIED**;
- voor beide zones bestaat een DS-record met algoritme 13/digesttype 2 en een validating resolver gaf authenticated data; **VERIFIED actief**;
- TransIP documenteert dat DNSSEC automatisch actief is bij de standaardnameservers; **providerclaim VERIFIED**;
- registrar en authoritative DNS delen nu de TransIP-failure/administratieboundary.

Een toekomstige Cloudflare Full Setup vervangt de authoritative nameservers. Cloudflare waarschuwt dat nameserverwissel met de oude DS/DNSSEC-keten bereikbaarheid kan breken. Zonder aantoonbare multi-signerondersteuning is de veilige hoofdroute: volledige zonepariteit → oude DNSSEC/DS gecontroleerd uitschakelen → DS-TTL volledig laten verlopen → nameservers wisselen → resolutie/mail/web valideren → Cloudflare DNSSEC inschakelen en nieuwe DS bevestigen. Dit blijft volledig uitgesteld naar 002C.7/002C.8.

---

## 14. TTL / Change Safety

### BEFORE CHANGE

1. verse gemaskeerde export plus private volledige export buiten repository;
2. recordowner, werkelijke web/mailafhankelijkheid en risicoklasse;
3. huidige authoritative en twee publieke resolverantwoorden;
4. TTL en maximaal cachevenster;
5. exacte vorige/nieuwe/rollbackwaarde;
6. testmatrix, timestamp en expliciete Human GO.

### DURING CHANGE

- één logisch blok; geen ongerelateerde records;
- exacte provideractie, tijd en change-ID;
- geen tokens in screenshots/logs;
- observeer minstens huidige TTL en providerverwerking voordat een conclusie volgt.

### AFTER CHANGE

- authoritative plus twee publieke resolvers;
- DNSSECvalidatie;
- webstatus/redirect/canonical/TLS of mail send/receive/alignment volgens class;
- 002C.3-monitorcontext en incidentcontrole;
- expliciet GO of rollback; bewijs aan template koppelen.

TTL vooraf verlagen is alleen zinvol bij een geplande targetwijziging wanneer de lagere TTL ruim vóór de change door bestaande caches is gegaan. Het helpt niet retroactief, verandert geen DS/registrar-TTL en kan bij een niet-doorgevoerde change onnodige querylast en verwarring creëren. Herstel TTL pas na stabiele validatie.

---

## 15. Change Classification

| Class | Voorbeeld | Preflight/GO | Validatie | Rollback/observatie |
|---|---|---|---|---|
| 0 — Documentation only | register/template | review; geen productie-GO | JSON/docs | Git-revert; geen wachttijd |
| 1 — Low-risk public hygiene | bewezen obsolete verificatie-TXT | owner + dependencybewijs + GO | authoritative + twee resolvers | vorige waarde; ≥ huidige TTL |
| 2 — Web routing/canonical | `www`, slash, wildcard, CAA | release/preflight + productie-GO | paths/queries/TLS/canonical/cache/monitor | vorige routing/record; ≥ TTL + 30 min stabiel |
| 3 — Mail authentication | SPF, DKIM, DMARC | sender/headerbewijs + aparte mail-GO | representatieve senders/receivers/alignment/reports | exact vorig record; ≥ TTL + normale mailcyclus |
| 4 — Mail routing/nameservers/DNSSEC | MX, NS, DS | volledige zone/mail/DNSSEC-preflight + change-window GO | authoritative/recursive/DNSSEC/send/receive | vooraf bewezen rollback; minimaal 24 uur observatie |

De hoogste geraakte class bepaalt de change. Een tekstueel kleine wijziging wordt niet lager ingeschaald vanwege regelgrootte.

---

## 16. Monitoring Integration

Toekomstige 002C.3-signalen:

- DNS resolve/DS validatie faalt;
- apex/`www` canonical redirect of routecanonical wijkt af;
- certificaathostname mismatch/expiry;
- MX of SPF ontbreekt/ongeldig;
- DKIM-selector target ontbreekt;
- DMARC ontbreekt/ongeldig of verwachte reporting stopt;
- veranderde recordset buiten maintenance;
- propagatie niet afgerond binnen changebudget;
- monitor target gebruikt niet-canonical host.

Gezond is stil. Dedupe per `organisation + zone + capability + signal_type`; geen alert per record/resolver. Monitoring wordt niet gebouwd of geactiveerd.

---

## 17. Backup / Recovery Integration

Vóór iedere Class 1–4 change worden vastgelegd: zone, recordtype/naam, gemaskeerde huidige waarde, private volledige exportlocatie onder menselijke controle, TTL, timestamp, owner, reden, exacte rollbackwaarde en evidence reference. DNSSEC/NS-changes vereisen ook DS/NS/SOA-snapshot en registrarstatus.

Publieke verificatie-TXT kan technisch publiek zijn, maar volledige tokens worden niet in een breed repositoryregister gedupliceerd. De repository bewaart doel, fingerprint/masked summary en bewijsstatus; de volledige providerexport staat versleuteld off-provider volgens 002C.4. Herstel is een expliciete change, geen automatisch script.

---

## 18. Atlas / Workspace Future Integration

```text
DNS / MAIL SOURCE
        ↓
PROVIDER-NEUTRAL NORMALIZER
        ↓
INFRASTRUCTURE OBSERVATION
        ↓
ATLAS INTERPRETATION
        ↓
WORKSPACE ATTENTION / TRUST STATUS
```

Atlas onderscheidt: `present`, `syntactically_valid`, `supports_verified_system`, `conflict`, `verification_stale`, `change_in_progress`, `rollback_available` en `human_action_required`. Resolver-/providerstatus is bewijs, geen automatisch besluit. De normalizer neemt geen volledige verificatietokens, mailheaders, mailadressen, DKIM-keymaterial, credentials of mailinhoud over. Connector/UI worden niet gebouwd.

---

## 19. Security & Privacy

- uitsluitend publieke DNS en publieke webresponses zijn onderzocht;
- verificatie-TXT en DS-digest zijn in rapportage gemaskeerd;
- publieke DKIM keydata is alleen op type/bruikbaarheid beoordeeld en niet gereproduceerd;
- geen mailboxinhoud, persoonlijke mailheaders, providercredentials, `.env`, private key, recoverycode of Bitwarden-inhoud;
- changebewijs bevat geen cookie-/sessiewaarden, persoonsgegevens of ruwe DMARC-rapporten;
- toegang tot provider, registrar, mailbox, rapportageprovider en secret store blijft menselijk;
- account-, mail- en DNSwijzigingen vereisen least privilege en afzonderlijke GO.

---

## 20. Repository Guardrails

Toegevoegd:

- dit canonieke document;
- `dns/DNS-REGISTER.schema.json` en secretvrij voorbeeld;
- `dns/SENDER-REGISTER.schema.json` en secretvrij voorbeeld;
- `dns/DNS-CHANGE-EVIDENCE-TEMPLATE.md`;
- README-indexverwijzing.

Niet toegevoegd: DNS-managementcode, provider-SDK, API-token, deployment, monitor, webhook, mailconnector, Atlasconnector of Workspace-UI. Registers zijn evidence, geen uitvoerinstructies.

---

## 21. Proposed Change Sequence

| Vervolg | Doel | Class/impact | Human action en GO | Rollback/dependencies |
|---|---|---|---|---|
| 002C.5A | werkelijke sender-/mailbox-/aliasinventaris en representatieve alignmentheaders | 0; geen productie | mens controleert provider/mailheaders; GO voor vastlegging | geen DNS; prerequisite alle mailchanges |
| 002C.5B | WBD `www`→apex, slashbeleid en routecanonical corrigeren | 2; productie/SEO/cache | exacte hosting/release-GO | vorige routing/build; monitoring/preflight vereist |
| 002C.5C | SPF behouden of minimaal aanpassen op bewezen senders | 3; deliverability | senderregister + aparte mail-GO | exact vorig SPF; 5A vereist |
| 002C.5D | DKIM-C met TransIP en headers verklaren; alleen zo nodig herstellen/verwijderen | 3; signing | providercontrole + aparte mail-GO | exacte CNAME; 5A vereist |
| 002C.5E | eerst DMARC `p=none` reporting, daarna eventueel quarantine/reject | 3; deliverability/privacy | reportingkeuze/DPA + GO per fase | vorig DMARC; 5A/C/D en representatieve observatie vereist |
| 002C.5F | wildcard-impactinventaris en expliciete hostmatrix | 0; geen productie | menselijke servicecheck | prerequisite eventuele wildcardchange |
| 002C.5G | wildcard A/AAAA alleen na 5F gericht verwijderen/vervangen | 2; hostrouting/TLS | afzonderlijke DNS-GO | exacte wildcardwaarden; ≥ TTL |
| 002C.5H | issuer/SAN-verificatie en afzonderlijk CAA-besluit | 0 preflight; latere CAA class 2 | provider/TLS-check + aparte DNS-GO | vorige “geen CAA”; Cloudflareboundary respecteren |
| 002C.5I | finale DNS/mailauthvalidatie en evidence closure | 0; read-only | menselijke eindbeoordeling | alle uitgevoerde changebewijzen |

Geen vervolg is in deze opdracht gestart.

---

## 22. Human Actions

1. Bevestig contractuele eigenaar en changebevoegdheid voor Fara vóór elke Fara-change.
2. Inventariseer menselijke mailboxen, aliases, forwarding, catch-all en verzendende systemen in TransIP.
3. Verzamel per echte sender uitsluitend gemaskeerde `Authentication-Results`, `DKIM-Signature d= / s=`, `header.from` en `smtp.mailfrom`; geen body.
4. Vraag TransIP waarom selector C ontbreekt en welke selectors actief zijn.
5. Kies DMARC-reporting mailbox/provider, DPA, toegang en retentie.
6. Review WBD canonical target, slashbeleid, path/querybehoud en hostingimplementatie.
7. Verifieer actuele certificaatissuer/SAN's vóór CAA.
8. Geef per kleine wijziging een exacte Human GO met before/after/rollback en change-ID.

---

## 23. Deferred Items

- alle DNS-, redirect-, SPF-, DKIM-, DMARC-, MX-, CAA-, DNSSEC- en NS-wijzigingen;
- sender/mailbox/providercontrole;
- DMARC-reportingaccount en rapportverwerking;
- monitoringactivatie;
- private volledige off-provider DNS-export;
- Cloudflare-preflight/cutover (002C.7/002C.8);
- mailplatform/transactionele provider;
- Atlasnormalizer en Workspace-interface;
- Project 002C.6.

---

## 24. Open Questions

1. Welke mailboxen, aliases, forwarders en derde partijen verzenden werkelijk voor beide zones?
2. Welke `header.from`/envelope-from/DKIM-domeinen alignen in representatieve headers?
3. Is DKIM-C actief, legacy of een providerpublicatiefout?
4. Welke menselijke/providerredundantie zit achter het ene MX-hostname?
5. Welke onbekende services gebruiken de wildcard of verificatie-TXT's?
6. Moet Fara technisch door WBD worden gewijzigd en wie geeft daarvoor juridisch GO?
7. Welke DMARC-reportingroute is privacy- en kostenmatig passend?
8. Welke TransIP-laag kan éénhop-`www`-canonicalisatie veilig uitvoeren?
9. Welke CA's zijn voor alle huidige hosts werkelijk nodig?
10. Wanneer worden Cloudflare/DNSSEC en nameservercutover afzonderlijk gepland?

---

## 25. GO / NO-GO Recommendation

### Ontwerpbaseline

**GO.** De actuele publieke DNS-/canonical-/mailauthstatus, bewijsconflicten, sendergrens, risicoklassen, monitoring/recoverykoppeling, wijzigingsvolgorde, Human Actions en generieke guardrails zijn voldoende vastgelegd.

### Daadwerkelijke wijzigingen

**NO-GO.** Geen record of redirect mag veranderen voordat de betreffende 002C.5A–I-opdracht eigen preflight, ownerbewijs, exacte rollback, testmatrix, observatievenster en expliciete Human GO heeft. SPF/DKIM/DMARC blijven geblokkeerd door ontbrekende sender/alignmentverificatie. Fara blijft extra geblokkeerd door het open governancepunt.

### Expliciete afsluiting

Er zijn geen DNS-, mail-, nameserver-, DNSSEC-, redirect-, hosting-, SSL-, Cloudflare-, account- of productiewijzigingen uitgevoerd. Er zijn geen secrets, mailboxinhoud, private keys, recoverycodes, volledige verificatietokens of Bitwarden-inhoud gelezen of gerapporteerd. Credits/facturatie waren niet zichtbaar.

Project 002C.6 is niet gestart. Eerst volgt menselijke beoordeling en afzonderlijke expliciete GO.

### Primaire externe bronnen

- TransIP: <https://www.transip.nl/knowledgebase/ik-wil-mijn-e-mail-overzetten-naar-transip>
- TransIP: <https://www.transip.nl/knowledgebase/6985-let-s-encrypt-voor-webhosting/>
- TransIP: <https://www.transip.nl/knowledgebase/1593-de-transip-nameservers>
- TransIP: <https://www.transip.nl/knowledgebase/150-domeinnaam-nameservers-gebruikt-beveiligen-dnssec/>
- Cloudflare: <https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/>
- Cloudflare: <https://developers.cloudflare.com/dns/dnssec/>
- RFC 7208 (SPF): <https://www.rfc-editor.org/info/rfc7208/>
- RFC 9989 (DMARC): <https://www.rfc-editor.org/info/rfc9989/>
- RFC 8659 (CAA): <https://www.rfc-editor.org/rfc/rfc8659.html>

