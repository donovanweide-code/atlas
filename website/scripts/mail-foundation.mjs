import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import tls from "node:tls";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildOrganizationMailShell,
  buildOrganizationPlainTextFooter,
  createOrganizationBrandRegistry,
  publicBrandSummary,
} from "./organization-brand-foundation.mjs";

const EMAIL_PATTERN = /^[^\s@<>\r\n,;]+@[^\s@<>\r\n,;]+\.[^\s@<>\r\n,;]+$/;
const HEADER_BREAK = /[\r\n]/;
const SECRET_PATTERN = /(password|passwd|smtp_secret|secret_reference|authorization|bearer\s+[a-z0-9._-]+)/i;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 15 * 1024 * 1024;
const MAX_RECIPIENTS = 1;
const MAX_INLINE_BRAND_ASSET_BYTES = 512 * 1024;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 10;

export const MAIL_ENVIRONMENTS = Object.freeze({
  CAPTURE: "CAPTURE",
  CONTROLLED_SMTP_TEST: "CONTROLLED_SMTP_TEST",
  PRODUCTION_SMTP: "PRODUCTION_SMTP",
});

export const MAIL_EVENTS = Object.freeze({
  RENDERED: "MAIL_RENDERED",
  ATTEMPTED: "MAIL_SEND_ATTEMPTED",
  SUCCEEDED: "MAIL_SEND_SUCCEEDED",
  FAILED: "MAIL_SEND_FAILED",
  UNKNOWN: "MAIL_SEND_UNKNOWN",
  DENIED: "MAIL_PERMISSION_DENIED",
});

export class MailFoundationError extends Error {
  constructor(code, message, statusCode = 400, details = undefined) {
    super(message);
    this.name = "MailFoundationError";
    this.code = code;
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
  }
}

function safeText(value, label, maximum = 500) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maximum) throw new MailFoundationError("TEMPLATE_RENDER_FAILED", `${label} ontbreekt of is te lang.`);
  return text;
}

function header(value, label) {
  const text = safeText(value, label, 320);
  if (HEADER_BREAK.test(text)) throw new MailFoundationError("TEMPLATE_RENDER_FAILED", `${label} bevat een ongeldige regeleinde.`);
  return text;
}

