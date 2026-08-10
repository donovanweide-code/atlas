import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AuthenticatedSmtpTransport,
  CaptureTransport,
  EnvironmentMailTransport,
  MAIL_ENVIRONMENTS,
  MailFoundation,
  MailFoundationError,
  MemoryMailStore,
  createEnvironmentMailFoundation,
  createMailOrganizations,
} from "../scripts/mail-foundation.mjs";
import { createWbdInvoiceDevelopmentMiddleware } from "../scripts/wbd-invoice-development-api.mjs";

const actor = { id: "wbd-owner-003", name: "WBD owner", role: "owner" };

function request(templateKey, recipient = "donovan@example.test") {
  return templateKey === "WBD_INVOICE_FINAL" ? {
    organizationId: "we-build-and-design",
    contextType: "wbd-invoice",
    contextId: "invoice-test-003",
    templateKey,
    recipient,
    context: { customer: { name: "Technische test" }, invoice: { number: "TEST-003", project: "Mail Foundation 003", total: "€ 0,00", payment_term: "14 dagen", due_date: "22-08-2026" } },
    attachments: [{ id: "safe-test-pdf", filename: "testfactuur.pdf", mimeType: "application/pdf", bytes: Buffer.from("%PDF-1.4\n%%EOF\n") }],
    idempotencyKey: "mail-foundation-003-invoice-test",
  } : {
    organizationId: "we-build-and-design",
    contextType: "smtp-validation",
    contextId: "general-test-003",
    templateKey,
    recipient,
    context: {
      recipient: { name: "Donovan" },
      message: {
        subject: "Uw vernieuwde WBD-mailervaring",
        preheader: "Een korte visuele controle van de vernieuwde WBD-mail.",
        heading: "Kort bijgepraat",
        introduction: "De goedgekeurde WBD-mailervaring is nu technisch verwerkt.",
        body: "Deze gecontroleerde test bevat geen klantgegevens en laat de nieuwe rustige WBD-opbouw zien.",
        next_step: "Controleer de afzender, inhoud, handtekening en weergave op uw telefoon.",
      },
    },
    idempotencyKey: "mail-foundation-003-general-test",
  };
}

class FakeTlsSocket extends EventEmitter {
  constructor({ closeAfterData = false } = {}) {
    super();
    this.authorized = true;
    this.destroyed = false;
    this.closeAfterData = closeAfterData;
    this.writes = [];
    queueMicrotask(() => {
      this.emit("secureConnect");
      setImmediate(() => this.emit("data", "220 fake.smtp ESMTP ready\r\n"));
    });
  }
  setEncoding() {}
  write(value) {
    const text = String(value);
    this.writes.push(text);
    const respond = (line) => setImmediate(() => this.emit("data", `${line}\r\n`));
    if (text.startsWith("EHLO ")) respond("250-fake.smtp\r\n250 AUTH PLAIN");
    else if (text.startsWith("AUTH PLAIN ")) respond("235 2.7.0 authenticated");
    else if (text.startsWith("MAIL FROM:")) respond("250 2.1.0 sender ok");
    else if (text.startsWith("RCPT TO:")) respond("250 2.1.5 recipient ok");
    else if (text === "DATA\r\n") respond("354 end with dot");
    else if (text.endsWith("\r\n.\r\n")) {
      if (this.closeAfterData) setImmediate(() => this.emit("close"));
      else respond("250 2.0.0 queued as TEST003");
    } else if (text === "RSET\r\n") respond("250 reset");
    else if (text === "QUIT\r\n") respond("221 bye");
    return true;
  }
  end() { this.destroyed = true; }
  destroy() { this.destroyed = true; }
}

function smtp(options = {}) {
  return new AuthenticatedSmtpTransport({
    organizationId: options.organizationId ?? "we-build-and-design",
    host: "smtp.transip.email",
    port: 465,
    tlsRequired: true,
    senderPolicy: options.senderPolicy ?? "WBD_GENERAL",
    senderAddress: options.senderAddress ?? "info@webuildanddesign.nl",
    usernameProvider: () => options.username ?? "info@webuildanddesign.nl",
    secretProvider: () => options.secret ?? "fixture-secret-not-logged",
    allowlistedRecipients: options.allowlistedRecipients ?? ["donovan@example.test"],
    connectionFactory: () => {
      const socket = new FakeTlsSocket({ closeAfterData: options.closeAfterData });
      options.socketRecorder?.(socket);
      return socket;
    },
  });
}

