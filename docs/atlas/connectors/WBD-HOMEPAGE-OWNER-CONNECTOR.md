# Eerste owner-connector: publieke WBD-homepage

## Keuze

De publieke WBD-homepage is gekozen omdat zij actuele WBD-positionering levert, dagelijks relevant is voor search/delen/prospectverwachting, zonder nieuwe kosten of credentialrisico kan worden gelezen en een herbruikbaar HTTPS → normalize → provenance → evidence-patroon bewijst. GitHub, mail, analytics of CRM zouden credentials, extra authorizationbesluiten of een nieuwe betaalde/externe afhankelijkheid vragen.

## Contract

- Source: `https://webuildanddesign.nl/`
- Authentication: `NONE / NOT_REQUIRED`; HTTPS en canonical origin blijven verplicht.
- Fetch: server-side, maximaal 512 KiB, HTML-only, geen redirects, timeout 10 s, maximaal drie retries met backoff.
- Normalize: exact één document title, description, `og:title`, `og:description` en canonical URL. Body/assets worden bewust genegeerd om buildruis te onderdrukken.
- Provenance: source identity, raw/normalized SHA-256, sync run, normalizer id/version, schema version, fetched/observed timestamps.
- Deduplicatie: evidence-id op normalized hash; gelijke content maakt geen duplicate evidence of product Attention.
- Freshness: LIVE bij succesvolle actuele read; STALE met last-known-good bij failure; UNAVAILABLE zonder veilige baseline.
- Failure: één gegroepeerde Attention na drie opeenvolgende failures; herstel na succes; connector kan uit zonder Owner Workspace-uitval.

## Live bewijs

Op 20 augustus 2026 is de bron in de geïsoleerde reviewomgeving werkelijk gelezen. De definitieve run was PASS in één attempt, 106,3 ms, met normalized hash `09c59eef1e78590168bcdd135674b669a8b558deee5344b4ff13f347703a1d46`. De inhoud was gelijk aan de bewaarde snapshot van 12 augustus; daarom is correct géén fictieve positioneringswijziging gemeld.

De eerste centrale live read maakte wel een betekenisvolle `TECHNICAL_VERIFICATION`, Evidence en NBA: Atlas voert de volgende refresh, hashvergelijking en freshness-update zelfstandig uit; geschatte menselijke inspanning is 0 minuten. Een tweede succesvolle read resolveert deze verificatie automatisch.

Het deelbare bewijsartefact staat in `.atlas-review/wbd-owner-live-proof-report-final.json`. De bijbehorende owner-state is lokaal en wordt door `.gitignore` uitgesloten omdat deze alleen voor browseracceptance dient. Productie is niet gewijzigd.
