import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createSportpaleisProductionBootstrap } from "./sportpaleis-pilot-foundation.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptDirectory, "..");
const repositoryRoot = path.resolve(websiteRoot, "..");
const releaseRoot = path.join(repositoryRoot, "release");

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function octal(value, length) {
  return `${value.toString(8).padStart(length - 1, "0")}\0`;
}

function writeText(buffer, offset, length, value) {
  Buffer.from(value).copy(buffer, offset, 0, length);
}

function tarHeader(name, size, mode = 0o644) {
  if (Buffer.byteLength(name) > 100) throw new Error(`Tar path te lang: ${name}`);
  const header = Buffer.alloc(512);
  writeText(header, 0, 100, name);
  writeText(header, 100, 8, octal(mode, 8));
  writeText(header, 108, 8, octal(0, 8));
  writeText(header, 116, 8, octal(0, 8));
  writeText(header, 124, 12, octal(size, 12));
  writeText(header, 136, 12, octal(0, 12));
  header.fill(32, 148, 156);
  header[156] = "0".charCodeAt(0);
  writeText(header, 257, 6, "ustar\0");
  writeText(header, 263, 2, "00");
  writeText(header, 265, 32, "root");
  writeText(header, 297, 32, "root");
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  writeText(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
  return header;
}

async function collect(directory, prefix) {
  const files = [];
  for (const name of (await readdir(directory)).sort()) {
    const absolute = path.join(directory, name);
    const details = await stat(absolute);
    if (details.isDirectory()) files.push(...await collect(absolute, `${prefix}/${name}`));
    else if (details.isFile()) files.push({ absolute, archive: `${prefix}/${name}` });
  }
  return files;
}

async function collectReferencedProductionArtifacts() {
  const state = createSportpaleisProductionBootstrap(new Date("2026-08-11T00:00:00.000Z"));
  const byPath = new Map();
  const references = [];
  for (const job of state.productionJobs ?? []) {
    const artifact = job.snapshot?.artifact;
    if (!artifact?.path || String(artifact.path).startsWith("immutable://")) continue;
    const relative = String(artifact.path).replaceAll("\\", "/");
    const normalized = path.posix.normalize(relative);
    if (relative !== normalized || path.posix.isAbsolute(normalized) || (!normalized.startsWith("output/") && !normalized.startsWith("outputs/"))) {
      throw new Error(`PlotJob ${job.jobNumber} bevat een ongeldig artefactpad.`);
    }
    if (!/^[A-F0-9]{64}$/u.test(String(artifact.sha256 ?? ""))) {
      throw new Error(`PlotJob ${job.jobNumber} mist een geldige immutable SHA-256.`);
    }
    const absolute = path.resolve(repositoryRoot, ...normalized.split("/"));
    const allowedRoots = [path.resolve(repositoryRoot, "output"), path.resolve(repositoryRoot, "outputs")];
    if (!allowedRoots.some((root) => absolute.startsWith(`${root}${path.sep}`))) {
      throw new Error(`PlotJob ${job.jobNumber} valt buiten de productieartefactgrens.`);
    }
    const bytes = await readFile(absolute);
    const actualHash = sha256(bytes).toUpperCase();
    if (actualHash !== artifact.sha256) throw new Error(`PlotJob ${job.jobNumber} artefacthash wijkt af.`);
    const previous = byPath.get(normalized);
    if (previous && previous.sha256 !== actualHash) throw new Error(`Conflicterende PlotJob-artefactreferentie: ${normalized}`);
    byPath.set(normalized, { absolute, archive: normalized, sha256: actualHash });
    references.push({
      productionJobId: job.id,
      jobNumber: job.jobNumber,
      path: normalized,
      filename: artifact.filename,
      format: artifact.format,
      version: artifact.version,
      sha256: actualHash,
    });
  }
  return {
    files: [...byPath.values()].map(({ absolute, archive }) => ({ absolute, archive })),
    references: references.sort((left, right) => left.jobNumber.localeCompare(right.jobNumber)),
  };
}

function git(...args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

async function main() {
  const releaseId = process.argv[2];
  const tag = process.argv[3];
  const baseFreezeTag = process.argv[4] ?? tag;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(releaseId ?? "")) throw new Error("Release-ID ontbreekt of is ongeldig.");
  if (!tag) throw new Error("Immutable tag ontbreekt.");
  if (git("status", "--porcelain")) throw new Error("Release build vereist een schone worktree.");
  const commit = git("rev-parse", "HEAD");
  if (git("rev-parse", `${tag}^{commit}`) !== commit) throw new Error("Tag wijst niet naar de actuele commit.");
  const baseFreezeCommit = git("rev-parse", `${baseFreezeTag}^{commit}`);

  const explicit = [
    [path.join(websiteRoot, "package.production.json"), "app/package.json"],
    [path.join(websiteRoot, "package-lock.json"), "app/package-lock.json"],
    [path.join(websiteRoot, "scripts", "workspace-runtime.mjs"), "app/scripts/workspace-runtime.mjs"],
    [path.join(websiteRoot, "scripts", "workspace-runtime-config.mjs"), "app/scripts/workspace-runtime-config.mjs"],
    [path.join(websiteRoot, "scripts", "mail-foundation.mjs"), "app/scripts/mail-foundation.mjs"],
    [path.join(websiteRoot, "scripts", "organization-brand-foundation.mjs"), "app/scripts/organization-brand-foundation.mjs"],
    [path.join(websiteRoot, "scripts", "sportpaleis-pilot-foundation.mjs"), "app/scripts/sportpaleis-pilot-foundation.mjs"],
    [path.join(websiteRoot, "scripts", "sportpaleis-mariadb-store.mjs"), "app/scripts/sportpaleis-mariadb-store.mjs"],
    [path.join(websiteRoot, "scripts", "sportpaleis-production-mail.mjs"), "app/scripts/sportpaleis-production-mail.mjs"],
    [path.join(websiteRoot, "public", "assets", "organizations", "sportpaleis", "brand-006", "sportpaleis-logo-mail-safe.png"), "app/public/assets/organizations/sportpaleis/brand-006/sportpaleis-logo-mail-safe.png"],
    [path.join(websiteRoot, "scripts", "atlas-mariadb-boundary.mjs"), "app/scripts/atlas-mariadb-boundary.mjs"],
    [path.join(websiteRoot, "scripts", "production-migrate.mjs"), "app/scripts/production-migrate.mjs"],
    [path.join(websiteRoot, "config", "sportpaleis-bedrukking-configuration.mjs"), "app/config/sportpaleis-bedrukking-configuration.mjs"],
    [path.join(websiteRoot, "config", "sportpaleis-live-pilot-catalog.mjs"), "app/config/sportpaleis-live-pilot-catalog.mjs"],
    [path.join(repositoryRoot, "ops", "production", "wbd-workspace.service"), "deployment/wbd-workspace.service"],
    [path.join(repositoryRoot, "ops", "production", "nginx-workspace-sportpaleis-predeployment.conf"), "deployment/nginx-workspace-sportpaleis-predeployment.conf"],
    [path.join(repositoryRoot, "ops", "production", "PRODUCTION-PERSISTENCE-MIGRATION-RUNBOOK.md"), "deployment/PRODUCTION-PERSISTENCE-MIGRATION-RUNBOOK.md"],
    [path.join(websiteRoot, ".env.production.example"), "deployment/production.env.example"],
  ].map(([absolute, archive]) => ({ absolute, archive }));
  const productionArtifacts = await collectReferencedProductionArtifacts();
  const files = [
    ...explicit,
    ...await collect(path.join(websiteRoot, "dist-workspace"), "app/dist-workspace"),
    ...await collect(path.join(websiteRoot, "sportpaleis-server", "production-migrations"), "app/sportpaleis-server/production-migrations"),
    ...productionArtifacts.files,
  ].sort((left, right) => left.archive.localeCompare(right.archive));

  const entries = [];
  const tarParts = [];
  for (const file of files) {
    const bytes = await readFile(file.absolute);
    entries.push({ path: file.archive, bytes: bytes.length, sha256: sha256(bytes) });
    tarParts.push(tarHeader(file.archive, bytes.length, file.archive.endsWith(".sh") ? 0o755 : 0o644), bytes);
    const padding = (512 - (bytes.length % 512)) % 512;
    if (padding) tarParts.push(Buffer.alloc(padding));
  }
  const embeddedManifest = Buffer.from(`${JSON.stringify({
    schemaVersion: 2,
    releaseId,
    commit,
    tag,
    baseFreeze: { tag: baseFreezeTag, commit: baseFreezeCommit },
    sourceDate: "2026-08-11",
    files: entries,
    persistentProductionArtifacts: productionArtifacts.references,
    productionPolicy: {
      persistence: "mariadb-only",
      fileFallback: false,
      productionUsers: 0,
      productionOrders: 0,
      uploads: false,
      mail: "capture-only",
      hardwareOutput: false,
      directPrint: false,
      summa: false,
      atlas: "separate-database-boundary-only",
      debug: false,
    },
  }, null, 2)}\n`, "utf8");
  tarParts.push(tarHeader("RELEASE-MANIFEST.json", embeddedManifest.length), embeddedManifest);
  const manifestPadding = (512 - (embeddedManifest.length % 512)) % 512;
  if (manifestPadding) tarParts.push(Buffer.alloc(manifestPadding));
  tarParts.push(Buffer.alloc(1024));

  await mkdir(releaseRoot, { recursive: true });
  const artifactName = `${releaseId}.tar.gz`;
  const artifact = gzipSync(Buffer.concat(tarParts), { level: 9, mtime: 0 });
  const artifactPath = path.join(releaseRoot, artifactName);
  await writeFile(artifactPath, artifact);
  const externalManifest = {
    releaseId, commit, tag, artifact: artifactName, artifactBytes: artifact.length, artifactSha256: sha256(artifact),
    baseFreezeTag, baseFreezeCommit,
    persistentProductionArtifactCount: productionArtifacts.references.length,
    reproducibleCommand: `node website/scripts/build-production-release.mjs ${releaseId} ${tag} ${baseFreezeTag}`,
    embeddedManifestSha256: sha256(embeddedManifest),
  };
  const manifestPath = path.join(releaseRoot, `${releaseId}.manifest.json`);
  await writeFile(manifestPath, `${JSON.stringify(externalManifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ artifactPath, manifestPath, ...externalManifest }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Release build failed"}\n`);
  process.exitCode = 1;
});
