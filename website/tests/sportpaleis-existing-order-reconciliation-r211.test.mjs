import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createSportpaleisProductionBootstrap,
  reconcileExistingOrderProductionTruth,
  SportpaleisFileStore,
  SportpaleisPilotService,
} from "../scripts/sportpaleis-pilot-foundation.mjs";
import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "../scripts/mail-foundation.mjs";

const passwords = { kevin: "R211-Kevin-Truth!", patrick: "R211-Patrick-Truth!", collega: "R211-Store-Truth!", "donovan-support": "R211-Support-Truth!" };

function legacyOrder(id, items, extra = {}) {
  return {
    id, revision: 1, customer: `Legacy ${id}`, customerEmail: "", customerPhone: "",
    association: items[0]?.association ?? "Geen vereniging", associations: [...new Set(items.map(({ association }) => association).filter(Boolean))],
    createdAt: "2024-04-02T09:00:00.000Z", updatedAt: "2024-04-02T09:00:00.000Z", promisedAt: null,
    stage: "ORDER", orderKind: "LEGACY", owner: "Historische import", totalPieces: items.reduce((sum, item) => sum + item.quantity, 0),
    items, foilStates: [...new Set(items.map(({ foilColor }) => foilColor).filter(Boolean))].map((color) => ({ color, status: "READY" })),
    sourceContext: { source: "STORE", label: "Historische winkelorder", externalReference: id, provenance: `Immutable historische orderbon ${id}`, transactionalAuthority: "WORKSPACE" },
    communication: { requiredForIndividualOrder: false, receipt: { status: "NOT_SENT" }, production: { status: "NOT_SENT" }, ready: { status: "NOT_SENT" } },
    pickup: { status: "NOT_PICKED_UP", pickedUpAt: null, pickedUpBy: null },
    fulfillment: { mode: "PICKUP", status: "PENDING", updatedAt: null, updatedBy: null, feeEur: 0, address: null },
    eventHistory: [], notes: [], ...extra,
  };
}

function legacyItem(id, personalization, extra = {}) {
  return { id, articleNumber: `LEG-${id}`, product: "Historisch wedstrijdshirt", association: "A.S.C. Waterwijk", size: "L", quantity: 2, personalization, foilColor: "Wit", productionProfileId: "profile-shirt", sourceType: "LEGACY", sourceProvenance: `Orderbon regel ${id}`, ...extra };
}

