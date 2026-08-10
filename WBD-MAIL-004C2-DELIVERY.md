# WBD Mail 004C.2 - Owner Approval & Final Brand Activation

Datum: 2026-08-09  
Status: technisch afgerond; gereed voor afzonderlijk aangestuurde controlled SMTP-validatie  
Externe verzending tijdens 004C.2: geen

## Besluit en authority

Donovan heeft de ongewijzigde W/BD-kandidaat uit `WBD-MAIL-004C1-VISUAL-REVIEW.pdf` expliciet goedgekeurd. Dezelfde geometrie en afgeleide bestanden zijn zonder redesign geactiveerd in de bestaande Organization Brand Foundation.

- Organization: `we-build-and-design`
- Foundation-versie: `WBD-BRAND-FOUNDATION-004C2`
- Status: `owner_approved`
- Approved by: `owner / Donovan`
- Approval date: `2026-08-09`
- Tagline: `Onze naam begint met bouwen. Ons werk begint met begrijpen.`
- Authority-pad: Organization Brand Foundation -> owner-approved master -> gecontroleerde mail-safe afleiding -> WBD mail

Atlas mag deze authority uitlezen, maar kan het logo niet wijzigen, vervangen of opnieuw goedkeuren. Er is geen andere organisatieconfiguratie aangepast.

## Geregistreerde assets

| Gebruik | Asset | SHA-256 |
| --- | --- | --- |
| Schaalbare master | `wbd-logo-master-candidate.svg` | `b82bcb75111105cf5017c61ae9661be3ae7cccfdecd77e3f0f723585d99524c5` |
| Mail-safe light / CID | `wbd-logo-mail-safe-light-candidate.png` | `342ecff3490157106f4a71161d54407b3f6aad71be48c09e5720bdc183e4d9f4` |
| Light vectorafleiding | `wbd-logo-light-candidate.svg` | `1e0f76446e922204b6ac36e01d5abb3daeed1dda43c49e6ef6464100789ad525` |
| Dark rasterafleiding | `wbd-logo-mail-safe-dark-candidate.png` | `19fa7ab551dbefbd69f49733c5ccdd6c9aa046dc3d2d1d6e8c7d2d0df8ce6052` |

De herkomst, approval en intended usage staan tevens in beide gespiegelde provenancebestanden. De assetbytes en bovenstaande hashes zijn bij de statuspromotie behouden.

## Mailimplementatie

`WBD_GENERAL` en `WBD_INVOICE` vragen hetzelfde actieve `email_logo` op uit de Organization Brand Foundation. De mail-safe PNG wordt uitsluitend vanaf het gecontroleerde organisatiepad geladen, vóór gebruik als PNG gevalideerd en tegen de geregistreerde SHA-256 gecontroleerd. De afbeelding wordt als inline CID-part in de MIME-mail opgenomen; een lokaal bestandspad komt niet in HTML, preview, capture of SMTP-payload terecht.

De tekstfallback is niet langer de primaire render. Veilige foutafhandeling blijft bestaan:

- begrijpelijke `alt`-tekst wanneer afbeeldingen niet worden getoond;
- neutrale tekstfallback wanneer geen actieve asset is geconfigureerd;
- fail-closed bij een ontbrekende, ongeldige of hash-afwijkende serverasset;
- geen acceptatie van een onbetrouwbaar bestandspad of asset van een andere organisatie.

De 004C.1-footer is behouden, inclusief de afzonderlijke persoonlijke ondertekening en de compacte corporate laag met contactgegevens, tagline, KvK en btw-nummer. General gebruikt `info@webuildanddesign.nl`; invoice gebruikt `facturen@webuildanddesign.nl`.

## Ongewijzigde factuur- en transportgrenzen

- onderwerpcontract, feitenblok, bedrag, betaaltermijn en vervaldatum: ongewijzigd;
- factuur-PDF: ongewijzigd;
- PDF SHA-256 vóór en na: `8c1eb5550064da4fe777e34697a60018eefd4834fa4ed667b27b81561db8fb1b`;
- attachment resolver, sender routing, idempotency, audit, allowlist en TLS/security-gates: behouden;
- CTA of Mollie: niet toegevoegd;
- productie, DNS en Sportpaleis-mail: niet gewijzigd.

