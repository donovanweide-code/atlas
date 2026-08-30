import { createHash } from "node:crypto";

const managedFont = (definition) => Object.freeze({
  kind: "MANAGED_FONT",
  requiredAtRuntime: true,
  artifactPath: `assets/organizations/sportpaleis/fonts/${definition.originalFilename}`,
  sourcePath: `public/assets/organizations/sportpaleis/fonts/${definition.originalFilename}`,
  mimeType: "font/ttf",
  status: "TECHNICALLY_VALID",
  allowedInStore: true,
  ...definition,
  version: definition.sha256.slice(0, 12),
});

export const SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS = Object.freeze([
  managedFont({
    id: "font-liberation-sans-regular-f8ace1f8",
    name: "Liberation Sans Regular",
    originalFilename: "LiberationSans-Regular.ttf",
    sha256: "F8ACE1F892B2BD9DC1792BA7F097FA7588F84FED48321480E04DE5390828221F",
    sizeBytes: 139_512,
    authority: "OPEN_FONT_SOURCE",
    provenance: "Open fontbron uit pdfjs-dist; LICENSE_LIBERATION.txt is lokaal bij de bron bewaard.",
    addedAt: "2026-08-11T00:00:00.000Z",
    uploadedBy: Object.freeze({ userId: "system", name: "WBD pilot foundation" }),
  }),
  managedFont({
    id: "font-5d083befacdf98ae",
    name: "Spain Euro 2016",
    originalFilename: "Spain Euro 2016.ttf",
    sha256: "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585",
    sizeBytes: 15_232,
    authority: "HUMAN_PRODUCT_TRUTH",
    provenance: "Originele authoritative Spain Euro 2016-bron opnieuw aangeleverd door Donovan op 2026-08-30; bytes, SHA-256 en interne SpainEuro-Regular-identiteit exact gereconcilieerd met historische Human Product Truth.",
    addedAt: "2026-08-30T00:00:00.000Z",
    uploadedBy: Object.freeze({ userId: "system:human-product-truth", name: "Donovan" }),
    familyName: "Spain Euro 2016",
    subfamilyName: "Regular",
    fullName: "Spain Euro 2016 Regular",
    postscriptName: "SpainEuro-Regular",
    authoritativeIdentity: "font-5d083befacdf98ae",
  }),
]);

export const SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSET_MANIFEST_PATH = "assets/organizations/sportpaleis/authoritative-production-assets.json";

export function authoritativeProductionAssetById(id) {
  return SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.find((asset) => asset.id === id) ?? null;
}

export function productionAssetSha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

export function assertAuthoritativeProductionAssetBytes(asset, bytes, location = asset.sourcePath) {
  if (!asset || !SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.includes(asset)) {
    throw new Error("Alleen geregistreerde authoritative production assets mogen deze releasegrens passeren.");
  }
  if (bytes.length !== asset.sizeBytes) {
    throw new Error(`Authoritative production asset heeft een onjuiste bestandsgrootte: ${asset.id} (${location}).`);
  }
  const actualHash = productionAssetSha256(bytes);
  if (actualHash !== asset.sha256) {
    throw new Error(`Authoritative production asset heeft een onjuiste SHA-256: ${asset.id} (${location}).`);
  }
  return Object.freeze({ id: asset.id, kind: asset.kind, artifactPath: asset.artifactPath, sha256: actualHash, sizeBytes: bytes.length, authority: asset.authority, provenance: asset.provenance });
}

export function authoritativeProductionAssetManifest() {
  return Object.freeze({
    schemaVersion: 1,
    assets: SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.map((asset) => Object.freeze({
      id: asset.id,
      kind: asset.kind,
      artifactPath: asset.artifactPath,
      sha256: asset.sha256,
      sizeBytes: asset.sizeBytes,
      authority: asset.authority,
      provenance: asset.provenance,
      requiredAtRuntime: asset.requiredAtRuntime,
    })),
  });
}