function executableTestState() {
  const state = createSportpaleisProductionBootstrap();
  for (const profile of state.productionProfiles) if (["profile-shirt", "profile-initials"].includes(profile.id)) profile.fontProfile = "Liberation Sans Regular";
  return state;
}

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-r211-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const mailFoundation = new MailFoundation({ organizations: createMailOrganizations({ organizationIds: ["sportpaleis"] }), store: new MemoryMailStore(), transport: new CaptureTransport({ captureDirectory: path.join(root, "mail") }) });
  const service = new SportpaleisPilotService({ store, mailFoundation, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl", uploadsEnabled: true });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  const operator = await service.login({ email: "patrick@sportpaleis.nl", password: passwords.patrick });
  const storeUser = await service.login({ email: "collega@sportpaleis.nl", password: passwords.collega });
  return { root, store, service, admin, operator, storeUser };
}

test("expliciete historische decoration-intentie wordt deterministisch PROVEN zonder de order te muteren", () => {
  const state = executableTestState();
  const order = legacyOrder("SP-LEGACY-PROVEN", [legacyItem("shirt", "Initialen AB · Rug 10 (Senior)")]);
  const before = structuredClone(order);
  const first = reconcileExistingOrderProductionTruth(state, order);
  const second = reconcileExistingOrderProductionTruth(state, order);
  assert.equal(first.status, "PROVEN");
  assert.deepEqual(first.productionLines.map(({ personalizationField, content, heightMm, quantity }) => ({ personalizationField, content, heightMm, quantity })), [
    { personalizationField: "backNumber", content: "10", heightMm: 220, quantity: 2 },
    { personalizationField: "initials", content: "AB", heightMm: 30, quantity: 2 },
  ]);
  assert.deepEqual(first.productionLines.map(({ id }) => id), second.productionLines.map(({ id }) => id));
  assert.equal(first.projectionHash, second.projectionHash);
  assert.deepEqual(order, before);
});

test("gemengd Junior/Senior blijft in afzonderlijke fysieke groepen en kledingmaat bepaalt de klasse nooit", () => {
  const state = executableTestState();
  const item = legacyItem("mixed", "Rugnummers volgens namenlijst", {
    variants: [
      { id: "person-junior", quantity: 2, size: "140", personalization: "Rug 7 Junior", personalizationValues: { backNumber: "7", backNumberSizeClass: "JUNIOR" }, backNumberProduction: { sizeClass: "JUNIOR", physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: "Historische Junior-productieregel" } },
      { id: "person-senior", quantity: 3, size: "M", personalization: "Rug 7 Senior", personalizationValues: { backNumber: "7", backNumberSizeClass: "SENIOR" }, backNumberProduction: { sizeClass: "SENIOR", physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "Historische Senior-productieregel" } },
    ],
  });
  const result = reconcileExistingOrderProductionTruth(state, legacyOrder("SP-LEGACY-MIXED", [item]));
  assert.equal(result.status, "PROVEN");
  assert.deepEqual(result.productionLines.map(({ heightMm, quantity }) => ({ heightMm, quantity })).sort((a, b) => a.heightMm - b.heightMm), [{ heightMm: 200, quantity: 2 }, { heightMm: 220, quantity: 3 }]);

  const missingClass = reconcileExistingOrderProductionTruth(state, legacyOrder("SP-LEGACY-NO-CLASS", [legacyItem("no-class", "Rug 7", { size: "140" })]));
  assert.equal(missingClass.status, "HUMAN_DECISION_REQUIRED");
  assert.equal(missingClass.findings.find(({ missingField }) => missingField === "SIZE_CLASS")?.action.kind, "CHOOSE_SIZE_CLASS");
});

test("onbekende legacyvormen geven per decoration een concrete HUMAN_DECISION_REQUIRED actie en nooit generieke dead-end Attention", () => {
  const state = executableTestState();
  const ambiguous = reconcileExistingOrderProductionTruth(state, legacyOrder("SP-LEGACY-AMBIGUOUS", [legacyItem("ambiguous", "34 · JANSEN")]));
  assert.equal(ambiguous.status, "HUMAN_DECISION_REQUIRED");
  assert.ok(ambiguous.findings.length >= 2);
  for (const finding of ambiguous.findings) {
    assert.ok(finding.itemId);
    assert.ok(finding.decoration);
    assert.ok(finding.reason);
    assert.ok(finding.evidence);
    assert.ok(finding.action.label);
    assert.match(finding.action.target, /productieherstel|productieprofielen/u);
  }
});

test("legacydiversiteit behoudt bron, orderklasse, cardinaliteit, kleur en lifecycle zonder route-specifieke productiewaarheid", () => {
  const state = executableTestState();
  const cases = [
    legacyOrder("SP-LEGACY-WINKEL", [legacyItem("winkel", "Initialen WK · Rug 18 (Senior)", { quantity: 1, foilColor: "Wit" })], { orderKind: "INDIVIDUAL" }),
    legacyOrder("SP-LEGACY-WEBSHOP", [legacyItem("webshop", "Naam DE VRIES · Rug 5 (Junior)", { quantity: 3, foilColor: "Zwart" })], {
      orderKind: "INDIVIDUAL",
      sourceContext: { source: "WEBSHOP_XPRT", label: "Historische webshoporder", externalReference: "XPRT-451", provenance: "Immutable XPRT-orderregel", transactionalAuthority: "XPRT" },
    }),
    legacyOrder("SP-LEGACY-VRIJ", [legacyItem("vrij", "Initialen ZZ", { association: "", productionProfileId: "profile-initials", product: "Vrije initialen", quantity: 4, foilColor: "Zwart" })], {
      orderKind: "CUSTOM", association: "Geen vereniging", associations: [],
      sourceContext: { source: "FREE_PRODUCTION", label: "Historische vrije opdracht", externalReference: null, provenance: "Fysieke productiebon", transactionalAuthority: "WORKSPACE" },
    }),
    legacyOrder("SP-LEGACY-MULTI-ARTICLE", [
      legacyItem("multi-a", "Naam JANSEN", { quantity: 2, foilColor: "Wit" }),
      legacyItem("multi-b", "Initialen PJ", { articleNumber: "LEG-MULTI-B", quantity: 5, foilColor: "Zwart" }),
    ]),
    legacyOrder("SP-LEGACY-PERSONEN", [legacyItem("personen", "Persoonsregels", {
      quantity: 3,
      variants: [
        { id: "persoon-a", participantName: "Persoon A", quantity: 1, size: "140", personalization: "Rug 8 Junior", personalizationValues: { initials: "AA", initialsInfix: "", name: "", backNumber: "8", chestNumber: "", backNumberSizeClass: "JUNIOR", shortsNumber: "" }, backNumberProduction: { sizeClass: "JUNIOR", physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: "Historische Junior-regel" } },
        { id: "persoon-b", participantName: "Persoon B", quantity: 2, size: "L", personalization: "Rug 19 Senior", personalizationValues: { initials: "BB", initialsInfix: "", name: "", backNumber: "19", chestNumber: "", backNumberSizeClass: "SENIOR", shortsNumber: "" }, backNumberProduction: { sizeClass: "SENIOR", physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "Historische Senior-regel" } },
      ],
    })], { orderKind: "TEAM" }),
  ];
  const results = cases.map((order) => ({ order, result: reconcileExistingOrderProductionTruth(state, order) }));
  for (const { order, result } of results) {
    assert.notEqual(result.status, undefined, `${order.id} krijgt een deterministische klasse`);
    assert.ok(result.status === "PROVEN" || result.findings.every(({ reason, action }) => reason && action?.label && action?.target), `${order.id} is uitvoerbaar of concreet herstelbaar`);
    assert.equal(result.historicalSourceHash, reconcileExistingOrderProductionTruth(state, order).historicalSourceHash);
  }
  const webshop = results.find(({ order }) => order.id === "SP-LEGACY-WEBSHOP").result;
  assert.equal(webshop.status, "PROVEN");
  assert.deepEqual(new Set(webshop.productionLines.map(({ decorationIdentity }) => decorationIdentity.foilColor)), new Set(["Zwart"]));
  assert.equal(webshop.productionLines.reduce((sum, { quantity }) => sum + quantity, 0), 6, "twee decorations × drie stuks blijven zes fysieke instanties");
  const multiple = results.find(({ order }) => order.id === "SP-LEGACY-MULTI-ARTICLE").result;
  assert.equal(multiple.status, "PROVEN");
  assert.equal(new Set(multiple.productionLines.map(({ itemId }) => itemId)).size, 2);
  assert.deepEqual(new Set(multiple.productionLines.map(({ decorationIdentity }) => decorationIdentity.foilColor)), new Set(["Wit", "Zwart"]));
  const people = results.find(({ order }) => order.id === "SP-LEGACY-PERSONEN").result;
  assert.equal(people.status, "PROVEN");
  assert.deepEqual(new Set(people.productionLines.filter(({ personalizationField }) => personalizationField === "backNumber").map(({ heightMm }) => heightMm)), new Set([200, 220]));
  const stored = legacyOrder("SP-LEGACY-PARTIAL", [legacyItem("partial", "Initialen PT")], { stage: "PRINT", productionLines: structuredClone(results[0].result.productionLines), productionCompletion: { status: "PARTIAL" } });
  const storedResult = reconcileExistingOrderProductionTruth(state, stored);
  assert.equal(storedResult.status, "PROVEN");
  assert.equal(storedResult.sourceKind, "STORED_CANONICAL");
  assert.deepEqual(storedResult.productionLines, stored.productionLines, "gedeeltelijk geproduceerde historische waarheid wordt nooit opnieuw geïnterpreteerd");
});

test("eenduidige inferentie materialiseert alleen na expliciete auditbare bevestiging en retry is idempotent", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => {
    state.productionProfiles.find(({ id }) => id === "profile-initials").fontProfile = "Liberation Sans Regular";
    state.orders.push(legacyOrder("SP-LEGACY-RESOLVABLE", [legacyItem("initials", "AB", { productionProfileId: "profile-initials", product: "Historische initialen" })]));
    return { state, value: null };
  });
  let order = await service.order(admin.token, "SP-LEGACY-RESOLVABLE");
  assert.equal(order.productionReconciliation.status, "RESOLVABLE");
  assert.equal(order.productionStatus, "ATTENTION");
  const request = { expectedRevision: order.revision, historicalSourceHash: order.productionReconciliation.historicalSourceHash, projectionHash: order.productionReconciliation.projectionHash, confirm: true, reason: "Originele orderbon en unieke initialenregel gecontroleerd" };
  await assert.rejects(
    service.confirmExistingOrderProductionReconciliation(admin.token, admin.csrfToken, order.id, { ...request, projectionHash: "stale-projection" }, "r211-stale-projection"),
    (error) => error.code === "RECONCILIATION_PROJECTION_STALE"
  );
  let persisted = await store.read();
  assert.equal(persisted.orders.find(({ id }) => id === order.id).productionLines, undefined, "een stale/falende bevestiging materialiseert niets");
  const first = await service.confirmExistingOrderProductionReconciliation(admin.token, admin.csrfToken, order.id, request, "r211-confirm-resolvable");
  const duplicate = await service.confirmExistingOrderProductionReconciliation(admin.token, admin.csrfToken, order.id, request, "r211-confirm-resolvable");
  assert.equal(first.duplicate, false);
  assert.equal(duplicate.duplicate, true);
  order = await service.order(admin.token, order.id);
  assert.equal(order.productionReconciliation.status, "PROVEN");
  assert.equal(order.productionStatus, "READY");
  assert.equal(order.productionLines.length, 1);
  persisted = await store.read();
  const event = persisted.orders.find(({ id }) => id === order.id).eventHistory.find(({ type }) => type === "EXISTING_ORDER_PRODUCTION_RECONCILED");
  assert.equal(event.details.historicalSourcePreserved, true);
  assert.equal(event.details.reason, request.reason);
  assert.ok(persisted.audit.find(({ action, subject }) => action.includes("canonical productiewaarheid") && subject === order.id));
});

