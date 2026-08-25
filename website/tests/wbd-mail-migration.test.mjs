import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { wbdMailMariaDbMigrationContract } from "../scripts/wbd-mail-mariadb-store.mjs";
import { WbdMailMariaDbStore } from "../scripts/wbd-mail-mariadb-store.mjs";
import { createInitialWbdMailControl } from "../scripts/wbd-mail-control.mjs";

test("mailmigratie is additief, indexed en houdt normalized hot state buiten owner JSON", async () => {
  const sql = (await Promise.all(wbdMailMariaDbMigrationContract.files.map((file) => readFile(file, "utf8")))).join("\n");
  assert.equal(wbdMailMariaDbMigrationContract.version, 6);
  for (const table of ["wbd_mail_control_state", "wbd_mail_messages", "wbd_mail_threads", "wbd_mail_audit"]) assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, "u"));
  assert.match(sql, /UNIQUE KEY uq_wbd_mail_source/u);
  assert.match(sql, /FULLTEXT KEY ft_wbd_mail_text \(subject, snippet, body_text\)/u);
  assert.match(sql, /KEY idx_wbd_mail_thread_recent/u);
  assert.doesNotMatch(sql, /DROP\s+(?:TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM/iu);
});

test("100k-message productieprojectie blijft bounded en doet geen connectorwerk tijdens render", async () => {
  const state = createInitialWbdMailControl({ now: new Date("2026-08-25T08:00:00Z") });
  const thread = { id: "thread-1", organizationId: null, organizationConfidence: "INSUFFICIENT_EVIDENCE", subject: "Productievraag", snippet: "Kun je dit controleren?", messageIds: ["mail-1"], mailboxIds: ["wbd-info"], participantAddresses: ["klant@example.com"], classification: "VRAAG_UITLEG", classificationConfidence: "MEDIUM", priority: "MEDIUM", securityStatus: "CLEAN_BY_POLICY", unreadCount: 1, attachmentCount: 0, waitingOn: "WBD_REVIEW", status: "OPEN", lastActivityAt: "2026-08-25T08:00:00.000Z", updatedAt: "2026-08-25T08:00:00.000Z" };
  const calls = [];
  const pool = { async query(sql, values) {
    calls.push({ sql, values });
    if (sql.includes("SELECT state_json")) return [{ state_json: JSON.stringify({ ...state, messages: [], threads: [], audit: [] }) }];
    if (sql.includes("SELECT thread_json")) return [{ thread_json: JSON.stringify(thread) }];
    if (sql.includes("SUM(CAST")) return [{ total: 12_500 }];
    if (sql.includes("priority = 'HIGH'")) return [{ total: 73 }];
    if (sql.includes("wbd_mail_threads")) return [{ total: 32_000 }];
    if (sql.includes("wbd_mail_messages")) return [{ total: 100_000 }];
    throw new Error(`Onverwachte query: ${sql}`);
  } };
  const store = new WbdMailMariaDbStore({ pool, migrationFile: wbdMailMariaDbMigrationContract.file });
  const started = performance.now();
  const view = await store.workspaceView({ limit: 40 });
  const duration = performance.now() - started;
  assert.equal(view.counts.messages, 100_000);
  assert.equal(view.threads.length, 1);
  assert.equal(view.performance.connectorCallsDuringRender, 0);
  assert.ok(calls.every(({ sql }) => !/IMAP|fetchIncremental/iu.test(sql)));
  assert.ok(calls.find(({ sql }) => /LIMIT \?/u.test(sql))?.values.at(-1) === 40);
  assert.ok(duration < 250, `Projectorfixture duurde ${duration.toFixed(1)}ms`);
});
