# Cloudflare Human Action Checklist

Status: **NOT EXECUTED**. Deze reeks is alleen voor een latere expliciet geautoriseerde opdracht. Deel nooit wachtwoorden, MFA-codes, recoverycodes, API-tokens, private keys, cookies of volledige gevoelige DNS-verificatiewaarden met Codex.

## CF-H1 — Cloudflare account creation

- Waarom menselijk: voorwaarden, DPA, accountownership en recovery introduceren een nieuwe leverancier/trust boundary.
- Systeem/capability: Cloudflare account creation, geen zone of productie.
- [ ] Kies een WBD-owned accountmail met recovery buiten een uitsluitend WBD-mailafhankelijk pad.
- [ ] Bevestig actuele Free-planvoorwaarden, DPA, subprocessors en privacybesluit.
- [ ] Gebruik een uniek wachtwoord dat direct human-only in Bitwarden wordt opgeslagen.
- Niet delen: login, wachtwoord, account-ID, recoveryadres of sessiescreenshot.
- Veilige evidence: account bestaat, ownerrol, planclass, tijd en privacybesluitreferentie.
- Codex hervat alleen na: aparte GO en secretvrije bevestiging.

## CF-H2 — Account security / 2FA / recovery

- Waarom menselijk: 2FA- en recoverydata geven accountovernamecapaciteit.
- Systeem/capability: authentication/recovery, geen zoneconfiguratie.
- [ ] Activeer security key of TOTP; bevestig alleen methodeklasse.
- [ ] Sla backupcodes human-only in Bitwarden op.
- [ ] Verifieer recoveryroute zonder een echte recovery/reset te starten.
- [ ] Registreer geen fictieve tweede beheerder.
- Niet delen: QR secret, TOTP, backupcode, recoverymail/-telefoon of vault-itemnaam.
- Veilige evidence: 2FA actief, recovery opgeslagen/gecontroleerd, eigenaar en datum.
- Codex hervat alleen na: status `verified` zonder secretdata.

## CF-H3 — Zone addition without cutover

- Waarom menselijk: zone-aanmaak maakt toekomstige DNS-/edgecontrole mogelijk.
- Systeem/capability: alleen `webuildanddesign.nl` als pending zone.
- [ ] Zorg dat TransIP-export en rollbackbewijs vooraf bestaan.
- [ ] Voeg alleen WBD toe; niet Fara, Sportpaleis of klantdomeinen.
- [ ] Wijzig geen nameserver, DS, DNSSEC of TransIP-configuratie.
- [ ] Importeer alleen na aparte GO en zet proxy-import standaard uit.
- Niet delen: account-/zone-ID, tokens of gevoelige recordwaarden.
- Veilige evidence: zone pending/not authoritative, toegewezen NS veilig opgeslagen, alle records DNS-only.
- Codex hervat alleen na: bewijs van nul productie-effect.

## CF-H4 — DNS reconciliation review

- Waarom menselijk: auto-import kan records missen of verkeerde proxyflags kiezen.
- Systeem/capability: read-only vergelijking van TransIP-export en Cloudflare-zone.
- [ ] Controleer elk A/AAAA/CNAME/MX/TXT/SPF/DKIM/DMARC/CAA/NS/wildcard/verificatierecord.
- [ ] Bevestig mail-/verificatie-/non-HTTP-records als DNS-only.
- [ ] Bevestig dat apex, `www`, preview, Experience en wildcard vóór delegation DNS-only zijn.
- [ ] Stop bij iedere mismatch/unknown.
- Niet delen: gevoelige TXT-inhoud; gebruik matchstatus/hash.
- Veilige evidence: 100% matched tellingen en ondertekende reviewreferentie.
- Codex hervat alleen na: zero mismatch/unknown en Human GO.

## CF-H5 — Cutover readiness confirmation

- Waarom menselijk: nameserver en DNSSEC raken de volledige web- en mailzone.
- [ ] Onafhankelijke edge/origin/DNS/TLS/app-monitoring staat aan.
- [ ] Origin Full (strict)-certificaat en renewal onder externe DNS/proxy zijn bevestigd.
- [ ] NS/DS/TTL/current-state en state-aware rollback zijn gereed.
- [ ] Mailtest, observatievenster, decision owner en communicatie zijn gepland.
- [ ] DNS/mail/canonical/deployment freeze is bevestigd.
- [ ] Privacy/account/recovery en off-provider evidence zijn gereed.
- Niet delen: credentials, recoverydata, secrets of mailboxinhoud.
- Veilige evidence: readinessmatrix, resterende gaps en aparte A→C/C→D/E→F/F→G GO-referenties.
- Codex hervat alleen na: formele GO voor exact één state transition.

## Algemene stopcriteria

Stop onmiddellijk bij `SERVFAIL`, onbekende DS-state, recordmismatch, mailimpact, TLS 525/526, origin/application failure, onverwachte challenge/cache, account lockout of ontbrekend rollbackbewijs. Bepaal eerst de actuele state; improviseer nooit een gecombineerde DNSSEC/nameserverrollback.
