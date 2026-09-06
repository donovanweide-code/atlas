import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SPORTPALEIS_ASSOCIATIONS } from "../config/sportpaleis-bedrukking-configuration.mjs";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
import { articleToMariaDbRow, mariaDbRowToArticle, mariaDbRowToProductionProfile, productionProfileToMariaDbRow } from "../sportpaleis-server/pilot-persistence-mapping.mjs";

const passwords = { kevin: "Readiness-Kevin-005!", patrick: "Readiness-Patrick-005!", collega: "Readiness-Store-005!", "donovan-support": "Readiness-Support-005!" };
const empty = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-readiness-005-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return {
    root, store, service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
  };
}

function normalizedAssociation(association) {
  return {
    row: Number(association.source.range.match(/A(\d+)/)?.[1]), name: association.name, fontProfile: association.fontEvidence?.sourceValue ?? association.fontProfile,
    foilColors: association.foilColors, dimensionsCm: Object.fromEntries(Object.entries(association.dimensionsCm).filter(([, value]) => value !== null)), notes: association.notes,
  };
}

const articleValidation = (source = "Test-only bevestigde fixture; niet als productiebron gebruiken") => ({
  status: "VALIDATED", source, name: "VALIDATED", sku: "VALIDATED", image: "VALIDATED", variants: "VALIDATED", sizes: "VALIDATED", personalization: "VALIDATED",
});
const profileValidation = (source = "Test-only bevestigde fixture; niet als productiebron gebruiken") => ({
  status: "VALIDATED", source, placement: "VALIDATED", referenceDistance: "VALIDATED", size: "SOURCE_CONFIGURED", font: "SOURCE_CONFIGURED", foilColor: "SOURCE_CONFIGURED", rotation: "VALIDATED", mirror: "VALIDATED",
});

