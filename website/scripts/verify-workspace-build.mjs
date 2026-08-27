import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SPORTPALEIS_ASSOCIATION_LOGOS } from "../config/sportpaleis-association-logos.generated.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const outputRoot = path.resolve(scriptDirectory, "../dist-workspace");

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(absolute) : [absolute];
  }));
  return nested.flat();
}

function fail(message) {
  throw new Error(`Workspace build boundary failed: ${message}`);
}

const files = await filesBelow(outputRoot);
const htmlPath = path.join(outputRoot, "workspace.html");
if (!files.includes(htmlPath)) fail("workspace.html ontbreekt");
const workspaceHtml = await readFile(htmlPath, "utf8");
for (const required of [
  "<title>Capabilities",
  'rel="icon" type="image/svg+xml" href="/wbd-owner-icon.svg"',
]) {
  if (!workspaceHtml.includes(required)) fail(`WBD-owner identiteitsmarker ontbreekt: ${required}`);
}
const workspaceEntryMatch = workspaceHtml.match(/<script[^>]+src="([^"]+\.js)"/u);
if (!workspaceEntryMatch) fail("WBD-owner bundleverwijzing ontbreekt");
const workspaceEntryPath = path.join(outputRoot, workspaceEntryMatch[1].replace(/^\/+/, ""));
if (!files.includes(workspaceEntryPath)) fail("WBD-owner bundle ontbreekt");
const workspaceEntry = await readFile(workspaceEntryPath, "utf8");
const sportpaleisHtmlPath = path.join(outputRoot, "sportpaleis.html");
if (!files.includes(sportpaleisHtmlPath)) fail("sportpaleis.html ontbreekt");
const sportpaleisHtml = await readFile(sportpaleisHtmlPath, "utf8");
for (const required of [
  "<title>Sportpaleis Workspace</title>",
  'rel="icon" type="image/svg+xml" href="/sportpaleis-pwa-icon.svg"',
  'rel="manifest" href="/sportpaleis.webmanifest"',
]) {
  if (!sportpaleisHtml.includes(required)) fail(`Sportpaleis-identiteitsmarker ontbreekt: ${required}`);
}
if (sportpaleisHtml.includes("WBD Workspace")) fail("Sportpaleis-entrypoint bevat WBD-identiteit");
const robotsPath = path.join(outputRoot, "robots.txt");
if (!files.includes(robotsPath)) fail("Workspace-specifieke robots.txt ontbreekt");
if ((await readFile(robotsPath, "utf8")).replaceAll("\r\n", "\n").trim() !== "User-agent: *\nDisallow: /") fail("Workspace robots.txt moet alle crawling blokkeren");
if (files.some((file) => path.basename(file).toLowerCase() === "sitemap.xml")) fail("Workspace-release mag geen publieke sitemap bevatten");
if (files.some((file) => file.endsWith(".map"))) fail("source maps horen niet in het runtimeartefact");
const serviceWorkerPath = path.join(outputRoot, "sportpaleis-sw.js");
if (!files.includes(serviceWorkerPath)) fail("Sportpaleis service worker ontbreekt");
if (!(await readFile(serviceWorkerPath, "utf8")).includes("self.addEventListener")) fail("Sportpaleis service worker bevat geen registratiehandlers");
const wbdServiceWorkerPath = path.join(outputRoot, "wbd-owner-sw.js");
if (!files.includes(wbdServiceWorkerPath)) fail("WBD Owner service worker ontbreekt");
const wbdServiceWorker = await readFile(wbdServiceWorkerPath, "utf8");
if (!wbdServiceWorker.includes('addEventListener("push"') || !wbdServiceWorker.includes("showNotification")) fail("WBD Owner pushhandlers ontbreken");
if (!files.includes(path.join(outputRoot, "wbd-owner.webmanifest"))) fail("WBD Owner webmanifest ontbreekt");
const rasterFiles = files.filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file));
const associationLogoRoot = path.join(outputRoot, "assets", "organizations", "sportpaleis", "association-logos");
const associationLogoPaths = new Map(Object.values(SPORTPALEIS_ASSOCIATION_LOGOS).map((logo) => [path.join(associationLogoRoot, logo.filename), logo]));
const brandLogoPath = path.join(outputRoot, "assets", "organizations", "sportpaleis", "brand-006", "sportpaleis-logo-mail-safe.png");
const brandLogoSha256 = "70C424DCD371BB7F690946D24B6F3AEEEA3F7D0F276928C4707951EB8BDD4BB4";
const teamwearFixtureRoot = path.join(outputRoot, "assets", "organizations", "sportpaleis", "teamwear-fixtures");
const teamwearFixtureNames = [
  "teamwear-fixture-bag-black.svg",
  "teamwear-fixture-jacket-black.svg",
  "teamwear-fixture-jacket-navy.svg",
  "teamwear-fixture-shirt-black.svg",
  "teamwear-fixture-shirt-red.svg",
  "teamwear-fixture-shorts-black.svg",
];
if (associationLogoPaths.size !== 20) fail("exact 20 gecontroleerde Sportpaleis-verenigingslogo's zijn vereist");
if (rasterFiles.some((file) => !file.endsWith(".webp") && !associationLogoPaths.has(file) && file !== brandLogoPath)) fail("alleen lokaal beheerde WebP-catalogusassets en gehashte Sportpaleis-logo's zijn toegestaan");
if (!files.includes(brandLogoPath)) fail("gecontroleerd Sportpaleis-merklogo ontbreekt");
if (createHash("sha256").update(await readFile(brandLogoPath)).digest("hex").toUpperCase() !== brandLogoSha256) fail("Sportpaleis-merklogo wijkt af");
for (const [file, logo] of associationLogoPaths) {
  if (!files.includes(file)) fail(`Sportpaleis-verenigingslogo ontbreekt: ${logo.filename}`);
  const hash = createHash("sha256").update(await readFile(file)).digest("hex").toUpperCase();
  if (hash !== logo.sha256) fail(`Sportpaleis-verenigingslogo wijkt af: ${logo.filename}`);
}
for (const fileName of teamwearFixtureNames) {
  const file = path.join(teamwearFixtureRoot, fileName);
  if (!files.includes(file)) fail(`Teamwear-garmentvisual ontbreekt: ${fileName}`);
  const source = await readFile(file, "utf8");
  if (!source.includes("<svg") || !source.includes("viewBox")) fail(`Teamwear-garmentvisual is geen bruikbare SVG: ${fileName}`);
}
for (const file of rasterFiles) if ((await stat(file)).size > 1_000_000) fail("onverwacht grote Workspace-catalogusasset aangetroffen");

