import { defineConfig, type Plugin } from "vite";

function canonicalExperienceRedirects(): Plugin {
  const installRedirect = (middlewares: {
    use: (handler: (
      request: { url?: string },
      response: {
        statusCode: number;
        setHeader: (name: string, value: string) => void;
        end: () => void;
      },
      next: () => void,
    ) => void) => void;
  }) => {
    middlewares.use((request, response, next) => {
      const pathname = new URL(request.url ?? "/", "http://experience.local").pathname;
      if (pathname !== "/first-visit-v2.html") {
        next();
        return;
      }
      response.statusCode = 307;
      response.setHeader("Location", "/ervaar");
      response.setHeader("Cache-Control", "no-store");
      response.end();
    });
  };

  return {
    name: "experience-canonical-route-redirects",
    configureServer: (server) => installRedirect(server.middlewares),
    configurePreviewServer: (server) => installRedirect(server.middlewares),
  };
}

export default defineConfig({
  plugins: [canonicalExperienceRedirects()],
  publicDir: "experience-public",
  build: {
    outDir: "dist-experience",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        experience: "experience.html",
      },
      output: {
        entryFileNames: "assets/experience-[hash].js",
        chunkFileNames: "assets/experience-[hash].js",
        assetFileNames: "assets/experience-[hash][extname]",
      },
    },
  },
});
