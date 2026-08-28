import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { rankTeamwearRelationships } from "../src/sportpaleis-teamwear-foundations.ts";
import { createVisualStudioComposition } from "../src/sportpaleis/visual-studio.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "R2-Kevin-2026!", patrick: "R2-Patrick-2026!", collega: "R2-Store-2026!", "donovan-support": "R2-Support-2026!" };
const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "spw-master-creative-r2-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "http://127.0.0.1", uploadsEnabled: true });
  await service.initialize();
  return { root, store, service, admin: await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin }) };
}

test("directe Creative Studio-bron is first-class, immutable en heeft geen catalogusrecord nodig", async (context) => {
  const { service, store, admin } = await fixture(context);
  const created = await service.createVisualComposition(admin.token, admin.csrfToken, {
    concept: "PRODUCT_FOCUS", title: "Bron blijft intact", artDirection: "", articleId: "", assetIds: [], sourceIntent: "PRESERVE_SOURCE",
    sourceFile: { filename: "bijna-goede-uiting.png", mimeType: "image/png", dataBase64: tinyPng.toString("base64") },
  }, "r2-direct-source-1");
  assert.equal(created.value.sourceRef.kind, "UPLOADED_IMAGE");
  assert.equal(created.value.sourceRef.pixelPolicy, "PRESERVE_ORIGINAL");
  assert.equal(created.value.sourceRef.matchedArticleId, null);
  assert.equal(created.value.checks.readyForReview, true);
  assert.equal("sourceDataBase64" in created.value, false);
  const privateSource = await service.visualCompositionSource(admin.token, created.value.id);
  assert.ok(privateSource.bytes.equals(tinyPng));
  assert.equal(privateSource.sha256, created.value.sourceRef.sha256);
  assert.equal(privateSource.cacheControl, "private, no-store");
  const stored = (await store.read()).visualCompositions[0];
  assert.equal(stored.sourceDataBase64, tinyPng.toString("base64"));
  assert.equal("sourceDataBase64" in (await service.bootstrap(admin.token)).visualCompositions[0], false);
});

test("directe bron matcht conservatief op een uniek bekend artikelnummer en bewaart beide provenance-identiteiten", async (context) => {
  const { service, store, admin } = await fixture(context);
  const article = (await store.read()).articles.find(({ active, articleNumber }) => active && String(articleNumber).length >= 4);
  assert.ok(article);
  const created = await service.createVisualComposition(admin.token, admin.csrfToken, {
    concept: "PRODUCT_FOCUS", title: "", artDirection: "", articleId: "", assetIds: [], sourceIntent: "PRODUCT_ONLY",
    sourceFile: { filename: `product-${article.articleNumber}.png`, mimeType: "image/png", dataBase64: tinyPng.toString("base64") },
  }, "r2-direct-source-match");
  assert.equal(created.value.sourceRef.matchedArticleId, article.id);
  assert.equal(created.value.sourceRef.matchConfidence, "HIGH");
  assert.equal(created.value.productRef.articleId, article.id);
  assert.notEqual(created.value.sourceRef.sourceHash, created.value.productRef.sourceHash);
  assert.ok((await store.read()).audit.some(({ details }) => details?.sourceSha256 === created.value.sourceRef.sha256 && details?.articleId === article.id));
});

test("Studio blijft fail-closed zonder catalogusproduct én zonder directe bron", () => {
  assert.throws(() => createVisualStudioComposition({ id: "none", now: new Date().toISOString(), user: { id: "u", name: "U" }, concept: "PRODUCT_FOCUS", title: "", artDirection: "", article: null, uploadedSource: null, assets: [], sources: [] }), (error) => error.code === "VISUAL_SOURCE_REQUIRED");
});

test("Teamwear-context zoekt, rangschikt en dedupliceert zonder interne IDs in de medewerkerkeuze", () => {
  const contexts = [
    { id: "order:1", kind: "ORGANIZATION", name: "SC Buitenboys", subtitle: "Klant", email: null, phone: null, roles: [], associationName: "SC Buitenboys", searchableTerms: "order 1" },
    { id: "association:buitenboys", kind: "ASSOCIATION", name: "SC Buitenboys", subtitle: "Vereniging", email: null, phone: null, roles: [], associationName: "SC Buitenboys", searchableTerms: "Spain short" },
    { id: "association:waterwijk", kind: "ASSOCIATION", name: "ASC Waterwijk", subtitle: "Vereniging", email: null, phone: null, roles: [], associationName: "ASC Waterwijk", searchableTerms: "waterwijk almere" },
  ];
  const buitenboys = rankTeamwearRelationships(contexts, "buitenboys", 8);
  assert.equal(buitenboys.length, 1);
  assert.equal(buitenboys[0].id, "association:buitenboys");
  assert.equal(rankTeamwearRelationships(contexts, "waterwijk", 8)[0].name, "ASC Waterwijk");
});

test("HA-01 en HA-02 zijn zichtbaar als first-class input en intention-first context, niet als ruwe formulieren", async () => {
  const workspace = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const teamwear = await readFile(new URL("../src/sportpaleis-teamkit-workspace.ts", import.meta.url), "utf8");
  assert.match(workspace, /Plak, sleep of kies een beeld/u);
  assert.match(workspace, /addEventListener\("paste"/u);
  assert.match(workspace, /addEventListener\("drop"/u);
  assert.match(workspace, /Een catalogusrecord is handig, maar nooit verplicht/u);
  assert.match(teamwear, /Voor wie maken we dit\?/u);
  assert.match(teamwear, /data-teamwear-context-search/u);
  assert.doesNotMatch(teamwear, /<select name="contextId"/u);
  assert.match(teamwear, /Alleen indien nodig: team, contact of planning/u);
});

test("Creative Studio-input wijzigt Teamwear-productiegeometrie niet", async () => {
  const visual = await readFile(new URL("../src/sportpaleis/visual-studio.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(visual, /widthMm|heightMm|productionPlacement|foilColor/u);
  const teamwear = await readFile(new URL("../src/sportpaleis-teamkit-workspace.ts", import.meta.url), "utf8");
  assert.match(teamwear, /placementPhysicalWidthMm/u);
  assert.match(teamwear, /placementPhysicalHeightMm/u);
});
