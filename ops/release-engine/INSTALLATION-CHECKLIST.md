# One-time production installation checklist

This checklist is a material infrastructure change and requires a separate Human GO. It is not a normal application release.

1. Freeze active release/commit, health/readiness, datastore revisions, and production provenance.
2. Verify the immutable Release Engine package, source tag/commit, file manifest, and SHA-256.
3. Create system identities `wbd-release` and `wbd-release-operator` as non-login accounts/groups; preserve existing production-admin/break-glass access.
4. Install engine files root-owned under `/srv/wbd/release-engine` and the Web Push contract under `/srv/wbd/release-engine/contracts`.
5. Create `/srv/wbd/shared/release-engine` and `/srv/wbd/shared/release-inbox` with the documented minimal ownership/modes. Grant `wbd-release` traverse-only ACL (`--x`) on the existing `wbdapp:wbdapp 0750` `/srv/wbd/shared` parent; do not grant directory listing or access to other tenant state. Preserve the existing `/srv/wbd/shared/.spw-release-deploy.lock`, set it to `root:wbd-release-operator` mode `0660`, and prove both the legacy helper and engine serialize on that same OS lock.
6. Install the broker root-owned/read-only to the runner; validate the sudoers file with `visudo -c` before activation. Prove mutating verbs are delegated to a transient root-owned systemd execution unit while the long-running runner keeps `ProtectSystem=strict` and no direct release/config write paths.
7. Install the existing isolated restore verifier as `/usr/local/sbin/wbd-mariadb-restore-verify`; do not add an automatic production DB restore.
8. Validate the systemd unit with `systemd-analyze verify`, enable the runner, and confirm its Unix socket permissions.
9. Run engine health plus the Web Push contract's read-only inspect. Confirm production is unchanged.
10. Allow automatic prepare to reach `AWAITING_HUMAN_GO`; stop and present the compact Owner approval summary.

Rollback of this one-time installation disables/removes only the engine service, broker authorization, and engine identity after preserving its audit state. It does not alter `/srv/wbd/current`, application services, databases, or the break-glass route.
