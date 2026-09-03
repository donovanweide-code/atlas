import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { EventEmitter } from "node:events";

import { WbdImapMailboxConnector, parseWbdImapConfiguration } from "../scripts/wbd-imap-connector.mjs";
import { classifySportpaleisMailboxMessage, prepareSportpaleisMailboxMessage } from "../scripts/sportpaleis-mailbox-routing.mjs";

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
    async getMailboxLock(folder, options) { assert.equal(folder, "INBOX"); assert.deepEqual(options, { readOnly: true }); return { release() {} }; }
    async search(query, options) { assert.deepEqual(query, { uid: "41:*" }); assert.deepEqual(options, { uid: true }); return [41, 42]; }
    async *fetch(uids, query, options) {
      assert.deepEqual(uids, [41, 42]); assert.equal(query.uid, true); assert.deepEqual(options, { uid: true });
      for (const uid of uids) yield { uid, source: Buffer.from(`mail-${uid}`), flags: new Set(["\\Seen"]), internalDate: new Date("2026-08-25T08:00:00Z"), size: 7 };
    }
  }
  const connector = new WbdImapMailboxConnector({ mailbox: { id: "wbd-info", address: "info@webuildanddesign.nl", configured: true, host: "imap.example.com", port: 993, secure: true, user: "info", secret: "not-logged" }, clientFactory: () => new Client(), parser: async () => ({ messageId: "<1@example.com>", from: { value: [{ address: "customer@example.com" }] }, to: { value: [{ address: "info@webuildanddesign.nl" }] }, cc: { value: [] }, replyTo: { value: [] }, subject: "Vraag", text: "Kun je helpen?", html: false, headers: new Map(), attachments: [] }) });
  assert.equal(connector.publicSummary().secretExposed, false);
  assert.doesNotMatch(JSON.stringify(connector.publicSummary()), /not-logged/u);
  const snapshot = await connector.fetchIncremental({ checkpoint: { uidValidity: "22", highestUid: 41 } });
  assert.equal(snapshot.status, "SUCCEEDED");
  assert.equal(snapshot.uidValidity, "22");
  assert.equal(snapshot.highestUid, 42);
  assert.equal(snapshot.completeFetch, true);
  assert.equal(snapshot.messages[1].uid, 42);
  assert.equal(snapshot.messages[1].from.address, "customer@example.com");
});

test("incremental connector retries the checkpoint UID when source fetch was temporarily empty", async () => {
  let attempt = 0;
  class Client extends EventEmitter {
    mailbox = { uidValidity: 22n };
    async connect() {}
    async logout() {}
    async getMailboxLock(folder, options) { assert.equal(folder, "INBOX"); assert.deepEqual(options, { readOnly: true }); return { release() {} }; }
    async search(query, options) { assert.deepEqual(query, { uid: "1:*" }); assert.deepEqual(options, { uid: true }); return [1]; }
    async *fetch(uids) {
      assert.deepEqual(uids, [1]);
      attempt += 1;
      if (attempt === 2) yield { uid: 1, source: Buffer.from("mail-1"), flags: new Set(), internalDate: new Date("2026-09-03T11:00:00Z"), size: 6 };
    }
  }
  const connector = new WbdImapMailboxConnector({
    mailbox: { id: "sportpaleis-bedrukking", address: "bedrukking@sportpaleis.nl", configured: true, host: "imap.example.com", port: 993, secure: true, user: "bedrukking", secret: "not-logged" },
    clientFactory: () => new Client(),
    parser: async () => ({ messageId: "<1@example.com>", from: { value: [{ address: "customer@example.com" }] }, to: { value: [{ address: "bedrukking@sportpaleis.nl" }] }, cc: { value: [] }, replyTo: { value: [] }, subject: "Bestelling", text: "", html: false, headers: new Map(), attachments: [] }),
  });
  const checkpoint = { uidValidity: "22", highestUid: 1 };
  const empty = await connector.fetchIncremental({ checkpoint });
  assert.equal(empty.highestUid, 1);
  assert.equal(empty.completeFetch, false);
  assert.equal(empty.messages.length, 0);
  const recovered = await connector.fetchIncremental({ checkpoint });
  assert.equal(recovered.highestUid, 1);
  assert.equal(recovered.completeFetch, true);
  assert.equal(recovered.messages[0].uid, 1);
});

