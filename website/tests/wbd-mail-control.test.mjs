import assert from "node:assert/strict";
import test from "node:test";

import { ingestMailEvents, classifyActionPolicy, createInitialAtlasControlPlane } from "../scripts/wbd-atlas-control-plane.mjs";
import { MemoryWbdMailStore, WbdMailControlService, createInitialWbdMailControl, deriveCommitmentCandidates, normalizeInboundMessage } from "../scripts/wbd-mail-control.mjs";
import { assertBulkExecutionPolicy, effectiveCommunicationPermission, normalizeCampaign, normalizeCommunicationContact, normalizeConsentRecord, normalizeJourney } from "../scripts/wbd-communications-domain.mjs";
import { WbdOwnerService, createInitialWbdOwnerState } from "../scripts/wbd-owner-foundation.mjs";
import { createWorkspacePasswordRecord } from "../scripts/workspace-auth-foundation.mjs";

const fixedNow = new Date("2026-08-25T08:00:00.000Z");
const mailbox = createInitialWbdMailControl({ now: fixedNow }).mailboxes[0];
const source = (overrides = {}) => ({ folder: "INBOX", uidValidity: "81234", uid: 42, messageId: "<mail-42@example.com>", from: { name: "Klant", address: "klant@example.com" }, to: [{ address: "info@webuildanddesign.nl" }], cc: [], subject: "Kun je een extra configurator maken?", text: "Kun je dit buiten de huidige scope toevoegen? Graag reactie.", html: "<p>Vraag</p><script>alert(1)</script><img src=\"https://tracker.invalid/pixel\">", receivedAt: fixedNow, flags: [], attachments: [], headers: {}, ...overrides });

test("inbound normalisatie bewaart provenance, blokkeert actieve inhoud en classificeert nieuwe scope", () => {
  const message = normalizeInboundMessage(source(), { mailbox, fetchedAt: fixedNow });
  assert.equal(message.sourceKey, "wbd-info:INBOX:81234:42");
  assert.equal(message.classification.classification, "NIEUWE_SCOPE");
  assert.equal(message.provenance.contentHash, message.contentHash);
  assert.doesNotMatch(message.html, /script|tracker\.invalid/u);
  assert.match(message.html, /Externe afbeelding geblokkeerd/u);
});

test("remote tracking blijft geblokkeerd bij onquoted src, srcset en CSS URLs", () => {
  const message = normalizeInboundMessage(source({ uid: 99, html: '<div style="background:url(https://track.invalid/a)"><img src=https://track.invalid/b srcset="https://track.invalid/c 2x"></div>' }), { mailbox, fetchedAt: fixedNow });
  assert.doesNotMatch(message.html, /track\.invalid|srcset/iu);
  assert.match(message.html, /Externe afbeelding geblokkeerd/u);
});

test("Atlas leest expliciete beloften en datums als traceerbare commitment-candidate", () => {
  const message = normalizeInboundMessage(source({ uid: 100, text: "Kun je voor 2026-08-28 laten weten of dit lukt?" }), { mailbox, fetchedAt: fixedNow });
  const [candidate] = deriveCommitmentCandidates(message);
  assert.equal(candidate.dueAt, "2026-08-28T17:00:00.000Z");
  assert.equal(candidate.owner, "WBD_REVIEW");
  assert.equal(candidate.messageId, message.id);
});