## Visuele review

Lokale browserreview is uitgevoerd op desktop en op exact 390 px voor algemene mail en factuurmail. Ook header, beide corporate footers en de images-off-fallback zijn afzonderlijk gecontroleerd.

- desktop: PASS;
- mobiel 390 px: PASS;
- logo-ratio en scherpte: PASS;
- geen horizontale overflow: PASS;
- persoonlijke/corporate scheiding: PASS;
- images-off alt/fallback: PASS.

Bewijs staat in `output/mail-foundation-004c2-review/` en in de gebundelde finale review-PDF.

## Tests

De volledige repositorybaseline is uitgevoerd op 2026-08-09:

- tests: `393`;
- pass: `393`;
- fail: `0`;
- resultaat: PASS.

Daarin zijn owner-approved lookup, organisatie-isolatie, veilig CID-/assetpad, ontbrekende asset, onbetrouwbare asset, gedeelde authority voor general/invoice, MIME-inline opname zonder lokaal pad en de onveranderde PDF-hash afgedekt.

## Exacte veilige vervolgstap voor controlled SMTP

004C.2 stopt vóór credential provisioning. Een volgende, expliciet door Donovan gestarte validatie kan lokaal als volgt worden voorbereid:

1. Open een nieuw lokaal PowerShellvenster in `C:\Users\donov\Documents\Atlas\website`.
2. Start `powershell -ExecutionPolicy Bypass -File .\scripts\Start-ControlledWbdMail004BReview.ps1 -TestRecipient <eigen-allowlisted-testadres> -Port 5196`.
3. Voer de twee mailboxwachtwoorden uitsluitend in de SecureString-prompts in; zet ze niet in broncode, `.env`, opdrachtregel, screenshots of documentatie.
4. Laat het PowerShellvenster open. De runtime blijft lokaal, gebruikt één allowlisted recipient en houdt `WBD_PRODUCTION_SMTP_ENABLED=NO`.
5. Controleer eerst preview, afzender, onderwerp, ontvanger, logo, tekstversie en factuur-PDF. Start daarna uitsluitend na een afzonderlijke menselijke GO maximaal één general-test en één invoice-test.
6. Controleer SMTP-acceptatie en inboxweergave afzonderlijk; acceptance is geen bewijs van inbox delivery.
7. Sluit na validatie het PowerShellvenster. De procesgebonden credentials worden dan verwijderd.

Deze procedure is in 004C.2 niet gestart.

## Eindstatus

WBD LOGO OWNER APPROVED: YES  
WBD OFFICIAL BRAND ASSET REGISTERED: YES  
MASTER ASSET REGISTERED: YES  
MAIL-SAFE ASSET REGISTERED: YES  
LOGO PROVENANCE PRESERVED: YES

TEXT FALLBACK PRIMARY: NO  
SAFE FAILURE FALLBACK PRESERVED: YES

GENERAL MAIL OFFICIAL LOGO APPLIED: YES  
INVOICE MAIL OFFICIAL LOGO APPLIED: YES  
CORPORATE FOOTER PRESERVED: YES  
OWNER APPROVED TAGLINE PRESERVED: YES

ORGANIZATION BRAND AUTHORITY ACTIVE: YES  
ATLAS BRAND BOUNDARY PRESERVED: YES

INVOICE FACTS BLOCK MODIFIED: NO  
INVOICE PDF MODIFIED: NO  
PAYMENT/MOLLIE ADDED: NO

DESKTOP REVIEW: PASS  
MOBILE 390PX REVIEW: PASS  
PLAIN TEXT: PASS  
FULL REGRESSION TESTS: PASS

REAL CUSTOMER MAIL SENT: NO  
PRODUCTION DEPLOYMENT: NO  
DNS MUTATIONS: NO  
SPORTPALEIS MAIL MODIFIED: NO

READY FOR FINAL CONTROLLED SMTP VALIDATION: YES
