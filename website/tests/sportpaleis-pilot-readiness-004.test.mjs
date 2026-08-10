import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Readiness-Kevin-004!", patrick: "Readiness-Patrick-004!", collega: "Readiness-Store-004!", "donovan-support": "Readiness-Support-004!" };
const empty = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-readiness-004-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return {
    service, store,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
  };
}

test("Sportpaleis final pilot readiness 004", async (context) => {
  const { service, store, admin, operator, storeUser } = await fixture(context);

  await context.test("normale order vereist minimaal één bedrukking en shortnummer erft zonder visuele of semantische uitval", async () => {
    await assert.rejects(() => service.createOrder(storeUser.token, storeUser.csrfToken, { orderKind: "INDIVIDUAL", customer: "Geen bedrukking", customerEmail: "geen@example.nl", customerPhone: "0612345678", standardPersonalization: empty, items: [{ articleId: "sp-live-134826", size: "M", quantity: 1, deviation: false, overrides: {} }] }, "readiness-no-printing-004"), (error) => error.code === "PERSONALIZATION_REQUIRED");
    const created = await service.createOrder(storeUser.token, storeUser.csrfToken, { orderKind: "INDIVIDUAL", customer: "Short zes", customerEmail: "short@example.nl", customerPhone: "0612345678", standardPersonalization: { ...empty, shortsNumber: "6" }, items: [{ articleId: "sp-live-134826", size: "M", quantity: 1, deviation: false, overrides: {} }] }, "readiness-short-six-004");
    assert.match(created.value.items[0].personalization, /Short 6/);
    assert.equal(created.value.items[0].personalizationValues.shortsNumber, "6");
    assert.equal(created.value.items[0].personalizationValues.initials, undefined);
  });

  await context.test("team van 18 maakt twee artikeltypen per speler en bewaart één afwijkend nummer", async () => {
    const variants = (articleId) => Array.from({ length: 18 }, (_, index) => ({ participantName: `Speler ${index + 1}`, size: index % 2 ? "M" : "L", quantity: 1, deviation: true, overrides: { ...empty, backNumber: String(index === 17 ? 99 : index + 1), backNumberSizeClass: "SENIOR" }, articleId }));
    const created = await service.createOrder(storeUser.token, storeUser.csrfToken, { orderKind: "TEAM", customer: "Team 18", customerEmail: "team@example.nl", customerPhone: "0612345678", standardPersonalization: empty, items: ["sp-live-137294", "sp-live-137293"].map((articleId) => ({ articleId, size: "Meerdere maten", quantity: 18, deviation: true, overrides: empty, variants: variants(articleId) })) }, "team-18-two-articles");
    assert.equal(created.value.orderKind, "TEAM");
    assert.equal(created.value.items.length, 2);
    assert.equal(created.value.totalPieces, 36);
    assert.deepEqual(created.value.items.map(({ variants: rows }) => rows.length), [18, 18]);
    assert.equal(created.value.items[0].variants.at(-1).personalizationValues.backNumber, "99");
  });

  await context.test("verkoopnummer wordt server-side beheerd en als onveranderlijke aanname-snapshot opgeslagen", async () => {
    await service.updateUser(admin.token, admin.csrfToken, "collega", { salesNumber: "704" });
    const created = await service.createOrder(storeUser.token, storeUser.csrfToken, { orderKind: "INDIVIDUAL", customer: "Snapshot", customerEmail: "snapshot@example.nl", customerPhone: "0612345678", standardPersonalization: { ...empty, initials: "SP" }, items: [{ articleId: "sp-live-140226", size: "M", quantity: 1, deviation: false, overrides: {} }] }, "readiness-accepted-by-004");
    assert.deepEqual(created.value.acceptedBy, { userId: "collega", name: "Winkelmedewerker", salesNumber: "704", at: created.value.createdAt });
    await service.updateUser(admin.token, admin.csrfToken, "collega", { salesNumber: "705" });
    assert.equal((await store.read()).orders.find(({ id }) => id === created.value.id).acceptedBy.salesNumber, "704");
  });

  await context.test("feedback bewaart afbeelding met context en toont nooit base64 in bootstrap", async () => {
    const saved = await service.saveFeedback(operator.token, operator.csrfToken, { page: "/workspace/sportpaleis/orders/SP-2026-0104", module: "Orders", category: "Probleem", description: "Mobiele praktijkfoto", releaseId: "SPW-BEDRUKKING-PILOT-READINESS-004-20260810", orderId: "SP-2026-0104", attachments: [{ filename: "praktijk.png", mimeType: "image/png", dataBase64: Buffer.from("pilot-image").toString("base64") }] }, "feedback-image");
    assert.equal(saved.value.attachments[0].sizeBytes, 11);
    const boot = await service.bootstrap(operator.token);
    assert.equal(boot.feedback[0].attachments[0].dataBase64, undefined);
    const attachment = await service.feedbackAttachment(operator.token, saved.value.id, saved.value.attachments[0].id);
    assert.equal(Buffer.from(attachment.dataBase64, "base64").toString(), "pilot-image");
  });

  await context.test("verenigingscorrectie gebruikt revisie, bronnotitie en audit", async () => {
    const before = (await service.bootstrap(admin.token)).associations[0];
    await service.updateAssociation(admin.token, admin.csrfToken, before.id, { expectedRevision: before.revision, active: before.active, notes: `${before.notes} · praktijkreview`, juniorValidationStatus: "DATA_GAP", juniorValidationNote: before.juniorValidationNote });
    const after = (await service.bootstrap(admin.token)).associations[0];
    assert.equal(after.revision, before.revision + 1);
    assert.equal(after.validationHistory[0].userId, "kevin");
    await assert.rejects(() => service.updateAssociation(admin.token, admin.csrfToken, before.id, { expectedRevision: before.revision, notes: "verouderd" }), (error) => error.code === "REVISION_CONFLICT");
  });

  await context.test("DATA_GAP blijft ook vanuit Controle geblokkeerd voor productie", async () => {
    const boot = await service.bootstrap(operator.token);
    const blocked = boot.orders.find(({ stage, items }) => stage === "CONTROL" && items.some((item) => item.productionReadiness?.status === "DATA_GAP"));
    assert.ok(blocked, "de reviewfixture moet een gecontroleerde order met ontbrekend productieprofiel bevatten");
    await assert.rejects(() => service.bulkAdvanceOrders(operator.token, operator.csrfToken, { orders: [{ id: blocked.id, expectedRevision: blocked.revision }] }, "readiness-data-gap-control-004"), (error) => error.code === "PRODUCTION_DATA_INCOMPLETE");
  });

  await context.test("UI-contract bevat groepsinvoer, bulkvoorstel, operatorprofielen en geen onbewezen snijbestandinstructie", async () => {
    const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
    const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
    assert.match(source, /Regels voorbereiden/);
    assert.match(source, /LIVE CATALOGUSBRON/);
    assert.match(source, /\+ Speler\/artikel toevoegen/);
    assert.match(source, /select-order-count/);
    assert.match(source, /productie\/voorstel/);
    assert.match(source, /Technische profielen bekijken/);
    assert.match(source, /de exacte bestandshandoff is niet als brongevalideerde Workspace-stap vastgelegd/);
    assert.match(source, /Productiedata ontbreekt\. Vul of valideer deze eerst in Beheer; GO blijft geblokkeerd\./);
    assert.match(source, /Kies minimaal één bedrukking/);
    assert.match(css, /sp-team-row--prepared/);
    assert.match(css, /sp-association-admin-list > div \{ max-height:none; overflow:visible/);
  });

  await context.test("Sportpaleis klantmail gebruikt zwarte volle header met groter goedgekeurd logo", async () => {
    const order = (await service.bootstrap(admin.token)).orders.find(({ customerEmail }) => customerEmail);
    const preview = await service.previewOrderMail(admin.token, order.id, { templateKey: "ORDER_RECEIVED" });
    assert.match(preview.html, /bgcolor="#000000"/i);
    assert.match(preview.html, /width="230"/);
    assert.match(preview.html, /cid:brand-sportpaleis-email-logo/);
    assert.equal(preview.transport, "capture");
  });
});