test("Junior/Senior en foliekleur zijn in dezelfde ordercontext herstelbaar zonder historische bronmutatie", async (context) => {
  const { store, service, admin, storeUser } = await fixture(context);
  await store.mutate(async (state) => {
    state.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular";
    state.orders.push(legacyOrder("SP-LEGACY-INLINE-RECOVERY", [legacyItem("inline", "Rug 7", { foilColor: "Onbekend" })]));
    return { state, value: null };
  });
  let order = await service.order(admin.token, "SP-LEGACY-INLINE-RECOVERY");
  const originalItems = structuredClone(order.items);
  const sizeFinding = order.productionReconciliation.findings.find(({ missingField }) => missingField === "SIZE_CLASS");
  const colorFinding = order.productionReconciliation.findings.find(({ missingField }) => missingField === "FOIL_COLOR");
  assert.ok(sizeFinding && colorFinding);
  await assert.rejects(
    service.resolveExistingOrderProductionReconciliationFinding(storeUser.token, storeUser.csrfToken, order.id, { expectedRevision: order.revision, historicalSourceHash: order.productionReconciliation.historicalSourceHash, findingId: sizeFinding.id, value: "SENIOR", reason: "Niet bevoegde poging" }, "r211-store-denied"),
    (error) => error.statusCode === 403 && error.message === "Onvoldoende rechten.",
  );
  await service.resolveExistingOrderProductionReconciliationFinding(admin.token, admin.csrfToken, order.id, { expectedRevision: order.revision, historicalSourceHash: order.productionReconciliation.historicalSourceHash, findingId: sizeFinding.id, value: "SENIOR", reason: "Historische orderbon vermeldt Senior" }, "r211-inline-size");
  order = await service.order(admin.token, order.id);
  assert.equal(order.productionReconciliation.findings.some(({ missingField }) => missingField === "SIZE_CLASS"), false);
  assert.equal(order.productionReconciliation.findings.some(({ missingField }) => missingField === "FOIL_COLOR"), true);
  const currentColorFinding = order.productionReconciliation.findings.find(({ missingField }) => missingField === "FOIL_COLOR");
  await service.resolveExistingOrderProductionReconciliationFinding(admin.token, admin.csrfToken, order.id, { expectedRevision: order.revision, historicalSourceHash: order.productionReconciliation.historicalSourceHash, findingId: currentColorFinding.id, value: "Wit", reason: "Fysieke orderbon en aanwezige foliebatch gecontroleerd" }, "r211-inline-color");
  order = await service.order(admin.token, order.id);
  assert.equal(order.productionReconciliation.status, "RESOLVABLE");
  assert.equal(order.productionReconciliation.findings.every(({ missingField }) => missingField === "CONFLICT"), true);
  assert.deepEqual(order.items, originalItems, "de historische orderregels blijven byte-voor-byte semantisch behouden");
  const request = { expectedRevision: order.revision, historicalSourceHash: order.productionReconciliation.historicalSourceHash, projectionHash: order.productionReconciliation.projectionHash, confirm: true, reason: "Beide ontbrekende waarden tegen bron bevestigd" };
  await service.confirmExistingOrderProductionReconciliation(admin.token, admin.csrfToken, order.id, request, "r211-inline-confirm");
  order = await service.order(admin.token, order.id);
  assert.equal(order.productionStatus, "READY");
  assert.equal(order.productionLines[0].decorationIdentity.foilColor, "Wit");
  assert.equal(order.productionLines[0].heightMm, 220);
  const persisted = await store.read();
  assert.ok(persisted.audit.filter(({ action, subject }) => action === "Ontbrekende bestaande-orderwaarheid beslist" && subject === order.id).length === 2);
});

