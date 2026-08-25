import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";

import { WbdImapMailboxConnector, parseWbdImapConfiguration } from "../scripts/wbd-imap-connector.mjs";

test("IMAP config is fail-closed and never marks partial credentials as configured", () => {
  const configuration = parseWbdImapConfiguration({ WBD_MAIL_INFO_IMAP_HOST: "imap.example.com", WBD_MAIL_INFO_IMAP_USER: "info@example.com" });
  assert.equal(configuration[0].configured, false);
  assert.equal(configuration[0].secret, null);
});

test("incremental connector uses UIDVALIDITY/UID and returns normalized source input", async () => {
  class Client extends EventEmitter {
    capabilities = new Set(["IMAP4REV1", "IDLE"]);
    mailbox = { uidValidity: 22n };
    async connect() {}
    async logout() {}
    async getMailboxLock() { return { release() {} }; }
    async search(query, options) { assert.deepEqual(query, { uid: "42:*" }); assert.deepEqual(options, { uid: true }); return [42, 43]; }
    async *fetch(uids, query, options) { assert.deepEqual(uids, [42, 43]); assert.equal(query.uid, true); assert.deepEqual(options, { uid: true }); yield { uid: 42, source: Buffer.from("mail"), flags: new Set(["\\Seen"]), internalDate: new Date("2026-08-25T08:00:00Z"), size: 4 }; }
  }
  const connector = new WbdImapMailboxConnector({ mailbox: { id: "wbd-info", address: "info@webuildanddesign.nl", configured: true, host: "imap.example.com", port: 993, secure: true, user: "info", secret: "not-logged" }, clientFactory: () => new Client(), parser: async () => ({ messageId: "<1@example.com>", from: { value: [{ address: "customer@example.com" }] }, to: { value: [{ address: "info@webuildanddesign.nl" }] }, cc: { value: [] }, replyTo: { value: [] }, subject: "Vraag", text: "Kun je helpen?", html: false, headers: new Map(), attachments: [] }) });
  assert.equal(connector.publicSummary().secretExposed, false);
  assert.doesNotMatch(JSON.stringify(connector.publicSummary()), /not-logged/u);
  const snapshot = await connector.fetchIncremental({ checkpoint: { uidValidity: "22", highestUid: 41 } });
  assert.equal(snapshot.status, "SUCCEEDED");
  assert.equal(snapshot.uidValidity, "22");
  assert.equal(snapshot.messages[0].uid, 42);
  assert.equal(snapshot.messages[0].from.address, "customer@example.com");
});

test("first connection ingests the bounded most recent window instead of the oldest mail", async () => {
  class Client extends EventEmitter {
    mailbox = { uidValidity: 31n };
    async connect() {}
    async logout() {}
    async getMailboxLock() { return { release() {} }; }
    async search(query, options) {
      assert.deepEqual(query, { all: true });
      assert.deepEqual(options, { uid: true });
      return Array.from({ length: 500 }, (_, index) => index + 1);
    }
    async *fetch(uids) {
      assert.equal(uids.length, 250);
      assert.equal(uids[0], 251);
      assert.equal(uids.at(-1), 500);
    }
  }
  const connector = new WbdImapMailboxConnector({
    mailbox: { id: "wbd-info", address: "info@webuildanddesign.nl", configured: true, host: "imap.example.com", port: 993, secure: true, user: "info", secret: "not-logged" },
    clientFactory: () => new Client(),
  });
  const snapshot = await connector.fetchIncremental();
  assert.equal(snapshot.status, "SUCCEEDED");
  assert.equal(snapshot.highestUid, 500);
});
