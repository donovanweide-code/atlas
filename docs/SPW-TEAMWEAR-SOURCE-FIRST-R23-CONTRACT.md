# Sportpaleis Teamwear source-first R2.3

## Implementatiecontract

De primaire job is:

`echte artikelbron → artikel/productbeeld → relevante context → bedrukking → maten/aantallen → voorstel/revision/akkoord → bestaande productiehandoff`

De huidige Collectie en verenigingsproducten zijn hulpmiddelen, geen verplichte workflow of tweede productwaarheid.

### Behouden foundations

- Teamkit proposal/revision/approval en immutable evidence;
- centrale Sportpaleis catalogus- en syncwaarheid;
- contextgebonden Library-assets en productieprofielen;
- één Studio-compositie voor preview, PDF en productiehandoff;
- fysieke maat-, bron-, kleur-, mirror-, placement- en cardinaliteitsinvarianten;
- klantlink, maten/aantallen en bestaande WorkspaceOrder/productieroute.

### Nieuwe primaire ervaring

1. Plak, sleep of upload een werkelijk productbeeld, of kies optioneel een bekend artikel.
2. Leg alleen noodzakelijke productcontext vast: productsoort, herkenbare naam en optioneel artikelnummer/kleur/bronreferentie.
3. Koppel optioneel een bekende vereniging/teamcontext; Workspace hergebruikt dan logo's, sponsors en productie-defaults.
4. Open direct Studio. Meer artikelen toevoegen blijft een secundaire actie.

### Canonieke bron- en zijdewaarheid

- De gebruikte productbron wordt als immutable proposal-source opgeslagen en via hash aan het item gekoppeld.
- `productType` bepaalt alleen toepasselijke surfaces; het is geen productieprofiel.
- `printableSides` is expliciet en blijft samen met exact gebruikte front/back-bronnen in revisions aanwezig.
- Een ontbrekende achterkant is alleen aandacht wanneer BACK voor dit product én de concrete compositie nodig is.
- Rugtas: FRONT; sporttas/bovenkleding: FRONT en BACK; onderkleding: FRONT met LEFT/RIGHT-zones; ander: FRONT/FREE.
- Een specifiek bestaand artikelprofiel mag deze generieke defaults verfijnen, nooit worden overschreven.

### Buiten scope

- geen tweede productcatalogus of leverancierssync;
- geen fictieve productbeelden als vervanging voor aangeleverde bron;
- geen automatische externe catalogus-scrape;
- geen productie-deployment.

