import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FRONT_NAME_ARTICLE_TRUTH, FRONT_NAME_DECORATION, frontNameTruthForArticle, normalizeFrontName } from "../src/sportpaleis/front-name-production-truth.mjs";

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

test("verified article truth is preserved while uncertain font and catalog conflict fail closed", () => {
  assert.equal(frontNameTruthForArticle("142136").fontProfile, "Arial Regular");
  assert.equal(frontNameTruthForArticle("142136").fontAssetStatus, "DATA_GAP");
  assert.equal(frontNameTruthForArticle("116388").fontProfile, "FFF englisch");
  assert.equal(frontNameTruthForArticle("116386").applicability, "VERIFIED");
  assert.equal(frontNameTruthForArticle("135702").fontProfile, null);
  assert.equal(frontNameTruthForArticle("138505").applicability, "CATALOG_CONFLICT");
  assert.equal(FRONT_NAME_ARTICLE_TRUTH.length, 5);
  assert.ok(FRONT_NAME_ARTICLE_TRUTH.every(({ fontAssetStatus }) => fontAssetStatus === "DATA_GAP"));
});
