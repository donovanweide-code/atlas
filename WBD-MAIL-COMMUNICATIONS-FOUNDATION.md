# WBD Mail & Communications Foundation

## Werkelijk geïmplementeerd

Deze release bouwt additief op de bestaande transactionele Mail Foundation. De bestaande WBD SMTP-, factuur-, template-, audit- en Sportpaleis capture-flows blijven de outbound authority.

Nieuw is een centrale inbound/control-laag voor WBD Owner:

- twee voorbereide WBD-mailboxidentiteiten: `info@webuildanddesign.nl` en `facturen@webuildanddesign.nl`;
- IMAP over TLS met server-side credentials, UIDVALIDITY/UID-checkpoints en recente/incrementele fetches;
- centrale MariaDB-tabellen voor controlstate, berichten, threads en mailaudit;
- deduplicatie, Message-ID/References-threading en een begrensde subject/participant-fallback;
- veilige HTML-normalisatie, standaard geblokkeerde remote images en executable/macro/reply-to signalering;
- Atlas evidence, deterministic classificatie, Attention, NBA en prepared action;
- owner-only Mail API, Universal Search-aansluiting en `/workspace/wbd/mail`;
- een snelle centrale read projection zonder live connectorcall tijdens render;
- contact/consent/suppression/segment/campaign/journey/bulk-contracten;
- bestaande Sportpaleis bedrukmail-readiness zichtbaar als capture-only, zonder de productieflow te wijzigen.

## Activation boundary

Er zijn geen mailboxcredentials toegevoegd en er is geen echte mailbox gelezen of bericht verstuurd. Tot provisioning blijft de interface eerlijk `Klaar om veilig te koppelen` tonen.

Provisioning gebruikt uitsluitend server-side environment references:

- `WBD_MAIL_INFO_IMAP_HOST`, `WBD_MAIL_INFO_IMAP_PORT`, `WBD_MAIL_INFO_IMAP_SECURE`, `WBD_MAIL_INFO_IMAP_USER`, `WBD_MAIL_INFO_IMAP_PASSWORD`;
- dezelfde velden onder prefix `WBD_MAIL_FACTUREN`;
- optioneel `WBD_MAIL_IMAP_INTERVAL_MS` (minimum 30 seconden, standaard 120 seconden).

De connector publiceert nooit passwords. Partial configuration is `NOT_CONNECTED` en niet half-actief.

## Autonomy en Human GO

Autonoom toegestaan: lezen, ophalen, normaliseren, dedupliceren, threaden, classificeren, evidence vastleggen, Attention/NBA maken en een concept voorbereiden.

Altijd Human GO/policy-bound: ieder extern antwoord, campagne/bulk-send, sender-identity wijziging en ander extern effect. Onbekende risico’s falen gesloten. Bulk blijft bovendien dicht zonder bewezen consent, suppressioncheck, verbonden transport en expliciete campaign approval.

## Performance

De UI leest centrale projecties. MariaDB gebruikt recent-, mailbox-, thread-, attention- en full-text indexes. Connectorwerk draait in de achtergrond. UI-renders doen exact nul IMAP-calls. De huidige hot windows zijn begrensd op 10.000 messages en 5.000 threads voor mutatie/recovery; workspaceweergaven zijn maximaal 100 threads.

## Recovery en failure

Migraties `003` t/m `006` zijn additief, één statement per release-migratie, en bevatten geen delete/drop/truncate. De bestaande WBD Owner state en Sportpaleis-tabellen worden niet gewijzigd. Connectorfailure bewaart de laatste centrale state, toont freshness eerlijk en verwerkt een malformed bericht geïsoleerd. De connector kan uitblijven of worden gestopt zonder de Workspace of andere tenants onbruikbaar te maken.

## Nog niet live

- echte IMAP-authenticatie en eerste mailboxsync;
- outbound WBD-send vanuit de Owner UI;
- bulkprovider, tracking of live journeys;
- externe Sportpaleis bedrukmail;
- automatische contactimport.

Dit zijn bewuste activation boundaries, geen verborgen live claims.
