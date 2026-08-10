# WBD MAIL 004 - Review & Approval

Datum: 9 augustus 2026  
Status: voorstel gereed voor menselijke review; niet geimplementeerd  
Technische baseline: `WBD MAIL FOUNDATION 003B - CONTROLLED SMTP VALIDATED`

## Scope en bronhierarchie

Deze ronde beoordeelt uitsluitend de zichtbare klantbeleving van:

- `WBD_GENERAL` / de gevalideerde technische testmail;
- `WBD_INVOICE` / de gevalideerde factuurmail met `TEST-003`-PDF.

Gebruikte primaire visuele bronnen:

- de werkelijk gevalideerde 003B-mailproofs en Workspace-screenshots;
- de gerenderde definitieve `TEST-003`-factuur;
- de bestaande WBD-website-, Workspace- en factuurvormtaal;
- de huidige HTML- en plain-texttemplates voor inhoudelijke vergelijking.

De 003B Mail Foundation, SMTP, sender policies, idempotency, audit en observability zijn niet gewijzigd.

## Samenvattend oordeel

De huidige mails zijn technisch helder, veilig en menselijk genoeg om te begrijpen. De sterkste onderdelen zijn de echte WBD-afzendernamen, de persoonlijke aanhef, de rustige korte tekst, het sterke factuuronderwerp en de expliciete bijlageverwijzing. Die blijven behouden.

De huidige klantmail mist echter de visuele en redactionele afwerking van de WBD-website, Workspace en factuur. De algemene testtekst is terecht technisch en daarom geen geschikte klanttekst. De factuurmail is inhoudelijk correct, maar maakt bedrag, vervaldatum en betalingscontext onvoldoende scanbaar. Beide mails missen een herkenbare WBD-header en een bruikbare contacthandtekening.

Aanbevolen richting: een kleine herbruikbare WBD-mail-shell met een lichte creme inhoudsdrager, een compacte donkergroene header, een uiterst terughoudende goudaccentlijn, Georgia voor korte headings en Arial/Helvetica voor bodytekst. Geen dashboardcomponenten, geen marketingbanner en geen afhankelijkheid van externe fonts of afbeeldingen.

## WBD design language

Vastgesteld uit bestaande bronnen:

- warm donker groen / nachtgroen: `#08161A`, `#17352F`;
- creme / off-white: `#F0E6D2`, `#F7F4EE`;
- terughoudend goud: `#C7A166`;
- donkere tekst: `#17221F`;
- heading: Georgia / Times New Roman fallback;
- body: Arial / Helvetica fallback;
- stijl: rustig, ruim, redactioneel, tijdloos en niet-SaaS.

Vertaling naar e-mail:

- maximaal circa 600 px inhoudsbreedte;
- tabelgebaseerde structuur voor brede clientondersteuning;
- 16 px bodytekst en royale maar functionele regelafstand;
- een compacte header, niet de volledige websiteheader;
- maximaal een optionele CTA, alleen als de inhoud werkelijk een actie vraagt;
- inhoud blijft volledig begrijpelijk zonder afbeeldingen.

## Branding- en logobeslissing

De bestaande WBD-identiteit gebruikt aantoonbaar het `W / BD`-beeldmerk met `WE BUILD AND DESIGN`-wordmark. In de repository is geen afzonderlijke, aantoonbaar goedgekeurde mail-safe PNG-export van dit logo gevonden.

Beoordeling: `ONBEKEND / BESPREKEN` voor de definitieve afbeeldingsasset.

Voorstel:

- geen nieuw logo ontwerpen;
- voor implementatie uitsluitend een goedgekeurde export van het bestaande beeldmerk gebruiken;
- bij voorkeur een kleine 2x-PNG met vaste afmetingen voor Outlook/Gmail;
- alt-tekst: `We Build And Design`;
- zichtbare tekstnaam en contactgegevens blijven aanwezig wanneer afbeeldingen worden geblokkeerd;
- de mockups gebruiken de bestaande `W / BD`-constructie alleen als reviewrepresentatie, niet als nieuw logo-ontwerp.

## A. Algemene WBD-mail

### Huidige klantbeleving

De gevalideerde mail toont:

- afzender `We Build And Design <info@webuildanddesign.nl>`;
- technisch onderwerp `WBD Workspace - gecontroleerde mailtest`;
- persoonlijke aanhef `Beste Donovan,`;
- korte technische testuitleg;
- afsluiting `Met vriendelijke groet, We Build And Design`;
- geen header, logo, contactblok of visuele WBD-shell.

De technische proofpagina is op desktop duidelijk. De mobiele proofpagina heeft horizontale clipping; dit betreft de proofwrapper en is niet hetzelfde als een echte mailclientweergave. De onderliggende mail-HTML is eenvoudig en fluid, maar is nog niet visueel bewezen in Outlook, Gmail en Apple Mail.

