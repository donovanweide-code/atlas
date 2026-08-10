import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  currentWorkstream,
  developmentHistory,
  firstDevelopmentPartner,
  horizonItems,
  infrastructureItems,
  workspaceInsights,
  wbdProjects,
} from "../src/wbd-foundation-data.ts";
import { atlasDailyBrief } from "../src/atlas-daily-brief.ts";

test("sluit 001A officieel als GO af zonder toekomstige automatisering toe te voegen", () => {
  const project = wbdProjects.find(({ id }) => id === "001A");
  assert.equal(project?.phase, "GO / Afgerond");
  assert.equal(project?.roadmapState, "Afgerond");
  assert.match(project?.latestMilestone ?? "", /F00248/);
  for (const result of ["factuursjabloon", "btwberekeningen", "Conceptopslag", "server-side vergrendeling", "PDF openen, downloaden en printen"]) {
    assert.match(project?.result?.join(" ") ?? "", new RegExp(result, "i"));
  }
  assert.match(project?.nextValidatedStep ?? "", /alleen regressieherstel/i);
});

test("registreert Sportpaleis uitsluitend met bevestigde ontwikkelpartnercontext", () => {
  assert.equal(firstDevelopmentPartner.name, "Sport 2000 Sportpaleis B.V.");
  assert.equal(firstDevelopmentPartner.role, "Eerste officiële ontwikkelpartner");
  assert.equal(firstDevelopmentPartner.status, "Actief");
  assert.equal(firstDevelopmentPartner.practiceContext, "Sportpaleis Workspace en bedrukkingsmodule");
  assert.equal(Object.hasOwn(firstDevelopmentPartner, "activeWorkflow"), false);
  assert.match(firstDevelopmentPartner.relationship, /geen eigenaar/i);
  assert.equal(Object.hasOwn(firstDevelopmentPartner, "contactPerson"), false);
  assert.equal(Object.hasOwn(firstDevelopmentPartner, "address"), false);
});

test("sluit 001B en de sync af en houdt Project 002 achter Experience Polish", () => {
  assert.deepEqual(wbdProjects.map(({ id, roadmapState }) => [id, roadmapState]), [["001A", "Afgerond"], ["001B", "Afgerond"], ["002", "Hierna"]]);
  const project001b = wbdProjects.find(({ id }) => id === "001B");
  const project002 = wbdProjects.find(({ id }) => id === "002");
  assert.equal(project001b?.phase, "GO / Afgerond");
  assert.match(project001b?.nextValidatedStep ?? "", /alleen regressieherstel/i);
  assert.equal(project002?.attentionState, "Wacht op bevestiging");
  assert.match(project002?.phase ?? "", /na Experience Polish/i);
  assert.equal(currentWorkstream.title, "Experience Polish");
  assert.equal(currentWorkstream.phase, "Actieve werkstroom");
  assert.match(currentWorkstream.boundaries, /Geen herontwerp vanaf nul.*geen inhoudelijke start van Project 002/i);
  for (const title of ["WBD-website live", "Eerste officiële ontwikkelpartner", "Start bedrukkingsmodule", "Project 001A afgerond", "Factuur F00248 definitief", "Project 001B afgerond", "Atlas Workspace Sync afgerond", "Experience Polish"]) {
    assert.ok(developmentHistory.some((item) => item.title === title));
  }
  for (const subject of ["Knab", "betaalherkenning", "boekhouder", "financiële automatisering", "Dossier Experience"]) {
    assert.ok(horizonItems.some((item) => new RegExp(subject, "i").test(item)));
  }
});

test("legt de modulevorm en commerciële prijsgrens vast zonder prijzen te bepalen", () => {
  const insights = workspaceInsights.join(" ");
  assert.match(insights, /centrale interne werkplek/i);
  assert.match(insights, /factuurworkflow.*eerste praktisch gebruikte Workspace-module/i);
  assert.match(insights, /Modules.*werkvorm.*connectoren.*externe systemen/i);
  assert.match(insights, /afzonderlijk commercieel/i);
  assert.match(insights, /Ontwikkelpartnerprijzen.*niet automatisch marktprijzen/i);
  assert.match(insights, /Value & Pricing Framework/i);
});

test("houdt de sync afgesloten en maakt Project 001C actief zonder Project 002 te starten", () => {
  assert.equal(atlasDailyBrief.reviewedAt, "2026-08-05");
  assert.match(atlasDailyBrief.statusLabel, /PROJECT 001C · ACTIEF/);
  assert.match(atlasDailyBrief.title, /Experience Polish/);
  assert.match(atlasDailyBrief.subtitle, /publieke en interne omgevingen/i);
  assert.match(atlasDailyBrief.focus.nextStep, /één kandidaat/i);
  for (const fact of ["001A", "001B", "F00248", "Sport 2000 Sportpaleis B.V."]) {
    assert.match(atlasDailyBrief.why.join(" "), new RegExp(fact.replaceAll(".", "\\.")));
  }
});

test("houdt infrastructuur voorbereid zonder connectors of monitoring te bouwen", () => {
  assert.ok(infrastructureItems.some(({ label, status }) => label === "Workspace" && status === "Lokaal actief"));
  assert.ok(infrastructureItems.some(({ label, status }) => label === "Toekomstige hosting" && status === "TransIP"));
  assert.ok(infrastructureItems.some(({ label, status }) => label === "Back-ups, SSL en domeinen" && /Project 002/.test(status)));
});

test("routeert 001B in de bestaande shell en gebruikt facturen als financiële bron", async () => {
  const [workspace, foundation, atlasWorkspace, api, vite] = await Promise.all([
    readFile(new URL("../src/wbd-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-foundation.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/atlas-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../scripts/wbd-workspace-foundation-api.mjs", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);
  assert.match(workspace, /renderWbdFoundation\(app\)/);
  for (const route of ["ontwikkelpartners", "ontwikkeling/monitor", "ontwikkeling/historie", "ontwikkeling/feedback", "business-foundation/finance", "business-foundation/finance/inkomende-facturen", "infrastructuur"]) {
    assert.match(foundation, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(foundation, /invoiceApi}\/sent/);
  assert.match(foundation, /invoiceApi}\/concepts/);
  assert.match(foundation, /data-payment-status/);
  assert.match(foundation, /Sport 2000 Sportpaleis B\.V\./);
  assert.match(foundation, /workspaceInsights/);
  assert.match(atlasWorkspace, /wbdProjects/);
  assert.match(atlasWorkspace, /Workspace Sync · GO \/ Afgerond/);
  assert.match(atlasWorkspace, /currentWorkstream/);
  for (const field of ["organization", "project", "component", "date", "status", "follow_up_decision"]) {
    assert.match(api, new RegExp(field));
  }
  assert.match(vite, /createWbdWorkspaceFoundationMiddleware/);
  assert.doesNotMatch(api, /smtp|imap|knab|transip/i);
});
