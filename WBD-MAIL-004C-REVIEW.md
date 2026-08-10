# WBD MAIL 004C - Visual Review

Datum: 9 augustus 2026  
Status: voorstel gereed voor menselijke visuele review; geen echte 004C-mail verzonden.

## Scope

004C is uitsluitend een visuele en inhoudelijke polish bovenop de bewezen 003B/004B-laag. SMTP-routing, sender policies, allowlist, idempotency, failures, audit/history/observability, attachment safety, plain-textfallback, de factuurkern en de bestaande factuur-PDF zijn behouden.

## Bronneninventaris

Bevestigde bedrijfsgegevens zijn dubbel gecontroleerd in:

- `invoices/wbd/data/wbd-invoice-template.json`;
- `invoices/wbd/data/sent/mail-foundation-003-review.json`;
- `website/src/public-pages.ts` contactconfiguratie;
- `invoices/wbd/README.md` uitgevoerde broncontroles.

| Gegeven | Waarde | Status |
|---|---|---|
| Bedrijfsnaam | We Build And Design | CONFIRMED |
| Adres | Gerard Terborchstraat 35 | CONFIRMED |
| Postcode/plaats | 1318 LE Almere | CONFIRMED |
| Telefoon | 06 100 67 964 | CONFIRMED |
| Algemeen e-mailadres | info@webuildanddesign.nl | CONFIRMED |
| Website | webuildanddesign.nl | CONFIRMED |
| KvK | 69326126 | CONFIRMED |
| BTW | NL190255879B01 | CONFIRMED |
| Officiële tagline | niet eenduidig vastgesteld | UNKNOWN / HUMAN CHOICE REQUIRED |
| Officieel zelfstandig logoasset | niet aangetroffen | UNKNOWN / FALLBACK REQUIRED |

## Logo

De gerichte controle van repository, Workspace-assets, `source/public`, documentbranding, Downloads en eerdere uploads vond geen zelfstandig goedgekeurd officieel WBD-logoasset. De aanwezige `favicon.svg`, HTML/CSS-markering en `invoices/wbd/brand.py` zijn bestaande reconstructies/implementaties en zijn conform de opdracht niet naar een mail-logo gepromoveerd.

De nette tekstfallback `We Build And Design` blijft actief. 004C wordt hierdoor niet geblokkeerd.

## Tagline

Er bestaan meerdere inhoudelijke kandidaten met verschillende autoriteitsstatussen:

- `Eerst begrijpen, dan verbeteren` - actuele publieke metadata in `website/index.html`;
- `Eerst begrijpen, daarna bouwen` - principe in `Foundation.md`;
- `Design the understanding first` - design/copyrichting, expliciet niet als definitieve productiecopy vastgesteld;
- `Onze naam begint met bouwen. Ons werk begint met begrijpen.` - definitieve copykandidaat, geen aangetoonde live footerpayoff.

Omdat meerdere kandidaten bestaan, is geen tagline in de echte 004C-template opgenomen. Menselijke keuze is vereist voordat dit verandert.

## Voorstel corporate footer

De generieke Organization Brand Foundation bevat nu een optioneel corporate profiel. De WBD-config is de eerste concrete toepassing. De gedeelde footer toont:

- WE BUILD AND DESIGN;
- officiële tagline alleen wanneer later expliciet vastgesteld;
- adres en plaats;
- bevestigd telefoonnummer;
- templatepassend e-mailadres (`info@` of `facturen@`);
- website;
- KvK en BTW compact.

Ontbrekende optionele velden verdwijnen veilig en worden nooit als `UNKNOWN` in een echte mail getoond.

## 004B versus 004C

### Behouden

- rustige nachgroene header, creme basis en goudaccent;
- persoonlijke aanhef, heading, kernboodschap en volgende stap;
- Donovan-handtekening in algemene mail;
- factuuronderwerp, persoonlijke aanhef, feitenblok, PDF-bijlage en afwezigheid CTA;
- maximaal circa 600px, presentatietabellen, inline CSS en plain text;
- alle 003B veiligheidscontracten.

### Verbeterd

- persoonlijke afsluiting staat los van bedrijfsinformatie;
- algemene en factuurmail delen exact dezelfde corporate footercomponent;
- vaste bedrijfshiërarchie met subtiele gouden divider;
- factuur gebruikt alleen een passend `facturen@`-adres binnen dezelfde footerfamilie;
- plain text bevat dezelfde scheiding en bedrijfsinformatie;
- organisatiegegevens zitten in organisatieconfiguratie, niet in de generieke engine.

### Onbekend

- officieel zelfstandig WBD-logoasset;
- een enkele officieel vastgestelde WBD-tagline.

## Mollie-boundary

De bestaande optionele veilige CTA-positie kan later na afzonderlijke goedkeuring een gecontroleerde Mollie/iDEAL-link dragen. 004C bevat geen Mollie, payment logic, betaalbutton of nep-CTA. De PDF blijft de officiële factuur.

## Validatie

- Volledige regressiesuite: `393/393 PASS`.
- Nieuwe 004C-tests: `7/7 PASS`.
- Lokale build/public boundary: PASS.
- Desktopreview: PASS.
- 390px mobiele review: PASS.
- Factuur-PDF SHA-256 voor/na: `8c1eb5550064da4fe777e34697a60018eefd4834fa4ed667b27b81561db8fb1b`.
- Factuur-PDF gewijzigd: NO.
- Real mail sent: NO.
- DNS/productiedeployment/Sportpaleis-mail: niet aangeraakt.

## Beslispunt

Beoordeel eerst `output/pdf/WBD-MAIL-004C-VISUAL-REVIEW.pdf`. Alleen na expliciete GO mag een nieuwe controlled SMTP-ronde met maximaal een algemene en een factuurtestmail worden voorbereid.
