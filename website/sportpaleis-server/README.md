# Sportpaleis pilot server boundary

Foundation 006 supplies a locally executable reference service and a production datastore contract. The local service is deliberately provider-neutral and uses an atomic, locked file store for repeatable security and concurrency tests. The existing TransIP shared-hosting pattern is PHP 8.2 plus MariaDB/MySQL; `schema.mysql.sql` maps the same server-owned concepts to that runtime.

Capability Build 003 extends this same model with association configuration, order-bound custom articles, Teamorders, participant rows and one-time account activation. The raw activation token is returned once for controlled local handoff; only its SHA-256 hash is persisted. `migrations/pilot-001-to-capability-003.sql` is a deployment candidate, not an executed production mutation.

## Security contract

- Passwords are supplied only through deployment environment/secrets and stored as one-way adaptive hashes.
- Authentication, roles, order IDs, revisions, audit and idempotency are server-owned.
- The browser receives an opaque `HttpOnly`, `SameSite=Strict` session cookie; production additionally requires `Secure` and HTTPS.
- Mutations require same-origin checks, CSRF validation and an idempotency key where duplication matters.
- Admin endpoints return server-side 403 for operators. Hiding navigation is only a secondary UI measure.
- Responses are `no-store`; no credential, password hash or session token is logged or sent in bootstrap data.
- `hardwareSendEnabled` remains false. This server boundary contains no Summa, PIPE01, USB or driver write implementation.

## Deployment gate

Do not run this schema, migrate data, issue accounts, alter DNS or activate hosting without Donovan's explicit GO. Before a pilot can be marked ready, an approved deployment must implement the same API contract on the existing PHP/MariaDB boundary, load secrets outside DocumentRoot, validate HTTPS/cookies, run the role and concurrency tests against the deployed endpoint, and complete an isolated database restore.

The local file store is test evidence and a safe single-host candidate; it is not a substitute for the approved TransIP database deployment.
