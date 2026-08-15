# WBD Workspace — Owner Foundation V1 — HARVEST preflight

**Datum:** 2026-08-15
**Startcommit:** `b1878d0` (`spw-access-lifecycle-001-20260815`)
**Scopebesluit:** **M — GO voor de begrensde verticale slice**

## Feitelijke basis

| Foundation | Bewijs | Hergebruik in Owner V1 |
|---|---|---|
| Fail-closed WBD-routes | commit `8f6f346`; runtime- en regressietest | behouden; alleen de nieuwe owner-shell en WBD API worden gericht geopend |
| Password/session/CSRF | Sportpaleis pilot service; scrypt, gehashte sessietokens, CSRF-hash, SameSite/HttpOnly/Secure cookies, origin-check en rate limiting | dezelfde security-primitives en hetzelfde requestpatroon; geen identity-provider of signup |
| Rollen/autorisatie | Sportpaleis server-side role gates | vereenvoudigd naar exact één `OWNER`-rol en één Donovan-identiteit |
| MariaDB/revision | `SportpaleisMariaDbStore`, `sp_runtime_state`, optimistic revision en migration checksum | eigen `wbd_owner_state`-record in dezelfde Workspace-database; Sportpaleis-state blijft gescheiden en ongemuteerd |
| Audit | Sportpaleis append-only audit-events in centrale state | login, logout en capabilitywijzigingen krijgen WBD-owner audit-events |
| Health/readiness | gedeelde runtime met componenthealth en release-ID | afzonderlijke `/health/wbd` en `/ready/wbd` |
| Release/rollback | immutable tar release, manifest, versioned release directory en shared runtime | bestaande procedure zonder nieuw deploymentplatform |
| PWA/mobile | Sportpaleis responsive/PWA en service-workercorrectie `fe84b09` | responsive browser-first owner-UI; geen WBD-service-worker in V1 om stale centrale waarheid te vermijden |
| WBD UI | bestaande visuele basis | alleen kleur/typografieprincipes; oude browsergebonden schermen worden niet in de owner-entrypoint geïmporteerd |
| WBD dossiers/finance | IndexedDB en lokale API/file-state | niet gemigreerd, niet verwijderd en niet als centraal gepresenteerd |
| Current runtime | gedeelde Node-runtime en bestaande MariaDB-credentials | één extra geïsoleerde WBD-handler; Sportpaleis-handler en routes blijven intact |

## Waarom M en niet L

De slice vraagt één kleine schema-uitbreiding, één owner-auth/serviceboundary, één centrale capabilitybron, één compacte UI en gerichte release-aanpassing. Niet nodig zijn multi-tenancy, user management, documentmigratie, object storage, SSO, passkeys, CRM of een generieke Workspace-herbouw.

De scope wordt alsnog **L / STOP** wanneer tijdens implementatie één van deze zaken noodzakelijk blijkt:

- een tweede identity-provider of generieke identitylaag;
- wijziging van Sportpaleis users, orders of productie-state;
- automatische migratie van IndexedDB, Finance of dossiers;
- meer dan één nieuwe centrale WBD-stateboundary;
- een generieke tenant-, permissions- of module-engine.

## Security- en datagrens

- De browser ontvangt nooit capabilitydata vóór een geldige WBD-owner sessie.
- De ownerbundle bevat geen capabilityseed en importeert geen oude WBD browserdata.
- De WBD-cookie heeft een eigen naam, is HttpOnly, SameSite=Strict en in productie Secure.
- Mutaties vereisen geldige sessie, exact `OWNER`, toegestane origin, CSRF en expected revision.
- De eerste WBD-owner credential wordt eenmalig vanuit het reeds bewezen Donovan password-record gebootstrapt zonder plaintext te lezen of Sportpaleis-state te wijzigen. Daarna is de WBD-state zelfstandig.
- WebAuthn kan later als extra credential aan dezelfde owner-ID worden gekoppeld; het V1-model bindt identity niet aan een browser of device.
