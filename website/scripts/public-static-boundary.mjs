import { readFile } from "node:fs/promises";
import path from "node:path";

export const PUBLIC_STATIC_ALLOWLIST = Object.freeze([
  ".htaccess",
  "404.html",
  "apple-touch-icon.png",
  "favicon.ico",
  "favicon.svg",
  "icons.svg",
  "robots.txt",
  "safari-pinned-tab.svg",
  "sitemap.xml",
]);

export async function collectApprovedPublicStaticAssets(publicDirectory) {
  const publicRoot = path.resolve(publicDirectory);
  return Promise.all(PUBLIC_STATIC_ALLOWLIST.map(async (fileName) => ({
    fileName,
    source: await readFile(path.join(publicRoot, fileName)),
  })));
}

export function createPublicStaticBoundaryPlugin({ publicDirectory }) {
  return {
    name: "wbd-explicit-public-static-boundary",
    apply: "build",
    async generateBundle() {
      const assets = await collectApprovedPublicStaticAssets(publicDirectory);
      for (const asset of assets) this.emitFile({ type: "asset", ...asset });
    },
  };
}
