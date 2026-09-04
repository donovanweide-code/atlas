import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { classifySportpaleisMailboxMessage, parseSportpaleisMailboxConfiguration, prepareSportpaleisMailboxMessage, sanitizeSportpaleisMailHtml } from "../scripts/sportpaleis-mailbox-routing.mjs";

const passwords = { kevin: "Mailbox-Kevin-2026!", patrick: "Mailbox-Patrick-2026!", collega: "Mailbox-Store-2026!", "donovan-support": "Mailbox-Support-2026!" };
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-mailbox-routing-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), releaseId: "SPW-MAILBOX-ROUTING-TEST", allowedOrigin: "http://127.0.0.1", uploadsEnabled: true, mailboxConfiguration: { configured: true } });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

function textPdf(lines) {
  const escaped = lines.map((line) => String(line).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"));
  const drawing = `BT /F1 11 Tf 50 760 Td ${escaped.map((line, index) => `${index ? "0 -17 Td " : ""}(${line}) Tj`).join(" ")} ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>", `<< /Length ${Buffer.byteLength(drawing)} >>\nstream\n${drawing}\nendstream`, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let source = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(source)); source += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(source);
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(source, "latin1");
}

function mail({ uid, messageId, subject, text, inReplyTo = null, references = [], attachments = [] }) {
  const raw = Buffer.from([`Message-ID: ${messageId}`, `Subject: ${subject}`, "From: klant@example.nl", "To: bedrukking@sportpaleis.nl", "", text].join("\r\n"));
  return {
    folder: "INBOX", uidValidity: "20260903", uid, messageId, inReplyTo, references,
    from: { name: "Klant", address: "klant@example.nl" }, to: [{ name: "Sportpaleis", address: "bedrukking@sportpaleis.nl" }], cc: [], replyTo: null,
    subject, receivedAt: `2026-09-03T0${uid}:00:00.000Z`, text, html: `<p>${text}</p><img src="https://tracker.example/pixel">`,
    attachments: attachments.map((attachment, index) => ({ id: `attachment-${uid}-${index}`, filename: attachment.filename, contentType: attachment.contentType, size: attachment.bytes.length, contentHash: sha256(attachment.bytes), dataBase64: attachment.bytes.toString("base64"), disposition: "attachment" })),
    size: raw.length, rawSha256: sha256(raw), rawDataBase64: raw.toString("base64"),
  };
}

function snapshot(messages) {
  return { status: "SUCCEEDED", mailboxId: "sportpaleis-bedrukking", folder: "INBOX", uidValidity: "20260903", highestUid: Math.max(...messages.map(({ uid }) => uid)), messages };
}

test("mailboxconfiguratie blijft server-side en HTML wordt passief gemaakt", () => {
  const configuration = parseSportpaleisMailboxConfiguration({ SPORTPALEIS_BEDRUKKING_IMAP_HOST: "imap.example.nl", SPORTPALEIS_BEDRUKKING_IMAP_USER: "bedrukking", SPORTPALEIS_BEDRUKKING_IMAP_PASSWORD: "secret" });
  assert.equal(configuration.configured, true);
  assert.equal(configuration.secret, "secret");
  const clean = sanitizeSportpaleisMailHtml('<script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">open</a><img src="https://tracker.example/pixel">');
  assert.doesNotMatch(clean, /script|onclick|javascript|tracker\.example/iu);
});

test("deterministische router gebruikt geen onderwerp als zelfstandig bewijs", () => {
  const prepared = prepareSportpaleisMailboxMessage({ ...mail({ uid: 1, messageId: "<subject-only@example.nl>", subject: "RE: order 260000777", text: "Goedemiddag" }), mailboxId: "sportpaleis-bedrukking" });
  assert.equal(classifySportpaleisMailboxMessage(prepared).route, "UNKNOWN");
});

test("ordercontext matcht alleen een exact begrensd ordernummer", async (context) => {
  const { store } = await fixture(context);
  const order = (await store.read()).orders[0];
  const partial = prepareSportpaleisMailboxMessage({ ...mail({ uid: 1, messageId: "<partial@example.nl>", subject: "Vraag", text: `Referentie ${order.id}9` }), mailboxId: "sportpaleis-bedrukking" }, { orders: [order] });
  const exact = prepareSportpaleisMailboxMessage({ ...mail({ uid: 2, messageId: "<exact@example.nl>", subject: "Vraag", text: `Referentie: ${order.id}.` }), mailboxId: "sportpaleis-bedrukking" }, { orders: [order] });
  assert.deepEqual(partial.orderIds, []);
  assert.deepEqual(exact.orderIds, [order.id]);
});

test("representatieve Webshop-PDF route hergebruikt intake, bewaart evidence en maakt geen order", async (context) => {
  const { root, store, service, operator } = await fixture(context);
  const bytes = textPdf(["260000777", "Klantnaam: Routering Test", "Vereniging: FC Huizen", "Orderdatum: 03-09-2026", "Artikelnummer: 131252", "Omschrijving: Trainingsbroek", "Maat: L", "Aantal: 1", "Kleur: Zwart", "Initialen: RT"]);
  const source = mail({ uid: 1, messageId: "<webshop-260000777@example.nl>", subject: "Nieuwe webshoporder 260000777", text: "Bijgaand de order-PDF.", attachments: [{ filename: "260000777.pdf", contentType: "application/pdf", bytes }] });
  const before = await store.read();
  const first = await service.ingestSportpaleisMailboxSnapshot(snapshot([source]));
  const duplicate = await service.ingestSportpaleisMailboxSnapshot(snapshot([{ ...source, uid: 2 }]));
  const revisionAfterCheckpointAdvance = (await store.read()).revision;
  const unchanged = await service.ingestSportpaleisMailboxSnapshot(snapshot([{ ...source, uid: 2 }]));
  const state = await store.read();
  assert.deepEqual(first.routes.map(({ route }) => route), ["WEBSHOP_ORDER_PDF"]);
  assert.equal(duplicate.duplicates, 1);
  assert.equal(unchanged.unchanged, true);
  assert.equal(state.revision, revisionAfterCheckpointAdvance, "een identieke mailboxrefresh veroorzaakt geen globale revision-drift");
  assert.equal(state.orders.length, before.orders.length);
  assert.equal(state.webshopIntake.sources.length, 1);
  assert.equal(state.webshopIntake.matches.length, 1);
  assert.equal(state.mailboxRouting.messages.length, 1);
  assert.equal(state.mailboxRouting.messages[0].routeResult.automaticProductionMutation, false);
  assert.equal(state.mailboxRouting.messages[0].rawEvidence.immutable, true);
  assert.deepEqual(await readFile(path.join(root, "runtime", ...state.mailboxRouting.messages[0].rawEvidence.storageReference.split("/"))), Buffer.from(source.rawDataBase64, "base64"));
  const bootstrap = await service.bootstrap(operator.token);
  assert.equal(JSON.stringify(bootstrap).includes(source.rawDataBase64), false);
  assert.equal(JSON.stringify(bootstrap).includes("secret"), false);
});

test("klantreactie met productie-impact wordt Attention zonder productie- of uitgaande mutatie", async (context) => {
  const { store, service, operator } = await fixture(context);
  const pdf = textPdf(["260000778", "Klantnaam: Routing Reply", "Vereniging: FC Huizen", "Orderdatum: 03-09-2026", "Artikelnummer: 131252", "Omschrijving: Trainingsbroek", "Maat: L", "Aantal: 1", "Kleur: Zwart", "Initialen: RR"]);
  const original = mail({ uid: 1, messageId: "<webshop-260000778@example.nl>", subject: "Nieuwe webshoporder", text: "Bijgaand.", attachments: [{ filename: "260000778.pdf", contentType: "application/pdf", bytes: pdf }] });
  await service.ingestSportpaleisMailboxSnapshot(snapshot([original]));
  const match = (await store.read()).webshopIntake.matches[0];
  const accepted = await service.acceptWebshopMatch(operator.token, operator.csrfToken, match.id, { explicitAgreement: true, customer: "Routing Reply", association: "FC Huizen", customerEmail: "", customerPhone: "" }, "accept-routing-reply");
  const before = await store.read();
  const reply = mail({ uid: 2, messageId: "<reply-260000778@example.nl>", inReplyTo: original.messageId, references: [original.messageId], subject: `Re: ${accepted.value.id}`, text: "Wilt u de maat en het rugnummer aanpassen?" });
  const result = await service.ingestSportpaleisMailboxSnapshot(snapshot([reply]));
  const after = await store.read();
  const routed = after.mailboxRouting.messages.find(({ messageId }) => messageId === reply.messageId);
  assert.deepEqual(result.routes.map(({ route }) => route), ["CUSTOMER_REPLY"]);
  assert.equal(routed.threadId, after.mailboxRouting.messages.find(({ messageId }) => messageId === original.messageId).threadId);
  assert.deepEqual(routed.classification.orderIds, [accepted.value.id]);
  assert.equal(routed.routeResult.automaticProductionMutation, false);
  assert.equal(routed.routeResult.automaticOrderMutation, false);
  assert.equal(routed.routeResult.externalMailSent, false);
  assert.equal(after.mailboxRouting.attentions.find(({ id }) => id === routed.attentionId).status, "OPEN");
  assert.deepEqual(after.orders.find(({ id }) => id === accepted.value.id), before.orders.find(({ id }) => id === accepted.value.id));
  assert.equal(after.productionJobs.length, before.productionJobs.length);
});

test("onbekende mail blijft fail-closed en handmatige routing is idempotent en bevoegdheidsbegrensd", async (context) => {
  const { store, service, operator, storeUser } = await fixture(context);
  const unknown = mail({ uid: 1, messageId: "<unknown@example.nl>", subject: "Vraag", text: "Kunt u mij helpen?" });
  await service.ingestSportpaleisMailboxSnapshot(snapshot([unknown]));
  const before = await store.read();
  const message = before.mailboxRouting.messages[0];
  assert.equal(message.classification.route, "UNKNOWN");
  assert.equal(before.mailboxRouting.attentions.length, 1);
  await assert.rejects(service.manuallyClassifySportpaleisMailboxMessage(storeUser.token, storeUser.csrfToken, message.id, { route: "CUSTOMER_REPLY", reason: "Menselijk bevestigd" }, "classify-unknown"), (error) => error.statusCode === 403);
  const first = await service.manuallyClassifySportpaleisMailboxMessage(operator.token, operator.csrfToken, message.id, { route: "CUSTOMER_REPLY", reason: "Menselijk bevestigd als klantreactie" }, "classify-unknown");
  const duplicate = await service.manuallyClassifySportpaleisMailboxMessage(operator.token, operator.csrfToken, message.id, { route: "CUSTOMER_REPLY", reason: "Menselijk bevestigd als klantreactie" }, "classify-unknown");
  const after = await store.read();
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  assert.equal(after.mailboxRouting.messages.length, 1);
  assert.equal(after.mailboxRouting.classificationHistory.filter(({ messageId }) => messageId === message.id).length, 2);
  assert.equal(after.orders.length, before.orders.length);
  assert.equal(after.webshopIntake.sources.length, before.webshopIntake.sources.length);
});

test("gemengde PDF- en replysignalen blijven UNKNOWN", () => {
  const existing = prepareSportpaleisMailboxMessage({ ...mail({ uid: 1, messageId: "<existing@example.nl>", subject: "Bron", text: "Eerste bericht" }), mailboxId: "sportpaleis-bedrukking" });
  const mixed = prepareSportpaleisMailboxMessage({ ...mail({ uid: 2, messageId: "<mixed@example.nl>", inReplyTo: existing.messageId, references: [existing.messageId], subject: "Re: bron", text: "Zie gewijzigde PDF" }), mailboxId: "sportpaleis-bedrukking" }, { existingMessages: [existing] });
  assert.equal(classifySportpaleisMailboxMessage(mixed, { existingMessages: [existing], pdfAssessments: [{ attachmentId: "pdf", valid: true, productionOrderCount: 1 }] }).route, "UNKNOWN");
});

test("gelijke Message-ID met andere immutable bytes faalt gesloten", async (context) => {
  const { store, service } = await fixture(context);
  const first = mail({ uid: 1, messageId: "<collision@example.nl>", subject: "Vraag", text: "Eerste inhoud" });
  await service.ingestSportpaleisMailboxSnapshot(snapshot([first]));
  const before = await store.read();
  const changed = mail({ uid: 2, messageId: first.messageId, subject: "Vraag", text: "Andere inhoud" });
  await assert.rejects(service.ingestSportpaleisMailboxSnapshot(snapshot([changed])), (error) => error.code === "SPORTPALEIS_MAIL_IDENTITY_CONFLICT");
  assert.deepEqual(await store.read(), before);
});

test("een malformed connectorrecord houdt de mailbox op Attention", async (context) => {
  const { store, service } = await fixture(context);
  const malformed = mail({ uid: 1, messageId: "<missing-raw@example.nl>", subject: "Vraag", text: "Geen ruwe bytes" });
  delete malformed.rawDataBase64;
  const result = await service.ingestSportpaleisMailboxSnapshot(snapshot([malformed]));
  assert.equal(result.malformed, 1);
  const state = await store.read();
  assert.equal(state.mailboxRouting.mailbox.inboundStatus, "ATTENTION");
  assert.equal(state.mailboxRouting.mailbox.lastFailureCode, "MALFORMED_MESSAGES_FAIL_CLOSED");
});

test("herhaalde identieke mailboxfout veroorzaakt geen globale revision-drift", async (context) => {
  const { store, service } = await fixture(context);
  const failed = { status: "FAILED", mailboxId: "sportpaleis-bedrukking", failureCode: "IMAP_TIMEOUT", messages: [] };
  await service.ingestSportpaleisMailboxSnapshot(failed);
  const revisionAfterFailure = (await store.read()).revision;
  const repeated = await service.ingestSportpaleisMailboxSnapshot(failed);
  assert.equal(repeated.unchanged, true);
  assert.equal((await store.read()).revision, revisionAfterFailure);
});
