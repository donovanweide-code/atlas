# Human Action Checklist Template

Gebruik één checklist per systeem, capability en tijdvenster. Dit sjabloon is secretvrij. De mens voert secrets alleen rechtstreeks in de bedoelde vertrouwde interface in.

## Gemeenschappelijke header

- Task/reference: `[REFERENCE]`
- Organisation: `[ORGANISATION_ID]`
- Environment: `[ENVIRONMENT]`
- System/provider: `[SYSTEM / PROVIDER]`
- Capability: `[ONE CAPABILITY]`
- Purpose: `[WHY REQUIRED]`
- Expected production impact: `[NONE / LOW / MEDIUM / HIGH / CRITICAL]`
- Authorised by: `[HUMAN ROLE; NO LOGIN NAME]`
- Human GO recorded at: `[ISO 8601]`
- Access window: `[START]` to `[END]`
- Safe evidence target: `[RELEASE OR ACCESS REGISTER REFERENCE]`

## PROVIDER LOGIN REQUIRED

**Waarom menselijk:** de providerlogin heeft brede, mogelijk organisatieoverschrijdende rechten en blijft human-only.

- [ ] Controleer zelf domein/provider en phishingindicatoren.
- [ ] Gebruik de eigen vertrouwde sessie en MFA.
- [ ] Controleer dat de bedoelde organisatie, dienst en omgeving zichtbaar zijn.
- [ ] Voer alleen de genoemde capability uit; navigeren is geen impliciete GO voor wijzigingen.
- [ ] Deel niet: username, wachtwoord, MFA-code, sessiecookie, recoverycode, accountnummer of screenshot met gevoelige metadata.
- [ ] Deel veilig: gelukt/niet gelukt, gecontroleerde capability, tijd, niet-gevoelige providerstatus en eventuele blocker.

**Codex gaat pas verder wanneer:** Human GO plus secretvrije bevestiging van de juiste providercontext zijn vastgelegd.

## CREDENTIAL CREATION REQUIRED

**Waarom menselijk:** creatie introduceert nieuwe toegang en blast radius.

- [ ] Bevestig één capability, eigenaar, organisatie, omgeving en eindtijd.
- [ ] Kies de smalste technisch beschikbare scope; leg providerbeperking vast.
- [ ] Bepaal opslagklasse, review, rotatietriggers en intrekkingsroute vóór creatie.
- [ ] Maak geen gedeelde menselijke identiteit voor machinegebruik.
- [ ] Deel niet: secretwaarde, private key, recoverycodes of volledige public key.
- [ ] Deel veilig: account/access class, niet-geheime fingerprint/label, scope, created-at, expires-at en revocation plan.

**Codex gaat pas verder wanneer:** aparte GO voor gebruik bestaat en de secret buiten chat/Git/evidence is opgeslagen.

## CREDENTIAL ROTATION REQUIRED

**Waarom menselijk:** rotatie kan runtime, deployment of recovery breken.

- [ ] Leg trigger vast: compromise, rolwijziging, exposure, providereis, privilegewijziging of risicoreview.
- [ ] Bevestig afhankelijke services en geldige rollback vóór wijziging.
- [ ] Maak aparte GO voor create, omschakeling, validatie en oude credential intrekken.
- [ ] Valideer zonder secret in log of screenshot.
- [ ] Deel niet: oude/nieuwe secret, MFA-/recoverycode of vault-itemnaam.
- [ ] Deel veilig: trigger, betrokken capability, tijden, validatieresultaat en oude-credential-status.

**Codex gaat pas verder wanneer:** nieuwe route veilig is bevestigd en de status van de oude credential ondubbelzinnig is.

## RECOVERY VERIFICATION REQUIRED

**Waarom menselijk:** recoverydata geeft vaak accountovernamecapaciteit.

- [ ] Verifieer alleen aanwezigheid, eigenaar, bereikbaarheid en actualiteit.
- [ ] Start geen reset/hersteltest tenzij die afzonderlijk is geautoriseerd.
- [ ] Controleer dat recovery niet uitsluitend van dezelfde uitvalroute afhankelijk is.
- [ ] Deel niet: recoverycodes, hersteladres/-telefoon, backupkeys, mailboxinhoud of security answers.
- [ ] Deel veilig: `verified`/`unknown`/`failed`, datum, menselijke eigenaar en risicogap.

**Codex gaat pas verder wanneer:** secretvrije status is vastgelegd; een echte recoveryactie vereist een nieuwe GO.

## PRODUCTION ACCESS REQUIRED

**Waarom menselijk:** de actie kan publieke beschikbaarheid, data of herstelbaarheid raken.

- [ ] Koppel release-ID, target, organisatie, omgeving en exact één capability.
- [ ] Controleer build/hash, pre-change backup waar nodig, live-validatie en rollback.
- [ ] Bevestig verwachte blast radius en onderhouds-/tijdvenster.
- [ ] Geef aparte GO voor upload, database, DocumentRoot en andere control-planeacties.
- [ ] Beëindig of trek tijdelijke toegang direct na validatie/afbreken in.
- [ ] Deel niet: credential, private key, providercookie, DB-data of geheime config.
- [ ] Deel veilig: GO-tijd, access class, start/einde, resultaat, live-validatie, rollbackstatus en revocatiebewijs.

**Codex gaat pas verder wanneer:** de specifieke productie-GO is vastgelegd. Na uitvoering eindigt Codex pas wanneer validatie én access closure als secretvrij bewijs bestaan.

## Afsluiting

- Result: `[SUCCEEDED / FAILED / ABORTED / NOT EXECUTED]`
- Actual production impact: `[DESCRIPTION]`
- Temporary access status: `[REVOKED / EXPIRED / NOT APPLICABLE / HUMAN VERIFICATION REQUIRED]`
- Evidence reference: `[REFERENCE]`
- Open security attention: `[NONE OR PATH + CLASS ONLY]`
- Human confirmed at: `[ISO 8601]`

