# Personal session reconciliation

Reconciled after Planning/capabilities checkpoint `3b3c610`. The old dirty single-session candidate was not imported or modified.

Policy: preserve current personal multi-session behavior. Password login creates a separate session; logout removes only that session. Shared-workplace sessions retain the existing eight-hour default; personal-device sessions retain the existing thirty-day TTL. These are device/session settings, not capability grants. Existing admin/support full-password step-up for quick switch is preserved. No shared employee identity, name-based exception or privilege downgrade was introduced.

Implementation: the existing store transaction lane carries an in-process authority callback with each prepared command. Personal service calls validate the actual session and effective capabilities inside the mutation and again under the MariaDB revision lock. A final check before commit catches expiry during persistence and rolls back the transaction. Another runtime's revoke changes the global revision and rejects the old prepared command. The same hook reaches the existing capture-only mail store because it uses the same Workspace store. Planning supplies its own scoped action/session/CSRF check. No new auth provider or SQL schema is introduced.

Login and quick-switch also reject credentials/status changed between verification and session issuance. Malformed expiry and explicit revocation fail closed. Audit includes the personal actor and session hash identifier, never a raw credential.

Fresh local evidence:

- Three session/concurrency tests pass: four personal profiles, simultaneous device logins, logout/reconnect, admin PIN step-up, every registered personal service entry point denied after revocation, queued write denial and invalid/expired/revoked sessions.
- Three MariaDB adapter tests pass (SQL test double): cross-runtime policy invalidation, prepared Planning write rejected after revoke, expiry after row lock and immediately before commit with complete rollback.
- 48 adjacent permission/Planning/production regression tests pass.
- Browser proof on the built Workspace: a second Erik device logs in through the real login form while the first remains valid; revoked Patrick refresh displays login and a subsequent Planning write returns 401. Five-size Planning flows remain green; no business production/mail mutation.

Evidence is local candidate proof, not LIVE principal proof or real MariaDB load evidence. Final combined artifact, real database/runtime checks and release rollback gates remain outstanding. New external Mail transport/connector features remain deferred and are not claimed safe by the capture-only boundary.
