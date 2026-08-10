# Credential & Access Review Checklist

Doel: periodiek secretvrij vaststellen of toegang nog nodig, minimaal, herstelbaar en intrekbaar is. Open geen vault-item en deel geen secret.

## Per access record

- [ ] `access_id`, organisatie, omgeving en capability zijn uniek en actueel.
- [ ] De menselijke authority en technische access holder zijn afzonderlijk bekend.
- [ ] De eigenaar bestaat werkelijk en heeft deze rol bevestigd.
- [ ] Scope is technisch bewezen; providerbeperkingen zijn niet mooier beschreven dan zij zijn.
- [ ] Productie-impact en cross-organisation blast radius zijn correct.
- [ ] Authentication- en secret-location-class zijn bekend zonder secretwaarden.
- [ ] Recoveryroute is veilig bevestigd of expliciet `unknown`.
- [ ] De toegang is nog noodzakelijk; zo niet, is aparte revocation-GO aangevraagd.
- [ ] Tijdelijke toegang is `revoked` of `expired`, met secretvrij bewijs.
- [ ] Rotatie is alleen gestart door een geldige trigger.
- [ ] Evidence beantwoordt autorisator, capability, doel, tijd, impact, resultaat en resterende noodzaak.
- [ ] `last_reviewed`, `status` en `notes` zijn bijgewerkt.

## Escalatie

Label `SECURITY ATTENTION` wanneer eigenaarschap onbekend is, scope breder blijkt, intrekking niet is bevestigd, recovery ontbreekt of mogelijke secret exposure bestaat. Noteer bij exposure alleen pad en secretklasse. Voer geen rotatie, intrekking of rechtenwijziging uit zonder task-scoped Human GO.

## Reviewresultaat

- Review reference: `[REFERENCE]`
- Reviewed by role: `[HUMAN ROLE]`
- Reviewed at: `[ISO 8601]`
- Records reviewed: `[COUNT]`
- Healthy: `[COUNT]`
- Attention: `[COUNT]`
- Unknown: `[COUNT]`
- Required Human Actions: `[REFERENCES ONLY]`
