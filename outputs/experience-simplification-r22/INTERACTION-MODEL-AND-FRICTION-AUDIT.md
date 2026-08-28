# Sportpaleis Experience Simplification R2.2

Status: technisch bewezen; echte Browser Acceptance nog niet bewezen.

## Gedeeld interactiemodel

1. De echte taak staat vooraan.
2. Bekende Product Truth wordt automatisch toegepast.
3. Order-, artikel-, klant- en cataloguscontext zijn versnellers, geen verplichte administratie.
4. Alleen een echte ambiguïteit of ontbrekende fysieke waarheid vraagt menselijke invoer.
5. Specialistische bron-, geometrie- en provenance-informatie blijft beschikbaar via progressive disclosure.
6. Iedere verkorte route komt uit op dezelfde server-side order-, composition-, font-, production- en auditwaarheid.

## Operational Friction / Necessity Audit

| Taak | R2.1 standaardervaring | R2.2 standaardervaring | Noodzakelijke invoer | Onderliggende zekerheid |
|---|---|---|---|---|
| Homepage/banner maken | concept, bronbehandeling, productkeuze, titel en art-direction vóór canvas | bron plakken/slepen/kiezen, outputtaak staat al op Homepage, direct canvas | bron; output alleen wijzigen indien nodig | immutable source, composition revision en kanaalcomposities behouden |
| Bestaand beeld alleen tekst geven | bron plus interne classificatie | bron openen, direct canvas; `PRESERVE_SOURCE` automatisch | bron en gewenste tekst | bron wordt niet geregenereerd |
| Productfoto naar social/story/mail | intakeclassificatie plus bronkeuzes | product/beeld en één zichtbare outputkeuze | bron/product en gewenst kanaal | ieder kanaal blijft afgeleid van dezelfde compositie |
| Studio-object positioneren | range-controls | direct slepen op canvas; exacte controls onder disclosure | directe manipulatie | dezelfde x/y/scale-formulierwaarheid en autosave-revision |
| Teamwear starten | zichtbare databasewand plus administratieve velden | één zoekveld; exacte bekende context automatisch herkend | alleen naam; keuze uitsluitend bij ambiguïteit | dedupe/ranking en canonical proposalcontext behouden |
| Vrije opdruk `28 · 16 cm · WIT · Spain` | order-/artikelcontext en technische voorbereiding prominent | waarde/reeks, hoogte, kleur en font direct; context optioneel | fysieke uitvoerwaarheid | managed-font gate, fysieke maat, foil, cardinaliteit en Human GO behouden |
| Meerdere vrije opdrukken | herhaalde invoer per regel | lijst/reeks met aantallen plus geselecteerde regels gezamenlijk hoogte/kleur/font wijzigen | alleen de gedeelde wijziging | iedere regel blijft een afzonderlijke production identity |
| Kleine ordercorrectie | volledige order voelde opnieuw verplicht | contactcorrectie en altijd zichtbare Opslaan-actie; bestaande items blijven staan | uitsluitend gewijzigd contactveld | optimistic revision en audit oud→nieuw behouden |
| Font toevoegen | technische provenance zichtbaar/verplicht | productienaam + bestand; provenance optioneel en audit automatisch | naam en bronbestand | admin gate, signature/outline/hash/dedupe/persistence behouden |
| Productie-aandacht | technische fout zonder duidelijke route | menselijke ontbrekende waarheid plus concrete vervolgactie | alleen werkelijk ontbrekende waarheid | productie blijft fail-closed op echte maat/font/foil/source-invarianten |

## Benchmarkconclusie

- Illustrator/Photoshop-patroon behouden: canvas en directe manipulatie zijn primair; precieze specialistische controls blijven bereikbaar.
- Canva-patroon behouden: upload/paste/drop en het gewenste resultaat zijn de ingang, niet interne classificatie.
- Externe-specialistpatroon behouden: medewerker geeft de zakelijke opdracht; Workspace past bekende regels en provenance onder water toe.
- Afwijking is uitsluitend toegestaan voor bewezen productiecorrectheid, approval en side-effectgrenzen.

## Behouden harde waarheid

Geen versoepeling van managed fonts, foliekleuren, fysieke maten, Teamwear-geometrie, aspect ratio, vector/source provenance, mirror, order/decoratie-cardinality, permissions, audit, Human GO of release/rollbackcontracten.

## Browser-assurance

De production-shaped lokale runtime luistert gezond op `127.0.0.1:3000`. De officiële Chrome-binding kon Chrome en open tabs inventariseren, maar `nameSession`, `claimTab` en `tabs.new` liepen herhaald begrensd vast. De in-app Browser is niet beschikbaar. De voorgeschreven read-only diagnose toont bovendien dat de lokale native-hostmanifest/registrykoppeling ontbreekt. Daarom zijn desktop, 390px en 320px bewust niet als PASS geclaimd en is geen alternatieve browserautomation gebruikt.

