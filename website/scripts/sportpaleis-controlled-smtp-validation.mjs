import path from "node:path";
import { fileURLToPath } from "node:url";

import { createEnvironmentMailFoundation, MAIL_ENVIRONMENTS, MailFoundationError } from "./mail-foundation.mjs";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const stateFile = path.join(websiteRoot, "data", "mail-foundation", "sportpaleis-005-controlled-smtp-state.json");
const captureDirectory = path.join(websiteRoot, "data", "mail-foundation", "sportpaleis-005-controlled-smtp-captures");
const command = String(process.argv[2] ?? "status").trim().toLowerCase();
const actor = { id: "sportpaleis-mail-005-admin", name: "Sportpaleis Mail 005 beheerder", role: "admin" };

function controlledRequest() {
  return {
    organizationId: "sportpaleis",
    contextType: "smtp-validation",
    contextId: "sportpaleis-mail-005",
    templateKey: "SPORTPALEIS_BEDRUKKING_SMTP_TEST",
    recipient: process.env.SPORTPALEIS_SMTP_TEST_RECIPIENT,
    context: { recipient: { name: "Donovan" }, test: { reference: "SPORTPALEIS-MAIL-005" } },
    idempotencyKey: "sportpaleis-mail-005-controlled-real-v2",
  };
}

function safeOutput(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

try {
  const foundation = createEnvironmentMailFoundation({ stateFile, captureDirectory });
  const transport = foundation.transport;
  if (transport.mode !== MAIL_ENVIRONMENTS.CONTROLLED_SMTP_TEST) {
    throw new MailFoundationError("SMTP_SEND_DISABLED", "SPORTPALEIS_MAIL_MODE moet expliciet CONTROLLED_SMTP_TEST zijn.", 503);
  }
  if (command === "status") {
    safeOutput({
      mode: transport.mode,
      externalNetworkEnabled: transport.externalNetworkEnabled,
      sender: transport.publicSummary({ senderPolicy: "SPORTPALEIS_BEDRUKKING" }),
      realMailSent: false,
    });
  } else if (command === "preview") {
    safeOutput(await foundation.preview(controlledRequest(), actor));
  } else if (command === "verify") {
    safeOutput(await transport.verify("SPORTPALEIS_BEDRUKKING", "sportpaleis", { diagnostic: true }));
  } else if (command === "handoff") {
    if (process.env.SPORTPALEIS_CREDENTIAL_HANDOFF_CONFIRMATION !== "YES_CREDENTIAL_HANDOFF_ONLY_NO_SEND") {
      throw new MailFoundationError("SMTP_SEND_DISABLED", "De credential-handoff safety gate is gesloten.", 503);
    }
    const sender = transport.publicSummary({ senderPolicy: "SPORTPALEIS_BEDRUKKING" });
    if (sender.smtp?.credentialStatus !== "PROVISIONED") {
      throw new MailFoundationError("SMTP_CREDENTIAL_MISSING", "SMTP-credentials zijn niet veilig geprovisioneerd.", 503);
    }
    const verification = await transport.verify("SPORTPALEIS_BEDRUKKING", "sportpaleis", { diagnostic: true });
    safeOutput({
      credentialHandoff: true,
      authenticated: verification.authenticated === true,
      senderAccepted: verification.senderAccepted === true,
      smtpDataIssued: false,
      realMailSent: false,
      safeMessage: "Credential-handoff bevestigd; de sessie is na RSET en voor RCPT/DATA gesloten.",
    });
  } else if (command === "send") {
    if (process.env.SPORTPALEIS_SEND_CONFIRMATION !== "YES_HUMAN_GO_SPORTPALEIS_MAIL_005") {
      throw new MailFoundationError("SMTP_SEND_DISABLED", "De afzonderlijke menselijke send-GO ontbreekt.", 503);
    }
    const sender = transport.publicSummary({ senderPolicy: "SPORTPALEIS_BEDRUKKING" });
    if (sender.smtp?.credentialStatus !== "PROVISIONED") {
      throw new MailFoundationError("SMTP_CREDENTIAL_MISSING", "SMTP-credentials zijn niet veilig geprovisioneerd; er is geen mailpoging gereserveerd.", 503);
    }
    const result = await foundation.capture(controlledRequest(), actor);
    safeOutput({ status: result.status, referenceId: result.referenceId, duplicate: result.duplicate, safeResult: result.safeResult });
  } else {
    throw new MailFoundationError("COMMAND_INVALID", "Gebruik status, preview, verify, handoff of send.", 400);
  }
} catch (error) {
  const safe = error instanceof MailFoundationError
    ? { ok: false, code: error.code, message: error.message }
    : { ok: false, code: "SMTP_VALIDATION_FAILED", message: "De gecontroleerde Sportpaleis SMTP-validatie is veilig gestopt." };
  safeOutput(safe);
  process.exitCode = 1;
}
