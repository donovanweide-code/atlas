import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
const robotsPath = path.join(outputRoot, "robots.txt");
if (!files.includes(robotsPath)) fail("Workspace-specifieke robots.txt ontbreekt");
if ((await readFile(robotsPath, "utf8")).trim() !== "User-agent: *\nDisallow: /") fail("Workspace robots.txt moet alle crawling blokkeren");
if (files.some((file) => path.basename(file).toLowerCase() === "sitemap.xml")) fail("Workspace-release mag geen publieke sitemap bevatten");
if (files.some((file) => file.endsWith(".map"))) fail("source maps horen niet in het runtimeartefact");
const rasterFiles = files.filter((file) => /\.(?:jpe?g|png|webp)$/i.test(file));
if (rasterFiles.some((file) => !file.endsWith(".webp"))) fail("alleen lokaal beheerde WebP-catalogusassets zijn toegestaan in het Workspace-artefact");
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
