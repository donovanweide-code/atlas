import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS,
  SPORTPALEIS_LIVE_ADDITIONAL_ARTICLES,
  SPORTPALEIS_LIVE_EXCLUDED_ARTICLES,
  SPORTPALEIS_LIVE_HUMAN_CONFIRMATION_REQUIRED_ARTICLES,
  SPORTPALEIS_LIVE_PILOT_ARTICLES,
} from "../config/sportpaleis-live-pilot-catalog.mjs";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Live-Catalog-Kevin-006!", patrick: "Live-Catalog-Patrick-006!", collega: "Live-Catalog-Store-006!", "donovan-support": "Live-Catalog-Support-006!" };
const empty = { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-live-006-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations(), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return {
    service,
    admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }),
    operator: await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick }),
    storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }),
  };
}

test("Sportpaleis live pilotcatalogus 006 — bronnen, multi-vereniging en veilige productieblokkade", async (context) => {
  const { service, admin, operator, storeUser } = await fixture(context);

  await context.test("live inventaris vervangt demo-SKU's en bevat meerdere verenigingen", () => {
    assert.equal(SPORTPALEIS_LIVE_PILOT_ARTICLES.length, 183);
    assert.equal(new Set(SPORTPALEIS_LIVE_PILOT_ARTICLES.map(({ id }) => id)).size, 183);
    assert.equal(new Set(SPORTPALEIS_LIVE_PILOT_ARTICLES.map(({ association }) => association)).size, 16);
    assert.equal(SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS.filter(({ status }) => status === "LIVE").length, 20);
    assert.deepEqual(SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS.filter(({ confirmedPrintArticleCount }) => confirmedPrintArticleCount === 0).map(({ association }) => association), ["Almere'81", "Buitenhout MHC", "HBSA", "Sloeproeien"]);
    assert.equal(SPORTPALEIS_LIVE_HUMAN_CONFIRMATION_REQUIRED_ARTICLES.length, 267);
    assert.equal(SPORTPALEIS_LIVE_EXCLUDED_ARTICLES.length, 0);
    assert.equal(SPORTPALEIS_LIVE_ADDITIONAL_ARTICLES.length, 0);
    assert.ok(SPORTPALEIS_LIVE_PILOT_ARTICLES.every(({ id, imageKey, catalogProvenance }) => id.startsWith("sp-live-") && imageKey.startsWith("sp-live-") && catalogProvenance.authority === "SPORTPALEIS_LIVE"));
    assert.ok(SPORTPALEIS_LIVE_PILOT_ARTICLES.every(({ availableSizes, priceConfiguration, supports, printRelevance }) => availableSizes.every((size) => typeof priceConfiguration.articleUnitPricesBySizeEur[size] === "number") && supports.length && printRelevance.status === "CONFIRMED_VISIBLE_PERSONALIZATION"));
    assert.equal(SPORTPALEIS_LIVE_PILOT_ARTICLES.some(({ articleNumber }) => articleNumber === "ASC-1001"), false);
  });

  await context.test("normale order bewaart per artikel de eigen vereniging en bron", async () => {
    const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "INDIVIDUAL", customer: "Multi vereniging", customerEmail: "multi@example.nl", customerPhone: "0612345678",
      standardPersonalization: { ...empty, backNumber: "12", backNumberSizeClass: "SENIOR" },
      items: [
        { articleId: "sp-live-137294", association: "A.S.C. Waterwijk", size: "M", quantity: 1, deviation: false, overrides: {} },
        { articleId: "sp-live-116597", association: "FC Almere", size: "L", quantity: 1, deviation: false, overrides: {} },
      ],
    }, "live-006-multi-order")).value;
    assert.equal(created.association, "Meerdere verenigingen");
    assert.deepEqual(created.associations.sort(), ["A.S.C. Waterwijk", "FC Almere"]);
    assert.deepEqual(created.items.map(({ association }) => association).sort(), ["A.S.C. Waterwijk", "FC Almere"]);
    assert.ok(created.items.every(({ sourceProvenance, productionReadiness }) => sourceProvenance.includes("Sportpaleis") && ["ATTENTION", "DATA_GAP"].includes(productionReadiness.status)));
    await service.captureOrderMail(storeUser.token, storeUser.csrfToken, created.id, { templateKey: "ORDER_RECEIVED" }, "live-006-multi-mail");
    const current = (await service.bootstrap(operator.token)).orders.find(({ id }) => id === created.id);
    const advanced = (await service.advanceOrder(operator.token, operator.csrfToken, current.id, current.revision, "live-006-nonblocking-attention")).value;
    assert.equal(advanced.stage, "CONTROL");
  });

  await context.test("server valideert vereniging, maat en toegestane bedrukking", async () => {
    const base = { orderKind: "INDIVIDUAL", customer: "Servervalidatie", customerEmail: "validation@example.nl", customerPhone: "0612345678", standardPersonalization: { ...empty, backNumber: "8", backNumberSizeClass: "SENIOR" } };
    await assert.rejects(() => service.createOrder(storeUser.token, storeUser.csrfToken, { ...base, items: [{ articleId: "sp-live-137294", association: "FC Almere", size: "M", quantity: 1, deviation: false, overrides: {} }] }, "live-006-bad-association"), (error) => error.code === "ARTICLE_ASSOCIATION_MISMATCH");
    await assert.rejects(() => service.createOrder(storeUser.token, storeUser.csrfToken, { ...base, items: [{ articleId: "sp-live-137294", association: "A.S.C. Waterwijk", size: "XXXL", quantity: 1, deviation: false, overrides: {} }] }, "live-006-bad-size"), (error) => error.code === "ARTICLE_SIZE_UNAVAILABLE");
    await assert.rejects(() => service.createOrder(storeUser.token, storeUser.csrfToken, { ...base, items: [{ articleId: "sp-live-137294", association: "A.S.C. Waterwijk", size: "M", quantity: 1, deviation: true, overrides: { ...empty, initials: "DW" } }] }, "live-006-bad-print"), (error) => error.code === "ARTICLE_PERSONALIZATION_NOT_ALLOWED");
  });

  await context.test("Teamorder gebruikt dezelfde generieke multi-verenigingscatalogus", async () => {
    const variants = (size) => Array.from({ length: 18 }, (_, index) => ({ participantName: `Speler ${index + 1}`, size, quantity: 1, deviation: true, overrides: { ...empty, backNumber: String(index === 17 ? 99 : index + 1), backNumberSizeClass: "SENIOR" } }));
    const team = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
      orderKind: "TEAM", customer: "Team multi", customerEmail: "team@example.nl", customerPhone: "0612345678", standardPersonalization: empty,
      items: [
        { articleId: "sp-live-137294", association: "A.S.C. Waterwijk", variants: variants("M") },
        { articleId: "sp-live-116597", association: "FC Almere", variants: variants("L") },
      ],
    }, "live-006-multi-team")).value;
    assert.equal(team.association, "Meerdere verenigingen");
    assert.equal(team.items.length, 2);
    assert.ok(team.items.every(({ variants: rows }) => rows.length === 18 && rows.at(-1).personalizationValues.backNumber === "99"));
  });

  await context.test("Pioneers legt alleen de bewezen fysieke scope als VALIDATED vast", async () => {
    const profile = (await service.bootstrap(admin.token)).productionProfiles.find(({ id }) => id === "profile-pioneers-shirt");
    assert.equal(profile.backNumberSizeClasses.SENIOR.physicalHeightMm, 200);
    assert.equal(profile.backNumberSizeClasses.SENIOR.status, "VALIDATED");
    assert.equal(profile.validation.cutContour, "VALIDATED");
    assert.equal(profile.validation.physicalCutOutput, "VALIDATED");
    assert.deepEqual(profile.validation.validatedScope, ["Senior rugnummerhoogte 200 mm", "Snijlijnen/cijfercontouren 2, 34 en 77", "Fysieke snijtest uitgevoerd en snijlijnen correct bevestigd"]);
    for (const field of ["placement", "referenceDistance", "rotation", "mirror"]) assert.equal(profile.validation[field], "DATA_GAP");
    assert.equal(profile.backNumberSizeClasses.JUNIOR.status, "SOURCE_CONFIGURED");
    assert.equal(profile.backNumberSizeClasses.JUNIOR.physicalHeightMm, 160);
    const shorts = (await service.bootstrap(admin.token)).productionProfiles.find(({ id }) => id === "profile-pioneers-shorts");
    assert.equal(shorts.validation.cutContour, "DATA_GAP");
    assert.equal(shorts.validation.physicalCutOutput, "DATA_GAP");
  });

  await context.test("Workspace-bron bevat geen Waterwijk-only catalogusfilter", async () => {
    const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
    assert.doesNotMatch(source, /articleCatalogStatus\s*===\s*["']VALIDATED_PILOT_CATALOG["']/);
    assert.match(source, /article\.association/);
  });
});
