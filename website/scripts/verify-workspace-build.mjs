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
const rasterFiles = files.filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file));
const associationLogoRoot = path.join(outputRoot, "assets", "organizations", "sportpaleis", "association-logos");
const associationLogoPaths = new Map(Object.values(SPORTPALEIS_ASSOCIATION_LOGOS).map((logo) => [path.join(associationLogoRoot, logo.filename), logo]));
const brandLogoPath = path.join(outputRoot, "assets", "organizations", "sportpaleis", "brand-006", "sportpaleis-logo-mail-safe.png");
const brandLogoSha256 = "70C424DCD371BB7F690946D24B6F3AEEEA3F7D0F276928C4707951EB8BDD4BB4";
if (associationLogoPaths.size !== 20) fail("exact 20 gecontroleerde Sportpaleis-verenigingslogo's zijn vereist");
if (rasterFiles.some((file) => !file.endsWith(".webp") && !associationLogoPaths.has(file) && file !== brandLogoPath)) fail("alleen lokaal beheerde WebP-catalogusassets en gehashte Sportpaleis-logo's zijn toegestaan");
if (!files.includes(brandLogoPath)) fail("gecontroleerd Sportpaleis-merklogo ontbreekt");
if (createHash("sha256").update(await readFile(brandLogoPath)).digest("hex").toUpperCase() !== brandLogoSha256) fail("Sportpaleis-merklogo wijkt af");
for (const [file, logo] of associationLogoPaths) {
  if (!files.includes(file)) fail(`Sportpaleis-verenigingslogo ontbreekt: ${logo.filename}`);
  const hash = createHash("sha256").update(await readFile(file)).digest("hex").toUpperCase();
  if (hash !== logo.sha256) fail(`Sportpaleis-verenigingslogo wijkt af: ${logo.filename}`);
}
for (const file of rasterFiles) if ((await stat(file)).size > 1_000_000) fail("onverwacht grote Workspace-catalogusasset aangetroffen");

const textFiles = files.filter((file) => /\.(?:css|html|js|json|svg)$/i.test(file));
const combined = (await Promise.all(textFiles.map((file) => readFile(file, "utf8")))).join("\n");

for (const required of ["/workspace/wbd", "/workspace/sportpaleis", "WBD_WORKSPACE_ROUTE_NOT_FOUND", "data-route-status", "rel=\"icon\""]) {
  if (!combined.includes(required)) fail(`vereiste Workspace-marker ontbreekt: ${required}`);
}

for (const forbidden of [
  "Begrijpen is het vertrekpunt.",
  "experience-validation-main",
  "/atlas-lab",
  "/sportpaleis-proof",
  "context-first-experiment",
]) {
  if (combined.includes(forbidden)) fail(`onbedoelde public/Experience/dev-inhoud aangetroffen: ${forbidden}`);
}

console.log(`Workspace-only build geverifieerd: ${files.length} bestanden, ${textFiles.length} tekstbestanden gecontroleerd.`);
