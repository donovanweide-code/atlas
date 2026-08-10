import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS,
  SPORTPALEIS_LIVE_PILOT_ARTICLES,
} from "../config/sportpaleis-live-pilot-catalog.mjs";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService, migrateSportpaleisPilotState } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Readiness-Kevin-007!", patrick: "Readiness-Patrick-007!", collega: "Readiness-Store-007!", "donovan-support": "Readiness-Support-007!" };
const empty = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-readiness-007-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return {
    service,
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
  };
}

test("Sportpaleis laatste pilot-readinesscorrectie 007", async (context) => {
  const { service, storeUser, operator } = await fixture(context);

  await context.test("alle exact vastgelegde live artikelen zijn operationeel bereikbaar en de resterende live-brondekking blijft expliciet onvolledig", async () => {
    const liveInventoryCount = SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS.filter(({ status }) => status === "LIVE").reduce((sum, { productCount }) => sum + productCount, 0);
    assert.equal(SPORTPALEIS_LIVE_PILOT_ARTICLES.length, 48);
    assert.equal(SPORTPALEIS_LIVE_PILOT_ARTICLES.filter(({ association }) => association === "A.S.C. Waterwijk").length, 41);
    assert.equal(SPORTPALEIS_LIVE_PILOT_ARTICLES.every(({ active, catalogProvenance }) => active && catalogProvenance.authority === "SPORTPALEIS_LIVE"), true);
    assert.equal(liveInventoryCount, 549);
    assert.ok(SPORTPALEIS_LIVE_PILOT_ARTICLES.length < liveInventoryCount, "volledige live catalogusdekking mag niet ten onrechte als gereed worden gerapporteerd");
  });

  await context.test("schema-7 migratie dedupliceert legacy live-ID's en bewaart bestaande orderverwijzingen", () => {
    const migrated = migrateSportpaleisPilotState({
      schemaVersion: 6, organizationId: "sport-2000-sportpaleis-bv", users: [], audit: [], migrationWarnings: [],
      articles: [
        { id: "asc-live-137294", articleNumber: "137294", association: "A.S.C. Waterwijk", revision: 2, validationHistory: [] },
        { id: "sp-live-137294", articleNumber: "137294", association: "A.S.C. Waterwijk", revision: 1, validationHistory: [] },
      ],
      orders: [{ id: "SP-LEGACY-DUPLICATE", revision: 1, stage: "ORDER", owner: "Patrick", createdAt: "2026-08-09T10:00:00.000Z", updatedAt: "2026-08-09T10:00:00.000Z", items: [{ articleId: "asc-live-137294" }] }],
    });
    assert.equal(migrated.schemaVersion, 8);
    assert.equal(migrated.articles.filter(({ articleNumber, association }) => articleNumber === "137294" && association === "A.S.C. Waterwijk").length, 1);
    assert.equal(migrated.orders[0].items[0].articleId, "sp-live-137294");
    assert.match(migrated.migrationWarnings.at(-1), /canonieke sp-live-ID/);
    assert.match(migrated.productionProfiles.find(({ id }) => id === "profile-shirt").instruction, /PILOT-AANDACHT/);
  });

  await context.test("positie, referentieafstand, rotatie en spiegeling zijn aandachtspunten en blokkeren een Senior-order niet", async () => {
    const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Pilot aandacht", customerEmail: "aandacht@example.nl", customerPhone: "0612345678",
      standardPersonalization: { ...empty, backNumber: "14", backNumberSizeClass: "SENIOR" },
      items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty }],
    }, "readiness-007-attention")).value;
    assert.equal(created.items[0].productionReadiness.status, "ATTENTION");
    assert.match(created.items[0].productionReadiness.reason, /Productie past tijdens de pilot zelf toe/);
    await service.captureOrderMail(storeUser.token, storeUser.csrfToken, created.id, { templateKey: "ORDER_RECEIVED" }, "readiness-007-attention-mail");
    const current = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.id);
    const advanced = (await service.advanceOrder(operator.token, operator.csrfToken, current.id, current.revision, "readiness-007-attention-advance")).value;
    assert.equal(advanced.stage, "CONTROL");
  });

  await context.test("werkelijk noodzakelijke maat- en bedrukdata blijven server-side geblokkeerd terwijl opslaan en productiecontext wel werken", async () => {
    const pending = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Live pending", customerEmail: "pending@example.nl", customerPhone: "0612345678",
      standardPersonalization: empty,
      items: [{ articleId: "sp-live-134827", size: "M", quantity: 1, deviation: false, overrides: empty }],
    }, "readiness-007-pending")).value;
    assert.equal(pending.items[0].productionReadiness.status, "DATA_GAP");
    assert.match(pending.items[0].productionReadiness.reason, /fysieke maatvoering|letterprofiel|foliekleur/);
    await service.captureOrderMail(storeUser.token, storeUser.csrfToken, pending.id, { templateKey: "ORDER_RECEIVED" }, "readiness-007-pending-mail");
    const current = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === pending.id);
    await assert.rejects(() => service.advanceOrder(operator.token, operator.csrfToken, current.id, current.revision, "readiness-007-pending-advance"), (error) => error.code === "PRODUCTION_DATA_INCOMPLETE");
  });

  await context.test("normale multi-verenigingsorder bewaart per artikel de eigen live bron en gaat met niet-blokkerende aandacht naar Controle", async () => {
    const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Twee verenigingen", customerEmail: "multi007@example.nl", customerPhone: "0612345678",
      standardPersonalization: { ...empty, backNumber: "7", backNumberSizeClass: "SENIOR" },
      items: [
        { articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: empty },
        { articleId: "sp-live-116597", size: "L", quantity: 1, deviation: false, overrides: empty },
      ],
    }, "readiness-007-multi")).value;
    assert.deepEqual(new Set(created.items.map(({ association }) => association)), new Set(["A.S.C. Waterwijk", "FC Almere"]));
    assert.equal(created.items.every(({ sourceProvenance }) => sourceProvenance.includes("Sportpaleis.nl")), true);
    assert.equal(created.items.every(({ productionReadiness }) => productionReadiness.status === "ATTENTION"), true);
  });

  await context.test("Teamorder gebruikt dezelfde catalogus en houdt Senior uitvoer niet tegen op aanvullende positioneringskennis", async () => {
    const variants = Array.from({ length: 18 }, (_, index) => ({ participantName: `Speler ${index + 1}`, size: index % 2 ? "M" : "L", quantity: 1, deviation: true, overrides: { ...empty, backNumber: String(index === 17 ? 77 : index + 1), backNumberSizeClass: "SENIOR" } }));
    const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "TEAM", customer: "Team 18 pilot", customerEmail: "team007@example.nl", customerPhone: "0612345678", standardPersonalization: empty,
      items: [{ articleId: "sp-live-137294", size: "Meerdere maten", quantity: 18, deviation: true, overrides: empty, variants }],
    }, "readiness-007-team")).value;
    assert.equal(created.items[0].variants.length, 18);
    assert.equal(created.items[0].variants.at(-1).personalizationValues.backNumber, "77");
    assert.equal(created.items[0].productionReadiness.status, "ATTENTION");
  });

  await context.test("Pioneers-provenance blijft beperkt tot de bewezen Senior 200 mm snijlijnen", async () => {
    const profile = (await service.bootstrap(operator.token)).productionProfiles.find(({ id }) => id === "profile-pioneers-shirt");
    assert.equal(profile.validation.cutContour, "VALIDATED");
    assert.equal(profile.validation.physicalCutOutput, "VALIDATED");
    assert.deepEqual(profile.validation.validatedScope, ["Senior rugnummerhoogte 200 mm", "Snijlijnen/cijfercontouren 2, 34 en 77", "Fysieke snijtest uitgevoerd en snijlijnen correct bevestigd"]);
    assert.equal(profile.validation.placement, "DATA_GAP");
    assert.equal(profile.validation.rotation, "DATA_GAP");
  });

  await context.test("client en server bevatten de nieuwe policy zonder Waterwijk-only cataloguslogica", async () => {
    const client = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
    const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
    assert.match(client, /SPW-LIVE-PILOT-CORRECTION-001-20260810/);
    assert.match(client, /Productie-inrichting volgt/);
    assert.match(client, /isBedrukkingRelevant/);
    assert.doesNotMatch(client, /association === "A\.S\.C\. Waterwijk"/);
    assert.match(server, /const criticalLabels/);
    assert.match(server, /const advisoryLabels/);
    assert.match(server, /status: "ATTENTION"/);
  });
});
