import { defineConfig } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import {
  SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS,
  SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSET_MANIFEST_PATH,
  assertAuthoritativeProductionAssetBytes,
  authoritativeProductionAssetManifest,
} from "./config/sportpaleis-authoritative-production-assets.mjs";
import {
  deterministicTeamwearCatalogManifest,
  deterministicWorkspaceAssetFileName,
} from "./config/deterministic-workspace-assets.mjs";

const pwaAsset = (name: string) => readFileSync(new URL(`./workspace-public/${name}`, import.meta.url), "utf8");

export default defineConfig({
  publicDir: false,
  plugins: [{
    name: "sportpaleis-pwa-assets",
    generateBundle(_options, bundle) {
      for (const fileName of ["robots.txt", "sportpaleis.webmanifest", "sportpaleis-sw.js", "sportpaleis-pwa-icon.svg", "wbd-owner.webmanifest", "wbd-owner-sw.js", "wbd-owner-icon.svg"]) this.emitFile({ type: "asset", fileName, source: pwaAsset(fileName) });
      for (const asset of SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS) {
        const source = readFileSync(new URL(`./${asset.sourcePath}`, import.meta.url));
        assertAuthoritativeProductionAssetBytes(asset, source, asset.sourcePath);
        this.emitFile({
          type: "asset",
          fileName: asset.artifactPath,
          source,
        });
      }
      this.emitFile({
        type: "asset",
        fileName: SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSET_MANIFEST_PATH,
        source: `${JSON.stringify(authoritativeProductionAssetManifest(), null, 2)}\n`,
      });
      this.emitFile({
        type: "asset",
        fileName: "assets/organizations/sportpaleis/fonts/LICENSE_LIBERATION.txt",
        source: readFileSync(new URL("./public/assets/organizations/sportpaleis/fonts/LICENSE_LIBERATION.txt", import.meta.url)),
      });
      this.emitFile({
        type: "asset",
        fileName: "assets/organizations/sportpaleis/brand-006/sportpaleis-logo-mail-safe.png",
        source: readFileSync(new URL("./public/assets/organizations/sportpaleis/brand-006/sportpaleis-logo-mail-safe.png", import.meta.url)),
      });
      this.emitFile({
        type: "asset",
        fileName: "assets/organizations/we-build-and-design/logo-candidate-004c1/wbd-logo-light-candidate.svg",
        source: readFileSync(new URL("./public/assets/organizations/we-build-and-design/logo-candidate-004c1/wbd-logo-light-candidate.svg", import.meta.url)),
      });
      for (const fileName of readdirSync(new URL("./public/assets/organizations/sportpaleis/association-logos/", import.meta.url)).filter((name) => name.endsWith(".png")).sort()) {
        this.emitFile({
          type: "asset",
          fileName: `assets/organizations/sportpaleis/association-logos/${fileName}`,
          source: readFileSync(new URL(`./public/assets/organizations/sportpaleis/association-logos/${fileName}`, import.meta.url)),
        });
      }
      for (const fileName of readdirSync(new URL("./public/assets/organizations/sportpaleis/teamwear-fixtures/", import.meta.url)).filter((name) => name.endsWith(".svg")).sort()) {
        this.emitFile({
          type: "asset",
          fileName: `assets/organizations/sportpaleis/teamwear-fixtures/${fileName}`,
          source: readFileSync(new URL(`./public/assets/organizations/sportpaleis/teamwear-fixtures/${fileName}`, import.meta.url)),
        });
      }
      this.emitFile({
        type: "asset",
        fileName: "assets/organizations/sportpaleis/teamwear-catalog-manifest.json",
        source: `${JSON.stringify(deterministicTeamwearCatalogManifest(bundle), null, 2)}\n`,
      });
    },
  }],
  build: {
    assetsInlineLimit: 0,
    outDir: "dist-workspace",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        workspace: "workspace.html",
        sportpaleis: "sportpaleis.html",
      },
      output: {
        entryFileNames: "assets/workspace-[hash].js",
        chunkFileNames: "assets/workspace-[hash].js",
        assetFileNames: deterministicWorkspaceAssetFileName,
      },
    },
  },
});
