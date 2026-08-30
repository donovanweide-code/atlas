import { createHash } from "node:crypto";
import path from "node:path";

function normalizedPaths(values) {
  return [...new Set((values ?? []).map((value) => String(value).replaceAll("\\", "/")).filter(Boolean))].sort((left, right) => left.localeCompare(right, "en", { sensitivity: "variant" }));
}

function safeStem(value) {
  const stem = path.posix.basename(value).replace(/\.[^.]+$/u, "").normalize("NFKC").toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
  return stem || "asset";
}

function provenanceIdentity(assetInfo) {
  const originals = normalizedPaths(assetInfo?.originalFileNames);
  const names = normalizedPaths(assetInfo?.names ?? (assetInfo?.name ? [assetInfo.name] : []));
  const identities = originals.length ? originals : names.length ? names : ["generated-asset"];
  return {
    stem: safeStem(identities[0]),
    digest: createHash("sha256").update(identities.join("\n")).digest("hex").slice(0, 12),
  };
}

export function deterministicWorkspaceAssetFileName(assetInfo) {
  const identity = provenanceIdentity(assetInfo);
  return `assets/workspace-${identity.stem}-${identity.digest}-[hash][extname]`;
}

export function deterministicTeamwearCatalogManifest(bundle) {
  const candidates = [];
  for (const asset of Object.values(bundle ?? {})) {
    if (asset?.type !== "asset") continue;
    const originals = normalizedPaths(asset.originalFileNames).filter((name) => name.includes("src/assets/images/sportpaleis/"));
    if (!originals.length) continue;
    const source = typeof asset.source === "string" ? Buffer.from(asset.source) : Buffer.from(asset.source ?? []);
    const sha256 = createHash("sha256").update(source).digest("hex").toUpperCase();
    for (const original of originals) {
      candidates.push({
        key: path.posix.basename(original).replace(/\.[^.]+$/u, ""),
        original,
        fileName: String(asset.fileName),
        sha256,
      });
    }
  }
  candidates.sort((left, right) => left.key.localeCompare(right.key, "en", { sensitivity: "variant" })
    || left.original.localeCompare(right.original, "en", { sensitivity: "variant" })
    || left.fileName.localeCompare(right.fileName, "en", { sensitivity: "variant" }));
  const images = {};
  for (const candidate of candidates) {
    const current = images[candidate.key];
    const next = { fileName: candidate.fileName, sha256: candidate.sha256 };
    if (current && (current.fileName !== next.fileName || current.sha256 !== next.sha256)) {
      throw new Error(`Conflicterende deterministische catalogusasset voor ${candidate.key}.`);
    }
    images[candidate.key] = next;
  }
  return Object.freeze({ schemaVersion: 1, images: Object.freeze(images) });
}
