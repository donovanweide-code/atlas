# Waarnemen — implementatienotitie

## Doel

Waarnemen bewaart een ervaring in een door Donovan bevestigde context, vóór menselijke beoordeling betekenis vormt. De eerste verticale keten is uitsluitend bedoeld voor Case 0001 en lokaal gebruik tijdens Sprint 001E.

De werkende volgorde is:

`Publieke Experience → Waarnemen → Atlas herkent context → Donovan bevestigt context → lokaal bewaren → Waarnemingen in Workspace → Nog niet beoordeeld`

## Domeingrens

`website/src/atlas-observations.ts` is een afzonderlijk, versieerbaar domein. Het importeert niets uit Understanding, Focus, Ideeën, Logboek of sprintplanning en schrijft daar ook niet naar.

Een waarneming krijgt uitsluitend:

- de oorspronkelijke tekst;
- status `unreviewed`;
- tijdstip;
- publieke pagina en betekenisvolle ervaringsgrens;
- Case 0001 en de lokaal bevestigde sprint;
- viewport;
- tijdstip en persoon van contextbevestiging.

De opslag gebruikt twee eigen sleutels:

- `atlas.workspace.observations.v1`;
- `atlas.workspace.observing-context.v1`.

Ingelezen waarden worden gevalideerd. Beschadigde of onbekende waarden vallen veilig terug naar een lege opslag of een niet-actieve context. De publieke Experience blijft daarbij werken.

## Activering en publieke zichtbaarheid

Donovan activeert Waarnemen in de Workspace voor de vaste Case 0001 en bevestigt daar de sprint, standaard `001E`. De activering geldt alleen in dezelfde browser en blijft daar bestaan totdat Donovan haar beëindigt.

De publieke module wordt alleen dynamisch geladen wanneer de lokale context aanwezig is. Zonder die context bestaat er geen Waarnemen-bediening in de publieke DOM, navigatie of URL. De semantische `data-atlas-observation`-markeringen blijven onzichtbare betekenisdragers en veranderen de publieke layout niet.

## Eerste ervaringsgrenzen

| ID | Label | Route en anker |
| --- | --- | --- |
| `public.home.entry` | Eerste publieke minuut | `/#eerste-publieke-minuut` |
| `public.home.understanding` | Eerst begrijpen | `/#begrijpen` |
| `public.home.digital-foundation` | Website en fundament | `/#digitaal-fundament` |
| `public.projects.confirmed-work` | Ruimte voor bewijs | `/projecten#bevestigd-werk` |
| `public.contact.exploration` | Contact en verkenning | `/contact#contact-verkenning` |

Wanneer meerdere grenzen op de actuele pagina bestaan, stelt Atlas de grens voor met het grootste zichtbare oppervlak. Bij gelijke of niet-zichtbare uitkomsten kiest Atlas de grens die het dichtst bij de bovenrand van de viewport ligt. Donovan ziet de uitkomst vóór opslag en kan haar corrigeren.

## Interface

- De Workspace maakt beschikbaarheid, actieve case en sprint, aantal open waarnemingen en vindplaats zichtbaar zonder statistiektegels of badges.
- De publieke Experience toont alleen bij lokale activering een kleine vaste knop.
- Openen verplaatst focus naar het tekstveld; `Escape` sluit en brengt focus terug naar de knop.
- De invoerlaag is geen modal en laat de Experience zichtbaar.
- Desktop en mobiel houden de bediening binnen de viewport zonder horizontale overflow.
- Reduced motion schakelt beweging in deze laag uit.

## Bewuste Stilte

Er is geen Review-workflow, beoordeling, sentiment, classificatie, prioriteit, eigenaar, commentaar, taakvorming, Understanding-promotie, screenshot, opname, elementselectie, database, account of synchronisatie. Er is ook geen voorbereidende abstractie voor meerdere cases of externe omgevingen.

## Huidige grens

Waarnemen werkt nu alleen op de drie publieke routes waaraan de eerste vijf bevestigde ervaringsgrenzen zijn gekoppeld. Niet-gemarkeerde routes krijgen bewust geen afgeleide of verzonnen grens. Werkelijk gebruik moet eerst aantonen welke volgende grens betekenis verdient.