function email(value) {
  const candidate = String(value ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(candidate) || HEADER_BREAK.test(candidate)) {
    throw new MailFoundationError("INVALID_RECIPIENT", "Het ontvangeradres is ongeldig.");
  }
  return candidate;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cleanFilename(value) {
  const filename = path.basename(String(value ?? "")).replace(/[^a-z0-9._ -]/gi, "-").replace(/\s+/g, "-");
  if (!filename || filename === "." || filename === ".." || filename.length > 140) {
    throw new MailFoundationError("ATTACHMENT_INVALID", "De bijlagenaam is ongeldig.");
  }
  return filename;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function clone(value) {
  return structuredClone(value);
}

function assertNoSecret(value, label = "mailgegevens") {
  const serialized = JSON.stringify(value);
  if (SECRET_PATTERN.test(serialized)) {
    throw new MailFoundationError("SECRET_BOUNDARY_VIOLATION", `${label} bevat verboden secretmateriaal.`, 500);
  }
}

function contextValue(context, key) {
  return key.split(".").reduce((value, part) => value && typeof value === "object" ? value[part] : undefined, context);
}

function renderTemplateString(source, context, allowedVariables, html = false) {
  return String(source).replace(/{{\s*([a-zA-Z][a-zA-Z0-9_.]*)\s*}}/g, (_match, key) => {
    if (!allowedVariables.includes(key)) throw new MailFoundationError("TEMPLATE_RENDER_FAILED", `Templatevariabele ${key} is niet toegestaan.`);
    const value = contextValue(context, key);
    if (value === undefined || value === null) throw new MailFoundationError("TEMPLATE_RENDER_FAILED", `Templatevariabele ${key} ontbreekt.`);
    const text = Array.isArray(value) ? value.join("\n") : String(value);
    return html ? escapeHtml(text) : text;
  });
}

export class DeclarativeTemplateRenderer {
  render(template, context) {
    if (!template || typeof template !== "object" || !Array.isArray(template.allowedVariables)) {
      throw new MailFoundationError("TEMPLATE_RENDER_FAILED", "De templateconfiguratie is ongeldig.");
    }
    const subject = header(renderTemplateString(template.subject, context, template.allowedVariables, false), "Onderwerp");
    const html = renderTemplateString(template.html, context, template.allowedVariables, true);
    const text = renderTemplateString(template.text, context, template.allowedVariables, false);
    if (/<script\b|javascript:/i.test(html)) throw new MailFoundationError("TEMPLATE_RENDER_FAILED", "De HTML-template bevat verboden actieve inhoud.");
    return { subject, html, text };
  }
}

function normalizeAttachment(input) {
  if (!input || typeof input !== "object" || !Buffer.isBuffer(input.bytes)) {
    throw new MailFoundationError("ATTACHMENT_INVALID", "De bijlage moet server-side als bytes worden aangeleverd.");
  }
  const mimeType = String(input.mimeType ?? "").toLowerCase();
  if (mimeType !== "application/pdf") throw new MailFoundationError("ATTACHMENT_MIME_MISMATCH", "Alleen gecontroleerde PDF-bijlagen zijn toegestaan.");
  if (input.bytes.length < 5 || input.bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new MailFoundationError("ATTACHMENT_MIME_MISMATCH", "De bijlage is geen geldige PDF.");
  }
  if (input.bytes.length > MAX_ATTACHMENT_BYTES) throw new MailFoundationError("ATTACHMENT_TOO_LARGE", "De PDF-bijlage is groter dan 10 MB.");
  return {
    id: safeText(input.id ?? randomUUID(), "Bijlage-ID", 120),
    filename: cleanFilename(input.filename),
    mimeType,
    sizeBytes: input.bytes.length,
    sha256: sha256(input.bytes),
    bytes: input.bytes,
  };
}

function publicAttachment(attachment) {
  const { bytes: _bytes, ...metadata } = attachment;
  return metadata;
}

function publicInlineAsset(asset) {
  const { bytes: _bytes, ...metadata } = asset;
  return metadata;
}

function loadApprovedInlineBrandAssets(brandConfig) {
  const asset = brandConfig?.assets?.email_logo;
  if (!asset || !["approved", "owner_approved"].includes(asset.status)) return [];
  if (!asset.reference?.startsWith("cid:") || !asset.embedded_source || asset.media_type !== "image/png" || !asset.sha256) {
    throw new MailFoundationError("BRAND_ASSET_INVALID", "De goedgekeurde mailasset mist een veilige CID-, PNG- of hashconfiguratie.", 500);
  }
  const contentId = asset.reference.slice(4);
  if (!/^brand-[a-z0-9-]+$/i.test(contentId)) throw new MailFoundationError("BRAND_ASSET_INVALID", "De mailasset gebruikt een ongeldige Content-ID.", 500);
  const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
  const sourcePath = path.resolve(publicRoot, asset.embedded_source.replace(/^\/+/, ""));
  const allowedRoot = `${path.resolve(publicRoot, "assets", "organizations", brandConfig.organization_id)}${path.sep}`;
  if (!sourcePath.startsWith(allowedRoot) || !existsSync(sourcePath)) {
    throw new MailFoundationError("BRAND_ASSET_MISSING", "De goedgekeurde mailasset ontbreekt binnen de gecontroleerde organisatiebron.", 500);
  }
  const bytes = readFileSync(sourcePath);
  if (bytes.length > MAX_INLINE_BRAND_ASSET_BYTES || !bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new MailFoundationError("BRAND_ASSET_INVALID", "De goedgekeurde mailasset is geen veilige PNG of is te groot.", 500);
  }
  if (sha256(bytes) !== asset.sha256) throw new MailFoundationError("BRAND_ASSET_HASH_MISMATCH", "De goedgekeurde mailasset wijkt af van de owner-approved hash.", 500);
  return Object.freeze([Object.freeze({
    id: asset.id,
    filename: "wbd-logo-mail-safe.png",
    mimeType: asset.media_type,
    contentId,
    sizeBytes: bytes.length,
    sha256: asset.sha256,
    bytes,
  })]);
}

export class MemoryMailStore {
  constructor(seed = {}) {
    this.state = { schemaVersion: 1, attempts: [], events: [], idempotency: {}, ...clone(seed) };
  }
  async read() { return clone(this.state); }
  async mutate(mutator) {
    const next = clone(this.state);
    const value = await mutator(next);
    this.state = next;
    return clone(value);
  }
}

export class JsonMailStore {
  constructor({ filePath }) {
    this.filePath = path.resolve(filePath);
    this.queue = Promise.resolve();
  }
  async initialize() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    if (!existsSync(this.filePath)) await this.#write({ schemaVersion: 1, attempts: [], events: [], idempotency: {} });
  }
  async read() {
    await this.initialize();
    return JSON.parse(await readFile(this.filePath, "utf8"));
  }
  async mutate(mutator) {
    const operation = this.queue.then(async () => {
      const state = await this.read();
      const value = await mutator(state);
      await this.#write(state);
      return clone(value);
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
  async #write(state) {
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, this.filePath);
  }
}

export class CaptureTransport {
  constructor({ captureDirectory, simulation = "success", now = () => new Date() }) {
    this.name = "capture";
    this.captureDirectory = path.resolve(captureDirectory);
    this.simulation = simulation;
    this.now = now;
    this.externalNetworkEnabled = false;
  }
  async send(message, options = {}) {
    assertNoSecret(message, "CaptureTransport-input");
    const simulation = options.simulation ?? this.simulation;
    if (!["success", "failure", "timeout", "unknown"].includes(simulation)) {
      throw new MailFoundationError("TRANSPORT_FAILED", "Onbekende CaptureTransport-simulatie.", 500);
    }
    if (simulation === "failure") return { outcome: "failed", code: "TRANSPORT_FAILED", confirmedNotSent: true, safeMessage: "CaptureTransport simuleerde een bevestigde fout." };
    if (simulation === "timeout") return { outcome: "failed", code: "TIMEOUT", confirmedNotSent: true, safeMessage: "CaptureTransport simuleerde een timeout zonder externe overdracht." };
    if (simulation === "unknown") return { outcome: "unknown", code: "UNKNOWN_PARTIAL_SEND", confirmedNotSent: false, safeMessage: "De gesimuleerde uitkomst is onbekend; automatisch opnieuw proberen is geblokkeerd." };
    await mkdir(this.captureDirectory, { recursive: true });
    const capturedAt = this.now().toISOString();
    const capture = {
      schemaVersion: 1,
      transport: "capture",
      externalNetworkUsed: false,
      capturedAt,
      message: {
        ...message,
        attachments: message.attachments.map(publicAttachment),
        inlineAssets: (message.inlineAssets ?? []).map(publicInlineAsset),
      },
    };
    const target = path.join(this.captureDirectory, `${cleanFilename(message.messageId)}.mail.json`);
    await writeFile(target, `${JSON.stringify(capture, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    return { outcome: "captured", code: "CAPTURED", confirmedNotSent: true, referenceId: message.messageId, safeMessage: "Lokaal vastgelegd; geen internetmail verstuurd." };
  }
}

export class DisabledSmtpTransport {
  constructor(configuration = {}) {
    this.name = "smtp-disabled";
    this.externalNetworkEnabled = false;
    this.configuration = {
      host: configuration.host ?? "UNKNOWN",
      port: configuration.port ?? "UNKNOWN",
      tls: configuration.tls ?? "REQUIRED",
      usernameStatus: configuration.usernameStatus ?? "NOT_PROVISIONED",
      secretStatus: configuration.secretReference ? "REFERENCE_CONFIGURED" : "NOT_PROVISIONED",
      realSendEnabled: false,
    };
  }
  publicSummary() { return clone(this.configuration); }
  async send() {
    throw new MailFoundationError("SMTP_SEND_DISABLED", "REAL SMTP SEND is technisch uitgeschakeld.", 503);
  }
}

function smtpAddressFromHeader(value) {
  const match = String(value ?? "").match(/<([^<>]+)>\s*$/);
  return email(match ? match[1] : value);
}

function encodeHeaderWord(value) {
  const text = header(value, "Mailheader");
  return /^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

function base64Lines(bytes) {
  return Buffer.from(bytes).toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function smtpMimeMessage(message) {
  const mixedBoundary = `wbd-mixed-${randomUUID()}`;
  const alternativeBoundary = `wbd-alt-${randomUUID()}`;
  const fromAddress = smtpAddressFromHeader(message.from);
  const headers = [
    `From: ${encodeHeaderWord(message.from)}`,
    `To: ${email(message.to)}`,
    `Subject: ${encodeHeaderWord(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${header(message.messageId, "Message-ID")}@${header(message.messageIdDomain ?? "workspace.webuildanddesign.nl", "Message-ID domain")}>`,
    "MIME-Version: 1.0",
    ...(message.replyTo ? [`Reply-To: ${email(message.replyTo)}`] : []),
    `${header(message.senderPolicyHeader ?? "X-WBD-Sender-Policy", "Sender policy header")}: ${header(message.senderPolicy, "Sender policy")}`,
    `Content-Type: multipart/mixed; boundary=\"${mixedBoundary}\"`,
  ];
  const body = [
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary=\"${alternativeBoundary}\"`,
    "",
    `--${alternativeBoundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(Buffer.from(message.text, "utf8")),
    `--${alternativeBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(Buffer.from(message.html, "utf8")),
    `--${alternativeBoundary}--`,
    ...(message.inlineAssets ?? []).flatMap((asset) => [
      `--${mixedBoundary}`,
      `Content-Type: ${asset.mimeType}; name="${cleanFilename(asset.filename)}"`,
      "Content-Transfer-Encoding: base64",
      `Content-ID: <${header(asset.contentId, "Content-ID")}>`,
      `Content-Disposition: inline; filename="${cleanFilename(asset.filename)}"`,
      "",
      base64Lines(asset.bytes),
    ]),
    ...(message.attachments ?? []).flatMap((attachment) => [
      `--${mixedBoundary}`,
      `Content-Type: ${attachment.mimeType}; name=\"${cleanFilename(attachment.filename)}\"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename=\"${cleanFilename(attachment.filename)}\"`,
      "",
      base64Lines(attachment.bytes),
    ]),
    `--${mixedBoundary}--`,
    "",
  ];
  return { fromAddress, data: `${headers.join("\r\n")}\r\n\r\n${body.join("\r\n")}` };
}

class SmtpSession {
  constructor(socket, { commandTimeoutMs }) {
    this.socket = socket;
    this.commandTimeoutMs = commandTimeoutMs;
    this.buffer = "";
    this.waiters = [];
    socket.setEncoding("utf8");
    socket.on("data", (chunk) => { this.buffer += chunk; this.#drain(); });
    socket.on("error", (error) => this.#rejectAll(error));
    socket.on("close", () => this.#rejectAll(new Error("SMTP_CONNECTION_CLOSED")));
  }
  async response(expectedCodes) {
    const response = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("SMTP_COMMAND_TIMEOUT")), this.commandTimeoutMs);
      this.waiters.push({ resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
      this.#drain();
    });
    if (!expectedCodes.includes(response.code)) throw new Error(`SMTP_REJECTED_${response.code}`);
    return response;
  }
  async command(value, expectedCodes) {
    this.socket.write(`${value}\r\n`);
    return this.response(expectedCodes);
  }
  close() { if (!this.socket.destroyed) this.socket.end(); }
  #rejectAll(error) { while (this.waiters.length) this.waiters.shift().reject(error); }
  #drain() {
    if (!this.waiters.length) return;
    const lines = this.buffer.split("\r\n");
    if (lines.length < 2) return;
    let consumed = 0;
    const collected = [];
    let complete = false;
    let code;
    for (const line of lines.slice(0, -1)) {
      consumed += line.length + 2;
      collected.push(line);
      const match = line.match(/^(\d{3})([ -])/);
      if (!match) continue;
      code ??= Number(match[1]);
      if (match[2] === " ") { complete = true; break; }
    }
    if (!complete) return;
    this.buffer = this.buffer.slice(consumed);
    this.waiters.shift().resolve({ code, lines: collected });
  }
}

export class AuthenticatedSmtpTransport {
  constructor({
    organizationId,
    host,
    port = 465,
    tlsRequired = true,
    senderPolicy,
    senderAddress,
    usernameProvider,
    secretProvider,
    allowlistedRecipients = [],
    connectionTimeoutMs = 10_000,
    commandTimeoutMs = 15_000,
    clientHostname = "workspace.webuildanddesign.nl",
    connectionFactory,
  }) {
    this.name = "smtp";
    this.externalNetworkEnabled = true;
    this.organizationId = safeText(organizationId, "Organisatie-ID", 100);
    this.host = safeText(host, "SMTP-host", 253);
    this.port = Number(port);
    this.tlsRequired = tlsRequired === true;
    this.senderPolicy = header(senderPolicy, "Sender policy");
    this.senderAddress = email(senderAddress);
    this.usernameProvider = usernameProvider;
    this.secretProvider = secretProvider;
    this.allowlistedRecipients = [...new Set(allowlistedRecipients.map(email))];
    this.connectionTimeoutMs = Number(connectionTimeoutMs);
    this.commandTimeoutMs = Number(commandTimeoutMs);
    this.clientHostname = safeText(clientHostname, "SMTP-clienthostname", 253);
    this.connectionFactory = connectionFactory ?? ((options) => tls.connect(options));
    if (!Number.isInteger(this.port) || this.port < 1 || this.port > 65_535 || !this.tlsRequired) {
      throw new MailFoundationError("SMTP_CONFIG_INVALID", "De SMTP-host, poort of TLS-configuratie is ongeldig.", 500);
    }
  }
  publicSummary() {
    return {
      host: this.host,
      port: this.port,
      tls: "IMPLICIT_TLS_REQUIRED",
      senderPolicy: this.senderPolicy,
      senderAddress: this.senderAddress,
      organizationId: this.organizationId,
      credentialStatus: this.#credentials(false) ? "PROVISIONED" : "NOT_PROVISIONED",
      allowlistCount: this.allowlistedRecipients.length,
    };
  }
  validateMessage(message) {
    if (message.organizationId !== this.organizationId) throw new MailFoundationError("PERMISSION_DENIED", "SMTP is niet toegestaan voor deze organisatie.", 403);
    if (message.senderPolicy !== this.senderPolicy || smtpAddressFromHeader(message.from) !== this.senderAddress) {
      throw new MailFoundationError("SENDER_NOT_ALLOWED", "De server-side afzenderpolicy staat deze afzender niet toe.", 403);
    }
    if (this.allowlistedRecipients.length !== 1 || this.allowlistedRecipients[0] !== email(message.to)) {
      throw new MailFoundationError("RECIPIENT_NOT_ALLOWLISTED", "De ontvanger staat niet op de gecontroleerde SMTP-allowlist.", 403);
    }
  }
  async verify({ validateSender = true, diagnostic = false } = {}) {
    const credentials = this.#credentials(true);
    let session;
    let phase = "connect";
    try {
      session = await this.#connect();
      await session.response([220]);
      phase = "ehlo";
      const ehlo = await session.command(`EHLO ${this.clientHostname}`, [250]);
      phase = "authenticate";
      await this.#authenticate(session, credentials, ehlo);
      if (validateSender) {
        phase = "sender";
        await session.command(`MAIL FROM:<${this.senderAddress}>`, [250]);
        await session.command("RSET", [250]);
      }
      await session.command("QUIT", [221]);
      return { tls: true, authenticated: true, senderAccepted: validateSender, safeMessage: "TLS, authenticatie en afzenderpolicy zijn door SMTP geaccepteerd." };
    } catch (error) {
      if (diagnostic) {
        const code = phase === "authenticate" ? "SMTP_AUTHENTICATION_FAILED"
          : phase === "sender" ? "SMTP_SENDER_REJECTED"
            : phase === "ehlo" ? "SMTP_EHLO_FAILED"
              : "SMTP_TLS_OR_CONNECTION_FAILED";
        const message = phase === "authenticate" ? "VDX heeft de SMTP-authenticatie niet geaccepteerd."
          : phase === "sender" ? "VDX heeft de geconfigureerde afzender niet geaccepteerd."
            : phase === "ehlo" ? "De SMTP-server heeft EHLO niet geaccepteerd."
              : "De SMTP-verbinding of TLS-handshake is niet geaccepteerd.";
        throw new MailFoundationError(code, message, 502);
      }
      throw new MailFoundationError("SMTP_VALIDATION_FAILED", "De gecontroleerde SMTP-validatie is veilig gestopt.", 502);
    } finally {
      session?.close();
    }
  }
  async send(message) {
    this.validateMessage(message);
    const credentials = this.#credentials(true);
    let session;
    let dataCommitted = false;
    let phase = "connect";
    try {
      const mime = smtpMimeMessage(message);
      session = await this.#connect();
      await session.response([220]);
      const ehlo = await session.command(`EHLO ${this.clientHostname}`, [250]);
      phase = "authenticate";
      await this.#authenticate(session, credentials, ehlo);
      phase = "sender";
      await session.command(`MAIL FROM:<${mime.fromAddress}>`, [250]);
      phase = "recipient";
      await session.command(`RCPT TO:<${email(message.to)}>`, [250, 251]);
      phase = "data";
      await session.command("DATA", [354]);
      const normalized = mime.data.replace(/(^|\r\n)\./g, "$1..");
      session.socket.write(`${normalized}\r\n.\r\n`);
      dataCommitted = true;
      const accepted = await session.response([250]);
      session.command("QUIT", [221]).catch(() => undefined);
      const providerReference = accepted.lines.join(" ").match(/(?:\bqueued\s+as\s+|\bid[= ]+|\bqueue[= ]+)([a-z0-9._-]+)/i)?.[1];
      return { outcome: "sent", code: "SMTP_ACCEPTED", confirmedNotSent: false, referenceId: providerReference ?? message.messageId, safeMessage: "SMTP heeft het bericht geaccepteerd; inboxaflevering vereist afzonderlijke verificatie." };
    } catch (error) {
      if (dataCommitted) return { outcome: "unknown", code: "UNKNOWN_PARTIAL_SEND", confirmedNotSent: false, safeMessage: "De verbinding eindigde na DATA; automatisch opnieuw proberen is geblokkeerd." };
      const code = error instanceof MailFoundationError ? error.code
        : phase === "authenticate" ? "SMTP_AUTHENTICATION_FAILED"
          : phase === "sender" ? "SMTP_SENDER_REJECTED"
            : phase === "recipient" ? "SMTP_RECIPIENT_REJECTED"
              : phase === "connect" ? "SMTP_TLS_OR_CONNECTION_FAILED"
                : "TRANSPORT_FAILED";
      return { outcome: "failed", code, confirmedNotSent: true, safeMessage: "SMTP heeft het bericht aantoonbaar niet geaccepteerd." };
    } finally {
      session?.close();
    }
  }
  #credentials(required) {
    const username = typeof this.usernameProvider === "function" ? String(this.usernameProvider() ?? "").trim() : "";
    const secret = typeof this.secretProvider === "function" ? String(this.secretProvider() ?? "") : "";
    if (required && (!username || !secret)) throw new MailFoundationError("SMTP_CREDENTIAL_MISSING", "SMTP-credentials zijn niet veilig geprovisioneerd.", 503);
    return username && secret ? { username, secret } : null;
  }
  async #authenticate(session, credentials, ehlo) {
    const capabilities = ehlo.lines.join(" ").toUpperCase();
    if (/\bAUTH\b[^\r\n]*\bPLAIN\b/.test(capabilities)) {
      await session.command(`AUTH PLAIN ${Buffer.from(`\0${credentials.username}\0${credentials.secret}`, "utf8").toString("base64")}`, [235]);
      return;
    }
    if (/\bAUTH\b[^\r\n]*\bLOGIN\b/.test(capabilities)) {
      await session.command("AUTH LOGIN", [334]);
      await session.command(Buffer.from(credentials.username, "utf8").toString("base64"), [334]);
      await session.command(Buffer.from(credentials.secret, "utf8").toString("base64"), [235]);
      return;
    }
    throw new Error("SMTP_AUTH_METHOD_UNSUPPORTED");
  }
  async #connect() {
    const socket = this.connectionFactory({ host: this.host, port: this.port, servername: this.host, rejectUnauthorized: true });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { socket.destroy(); reject(new Error("SMTP_CONNECTION_TIMEOUT")); }, this.connectionTimeoutMs);
      socket.once("secureConnect", () => { clearTimeout(timer); resolve(); });
      socket.once("error", (error) => { clearTimeout(timer); reject(error); });
    });
    if (socket.authorized === false) { socket.destroy(); throw new Error("SMTP_TLS_UNAUTHORIZED"); }
    return new SmtpSession(socket, { commandTimeoutMs: this.commandTimeoutMs });
  }
}

export class EnvironmentMailTransport {
  constructor({
    mode = MAIL_ENVIRONMENTS.CAPTURE,
    captureTransport,
    smtpTransports = {},
    controlledSmtpEnabled = false,
    productionSmtpEnabled = false,
    controlledSmtpOrganizations = [],
    productionSmtpOrganizations = [],
    controlledTestPolicies = {},
  }) {
    if (!Object.values(MAIL_ENVIRONMENTS).includes(mode)) throw new MailFoundationError("SMTP_CONFIG_INVALID", "Onbekende mailomgeving.", 500);
    this.name = mode === MAIL_ENVIRONMENTS.CAPTURE ? "capture" : mode === MAIL_ENVIRONMENTS.CONTROLLED_SMTP_TEST ? "controlled-smtp-test" : "production-smtp";
    this.mode = mode;
    this.captureTransport = captureTransport;
    this.smtpTransports = new Map(Object.entries(smtpTransports));
    this.controlledSmtpEnabled = controlledSmtpEnabled === true;
    this.productionSmtpEnabled = productionSmtpEnabled === true;
    this.controlledSmtpOrganizations = new Set(controlledSmtpOrganizations);
    this.productionSmtpOrganizations = new Set(productionSmtpOrganizations);
    this.controlledTestPolicies = new Map(Object.entries(controlledTestPolicies));
    this.externalNetworkEnabled = mode !== MAIL_ENVIRONMENTS.CAPTURE;
  }
  previewName(message) { return this.mode === MAIL_ENVIRONMENTS.CAPTURE ? this.captureTransport.name : this.#smtp(message).name; }
  publicSummary(message) { return this.mode === MAIL_ENVIRONMENTS.CAPTURE ? { mode: this.mode, transport: "capture" } : { mode: this.mode, transport: "smtp", smtp: this.#smtp(message).publicSummary() }; }
  async verify(senderPolicy, organizationId = null, options = {}) {
    const smtp = this.#smtp({ senderPolicy });
    this.#gate({ organizationId: organizationId ?? smtp.organizationId });
    return smtp.verify(options);
  }
  async send(message, options = {}) {
    if (this.mode === MAIL_ENVIRONMENTS.CAPTURE) return this.captureTransport.send(message, options);
    this.#gate(message);
    const smtp = this.#smtp(message);
    if (this.mode === MAIL_ENVIRONMENTS.CONTROLLED_SMTP_TEST) await this.#controlledTestPolicy(message, options.store);
    smtp.validateMessage(message);
    return smtp.send(message);
  }
  #gate(message = null) {
    const organizationId = message?.organizationId;
    const controlledEnabled = this.controlledSmtpEnabled || (organizationId && this.controlledSmtpOrganizations.has(organizationId));
    const productionEnabled = this.productionSmtpEnabled || (organizationId && this.productionSmtpOrganizations.has(organizationId));
    if (this.mode === MAIL_ENVIRONMENTS.CONTROLLED_SMTP_TEST && !controlledEnabled) throw new MailFoundationError("SMTP_SEND_DISABLED", "De gecontroleerde SMTP-safety gate is gesloten.", 503);
    if (this.mode === MAIL_ENVIRONMENTS.PRODUCTION_SMTP && !productionEnabled) throw new MailFoundationError("SMTP_SEND_DISABLED", "De productie-SMTP-safety gate is gesloten.", 503);
  }
  #smtp(message) {
    const smtp = this.smtpTransports.get(message.senderPolicy);
    if (!smtp) throw new MailFoundationError("SENDER_NOT_ALLOWED", "Voor deze sender policy is geen SMTP-adapter geconfigureerd.", 403);
    return smtp;
  }
  async #controlledTestPolicy(message, store) {
    if (!store || typeof store.read !== "function") throw new MailFoundationError("SMTP_SEND_DISABLED", "De gecontroleerde SMTP-history gate kan niet worden gevalideerd.", 503);
    const policy = this.controlledTestPolicies.get(message.organizationId);
    if (!policy || !Array.isArray(policy.templates) || !policy.templates.includes(message.templateKey)) {
      throw new MailFoundationError("PERMISSION_DENIED", "Deze template is niet toegestaan in de gecontroleerde SMTP-test.", 403);
    }
    const state = await store.read();
    const prior = state.attempts.filter((attempt) => attempt.messageId !== message.messageId && attempt.organizationId === message.organizationId);
    const sameTemplateTerminal = prior.some((attempt) => attempt.templateKey === message.templateKey && ["SMTP_ACCEPTED", "UNKNOWN_PARTIAL_SEND"].includes(attempt.status));
    if (sameTemplateTerminal) throw new MailFoundationError("CONTROLLED_TEST_LIMIT_REACHED", "Deze gecontroleerde SMTP-test is al uitgevoerd of heeft een onbekende uitkomst.", 409);
    const requiredPredecessor = policy.requires?.[message.templateKey];
    if (requiredPredecessor && !prior.some((attempt) => attempt.templateKey === requiredPredecessor && attempt.status === "SMTP_ACCEPTED")) {
      throw new MailFoundationError("SMTP_TEST_SEQUENCE_BLOCKED", "De gecontroleerde SMTP-test blijft geblokkeerd totdat de vereiste eerdere test door SMTP is geaccepteerd.", 409);
    }
  }
}

function publicAttempt(attempt) {
  return clone({
    id: attempt.id,
    organizationId: attempt.organizationId,
    contextType: attempt.contextType,
    contextId: attempt.contextId,
    sender: attempt.sender,
    senderPolicy: attempt.senderPolicy,
    recipient: attempt.recipient,
    templateKey: attempt.templateKey,
    templateVersion: attempt.templateVersion,
    initiatedBy: attempt.initiatedBy,
    createdAt: attempt.createdAt,
    attemptedAt: attempt.attemptedAt,
    completedAt: attempt.completedAt,
    transport: attempt.transport,
    status: attempt.status,
    safeResult: attempt.safeResult,
    messageId: attempt.messageId,
    referenceId: attempt.referenceId,
    idempotencyKey: attempt.idempotencyKey,
    attachmentMetadata: attempt.attachmentMetadata,
    attentionRequired: attempt.attentionRequired,
    automaticRetryAllowed: attempt.automaticRetryAllowed,
    duplicate: attempt.duplicate === true,
  });
}

export class MailFoundation {
  constructor({ organizations, store, transport, renderer = new DeclarativeTemplateRenderer(), now = () => new Date() }) {
    this.organizations = new Map(Object.entries(organizations));
    this.store = store;
    this.transport = transport;
    this.renderer = renderer;
    this.now = now;
    this.rateBuckets = new Map();
  }

  organizationSummary(organizationId) {
    const organization = this.#organization(organizationId);
    return clone({
      id: organization.id,
      name: organization.name,
      ...(organization.brandConfig ? { brand: publicBrandSummary(organization.brandConfig) } : {}),
      senderPolicies: Object.values(organization.senderPolicies ?? {}).map(({ key, name, address, status }) => ({ key, name, address, status })),
      transport: this.transport.name,
      smtp: organization.smtp.publicSummary(),
      templates: Object.values(organization.templates).map(({ key, version }) => ({ key, version })),
    });
  }

  async preview(request, actor) {
    const prepared = await this.#prepare(request, actor, "preview");
    await this.#event(MAIL_EVENTS.RENDERED, prepared, actor, { transport: this.transport.name });
    return this.#publicPreview(prepared);
  }

  async capture(request, actor, { simulation = "success" } = {}) {
    const idempotencyKey = header(request.idempotencyKey, "Idempotency key");
    if (idempotencyKey.length < 12 || idempotencyKey.length > 160) throw new MailFoundationError("DUPLICATE_SEND_REQUEST", "De idempotency key is ongeldig.");
    this.#rateLimit(actor, request.organizationId);
    const prepared = await this.#prepare(request, actor, "send");
    const payloadHash = sha256(JSON.stringify(stable({
      organizationId: prepared.organization.id,
      contextType: prepared.contextType,
      contextId: prepared.contextId,
      templateKey: prepared.template.key,
      templateVersion: prepared.template.version,
      recipient: prepared.recipient,
      context: prepared.context,
      attachments: prepared.attachments.map(publicAttachment),
    })));
    const identity = `${prepared.organization.id}:${actor.id}:${idempotencyKey}`;
    const reserved = await this.store.mutate((state) => {
      const existing = state.idempotency[identity];
      if (existing) {
        if (existing.payloadHash !== payloadHash) throw new MailFoundationError("DUPLICATE_SEND_REQUEST", "Deze idempotency key hoort al bij een andere mailactie.", 409);
        const prior = state.attempts.find(({ id }) => id === existing.attemptId);
        if (!prior) throw new MailFoundationError("DUPLICATE_SEND_REQUEST", "De eerdere mailactie is niet veilig terug te vinden.", 409);
        return { duplicate: true, attempt: { ...prior, duplicate: true } };
      }
      const createdAt = this.now().toISOString();
      const attempt = {
        id: randomUUID(),
        organizationId: prepared.organization.id,
        contextType: prepared.contextType,
        contextId: prepared.contextId,
        sender: prepared.message.from,
        senderPolicy: prepared.message.senderPolicy,
        recipient: prepared.recipient,
        templateKey: prepared.template.key,
        templateVersion: prepared.template.version,
        initiatedBy: { id: actor.id, name: actor.name, role: actor.role },
        createdAt,
        attemptedAt: createdAt,
        transport: this.transport.name,
        status: "SENDING",
        safeResult: { code: "ATTEMPT_RESERVED", message: "Poging server-side gereserveerd." },
        messageId: prepared.message.messageId,
        referenceId: null,
        idempotencyKey,
        payloadHash,
        attachmentMetadata: prepared.attachments.map(publicAttachment),
        attentionRequired: false,
        automaticRetryAllowed: false,
      };
      state.attempts.unshift(attempt);
      state.idempotency[identity] = { payloadHash, attemptId: attempt.id, createdAt };
      return { duplicate: false, attempt };
    });
    if (reserved.duplicate) return publicAttempt(reserved.attempt);

    await this.#event(MAIL_EVENTS.ATTEMPTED, prepared, actor, { attemptId: reserved.attempt.id, transport: this.transport.name });
    let transportResult;
    try {
      transportResult = await this.transport.send(prepared.message, { simulation, store: this.store });
    } catch (error) {
      const safe = error instanceof MailFoundationError ? error : new MailFoundationError("TRANSPORT_FAILED", "De transportadapter gaf een veilige fout.", 502);
      transportResult = { outcome: "failed", code: safe.code, confirmedNotSent: true, safeMessage: safe.message };
    }
    const completed = await this.store.mutate((state) => {
      const attempt = state.attempts.find(({ id }) => id === reserved.attempt.id);
      if (!attempt) throw new MailFoundationError("TRANSPORT_FAILED", "De gereserveerde poging ontbreekt.", 500);
      attempt.completedAt = this.now().toISOString();
      attempt.referenceId = transportResult.referenceId ?? null;
      attempt.status = transportResult.outcome === "captured" ? "CAPTURED" : transportResult.outcome === "sent" ? "SMTP_ACCEPTED" : transportResult.outcome === "unknown" ? "UNKNOWN_PARTIAL_SEND" : transportResult.code ?? "TRANSPORT_FAILED";
      attempt.safeResult = { code: transportResult.code, message: transportResult.safeMessage, confirmedNotSent: transportResult.confirmedNotSent === true };
      attempt.attentionRequired = attempt.status === "UNKNOWN_PARTIAL_SEND";
      attempt.automaticRetryAllowed = false;
      return attempt;
    });
    const event = ["CAPTURED", "SMTP_ACCEPTED"].includes(completed.status) ? MAIL_EVENTS.SUCCEEDED : completed.status === "UNKNOWN_PARTIAL_SEND" ? MAIL_EVENTS.UNKNOWN : MAIL_EVENTS.FAILED;
    await this.#event(event, prepared, actor, { attemptId: completed.id, status: completed.status, code: completed.safeResult.code });
    return publicAttempt(completed);
  }

  async history({ organizationId, contextType, contextId }, actor) {
    const organization = this.#organization(organizationId);
    await this.#authorize(organization, actor, "history", undefined, contextType, contextId);
    const state = await this.store.read();
    return state.attempts
      .filter((attempt) => attempt.organizationId === organization.id && attempt.contextType === contextType && attempt.contextId === contextId)
      .map(publicAttempt);
  }

  async events() {
    const state = await this.store.read();
    return clone(state.events);
  }

  async #prepare(request, actor, action) {
    const organization = this.#organization(request.organizationId);
    const template = organization.templates[request.templateKey];
    await this.#authorize(organization, actor, action, request.templateKey, request.contextType, request.contextId);
    if (!template) throw new MailFoundationError("TEMPLATE_RENDER_FAILED", "De gekozen template bestaat niet.", 404);
    const recipients = Array.isArray(request.recipient) ? request.recipient : [request.recipient];
    if (recipients.length !== MAX_RECIPIENTS) throw new MailFoundationError("MASS_SEND_BLOCKED", "Transactionele mail staat exact één ontvanger toe.", 400);
    const recipient = email(recipients[0]);
    const contextType = header(request.contextType, "Contexttype");
    const contextId = header(request.contextId, "Context-ID");
    const context = clone(request.context ?? {});
    assertNoSecret(context, "Templatecontext");
    const rendered = this.renderer.render(template, context);
    const attachments = (request.attachments ?? []).map(normalizeAttachment);
    if (attachments.reduce((sum, item) => sum + item.sizeBytes, 0) > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new MailFoundationError("ATTACHMENT_TOO_LARGE", "De totale bijlagegrootte is groter dan 15 MB.");
    }
    const messageId = `mail-${randomUUID()}`;
    const senderPolicyKey = template.senderPolicy ?? organization.defaultSenderPolicy;
    const senderPolicy = organization.senderPolicies?.[senderPolicyKey];
    if (!senderPolicy) throw new MailFoundationError("SENDER_NOT_ALLOWED", "De template heeft geen geldige server-side sender policy.", 403);
    const message = {
      messageId,
      organizationId: organization.id,
      contextType,
      contextId,
      templateKey: template.key,
      senderPolicy: senderPolicy.key,
      from: `${header(senderPolicy.name, "Afzendernaam")} <${email(senderPolicy.address)}>`,
      to: recipient,
      ...(organization.replyTo ? { replyTo: email(organization.replyTo) } : {}),
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      attachments,
      inlineAssets: organization.inlineAssets ?? [],
      messageIdDomain: organization.messageIdDomain ?? "workspace.webuildanddesign.nl",
      senderPolicyHeader: organization.senderPolicyHeader ?? "X-WBD-Sender-Policy",
    };
    assertNoSecret(message, "Gerenderde mail");
    return { organization, template, context, contextType, contextId, recipient, rendered, attachments, message, action };
  }

  #publicPreview(prepared) {
    return clone({
      organization: {
        id: prepared.organization.id,
        name: prepared.organization.name,
        branding: prepared.organization.branding,
        ...(prepared.organization.brandConfig ? { brand: publicBrandSummary(prepared.organization.brandConfig) } : {}),
      },
      sender: prepared.message.from,
      senderPolicy: prepared.message.senderPolicy,
      senderAddressStatus: prepared.organization.senderPolicies[prepared.message.senderPolicy].status,
      recipient: prepared.recipient,
      contextType: prepared.contextType,
      contextId: prepared.contextId,
      templateKey: prepared.template.key,
      templateVersion: prepared.template.version,
      subject: prepared.rendered.subject,
      html: prepared.rendered.html,
      text: prepared.rendered.text,
      attachments: prepared.attachments.map(publicAttachment),
      inlineAssets: (prepared.message.inlineAssets ?? []).map(publicInlineAsset),
      transport: typeof this.transport.previewName === "function" ? this.transport.previewName(prepared.message) : this.transport.name,
      externalMailSent: false,
    });
  }

  #organization(organizationId) {
    const organization = this.organizations.get(String(organizationId ?? ""));
    if (!organization) throw new MailFoundationError("PERMISSION_DENIED", "Organisatie niet toegestaan.", 403);
    return organization;
  }

  async #authorize(organization, actor, action, templateKey, contextType = "unknown", contextId = "unknown") {
    const roles = organization.permissions?.[action]?.[templateKey ?? "*"] ?? organization.permissions?.[action]?.["*"] ?? [];
    if (!actor?.id || !roles.includes(actor.role)) {
      await this.#event(MAIL_EVENTS.DENIED, { organization, contextType: String(contextType ?? "unknown"), contextId: String(contextId ?? "unknown"), template: { key: templateKey ?? "unknown" } }, actor ?? { id: "anonymous", role: "none", name: "Onbekend" }, { action });
      throw new MailFoundationError("PERMISSION_DENIED", "Onvoldoende rechten voor deze mailactie.", 403);
    }
  }

  #rateLimit(actor, organizationId) {
    const key = `${organizationId}:${actor?.id ?? "anonymous"}`;
    const now = this.now().getTime();
    const recent = (this.rateBuckets.get(key) ?? []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
    if (recent.length >= MAX_ATTEMPTS_PER_WINDOW) throw new MailFoundationError("RATE_LIMITED", "Te veel mailpogingen; probeer later opnieuw.", 429);
    recent.push(now);
    this.rateBuckets.set(key, recent);
  }

  async #event(name, prepared, actor, details) {
    const event = {
      id: randomUUID(),
      name,
      at: this.now().toISOString(),
      organizationId: prepared.organization.id,
      contextType: prepared.contextType,
      contextId: prepared.contextId,
      templateKey: prepared.template.key,
      actor: { id: actor?.id ?? "anonymous", role: actor?.role ?? "none" },
      details: clone(details),
    };
    assertNoSecret(event, "Observability-event");
    await this.store.mutate((state) => { state.events.unshift(event); state.events = state.events.slice(0, 5_000); return undefined; });
  }
}

