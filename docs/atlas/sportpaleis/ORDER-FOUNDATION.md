# Sportpaleis Workspace — Order Foundation

## Doel van fase 1

Deze fase legt alleen het gedeelde Order-model vast. Er is geen applicatiescherm,
invoer, verwerking, opslag, API of externe koppeling gebouwd. De demo-orders zijn
volledig fictief.

## Waarom één uniforme order?

Een winkelorder en een webshoporder vertegenwoordigen hetzelfde bedrijfsobject:
een order die door dezelfde statusstappen kan gaan. Eén model voorkomt dat elke
bron een eigen proces en eigen waarheid krijgt. Toekomstige orderbronnen moeten
daarom naar `AtlasOrder` worden vertaald voordat verdere verwerking plaatsvindt.

## Waarom is bron metadata?

`source` legt alleen vast waar een order vandaan kwam. Het veld verandert niet
hoe een order werkt en bepaalt geen statussen of vervolgacties. In fase 1 betekent
`Webshop` uitsluitend dat de bestelling afkomstig is uit een e-mail; er wordt nog
geen e-mail ingelezen.

## Waarom interne en externe ordernummers?

`internalOrderNumber` is de stabiele Atlas-identiteit en is altijd aanwezig.
`externalOrderNumber` is optioneel en bewaart, wanneer beschikbaar, de herkenbare
referentie van de oorspronkelijke bron. Hierdoor blijft interne verwerking
consistent zonder de externe traceerbaarheid te verliezen.

## Datamodel

| Veld | Type | Verplicht | Betekenis |
| --- | --- | --- | --- |
| `internalOrderNumber` | `string` | ja | Unieke interne Atlas-referentie |
| `externalOrderNumber` | `string` | nee | Referentie uit de oorspronkelijke bron |
| `source` | `OrderSource` | ja | Alleen herkomstmetadata |
| `customerName` | `string` | ja | Naam op de order |
| `association` | `string` | ja | Vereniging op de order |
| `status` | `OrderStatus` | ja | Gedeelde processtatus |
| `createdAt` | ISO 8601 `string` | ja | Aanmaakmoment |
| `updatedAt` | ISO 8601 `string` | ja | Laatste wijzigingsmoment |

Bronnen: `Winkel`, `Webshop`.

Statussen: `Nieuw`, `Te controleren`, `In productie`, `Gereed`, `Afgesloten`.

## Bewust uitgesteld

Er zijn compile-time uitbreidingsplaatsen gereserveerd voor `customer`,
`personalization`, `communication` en `sourceMetadata`. Fase 2 heeft `items`
uitsluitend vernauwd tot een optionele lijst van artikel-id-referenties; een
volledig OrderItem is nog niet gemodelleerd. Ook orderoverzicht,
detailpagina, filters, zoeken, winkelinvoer, mailverwerking, WhatsApp,
productiescherm, Illustrator en API vallen buiten deze fase.

## Demo-data

`website/src/sportpaleis/demo-orders.ts` bevat één fictieve winkelorder zonder
extern nummer en één fictieve webshoporder met een afwijkend extern nummer.
Beide records voldoen aan hetzelfde `AtlasOrder`-model.
