import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FRONT_NAME_ARTICLE_TRUTH, FRONT_NAME_DECORATION, OWNER_SUPPLIED_FONT_EVIDENCE, UDA_FRONT_NAME_TRUTH, frontNameTruthForArticle, normalizeFrontName } from "../src/sportpaleis/front-name-production-truth.mjs";

test("full Workspace Candidate keeps natural navigation in an explicit read-only boundary", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const api = await readFile(new URL("../src/sportpaleis/pilot-api.ts", import.meta.url), "utf8");
  assert.match(workspace, /reviews\/full-workspace/u);
  assert.match(workspace, /current === FULL_WORKSPACE_REVIEW_ROUTE[\s\S]*state\.capabilities\.reviewMode/u);
  assert.match(workspace, /candidateHref\(href\)/u);
  assert.match(workspace, /full-workspace-r3/u);
  assert.match(api, /CANDIDATE_READ_ONLY/u);
  assert.match(api, /full-workspace-r3/u);
});

test("Naamopdruk voorkant is exactly 20 mm and uppercase", () => {
  assert.equal(FRONT_NAME_DECORATION.label, "Naamopdruk (voorkant)");
  assert.equal(FRONT_NAME_DECORATION.placement, "FRONT");
  assert.equal(FRONT_NAME_DECORATION.physicalHeightMm, 20);
  assert.equal(FRONT_NAME_DECORATION.textTransform, "UPPERCASE");
  assert.equal(normalizeFrontName("  Van der Meer  "), "VAN DER MEER");
});

test("exact Human correction keeps 138505 with Pioneers and never materializes it as UDA", () => {
  assert.equal(frontNameTruthForArticle("142136").fontProfile, "Arial Regular");
  assert.equal(frontNameTruthForArticle("142136").fontAssetStatus, "IDENTITY_VERIFIED_INGEST_BLOCKED");
  assert.equal(frontNameTruthForArticle("116388").fontProfile, "FFF englisch");
  assert.equal(frontNameTruthForArticle("116386").applicability, "VERIFIED");
  assert.equal(frontNameTruthForArticle("138505").association, "Almere Pioneers");
  assert.equal(frontNameTruthForArticle("138505").fontProfile, "FFF englisch");
  assert.equal(FRONT_NAME_ARTICLE_TRUTH.length, 4);
  assert.equal(FRONT_NAME_ARTICLE_TRUTH.some(({ association }) => /UDA|United Dance/iu.test(association)), false);
});

test("UDA webshop truth is association-scoped, front-only and retains EUR 6.50 without inventing an article", () => {
  assert.equal(UDA_FRONT_NAME_TRUTH.webshopLabel, "Naam opdruk");
  assert.equal(UDA_FRONT_NAME_TRUTH.operationalDecorationId, "frontName");
  assert.equal(UDA_FRONT_NAME_TRUTH.customerSurchargeEur, 6.5);
  assert.equal(UDA_FRONT_NAME_TRUTH.articleNumber, null);
  assert.equal(UDA_FRONT_NAME_TRUTH.fontProfile, null);
});

test("Workspace exposes corrected UDA and article truth without mutating catalog history", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(workspace, /UDA_FRONT_NAME_TRUTH\.customerSurchargeEur/u);
  assert.match(workspace, /UDA_FRONT_NAME_TRUTH\.attention/u);
  assert.doesNotMatch(workspace, /138505[^\n]{0,160}UDA|UDA[^\n]{0,160}138505/iu);
});

test("owner font evidence records exact internal identities and remains fail-closed for ingest/profile matching", () => {
  assert.deepEqual(
    [OWNER_SUPPLIED_FONT_EVIDENCE.arialRegular.familyName, OWNER_SUPPLIED_FONT_EVIDENCE.arialRegular.subfamilyName, OWNER_SUPPLIED_FONT_EVIDENCE.arialRegular.postscriptName],
    ["Arial", "Regular", "ArialMT"],
  );
  assert.equal(OWNER_SUPPLIED_FONT_EVIDENCE.arialRegular.contractValidation, "TECHNICALLY_VALID");
  assert.equal(OWNER_SUPPLIED_FONT_EVIDENCE.arialRegular.ingestStatus, "BLOCKED_CANDIDATE_READ_ONLY");
  assert.equal(OWNER_SUPPLIED_FONT_EVIDENCE.spain.fullName, "Spain Euro 2016 Regular");
  assert.equal(OWNER_SUPPLIED_FONT_EVIDENCE.spain.postscriptName, "SpainEuro-Regular");
  assert.equal(OWNER_SUPPLIED_FONT_EVIDENCE.spain.profileMatchStatus, "NOT_PROVEN");
});