test("server-side sender routing kiest info voor algemeen en facturen voor facturen", async () => {
  const foundation = new MailFoundation({
    organizations: createMailOrganizations(),
    store: new MemoryMailStore(),
    transport: new CaptureTransport({ captureDirectory: path.join(tmpdir(), "mail-003-routing") }),
  });
  const general = await foundation.preview({ ...request("WBD_GENERAL_SMTP_TEST"), from: "attacker@example.test", senderPolicy: "WBD_INVOICE" }, actor);
  const invoice = await foundation.preview({ ...request("WBD_INVOICE_FINAL"), from: "attacker@example.test", senderPolicy: "WBD_GENERAL" }, actor);
  assert.equal(general.senderPolicy, "WBD_GENERAL");
  assert.match(general.sender, /info@webuildanddesign\.nl/);
  assert.equal(invoice.senderPolicy, "WBD_INVOICE");
  assert.match(invoice.sender, /facturen@webuildanddesign\.nl/);
  assert.doesNotMatch(`${general.sender} ${invoice.sender}`, /attacker/);
});

test("controlled SMTP blijft dicht zonder exacte environment gate", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "mail-003-gate-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const foundation = createEnvironmentMailFoundation({
    stateFile: path.join(root, "state.json"),
    captureDirectory: path.join(root, "captures"),
    environment: {
      WBD_MAIL_MODE: "CONTROLLED_SMTP_TEST",
      WBD_SMTP_TEST_RECIPIENT: "donovan@example.test",
      WBD_SMTP_INFO_USERNAME: "info@webuildanddesign.nl",
      WBD_SMTP_INFO_PASSWORD: "never-logged",
    },
  });
  const result = await foundation.capture(request("WBD_GENERAL_SMTP_TEST"), actor);
  assert.equal(result.status, "SMTP_SEND_DISABLED");
  assert.equal(result.safeResult.confirmedNotSent, true);
});

test("allowlist weigert wildcard, meerdere ontvangers en niet-allowlisted adressen", async () => {
  for (const configured of ["*", "a@example.test,b@example.test", "a@example.test b@example.test"]) {
    assert.throws(() => createEnvironmentMailFoundation({
      stateFile: path.join(tmpdir(), "unused-state.json"),
      captureDirectory: path.join(tmpdir(), "unused-captures"),
      environment: { WBD_MAIL_MODE: "CONTROLLED_SMTP_TEST", WBD_SMTP_TEST_RECIPIENT: configured },
    }), (error) => error instanceof MailFoundationError && error.code === "SMTP_CONFIG_INVALID");
  }
  assert.throws(() => smtp().validateMessage({ organizationId: "we-build-and-design", senderPolicy: "WBD_GENERAL", from: "We Build And Design <info@webuildanddesign.nl>", to: "other@example.test" }), (error) => error.code === "RECIPIENT_NOT_ALLOWLISTED");
  assert.throws(() => smtp().validateMessage({ organizationId: "we-build-and-design", senderPolicy: "WBD_GENERAL", from: "Aanvaller <attacker@example.test>", to: "donovan@example.test" }), (error) => error.code === "SENDER_NOT_ALLOWED");
});

test("controlled validationroute passeert de bestaande WBD middlewaregrens", async () => {
  const foundation = new MailFoundation({
    organizations: createMailOrganizations(),
    store: new MemoryMailStore(),
    transport: new CaptureTransport({ captureDirectory: path.join(tmpdir(), "mail-003-route") }),
  });
  const middleware = createWbdInvoiceDevelopmentMiddleware({ mailFoundation: foundation });
  const payload = await new Promise((resolve, reject) => {
    const requestObject = {
      url: "/__wbd-mail-validation/general/status",
      method: "GET",
      headers: { "x-wbd-mail-capture": "1" },
      socket: { remoteAddress: "127.0.0.1" },
    };
    const responseObject = {
      statusCode: 0,
      headers: {},
      setHeader(name, value) { this.headers[name] = value; },
      end(body = "") { resolve({ statusCode: this.statusCode, body: JSON.parse(String(body)) }); },
    };
    middleware(requestObject, responseObject, () => reject(new Error("Validationroute viel onterecht door naar Vite.")));
  });
  assert.equal(payload.statusCode, 200);
  assert.equal(payload.body.transport.mode, "CAPTURE");
});

test("SMTP-adapter valideert TLS/auth/sender zonder maildata", async () => {
  const result = await smtp().verify();
  assert.deepEqual(result, { tls: true, authenticated: true, senderAccepted: true, safeMessage: "TLS, authenticatie en afzenderpolicy zijn door SMTP geaccepteerd." });
});

