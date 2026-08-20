import { defineConfig } from "vite";
import { createWbdInvoiceDevelopmentMiddleware } from "./scripts/wbd-invoice-development-api.mjs";
import { createWbdWorkspaceFoundationMiddleware } from "./scripts/wbd-workspace-foundation-api.mjs";
import { createSportpaleisPilotDevelopmentMiddleware } from "./scripts/sportpaleis-pilot-development-api.mjs";
import { createEnvironmentMailFoundation } from "./scripts/mail-foundation.mjs";
import { createPublicStaticBoundaryPlugin } from "./scripts/public-static-boundary.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = path.dirname(fileURLToPath(import.meta.url));

function mailStateFile(): string {
  const configured = String(process.env.WBD_MAIL_STATE_BASENAME ?? "development-state.json").trim();
  if (!/^[a-z0-9-]+\.json$/i.test(configured)) throw new Error("WBD_MAIL_STATE_BASENAME is ongeldig.");
  return path.join(websiteRoot, "data", "mail-foundation", configured);
}

function isInternalDevelopmentRoute(pathname: string): boolean {
  return pathname === "/atlas"
    || pathname === "/atlas/fundament"
    || pathname === "/experience"
    || pathname === "/workspace/experience"
    || pathname.startsWith("/workspace/experience/")
    || pathname === "/atlas-lab"
    || pathname === "/workspace/wbd"
    || pathname.startsWith("/workspace/wbd/")
    || pathname === "/workspace/sportpaleis"
    || pathname.startsWith("/workspace/sportpaleis/")
    || pathname === "/sportpaleis-proof";
}

function handleWorkspaceProbe(
  request: { method?: string; url?: string },
  response: {
    statusCode: number;
    setHeader: (name: string, value: string | number) => void;
    end: (body?: string) => void;
  },
): boolean {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (pathname !== "/health" && pathname !== "/ready") return false;

  const method = request.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    response.statusCode = 405;
    response.setHeader("Allow", "GET, HEAD");
    response.setHeader("Cache-Control", "no-store");
    response.end();
    return true;
  }

  const body = `${JSON.stringify({ status: pathname === "/health" ? "ok" : "ready" })}\n`;
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.end(method === "HEAD" ? undefined : body);
  return true;
}

export default defineConfig(({ command }) => ({
  publicDir: command === "serve" ? "public" : false,
  plugins: [
    createPublicStaticBoundaryPlugin({ publicDirectory: path.join(websiteRoot, "public") }),
    ...(command === "serve"
      ? [
        {
          name: "atlas-internal-development-routes",
          transformIndexHtml(html, context) {
            const requestUrl = new URL(context.originalUrl ?? context.path, "http://localhost");
            const entrypoint = isInternalDevelopmentRoute(requestUrl.pathname)
              ? "/src/internal-main.ts"
              : "/src/development-main.ts";
            return html.replace("/src/main.ts", entrypoint);
          },
          configureServer(server) {
            const mailFoundation = createEnvironmentMailFoundation({
              stateFile: mailStateFile(),
              captureDirectory: path.join(websiteRoot, "data", "mail-foundation", "captures"),
              simulation: "success",
            });
            server.middlewares.use((request, response, next) => {
              if (!handleWorkspaceProbe(request, response)) next();
            });
            server.middlewares.use(createWbdWorkspaceFoundationMiddleware());
            server.middlewares.use(createWbdInvoiceDevelopmentMiddleware({ mailFoundation }));
            server.middlewares.use(createSportpaleisPilotDevelopmentMiddleware({
              mailFoundation,
              allowedOrigin: process.env.SPORTPALEIS_ALLOWED_ORIGIN ?? `http://127.0.0.1:${server.config.server.port ?? 5173}`,
            }));
            server.middlewares.use((request, _response, next) => {
              const requestUrl = new URL(request.url ?? "/", "http://localhost");
              if (isInternalDevelopmentRoute(requestUrl.pathname)) {
                request.url = `/internal.html${requestUrl.search}`;
              }
              next();
            });
          },
        },
      ]
      : []),
  ],
}));
