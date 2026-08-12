import { defineConfig } from "vite";
import { readFileSync } from "node:fs";

const pwaAsset = (name: string) => readFileSync(new URL(`./workspace-public/${name}`, import.meta.url), "utf8");

export default defineConfig({
  publicDir: false,
  plugins: [{
    name: "sportpaleis-pwa-assets",
    generateBundle() {
      for (const fileName of ["robots.txt", "sportpaleis.webmanifest", "sportpaleis-sw.js", "sportpaleis-pwa-icon.svg"]) this.emitFile({ type: "asset", fileName, source: pwaAsset(fileName) });
      for (const fileName of ["LiberationSans-Regular.ttf", "LICENSE_LIBERATION.txt"]) {
        this.emitFile({
          type: "asset",
          fileName: `assets/organizations/sportpaleis/fonts/${fileName}`,
          source: readFileSync(new URL(`./public/assets/organizations/sportpaleis/fonts/${fileName}`, import.meta.url)),
        });
      }
    },
  }],
  build: {
    assetsInlineLimit: 200_000,
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