export function createMailOrganizations() {
  const brandRegistry = createOrganizationBrandRegistry();
  const sportpaleisBrandConfig = brandRegistry.get("sportpaleis");
  const sportpaleisBrand = sportpaleisBrandConfig.brand;
  const wbdBrandConfig = brandRegistry.get("we-build-and-design");
  const wbdInlineAssets = loadApprovedInlineBrandAssets(wbdBrandConfig);
  const wbdBrand = wbdBrandConfig.brand;
  const wbdGeneralPlainFooter = buildOrganizationPlainTextFooter({ brandConfig: wbdBrandConfig });
  const wbdInvoicePlainFooter = buildOrganizationPlainTextFooter({ brandConfig: wbdBrandConfig, email: "facturen@webuildanddesign.nl" });
  const sportVariables = ["customer.name", "order.number", "order.items", "order.processingDays", "order.pickupInformation", "message.question"];
  const sportBranding = {
    primary: sportpaleisBrand.primary_color,
    secondary: sportpaleisBrand.secondary_background_color,
    accent: sportpaleisBrand.accent_color,
    text: sportpaleisBrand.body_text_color,
    label: "SPORT 2000 Sportpaleis Workspace",
  };
  const sportTemplates = {
    SPORTPALEIS_BEDRUKKING_SMTP_TEST: {
      key: "SPORTPALEIS_BEDRUKKING_SMTP_TEST",
      version: 1,
      senderPolicy: "SPORTPALEIS_BEDRUKKING",
      allowedVariables: ["recipient.name", "test.reference"],
      subject: "[TEST] Sportpaleis Bedrukking mailverbinding {{test.reference}}",
      text: "TEST - geen klantcommunicatie\n\nBeste {{recipient.name}},\n\nDit is de eenmalige gecontroleerde SMTP-validatie voor bedrukking@sportpaleis.nl.\n\nTestreferentie: {{test.reference}}\n\nControleer afzender, Reply-To, aflevering en mailauthenticatie.\n\nMet vriendelijke groet,\nSport 2000 Sportpaleis",
      html: buildOrganizationMailShell({
        brandConfig: sportpaleisBrandConfig,
        preheader: "TEST - gecontroleerde SMTP-validatie voor Sportpaleis Bedrukking.",
        eyebrow: "Technische test - geen klantcommunicatie",
        heading: "Sportpaleis Bedrukking mailverbinding",
        contentHtml: '<p style="margin:0 0 20px;">Beste {{recipient.name}},</p><p style="margin:0 0 20px;">Dit is de eenmalige gecontroleerde SMTP-validatie voor <strong>bedrukking@sportpaleis.nl</strong>.</p><p style="margin:0;">Testreferentie: <strong>{{test.reference}}</strong></p>',
        closingHtml: '<p style="margin:0 0 20px;">Controleer afzender, Reply-To, aflevering en mailauthenticatie.</p><p style="margin:0;">Met vriendelijke groet,<br><strong>Sport 2000 Sportpaleis</strong></p>',
      }),
    },
    ORDER_RECEIVED: {
      key: "ORDER_RECEIVED", version: 1, allowedVariables: sportVariables,
      subject: "Ontvangstbevestiging {{order.number}}",
      text: "Beste {{customer.name}},\n\nWe hebben de kleding/artikelen voor order {{order.number}} ontvangen.\n\n{{order.items}}\n\nDe normale doorlooptijd is circa {{order.processingDays}} werkdagen. Dit is een indicatie en geen harde levergarantie. U ontvangt bericht zodra de bestelling klaar ligt.\n\nMet vriendelijke groet,\nSport 2000 Sportpaleis",
      html: buildOrganizationMailShell({ brandConfig: sportpaleisBrandConfig, preheader: "We hebben bestelling {{order.number}} ontvangen.", eyebrow: "Bedrukking", heading: "We hebben uw bestelling ontvangen", contentHtml: '<p style="margin:0 0 20px;">Beste {{customer.name}},</p><p style="margin:0 0 20px;">We hebben de kleding/artikelen voor order <strong>{{order.number}}</strong> ontvangen.</p><pre style="white-space:pre-wrap;margin:0 0 20px;">{{order.items}}</pre><p style="margin:0;">De normale doorlooptijd is circa {{order.processingDays}} werkdagen. Dit is een indicatie en geen harde levergarantie.</p>', closingHtml: '<p style="margin:0;">U ontvangt bericht zodra de bestelling klaar ligt.</p><p style="margin:20px 0 0;">Met vriendelijke groet,<br><strong>Sport 2000 Sportpaleis</strong></p>' }),
    },
    ORDER_IN_PRODUCTION: {
      key: "ORDER_IN_PRODUCTION", version: 1, allowedVariables: sportVariables,
      subject: "Uw bestelling {{order.number}} is in productie",
      text: "Beste {{customer.name}},\n\nWe zijn gestart met de bedrukking van bestelling {{order.number}}. Zodra de bestelling klaar ligt, ontvangt u opnieuw bericht.\n\nMet vriendelijke groet,\nSport 2000 Sportpaleis",
      html: buildOrganizationMailShell({ brandConfig: sportpaleisBrandConfig, preheader: "Bestelling {{order.number}} is in productie.", eyebrow: "Bedrukking", heading: "Uw bestelling is in productie", contentHtml: '<p style="margin:0 0 20px;">Beste {{customer.name}},</p><p style="margin:0;">We zijn gestart met de bedrukking van bestelling <strong>{{order.number}}</strong>. Zodra de bestelling klaar ligt, ontvangt u opnieuw bericht.</p>', closingHtml: '<p style="margin:0;">Met vriendelijke groet,<br><strong>Sport 2000 Sportpaleis</strong></p>' }),
    },
    ORDER_READY: {
      key: "ORDER_READY", version: 1, allowedVariables: sportVariables,
      subject: "Uw bestelling {{order.number}} ligt klaar",
      text: "Beste {{customer.name}},\n\nUw bestelling {{order.number}} ligt klaar om opgehaald te worden.\n{{order.pickupInformation}}\n\nWasadvies: was bedrukte kleding bij voorkeur binnenstebuiten en volg de kleding- en wasinstructies. Niet in de droger; sterke warmte kan de bedrukking beschadigen of verzwakken.\n\nMet vriendelijke groet,\nSport 2000 Sportpaleis",
      html: buildOrganizationMailShell({ brandConfig: sportpaleisBrandConfig, preheader: "Bestelling {{order.number}} ligt klaar.", eyebrow: "Afhalen", heading: "Uw bestelling ligt klaar", contentHtml: '<p style="margin:0 0 20px;">Beste {{customer.name}},</p><p style="margin:0 0 20px;">Uw bestelling <strong>{{order.number}}</strong> ligt klaar om opgehaald te worden.</p><p style="margin:0;">{{order.pickupInformation}}</p>', closingHtml: '<p style="margin:0 0 20px;"><strong>Wasadvies</strong><br>Was bedrukte kleding bij voorkeur binnenstebuiten en volg het waslabel. Niet in de droger.</p><p style="margin:0;">Met vriendelijke groet,<br><strong>Sport 2000 Sportpaleis</strong></p>' }),
    },
    ORDER_QUESTION: {
      key: "ORDER_QUESTION", version: 1, allowedVariables: sportVariables,
      subject: "Vraag over bestelling {{order.number}}",
      text: "Beste {{customer.name}},\n\nWe hebben een vraag over bestelling {{order.number}}:\n\n{{message.question}}\n\nWilt u contact met ons opnemen of op dit bericht reageren?\n\nMet vriendelijke groet,\nSport 2000 Sportpaleis",
      html: buildOrganizationMailShell({ brandConfig: sportpaleisBrandConfig, preheader: "Een vraag over bestelling {{order.number}}.", eyebrow: "Vraag", heading: "Vraag over uw bestelling", contentHtml: '<p style="margin:0 0 20px;">Beste {{customer.name}},</p><p style="margin:0 0 20px;">We hebben een vraag over bestelling <strong>{{order.number}}</strong>:</p><p style="margin:0;">{{message.question}}</p>', closingHtml: '<p style="margin:0 0 20px;">Wilt u contact met ons opnemen of op dit bericht reageren?</p><p style="margin:0;">Met vriendelijke groet,<br><strong>Sport 2000 Sportpaleis</strong></p>' }),
    },
  };
  const wbdGeneralVariables = [
    "recipient.name",
    "message.subject",
    "message.preheader",
    "message.heading",
    "message.introduction",
    "message.body",
    "message.next_step",
  ];
  const wbdInvoiceVariables = [
    "customer.name",
    "invoice.number",
    "invoice.project",
    "invoice.total",
    "invoice.payment_term",
    "invoice.due_date",
  ];
  const wbdTemplates = {
    WBD_INVOICE_FINAL: {
      key: "WBD_INVOICE_FINAL", version: 3,
      senderPolicy: "WBD_INVOICE",
      allowedVariables: wbdInvoiceVariables,
      subject: "Factuur {{invoice.number}} - {{invoice.project}}",
      text: `Beste {{customer.name}},\n\nBijgevoegd vindt u factuur {{invoice.number}} voor {{invoice.project}}.\n\nFactuurnummer: {{invoice.number}}\nProject: {{invoice.project}}\nBedrag: {{invoice.total}}\nBetaaltermijn: {{invoice.payment_term}}\nVervaldatum: {{invoice.due_date}}\n\nDe betaalgegevens staan op de bijgevoegde factuur. Heeft u een vraag over deze factuur? Reageer gerust op deze mail.\n\nMet vriendelijke groet,\nWe Build And Design\n\nBijlage: Factuur {{invoice.number}} (PDF)\n\n${wbdInvoicePlainFooter}`,
      html: buildOrganizationMailShell({
        brandConfig: wbdBrandConfig,
        preheader: "Factuur {{invoice.number}} is als PDF bijgevoegd.",
        eyebrow: "Factuur",
        heading: "Factuur {{invoice.number}}",
        contentHtml: `<p style="margin:0 0 20px;">Beste {{customer.name}},</p><p style="margin:0;">Bijgevoegd vindt u factuur <strong>{{invoice.number}}</strong> voor {{invoice.project}}.</p>`,
        facts: [
          { label: "Factuurnummer", value: "{{invoice.number}}" },
          { label: "Project", value: "{{invoice.project}}" },
          { label: "Bedrag", value: "{{invoice.total}}" },
          { label: "Betaaltermijn", value: "{{invoice.payment_term}}" },
          { label: "Vervaldatum", value: "{{invoice.due_date}}" },
        ],
        closingHtml: `<p style="margin:0 0 20px;">De betaalgegevens staan op de bijgevoegde factuur. Heeft u een vraag over deze factuur? Reageer gerust op deze mail.</p><p style="margin:0;">Met vriendelijke groet,<br><strong>We Build And Design</strong></p>`,
        attachmentLine: "Bijlage: Factuur {{invoice.number}} (PDF)",
        corporateFooterEmail: "facturen@webuildanddesign.nl",
      }),
    },
    WBD_GENERAL_SMTP_TEST: {
      key: "WBD_GENERAL_SMTP_TEST", version: 3,
      senderPolicy: "WBD_GENERAL",
      allowedVariables: wbdGeneralVariables,
      subject: "{{message.subject}}",
      text: `Beste {{recipient.name}},\n\n{{message.introduction}}\n\n{{message.body}}\n\nVolgende stap\n{{message.next_step}}\n\nHeeft u tussendoor een vraag? Reageer gerust op deze mail.\n\nMet vriendelijke groet,\nDonovan\nWe Build And Design\n\n${wbdGeneralPlainFooter}`,
      html: buildOrganizationMailShell({
        brandConfig: wbdBrandConfig,
        preheader: "{{message.preheader}}",
        eyebrow: "Persoonlijk bericht",
        heading: "{{message.heading}}",
        contentHtml: `<p style="margin:0 0 20px;">Beste {{recipient.name}},</p><p style="margin:0 0 20px;">{{message.introduction}}</p><p style="margin:0 0 24px;">{{message.body}}</p><h2 style="margin:0 0 10px;color:${wbdBrand.body_text_color};font-family:${wbdBrand.heading_font_stack};font-size:22px;line-height:29px;font-weight:normal;">Volgende stap</h2><p style="margin:0;">{{message.next_step}}</p>`,
        closingHtml: `<p style="margin:0 0 20px;">Heeft u tussendoor een vraag? Reageer gerust op deze mail.</p><p style="margin:0;">Met vriendelijke groet,<br><strong>Donovan</strong><br>We Build And Design</p>`,
        corporateFooterEmail: "info@webuildanddesign.nl",
      }),
    },
  };
  return {
    "sportpaleis": {
      id: "sportpaleis", name: "Sport 2000 Sportpaleis B.V.", defaultSenderPolicy: "SPORTPALEIS_BEDRUKKING", senderPolicies: {
        SPORTPALEIS_BEDRUKKING: { key: "SPORTPALEIS_BEDRUKKING", name: "Sport 2000 Sportpaleis - Bedrukking", address: "bedrukking@sportpaleis.nl", status: "VDX_MAILBOX_AND_CONTROLLED_INBOX_CONFIRMED_AUTH_HEADERS_PENDING" },
      },
      replyTo: "bedrukking@sportpaleis.nl",
      messageIdDomain: "sportpaleis.nl",
      senderPolicyHeader: "X-Sportpaleis-Sender-Policy",
      brandConfig: sportpaleisBrandConfig,
      inlineAssets: [],
      branding: sportBranding,
      smtp: new DisabledSmtpTransport({ host: "mail.hostingserver.nl", port: 465, tls: "IMPLICIT_TLS_REQUIRED", usernameStatus: "REQUIRES_SECRET_REFERENCE" }),
      templates: sportTemplates,
      permissions: {
        preview: { SPORTPALEIS_BEDRUKKING_SMTP_TEST: ["admin"], ORDER_RECEIVED: ["admin", "store"], ORDER_IN_PRODUCTION: ["admin", "operator"], ORDER_READY: ["admin", "operator"], ORDER_QUESTION: ["admin", "operator", "store"] },
        send: { SPORTPALEIS_BEDRUKKING_SMTP_TEST: ["admin"], ORDER_RECEIVED: ["admin", "store"], ORDER_IN_PRODUCTION: ["admin", "operator"], ORDER_READY: ["admin", "operator"], ORDER_QUESTION: ["admin", "operator", "store"] },
        history: { "*": ["admin", "operator", "store"] },
      },
    },
    "we-build-and-design": {
      id: "we-build-and-design", name: "We Build And Design", defaultSenderPolicy: "WBD_GENERAL", senderPolicies: {
        WBD_GENERAL: { key: "WBD_GENERAL", name: "We Build And Design", address: "info@webuildanddesign.nl", status: "TRANSIP_MAILBOX_CONFIRMED_002" },
        WBD_INVOICE: { key: "WBD_INVOICE", name: "We Build And Design Facturen", address: "facturen@webuildanddesign.nl", status: "TRANSIP_MAILBOX_CONFIRMED_002" },
      },
      messageIdDomain: "workspace.webuildanddesign.nl",
      senderPolicyHeader: "X-WBD-Sender-Policy",
      brandConfig: wbdBrandConfig,
      inlineAssets: wbdInlineAssets,
      branding: {
        primary: wbdBrand.primary_color,
        secondary: wbdBrand.secondary_background_color,
        accent: wbdBrand.accent_color,
        text: wbdBrand.body_text_color,
        label: wbdBrand.display_name,
      },
      smtp: new DisabledSmtpTransport({ host: "smtp.transip.email", port: 465, tls: "TLS/SSL", usernameStatus: "REQUIRES_SECRET_REFERENCE" }),
      templates: wbdTemplates,
      permissions: { preview: { WBD_INVOICE_FINAL: ["owner"], WBD_GENERAL_SMTP_TEST: ["owner"] }, send: { WBD_INVOICE_FINAL: ["owner"], WBD_GENERAL_SMTP_TEST: ["owner"] }, history: { "*": ["owner"] } },
    },
  };
}

