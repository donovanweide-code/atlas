import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const caseSourceUrl = new URL("../src/sportpaleis-practice-case.ts", import.meta.url);
const pageSourceUrl = new URL("../src/experience-pages.ts", import.meta.url);
const sitemapUrl = new URL("../public/sitemap.xml", import.meta.url);
const htaccessUrl = new URL("../public/.htaccess", import.meta.url);

test("de publieke Sportpaleis-praktijkcase heeft één begrensde route en ingang", async () => {
  const [caseSource, pageSource, sitemap, htaccess] = await Promise.all([
    readFile(caseSourceUrl, "utf8"),
    readFile(pageSourceUrl, "utf8"),
    readFile(sitemapUrl, "utf8"),
    readFile(htaccessUrl, "utf8"),
  ]);

  assert.match(pageSource, /href="\/projecten\/sportpaleis"/);
  assert.match(pageSource, /path === "\/projecten\/sportpaleis"/);
  assert.match(sitemap, /<loc>https:\/\/webuildanddesign\.nl\/projecten\/sportpaleis<\/loc>/);
  assert.match(htaccess, /RewriteRule \^projecten\/sportpaleis\/\?\$ index\.html \[L\]/);
  assert.match(caseSource, /Van papier naar één werkwijze\./);
  assert.match(caseSource, /Ontbrekende informatie blijft zichtbaar\./);
  assert.match(caseSource, /<details class="sp-case-detail">/);
  assert.match(caseSource, /sportpaleis-formulier-before-v1\.png/);
  assert.match(caseSource, /sportpaleis-workspace-overview-public-v1\.png/);
  assert.match(caseSource, /sportpaleis-workspace-roles-public-v1\.png/);
  assert.match(caseSource, /sportpaleis-workspace-attention-public-v1\.png/);
  assert.doesNotMatch(caseSource, /data-case-asset="missing"|wordt hier geplaatst/);
});

test("de inhoudelijke verdieping blijft achter vijf gerichte uitklappers", async () => {
  const caseSource = await readFile(caseSourceUrl, "utf8");
  const questions = [
    "Waarom niet gewoon een digitaal formulier?",
    "Wat weet de Workspace?",
    "Wat gebeurt er na de order?",
    "Hoe groot was de verandering?",
    "Wat zit er onder wat je ziet?",
  ];

  for (const question of questions) assert.match(caseSource, new RegExp(question.replace(/[?]/g, "\\?")));
  assert.match(caseSource, /Dit was pas het begin\./);
  assert.match(caseSource, /Werk blijft zichtbaar\./);
  assert.match(caseSource, /Historie en traceerbaarheid/);
  assert.match(caseSource, /Samenwerken met meerdere gebruikers/);
});

test("de publieke casecopy bevat geen klantinterne operationele voorbeelden", async () => {
  const caseSource = await readFile(caseSourceUrl, "utf8");

  assert.doesNotMatch(
    caseSource,
    /(?:SP-\d{4}|SPW-[A-Z0-9-]+|@example\.|kevin|patrick|rugnummer\s*\d|shortnummer\s*\d|credentials?|TransIP)/i,
  );
  assert.doesNotMatch(caseSource, /\b\d+(?:[.,]\d+)?%\b/);
  assert.doesNotMatch(caseSource, /(?:\bIllustrator\b|\bWinPlot\b|\bSumma\b|\bsnijplotter\b|SP-2026|SNijtest|@sportpaleis\.nl|\bKevin\b|\bPatrick\b|\bMila\b|\bWouters\b|\bWaterwijk\b|\bAlmere\b)/i);
});
