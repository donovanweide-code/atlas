# Sprint 004 — Controlled Livegang We Build And Design

**Status:** productie-GO behaald — gecontroleerd live
**Datum:** 26 juli 2026
**Focus:** stabiliteit → controle → livegang
**Geen nieuwe ontwerpfase:** bevestigd

---

## 1. Doel

De huidige publieke We Build And Design Experience gecontroleerd via de bestaande hostingomgeving naar productie brengen.

Sprint 004 introduceert geen nieuwe visuele richting, dienstenpropositie of paginaontwikkeling. Alleen aantoonbare livegangblokkades mogen een gerichte correctie veroorzaken.

---

## 2. Deploymentinventarisatie

### Hosting

- Provider: TransIP.
- Product: reguliere Webhosting.
- Primaire website: `https://webuildanddesign.nl`.
- Huidige primaire sitepad: `/www`.
- Huidige primaire toepassing: WordPress in onderhoudstoestand.
- Geïsoleerde preview: `https://preview.webuildanddesign.nl`.
- Preview-DocumentRoot: `/subsites/preview.webuildanddesign.nl`.
- Hoofddomein, `www` en preview wijzen naar dezelfde TransIP-infrastructuur.
- HTTPS is op beide publieke hosts bereikbaar.
- De preview staat technisch los van `/www` en de WordPress-database.

### Build

- Project: statische Vite/TypeScript-site in `website/`.
- Installatie: bestaande `package-lock.json` en reeds aanwezige dependencies.
- Releasecommando: `npm run build`.
- Buildstappen:
  1. TypeScript-compilatie;
  2. Vite-productiebouw;
  3. controle dat uitsluitend publieke bestanden en inhoud in `dist/` staan.
- Uitvoer: `website/dist/`.
- Releaseomvang: 23 bestanden, circa 2 MiB.

### Environment

- Er zijn geen `.env`-bestanden gevonden.
- De publieke bron gebruikt geen `VITE_*`, `import.meta.env` of runtime environment-instellingen.
- De release heeft daarom geen secrets of omgevingsspecifieke waarden nodig.
- Publieke contactgegevens zijn als bevestigde inhoud onderdeel van de statische build.

### Bron- en releasestatus

- De publieke candidate verschilt van de huidige Git-HEAD.
- De buildbepalende wijzigingen staan in:
  - `website/index.html`;
  - `website/src/main.ts`;
  - `website/src/public-pages.ts`;
  - `website/src/styles/public-pages.css`;
  - drie lokale beelden onder `website/src/assets/images/atlas/generated/`.
- Andere aanwezige werkboomwijzigingen worden niet automatisch onderdeel van de publieke release.
- De lokaal gevalideerde candidate en de stagingpublicatie dragen:
  - `assets/index-DxU6iiRJ.js`;
  - `assets/index-NnYm0S8a.css`.
- De vorige chunks zijn bewust in de staging-assetmap behouden:
  - `assets/index-oTiyd6q5.js`;
  - `assets/index-C4u4CfAT.css`.
- De bestaande `.htaccess` van 124 bytes is ongewijzigd behouden.

De inhoud van de gevalideerde `dist/` is op 26 juli 2026 naar `/subsites/preview.webuildanddesign.nl` gepubliceerd. Voor het transport is dezelfde build opnieuw als ZIP verpakt met POSIX-padtekens, omdat TransIP de Windows-padtekens uit het oorspronkelijke ZIP-bestand als letterlijke bestandsnamen interpreteerde. De gepubliceerde bestanden komen ongewijzigd uit dezelfde gevalideerde `dist/`; er is niet opnieuw gebouwd.

---

## 3. Route van lokaal naar productie

### A. Lokale ontwikkeling

1. Werk uitsluitend vanuit de bestaande publieke bron.
2. Voer `npm run build` uit.
3. Laat de public-only verifier de release controleren.
4. Voer de geautomatiseerde tests uit.
5. Controleer alle zes publieke routes op desktop en mobiel.
6. Leg de buildidentiteit vast met commit, chunknamen en hashes.

### B. Staging

1. Publiceer uitsluitend de inhoud van de gevalideerde `website/dist/` naar `/subsites/preview.webuildanddesign.nl`.
2. Verwijder daar geen onbekende bestanden voordat de huidige preview als rollbackkopie of hostingback-up is veiliggesteld.
3. Controleer dat de preview de nieuwe chunknamen serveert.
4. Voer een smoke test uit op:
   - `/`;
   - `/diensten`;
   - `/werkwijze`;
   - `/projecten`;
   - `/over-ons`;
   - `/contact`;
   - alle bijbehorende assets;
   - mobiele eerste viewport;
   - e-mail- en telefoonroute.
5. Beoordeel de staging als bezoeker met één vraag:

   > Als iemand morgen binnenkomt, klopt de ervaring?

6. Alleen deze exacte stagingcandidate kan productie-GO krijgen.

### C. Productie

Uitgevoerd op 26 juli 2026:

1. De bestaande `/www`-toestand en WordPress-database zijn als rollbackbron behouden.
2. De versiegebonden productiemap `/sites/wbd-20260726-ca3d1bd` is aangemaakt.
3. De reeds gevalideerde `dist/` is zonder nieuwe build naar deze map gepubliceerd.
4. De bewezen SPA-routerconfiguratie van staging is ongewijzigd toegevoegd.
5. Het primaire TransIP-sitepad is omgeschakeld van `/www` naar `/sites/wbd-20260726-ca3d1bd`.
6. Na de korte configuratieactivatie zijn hoofddomein, `www`, HTTPS, routes, assets en contact gecontroleerd.

De oude `/www`-map is niet overschreven, verplaatst of verwijderd.

---

## 4. Rollbackprincipe

