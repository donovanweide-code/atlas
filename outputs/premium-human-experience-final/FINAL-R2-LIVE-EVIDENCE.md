# Sportpaleis Premium Human Experience Final R2 — live evidence

## Immutable release

- Release: `SPW-PREMIUM-HUMAN-EXPERIENCE-FINAL-R2-20260826`
- Commit: `988fee5cbc10afcc325da5eee4c3ecde60316102`
- Artifact SHA-256: `05605d1891e38a0795d4d96c0c79b1637a92b186602f42516571dc121acac245`
- Manifest SHA-256: `c02f1fa40156bb95b481f2790238c3a20b240112faa37c75723beb11681dd19f`
- Deployplan SHA-256: `b4233a78da446184afcdb06940cb425457b635bd5533b338779f936168c298a3`
- Prepare run: `32926176214` — PASS
- Switch run: `32926247419` — server switch PASS; workflow marker mismatch after activation

## Production-shaped candidate

- Exact tarball unpacked with the locked production dependency set.
- `pdfjs-dist` version `6.2.108` imported successfully.
- Local health `200`, readiness `200`, `/orders/nieuw` `200`, `/orders/eigen-artikel` `200`.
- Legacy route returned exact `308` and `Location: /productie?proof=R2`.
- Dependency audit: `0 vulnerabilities`.

## Prepare and recovery

- Fresh encrypted database backup: PASS.
- Backup SHA-256: `62ecf93575824c4e5b09994357745c6294cc931d0b9dbe20827b0cd7b685f60e`.
- Candidate staged without changing live R1: PASS.
- Rollback artifact, environment snapshot, current-manifest, production-env, stale-state and deployment-lock gates: PASS.

## Switch and live runtime

The immutable server tool completed plan, Human GO, candidate, previous release, current release, manifest, production environment, rollback artifact, environment snapshot, backup freshness, consistency, lock, atomic switch, readiness, smoke and evidence before emitting:

```text
SWITCH=PASS
ACTIVE_RELEASE=SPW-PREMIUM-HUMAN-EXPERIENCE-FINAL-R2-20260826
```

The GitHub wrapper then expected only the newer literal `LIVE_SWITCH=PASS` and marked the job failed before its read-only evidence-fetch step. This was a post-activation wrapper-marker mismatch, not a runtime or rollback failure; no tooling workaround or redeployment was performed.

- Active symlink: R2.
- Service: active.
- Public `/healthz`: `200 {"status":"ok"}`.
- Public `/readyz`: `200` with exact R2 release ID.
- Public legacy smoke: exact `308`, exact relative `Location` with query preserved.
- Rollback: not triggered and not required.

## Live Chrome acceptance

- Signed-in identity: Donovan Weide, Beheerder · gedeeld.
- Today, Orders, Webshop, Search, Production, Library, History, Guided Setup and Teamwear render interactively on R2 without recovery state.
- Standalone Bedrukken and Vrije opdruk render directly; the R1 read-only fallback is gone.
- City source and its four candidate SVG parts remain present in the central Library.
- Teamwear displays the complete guided stepper, 103 bounded catalog models, one collection truth, garment-first Studio and customer proposal.
- Live direct article search `BV6708` resolves Nike Dri-FIT Park VII.
- Live official discovery shows Stanno, Nike Teamwear, adidas Teamwear, JAKO, Robey and Craft.
- No order, mail, proposal approval, production proposal, PlotJob, status or inventory mutation was performed.

## Evidence boundary

Desktop live Chrome acceptance is PASS. The externally linked Chrome tab does not expose a working 390/320 viewport override; responsive source contracts and regressions remain green. This is an automated viewport-evidence limitation, not a hidden product-functionality failure.
