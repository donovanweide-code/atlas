import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  plugins: command === "serve"
    ? [
        {
          name: "atlas-internal-development-routes",
          transformIndexHtml(html) {
            return html.replace("/src/main.ts", "/src/development-main.ts");
          },
          configureServer(server) {
            server.middlewares.use((request, _response, next) => {
              const requestUrl = new URL(request.url ?? "/", "http://localhost");
              if (requestUrl.pathname === "/atlas" || requestUrl.pathname === "/atlas-lab") {
                request.url = `/internal.html${requestUrl.search}`;
              }
              next();
            });
          },
        },
      ]
    : [],
}));
