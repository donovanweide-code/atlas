import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { CaptureTransport, MailFoundation, MemoryMailStore, createMailOrganizations } from "./mail-foundation.mjs";
import { SportpaleisFileStore, SportpaleisPilotService } from "./sportpaleis-pilot-foundation.mjs";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(websiteRoot, "output", "sportpaleis-readiness-004-review");
const fixtureDirectory = path.join(websiteRoot, "tmp", "sportpaleis-readiness-004-mail-review");
await mkdir(outputDirectory, { recursive: true });
await mkdir(fixtureDirectory, { recursive: true });

const seedPasswords = {
  kevin: "Readiness-Mail-Kevin-004!",
  patrick: "Readiness-Mail-Patrick-004!",
  collega: "Readiness-Mail-Store-004!",
  "donovan-support": "Readiness-Mail-Support-004!",
};
const store = new SportpaleisFileStore({
  filePath: path.join(fixtureDirectory, "state.json"),
  backupDirectory: path.join(fixtureDirectory, "backups"),
  seedPasswords,
});
const mailFoundation = new MailFoundation({
  organizations: createMailOrganizations(),
  store: new MemoryMailStore(),
  transport: new CaptureTransport({ captureDirectory: path.join(fixtureDirectory, "captures") }),
});
const service = new SportpaleisPilotService({
  store,
  mailFoundation,
  allowedOrigin: "http://127.0.0.1:5189",
  demoMode: true,
  releaseId: "SPW-BEDRUKKING-PILOT-READINESS-004-20260810",
});
await service.initialize();
const admin = await service.login({ email: "kevin@sportpaleis.nl", password: seedPasswords.kevin });
const bootstrap = await service.bootstrap(admin.token);
const order = bootstrap.orders.find(({ customerEmail }) => customerEmail) ?? bootstrap.orders[0];
const preview = await service.previewOrderMail(admin.token, order.id, { templateKey: "ORDER_RECEIVED" });
const html = preview.html.replaceAll("cid:brand-sportpaleis-email-logo", "/assets/organizations/sportpaleis/brand-006/sportpaleis-logo-mail-safe.png");
await writeFile(path.join(outputDirectory, "sportpaleis-mail-review.html"), html, "utf8");
console.log(JSON.stringify({ output: path.join(outputDirectory, "sportpaleis-mail-review.html"), transport: preview.transport, orderId: order.id }));
