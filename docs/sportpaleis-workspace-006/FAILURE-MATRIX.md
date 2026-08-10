# Pilot failure matrix — Foundation 006

| Failure | Tested behaviour | Result |
|---|---|---|
| Workspace/API temporarily unavailable | Last successful bootstrap is visible only as a session-scoped, read-only recovery view; mutations are disabled and server datastore remains authoritative. | PASS in implementation/static contract; deployed outage drill still required. |
| Datastore unreadable/unavailable | Health fails instead of claiming `database: ok`; request handler returns a generic 5xx without credentials or internal detail. Validated backups remain separate. | PASS locally; production MariaDB failure drill pending deployment. |
| Browser refresh/reopen/re-login | Orders and per-user preferences reload from server state, not localStorage. | PASS. |
| Duplicate submit | Same user/operation/idempotency key returns the first result and creates no second order. | PASS. |
| Concurrent update | Order revision mismatch returns 409 and forces reload of the latest truth; no silent overwrite. | PASS. |
| Invalid/expired session | API returns 401 and login is required again. | PASS. |
| Operator calls admin action | Server returns 403 independently of navigation visibility. | PASS. |
| Server restart | Orders/preferences survive restart from the durable store. | PASS locally. |
| Direct Print unavailable | Complete order and production/fallback details remain accessible; existing Illustrator → WinPlot → Summa route is shown. | PASS. |
| Bridge unavailable | No automatic retry or partial-send assumption; order remains intact and fallback stays available. | PASS through existing Direct Print 003/004 mock tests. |
| Summa unavailable | Hardware-send is false and disabled; order remains usable. | PASS. |

