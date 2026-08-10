import path from "node:path";
import { fileURLToPath } from "node:url";

import { createEnvironmentMailFoundation, MAIL_ENVIRONMENTS, MailFoundationError } from "./mail-foundation.mjs";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateFile = path.join(websiteRoot, "data", "mail-foundation", "controlled-smtp-state.json");
const captureDirectory = path.join(websiteRoot, "data", "mail-foundation", "controlled-smtp-captures");
const command = String(process.argv[2] ?? "status").trim().toLowerCase();
const actor = { id: "wbd-controlled-smtp-owner", name: "WBD eigenaar", role: "owner" };

function generalRequest() {
  return {
    organizationId: "we-build-and-design",
    contextType: "smtp-validation",
    contextId: "mail-foundation-003-general",
    templateKey: "WBD_GENERAL_SMTP_TEST",
    recipient: process.env.WBD_SMTP_TEST_RECIPIENT,
    context: { recipient: { name: "Donovan" } },
    idempotencyKey: "mail-foundation-003-general-real-v1",
  };
}

function safeOutput(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

try {
  const foundation = createEnvironmentMailFoundation({ stateFile, captureDirectory });
  const transport = foundation.transport;
  if (transport.mode !== MAIL_ENVIRONMENTS.CONTROLLED_SMTP_TEST) {
    throw new MailFoundationError("SMTP_SEND_DISABLED", "WBD_MAIL_MODE moet expliciet CONTROLLED_SMTP_TEST zijn.", 503);
  }
  if (command === "status") {
    safeOutput({
      mode: transport.mode,
      externalNetworkEnabled: transport.externalNetworkEnabled,
      general: transport.publicSummary({ senderPolicy: "WBD_GENERAL" }),
      invoice: transport.publicSummary({ senderPolicy: "WBD_INVOICE" }),
    });
  } else if (command === "preview-general") {
    safeOutput(await foundation.preview(generalRequest(), actor));
  } else if (command === "verify-general") {
    safeOutput(await transport.verify("WBD_GENERAL"));
  } else if (command === "verify-invoice") {
    safeOutput(await transport.verify("WBD_INVOICE"));
  } else if (command === "send-general") {
    const result = await foundation.capture(generalRequest(), actor);
    safeOutput({ status: result.status, referenceId: result.referenceId, duplicate: result.duplicate, safeResult: result.safeResult });
  } else {
    throw new MailFoundationError("COMMAND_INVALID", "Gebruik status, preview-general, verify-general, verify-invoice of send-general.", 400);
  }
} catch (error) {
  const safe = error instanceof MailFoundationError
    ? { ok: false, code: error.code, message: error.message }
    : { ok: false, code: "SMTP_VALIDATION_FAILED", message: "De gecontroleerde SMTP-validatie is veilig gestopt." };
  safeOutput(safe);
  process.exitCode = 1;
}
