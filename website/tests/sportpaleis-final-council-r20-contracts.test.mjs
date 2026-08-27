import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildTeamwearComposition,
  buildTeamwearCatalog,
  queryTeamwearCatalog,
  teamwearTeamorderHandoff,
} from "../src/sportpaleis-teamwear-foundations.ts";
import { normalizeProposalItems } from "../src/sportpaleis/teamkit-proposals.mjs";

const workspaceSource = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
const teamwearExperienceSource = await readFile(new URL("../src/sportpaleis-teamkit-experience.ts", import.meta.url), "utf8");
const serviceSource = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
const proposalSource = await readFile(new URL("../src/sportpaleis/teamkit-proposals.mjs", import.meta.url), "utf8");

test("Teamwear reviewcatalogus blijft aantoonbaar reviewdata en kan niet als bestelbare Product Truth doorgaan", () => {
  const catalog = buildTeamwearCatalog({ articles: [] });
  assert.ok(catalog.length > 0);
  assert.ok(catalog.every(({ sourceStatus }) => sourceStatus === "CONTROLLED_FIXTURE"));
  assert.ok(catalog.every(({ variants }) => variants.every(({ sourceArticleId }) => sourceArticleId === "")));
  assert.equal(queryTeamwearCatalog(catalog, { query: "BV6708" }).products.length, 1);

  assert.match(teamwearExperienceSource, /product\.sourceStatus !== "AUTHORITATIVE" \|\| !variant\.sourceArticleId/u);
  assert.match(teamwearExperienceSource, /Nog niet bestelbaar/u);
  assert.doesNotMatch(teamwearExperienceSource, /replaceAll\("Reviewdata",\s*"Beschikbaar"\)/u);
});

test("Teamwear bewaart collectiecontext en maakt personen, maten, aantallen en personalisatie expliciet in de bestaande Teamorder-handoff", () => {
  const proposal = {
    id: "proposal-r20",
    proposalNumber: "TKV-2026-0020",
    team: "JO17",
    association: { id: "asc-waterwijk", name: "A.S.C. Waterwijk" },
    customer: { name: "A.S.C. Waterwijk", email: "", phone: "" },
    items: [
      { id: "shirt", articleId: "sp-live-137294", sizes: ["M", "L"], quantity: 18 },
      { id: "short", articleId: "sp-live-140294", sizes: ["M"], quantity: 18 },
    ],
  };
  const handoff = teamwearTeamorderHandoff(proposal);
  assert.equal(handoff.existingRoute, "/workspace/sportpaleis/orders/team");
  assert.equal(handoff.proposalId, proposal.id);
  assert.deepEqual(handoff.articleIds, ["sp-live-137294", "sp-live-140294"]);
  assert.deepEqual(handoff.missing, ["personen", "maten", "aantallen", "individuele personalisatie"]);
  assert.match(teamwearExperienceSource, /name="itemQuantity" value="\$\{item\.quantity \?\? ""\}"/u);
  assert.match(teamwearExperienceSource, /name="itemSizes" value="\$\{esc\(item\.sizes\.join\(", "\)\)\}"/u);
  assert.match(workspaceSource, /data-teamwear-sizing-form data-proposal-id="\$\{esc\(proposal\.id\)\}"/u);
  assert.match(workspaceSource, /data-teamwear-size-quantity/u);
  assert.match(serviceSource, /\/production-sizing/u);
});

test("Teamwear opent naam en rugnummer deterministisch op de achterzijde", () => {
  assert.match(teamwearExperienceSource, /return \["BACK_NUMBER", "NAME"\]\.includes\(kind\) \? "BACK" : activeSide/u);
  assert.match(teamwearExperienceSource, /const side = defaultTeamwearPlacementSide\(input\.kind, activeSide \?\? "FRONT"\)/u);
  assert.match(teamwearExperienceSource, /view\.hidden = view\.dataset\.studioView !== side/u);
});