Rollback moet eenvoudiger zijn dan livegang.

Een productie-GO vereist vooraf:

- bekende vorige DocumentRoot of volledige `/www`-kopie;
- bruikbare WordPress-bestands- en databaseback-up;
- vastgelegde releasecandidate;
- mogelijkheid om het hoofddomein terug te wijzen of de vorige bestanden terug te plaatsen;
- eigenaarstoegang tot TransIP;
- korte rooktest na herstel.

Bij een kritieke fout na livegang:

1. stop verdere wijzigingen;
2. herstel de vorige DocumentRoot of `/www`-toestand;
3. controleer homepage, contact en HTTPS;
4. leg oorzaak en waarneming vast;
5. open pas daarna een gerichte herstelactie.

---

## 5. Lokale productiecontrole

### Technisch

| Controle | Uitkomst |
|---|---|
| Productiebuild | GO |
| Public-only verificatie | GO — 23 bestanden, 5 tekstbestanden gecontroleerd |
| Geautomatiseerde tests | GO — 43 van 43 |
| Publieke routes | GO — alle zes renderen met eigen titel en H1 |
| Eager-loaded afbeeldingen | GO — geen ontbrekende beelden aangetroffen |
| Lazy-loaded assets | Aanwezig in de build; stagingcontrole volgt na publicatie |
| Horizontale overflow desktop | Niet aangetroffen |
| Mobiele eerste viewport 390 × 844 | GO voor Homepage, Werkwijze en Contact; alle zes H1’s renderen |
| Kritieke runtime-uitval | Niet waargenomen; iedere route mount en onthult de primaire content |
| Contact | GO — `mailto:info@webuildanddesign.nl` en `tel:+31610067964` |
| MX-record | GO — `mx.transip.email` |
| Releasegrootte | circa 2 MiB; geen basisperformanceblokkade |

### Gerichte correctie

`website/index.html` declareerde `lang="en"` terwijl de publieke Experience Nederlands is. Dit is gecorrigeerd naar `lang="nl"` vanwege schermlezers en automatische taalinterpretatie.

Er is geen andere frontend-, content- of designwijziging voor Sprint 004 gestart.

---

## 6. Inhoudelijke blokkadetoets

### Is duidelijk wat We Build And Design doet?

**GO.**

De homepage opent met:

> Professionele websites. Persoonlijk en begrijpelijk.

en:

> Klaar voor je eerste professionele website?

De categorie en de beoogde ondernemer zijn binnen de eerste viewport duidelijk.

### Is de eerste stap logisch?

**GO.**

De bezoeker kan eerst zien hoe Donovan begint en kan daarna rechtstreeks e-mailen of bellen. Een briefing of technisch plan is niet vereist.

### Klopt de rol van Atlas?

**GO.**

Atlas wordt niet als publiek hoofdmerk of product verkocht. De methode is voelbaar in luisteren, begrijpen, kiezen en bouwen.

### Voelt de ervaring consistent?

**GO voor staging.**

Merk, navigatie, fotografische wereld, typografie en routeopbouw vormen lokaal één Experience. De echte online serietoets volgt na stagingpublicatie.

---

## 7. Open poorten

### Staging-GO

**Behaald en door Donovan bevestigd.**

De bevroren releasecandidate is zonder nieuwe ontwikkeling doorgeschoven naar productie.

### Productie-GO

**Behaald op 26 juli 2026 omstreeks 14:35 CEST.**

Gecontroleerd:

- `https://webuildanddesign.nl`;
- `https://www.webuildanddesign.nl`;
- HTTPS;
- `/`;
- `/diensten`;
- `/werkwijze`;
- `/projecten`;
- `/over-ons`;
- `/contact`;
- SPA-deeplinks via de productie-`.htaccess`;
- nieuwe JS- en CSS-chunks;
- zichtbare hero-afbeelding;
- `mailto:info@webuildanddesign.nl`;
- `tel:+31610067964`;
- afwezigheid van de vorige WordPress-onderhoudspagina op de gecontroleerde routes.

De TransIP-DocumentRoot had een korte activatievertraging. Tijdens die periode bleef de vorige WordPress-pagina bereikbaar; na activatie leverden unieke requests aantoonbaar Sprint 004.

### Externe afhankelijkheid

Geen open externe afhankelijkheid voor deze release.

### Bevestigde staging-rollback

- Vorige stagingcandidate: `website/.codex-tmp/wbd-preview-experience-review-20260723.zip`.
- SHA-256: `D6500ADA2F56AB706DB10EB18855B003A55AF6012F365620E85B183237AAD47A`.
- Vorige `index.html` verwijst naar `assets/index-oTiyd6q5.js` en `assets/index-C4u4CfAT.css`.
- Beide vorige chunks staan nog op staging.
- De TransIP-omgeving biedt daarnaast recente hostingback-ups.

Een stagingrollback bestaat daardoor primair uit het terugplaatsen van de vorige `index.html`. De volledige vorige stagingcandidate en de hostingback-ups blijven beschikbaar als tweede herstelroute.

### Bevestigde productierollback

- Huidige productie-DocumentRoot: `/sites/wbd-20260726-ca3d1bd`.
- Vorige productie-DocumentRoot: `/www`.
- `/www` en de WordPress-database zijn ongewijzigd behouden.
- Directe rollback: wijzig het primaire websitepad in TransIP terug naar `/www`.
- Controleer daarna hoofddomein, `www`, HTTPS en de WordPress-onderhoudspagina.

---

## 8. Na livegang

Na een geslaagde livegang start geen directe grote sprint.

De volgorde is:

1. observeren;
2. leren;
3. vastleggen;
4. alleen bij werkelijk bewijs een volgende stap openen.

De praktijk bepaalt de volgende verbetering.
