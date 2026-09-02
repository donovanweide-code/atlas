import { createHash } from "node:crypto";

import { SPORTPALEIS_SUPPLIED_FONT_ADMISSION } from "../src/sportpaleis/supplied-font-admission.generated.mjs";

const managedFont = (definition) => Object.freeze({
  kind: "MANAGED_FONT",
  requiredAtRuntime: true,
  artifactPath: `assets/organizations/sportpaleis/fonts/${definition.originalFilename}`,
  sourcePath: `public/assets/organizations/sportpaleis/fonts/${definition.originalFilename}`,
  mimeType: "font/ttf",
  status: "TECHNICALLY_VALID",
  allowedInStore: true,
  ...definition,
  authoritativeIdentity: definition.authoritativeIdentity ?? definition.id,
  version: definition.sha256.slice(0, 12),
});

const fontAdmission = ({ authority, sourceSha256, metadata, representativeProofs, executabilitySha256, confirmedAt, confirmedBy, applicationBindings = ["FREE_PRINT", "initials", "name", "backNumber", "chestNumber", "shortsNumber"] }) => Object.freeze({
  lifecycle: "AUTHORITATIVE",
  sourceType: "FONT",
  authority,
  stages: Object.freeze(["STORED", "IDENTIFIED", "VALIDATED", "APPLICATION_COMPATIBLE", "PRODUCTION_EXECUTABLE", "PREVIEWED", "HUMAN_CONFIRMED", "AUTHORITATIVE"]),
  applicationBindings: Object.freeze(applicationBindings),
  sourceSha256,
  metadata: Object.freeze(metadata),
  representativeProofs: Object.freeze(representativeProofs.map((proof) => Object.freeze(proof))),
  executabilitySha256,
  confirmedAt,
  confirmedBy: Object.freeze(confirmedBy),
});

const managedSuppliedFont = ({ filename, name, aliases = [], applicationBindings }) => {
  const proof = SPORTPALEIS_SUPPLIED_FONT_ADMISSION.find((record) => record.filename === filename);
  if (!proof || proof.status !== "PRODUCTION_EXECUTABLE") throw new Error(`Supplied font ${filename} is niet production-executable admitted.`);
  return managedFont({
    id: `font-${proof.sourceSha256.slice(0, 16).toLowerCase()}`,
    name,
    originalFilename: filename,
    sha256: proof.sourceSha256,
    sizeBytes: proof.sizeBytes,
    mimeType: proof.mimeType,
    authority: "HUMAN_PRODUCT_TRUTH",
    provenance: `Origineel fontbestand opnieuw aangeleverd door Donovan op 2026-09-01; exact via het centrale Production Source Admission Contract geïdentificeerd, gerenderd, gecontourd en hash-geborgd (${proof.sourceSha256}).`,
    addedAt: "2026-09-01T00:00:00.000Z",
    uploadedBy: Object.freeze({ userId: "system:human-product-truth", name: "Donovan" }),
    ...proof.metadata,
    aliases: Object.freeze(aliases),
    admission: fontAdmission({
      authority: "HUMAN_PRODUCT_TRUTH",
      sourceSha256: proof.sourceSha256,
      metadata: proof.metadata,
      representativeProofs: proof.representativeProofs,
      executabilitySha256: proof.executabilitySha256,
      confirmedAt: "2026-09-01T00:00:00.000Z",
      confirmedBy: { userId: "system:human-product-truth", name: "Donovan" },
      applicationBindings,
    }),
  });
};

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
    familyName: "Liberation Sans",
    subfamilyName: "Regular",
    fullName: "Liberation Sans",
    postscriptName: "LiberationSans",
    admission: fontAdmission({
      authority: "OPEN_FONT_SOURCE",
      sourceSha256: "F8ACE1F892B2BD9DC1792BA7F097FA7588F84FED48321480E04DE5390828221F",
      metadata: { familyName: "Liberation Sans", subfamilyName: "Regular", fullName: "Liberation Sans", postscriptName: "LiberationSans", unitsPerEm: 2048, glyphCount: 681 },
      representativeProofs: [
        { content: "MW", geometrySha256: "04297571BB38411FDF6A0CC1A044C846E80A78040DCF1FB921F5E902D6765CEF", widthMm: 49.175, heightMm: 20 },
        { content: "VAN DER MEER", geometrySha256: "335AB560AAE9796C161C4AB69195BF358F3D27434A8B4AD9CF2301FF72394E08", widthMm: 217.65, heightMm: 20 },
        { content: "34", geometrySha256: "C58FDEBEEECABD2804B2A50A9503DAC5523277054DAAF85823EE4F238B6E6B1F", widthMm: 29.525, heightMm: 20 },
      ],
      executabilitySha256: "A97269395F49B7A5D0DA7942CB22B5FF2584381548B8031F458467EF51AE0EEF",
      confirmedAt: "2026-08-11T00:00:00.000Z",
      confirmedBy: { userId: "system", name: "WBD pilot foundation" },
    }),
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
    aliases: Object.freeze(["Spain"]),
    authoritativeIdentity: "font-5d083befacdf98ae",
    admission: fontAdmission({
      authority: "HUMAN_PRODUCT_TRUTH",
      sourceSha256: "5D083BEFACDF98AEBBA44F849A1A6578CD8F9B67C2F615321FF7920BFE11E585",
      metadata: { familyName: "Spain Euro 2016", subfamilyName: "Regular", fullName: "Spain Euro 2016 Regular", postscriptName: "SpainEuro-Regular", unitsPerEm: 1000, glyphCount: 81 },
      representativeProofs: [
        { content: "MW", geometrySha256: "3F05B6207628CF207B6B5B1E7F466080CD869F32F89C5D83809C80A347942A28", widthMm: 29.5, heightMm: 20 },
        { content: "VAN DER MEER", geometrySha256: "806B2599AC75442EFCC08D9DD4F98CF9697ED8B0205889838B83404CD1916FCA", widthMm: 115.525, heightMm: 20 },
        { content: "34", geometrySha256: "5C78CDCC1BD019B16D246249727FBDAC0A797173C96B07E08721C938A20149F9", widthMm: 22.6, heightMm: 20 },
      ],
      executabilitySha256: "30CF4C4A6EB0B7D87FBBAB0EFE80780351CE632627E3083AB96844EF460713A4",
      confirmedAt: "2026-08-30T00:00:00.000Z",
      confirmedBy: { userId: "system:human-product-truth", name: "Donovan" },
    }),
  }),
  managedSuppliedFont({ filename: "Schluber.otf", name: "Schluber", aliases: ["schluber"], applicationBindings: ["FREE_PRINT", "initials", "name", "backNumber", "chestNumber", "shortsNumber"] }),
  managedSuppliedFont({ filename: "MyriadPro-It.otf", name: "Myriad Pro Italic", aliases: ["Myriad Pro - Italic", "MyriadPro-It"], applicationBindings: ["FREE_PRINT", "initials", "name"] }),
  managedSuppliedFont({ filename: "MyriadPro-Bold.otf", name: "Myriad Pro Bold", aliases: ["MyriadPro-Bold", "Myrad pro - Bold"], applicationBindings: ["FREE_PRINT", "initials", "name"] }),
  managedSuppliedFont({ filename: "Premier League Font 2018.ttf", name: "FFF English Premier League", aliases: ["FFF englisch", "FFFEnglishPremierLeague"], applicationBindings: ["FREE_PRINT", "name", "chestNumber", "shortsNumber"] }),
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
