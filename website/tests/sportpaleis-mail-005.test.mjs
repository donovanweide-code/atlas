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
import { createOrganizationBrandRegistry } from "../scripts/organization-brand-foundation.mjs";

const actor = { id: "sportpaleis-admin-005", name: "Sportpaleis admin", role: "admin" };

function request(idempotencyKey = "sportpaleis-mail-005-controlled-v1") {
  return {
    organizationId: "sportpaleis",
    contextType: "smtp-validation",
    contextId: "sportpaleis-mail-005",
    templateKey: "SPORTPALEIS_BEDRUKKING_SMTP_TEST",
    recipient: "donovan@example.test",
    context: { recipient: { name: "Donovan" }, test: { reference: "SPORTPALEIS-MAIL-005" } },
    idempotencyKey,
  };
}

class FakeTlsSocket extends EventEmitter {
  constructor({ authReject = false, senderReject = false } = {}) {
    super();
    this.authorized = true;
    this.destroyed = false;
    this.authReject = authReject;
    this.senderReject = senderReject;
    this.writes = [];
    queueMicrotask(() => {
      this.emit("secureConnect");
      setImmediate(() => this.emit("data", "220 fake.vdx ESMTP ready\r\n"));
    });
  }
  setEncoding() {}
  write(value) {
    const text = String(value);
    this.writes.push(text);
    const respond = (line) => setImmediate(() => this.emit("data", `${line}\r\n`));
    if (text.startsWith("EHLO ")) respond("250-fake.vdx\r\n250 AUTH PLAIN LOGIN");
    else if (text.startsWith("AUTH PLAIN ")) respond(this.authReject ? "535 authentication rejected" : "235 authenticated");
    else if (text.startsWith("MAIL FROM:")) respond(this.senderReject ? "550 sender rejected" : "250 sender ok");
    else if (text.startsWith("RCPT TO:")) respond("250 recipient ok");
    else if (text === "DATA\r\n") respond("354 continue");
    else if (text.endsWith("\r\n.\r\n")) respond("250 queued as SPORT005");
    else if (text === "RSET\r\n") respond("250 reset");
    else if (text === "QUIT\r\n") respond("221 bye");
    return true;
  }
  end() { this.destroyed = true; }
  destroy() { this.destroyed = true; }
}

function smtp(options = {}) {
  return new AuthenticatedSmtpTransport({
    organizationId: "sportpaleis",
    host: "mail.hostingserver.nl",
    port: 465,
    tlsRequired: true,
    senderPolicy: "SPORTPALEIS_BEDRUKKING",
    senderAddress: "bedrukking@sportpaleis.nl",
    usernameProvider: () => options.username ?? "bedrukking@sportpaleis.nl",
    secretProvider: () => options.secret ?? "fixture-secret-not-logged",
    allowlistedRecipients: ["donovan@example.test"],
    clientHostname: "workspace.sportpaleis.nl",
    connectionFactory: () => {
      const socket = new FakeTlsSocket({ authReject: options.authReject, senderReject: options.senderReject });
      options.socketRecorder?.(socket);
      return socket;
    },
  });
}

test("Sportpaleis gebruikt het Bedrukking sender contract en goedgekeurde CID authority", () => {
  const organization = createMailOrganizations().sportpaleis;
  assert.equal(organization.defaultSenderPolicy, "SPORTPALEIS_BEDRUKKING");
  assert.equal(organization.senderPolicies.SPORTPALEIS_BEDRUKKING.address, "bedrukking@sportpaleis.nl");
  assert.equal(organization.replyTo, "bedrukking@sportpaleis.nl");
  assert.equal(organization.messageIdDomain, "sportpaleis.nl");
  assert.deepEqual(Object.keys(organization.templates).filter((key) => key.includes("SMTP_TEST")), ["SPORTPALEIS_BEDRUKKING_SMTP_TEST"]);
  const brand = createOrganizationBrandRegistry().get("sportpaleis");
  assert.equal(brand.metadata.status, "approved");
  assert.equal(brand.brand.primary_color, "#D10019");
  assert.equal(brand.brand.accent_color, "#000000");
  assert.match(brand.brand.heading_font_stack, /Chevin Pro/);
  assert.equal(brand.assets.email_logo.status, "approved");
  assert.equal(brand.assets.email_logo.reference, "cid:brand-sportpaleis-email-logo");
  assert.equal(brand.assets.email_logo.sha256, "70c424dcd371bb7f690946d24b6f3aeeea3f7d0f276928c4707951eb8bdd4bb4");
  assert.doesNotMatch(JSON.stringify(brand), /C:\\Users|C:\/Users/i);
});

