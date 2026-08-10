# Sportpaleis Workspace — Article Foundation

## Doel van fase 2

Deze fase legt alleen het uniforme Article-model vast. Er is geen catalogus,
beheerinterface, upload, database, API of externe opslag gebouwd. Alle
demo-artikelen en referenties zijn fictief.

## Waarom Article een afzonderlijk domeinobject is

Een artikel beschrijft het herbruikbare aanbod; een order beschrijft een
specifieke bestelling. Door die verantwoordelijkheden te scheiden kan hetzelfde
artikel later in meerdere orders worden gebruikt zonder naam, categorie,
afbeelding en mogelijkheden per order te dupliceren.

## Afbeelding bij het artikel

`imageReference` hoort bij Article omdat het de herkenning van het aangeboden
artikel ondersteunt, onafhankelijk van een bestelling. Fase 2 gebruikt generieke
`demo://`-referenties. Die vereisen geen uploadfunctie, mediabeheer of externe
opslag en bevatten geen echte productfoto's.

## Personalisatiecapaciteiten

`personalizationCapabilities` bevat drie expliciete booleans:
`initials`, `backNumber` en `shortsNumber`. Zij geven alleen aan wat een artikel
kan ondersteunen. De werkelijk ingevoerde initialen of nummers horen bij een
toekomstige orderregel of personalisatiecontext en zijn bewust nog niet
gemodelleerd.

## Datamodel

| Veld | Type | Verplicht | Betekenis |
| --- | --- | --- | --- |
| `id` | `string` | ja | Stabiele interne artikelidentiteit |
| `articleNumber` | `string` | ja | Herkenbaar artikelnummer |
| `name` | `string` | ja | Artikelnaam |
| `category` | `ArticleCategory` | ja | Kleine vaste categorie-indeling |
| `imageReference` | `string` | ja | Referentie naar het artikelbeeld |
| `associationReference` | `string` | nee | Eenvoudige verenigingsreferentie |
| `personalizationCapabilities` | object | ja | Ondersteunde personalisatiesoorten |
| `active` | `boolean` | ja | Beschikbaarheid binnen toekomstig beheer |
| `createdAt` | ISO 8601 `string` | ja | Aanmaakmoment |
| `updatedAt` | ISO 8601 `string` | ja | Laatste wijzigingsmoment |

Categorieën: `Shirt`, `Short`, `Trainingsbroek`, `Trainingsjack`, `Overig`.

## Relatie met AtlasOrder

De eerder gereserveerde `items`-plaats accepteert nu optioneel meerdere minimale
`AtlasOrderArticleReference`-waarden met alleen `articleId`. Daarmee is de
toekomstige veel-op-één-koppeling typeveilig voorbereid zonder al een OrderItem,
aantal, prijs of ingevoerde personalisatie te ontwerpen. De bestaande
demo-orders blijven ongewijzigd en bevatten geen artikelen.

## Bewust uitgesteld

Uitgesteld zijn: Article-beheer, catalogusweergave, Association-model,
mediabeheer, uploads, echte beeldbestanden, OrderItem, aantallen, prijzen,
personalisatie-invoer, orderinterfaces, productieflow, database, API,
authenticatie en externe koppelingen.
