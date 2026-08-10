# Sportpaleis Workspace 007B - Operational Review & Pilot Readiness

Build/release: `SPW-007B-20260807`

## Uitkomst

Workspace 007B is functioneel gereed voor visuele review. De bestaande 006/007-foundation is behouden: server-side authenticatie en RBAC, gedeelde persistente data, revisies en 409-conflicten, idempotentie, atomic bulk progression, audit, back-up, gecontroleerde voorkeuren, productieprofielen, onafhankelijke foliebatches en de Direct Print-safety boundary.

De implementatie claimt nadrukkelijk nog geen praktijk- of pilotgereedheid. Barcodehardware, labelprinter en Direct Print-hardware zijn niet fysiek gevalideerd.

## Drie werkervaringen

- Winkelmedewerker: Overzicht, Nieuwe order en Orders. Zoeken en wijzigen kan tot de order naar Controle gaat. Productie- en beheerroutes zijn ook in de paginarouter geblokkeerd; servermutaties blijven rolgecontroleerd.
- Patrick / Productie: orders, statuscontrole, atomic bulk progression, foliebatches, holds, afwijkingen en productie-instructies op aanvraag. Geen finance of beheerdata.
- Kevin / Admin: volledige order- en productiecontext, artikel- en verenigingscontext, productieprofielen, gebruikers/rollen, communicatie-instellingen en folie/financiele bronvelden.

WBD-facturen en abonnementgegevens zijn niet toegevoegd: deze sectie bestond niet in de Sportpaleis Workspace-foundation en mocht niet worden verzonnen.

## Operationele verfijningen

- Verplichte naam, e-mail en telefoon; server-side e-mailvalidatie.
- Normale orderflow zonder beloofde gereeddatum.
- Compacte klant- en standaardbedrukking met snelle beeldcatalogus.
- Directe plus/min-aantallen.
- Gegroepeerde varianten voor verschillende maten en/of bedrukking.
- Beheerd personalisatiebeleid: verplicht, optioneel, mutually-exclusive of combinatie.
- Semantische initialen met voornaam/initiaalbron, tussenvoegsel en achternaambron; typografie blijft profielkennis.
- Interne of aandacht-notitie met order-/klantscope, auteur en timestamp.
- Gecontroleerde prioriteitsuitzondering met aanvrager, afstemming, reden, toelichting en audit.
- Delivery-statusmodel met `NOT_SENT`, `SENT`, `DELIVERED`, `BOUNCED` en `FAILED`. Bounce maakt de Attention `E-mail niet bezorgd - klant bellen`; er wordt geen mail verzonden.
- Zoekindex voor klantnaam, order-ID, telefoon, e-mail, vereniging en artikel/SKU.
- Afhalen is een afzonderlijke statusgebeurtenis na Gereed.
- Barcodefoundation met unieke ordercode en eventhistorie; feature flag en hardwarevalidatie blijven uit.

## Testbewijs

- Productiebouw: PASS.
- Publieke buildgrens: PASS.
- Volledige regressiesuite: 339/339 PASS.
- Toegevoegde 007B-scenario's: 15/15 PASS.
- De lokale reviewomgeving rapporteert `barcodeEnabled=false`, `barcodeHardwareValidated=false` en `hardwareSendEnabled=false`.

## Status

```text
FUNCTIONAL REGRESSIONS: PASS
STORE EMPLOYEE FLOW READY FOR REVIEW: YES
PRODUCTION FLOW READY FOR REVIEW: YES
ADMIN FLOW READY FOR REVIEW: YES
ROLE SEPARATION VERIFIED: YES
ORDER VARIANTS VERIFIED: YES
BARCODE FOUNDATION READY: YES
BARCODE HARDWARE VALIDATED: NO
DIRECT PRINT HARDWARE VALIDATED: NO
READY FOR VISUAL REVIEW: YES
READY FOR STAFF PRACTICE TEST: NO
READY FOR PILOT USE: NO
```

Staff practice volgt pas na visuele acceptatie. Pilot use volgt pas na die praktijkreview en de relevante fysieke hardwarevalidaties.