test("threading gebruikt References en mailbox snapshots zijn idempotent", async () => {
  const service = new WbdMailControlService({ store: new MemoryWbdMailStore(createInitialWbdMailControl({ now: fixedNow })), now: () => fixedNow });
  const first = await service.ingestMailboxSnapshot({ status: "SUCCEEDED", mailboxId: "wbd-info", uidValidity: "81234", highestUid: 42, messages: [source()] });
  assert.equal(first.ingested, 1);
  const repeat = await service.ingestMailboxSnapshot({ status: "SUCCEEDED", mailboxId: "wbd-info", uidValidity: "81234", highestUid: 42, messages: [source()] });
  assert.equal(repeat.duplicates, 1);
  const reply = await service.ingestMailboxSnapshot({ status: "SUCCEEDED", mailboxId: "wbd-info", uidValidity: "81234", highestUid: 43, messages: [source({ uid: 43, messageId: "<mail-43@example.com>", inReplyTo: "<mail-42@example.com>", references: ["<mail-42@example.com>"], subject: "Re: Kun je een extra configurator maken?" })] });
  assert.equal(reply.ingested, 1);
  const view = await service.workspaceView();
  assert.equal(view.counts.messages, 2);
  assert.equal(view.counts.threads, 1);
  assert.equal(view.performance.connectorCallsDuringRender, 0);
});

test("een malformed bericht blokkeert de overige mailboxsync niet", async () => {
  const service = new WbdMailControlService({ store: new MemoryWbdMailStore(createInitialWbdMailControl({ now: fixedNow })), now: () => fixedNow });
  const result = await service.ingestMailboxSnapshot({ status: "SUCCEEDED", mailboxId: "wbd-info", uidValidity: "81234", highestUid: 44, messages: [source({ uid: 43, from: null }), source({ uid: 44 })] });
  assert.equal(result.malformed, 1);
  assert.equal(result.ingested, 1);
});

test("Atlas maakt zelfstandig evidence, Attention, NBA en prepared action maar geen send", () => {
  const event = { id: "mail-event-1", messageId: "mail-1", threadId: "thread-1", mailboxId: "wbd-info", organizationId: "we-build-and-design", subject: "Storing webshop", summary: "De checkout werkt niet.", receivedAt: fixedNow.toISOString(), classification: "STORING", confidence: "HIGH", priority: "HIGH", securityStatus: "CLEAN_BY_POLICY", sourceIdentity: "wbd-info:INBOX:1:1", provenance: { fetchedAt: fixedNow.toISOString() } };
  const plane = ingestMailEvents(createInitialAtlasControlPlane({ now: fixedNow }), [event], fixedNow);
  assert.equal(plane.evidence.length, 1);
  assert.equal(plane.attention[0].type, "STORING");
  assert.equal(plane.nextBestActions[0].goRequirement, "REQUIRED");
  assert.equal(plane.preparedActions[0].executionPolicy, "HUMAN_GO_BEFORE_EXTERNAL_SEND");
  assert.equal(classifyActionPolicy("EXTERNAL_CUSTOMER_COMMUNICATION").goRequirement, "REQUIRED");
});

test("connector failures bewaren een veilige stale state", async () => {
  const state = createInitialWbdMailControl({ now: fixedNow });
  state.mailboxes[0].credentialStatus = "PROVISIONED";
  state.mailboxes[0].lastSuccessfulSyncAt = fixedNow.toISOString();
  const service = new WbdMailControlService({ store: new MemoryWbdMailStore(state), now: () => fixedNow });
  const result = await service.ingestMailboxSnapshot({ status: "FAILED", mailboxId: "wbd-info", failureCode: "ETIMEDOUT" });
  assert.equal(result.mailbox.connectionState, "UNAVAILABLE");
  assert.equal(result.mailbox.freshness, "STALE");
});

test("concepten zijn prepared-only en vereisen Human GO", async () => {
  const service = new WbdMailControlService({ store: new MemoryWbdMailStore(createInitialWbdMailControl({ now: fixedNow })), now: () => fixedNow });
  const ingested = await service.ingestMailboxSnapshot({ status: "SUCCEEDED", mailboxId: "wbd-info", uidValidity: "81234", highestUid: 42, messages: [source()] });
  const draft = await service.prepareDraft({ threadId: ingested.events[0].threadId, mailboxId: "wbd-info", to: "klant@example.com", subject: "Re: vraag", text: "Dank voor je bericht." });
  assert.equal(draft.status, "PREPARED");
  assert.equal(draft.goRequirement, "REQUIRED");
  assert.equal(draft.externalNetworkUsed, false);
});

