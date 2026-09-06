import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Productie toont fysieke batches en houdt technische PlotJob-identiteit in historie", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /Nu maken/u);
  assert.match(source, /\+ Bekijk wat meegaat/u);
  assert.match(source, /Plot-\/printhistorie/u);
  assert.match(source, /Een voorstel of productiebestand rondt een kleur nooit af; alleen Bedrukt doet dat/u);
  assert.match(source, /BATCH AFGEROND/u);
  assert.match(source, /select-completed-batch-orders/u);
  assert.match(source, /Eerder productiewerk/u);
  assert.match(source, /data-action="production-filter" data-filter="attention"[^]*?statusCounts\.attention/u);
  const primary = source.slice(source.indexOf("const persistedGroupCards"), source.indexOf("const productionSearchOrders"));
  assert.doesNotMatch(primary, /<strong>\$\{esc\(job\.jobNumber\)\}<\/strong>/u, "technisch PlotJob-nummer domineert de primaire fysieke werkkaart niet");
  assert.match(primary, /<small>\$\{esc\(job\.jobNumber\)\}/u, "de immutable jobidentity blijft als secundair detail zichtbaar");
});

test("Winkel en Search ondersteunen dagelijkse afhaal- en Vandaag-flow", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /data-pickup-order-search/u);
  assert.match(source, /data-operation="PICKED_UP"/u);
  assert.match(source, /Kleding opgehaald/u);
  assert.match(source, /data-search-today/u);
  assert.match(source, /nieuwe orders/u);
  assert.match(source, /klaar om op te halen/u);
});

test("rolpreview gebruikt echte role-state maar blokkeert mutaties", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /function rolePreviewState/u);
  assert.match(source, /activeRolePreview \? rolePreviewState/u);
  assert.match(source, /data-action="enter-role-preview"/u);
  assert.match(source, /data-action="exit-role-preview"/u);
  assert.match(source, /Preview: deze wijzigende actie is niet uitgevoerd/u);
  assert.match(source, /Preview: deze wijziging is niet opgeslagen/u);
});

test("tussenvoegsel gebruikt één KvdA-compositie en uitsluitend het actuele fysieke contract", async () => {
  const client = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  const server = await readFile(new URL("../scripts/sportpaleis-pilot-foundation.mjs", import.meta.url), "utf8");
  assert.match(client, /const compositeText = `\$\{characters\[0\]\}\$\{infix\}\$\{characters\[1\]\}`/u);
  assert.doesNotMatch(client, /name="initialsInfixHorizontalSpacingMm"/u);
  assert.doesNotMatch(client, /name="initialsInfixBaselineOffsetMm"/u);
  assert.match(client, /Workspace gebruikt standaard 20 mm\. De samenstelling wordt automatisch gecentreerd/u);
  assert.match(server, /horizontalSpacingMm: rule\?\.horizontalSpacingMm/u);
  assert.match(server, /baselineOffsetMm: rule\?\.baselineOffsetMm/u);
  const derivation = server.slice(server.indexOf("function deriveCatalogProductionLines"), server.indexOf("function normalizeStoredOrder"));
  assert.doesNotMatch(derivation, /verticalOffsetMm/u);
});

test("Beheer en sync gebruiken progressive disclosure en menselijke besluiten", async () => {
  const source = await readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /ARTIKELEN & PRODUCTIEREGELS/u);
  assert.match(source, /Organisatie → vereniging → artikel → expliciete orderafwijking/u);
  assert.match(source, /\+ Websitegegevens en technische bron/u);
  assert.match(source, /Bedrukprijzen/u);
  assert.match(source, /Toevoegen aan Workspace/u);
  assert.match(source, /Niet gebruiken/u);
  assert.match(source, /Huidige behouden/u);
  assert.match(source, /sp-sync-review__image/u);
});
