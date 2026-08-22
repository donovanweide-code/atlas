# Sportpaleis immutable deployment runbook

Status: operationele foundation. Dit document geeft **geen** Human GO voor een
productieswitch.

## Bewezen productiecontract

- Releases leven als versie-directory onder `/srv/wbd/releases/<release-id>`.
- `/srv/wbd/current` is de enige actieve applicatiesymlink.
- `/etc/wbd/production.env` bevat de actieve `RELEASE_ID` en blijft buiten de
  release en buiten Git.
- `wbd-workspace.service` draait als `wbdapp`, leest het envbestand en start
  `/srv/wbd/current/website/scripts/workspace-runtime.mjs`.
- De host-routed checks zijn:
  `https://workspace.sportpaleis.nl/healthz` en `/readyz`, lokaal naar
  `127.0.0.1` gerouteerd. De kale localhost-vhost is niet de Workspace-check.
- MariaDB-backups staan versleuteld onder `/var/backups/wbd-mariadb` met een
  afzonderlijke SHA-256-sidecar.
- Database-restore en destructieve down-migration zijn nooit automatisch.

## Tool

`ops/production/spw-immutable-release.sh` heeft drie commando's:

1. `inspect` — valideert current/RELEASE_ID en backupfreshness/checksum.
2. `prepare` — valideert het raw artifactcontract, normaliseert uitsluitend de
   top-level `app/` naar de bewezen `<release>/website/`-layout, valideert de
   runtime/build/servicepaden opnieuw, installeert uitsluitend de gelockte
   productie-dependencies, maakt een actuele rollbacktar plus een
   exacte kopie van het productie-envbestand en schrijft een checksum-locked
   deployplan. De actieve release, `RELEASE_ID` en service blijven ongewijzigd.
3. `switch` — vereist het deployplan én een expliciet overeenkomende
   `--human-go <release-id>`. Het envbestand en de symlink worden ieder via een
   atomische rename vervangen, waarna pas de service herstart. Rode readiness
   herstelt automatisch de vorige symlink en het vorige envbestand.

De tool accepteert in productie geen afwijkende roots, service of readiness-
route. Testoverrides werken alleen met `SPW_DEPLOY_TEST_MODE=1`.

De layoutpreflight vereist vóór staging onder andere
`app/scripts/workspace-runtime.mjs`, `app/package.json`, `app/package-lock.json`,
de Workspace-build en de gepackagede service-unit. Na normalisatie vereist hij
dezelfde bestanden onder `website/`, weigert hij een achtergebleven `app/` en
controleert hij dat de service-unit exact `/srv/wbd/current/website` gebruikt.

## Lokale release- en provenancegate

Voor kandidaat `SPW-FINAL-PRODUCTION-UX-20260821`:

```powershell
git rev-parse SPW-FINAL-PRODUCTION-UX-20260821^{commit}
git ls-remote --tags origin refs/tags/SPW-FINAL-PRODUCTION-UX-20260821 refs/tags/SPW-FINAL-PRODUCTION-UX-20260821^{}
Get-FileHash -Algorithm SHA256 .\release\SPW-FINAL-PRODUCTION-UX-20260821.tar.gz
```

Verwacht:

- commit `7d3777a28afba780e1db63ccf42bdd06249965fa`;
- tree `de41c9b68f4c03ba5279d249ae88bab1723d0aab`;
- artifact SHA-256
  `37789d86a54c02e526c5349fb9a4cdf77eed4d6534aee7ed30827cf4deb4ae03`.

## Server-side voorbereiding — geen switch

Upload artifact, extern manifest en de operationele tool naar een tijdelijke,
root-only staginglocatie. Controleer hun hashes onafhankelijk. Voer daarna uit:

```text
sudo bash spw-immutable-release.sh inspect
sudo bash spw-immutable-release.sh prepare \
  --artifact SPW-FINAL-PRODUCTION-UX-20260821.tar.gz \
  --manifest SPW-FINAL-PRODUCTION-UX-20260821.manifest.json \
  --expected-current SPW-FINAL-PRE-LIVE-CLEANUP-20260821
```

`prepare` moet eindigen met:

```text
PREPARE=PASS
ACTIVE_UNCHANGED=SPW-FINAL-PRE-LIVE-CLEANUP-20260821
HUMAN_GO_REQUIRED=YES
```

Controleer het gemelde deployplan, de plan-SHA, rollbacktar, rollback-SHA,
envsnapshot en backup opnieuw. Verifieer dat `/srv/wbd/current`, de geladen
service en de publieke readiness nog de oude release melden.

## Human GO en switch

Alleen na een nieuwe, expliciete Human GO voor exact de kandidaat-release:

```text
sudo bash spw-immutable-release.sh switch \
  --plan /srv/wbd/shared/deploy-plans/SPW-FINAL-PRODUCTION-UX-20260821.json \
  --human-go SPW-FINAL-PRODUCTION-UX-20260821
```

De tool weigert onder meer:

- een andere Human-GO-release-ID;
- gewijzigde current-symlink, current-manifest of productie-env sinds prepare;
- verlopen/corrupte backup;
- gewijzigde rollbackset of deployplan;
- ontbrekende kandidaatdirectory.

## Readiness en automatische applicatierollback

Na de switch moet host-routed `/readyz` JSON teruggeven met:

```json
{"status":"ready","releaseId":"SPW-FINAL-PRODUCTION-UX-20260821"}
```

De automatische post-switch smoke valideert bekende Sportpaleis-routes in
twee stappen. De legacy Workspace-URL moet exact HTTP `308` geven met het
verwachte relatieve canonieke doel (bijvoorbeeld
`/workspace/sportpaleis/productie` → `/productie`); vervolgens moet uitsluitend
dat doel HTTP `200` geven. Andere 3xx-statussen en afwijkende `Location`-waarden
zijn fail-closed en activeren dezelfde applicatierollback.

Bij restart-, readiness- of smoke-failure herstelt de tool automatisch:

1. het prechange-productie-envbestand;
2. `/srv/wbd/current` naar de vorige immutable release;
3. de Workspace-service;
4. readiness van de vorige release.

Een database-restore gebeurt nooit automatisch. Als ook rollback-readiness
faalt, is dat een kritieke operationele stop en is afzonderlijke Human Recovery
GO vereist.

## Post-switch smoke

Na een succesvolle, later goedgekeurde switch minimaal controleren:

- host-routed health en readiness `200` met exact de targetrelease;
- MariaDB en `wbd-workspace.service` actief, geen restartloop;
- authenticated bootstrap/login;
- Productie, Productie → Bibliotheek, Teamorder en productiehistorie;
- geen review/debug-UI;
- Divide OFF, mail capture/test en hardware-send OFF.

## Bewijs en cleanup

De tool schrijft geen credentials en logt geen env-inhoud. Deployment-evidence
bevat release-ID, deployplanhash, resultaat en timestamp. Tijdelijke uploadfiles
worden na PASS of rollback verwijderd; immutable release, deployplan,
rollbackset en evidence blijven als auditbewijs bestaan.