test("commerciële communicatie faalt gesloten zonder bewezen consent", () => {
  const contact = normalizeCommunicationContact({ organizationId: "we-build-and-design", address: "prospect@example.com", sourceRefs: ["crm:1"] });
  assert.equal(effectiveCommunicationPermission({ contact, channel: "COMMERCIAL" }).allowed, false);
  const consent = normalizeConsentRecord({ id: "consent-1", contactId: contact.id, organizationId: contact.organizationId, channel: "COMMERCIAL", state: "OPTED_IN", source: "FORM", observedAt: fixedNow, evidenceRef: "evidence:form:1" });
  assert.deepEqual(effectiveCommunicationPermission({ contact, consentRecords: [consent], channel: "COMMERCIAL" }), { allowed: true, reason: "EXPLICIT_OPT_IN", evidenceRefs: ["evidence:form:1"] });
  assert.equal(effectiveCommunicationPermission({ contact, consentRecords: [consent], suppressions: [{ organizationId: contact.organizationId, address: contact.address, evidenceRef: "bounce:1" }], channel: "COMMERCIAL" }).reason, "SUPPRESSED");
});

test("bulk en journeys blijven voorbereid totdat transport en GO aantoonbaar klaar zijn", () => {
  const campaign = normalizeCampaign({ id: "campaign-1", organizationId: "we-build-and-design", name: "Update", status: "APPROVED", segmentId: "segment-1", templateKey: "wbd-update", templateVersion: 1, senderPolicy: "wbd-info", channel: "COMMERCIAL" });
  assert.equal(assertBulkExecutionPolicy({ campaign, recipients: [{ address: "a@example.com" }], transportConnected: false, humanApproved: true }).reason, "BULK_TRANSPORT_NOT_CONNECTED");
  assert.equal(assertBulkExecutionPolicy({ campaign, recipients: [{ address: "a@example.com" }], transportConnected: true, humanApproved: false }).reason, "HUMAN_GO_REQUIRED");
  assert.throws(() => normalizeJourney({ id: "journey-1", organizationId: "we-build-and-design", name: "Onboarding", steps: [{ type: "SEND_AFTER_GO" }] }), /STOP/u);
  assert.equal(normalizeJourney({ id: "journey-1", organizationId: "we-build-and-design", name: "Onboarding", steps: [{ type: "PREPARE_MAIL" }, { type: "REQUEST_GO" }, { type: "SEND_AFTER_GO" }, { type: "STOP" }] }).goRequirement, "REQUIRED_BEFORE_EXTERNAL_SEND");
});

test("centrale Mail API blijft owner-only en conceptmutaties vereisen CSRF", async () => {
  let ownerState = createInitialWbdOwnerState({ passwordRecord: await createWorkspacePasswordRecord("Mail-Owner-Test-2026!"), now: fixedNow });
  const ownerStore = { async initialize() {}, async read() { return structuredClone(ownerState); }, async mutate(mutator) { const result = await mutator(structuredClone(ownerState)); result.state.revision = ownerState.revision + 1; ownerState = result.state; return { state: structuredClone(ownerState), value: result.value }; }, async storageStatus() { return { engine: "memory-test" }; } };
  const mailControl = new WbdMailControlService({ store: new MemoryWbdMailStore(createInitialWbdMailControl({ now: fixedNow })), now: () => fixedNow });
  const service = new WbdOwnerService({ store: ownerStore, mailControl, releaseId: "MAIL-TEST", allowedOrigin: "https://workspace.example.test" });
  await service.initialize();
  await assert.rejects(service.mailWorkspace(), (cause) => cause.code === "UNAUTHENTICATED");
  const login = await service.login({ email: "donovanweide@gmail.com", password: "Mail-Owner-Test-2026!", now: fixedNow });
  const view = await service.mailWorkspace(login.token, {}, fixedNow);
  assert.equal(view.mailboxes.length, 2);
  await assert.rejects(service.prepareMailDraft(login.token, "wrong", {}, fixedNow), (cause) => cause.code === "CSRF_INVALID");
});
