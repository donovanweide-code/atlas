# Project 002 — Workspace + Atlas Cost Validation

Datum: 2026-08-10  
Status: besluitvoorstel vóór HUMAN + COST GO  
Scope: read-only kosten-, capaciteit- en herstelvalidatie; geen bestelling, activatie, deployment, DNS- of productiewijziging

## Besluit in één zin

Kies voor de eerste pilot de TransIP VPS met **2 shared vCPU, 4 GB RAM en 100 GB NVMe**, met de automatische VPS-back-up en offsite VPS-back-up. Dit is de kleinste professionele start die de huidige begrensde Workspace + Atlas-runtime verantwoord kan dragen. Reserveer de 8 GB-configuratie als meetbaar schaalpad. Object Store is nuttig maar geen verplichte pilotkosten zolang uploads beperkt of uitgeschakeld zijn en de opslaggrens technisch vervangbaar blijft.

## 1. Reconciliatie van de eerder voorgestelde €65,20

De eerdere som is rekenkundig exact:

| Onderdeel | Exacte configuratie | Prijs per maand excl. btw | Functie | Waarom vóór pilot | Gevolg bij weglaten |
|---|---|---:|---|---|---|
| VPS | 4 shared vCPU, 8 GB RAM, 100 GB NVMe | €50,00 | Node-runtime voor Workspace + begrensde Atlas-kern, MariaDB, reverse proxy, logging en OS-services | Alleen nodig wanneer de extra groei- en burstmarge nu bewust wordt gekocht | De 4 GB-optie kan de begrensde pilot dragen, maar heeft minder marge voor gelijktijdige belasting en toekomstige workers |
| VPS-back-up | Elke 4–6 uur een volledige VPS-kopie, negen recente herstelpunten en vijf wekelijkse herstelpunten | €5,00 | Providerherstel van de volledige VPS | **Verplicht**: zonder automatisch herstelpad is een eerste echte order onverantwoord | Alleen handmatige dumps; geen snel volledig VPS-herstel na corruptie of systeemverlies |
| Offsite VPS-back-up | Kopie van de providerback-ups in een andere TransIP availability zone | €10,00 | Bescherming tegen verlies van de primaire VPS-locatie | **Verplicht**: voorkomt dat VPS en providerback-up in dezelfde zone de enige herstelroute zijn | Een locatie-/zone-incident kan VPS en lokale herstelroute tegelijk raken |
| Object Store | Rekenbasis 20 GB à €0,01 per GB per maand | €0,20 | Private S3/SWIFT-objectopslag voor documenten, uploads en logische recovery-objecten | **Niet verplicht voor deze pilot**; veilig later toe te voegen via dezelfde storage-adaptergrens | Pilot kan starten met bijlagen uit of gecontroleerde lokale opslag; toekomstige documenten missen tijdelijk de betere objectopslaggrens |
| **Oorspronkelijke som** |  | **€65,20** |  |  |  |

De €65,20 was dus geen rekenfout. De correctie is een **classificatiecorrectie**: de €0,20 Object Store is nuttig en toekomstvast, maar niet verplicht om Workspace + de begrensde Atlas-kern veilig te starten. De verplichte 8 GB-basis is daardoor **€65,00 per maand excl. btw**. Met 20 GB Object Store blijft de eerder genoemde €65,20 een geldige optionele rekenvariant.