test("SMTP-adapter accepteert exact één allowlisted technische mail", async () => {
  const sockets = [];
  const adapter = smtp({ socketRecorder: (socket) => sockets.push(socket) });
  const organizations = createMailOrganizations();
  const foundation = new MailFoundation({
    organizations,
    store: new MemoryMailStore(),
    transport: new EnvironmentMailTransport({
      mode: MAIL_ENVIRONMENTS.CONTROLLED_SMTP_TEST,
      captureTransport: new CaptureTransport({ captureDirectory: path.join(tmpdir(), "unused-capture") }),
      smtpTransports: { WBD_GENERAL: adapter },
      controlledSmtpEnabled: true,
      controlledTestPolicies: {
        "we-build-and-design": { templates: ["WBD_GENERAL_SMTP_TEST", "WBD_INVOICE_FINAL"], requires: { WBD_INVOICE_FINAL: "WBD_GENERAL_SMTP_TEST" } },
      },
    }),
  });
  const result = await foundation.capture(request("WBD_GENERAL_SMTP_TEST"), actor);
  assert.equal(result.status, "SMTP_ACCEPTED");
  assert.equal(result.referenceId, "TEST003");
  const mimeData = sockets[0].writes.find((value) => value.endsWith("\r\n.\r\n"));
  assert.match(mimeData, /Content-ID: <brand-we-build-and-design-email-logo>/);
  assert.match(mimeData, /Content-Disposition: inline; filename="wbd-logo-mail-safe\.png"/);
  assert.doesNotMatch(mimeData, /assets\/organizations|C:\\Users/i);
  const duplicate = await foundation.capture(request("WBD_GENERAL_SMTP_TEST"), actor);
  assert.equal(duplicate.duplicate, true);
  const events = await foundation.events();
  assert.equal(events.filter(({ name }) => name === "MAIL_SEND_ATTEMPTED").length, 1);
});

test("factuur-SMTP blijft geblokkeerd vóór algemene acceptatie en maximaal één test per type", async () => {
  const store = new MemoryMailStore();
  const transport = new EnvironmentMailTransport({
    mode: MAIL_ENVIRONMENTS.CONTROLLED_SMTP_TEST,
    captureTransport: new CaptureTransport({ captureDirectory: path.join(tmpdir(), "unused-capture-sequence") }),
    smtpTransports: {
      WBD_GENERAL: smtp(),
      WBD_INVOICE: smtp({ senderPolicy: "WBD_INVOICE", senderAddress: "facturen@webuildanddesign.nl" }),
    },
    controlledSmtpEnabled: true,
    controlledTestPolicies: {
      "we-build-and-design": { templates: ["WBD_GENERAL_SMTP_TEST", "WBD_INVOICE_FINAL"], requires: { WBD_INVOICE_FINAL: "WBD_GENERAL_SMTP_TEST" } },
    },
  });
  const foundation = new MailFoundation({ organizations: createMailOrganizations(), store, transport });
  const earlyInvoice = await foundation.capture(request("WBD_INVOICE_FINAL"), actor);
  assert.equal(earlyInvoice.status, "SMTP_TEST_SEQUENCE_BLOCKED");
  const general = await foundation.capture(request("WBD_GENERAL_SMTP_TEST"), actor);
  assert.equal(general.status, "SMTP_ACCEPTED");
  const invoiceRequest = { ...request("WBD_INVOICE_FINAL"), idempotencyKey: "mail-foundation-003-invoice-after-general" };
  const invoice = await foundation.capture(invoiceRequest, actor);
  assert.equal(invoice.status, "SMTP_ACCEPTED");
  const secondGeneral = await foundation.capture({ ...request("WBD_GENERAL_SMTP_TEST"), idempotencyKey: "mail-foundation-003-second-general" }, actor);
  assert.equal(secondGeneral.status, "CONTROLLED_TEST_LIMIT_REACHED");
  const secondInvoice = await foundation.capture({ ...invoiceRequest, idempotencyKey: "mail-foundation-003-second-invoice" }, actor);
  assert.equal(secondInvoice.status, "CONTROLLED_TEST_LIMIT_REACHED");
});

test("verbindingverlies na DATA wordt UNKNOWN_PARTIAL_SEND zonder retry", async () => {
  const adapter = smtp({ closeAfterData: true });
  const message = {
    messageId: "mail-safe-unknown-003",
    organizationId: "we-build-and-design",
    contextType: "smtp-validation",
    contextId: "unknown-003",
    senderPolicy: "WBD_GENERAL",
    from: "We Build And Design <info@webuildanddesign.nl>",
    to: "donovan@example.test",
    subject: "Technische test",
    html: "<p>Test</p>",
    text: "Test",
    attachments: [],
  };
  const result = await adapter.send(message);
  assert.equal(result.code, "UNKNOWN_PARTIAL_SEND");
  assert.equal(result.confirmedNotSent, false);
});

test("ontbrekende credentials falen veilig en lekken geen secretvelden", async () => {
  const adapter = smtp({ username: "", secret: "" });
  await assert.rejects(() => adapter.verify(), (error) => error.code === "SMTP_CREDENTIAL_MISSING" && !/password|secret/i.test(error.message));
  const summary = adapter.publicSummary();
  assert.equal(summary.credentialStatus, "NOT_PROVISIONED");
  assert.doesNotMatch(JSON.stringify(summary), /fixture-secret|password/i);
});

test("Sportpaleis blijft buiten controlled SMTP", () => {
  assert.throws(() => smtp().validateMessage({ organizationId: "sportpaleis", senderPolicy: "WBD_GENERAL", from: "We Build And Design <info@webuildanddesign.nl>", to: "donovan@example.test" }), (error) => error.code === "PERMISSION_DENIED");
});