export function createLocalMailFoundation({ stateFile, captureDirectory, simulation = "success" }) {
  const store = new JsonMailStore({ filePath: stateFile });
  const transport = new CaptureTransport({ captureDirectory, simulation });
  return new MailFoundation({ organizations: createMailOrganizations(), store, transport });
}

function controlledAllowlist(environment, variableName) {
  const raw = String(environment[variableName] ?? "").trim();
  if (!raw) return [];
  if (raw.includes("*") || raw.includes(",") || raw.includes(";") || raw.split(/\s+/).length !== 1) {
    throw new MailFoundationError("SMTP_CONFIG_INVALID", "De gecontroleerde SMTP-allowlist moet exact één e-mailadres bevatten.", 500);
  }
  return [email(raw)];
}

function configuredMailMode(environment) {
  const configured = [environment.MAIL_MODE, environment.WBD_MAIL_MODE, environment.SPORTPALEIS_MAIL_MODE]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean);
  const distinct = [...new Set(configured)];
  if (distinct.length > 1) throw new MailFoundationError("SMTP_CONFIG_INVALID", "Organisatie-mailmodi spreken elkaar tegen.", 500);
  return distinct[0] ?? MAIL_ENVIRONMENTS.CAPTURE;
}

export function createEnvironmentMailFoundation({ stateFile, captureDirectory, simulation = "success", environment = process.env } = {}) {
  const mode = configuredMailMode(environment);
  if (mode === MAIL_ENVIRONMENTS.CAPTURE) return createLocalMailFoundation({ stateFile, captureDirectory, simulation });
  const wbdAllowlistedRecipients = controlledAllowlist(environment, "WBD_SMTP_TEST_RECIPIENT");
  const sportpaleisAllowlistedRecipients = controlledAllowlist(environment, "SPORTPALEIS_SMTP_TEST_RECIPIENT");
  const wbdCommon = {
    host: "smtp.transip.email",
    port: 465,
    tlsRequired: true,
    allowlistedRecipients: wbdAllowlistedRecipients,
    connectionTimeoutMs: Number(environment.WBD_SMTP_CONNECTION_TIMEOUT_MS ?? 10_000),
    commandTimeoutMs: Number(environment.WBD_SMTP_SEND_TIMEOUT_MS ?? 15_000),
    clientHostname: "workspace.webuildanddesign.nl",
  };
  const sportpaleisCommon = {
    host: String(environment.SPORTPALEIS_SMTP_HOST ?? "mail.hostingserver.nl").trim(),
    port: Number(environment.SPORTPALEIS_SMTP_PORT ?? 465),
    tlsRequired: true,
    allowlistedRecipients: sportpaleisAllowlistedRecipients,
    connectionTimeoutMs: Number(environment.SPORTPALEIS_SMTP_CONNECTION_TIMEOUT_MS ?? 10_000),
    commandTimeoutMs: Number(environment.SPORTPALEIS_SMTP_SEND_TIMEOUT_MS ?? 15_000),
    clientHostname: "workspace.sportpaleis.nl",
  };
  const captureTransport = new CaptureTransport({ captureDirectory, simulation });
  const smtpTransports = {
    WBD_GENERAL: new AuthenticatedSmtpTransport({
      ...wbdCommon,
      organizationId: "we-build-and-design",
      senderPolicy: "WBD_GENERAL",
      senderAddress: "info@webuildanddesign.nl",
      usernameProvider: () => environment.WBD_SMTP_INFO_USERNAME,
      secretProvider: () => environment.WBD_SMTP_INFO_PASSWORD,
    }),
    WBD_INVOICE: new AuthenticatedSmtpTransport({
      ...wbdCommon,
      organizationId: "we-build-and-design",
      senderPolicy: "WBD_INVOICE",
      senderAddress: "facturen@webuildanddesign.nl",
      usernameProvider: () => environment.WBD_SMTP_INVOICE_USERNAME,
      secretProvider: () => environment.WBD_SMTP_INVOICE_PASSWORD,
    }),
    SPORTPALEIS_BEDRUKKING: new AuthenticatedSmtpTransport({
      ...sportpaleisCommon,
      organizationId: "sportpaleis",
      senderPolicy: "SPORTPALEIS_BEDRUKKING",
      senderAddress: "bedrukking@sportpaleis.nl",
      usernameProvider: () => environment.SPORTPALEIS_SMTP_BEDRUKKING_USERNAME,
      secretProvider: () => environment.SPORTPALEIS_SMTP_BEDRUKKING_PASSWORD,
    }),
  };
  const controlledSmtpOrganizations = [
    ...(environment.WBD_CONTROLLED_SMTP_ENABLED === "YES_ONE_ALLOWLISTED_RECIPIENT" ? ["we-build-and-design"] : []),
    ...(environment.SPORTPALEIS_CONTROLLED_SMTP_ENABLED === "YES_ONE_ALLOWLISTED_RECIPIENT" ? ["sportpaleis"] : []),
  ];
  const productionSmtpOrganizations = [
    ...(environment.WBD_PRODUCTION_SMTP_ENABLED === "YES_EXPLICIT_PRODUCTION_APPROVAL" ? ["we-build-and-design"] : []),
    ...(environment.SPORTPALEIS_PRODUCTION_SMTP_ENABLED === "YES_EXPLICIT_PRODUCTION_APPROVAL" ? ["sportpaleis"] : []),
  ];
  const transport = new EnvironmentMailTransport({
    mode,
    captureTransport,
    smtpTransports,
    controlledSmtpOrganizations,
    productionSmtpOrganizations,
    controlledTestPolicies: {
      "we-build-and-design": {
        templates: ["WBD_GENERAL_SMTP_TEST", "WBD_INVOICE_FINAL"],
        requires: { WBD_INVOICE_FINAL: "WBD_GENERAL_SMTP_TEST" },
      },
      "sportpaleis": {
        templates: ["SPORTPALEIS_BEDRUKKING_SMTP_TEST"],
        requires: {},
      },
    },
  });
  return new MailFoundation({ organizations: createMailOrganizations(), store: new JsonMailStore({ filePath: stateFile }), transport });
}
