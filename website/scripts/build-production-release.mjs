import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { createSportpaleisProductionBootstrap } from "./sportpaleis-pilot-foundation.mjs";
import { collectRuntimeDependencyGraph } from "./release-runtime-graph.mjs";
import { assertRemoteSourceTag } from "./release-provenance-core.mjs";
import {
  SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS,
  assertAuthoritativeProductionAssetBytes,
} from "../config/sportpaleis-authoritative-production-assets.mjs";
import { SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR_ID } from "./sportpaleis-review-artifact-validator.mjs";

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
  let entryName = name;
  let prefix = "";
  if (Buffer.byteLength(entryName) > 100) {
    const separators = [...entryName.matchAll(/\//gu)].map(({ index }) => index).reverse();
    const splitAt = separators.find((index) => Buffer.byteLength(entryName.slice(index + 1)) <= 100
      && Buffer.byteLength(entryName.slice(0, index)) <= 155);
    if (splitAt === undefined) throw new Error(`Tar path past niet binnen USTAR: ${name}`);
    prefix = entryName.slice(0, splitAt);
    entryName = entryName.slice(splitAt + 1);
  }
  const header = Buffer.alloc(512);
  writeText(header, 0, 100, entryName);
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
  writeText(header, 345, 155, prefix);
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

async function verifyAuthoritativeProductionAssets() {
  const verified = [];
  for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
    const sourcePath = path.join(websiteRoot, ...asset.sourcePath.split("/"));
    const artifactPath = path.join(websiteRoot, "dist-workspace", ...asset.artifactPath.split("/"));
    const sourceEvidence = assertAuthoritativeProductionAssetBytes(asset, await readFile(sourcePath), asset.sourcePath);
    const artifactEvidence = assertAuthoritativeProductionAssetBytes(asset, await readFile(artifactPath), `dist-workspace/${asset.artifactPath}`);
    if (sourceEvidence.sha256 !== artifactEvidence.sha256) throw new Error(`Authoritative production asset is niet byte-identiek gematerialiseerd: ${asset.id}`);
    verified.push({ ...artifactEvidence, releasePath: `app/dist-workspace/${asset.artifactPath}` });
  }
  return verified;
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
  const sourceTree = git("rev-parse", "HEAD^{tree}");
  const sourceCommitTimestamp = new Date(git("show", "-s", "--format=%cI", commit)).toISOString();
  const sourceRemote = process.env.RELEASE_SOURCE_REMOTE ?? "origin";
  const remoteTagOutput = git("ls-remote", "--tags", sourceRemote, `refs/tags/${tag}`, `refs/tags/${tag}^{}`);
  const remoteTagCommit = assertRemoteSourceTag({
    output: remoteTagOutput,
    remote: sourceRemote,
    tag,
    expectedCommit: commit,
  });

  const runtimeDependencies = await collectRuntimeDependencyGraph({
    websiteRoot,
    entrypoints: [
      path.join(websiteRoot, "scripts", "workspace-runtime.mjs"),
      path.join(websiteRoot, "scripts", "production-migrate.mjs"),
      path.join(websiteRoot, "scripts", "sportpaleis-website-sync-job.mjs"),
      path.join(websiteRoot, "scripts", "sportpaleis-prelive-order-cleanup.mjs"),
      path.join(websiteRoot, "scripts", "sportpaleis-teamwear-pilot-control.mjs"),
      path.join(websiteRoot, "src", "workspace-sequence.ts"),
    ],
    allowedRoots: [
      path.join(websiteRoot, "scripts"),
      path.join(websiteRoot, "config"),
      path.join(websiteRoot, "src", "sportpaleis"),
      path.join(websiteRoot, "src", "workspace-sequence.ts"),
    ],
  });

  const explicit = [
    [path.join(websiteRoot, "package.production.json"), "app/package.json"],
    [path.join(websiteRoot, "package-lock.json"), "app/package-lock.json"],
    [path.join(websiteRoot, "scripts", "sportpaleis-production-shaped-assurance.mjs"), "app/scripts/sportpaleis-production-shaped-assurance.mjs"],
    [path.join(websiteRoot, "scripts", "sportpaleis-domain-rollback-bridge.mjs"), "app/scripts/sportpaleis-domain-rollback-bridge.mjs"],
    [path.join(websiteRoot, "scripts", "sportpaleis-domain-backfill.mjs"), "app/scripts/sportpaleis-domain-backfill.mjs"],
    [path.join(websiteRoot, "scripts", "wbd-owner-domain-backfill.mjs"), "app/scripts/wbd-owner-domain-backfill.mjs"],
    [path.join(websiteRoot, "scripts", "wbd-owner-domain-assurance.mjs"), "app/scripts/wbd-owner-domain-assurance.mjs"],
    [path.join(websiteRoot, "scripts", "wbd-owner-domain-rollback-bridge.mjs"), "app/scripts/wbd-owner-domain-rollback-bridge.mjs"],
    [path.join(websiteRoot, "scripts", "workspace-legacy-state-encode.mjs"), "app/scripts/workspace-legacy-state-encode.mjs"],
    [path.join(websiteRoot, "scripts", "workspace-legacy-state-encode-worker.mjs"), "app/scripts/workspace-legacy-state-encode-worker.mjs"],
    [path.join(websiteRoot, "config", "sportpaleis-production-shaped-assurance-v4.json"), "app/config/sportpaleis-production-shaped-assurance-v4.json"],
    [path.join(websiteRoot, "config", "sportpaleis-regression-contract-v1.json"), "app/config/sportpaleis-regression-contract-v1.json"],
    [path.join(websiteRoot, "config", "sportpaleis-regression-failure-matrix-v1.json"), "app/config/sportpaleis-regression-failure-matrix-v1.json"],
    [path.join(websiteRoot, "config", "sportpaleis-immutable-regression-fixtures-v1.json"), "app/config/sportpaleis-immutable-regression-fixtures-v1.json"],
    [path.join(websiteRoot, "config", "wbd-owner-domain-assurance-v1.json"), "app/config/wbd-owner-domain-assurance-v1.json"],
    [path.join(websiteRoot, "public", "assets", "organizations", "sportpaleis", "brand-006", "sportpaleis-logo-mail-safe.png"), "app/public/assets/organizations/sportpaleis/brand-006/sportpaleis-logo-mail-safe.png"],
    [path.join(repositoryRoot, "ops", "production", "wbd-workspace.service"), "deployment/wbd-workspace.service"],
    [path.join(repositoryRoot, "ops", "production", "wbd-sportpaleis-website-sync.service"), "deployment/wbd-sportpaleis-website-sync.service"],
    [path.join(repositoryRoot, "ops", "production", "wbd-sportpaleis-website-sync.timer"), "deployment/wbd-sportpaleis-website-sync.timer"],
    [path.join(repositoryRoot, "ops", "production", "nginx-workspace-predeployment.conf"), "deployment/nginx-workspace-predeployment.conf"],
    [path.join(repositoryRoot, "ops", "production", "nginx-workspace-sportpaleis-predeployment.conf"), "deployment/nginx-workspace-sportpaleis-predeployment.conf"],
    [path.join(repositoryRoot, "ops", "production", "PRODUCTION-PERSISTENCE-MIGRATION-RUNBOOK.md"), "deployment/PRODUCTION-PERSISTENCE-MIGRATION-RUNBOOK.md"],
    [path.join(websiteRoot, ".env.production.example"), "deployment/production.env.example"],
  ].map(([absolute, archive]) => ({ absolute, archive }));
  const authoritativeProductionAssets = await verifyAuthoritativeProductionAssets();
  const productionArtifacts = await collectReferencedProductionArtifacts();
  const files = [
    ...explicit,
    ...runtimeDependencies,
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
  for (const asset of authoritativeProductionAssets) {
    const entry = entries.find(({ path: entryPath }) => entryPath === asset.releasePath);
    if (!entry || entry.sha256.toUpperCase() !== asset.sha256 || entry.bytes !== asset.sizeBytes) {
      throw new Error(`Authoritative production asset ontbreekt of wijkt af in release-inhoud: ${asset.id}`);
    }
  }
  const productionShapedAssurance = entries.find(({ path: entryPath }) => entryPath === "app/scripts/sportpaleis-production-shaped-assurance.mjs");
  if (!productionShapedAssurance) throw new Error("Permanente Sportpaleis production-shaped assurancegate ontbreekt uit het artifact.");
  const productionShapedContract = entries.find(({ path: entryPath }) => entryPath === "app/config/sportpaleis-production-shaped-assurance-v4.json");
  if (!productionShapedContract) throw new Error("Versioned Sportpaleis assurancedrempelcontract ontbreekt uit het artifact.");
  const regressionContract = entries.find(({ path: entryPath }) => entryPath === "app/config/sportpaleis-regression-contract-v1.json");
  const regressionFailureMatrix = entries.find(({ path: entryPath }) => entryPath === "app/config/sportpaleis-regression-failure-matrix-v1.json");
  const immutableFixtureManifest = entries.find(({ path: entryPath }) => entryPath === "app/config/sportpaleis-immutable-regression-fixtures-v1.json");
  if (!regressionContract || !regressionFailureMatrix || !immutableFixtureManifest) throw new Error("Versioned Sportpaleis regressiecontract of evidencebinding ontbreekt uit het artifact.");
  const ownerDomainAssurance = entries.find(({ path: entryPath }) => entryPath === "app/scripts/wbd-owner-domain-assurance.mjs");
  if (!ownerDomainAssurance) throw new Error("Permanente WBD Owner domeinassurancegate ontbreekt uit het artifact.");
  const ownerDomainContract = entries.find(({ path: entryPath }) => entryPath === "app/config/wbd-owner-domain-assurance-v1.json");
  if (!ownerDomainContract) throw new Error("Versioned WBD Owner assurancedrempelcontract ontbreekt uit het artifact.");
  const embeddedManifest = Buffer.from(`${JSON.stringify({
    schemaVersion: 2,
    releaseId,
    commit,
    tag,
    baseFreeze: { tag: baseFreezeTag, commit: baseFreezeCommit },
    sourceDate: "2026-08-12",
    files: entries,
    persistentProductionArtifacts: productionArtifacts.references,
    authoritativeProductionAssets,
    artifactValidation: {
      schemaVersion: 1,
      requiredValidators: [{
        id: SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR_ID,
        schemaVersion: 1,
        productContext: { tenantId: "sportpaleis", application: "workspace" },
      }],
    },
    productionShapedAssurance: {
      requiredPhase: "PRE_DEPLOY",
      entrypoint: productionShapedAssurance.path,
      sha256: productionShapedAssurance.sha256,
      contract: productionShapedContract.path,
      contractSha256: productionShapedContract.sha256,
      regressionContract: regressionContract.path,
      regressionContractSha256: regressionContract.sha256,
      regressionFailureMatrix: regressionFailureMatrix.path,
      regressionFailureMatrixSha256: regressionFailureMatrix.sha256,
      immutableFixtureManifest: immutableFixtureManifest.path,
      immutableFixtureManifestSha256: immutableFixtureManifest.sha256,
      binds: ["commit", "artifact", "restore-backup", "tenant", "revision", "access-scope"],
    },
    ownerDomainAssurance: {
      requiredPhase: "PRE_DEPLOY",
      entrypoint: ownerDomainAssurance.path,
      sha256: ownerDomainAssurance.sha256,
      contract: ownerDomainContract.path,
      contractSha256: ownerDomainContract.sha256,
      binds: ["commit", "artifact", "restore-backup", "tenant", "revision", "access-scope"],
    },
    runtimeDependencyGraph: {
      entrypoints: [
        "app/scripts/workspace-runtime.mjs",
        "app/scripts/production-migrate.mjs",
        "app/scripts/sportpaleis-website-sync-job.mjs",
        "app/scripts/sportpaleis-prelive-order-cleanup.mjs",
        "app/scripts/sportpaleis-teamwear-pilot-control.mjs",
        "app/src/workspace-sequence.ts",
      ],
      files: runtimeDependencies.map(({ archive }) => archive),
    },
    productionPolicy: {
      persistence: "mariadb-only",
      fileFallback: false,
      productionUsers: 0,
      wbdOwnerUsers: 1,
      wbdOwnerPersistence: "mariadb",
      wbdOwnerTenantModel: "single-owner-single-organization",
      productionOrders: 0,
      uploads: false,
      productionAssetUploads: "operator-admin-svg-source-only",
      fontUploads: "admin-only",
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
    buildTimestamp: sourceCommitTimestamp,
    assetManifestFingerprint: sha256(Buffer.from(`${JSON.stringify(entries.filter(({ path: entryPath }) => entryPath.startsWith("app/dist-workspace/")))}\n`, "utf8")),
    sourceProvenance: { remote: sourceRemote, tag, commit: remoteTagCommit, tree: sourceTree, verifiedAtBuild: true },
    deployability: { rollbackArtifactRequired: true, productionShapedAssuranceRequired: true, ownerDomainAssuranceRequired: true },
    productionShapedAssurance: {
      entrypoint: productionShapedAssurance.path,
      sha256: productionShapedAssurance.sha256,
      contract: productionShapedContract.path,
      contractSha256: productionShapedContract.sha256,
      regressionContract: regressionContract.path,
      regressionContractSha256: regressionContract.sha256,
      regressionFailureMatrix: regressionFailureMatrix.path,
      regressionFailureMatrixSha256: regressionFailureMatrix.sha256,
      immutableFixtureManifest: immutableFixtureManifest.path,
      immutableFixtureManifestSha256: immutableFixtureManifest.sha256,
      requiredPhase: "PRE_DEPLOY",
    },
    ownerDomainAssurance: { entrypoint: ownerDomainAssurance.path, sha256: ownerDomainAssurance.sha256, contract: ownerDomainContract.path, contractSha256: ownerDomainContract.sha256, requiredPhase: "PRE_DEPLOY" },
    runtimeDependencyCount: runtimeDependencies.length,
    persistentProductionArtifactCount: productionArtifacts.references.length,
    authoritativeProductionAssetCount: authoritativeProductionAssets.length,
    authoritativeProductionAssetFingerprint: sha256(Buffer.from(`${JSON.stringify(authoritativeProductionAssets)}\n`, "utf8")),
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
