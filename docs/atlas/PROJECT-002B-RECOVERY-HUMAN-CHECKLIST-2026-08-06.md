# Project 002B — Recovery Readiness Human Checklist

**Datum:** 2026-08-06  
**Uitvoerder:** uitsluitend een bevoegde menselijke WBD-beheerder  
**Codex-boundary:** Codex krijgt geen recoveryadres, wachtwoord, herstelcode, authenticatorsecret of andere geheimwaarde te zien
**Menselijke bevestiging:** ontvangen op 2026-08-06; geen geheimwaarden ontvangen of vastgelegd

## Doel

Deze checklist legt vast dat het TransIP-hoofdaccount in de huidige eenpersoonsorganisatie ook bij apparaatverlies of uitval van de primaire mailbox gecontroleerd kan worden hersteld. Alleen status en datum worden in Project 002B vastgelegd.

## Verplichte menselijke controles

| Controle | Menselijke handeling | Acceptatiecriterium | Status |
|---|---|---|---|
| Onafhankelijk recoveryadres | Kies een adres buiten de TransIP/WBD-mailomgeving, voeg het zelf toe en rond de verificatie af. | Praktisch testbericht ontvangen; adres zelf niet aan Codex verstrekt. | GO |
| Tweede bevoegde route | Beoordeel tegen de feitelijke organisatiestructuur; maak geen fictieve beheerder en deel nooit het hoofdwachtwoord. | Niet van toepassing zolang WBD één bevoegde beheerder heeft; wordt heropend zodra een tweede beheerder wordt aangesteld. | UITGESTELD / N.V.T. |
| Recoverycodes | Bewaar aangeboden codes zelf in goedgekeurde beveiligde opslag. | Veilige opslag door beheerder bevestigd; geen codes gedeeld of vastgelegd. | GO |
| 2FA-login | Test in een privésessie de normale login en authenticatorprompt. | Nieuwe login met wachtwoord en 2FA is door de beheerder als geslaagd bevestigd. | GO |
| Uitval primaire mailbox | Verifieer een onafhankelijke recoverymailbox buiten de primaire WBD-mailomgeving. | Werkende onafhankelijke mailbox bevestigd; geen adres vastgelegd. | GO |
| Device loss | Doorloop de beschikbare herstelroute zonder werkelijk apparaat uit te schakelen. | Recoverymiddelen, onafhankelijk recoverypad en providerroute zijn bekend en doorlopen. | GO — huidige eenpersoonsorganisatie |
| Break-glass | Gebruik recoverymiddelen en providerrecovery; maak geen gedeeld noodwachtwoord. | Eenpersoonsprocedure vastgelegd; tweepersoonsautorisatie wordt toegevoegd zodra een tweede beheerder bestaat. | GO — huidig model |
| Providercontact | Gebruik alleen het officiële TransIP-support-/recoveryproces wanneer normale herstelroutes niet beschikbaar zijn. | Officiële providerroute is als laatste herstelpad vastgelegd. | GO |

## Break-glassprocedure

1. Alleen gebruiken wanneer de normale login of authenticator niet beschikbaar is.
2. De huidige enige bevoegde WBD-beheerder declareert en documenteert het incident zonder geheimwaarden vast te leggen.
3. Gebruik eerst de beveiligde recoverymiddelen en het onafhankelijke recoverypad; gebruik daarna uitsluitend het officiële TransIP-support-/recoveryproces.
4. Maak geen gedeeld noodwachtwoord of fictief tweede beheeraccount aan.
5. Leg incidenttijd, reden en eventuele providerreferentie vast zonder adressen, codes of andere geheimwaarden.
6. Na herstel: actieve sessies beoordelen, relevante credentials en recoverycodes door de mens roteren, 2FA opnieuw valideren en het incident afsluiten.
7. Zodra WBD een tweede bevoegde beheerder aanstelt, wordt deze procedure opnieuw beoordeeld en wordt tweepersoonsautorisatie toegevoegd.

## Device-lossprocedure

1. Blokkeer of wis het verloren apparaat via het eigen devicebeheer wanneer beschikbaar.
2. Gebruik een reeds geverifieerd tweede apparaat of de providerrecoveryroute.
3. Gebruik zo nodig het onafhankelijke recoverypad en daarna uitsluitend het officiële TransIP-kanaal.
4. Controleer na herstel recente accountactiviteit en autorisaties; wijzig niets anders zonder change-GO.
5. Voeg menselijke tegencontrole toe zodra een tweede bevoegde beheerder bestaat.

## Bewijs zonder geheimen

De menselijke uitvoerder rapporteert uitsluitend:

```text
RECOVERY READY
Datum: 2026-08-06
Onafhankelijk recoverypad geverifieerd: JA
Tweede bevoegde route: UITGESTELD / N.V.T. VOOR HUIDIGE EENPERSOONSORGANISATIE
2FA-login in privésessie geslaagd: JA
Device-lossprocedure doorlopen: JA
Break-glassprocedure passend bij huidige organisatiestructuur: JA
Providerrecovery als laatste route vastgelegd: JA
```

Geen adressen, codes, gebruikersnamen, screenshots van security-instellingen of andere geheimwaarden meesturen.

## GO-poort

**Documentatie: GO.** De menselijke procedure en acceptatiecriteria zijn compleet.  
**Operationele recovery readiness: GO op 2026-08-06** voor de huidige eenpersoonsorganisatie. Het ontbreken van een tweede beheerder is een geaccepteerd organisatorisch restrisico en toekomstige security-uitbreiding, geen actuele blocker. Herbeoordeling is verplicht zodra een tweede bevoegde beheerder wordt aangesteld.
