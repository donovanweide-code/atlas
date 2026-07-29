# Sprint 005 — Van technisch live naar Experience GO

**Status:** Afgerond — huidige Experience gecontroleerd LIVE
**Startdatum:** 26 juli 2026  
**Einddatum:** 29 juli 2026
**Focus:** de We Build And Design Experience iteratief in de werkelijkheid ontwikkelen  
**Productie:** release `wbd-20260729-c95aaf8` is LIVE en gevalideerd

---

## 1. Doel

Sprint 005 ontwikkelt de actuele We Build And Design Experience in kleine, afzonderlijk beoordeelbare stappen totdat de volledige reis een toekomstige Experience GO kan verdienen.

De sprint introduceert geen nieuwe functionaliteit als doel op zichzelf. Iedere candidate begint bij een concrete bezoekersobservatie:

> Bouw niet wat nog ontbreekt; bouw wat de bezoeker vandaag nog mist om We Build And Design werkelijk te begrijpen.

De leidende principes zijn:

> De website volgt de werkelijkheid — de werkelijkheid wordt niet gevormd om de website te vullen.

> We publiceren geen visie. We publiceren het bewijs van onze visie.

De hoofdstukken 2 tot en met 5 bewaren de oorspronkelijke werkwijze en
candidate-afbakening. De actuele eindstatus staat in hoofdstuk 6.

---

## 2. Twee afzonderlijke GO-momenten

[`D-012`](../DECISIONS.md#d-012--production-go-en-experience-go-zijn-afzonderlijke-kwaliteitsgrenzen) blijft leidend:

- **Production GO:** technisch gereed voor een gecontroleerde productiepublicatie.
- **Experience GO:** inhoudelijk gereed voor eerlijke validatie van de volledige ervaring.

Sprint 005 werkt toe naar Experience GO. Een preview-GO of Candidate-GO is geen Production GO.

---

## 3. Iteratieve Experience-cyclus

Iedere Experience-verbetering doorloopt:

**Observatie → Candidate → inhoudelijke review → Candidate-GO → geïsoleerde previewimplementatie → review op de actuele website → behouden, aanpassen of terugnemen**

Daarbij gelden de volgende grenzen:

1. Eén candidate lost één duidelijk benoemde bezoekersobservatie op.
2. Alleen de goedgekeurde scope wordt geïmplementeerd.
3. De preview is de primaire plek voor de volgende Experience-review.
4. Documentatie bewaart aanleiding, keuze en resultaat, maar vervangt de zichtbare toets niet.
5. Een volgende candidate start pas nadat de actuele candidate op preview is beoordeeld.
6. Productie blijft buiten deze cyclus totdat afzonderlijk Production GO wordt gegeven.

---

## 4. Preview als voortschrijdende nulmeting

Iedere goedgekeurde previewimplementatie wordt vanaf het moment van bevestiging de nieuwe referentie voor alle volgende Experience-candidates.

Dat betekent:

- iedere nieuwe candidate wordt vergeleken met de actuele preview;
- documenten, oude ontwerpen en eerdere ideeën blijven historische bronnen, maar zijn niet de nulmeting;
- de volgende stap bouwt op wat vandaag werkelijk zichtbaar en ervaarbaar is;
- iedere previewreview beantwoordt expliciet:
  - is dit beter dan de vorige versie;
  - behouden we dit;
  - passen we dit aan;
  - of draaien we het terug?

Een candidate die wordt teruggedraaid, wordt geen nieuwe nulmeting. Alleen de na review bevestigde previewstatus draagt de volgende stap.

---

## 5. Candidate 005A — Homepagepositionering boven de vouw

**Historische status bij aanvang:** inhoudelijke review open — geen implementatie-GO.

### Observatie

De huidige homepage maakt snel duidelijk dat We Build And Design professionele websites realiseert, maar het onderscheidende principe — eerst het bedrijf begrijpen, daarna ontwerpen en bouwen — verschijnt nog niet betrouwbaar in de eerste lezing.

### Afgebakende candidate

Onderzoek uitsluitend de reeds voorbereide positioneringslaag boven de vouw:

- categorie en doelgroep;
- het bedrijf als vertrekpunt;
- begrijpen vóór ontwerpen en bouwen;
- de overgang naar het bestaande hoofdstuk `Eerst luisteren. Dan pas bouwen.`

Leidende studies:

- [`Homepage — Boven-de-vouw-positionering`](../../../website/design/23-Homepage-Boven-de-Vouw-Positionering.md);
- [`Homepage — Statische boven-de-vouw-compositiestudie`](../../../website/design/24-Homepage-Boven-de-Vouw-Compositiestudie.md).

### Buiten scope

- nieuwe fotografie of AI-beelden;
- wijzigingen aan andere homepagehoofdstukken;
- wijzigingen aan andere pagina's;
- cases, bewijsclaims, SEO of Trust & Governance;
- productiepublicatie;
- Candidate 005B.

Candidate 005A begon als een geïsoleerde previewstap. De latere geïntegreerde
Experience heeft deze tussenstatus vervangen; de definitieve afronding staat
in hoofdstuk 6.

---

## 6. Afronding Fase 2

De Experience-ontwikkeling, eindredactie, Experience Reviews en gecontroleerde
releasevoorbereiding zijn afgerond. De goedgekeurde publieke Experience uit
`e6aedab` is als inhoudelijke canon samengebracht met de actuele
releasetechniek op `main`.

Op 29 juli 2026 is release `wbd-20260729-c95aaf8` gecontroleerd gepubliceerd
vanuit commit `c95aaf8a8e19cd551068678b8982ac57f8105612`.

De productievalidatie bevestigde:

- stabiele activatie via de propagatiebewuste releaseprocedure;
- bereikbaarheid van alle publieke hoofdroutes via IPv4 en IPv6;
- geldige TLS-respons;
- hash-exacte overeenstemming tussen publieke bestanden en het
  releaseartefact;
- een beschikbaar, niet gebruikt rollbackdoel.

Fase 2 is hiermee afgerond. Er is geen nieuwe ontwikkelfase geopend.
Vervolgwerk ontstaat pas uit een nieuwe observatie en expliciete opdracht.

