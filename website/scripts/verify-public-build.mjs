import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PUBLIC_STATIC_ALLOWLIST } from "./public-static-boundary.mjs";

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".svg",
  ".txt",
  ".webmanifest",
  ".xml",
]);

const forbiddenPaths = [
  /^assets\/organizations(?:\/|$)/i,
  /(?:^|\/)provenance(?:[._-]|$)/i,
  /atlas-(?:workspace|workspace-data|lab|observe|observations|orientations|delivery-review|understanding|case-guidance|case-snapshot|aquaflask-profile)/i,
  /aqua[-_]?flask/i,
  /case[-_]?snapshot/i,
  /(?:development|internal)-main/i,
  /internal\.html$/i,
];

const approvedRootFiles = new Set(["index.html", ...PUBLIC_STATIC_ALLOWLIST]);

function assetReferences(content) {
  return [...content.matchAll(/(?:^|["'(`=:\s])\/?(assets\/[A-Za-z0-9._/-]+)/g)]
    .map((match) => match[1]);
}

const forbiddenContent = [
  { label: "interne Atlas-route", pattern: /\/atlas(?:-lab)?(?:[\"'?#/]|$)/i },
  { label: "Atlas Workspace", pattern: /Atlas Workspace/i },
  { label: "Atlas Lab", pattern: /Atlas Lab/i },
  { label: "CASE-SNAPSHOT", pattern: /case[-_]?snapshot/i },
  { label: "AquaFlask", pattern: /\bAquaFlask\b/i },
  { label: "interne opslag", pattern: /atlas\.workspace|\blocalStorage\b/i },
  { label: "Waarnemen-module", pattern: /atlas-(?:observe|observations)|data-atlas-observation|\bWaarnemen\b/i },
  { label: "Understanding-module", pattern: /atlas-understanding|\bUnderstanding\b/i },
  { label: "interne Oriëntatie", pattern: /atlas-orientations|\bBij Cees\b/i },
  { label: "interne repositorybron", pattern: /clients\/000[12]-|docs\/atlas/i },
  { label: "sprintdocumentatie", pattern: /\bSprint 00[12][A-Z]?\b/i },
  { label: "interne hostingcontext", pattern: /TransIP Webhosting/i },
];

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

export async function verifyPublicBuild(distDirectory) {
  const dist = path.resolve(distDirectory);
  const indexPath = path.join(dist, "index.html");
  const indexStats = await stat(indexPath).catch(() => null);
  if (!indexStats?.isFile()) throw new Error("Publieke build mist dist/index.html.");

  const files = await listFiles(dist);
  const relativeFiles = files.map((file) => path.relative(dist, file).replaceAll("\\", "/"));
  const htmlFiles = relativeFiles.filter((file) => path.extname(file).toLowerCase() === ".html");
  const unexpectedHtmlFiles = htmlFiles.filter((file) => !["index.html", "404.html"].includes(file));
  if (!htmlFiles.includes("index.html") || unexpectedHtmlFiles.length > 0) {
    throw new Error(`Publieke build bevat onverwachte HTML-entrypoints: ${htmlFiles.join(", ") || "geen"}.`);
  }

  const forbiddenFile = relativeFiles.find((file) => forbiddenPaths.some((pattern) => pattern.test(file)));
  if (forbiddenFile) throw new Error(`Publieke build bevat intern artefact: ${forbiddenFile}.`);

  const unexpectedStaticFile = relativeFiles.find((file) => !file.startsWith("assets/") && !approvedRootFiles.has(file));
  if (unexpectedStaticFile) {
    throw new Error(`Publieke build bevat niet-geallowlist statisch artefact: ${unexpectedStaticFile}.`);
  }

  let scannedTextFiles = 0;
  const textByRelativeFile = new Map();
  for (const file of files) {
    if (!textExtensions.has(path.extname(file).toLowerCase()) && path.basename(file) !== ".htaccess") continue;
    scannedTextFiles += 1;
    const content = await readFile(file, "utf8");
    textByRelativeFile.set(path.relative(dist, file).replaceAll("\\", "/"), content);
    const contentWithoutApprovedPublicAnchors = content.replace(/Design the understanding first\.?/gi, "");
    const violation = forbiddenContent.find(({ pattern }) => pattern.test(contentWithoutApprovedPublicAnchors));
    if (violation) {
      const relativeFile = path.relative(dist, file).replaceAll("\\", "/");
      throw new Error(`Publieke build lekt ${violation.label} via ${relativeFile}.`);
    }
  }

  const reachableAssets = new Set();
  const pendingTextFiles = [...approvedRootFiles].filter((file) => textByRelativeFile.has(file));
  const visitedTextFiles = new Set();
  while (pendingTextFiles.length > 0) {
    const relativeFile = pendingTextFiles.shift();
    if (!relativeFile || visitedTextFiles.has(relativeFile)) continue;
    visitedTextFiles.add(relativeFile);
    for (const reference of assetReferences(textByRelativeFile.get(relativeFile) ?? "")) {
      if (!relativeFiles.includes(reference) || reachableAssets.has(reference)) continue;
      reachableAssets.add(reference);
      if (textByRelativeFile.has(reference)) pendingTextFiles.push(reference);
    }
  }

  const unreferencedAsset = relativeFiles.find((file) => file.startsWith("assets/") && !reachableAssets.has(file));
  if (unreferencedAsset) {
    throw new Error(`Publieke build bevat niet-bereikbaar of niet-expliciet gebruikt asset: ${unreferencedAsset}.`);
  }

  return { files: files.length, scannedTextFiles };
}

const executedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (executedDirectly) {
  const distDirectory = process.argv[2] ?? fileURLToPath(new URL("../dist", import.meta.url));
  try {
    const result = await verifyPublicBuild(distDirectory);
    console.log(`Public-only build geverifieerd: ${result.files} bestanden, ${result.scannedTextFiles} tekstbestanden gecontroleerd.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
