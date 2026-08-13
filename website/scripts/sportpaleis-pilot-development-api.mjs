import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SportpaleisFileStore,
  SportpaleisPilotService,
  createSportpaleisPilotRequestHandler,
  seedPasswordsFromEnvironment,
} from "./sportpaleis-pilot-foundation.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptDirectory, "..");

export function createSportpaleisPilotDevelopmentMiddleware(options = {}) {
  let handlerPromise;
  const getHandler = () => {
    if (!handlerPromise) {
      handlerPromise = (async () => {
        const store = new SportpaleisFileStore({
          filePath: options.filePath ?? process.env.SPORTPALEIS_DATA_FILE ?? path.join(websiteRoot, "data", "sportpaleis-pilot", "development-state.json"),
          backupDirectory: options.backupDirectory ?? process.env.SPORTPALEIS_BACKUP_DIRECTORY ?? path.join(websiteRoot, "data", "sportpaleis-pilot", "backups"),
          seedPasswords: options.seedPasswords ?? seedPasswordsFromEnvironment(),
        });
        const service = new SportpaleisPilotService({
          store,
          mailFoundation: options.mailFoundation,
          releaseId: options.releaseId ?? process.env.RELEASE_ID ?? "SPW-FUNCTIONAL-PILOT-FREEZE-READY-001-20260811",
          secureCookies: false,
          allowedOrigin: options.allowedOrigin ?? process.env.SPORTPALEIS_ALLOWED_ORIGIN ?? "http://127.0.0.1:5173",
          demoMode: options.demoMode ?? process.env.SPORTPALEIS_REVIEW_DEMO === "true",
          uploadsEnabled: options.uploadsEnabled ?? process.env.SPORTPALEIS_UPLOADS_ENABLED === "true",
          fontUploadsEnabled: options.fontUploadsEnabled ?? process.env.SPORTPALEIS_FONT_UPLOADS_ENABLED === "true",
        });
        await service.initialize();
        return createSportpaleisPilotRequestHandler(service);
      })();
    }
    return handlerPromise;
  };

  return async function sportpaleisPilotDevelopmentMiddleware(request, response, next) {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (!pathname.startsWith("/api/sportpaleis/v1/")
      && pathname !== "/health/sportpaleis"
      && pathname !== "/ready/sportpaleis") {
      next();
      return;
    }
    try {
      const handled = await (await getHandler())(request, response);
      if (!handled) next();
    } catch {
      response.statusCode = 503;
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      response.setHeader("Cache-Control", "no-store");
      response.end(`${JSON.stringify({ error: "PILOT_NOT_CONFIGURED", message: "De lokale pilotservice mist veilige omgevingsconfiguratie." })}\n`);
    }
  };
}