### Voorgestelde inhoud - illustratief, nog geen template

Afzender: `We Build And Design <info@webuildanddesign.nl>`  
Onderwerpvoorbeeld: `Vervolg op ons gesprek over {{project.name}}`  
Preheader: `De afspraken en eerstvolgende stap overzichtelijk bij elkaar.`

```text
Beste {{recipient.name}},

Dank voor ons gesprek. Hieronder vind je kort wat we hebben afgesproken over
{{project.name}}.

{{message.body}}

Volgende stap
{{message.next_step}}

Heb je tussendoor een vraag? Reageer gerust op deze mail.

Met vriendelijke groet,
{{sender.name}}
We Build And Design
info@webuildanddesign.nl | webuildanddesign.nl
```

Het onderwerp en de hoofdtekst moeten per werkelijk berichtdoel worden geschreven. Dit voorstel is een behandeling en inhoudspatroon, geen generiek tekstblok dat elke mail automatisch passend maakt.

### Beoordelingskaart algemene mail

| Onderdeel | Huidige situatie | Voorstel | Beoordeling |
|---|---|---|---|
| Afzendernaam | Echt en herkenbaar WBD | Ongewijzigd behouden | GOED - BEHOUDEN |
| Onderwerp | Technische testtekst | Menselijke kernboodschap per berichtdoel | AANPASSEN |
| Header/logo | Ontbreekt | Compacte WBD-header met robuuste fallback | AANPASSEN |
| Aanhef | Persoonlijk en duidelijk | Patroon behouden | GOED - BEHOUDEN |
| Hoofdtekst | Alleen geschikt voor technische test | Menselijke aanleiding, kernboodschap en volgende stap | AANPASSEN |
| Typografie | Clientdefault | Georgia heading, Arial/Helvetica body | AANPASSEN |
| Kleuren | Geen merktaal | Creme, donkergroen en minimaal goud | AANPASSEN |
| Witruimte | Rustig maar ongestuurd | Vaste functionele sectieafstand | KAN NET BETER |
| Afsluiting | Correct en menselijk | Behouden | GOED - BEHOUDEN |
| Handtekening | Alleen organisatienaam | Persoonsnaam plus WBD-contactregels | AANPASSEN |
| Mobiel | Eenvoudige HTML, geen echte clientproof | Fluid 600 px-shell; echte client-QA na akkoord | ONBEKEND / BESPREKEN |

### Belangrijkste verschillen

- van technische testtekst naar menselijke communicatie per doel;
- van ongestylede body naar een kleine herkenbare WBD-shell;
- informatievolgorde: aanleiding, kernboodschap, volgende stap, contact;
- geen verplichte CTA en geen marketingblokken;
- plain text bevat exact dezelfde betekenis en actie.

## B. WBD-factuurmail

### Huidige klantbeleving

De gevalideerde mail toont:

- afzender `We Build And Design Facturen <facturen@webuildanddesign.nl>`;
- onderwerp `Factuur TEST-003 - Controlled SMTP activation`;
- persoonlijke aanhef;
- factuurnummer, project en totaalbedrag in een lopende zin;
- duidelijke mededeling dat de factuur is bijgevoegd;
- correcte leesbare WBD-PDF;
- geen directe vervaldatum of scanbaar financieel overzicht in de mail;
- geen WBD-header of contacthandtekening.

De factuur-PDF zelf sluit sterk aan op de WBD-identiteit en blijft ongewijzigd. De mail eromheen is functioneel, maar visueel en informatief soberder dan de bijlage.

### Voorgestelde inhoud - illustratief, nog geen template

Afzender: `We Build And Design Facturen <facturen@webuildanddesign.nl>`  
Onderwerp: `Factuur {{invoice.number}} - {{invoice.project}}`  
Preheader: `Factuur {{invoice.number}} is als PDF bijgevoegd.`

```text
Beste {{customer.name}},

Bijgevoegd vind je factuur {{invoice.number}} voor {{invoice.project}}.

Factuurnummer: {{invoice.number}}
Bedrag: {{invoice.total}}
Betaaltermijn: {{invoice.payment_term}}
Vervaldatum: {{invoice.due_date}}

De betaalgegevens staan op de bijgevoegde factuur. Heb je een vraag over deze
factuur? Reageer gerust op deze mail.

Met vriendelijke groet,
We Build And Design
facturen@webuildanddesign.nl | webuildanddesign.nl

Bijlage: Factuur {{invoice.number}} (PDF)
```

Er wordt geen grote CTA voorgesteld: de PDF-bijlage is de primaire handeling. Een knop is alleen logisch als later een betrouwbaar online factuurportaal bestaat; dat valt buiten 004.

### Beoordelingskaart factuurmail

