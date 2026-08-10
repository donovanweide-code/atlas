import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist-context-first",
    emptyOutDir: true,
    rollupOptions: {
      input: "context-first-experiment.html",
      output: {
        entryFileNames: "assets/context-first-[hash].js",
        chunkFileNames: "assets/context-first-[hash].js",
        assetFileNames: "assets/context-first-[hash][extname]",
      },
    },
  },
});
