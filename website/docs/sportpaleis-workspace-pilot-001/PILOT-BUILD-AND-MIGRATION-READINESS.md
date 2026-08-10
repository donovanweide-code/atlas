# Sportpaleis Bedrukking — Minimal Pilot Build 001

## Release

- Build/release-ID: `SPW-BEDRUKKING-PILOT-001-20260809`
- UX-baseline: `SPW-008A-BIJSTURING-20260808`
- Omgeving: uitsluitend lokale, geïsoleerde review op `http://127.0.0.1:5186`
- Echte mail: uit; alleen lokale capture-transport
- Direct Print/hardware-send: uit
- TransIP/DNS/productie: niet gewijzigd

## Bronhiërarchie

1. Laatst vastgestelde Bedrukking-UX-richting: `SPW-008A-BIJSTURING-20260808`.
2. Bestaande Sportpaleis Workspace-design language en officiële SPORT 2000 CID-regels.
3. Functionele pilotopdracht: individuele order, Junior/Senior, veilige correctie, verplichte ontvangstbevestiging.
4. Productie-opbouw voor snijpaden: `Untitled-43.ai`.
5. Specifieke cijfercontouren: `Pioneers nummers.ai`.
6. Gevalideerde Senior-maat: Snijtest 001 / Almerer Pioneers, fysiek 200 mm.

Pioneers is niet gebruikt als algemene design- of productie-opbouwauthority.

## Geïmplementeerd

- Junior/Senior verschijnt uitsluitend bij een rugnummer en is dan verplicht.
- Orderbrede keuze erft naar artikelen; per artikel/variant is een gecontroleerde afwijking mogelijk.
- Senior vertaalt naar de gevalideerde fysieke productiehoogte van 200 mm.
- Junior blijft `DATA_GAP`: geen fysieke maat wordt gegokt of stil aangevuld.
- Een Junior-datagap is zichtbaar in orderdetail en productie en blokkeert doorgang van `ORDER` naar `CONTROL`.
- Normale individuele orders krijgen direct na veilig opslaan een verplichte `ORDER_RECEIVED` capture.
- Zonder bekende succesvolle ontvangstbevestiging kan `ORDER` niet naar `CONTROL`.
- Bekende mailfout kan gecontroleerd opnieuw; `UNKNOWN` blokkeert automatische retry; idempotency blijft actief.
- Inhoudscorrectie is alleen toegestaan in fase `ORDER`, met revision check, RBAC en audit.
- Klantvelden en uitzonderingsmetadata blijven behouden tijdens lokale UI-rerenders.
- Meerdere verenigingen blijven mogelijk binnen één klantorder.

## MariaDB-gereedheid

- Basisschema: `sportpaleis-server/schema.mysql.sql`
- Reproduceerbare migratiekandidaat: `sportpaleis-server/migrations/008a-to-pilot-001.sql`
- Mapping/roundtrip: `sportpaleis-server/pilot-persistence-mapping.mjs`
- Migratie is lokaal gecontroleerd, maar niet op TransIP uitgevoerd.
- Bestaande schema-1 orders worden behouden; Junior/Senior wordt voor historische records niet gegokt.

Latere, afzonderlijk goed te keuren TransIP-stappen:

1. Maak een databasebackup en leg row counts plus schema-versie vast.
2. Voer de `orders_before` controles uit de migratie uit.
3. Draai de migratie in één gecontroleerd onderhoudsvenster.
4. Voer `orders_after` en de expliciete integriteitscontroles uit.
5. Start de runtime met dezelfde release-ID en bestaande secrets via environment provisioning.
6. Controleer health/ready, authenticatie, rolgrenzen en één capture-only pilotorder.
7. Activeer geen productie-mail, Direct Print of hardware zonder nieuwe menselijke GO.

## Actieve datagaps

- Junior fysieke rugnummerhoogte: onbekend en productiestap geblokkeerd.
- Bestaande ontbrekende artikel- en bedrukkingsprijzen: zichtbaar als “Prijs ontbreekt”; niets gegokt.
- FC Almere-polo: bestaand artikelnummer blijft expliciet nog te valideren.
- SPF/DKIM/DMARC van Sportpaleis Mail 005: inboxdelivery is bevestigd, headerauthenticatie blijft afzonderlijk te bevestigen.

## Niet uitgevoerd

- Geen TransIP-deployment.
- Geen echte e-mail.
- Geen DNS- of VDX-wijziging.
- Geen Direct Print-/Summa-/barcodehardwareactie.
- Geen Teamorder, Eigen artikel of externe catalogusconnector.
- Geen nieuw dashboard- of formulierontwerp.

