import { defineConfig } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { basename } from "node:path";

const pwaAsset = (name: string) => readFileSync(new URL(`./workspace-public/${name}`, import.meta.url), "utf8");

export default defineConfig({
  publicDir: false,
  plugins: [{
    name: "sportpaleis-pwa-assets",
    generateBundle(_options, bundle) {
      for (const fileName of ["robots.txt", "sportpaleis.webmanifest", "sportpaleis-sw.js", "sportpaleis-pwa-icon.svg", "wbd-owner.webmanifest", "wbd-owner-sw.js", "wbd-owner-icon.svg"]) this.emitFile({ type: "asset", fileName, source: pwaAsset(fileName) });
      for (const fileName of ["LiberationSans-Regular.ttf", "LICENSE_LIBERATION.txt"]) {
        this.emitFile({
          type: "asset",
          fileName: `assets/organizations/sportpaleis/fonts/${fileName}`,
          source: readFileSync(new URL(`./public/assets/organizations/sportpaleis/fonts/${fileName}`, import.meta.url)),
        });
      }
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
      const catalogImages: Record<string, { fileName: string; sha256: string }> = {};
      for (const asset of Object.values(bundle)) {
        if (asset.type !== "asset") continue;
        const originals = asset.originalFileNames?.filter((name) => name.replaceAll("\\", "/").includes("src/assets/images/sportpaleis/")) ?? [];
        if (originals.length === 0) continue;
        const source = typeof asset.source === "string" ? Buffer.from(asset.source) : Buffer.from(asset.source);
        const entry = { fileName: asset.fileName, sha256: createHash("sha256").update(source).digest("hex").toUpperCase() };
        for (const original of originals) {
          const key = basename(original).replace(/\.[^.]+$/u, "");
          catalogImages[key] = entry;
        }
      }
      this.emitFile({
        type: "asset",
        fileName: "assets/organizations/sportpaleis/teamwear-catalog-manifest.json",
        source: `${JSON.stringify({ schemaVersion: 1, images: catalogImages }, null, 2)}\n`,
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
        assetFileNames: "assets/workspace-[hash][extname]",
      },
    },
  },
});
