import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    assetsInlineLimit: 200_000,
    outDir: "dist-workspace",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        workspace: "workspace.html",
      },
      output: {
        entryFileNames: "assets/workspace-[hash].js",
        chunkFileNames: "assets/workspace-[hash].js",
        assetFileNames: "assets/workspace-[hash][extname]",
      },
    },
  },
});
