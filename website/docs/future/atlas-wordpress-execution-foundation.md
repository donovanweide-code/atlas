# Atlas WordPress Execution Foundation

## Doel

Atlas moet bij toekomstige WordPress-projecten twee rollen veilig combineren:

- **Atlas denkt:** begrijpt de klantvraag, kent de installatie, analyseert impact, vergelijkt oplossingen en bewaakt beslissingen.
- **Atlas voert gecontroleerd uit:** bereidt wijzigingen voor, bouwt en test op staging en zet pas na menselijke goedkeuring door.

De klant ervaart eenvoud. Complexiteit, risico's en technische afhankelijkheden worden achter de schermen georganiseerd.

## Advies en uitvoering

Advies eindigt bij een onderbouwde keuze, inclusief impact en risico. Uitvoering verandert code, configuratie of data en vereist daarom altijd een bekende omgeving, back-up, testplan, goedkeuring en rollback.

Atlas werkt nooit standaard onbewaakt op een live website of webwinkel.

## Veilige uitvoeringsstraat

1. Klantvraag in eigen woorden vastleggen.
2. Bedrijfsdoel en gewenste uitkomst bepalen.
3. WordPress-installatie en kritieke processen inventariseren.
4. Impact, afhankelijkheden en risico's analyseren.
5. Oplossing kiezen en besluit vastleggen.
6. Back-up en herstelbaarheid controleren.
7. Wijziging op staging bouwen.
8. Geautomatiseerde checks en relevante functionele tests draaien.
9. Desktop, mobiel en kritieke flows visueel controleren.
10. Menselijke goedkeuring vastleggen.
11. Gecontroleerd naar productie uitrollen.
12. Rollback beschikbaar houden en verifiëren.
13. Resultaat en herbruikbare les documenteren.

## Mogelijke integraties

- **Git:** versiebeheer, review en herleidbare releases.
- **Staging:** geïsoleerde bouw- en acceptatieomgeving.
- **WP-CLI:** inventarisatie, onderhoud en gescripte acties.
- **WordPress REST API:** begrensde acties op content en instellingen.
- **Application Passwords:** intrekbare toegang per integratie, nooit in documentatie opslaan.
- **Back-ups:** database en bestanden vóór risicovolle wijzigingen.
- **Tests:** lint, unit-, integratie-, regressie- en kritieke flowtests waar beschikbaar.
- **Deployment:** reproduceerbare release met expliciete goedkeuring.
- **Logging:** wie, wat, wanneer, omgeving en resultaat.
- **Rollback:** vooraf beschreven herstelroute per wijziging.

## Minimale eerste versie

De eerste bruikbare versie bestaat uit:

1. een ingevuld WordPress-klantprofiel;
2. een wijzigingsverzoek per opdracht;
3. een Git-repository of andere herleidbare bron;
4. een bereikbare stagingomgeving;
5. een gecontroleerde WP-CLI- of REST-toegang zonder standaard productierechten;
6. een projectspecifieke testchecklist;
7. een handmatig goedkeuringsmoment vóór productie;
8. een vastgelegd deploy- en rollbackproces.

## Werkprincipes

- We bouwen onderdelen die vandaag bruikbaar zijn én later Atlas OS kunnen vormen.
- Bespaart dit bij een echte klant volgende week minimaal één uur?
- Kunnen we dit over zes maanden opnieuw gebruiken?
- De bestaande klant heeft altijd prioriteit boven een toekomstige droom.
- Atlas groeit uit echte klantprojecten, niet alleen uit theorie.
- Atlas organiseert complexiteit achter de schermen, zodat de klant eenvoud ervaart.

## Bewust nog niet gebouwd

- geen autonoom Atlas OS;
- geen productieplugin met generieke schrijfrechten;
- geen onbewaakte live deployments;
- geen opslag van wachtwoorden, tokens of klantgeheimen in Markdown;
- geen universele WordPress-architectuur vóór een echte klantvraag;
- geen automatische plugininstallaties, updates of databasewijzigingen zonder projectspecifieke controle.