test("Teamwear fulfillment heeft één atomair en idempotent overgangspad naar WorkspaceOrder", () => {
  assert.match(serviceSource, /Een TK-order wordt uitsluitend atomair via ‘Interne productie klaarzetten’ gekoppeld\./u);
  assert.match(serviceSource, /code: "TEAMKIT_ORDER_LINK_MANAGED"/u);
  assert.match(serviceSource, /const deterministicKey = `teamkit-order:\$\{proposal\.id\}:\$\{revision\.number\}:\$\{item\.id\}`/u);
  assert.match(serviceSource, /teamkitContext\?\.idempotencyKey === deterministicKey/u);
  assert.match(serviceSource, /idempotent\(state, deterministicKey, "system:teamkit", "CREATE_TEAMKIT_ORDER"/u);
  assert.match(serviceSource, /plotJobCreated: false/u);
});

test("Teamwear leidt nooit naar maten vóór het voorstel expliciet is goedgekeurd", () => {
  assert.match(teamwearExperienceSource, /step\(4, "Voorstel & akkoord", "#klantpreview", approved, hasDesign && !approved\)/u);
  assert.match(teamwearExperienceSource, /step\(5, "Maten & aantallen"[^\n]+Boolean\(approved && !hasSizing\)\)/u);
  assert.match(teamwearExperienceSource, /if \(sizingShortcut && proposal && !proposal\.approval\)/u);
  assert.match(teamwearExperienceSource, /sizingShortcut\.textContent = "Voorstel controleren →"/u);
});

test("Guided Setup stuurt een concrete gap naar het juiste beheerdoel en maakt placement/mirror geen pseudo-actie", () => {
  assert.match(workspaceSource, /validation\.font === "DATA_GAP" \? "lettertype\/nummerbron"/u);
  assert.match(workspaceSource, /validation\.size === "DATA_GAP" \? "fysieke maat"/u);
  assert.match(workspaceSource, /validation\.foilColor === "DATA_GAP" \? "foliekleur"/u);
  assert.match(workspaceSource, /validation\.cutContour === "DATA_GAP" \? "gecontroleerde snijlijnen"/u);
  assert.match(workspaceSource, /validation\.physicalCutOutput === "DATA_GAP" \? "bewezen fysieke snijoutput"/u);
  assert.match(workspaceSource, /gecontroleerde bron voor \$\{sourceProfile\.fontProfile\}/u);
  assert.match(workspaceSource, /beheer\/productieprofielen\?vereniging=\$\{encodeURIComponent\(association\.name\)\}/u);
  assert.match(workspaceSource, /beheer\/verenigingen\?vereniging=\$\{encodeURIComponent\(association\.name\)\}/u);
  assert.match(workspaceSource, /Workspace past plaatsing en spiegeling automatisch toe/u);

  const gapProjection = workspaceSource.slice(
    workspaceSource.indexOf("const profileActions"),
    workspaceSource.indexOf("const groups ="),
  );
  assert.doesNotMatch(gapProjection, /validation\.placement|validation\.mirror/u);
  assert.match(workspaceSource, /<span>Vereniging<\/span><span>Actie<\/span><span>Compleetheid<\/span>/u);
});

test("Bibliotheek-IA scheidt actieve controle, ingerichte assets en technisch beheer van de visuele assettaak", () => {
  const toolbarStart = workspaceSource.indexOf("const toolbar = `<section class=\"sp-asset-library-toolbar\"");
  assert.ok(toolbarStart > 0);
  const toolbarEnd = workspaceSource.indexOf("function productionProposal", toolbarStart);
  const library = workspaceSource.slice(toolbarStart, toolbarEnd);
  const review = library.indexOf("Nog controleren");
  const ready = library.indexOf("Ingericht");
  const all = library.indexOf("Alles");
  assert.ok(review >= 0 && review < ready && ready < all, "de primaire bibliotheekstatussen staan in taakvolgorde");
  assert.match(workspaceSource, /data-managed-asset-state="\$\{review \? "review" : "ready"\}"/u);
  assert.match(workspaceSource, /production-assets\/\$\{encodeURIComponent\(asset\.id\)\}\/numbers\/34\.svg/u);
  assert.match(workspaceSource, /Voorraad en geavanceerd beheer/u);
  assert.doesNotMatch(library, /teamwear-review-fixtures|fixture-Nike|fixture-adidas/u);
});

test("Studio WOW gate versnelt een veilige eerste opzet zonder een productieoverride te verzinnen", () => {
  assert.match(teamwearExperienceSource, /data-action="studio-first-draft"/u);
  assert.match(teamwearExperienceSource, /association-logo:\$\{association\.id\}:\$\{association\.workspaceLogo\.sha256\}/u);
  assert.match(teamwearExperienceSource, /name="placementColor" value=""/u);
  assert.doesNotMatch(teamwearExperienceSource, /name="placementColor" value="#ffffff"/u);
  assert.match(teamwearExperienceSource, /data-action="studio-toggle-add"/u);
  assert.match(teamwearExperienceSource, /querySelectorAll<HTMLButtonElement>\("\[data-action='studio-toggle-add'\]"\)[\s\S]*aria-expanded/u);
  assert.match(teamwearExperienceSource, /const cancel = \(cancelEvent: PointerEvent\)[\s\S]*placementVisualX[\s\S]*originX/u);
  assert.match(teamwearExperienceSource, /window\.onbeforeunload/u);
});

test("semantische garmentzone en exacte approved geometrie blijven afzonderlijk dezelfde compositiewaarheid", () => {
  const [item] = normalizeProposalItems([{ id: "shirt", productName: "Wedstrijdshirt", color: "Zwart", placements: [{ id: "logo", kind: "CLUB_LOGO", label: "Clublogo", side: "FRONT", preset: "LINKERBORST", sourceId: "source-logo", productionAssetId: null, widthPercent: 23, visualPosition: { coordinateSpace: "GARMENT_PRINT_AREA_V1", xPercent: 41.25, yPercent: 32.5 }, route: "NOG_TE_BEPALEN" }] }]);
  assert.equal(item.placements[0].preset, "CHEST_LEFT", "legacy data normaliseert naar de gedeelde semantische zone");
  assert.deepEqual(item.placements[0].visualPosition, { coordinateSpace: "GARMENT_PRINT_AREA_V1", xPercent: 41.25, yPercent: 32.5 }, "exacte goedgekeurde geometrie blijft behouden");
  const composition = buildTeamwearComposition({ id: "proposal-zone", proposalNumber: "TKV-ZONE", currentRevision: 1, items: [item] });
  assert.equal(composition.items[0].placements[0].production.preset, "CHEST_LEFT");
  assert.equal(composition.items[0].placements[0].visual.xPercent, 41.25);
  assert.equal(composition.items[0].placements[0].visual.yPercent, 32.5);
  assert.match(teamwearExperienceSource, /BACK_UPPER[\s\S]*BACK_LOWER[\s\S]*FRONT_CENTER_LARGE[\s\S]*CHEST_LEFT[\s\S]*CHEST_RIGHT/u);
  assert.match(teamwearExperienceSource, /De zone zet een slimme startpositie; slepen en schalen blijft vrij\./u);
});

test("Studio-savefout bewaart de huidige DOM-invoer en klantpreview gebruikt de revision-bronbeelden", () => {
  const editorHandler = workspaceSource.slice(workspaceSource.indexOf('if (form.matches("[data-teamkit-editor-form]"))'), workspaceSource.indexOf('if (form.matches("[data-teamwear-sizing-form]"))'));
  assert.match(editorHandler, /Je ontwerp staat nog klaar/u);
  assert.doesNotMatch(editorHandler, /catch\([^)]*\)[\s\S]*render\(/u);
  assert.match(proposalSource, /visualGarmentSources[\s\S]*dataUri/u);
  assert.match(proposalSource, /placement\.visualSource\?\.dataUri/u);
  assert.match(proposalSource, /renderProposalPreview\(revision\.snapshot, \{ customer: true \}\)/u);
});