test("PROVEN legacyorder doorloopt canonical productievoorstel, Bedrukt en expliciet Gereed met persistence", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => {
    state.productionProfiles.find(({ id }) => id === "profile-shirt").fontProfile = "Liberation Sans Regular";
    state.orders.push(legacyOrder("SP-LEGACY-LIFECYCLE", [legacyItem("lifecycle", "Initialen CD · Rug 12 (Senior)")]));
    return { state, value: null };
  });
  let order = await service.order(admin.token, "SP-LEGACY-LIFECYCLE");
  assert.equal(order.productionStatus, "READY");
  const prepared = (await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: "Wit" }, "r211-legacy-prepare")).value;
  assert.equal(prepared.job.snapshot.productionLines.length, 2);
  await service.completeProductionJob(admin.token, admin.csrfToken, prepared.job.id, "r211-legacy-bedrukt");
  order = await service.order(admin.token, order.id);
  assert.equal(order.productionStatus, "FULLY_PRODUCED");
  const completed = (await service.completeProductionOrders(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }] }, "r211-legacy-gereed")).value;
  assert.equal(completed.completed[0].stage, "DONE");
  order = await service.order(admin.token, order.id);
  assert.equal(order.productionStatus, "DONE");
  assert.equal(order.productionClosure.status, "CONFIRMED");
  assert.deepEqual(order.productionCompletionEvidence.requiredLineIds, order.productionLines.map(({ id }) => id).sort());
});

test("UI projecteert concrete reconciliation en heeft geen generieke self-link als enige recovery", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /existingOrderReconciliationPanel/u);
  assert.match(source, /data-production-reconciliation-form/u);
  assert.match(source, /data-production-reconciliation-decision-form/u);
  assert.match(source, /reconciliationFinding\.action\.target/u);
  assert.match(source, /Alleen ontbrekende waarheid invullen/u);
});
