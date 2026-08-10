# Sportpaleis Live Pilot — Correctieronde 1

Status: release candidate voorbereid; geen deployment uitgevoerd.

## Afgeronde pilotkritieke correcties

- De activatieroute is als geldige Workspace-route beschikbaar voor Beheerder, Winkelmedewerker en Productiemedewerker.
- Verenigingen zijn op desktop en mobiel selecteerbaar in Nieuwe order.
- De orderflow toont alleen artikelen met een actuele, aantoonbare commerciële Bedrukking-optie. Bestaande bevestigde records zijn behouden; DCG Trainingspak en MHC Lelystad Wedstrijdshirt Uit zijn vanuit de actuele live Sportpaleis-bron toegevoegd.
- Letterprofiel, foliekleuren en fysieke bronmaten zijn per vereniging beheerbaar en werken door naar de gekoppelde productieprofielen en open productievoorstellen.
- Human productbesluit: kledingmaten 116, 128, 140, 152 en 164 gebruiken een Junior-rugnummerhoogte van 200 mm. Buiten deze reeks blijft de maat DATA_GAP.

## Open reviewpunten — bewust niet gebouwd

- personeel- en verkoopnummers;
- profielbeheer;
- wachtwoord vergeten;
- logo’s en favicon;
- publieke URL-correcties;
- vrije orderselectie;
- Mijn weergave;
- eigen artikel toevoegen;
- typografie;
- Summa/WinPlot-status;
- overige visuele of functionele polish.

Deze punten zijn geen onderdeel van deze release candidate en worden niet heropend zonder een nieuwe expliciete opdracht.

## Bron- en veiligheidsgrens

- Commerciële artikeldata komt uitsluitend uit actuele Sportpaleis.nl-productpagina’s of reeds bevestigde live records.
- Productieparameters zijn niet uit commerciële pagina’s afgeleid.
- SMTP, Summa, WinPlot, Direct Print, hardware-output, DNS en deployment zijn niet geactiveerd of gewijzigd.