test("preview negeert aangeleverde afzenders en gebruikt server-side Bedrukking", async () => {
  const foundation = new MailFoundation({
    organizations: createMailOrganizations(),
    store: new MemoryMailStore(),
    transport: new CaptureTransport({ captureDirectory: path.join(tmpdir(), "sportpaleis-mail-005-preview") }),
  });
  const preview = await foundation.preview({ ...request(), from: "attacker@example.test", senderPolicy: "WBD_GENERAL" }, actor);
  assert.equal(preview.senderPolicy, "SPORTPALEIS_BEDRUKKING");
  assert.match(preview.sender, /bedrukking@sportpaleis\.nl/);
  assert.match(preview.subject, /^\[TEST\]/);
  assert.doesNotMatch(preview.sender, /attacker/);
});

test("Sportpaleis controlled SMTP blijft dicht zonder exacte organisatiegate", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-mail-005-gate-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const foundation = createEnvironmentMailFoundation({
    stateFile: path.join(root, "state.json"),
    captureDirectory: path.join(root, "captures"),
    environment: {
      SPORTPALEIS_MAIL_MODE: "CONTROLLED_SMTP_TEST",
      SPORTPALEIS_SMTP_TEST_RECIPIENT: "donovan@example.test",
      SPORTPALEIS_SMTP_BEDRUKKING_USERNAME: "bedrukking@sportpaleis.nl",
      SPORTPALEIS_SMTP_BEDRUKKING_PASSWORD: "never-logged",
    },
  });
  const result = await foundation.capture(request(), actor);
  assert.equal(result.status, "SMTP_SEND_DISABLED");
  assert.equal(result.safeResult.confirmedNotSent, true);
});

test("Sportpaleis allowlist is exact en organisatie-isolatie blokkeert WBD", () => {
  assert.throws(() => smtp().validateMessage({ organizationId: "we-build-and-design", senderPolicy: "SPORTPALEIS_BEDRUKKING", from: "Sportpaleis <bedrukking@sportpaleis.nl>", to: "donovan@example.test" }), (error) => error.code === "PERMISSION_DENIED");
  assert.throws(() => smtp().validateMessage({ organizationId: "sportpaleis", senderPolicy: "SPORTPALEIS_BEDRUKKING", from: "Sportpaleis <bedrukking@sportpaleis.nl>", to: "customer@example.test" }), (error) => error.code === "RECIPIENT_NOT_ALLOWLISTED");
  assert.throws(() => smtp().validateMessage({ organizationId: "sportpaleis", senderPolicy: "SPORTPALEIS_BEDRUKKING", from: "Aanvaller <attacker@example.test>", to: "donovan@example.test" }), (error) => error.code === "SENDER_NOT_ALLOWED");
});

test("Sportpaleis allowlist weigert wildcards en meerdere adressen", () => {
  for (const value of ["*", "a@example.test,b@example.test", "a@example.test b@example.test"]) {
    assert.throws(() => createEnvironmentMailFoundation({
      stateFile: path.join(tmpdir(), "unused-sportpaleis-mail-state.json"),
      captureDirectory: path.join(tmpdir(), "unused-sportpaleis-mail-captures"),
      environment: { SPORTPALEIS_MAIL_MODE: "CONTROLLED_SMTP_TEST", SPORTPALEIS_SMTP_TEST_RECIPIENT: value },
    }), (error) => error instanceof MailFoundationError && error.code === "SMTP_CONFIG_INVALID");
  }
});