Bronnen: [TransIP VPS en actuele configuratieprijzen](https://www.transip.nl/vps/), [TransIP VPS-back-ups](https://www.transip.nl/vps/back-ups/), [TransIP uitleg automatische back-ups en restore](https://www.transip.nl/knowledgebase/296-automatische-back-ups-voor-vps/), [TransIP Object Store](https://www.transip.nl/object-store/).

## 2. Professionele configuratievergelijking

Alle prijzen zijn excl. btw en op 2026-08-10 gecontroleerd. Object Store staat apart als optionele uitbreiding en telt niet mee in de verplichte nieuwe maandprijs.

| Kenmerk | Optie A — kleinste professionele start | Optie B — aanbevolen groeibasis uit vorig voorstel |
|---|---:|---:|
| vCPU | 2 shared vCPU | 4 shared vCPU |
| RAM | 4 GB | 8 GB |
| Storage | 100 GB NVMe | 100 GB NVMe |
| VPS | €20,00 | €50,00 |
| VPS-back-up | €5,00 | €5,00 |
| Offsite VPS-back-up | €10,00 | €10,00 |
| Object Store verplicht | €0,00 | €0,00 |
| Object Store optioneel, 20 GB | + €0,20 | + €0,20 |
| **Verplichte nieuwe maandprijs** | **€35,00** | **€65,00** |
| Totale WBD/TransIP-maandprijs incl. bestaand WBD Webhosting Pro €15,99 | **€50,99** | **€80,99** |
| Geschatte vrije operationele RAM-marge | circa 1–2 GB / 25–50%, afhankelijk van cache en belasting | circa 5–6 GB / 60–75% |
| Belangrijkste beperking | Minder CPU-/RAM-burstruimte voor gelijktijdige imports, dumps, jobs en gebruikers | Hogere vaste kosten vóór gemeten behoefte |
| Sportpaleis-pilot | **JA**, mits processen begrensd, productiebuilds extern plaatsvinden en monitoring actief is | **JA**, met ruimere fout- en groeimarge |
| Eerste meerdere organisaties | **JA, conditioneel op werkelijk gemeten gebruik**; geen exact klantenaantal voorspellen | **JA**, meer ruimte voor meerdere capabilities en incidentele lichte jobs |
| Schaalpad | Verticale upgrade naar optie B zonder fundamentele architectuurwijziging | Later grotere VPS of aparte worker/database op basis van de gemeten bottleneck |

De vrije marge is een engineeringraming, geen gemeten productiewaarde. Voor optie A is een conservatieve geheugenbegroting:

| Procesgroep | Verwachte bandbreedte |
|---|---:|
| OS, systemd, kernel en page cache | 0,6–0,9 GB |
| Reverse proxy en lichte logging/monitoring | 0,1–0,2 GB |
| Eén Node-proces met Workspace + synchrone Atlas-kern | 0,4–0,9 GB |
| Eén getunede MariaDB-service met twee logisch gescheiden databases | 0,9–1,4 GB |
| Tijdelijke back-up-/logruimte in RAM | 0,2–0,4 GB |
| **Verwachte steady-state totaal** | **circa 2,0–3,0 GB** |

Optie A heeft daarmee geen grote overcapaciteit, maar begint ook niet op een technisch onverantwoorde grens. Builds horen niet op productie te draaien; alleen een vooraf gebouwd, versioned artifact wordt uitgerold. MariaDB-dumps worden buiten piekbelasting gepland.

## 3. Object Store — huidige noodzaak

### Noodzakelijk voor veilige backup/recovery

**Nee, niet zelfstandig.** Object Store is geen vervanging voor de VPS-back-up en is bovendien eveneens een TransIP-dienst. Het vormt daardoor geen echte off-provider recovery. Veilige recovery vereist vóór de eerste echte order:

1. de €5 automatische VPS-back-up;
2. de €10 offsite VPS-back-up in een andere TransIP availability zone;
3. dagelijkse consistente, versleutelde MariaDB logical dumps en een upload/objectmanifest;
4. een versleutelde recoveryset op een WBD-gecontroleerde locatie buiten TransIP;
5. minimaal één geslaagde geïsoleerde restoretest.

### Noodzakelijk voor uploads/documenten

**Alleen wanneer uploads/documenten operationeel worden aangezet.** De bestaande ontwikkelopslag met base64-bijlagen in JSON is niet geschikt voor productie. Voor de pilot zijn daarom twee veilige routes mogelijk:

- bijlagen uitgeschakeld totdat Object Store beschikbaar is; of
- beperkt, private filesystemgebruik achter een storage-adapter, met type-/magic-byte-/size-/hashvalidatie, autorisatie, quota, back-up, manifest en restoretest.

### Document Intake en toekomst

Object Store is de juiste toekomstige grens voor Document Intake, grotere uploads, exports en objectretentie. Het is daarom **aanbevolen zodra deze capability wordt geactiveerd**, maar dat maakt het nog geen verplichte kostenpost voor de huidige pilot.

### Later toevoegen

Object Store kan zonder fundamentele architectuurwijziging later worden toegevoegd wanneer de applicatie vanaf de productiestart alleen object-ID's/metadata opslaat en opslag via één adapter benadert. De overgang wordt dan een gecontroleerde adapterconfiguratie en eventuele objectmigratie, geen herbouw van het domeinmodel.

## 4. Back-up en herstel

De automatische TransIP-back-up maakt volledige kopieën van de VPS. Data op de VPS-schijf — inclusief MariaDB-databestanden en lokale uploads — valt fysiek binnen die kopie. Dat betekent niet automatisch dat iedere databasekopie applicatie-consistent is. Daarom blijven logische MariaDB-dumps noodzakelijk.

Volgens TransIP worden negen recente volledige back-ups iedere 4–6 uur bewaard en daarnaast vijf wekelijkse herstelpunten. Restore is een **volledige VPS-restore**; de providerback-up is niet bedoeld als downloadbare of fijnmazige restore van één tabel of bestand. De €10 offsite-optie plaatst die back-ups in een andere TransIP availability zone, maar blijft bij dezelfde provider.

Object Store heeft een andere functie: objectopslag en eventueel een extra bestemming voor logische recovery-objecten. Het is geen off-provider back-up zolang het bij TransIP staat.

De minimale verantwoorde combinatie vóór de eerste echte Sportpaleis-order is daarom:

- automatische VPS-back-up;
- offsite VPS-back-up;
- dagelijkse versleutelde logische database-export;
- upload/objectmanifest met hashes;
- versleutelde kopie buiten TransIP;
- gedocumenteerde RPO/RTO en een geslaagde geïsoleerde hersteltest.

Wanneer nog geen bestaande WBD-gecontroleerde off-provider bestemming beschikbaar is, blijft daadwerkelijke productie een NO-GO totdat die herstelroute is gekozen en getest. Dat wijzigt de VPS-keuze niet en autoriseert geen nieuw abonnement.

## 5. Atlas-capaciteit op optie A

Optie A biedt voldoende initiële ruimte voor:

- één Node-runtime voor Workspace, capabilities en de synchrone Atlas-kern;
- Atlas als begrensde context-/reasoningmodule zonder eigen modelruntime;
- één MariaDB-service met afzonderlijke Workspace- en Atlas-databases en least-privilege users;
- TLS reverse proxy;
- begrensde applicatie-, security- en auditlogging;
- normale OS-services en monitoring.

Optie A is alleen passend onder de vastgelegde startgrenzen:

- geen autonome Atlas-connectors;
- geen zware achtergrondtaken;
- geen lokaal AI-model of GPU-runtime;
- geen productiebuilds op de VPS;
- maximaal één lichte job tegelijk wanneer later geactiveerd;
- resource- en latencybewaking vanaf de eerste pilotdag.

Workspace en Atlas hoeven niet hetzelfde datamodel of dezelfde database-user te delen. Ze mogen aanvankelijk wel in hetzelfde Node-releaseproces en dezelfde MariaDB-service draaien, mits modulegrenzen, twee databases, tenantcontext, audit en provenance afdwingbaar gescheiden blijven. Dat voorkomt nu onnodige operationele complexiteit en laat later een worker, Atlas-service of databasehost losmaken zonder de domeinarchitectuur te vervangen.

## 6. Meetbare schaaltriggers

Upgrade optie A naar optie B, of splits de aantoonbare bottleneck, zodra één harde trigger of twee terugkerende zachte triggers optreden:

### Harde triggers

- OOM-event, merkbare swap-thrashing of aanhoudende swap-I/O;
- schijfgebruik boven 70% of minder dan 90 dagen geprojecteerde vrije ruimte;
- restoretest haalt afgesproken RPO/RTO niet;
- activering van meer dan één structurele background job/connector tegelijk.

### Zachte triggers

- geheugen gedurende 15 minuten boven 70% of working set boven circa 2,8 GB;
- CPU p95 gedurende 15 minuten boven 60% in twee representatieve drukke vensters;
- API p95 boven 500 ms of databasequery p95 boven 250 ms, gekoppeld aan resource-/DB-druk;
- databaseconnectionpool boven 70%;
- oudste job langer dan 5 minuten in de queue.

De bottleneck bepaalt de vervolgstap: verticale VPS-upgrade bij algemene CPU/RAM-druk, aparte worker bij jobs/connectors en pas een aparte databasehost wanneer databasebelasting of herstelgrenzen dat aantoonbaar vereisen.

## 7. Kostenbesluit

### OPTIE A — KLEINSTE PROFESSIONELE START

Nieuwe maandkosten: **€35,00 excl. btw**  
Totale WBD/TransIP-maandkosten inclusief bestaande €15,99: **€50,99 excl. btw**  
Geschikt voor pilot: **JA**  
Belangrijkste compromis: beperkte burst- en jobmarge; monitoring en tijdig verticaal schalen zijn verplicht.

### OPTIE B — AANBEVOLEN GROEIBASIS

Nieuwe maandkosten: **€65,00 excl. btw**; **€65,20** wanneer 20 GB Object Store bewust direct wordt toegevoegd  
Totale WBD/TransIP-maandkosten inclusief bestaande €15,99: **€80,99 excl. btw**; **€81,19** inclusief 20 GB Object Store  
Geschikt voor pilot: **JA**  
Belangrijkste voordeel: ruimere fout-, groei- en gelijktijdigheidsmarge voor meerdere capabilities en lichte workers.

## Advies

**KIES OPTIE A.**

Redenen:

1. De huidige Atlas-startscope bevat geen autonome connectors, zware jobs of modelruntime.
2. Dezelfde duurzame proces-, database-, tenant-, storage- en recoverygrenzen blijven behouden; optie A veroorzaakt geen fundamentele technische schuld.
3. TransIP ondersteunt verticale VPS-upgrade; optie B is daardoor een direct schaalpad zodra metingen dit rechtvaardigen.
4. Back-up en offsite back-up blijven volledig behouden; de besparing komt niet uit het weglaten van herstelbaarheid.
5. Object Store blijft een gecontroleerde latere uitbreiding en wordt verplicht zodra documenten/uploads operationeel worden.

## Governance-uitkomst

- Geen betaalde dienst geactiveerd.
- Geen VPS besteld.
- Geen DNS, productieconfiguratie of deployment gewijzigd.
- Een daadwerkelijke implementatie blijft afhankelijk van afzonderlijke HUMAN + COST GO en alle eerdere productie-readinesscontroles.