const textFiles = files.filter((file) => /\.(?:css|html|js|json|svg)$/i.test(file));
const combined = (await Promise.all(textFiles.map((file) => readFile(file, "utf8")))).join("\n");

for (const required of ["wbd-owner-icon.svg", "/workspace/sportpaleis", "rel=\"icon\""]) {
  if (!combined.includes(required)) fail(`vereiste Workspace-marker ontbreekt: ${required}`);
}

for (const required of [
  "/api/wbd/v1",
  "Nog niet verkopen",
  "Oude browserdossiers zijn niet gemigreerd",
  "Tijdelijke continuïteitsbrug",
  "http://127.0.0.1:5173/workspace/wbd/overzicht",
  "Niet beschikbaar op iPhone",
  "Organisaties zoeken en filteren",
  "/workspace/wbd/kansen",
  "Nog niet centraal beschikbaar",
]) {
  if (!workspaceEntry.includes(required)) fail(`vereiste WBD-owner marker ontbreekt: ${required}`);
}

for (const forbidden of [
  "Begrijpen is het vertrekpunt.",
  "experience-validation-main",
  "/atlas-lab",
  "/sportpaleis-proof",
  "context-first-experiment",
  "atlas-wbd-dossier-v1",
  "wbd-invoices",
  "F00248",
]) {
  if (workspaceEntry.includes(forbidden)) fail(`onbedoelde oude WBD/browserinhoud in ownerbundle aangetroffen: ${forbidden}`);
}

console.log(`Workspace-only build geverifieerd: ${files.length} bestanden, ${textFiles.length} tekstbestanden gecontroleerd.`);
