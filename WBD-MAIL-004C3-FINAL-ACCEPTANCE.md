# WBD Mail Foundation 004C.3 - Final Human Acceptance

Datum: 2026-08-09  
Besluit: GO  
Baseline-ID: `WBD-MAIL-FOUNDATION-004C3-FINAL-20260809`  
Status: `FINAL_ACCEPTED` en bevroren

## Menselijk besluit

Donovan heeft de gerichte mobiele footercorrectie expliciet goedgekeurd. WBD Mail Foundation 004C.3 geldt vanaf dit besluit als de definitieve visuele en technische WBD-mailbaseline.

De acceptatie omvat:

- de actieve officiële WBD Organization Brand Foundation;
- het owner-approved W/BD-logo en de mail-safe CID-afleiding;
- de owner-approved tagline `Onze naam begint met bouwen. Ons werk begint met begrijpen.`;
- algemene WBD-mail via `info@webuildanddesign.nl`;
- WBD-factuurmail via `facturen@webuildanddesign.nl`;
- de afzonderlijke persoonlijke Donovan-handtekening en corporate footer;
- een corporate footer over de volledige breedte van de mailcontainer;
- de geaccepteerde compacte mobiele footer;
- uitsluitend telefoon, e-mail en website als bewuste links;
- adres, KvK en btw als gewone corporate tekst zonder bewuste link;
- het ongewijzigde factuurfeitenblok en de ongewijzigde TEST-003-PDF;
- de bestaande SMTP-, security-, allowlist-, sender-policy-, idempotency-, history-, audit- en observabilitygrenzen.

## Validatiebewijs

- finale desktop- en 390px-renderreview: PASS;
- footerbreedte desktop: volledige 600px-mailcontainer;
- 390px-review: geen overflow of clipping;
- bewuste links: exact `tel:`, `mailto:` en `https:`;
- onbedoelde bronlinks rond adres, KvK en btw: nul;
- volledige regressiesuite: `393/393 PASS`;
- TEST-003-PDF SHA-256: `8c1eb5550064da4fe777e34697a60018eefd4834fa4ed667b27b81561db8fb1b`;
- controlled SMTP: algemene mail en factuurmail ieder exact eenmaal geaccepteerd binnen de geïsoleerde 004C.3-validatie;
- duplicate sends binnen 004C.3: nul.

## Freeze en toekomstige wijzigingen

WBD Mail wordt niet opnieuw geopend voor vrijblijvende polish. Eventuele kleine visuele verbeteringen worden als backlog-observatie geregistreerd en krijgen pas een nieuwe werkstroom bij een concrete aanleiding uit werkelijk gebruik.

Een toekomstige wijziging vereist minimaal:

1. een concrete praktijkobservatie;
2. expliciete afbakening van het probleem;
3. behoud van deze baseline als referentie;
4. een nieuw menselijk GO-besluit voordat implementatie start.

## Grenzen van dit besluit

- geen nieuwe mail verzonden tijdens de acceptatiestap;
- geen productie-deployment;
- geen DNS-wijziging;
- geen verdere WBD-mailpolish gestart;
- Sportpaleis Mail Foundation niet gestart;
- `bedrukking@sportpaleis.nl` en provider VDX zijn uitsluitend als volgende werkstroom genoemd en vallen buiten deze acceptatie.

## Eindstatus

WBD MAIL FOUNDATION FINAL ACCEPTED: YES  
WBD BRAND FOUNDATION ACTIVE: YES  
WBD MAIL VISUAL BASELINE ACCEPTED: YES  
WBD CONTROLLED SMTP VALIDATED: YES  
MOBILE FOOTER ACCEPTED: YES  
FULL REGRESSION TESTS: PASS  
OPEN BLOCKERS WBD MAIL: 0  
PRODUCTION DEPLOYMENT: NO
