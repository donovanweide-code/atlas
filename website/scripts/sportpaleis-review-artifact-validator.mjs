import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS,
  assertAuthoritativeProductionAssetBytes,
} from "../config/sportpaleis-authoritative-production-assets.mjs";

export const SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR_ID = "sportpaleis.authoritative-production-assets.v1";

function fail(message, code = "REVIEW_ARTIFACT_PRODUCTION_ASSET_MISMATCH") {
  throw Object.assign(new Error(message), { code });
}

export const SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR = Object.freeze({
  id: SPORTPALEIS_PRODUCTION_ASSET_ARTIFACT_VALIDATOR_ID,
  async validate({ requirement, embeddedManifest, extractedRoot }) {
    const context = requirement?.productContext;
    if (requirement?.schemaVersion !== 1 || context?.tenantId !== "sportpaleis" || context?.application !== "workspace") {
      fail("Sportpaleis production-assetvalidator is buiten zijn gecontracteerde productcontext aangeroepen.", "REVIEW_ARTIFACT_VALIDATOR_CONTEXT_MISMATCH");
    }
    const declared = embeddedManifest.authoritativeProductionAssets;
    if (!Array.isArray(declared) || declared.length !== SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.length) {
      fail("Embedded manifest bevat niet exact de authoritative production-assetset.");
    }
    for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
      const expectedReleasePath = `app/dist-workspace/${asset.artifactPath}`;
      const actual = declared.find(({ id }) => id === asset.id);
      if (!actual) fail(`Authoritative production asset ontbreekt in embedded manifest: ${asset.id}`);
      for (const [value, expected, label] of [
        [actual.releasePath, expectedReleasePath, "releasepad"],
        [String(actual.sha256).toUpperCase(), asset.sha256, "SHA-256"],
        [actual.sizeBytes, asset.sizeBytes, "bestandsgrootte"],
        [actual.authority, asset.authority, "authority"],
      ]) {
        if (value !== expected) fail(`Authoritative production asset ${asset.id} heeft een afwijkende ${label}.`);
      }
      let bytes;
      try { bytes = await readFile(path.join(extractedRoot, ...expectedReleasePath.split("/"))); }
      catch { fail(`Authoritative production asset ontbreekt na uitpakken: ${asset.id}`, "REVIEW_ARTIFACT_PRODUCTION_ASSET_MISSING"); }
      try { assertAuthoritativeProductionAssetBytes(asset, bytes, expectedReleasePath); }
      catch (cause) { fail(cause instanceof Error ? cause.message : `Authoritative production asset wijkt af: ${asset.id}`); }
    }
  },
});
