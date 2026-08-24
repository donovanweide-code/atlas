import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "Review-Kevin-2026!", patrick: "Review-Patrick-2026!", collega: "Review-Store-2026!", "donovan-support": "Review-Support-2026!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-final-correction-007-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, releaseId: "SPW-FINAL-HUMAN-REVIEW-CORRECTION-007-20260812", allowedOrigin: "http://127.0.0.1", demoMode: true });
  await service.initialize();
  return { service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }), storeUser: await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega }) };
}

test("productiestatusfilters, compact orderwerk en gegroepeerd Beheer zijn aantoonbaar aanwezig", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8");
  assert.match(source, /SPW-PILOT-FINAL-SMOOTH-POLISH-004-20260814/u);
  assert.match(source, /data-printing-sticky/u);
  assert.match(source, /productionStatus === "READY"/u);
  assert.match(source, /data-free-font-search/u);
  assert.match(source, /MENSEN & TOEGANG/u);
  assert.match(source, /Websitecontrole/u);
  assert.match(source, /Vrije productieopdracht/u);
  assert.match(css, /sp-selected-item__identity/u);
  assert.match(css, /sp-printing-sticky\[hidden\]/u);
  assert.match(css, /sp-combined-production-preview__roll\{flex-wrap:wrap\}/u);
});

test("productie-defaults zijn server-side beheerd en begrensd", async (context) => {
  const { service, admin } = await fixture(context);
  const before = await service.bootstrap(admin.token);
  assert.deepEqual({ ...before.settings.productionDefaults, defaultFontId: "<validated-font>" }, { workingWidthMm: 440, maxSafeTrackWidthMm: 450, minimumGapMm: 6.4, edgeMarginMm: 5, defaultWidthMm: 180, defaultHeightMm: 30, defaultFontId: "<validated-font>", defaultFoilColor: "Wit" });
  assert.ok(before.productionFonts.some(({ id, status }) => id === before.settings.productionDefaults.defaultFontId && status === "TECHNICALLY_VALID"));
  await service.updateSettings(admin.token, admin.csrfToken, { productionDefaults: { ...before.settings.productionDefaults, defaultWidthMm: 175, defaultHeightMm: 28 } });
  const after = await service.bootstrap(admin.token);
  assert.equal(after.settings.productionDefaults.defaultWidthMm, 175);
  assert.equal(after.settings.productionDefaults.defaultHeightMm, 28);
  await service.updateSettings(admin.token, admin.csrfToken, { productionDefaults: { ...after.settings.productionDefaults, workingWidthMm: 445, maxSafeTrackWidthMm: 450, edgeMarginMm: 5 } });
  await assert.rejects(() => service.updateSettings(admin.token, admin.csrfToken, { productionDefaults: { ...after.settings.productionDefaults, workingWidthMm: 450, maxSafeTrackWidthMm: 445 } }), /nominale werkbreedte/u);
});

test("vrije productiecontext bewaart optionele klantcontext en normaliseert output server-side", async (context) => {
  const { service, storeUser } = await fixture(context);
  const state = await service.bootstrap(storeUser.token);
  const font = state.productionFonts.find(({ status, allowedInStore }) => status === "TECHNICALLY_VALID" && allowedInStore);
  assert.ok(font);
  const created = (await service.createOrder(storeUser.token, storeUser.csrfToken, {
    orderKind: "CUSTOM", customer: "", customerEmail: "", customerPhone: "", standardPersonalization: { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" },
    productionLines: [
      { id: "text", type: "TEXT", content: "van dijk", sourceId: font.id, widthMm: 120, heightMm: 30, quantity: 2 },
      { id: "initials", type: "INITIALS", content: "jm", sourceId: font.id, widthMm: 40, heightMm: 30, quantity: 1 },
    ],
    items: [{ product: "Herstelopdracht", association: "Vrije bedrukking", size: "", quantity: 3, personalization: "van dijk · jm", deviation: true, overrides: { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" } }],
  }, "free-production-normalization-007")).value;
  assert.equal(created.customer, "Vrije productieopdracht");
  assert.equal(created.customerEmail, "");
  assert.equal(created.customerPhone, "");
  assert.deepEqual(created.productionLines.map(({ content }) => content), ["VAN DIJK", "JM"]);
});

test("bestaande PLOT-2026-0004 fysieke bewijsgrens blijft exact behouden", async (context) => {
  const { service, admin } = await fixture(context);
  const state = await service.bootstrap(admin.token);
  const job = state.productionJobs.find(({ jobNumber }) => jobNumber === "PLOT-2026-0004");
  assert.equal(job.proofStatus, "PHYSICALLY_VALIDATED");
  assert.equal(job.humanAcceptance.status, "PASS");
  assert.equal(job.snapshot.artifact.sha256, "26C326E26A34049CB7C3D270D335F1BEE03776E9865E94F9C81462817AEF9FD6");
  assert.equal(job.snapshot.artifact.version, "cutjob-svg@1");
  assert.equal(job.snapshot.hardwareSendPerformedByWorkspace, false);
});