test("exact één gecontroleerde Sportpaleis-test bewaart identifiers, history en audit", async () => {
  const sockets = [];
  const store = new MemoryMailStore();
  const foundation = new MailFoundation({
    organizations: createMailOrganizations(),
    store,
    transport: new EnvironmentMailTransport({
      mode: MAIL_ENVIRONMENTS.CONTROLLED_SMTP_TEST,
      captureTransport: new CaptureTransport({ captureDirectory: path.join(tmpdir(), "unused-sportpaleis-mail-capture") }),
      smtpTransports: { SPORTPALEIS_BEDRUKKING: smtp({ socketRecorder: (socket) => sockets.push(socket) }) },
      controlledSmtpOrganizations: ["sportpaleis"],
      controlledTestPolicies: { sportpaleis: { templates: ["SPORTPALEIS_BEDRUKKING_SMTP_TEST"], requires: {} } },
    }),
  });
  const sent = await foundation.capture(request(), actor);
  assert.equal(sent.status, "SMTP_ACCEPTED");
  assert.equal(sent.referenceId, "SPORT005");
  const mime = sockets[0].writes.find((value) => value.endsWith("\r\n.\r\n"));
  assert.match(mime, /From: .*bedrukking@sportpaleis\.nl/);
  assert.match(mime, /Reply-To: bedrukking@sportpaleis\.nl/);
  assert.match(mime, /Message-ID: <mail-[^>]+@sportpaleis\.nl>/);
  assert.match(mime, /X-Sportpaleis-Sender-Policy: SPORTPALEIS_BEDRUKKING/);
  const duplicate = await foundation.capture(request(), actor);
  assert.equal(duplicate.duplicate, true);
  const blocked = await foundation.capture(request("sportpaleis-mail-005-controlled-v2"), actor);
  assert.equal(blocked.status, "CONTROLLED_TEST_LIMIT_REACHED");
  const history = await foundation.history({ organizationId: "sportpaleis", contextType: "smtp-validation", contextId: "sportpaleis-mail-005" }, actor);
  assert.equal(history.filter((attempt) => attempt.status === "SMTP_ACCEPTED").length, 1);
  assert.equal((await foundation.events()).filter((event) => event.name === "MAIL_SEND_ATTEMPTED").length, 2);
});

test("ontbrekende VDX-credentials falen veilig zonder secretlek", async () => {
  const adapter = smtp({ username: "", secret: "" });
  await assert.rejects(() => adapter.verify(), (error) => error.code === "SMTP_CREDENTIAL_MISSING" && !/password|secret/i.test(error.message));
  assert.equal(adapter.publicSummary().credentialStatus, "NOT_PROVISIONED");
  assert.doesNotMatch(JSON.stringify(adapter.publicSummary()), /fixture-secret|password/i);
});

test("Sportpaleis diagnose onderscheidt AUTH van sender-policy zonder providerdetails te lekken", async () => {
  await assert.rejects(
    () => smtp({ authReject: true }).verify({ diagnostic: true }),
    (error) => error.code === "SMTP_AUTHENTICATION_FAILED" && error.message === "VDX heeft de SMTP-authenticatie niet geaccepteerd.",
  );
  await assert.rejects(
    () => smtp({ senderReject: true }).verify({ diagnostic: true }),
    (error) => error.code === "SMTP_SENDER_REJECTED" && error.message === "VDX heeft de geconfigureerde afzender niet geaccepteerd.",
  );
  await assert.rejects(
    () => smtp({ authReject: true }).verify(),
    (error) => error.code === "SMTP_VALIDATION_FAILED",
  );
});

test("credential-handoff valideert AUTH en afzender maar bereikt nooit RCPT of DATA", async () => {
  const sockets = [];
  const result = await smtp({ socketRecorder: (socket) => sockets.push(socket) }).verify({ diagnostic: true });
  assert.equal(result.authenticated, true);
  assert.equal(result.senderAccepted, true);
  assert.equal(sockets.length, 1);
  assert.ok(sockets[0].writes.some((value) => value.startsWith("AUTH PLAIN ")));
  assert.ok(sockets[0].writes.some((value) => value.startsWith("MAIL FROM:")));
  assert.ok(sockets[0].writes.some((value) => value === "RSET\r\n"));
  assert.ok(sockets[0].writes.some((value) => value === "QUIT\r\n"));
  assert.ok(!sockets[0].writes.some((value) => value.startsWith("RCPT TO:")));
  assert.ok(!sockets[0].writes.some((value) => value === "DATA\r\n"));
  assert.ok(!sockets[0].writes.some((value) => value.endsWith("\r\n.\r\n")));
});

test("tegenstrijdige organisatie-mailmodi worden geweigerd", () => {
  assert.throws(() => createEnvironmentMailFoundation({
    stateFile: path.join(tmpdir(), "unused-conflicting-mail-state.json"),
    captureDirectory: path.join(tmpdir(), "unused-conflicting-mail-captures"),
    environment: { WBD_MAIL_MODE: "CONTROLLED_SMTP_TEST", SPORTPALEIS_MAIL_MODE: "PRODUCTION_SMTP" },
  }), (error) => error.code === "SMTP_CONFIG_INVALID");
});
