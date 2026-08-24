import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  organizationContext,
  renderOrganizationContext,
  renderOrganizationDirectory,
  renderOpportunityDirectory,
} from "../src/wbd-organization-context.ts";

const stamp = "2026-08-16T12:00:00.000Z";
const base = (id, sourceHealthId = "wbd-owner-confirmed-organizations") => ({ id, revision: 1, sourceHealthId, confirmedBy: "owner", createdAt: stamp, updatedAt: stamp });
const organization = (id, name, relationshipType, status = "ACTIVE") => ({ ...base(id), name, relationshipType, status, reviewedAt: stamp, sourceRefs: [`confirmation:${id}`] });

function controlFixture() {
  return {
    schemaVersion: 1,
    revision: 12,
    releaseId: "WBD-ORGANIZATION-CONTEXT-V1A-TEST",
    organizations: [
      organization("we-build-and-design", "We Build And Design", "OWN_ORGANIZATION"),
      organization("sportpaleis", "Sport 2000 Sportpaleis B.V.", "CUSTOMER"),
      organization("bij-cees", "Bij Cees", "CUSTOMER", "UNKNOWN"),
    ],
    opportunities: [{
      ...base("opportunity-bijcees", "wbd-owner-confirmed-opportunities"), organizationId: "bij-cees", title: "Digitale vernieuwing", problemOrOpportunity: "Actuele werkelijkheid onderzoeken.", status: "OPEN", valueType: "UNKNOWN", expectedOneOffRevenue: null, expectedMrr: null, proposalStatus: "NONE", evidenceRefs: ["owner-review"], nextReviewAt: "2026-09-01T00:00:00.000Z", ownerActionId: null,
    }],
    serviceCommitments: [{
      ...base("commitment-sportpaleis", "wbd-owner-confirmed-commitments"), organizationId: "sportpaleis", status: "UNKNOWN", contractedMrr: null, startsAt: null, endsAt: null, renewalReviewAt: null, responsibilities: [{ description: "Structurele scope is nog niet bevestigd.", responsibleParty: "SHARED" }], sourceRefs: ["owner-confirmation"],
    }],
    ownerActions: [
      { ...base("action-bijcees", "wbd-owner-confirmed-actions"), subjectType: "OPPORTUNITY", subjectId: "opportunity-bijcees", title: "Actuele situatie onderzoeken", reasonDonovanNeeded: "Donovan bevestigt de actuele werkelijkheid.", status: "OPEN", priority: "MEDIUM", dueAt: null, completedAt: null, sourceRefs: ["owner-review"] },
      { ...base("action-other", "wbd-owner-confirmed-actions"), subjectType: "ORGANIZATION", subjectId: "we-build-and-design", title: "Andere actie", reasonDonovanNeeded: "Alleen WBD.", status: "OPEN", priority: "LOW", dueAt: null, completedAt: null, sourceRefs: ["owner-review"] },
    ],
    effortObservations: [{ ...base("effort-bijcees", "wbd-owner-confirmed-effort"), organizationId: "bij-cees", serviceCommitmentId: null, timeClass: "SALES", category: "CUSTOMER_CONTACT", minutes: 15, context: "Commerciële voorbereiding", capturedAt: stamp, capturedBy: "owner", status: "ACTIVE", correctionOf: null, voidedAt: null, voidedBy: null, voidReason: null, sourceRefs: ["manual-observation"] }],
    sourceHealth: [
      { sourceId: "wbd-owner-confirmed-organizations", status: "HEALTHY", coverage: "PARTIAL", impact: "MEDIUM", lastKnownGoodAt: stamp },
      { sourceId: "wbd-owner-confirmed-opportunities", status: "UNKNOWN", coverage: "PARTIAL", impact: "HIGH", lastKnownGoodAt: null },
      { sourceId: "wbd-owner-confirmed-commitments", status: "UNKNOWN", coverage: "UNKNOWN", impact: "HIGH", lastKnownGoodAt: null },
      { sourceId: "wbd-owner-confirmed-actions", status: "HEALTHY", coverage: "PARTIAL", impact: "HIGH", lastKnownGoodAt: stamp },
      { sourceId: "wbd-owner-confirmed-effort", status: "UNKNOWN", coverage: "PARTIAL", impact: "MEDIUM", lastKnownGoodAt: null },
    ],
  };
}

