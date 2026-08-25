# Break-glass boundary

Break-glass access remains the existing durable production-admin route, stored and governed outside Codex and outside the Release Engine. Do not copy its key, credential, or command path into release contracts, engine state, logs, or Owner Workspace.

Use break-glass only when automated rollback/recovery is impossible or when a separately approved database restore is required. A break-glass incident must preserve the failed plan, audit chain, diagnostics, active/current manifest, environment hash, backup checksum, and recovery outcome. It must never be converted into the normal deployment procedure.

The `wbd-release` identity is deliberately unable to obtain a shell, rotate credentials, edit SSH configuration, change firewall rules, execute arbitrary systemctl commands, or perform a database restore.