| Onderdeel | Huidige situatie | Voorstel | Beoordeling |
|---|---|---|---|
| Afzendernaam | Duidelijke financiele WBD-afzender | Ongewijzigd behouden | GOED - BEHOUDEN |
| Onderwerp | Factuurnummer en project direct zichtbaar | Patroon behouden | GOED - BEHOUDEN |
| Header/logo | Ontbreekt | Dezelfde compacte WBD-shell | AANPASSEN |
| Aanhef | Persoonlijk | Patroon behouden | GOED - BEHOUDEN |
| Factuurinformatie | In lopende zin | Compact scanbaar feitenblok | KAN NET BETER |
| Bedrag | Aanwezig in lopende zin | Afzonderlijk zichtbaar | KAN NET BETER |
| Attachment-uitleg | Duidelijk | Behouden plus bijlagenaam onderaan | GOED - BEHOUDEN |
| Betaalinformatie | Termijn/vervaldatum ontbreekt | Termijn en vervaldatum direct zichtbaar | AANPASSEN |
| Afsluiting | Correct | Behouden | GOED - BEHOUDEN |
| Handtekening | Alleen organisatienaam | Facturenadres plus website | AANPASSEN |
| Mobiel | Eenvoudige HTML, geen echte clientproof | Feitenblok stapelt; client-QA na akkoord | ONBEKEND / BESPREKEN |
| Samenhang met PDF | PDF is sterker dan mail | Zelfde kleur, ritme en informatietoon | KAN NET BETER |

### Belangrijkste verschillen

- sender en onderwerp blijven ongewijzigd;
- bedrag, betaaltermijn en vervaldatum worden scanbaar;
- de bestaande sterke PDF blijft de primaire financiele bron;
- e-mail en PDF voelen als een familie zonder dezelfde lay-out te dupliceren;
- geen betalingslink of nieuwe financiele functionaliteit.

## HTML, toegankelijkheid en clientcompatibiliteit

Voor een latere implementatie na akkoord:

- tabelgebaseerde 600 px-layout met inline CSS;
- geen JavaScript en geen externe fonts als vereiste;
- systeemfont fallbacks;
- minimaal 16 px bodytekst en circa 1.5 regelafstand;
- voldoende contrast in zowel lichte als donkere clientomgevingen;
- betekenisvolle alt-tekst en geen kritieke informatie in afbeeldingen;
- geen tekst in achtergrondafbeeldingen;
- links beschrijvend en herkenbaar zonder kleur alleen;
- verborgen preheader zonder duplicatie in de zichtbare mail;
- plain-textversie inhoudelijk gelijkwaardig;
- Outlook, Gmail, Apple Mail en mobiele client-QA pas in de implementatiefase.

## Herbruikbare WBD-mail-shell

Aanbevolen: `YES`.

De shell bevat alleen:

1. preheader;
2. compacte WBD-header;
3. titel en hoofdinhoud;
4. optioneel eenvoudig feitenblok;
5. optionele enkele actie;
6. persoonlijke afsluiting;
7. compacte contactfooter.

Variabel per template blijven onderwerp, preheader, inhoud, feiten en eventuele actie. De generieke Mail Engine krijgt geen WBD-branding hardgecodeerd. Organisatiebranding en template-inhoud blijven WBD-configuratie. Nieuwe toekomstige templates worden in 004 niet gebouwd.

## Beslispunten voor Donovan

- [ ] Algemene mailrichting goedkeuren
- [ ] Factuurmailrichting goedkeuren
- [ ] Compacte WBD-mail-shell goedkeuren
- [ ] Goedkeuren dat factuurmail geen CTA-knop krijgt
- [ ] Bepalen welke bestaande officiele logo-export mail-safe gebruikt mag worden
- [ ] Contacthandtekening en eventuele persoonsnaam bevestigen
- [ ] Clientmatrix voor implementatie bevestigen: Outlook, Gmail, Apple Mail, mobiel
- [ ] Aanpassingen nodig - hieronder noteren

## Reviewstatus

CURRENT GENERAL MAIL REVIEWED: YES  
CURRENT INVOICE MAIL REVIEWED: YES  
WBD DESIGN LANGUAGE IDENTIFIED: YES  
CURRENT STRONG ELEMENTS PRESERVED IN PROPOSAL: YES  
GENERAL MAIL PROPOSAL READY: YES  
INVOICE MAIL PROPOSAL READY: YES  
MOBILE REVIEW INCLUDED: YES  
PLAIN TEXT CONSIDERED: YES  
REUSABLE WBD MAIL SHELL RECOMMENDED: YES  
REVIEW CHECKLIST INCLUDED: YES  
MAIL FOUNDATION 003B MODIFIED: NO  
REAL MAIL SENT: NO  
PRODUCTION DEPLOYMENT: NO  
SPORTPALEIS SMTP ATTEMPTED: NO  
READY FOR HUMAN REVIEW: YES