test("Sportpaleis gerichte correctiefase readiness 005", async (context) => {
  const { root, store, service, admin, operator, storeUser } = await fixture(context);

  await context.test("alle matrixgebonden verenigingsregels zijn reproduceerbaar en latere Product Truth blijft afzonderlijk versioned", async () => {
    const fixtureData = JSON.parse(await readFile(new URL("../config/info-bedrukkingen-2026.confirmed-fixture.json", import.meta.url), "utf8"));
    const matrixAssociations = SPORTPALEIS_ASSOCIATIONS.filter(({ source }) => source?.file === "info bedrukkingen 2026.xlsx");
    assert.equal(matrixAssociations.length, fixtureData.rows.length);
    for (const historical of fixtureData.rows) {
      const current = matrixAssociations.find(({ name }) => name === historical.name);
      if (["HBSA", "Sloeproeien"].includes(historical.name)) continue;
      assert.ok(current, historical.name);
      assert.equal(current.fontEvidence.sourceValue, historical.fontProfile, historical.name);
      assert.equal(Number(current.source.range.match(/A(\d+)/u)?.[1]), historical.row, historical.name);
      if (historical.dimensionsCm.backNumberSenior != null) assert.equal(current.dimensionsCm.backNumberSenior, 20, historical.name);
    }
    assert.equal(SPORTPALEIS_ASSOCIATIONS.find(({ name }) => name === "HBSA").productionEligibility, "NOT_APPLICABLE");
    assert.equal(SPORTPALEIS_ASSOCIATIONS.find(({ name }) => name === "Sloeproeien").productionEligibility, "NOT_APPLICABLE");
    assert.equal(SPORTPALEIS_ASSOCIATIONS.length - matrixAssociations.length, 2, "Seedorf TDG en Almeerse Hockeyclub zijn latere expliciete Product Truth");
  });

  let article;
  await context.test("Artikelbeheer gebruikt revision, bestaande vereniging, maten/varianten, provenance en rolbeveiliging", async () => {
    const before = (await service.bootstrap(admin.token)).articles.find(({ id }) => id === "sp-live-137294");
    await assert.rejects(() => service.updateArticle(storeUser.token, storeUser.csrfToken, before.id, { expectedRevision: before.revision, active: false }), (error) => error.code === "FORBIDDEN");
    await assert.rejects(() => service.updateArticle(operator.token, operator.csrfToken, before.id, { expectedRevision: before.revision, active: false }), (error) => error.code === "FORBIDDEN");
    await assert.rejects(() => service.updateArticle(admin.token, admin.csrfToken, before.id, { expectedRevision: before.revision, association: "Vrije tekst vereniging" }), (error) => error.code === "ASSOCIATION_UNKNOWN");
    await assert.rejects(() => service.updateArticle(admin.token, admin.csrfToken, before.id, { expectedRevision: before.revision, availableSizes: [], validation: articleValidation() }), (error) => error.code === "VALIDATED_SIZES_REQUIRED");
    article = await service.updateArticle(admin.token, admin.csrfToken, before.id, {
      expectedRevision: before.revision, active: true, name: before.name, articleNumber: before.articleNumber, imageKey: before.imageKey,
      association: "A.S.C. Waterwijk", profileId: before.profileId, variantLabels: ["Thuis · zwart"], availableSizes: ["164", "S", "M", "L", "XL"],
      supports: ["initials", "name", "backNumber"], personalizationPolicy: { mode: "combination", fields: { initials: "optional", name: "optional", backNumber: "required" } }, validation: articleValidation(),
    });
    assert.equal(article.validation.status, "VALIDATED");
    assert.equal(article.revision, before.revision + 1);
    await assert.rejects(() => service.updateArticle(admin.token, admin.csrfToken, before.id, { expectedRevision: before.revision, active: false }), (error) => error.code === "REVISION_CONFLICT");
    const restarted = new SportpaleisFileStore({ filePath: store.filePath, backupDirectory: path.join(root, "backups") });
    await restarted.initialize();
    const persisted = (await restarted.read()).articles.find(({ id }) => id === before.id);
    assert.deepEqual(persisted.availableSizes, ["164", "S", "M", "L", "XL"]);
    assert.equal(persisted.validationHistory[0].userId, "kevin");
    const row = articleToMariaDbRow(persisted, "2026-08-10T12:00:00.000Z");
    assert.deepEqual(mariaDbRowToArticle(row).validation, persisted.validation);
    assert.ok(persisted.catalogMedia.some(({ kind }) => kind === "BACK"));
    assert.deepEqual(mariaDbRowToArticle(row).catalogMedia, persisted.catalogMedia, "front/back-bronwaarheid overleeft de bestaande catalogusmetadata-persistence");
  });

  let profile;
  await context.test("profielbevestiging is gereviseerd en persistent zonder generieke pipelinevelden per artikel te verplichten", async () => {
    const before = (await service.bootstrap(admin.token)).productionProfiles.find(({ id }) => id === "profile-shirt");
    assert.equal(before.referenceDistanceCm, null);
    assert.equal(before.validation.placement, "DATA_GAP");
    await assert.rejects(() => service.updateProductionProfile(storeUser.token, storeUser.csrfToken, before.id, { expectedRevision: before.revision }), (error) => error.code === "FORBIDDEN");
    profile = await service.updateProductionProfile(admin.token, admin.csrfToken, before.id, {
      expectedRevision: before.revision, sizeLabel: before.sizeLabel, fontProfile: before.fontProfile, foilColor: before.foilColor,
      instruction: "Test-only profielbevestiging; niet als productiebron gebruiken.", validation: profileValidation(),
    });
    assert.equal(profile.validation.status, "PARTIAL", "optionele historische provenance mag gedeeltelijk blijven zonder opslaan te blokkeren");
    assert.equal(profile.referenceDistanceCm, null);
    assert.equal(profile.rotationDeg, null);
    assert.equal(profile.mirror, null);
    const row = productionProfileToMariaDbRow(profile, "2026-08-10T12:00:00.000Z");
    assert.deepEqual(mariaDbRowToProductionProfile(row).validation, profile.validation);
  });

  let blockedJuniorOrder;
  await context.test("de vaste 200-mm-regel kan niet naar DATA_GAP worden teruggezet en blijft operationeel", async () => {
    const association = (await service.bootstrap(admin.token)).associations.find(({ name }) => name === "A.S.C. Waterwijk");
    await assert.rejects(
      service.updateAssociation(admin.token, admin.csrfToken, association.id, { expectedRevision: association.revision, juniorValidationStatus: "DATA_GAP", juniorValidationNote: "Test-only reset zonder fysieke mm" }),
      (error) => error.code === "BACK_NUMBER_HEIGHT_FIXED_200MM",
    );
    blockedJuniorOrder = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Junior geblokkeerd", customerEmail: "junior-gap@example.nl", customerPhone: "0612345678",
      standardPersonalization: { ...empty, backNumber: "14", backNumberSizeClass: "JUNIOR" }, items: [{ articleId: "sp-live-137294", size: "M", quantity: 1, deviation: false, overrides: {} }],
    }, "readiness-005-junior-gap")).value;
    assert.equal(blockedJuniorOrder.items[0].productionReadiness.status, "CONFIGURED");
    assert.doesNotMatch(blockedJuniorOrder.items[0].productionReadiness.reason ?? "", /hoogte|bron|fontbestand|contour/iu);
    assert.equal(blockedJuniorOrder.items[0].backNumberProduction.physicalHeightMm, 200);
    await service.captureOrderMail(storeUser.token, storeUser.csrfToken, blockedJuniorOrder.id, { templateKey: "ORDER_RECEIVED" }, "readiness-005-junior-gap-mail");
    const latest = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === blockedJuniorOrder.id);
    const controlled = (await service.advanceOrder(operator.token, operator.csrfToken, latest.id, latest.revision, "readiness-005-junior-gap-control")).value;
    assert.equal(controlled.stage, "CONTROL");
    const production = (await service.advanceOrder(operator.token, operator.csrfToken, controlled.id, controlled.revision, "readiness-005-junior-gap-production")).value;
    assert.equal(production.stage, "PRINT");

    const team = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "TEAM", customer: "", customerEmail: "", customerPhone: "", standardPersonalization: empty,
      items: [{ articleId: "sp-live-137294", size: "Meerdere maten", quantity: 18, deviation: true, overrides: empty, variants: Array.from({ length: 18 }, (_, index) => ({ participantName: `Speler ${index + 1}`, size: index % 2 ? "M" : "L", quantity: 1, deviation: true, overrides: { ...empty, backNumber: String(index === 17 ? 99 : index + 1), backNumberSizeClass: "SENIOR" } })) }],
    }, "readiness-005-team")).value;
    assert.equal(team.items[0].variants.length, 18);
    assert.equal(team.items[0].variants.at(-1).personalizationValues.backNumber, "99");
    assert.equal(team.items[0].productionReadiness.status, "CONFIGURED");
    assert.equal(team.customerEmail, "");
    assert.equal(team.customerPhone, "");
    assert.doesNotMatch(team.attention ?? "", /contact|e-mail|telefoon/iu);
    await assert.rejects(() => service.createOrder(storeUser.token, storeUser.csrfToken, { orderKind: "INDIVIDUAL", customer: "Verkeerde maat", customerEmail: "maat@example.nl", customerPhone: "0612345678", standardPersonalization: { ...empty, backNumber: "8", backNumberSizeClass: "SENIOR" }, items: [{ articleId: "sp-live-137294", size: "XXXL", quantity: 1, deviation: false, overrides: {} }] }, "readiness-005-invalid-size"), (error) => error.code === "ARTICLE_SIZE_UNAVAILABLE");
  });

  await context.test("Junior en Senior blijven exact 200 mm; afwijkende adminwaarden falen gesloten", async () => {
    const association = (await service.bootstrap(admin.token)).associations.find(({ name }) => name === "A.S.C. Waterwijk");
    await assert.rejects(
      service.updateAssociation(admin.token, admin.csrfToken, association.id, { expectedRevision: association.revision, juniorValidationStatus: "VALIDATED", juniorPhysicalHeightMm: 180, juniorValidationNote: "Afwijkende testwaarde" }),
      (error) => error.code === "BACK_NUMBER_HEIGHT_FIXED_200MM",
    );
    const updated = (await service.bootstrap(admin.token)).associations.find(({ id }) => id === association.id);
    assert.equal(updated.juniorPhysicalHeightMm, 200);
    const profileAfter = (await service.bootstrap(admin.token)).productionProfiles.find(({ id }) => id === "profile-shirt");
    assert.equal(profileAfter.backNumberSizeClasses.JUNIOR.physicalHeightMm, 200);
    assert.equal(profileAfter.backNumberSizeClasses.JUNIOR.status, "SOURCE_CONFIGURED");
    const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, { orderKind: "INDIVIDUAL", customer: "Junior bevestigd", customerEmail: "junior-ok@example.nl", customerPhone: "0612345678", standardPersonalization: { ...empty, backNumber: "14", backNumberSizeClass: "JUNIOR" }, items: [{ articleId: "sp-live-137294", size: "164", quantity: 1, deviation: false, overrides: {} }] }, "readiness-005-junior-ok")).value;
    assert.equal(created.items[0].backNumberProduction.physicalHeightMm, 200);
    assert.equal(created.items[0].productionReadiness.status, "CONFIGURED");
    assert.doesNotMatch(created.items[0].productionReadiness.reason ?? "", /hoogte|bron|fontbestand|contour/iu);
    assert.equal(blockedJuniorOrder.items[0].backNumberProduction.physicalHeightMm, 200, "de eerdere ordersnapshot behoudt dezelfde authoritative hoogte");
  });

  await context.test("live pilotcatalogus vervangt demo-artikelen en reviewcontract is compleet", async () => {
    const bootstrap = await service.bootstrap(admin.token);
    assert.equal(bootstrap.articles.find(({ id }) => id === "sp-live-116597").validation.status, "PARTIAL", "alle actuele feiten zijn vastgelegd, maar niet-bevestigde niet-maatvarianten blijven DATA_GAP");
    assert.equal(bootstrap.articles.some(({ id }) => id === "home-shirt"), false);
    const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
    const schema = await readFile(new URL("../sportpaleis-server/schema.mysql.sql", import.meta.url), "utf8");
    const migration = await readFile(new URL("../sportpaleis-server/migrations/pilot-readiness-005-to-live-catalog-006.sql", import.meta.url), "utf8");
    assert.match(source, /Artikelbeheer/); assert.match(source, /<summary>Technische details<\/summary>/); assert.match(source, /Bron \/ bevestiging/); assert.match(source, /Fysieke Junior-hoogte \(mm\)/);
    assert.match(source, /LIVE CATALOGUSBRON/); assert.match(source, /Productieblokkade actief/); assert.match(source, /SPW-LIVE-PILOT-CORRECTION-001-20260810/);
    assert.match(schema, /variant_labels_json/); assert.match(schema, /available_sizes_json/); assert.match(schema, /validation_history_json/);
    assert.match(migration, /catalog_metadata_json/); assert.match(migration, /No deployment or database mutation/);
  });
});