test("inline attachment uses canonical SHA-256 and arbitrary mail remains fail-closed UNKNOWN", async () => {
  const attachmentBytes = Buffer.from("inline-image");
  class Client extends EventEmitter {
    mailbox = { uidValidity: 44n };
    async connect() {}
    async logout() {}
    async getMailboxLock(folder, options) { assert.equal(folder, "INBOX"); assert.deepEqual(options, { readOnly: true }); return { release() {} }; }
    async search(query, options) { assert.deepEqual(query, { all: true }); assert.deepEqual(options, { uid: true }); return [1]; }
    async *fetch(uids) {
      assert.deepEqual(uids, [1]);
      yield { uid: 1, source: Buffer.from("raw-mail"), flags: new Set(), internalDate: new Date("2026-09-03T11:00:00Z"), size: 8 };
    }
  }
  const connector = new WbdImapMailboxConnector({
    mailbox: { id: "sportpaleis-bedrukking", address: "bedrukking@sportpaleis.nl", configured: true, host: "imap.example.com", port: 993, secure: true, user: "bedrukking", secret: "not-logged" },
    clientFactory: () => new Client(),
    captureRawSource: true,
    captureAttachmentContents: true,
    parser: async () => ({
      messageId: "<arbitrary@example.com>",
      from: { value: [{ address: "customer@example.com" }] },
      to: { value: [{ address: "bedrukking@sportpaleis.nl" }] },
      cc: { value: [] },
      replyTo: { value: [] },
      subject: "Algemeen bericht",
      text: "Geen deterministisch ordersignaal.",
      html: false,
      headers: new Map(),
      attachments: [{ filename: "inline.gif", contentType: "image/gif", content: attachmentBytes, checksum: createHash("md5").update(attachmentBytes).digest("hex"), contentDisposition: "inline", size: attachmentBytes.length }],
    }),
  });
  const snapshot = await connector.fetchIncremental();
  assert.equal(snapshot.status, "SUCCEEDED");
  assert.equal(snapshot.messages.length, 1);
  assert.equal(snapshot.messages[0].attachments[0].contentHash, createHash("sha256").update(attachmentBytes).digest("hex"));
  assert.equal(snapshot.messages[0].attachments[0].contentHash.length, 64);
  const prepared = prepareSportpaleisMailboxMessage({ ...snapshot.messages[0], mailboxId: "sportpaleis-bedrukking" });
  const classification = classifySportpaleisMailboxMessage(prepared, { pdfAssessments: [] });
  assert.equal(classification.route, "UNKNOWN");
  assert.equal(classification.reasons[0], "INSUFFICIENT_DETERMINISTIC_EVIDENCE");
});

test("first connection ingests the bounded most recent window instead of the oldest mail", async () => {
  class Client extends EventEmitter {
    mailbox = { uidValidity: 31n };
    async connect() {}
    async logout() {}
    async getMailboxLock(folder, options) { assert.equal(folder, "INBOX"); assert.deepEqual(options, { readOnly: true }); return { release() {} }; }
    async search(query, options) {
      assert.deepEqual(query, { all: true });
      assert.deepEqual(options, { uid: true });
      return Array.from({ length: 500 }, (_, index) => index + 1);
    }
    async *fetch(uids) {
      assert.equal(uids.length, 250);
      assert.equal(uids[0], 251);
      assert.equal(uids.at(-1), 500);
      for (const uid of uids) yield { uid, source: Buffer.from(`mail-${uid}`), flags: new Set(), internalDate: new Date("2026-08-25T08:00:00Z"), size: 8 };
    }
  }
  const connector = new WbdImapMailboxConnector({
    mailbox: { id: "wbd-info", address: "info@webuildanddesign.nl", configured: true, host: "imap.example.com", port: 993, secure: true, user: "info", secret: "not-logged" },
    clientFactory: () => new Client(),
    parser: async () => ({ messageId: "<mail@example.com>", from: { value: [] }, to: { value: [] }, cc: { value: [] }, replyTo: { value: [] }, subject: "", text: "", html: false, headers: new Map(), attachments: [] }),
  });
  const snapshot = await connector.fetchIncremental();
  assert.equal(snapshot.status, "SUCCEEDED");
  assert.equal(snapshot.highestUid, 500);
  assert.equal(snapshot.completeFetch, true);
});