test("directory gebruikt uitsluitend centrale Organizations en biedt zoeken en filters", () => {
  const control = controlFixture();
  const html = renderOrganizationDirectory("<header>owner</header>", control);
  for (const item of control.organizations) {
    assert.match(html, new RegExp(item.name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")));
    assert.match(html, new RegExp(`/workspace/wbd/organisaties/${item.id}`));
  }
  assert.match(html, /data-organization-search/u);
  assert.match(html, /data-organization-relationship/u);
  assert.match(html, /data-organization-status/u);
  assert.doesNotMatch(html, /F00248|pilot live|WooCommerce|AquaFlask\.nl/u);
});

test("directory onderscheidt bewezen klantcontext van live Organization-status", () => {
  const atlas = {
    revision: 8,
    capabilityRegistry: [
      { id: "orders", name: "Orderworkflow", maturity: "PROVEN", organizationsWhereProven: ["Sportpaleis"], lastVerified: "2026-08-20" },
      { id: "commerce", name: "Commerce-diagnose", maturity: "REUSABLE", organizationsWhereProven: ["Bij Cees", "AquaFlask"], lastVerified: "2026-07-24" },
      { id: "hypothesis", name: "Onbewezen dienst", maturity: "BUILT", organizationsWhereProven: ["Bij Cees/AquaFlask hypothese"], lastVerified: "2026-08-15" },
    ],
  };
  const html = renderOrganizationDirectory("<header>owner</header>", controlFixture(), atlas);
  for (const name of ["Sportpaleis", "Bij Cees", "AquaFlask"]) assert.match(html, new RegExp(name));
  assert.match(html, /sportpaleis-logo-mail-safe\.png/u);
  assert.match(html, /Niet hetzelfde als live klantstatus/u);
  assert.match(html, /Capability Registry · revisie 8/u);
  assert.doesNotMatch(html, /Onbewezen dienst|gezondheidsscore|actuele omzet/u);
});

test("Organization Context verbindt alleen bestaande canonieke kernrecords", () => {
  const control = controlFixture();
  const bijCees = organizationContext(control, "bij-cees");
  assert.ok(bijCees);
  assert.deepEqual(bijCees.opportunities.map(({ id }) => id), ["opportunity-bijcees"]);
  assert.deepEqual(bijCees.actions.map(({ id }) => id), ["action-bijcees"]);
  assert.deepEqual(bijCees.effort.map(({ id }) => id), ["effort-bijcees"]);
  assert.equal(organizationContext(control, "missing"), null);
});

test("drie Organizations openen eigen context zonder historische of operationele claims", () => {
  const control = controlFixture();
  const wbd = renderOrganizationContext("<header>owner</header>", control, "we-build-and-design", 31);
  const sportpaleis = renderOrganizationContext("<header>owner</header>", control, "sportpaleis", 31);
  const bijCees = renderOrganizationContext("<header>owner</header>", control, "bij-cees", 31);
  assert.match(wbd, /We Build And Design/u);
  assert.match(wbd, /Andere actie/u);
  assert.doesNotMatch(wbd, /Digitale vernieuwing/u);
  assert.match(sportpaleis, /Sport 2000 Sportpaleis B\.V\./u);
  assert.match(sportpaleis, /Gecontracteerde MRR<\/dt><dd>ONBEKEND/u);
  assert.match(sportpaleis, /Responsibility|responsibility/u);
  assert.doesNotMatch(sportpaleis, /pilot live|praktijkgebruik|productieomgeving is gezond/u);
  assert.match(bijCees, /Digitale vernieuwing/u);
  assert.match(bijCees, /Actuele situatie onderzoeken/u);
  assert.match(bijCees, /Sales<\/dt><dd>15 min/u);
  assert.doesNotMatch(bijCees, /Commerce|Growth|geleverd/u);
});

test("ontbrekende context blijft expliciet onbekend en Capabilities blijven WBD-breed", () => {
  const html = renderOrganizationContext("<header>owner</header>", controlFixture(), "sportpaleis", 31);
  assert.match(html, /Huidige fase<\/dt><dd>Niet centraal beschikbaar/u);
  assert.match(html, /ONBEKEND — er zijn geen centrale Effort Observations/u);
  assert.match(html, /geen actieve centrale Service Commitment|Actuele afspraak nog niet volledig bekend/u);
  assert.match(html, /Alleen evidence-backed Organization-relaties/u);
  assert.match(html, /Omgevingen, volledige historische milestones, usage en financiële bronprojecties/u);
  assert.match(html, /Open centrale Capability Registry/u);
});

test("Kansen-projectie bevat alleen canonieke Opportunities", () => {
  const html = renderOpportunityDirectory("<header>owner</header>", controlFixture());
  assert.match(html, /Digitale vernieuwing/u);
  assert.match(html, /Bij Cees/u);
  assert.match(html, /Atlas Candidates en historische ideeën staan hier niet tussen/u);
  assert.doesNotMatch(html, /candidate-store-v1|Commerce Workspace/u);
});

test("Owner-navigatie houdt Today dominant en plaatst secundaire werkgebieden onder Meer", async () => {
  const owner = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  const context = await readFile(new URL("../src/wbd-organization-context.ts", import.meta.url), "utf8");
  const runtime = await readFile(new URL("../scripts/workspace-runtime.mjs", import.meta.url), "utf8");
  assert.match(owner, /Primaire WBD-navigatie[\s\S]*Today[\s\S]*Mail[\s\S]*Search/u);
  assert.match(owner, /Primaire mobiele WBD-navigatie[\s\S]*Today[\s\S]*Attention[\s\S]*Search[\s\S]*Meer/u);
  assert.match(owner, /Mail<small>foundation<\/small>/u);
  assert.match(owner, /Growth<small>niet live<\/small>/u);
  assert.match(owner, /Klanten/u);
  assert.doesNotMatch(owner, /href="\/workspace\/wbd\/mail"/u);
  assert.match(owner, /capabilitiesPath[\s\S]*opportunitiesPath[\s\S]*\/workspace\/experience[\s\S]*workContextPath/u);
  assert.doesNotMatch(owner + context, /localStorage|indexedDB|wbd-dossier-store|wbd-invoices|\/api\/wbd\/v1\/organization-context/u);
  assert.match(runtime, /ownerOrganizationRoute/u);
  assert.match(runtime, /workspaceOpportunities/u);
});
