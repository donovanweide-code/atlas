import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

const DEFAULT_LIMIT = 250;
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

function required(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new Error(`${label} ontbreekt.`);
  return normalized;
}

function addressList(value) {
  const values = value?.value ?? [];
  return values.map(({ name, address }) => ({ name: String(name ?? "").trim() || null, address: String(address ?? "").trim().toLowerCase() })).filter(({ address }) => address);
}

function headerRecord(headers) {
  const result = {};
  for (const [key, value] of headers ?? []) result[String(key).toLowerCase()] = String(value ?? "").slice(0, 4_000);
  return result;
}

function references(value) {
  if (Array.isArray(value)) return value.map(String);
  return String(value ?? "").match(/<[^>]+>/gu) ?? [];
}

export function parseWbdImapConfiguration(environment = process.env) {
  const mailboxes = [
    { id: "wbd-info", address: "info@webuildanddesign.nl", prefix: "WBD_MAIL_INFO" },
    { id: "wbd-facturen", address: "facturen@webuildanddesign.nl", prefix: "WBD_MAIL_FACTUREN" },
  ];
  return mailboxes.map((mailbox) => {
    const host = String(environment[`${mailbox.prefix}_IMAP_HOST`] ?? "").trim();
    const user = String(environment[`${mailbox.prefix}_IMAP_USER`] ?? "").trim();
    const password = String(environment[`${mailbox.prefix}_IMAP_PASSWORD`] ?? "");
    const configured = Boolean(host && user && password);
    return {
      ...mailbox,
      configured,
      host: configured ? host : null,
      port: configured ? Number(environment[`${mailbox.prefix}_IMAP_PORT`] || 993) : null,
      secure: configured ? environment[`${mailbox.prefix}_IMAP_SECURE`] !== "false" : true,
      user: configured ? user : null,
      secret: configured ? password : null,
    };
  });
}

export class WbdImapMailboxConnector {
  constructor({ mailbox, clientFactory = (options) => new ImapFlow(options), parser = simpleParser, logger = false }) {
    this.mailbox = mailbox;
    this.clientFactory = clientFactory;
    this.parser = parser;
    this.logger = logger;
  }

  publicSummary() {
    return { id: this.mailbox.id, address: this.mailbox.address, configured: this.mailbox.configured, host: this.mailbox.host, port: this.mailbox.port, secure: this.mailbox.secure, secretExposed: false };
  }

  async verify() {
    if (!this.mailbox.configured) return { status: "NOT_CONNECTED", mailboxId: this.mailbox.id, failureCode: "CREDENTIALS_NOT_PROVISIONED" };
    const client = this.#client();
    try {
      await client.connect();
      const capabilities = [...(client.capabilities ?? [])].map(String).sort();
      const folders = await client.list();
      return { status: "HEALTHY", mailboxId: this.mailbox.id, capabilities, folders: folders.map(({ path, specialUse }) => ({ path, specialUse: specialUse ?? null })) };
    } catch (cause) {
      return { status: "FAILED", mailboxId: this.mailbox.id, failureCode: String(cause?.code ?? "IMAP_VERIFY_FAILED") };
    } finally { await client.logout().catch(() => undefined); }
  }

  async fetchIncremental({ folder = "INBOX", checkpoint = null, limit = DEFAULT_LIMIT } = {}) {
    if (!this.mailbox.configured) return { status: "FAILED", mailboxId: this.mailbox.id, failureCode: "CREDENTIALS_NOT_PROVISIONED", messages: [] };
    const client = this.#client();
    const boundedLimit = Math.max(1, Math.min(1_000, Number(limit) || DEFAULT_LIMIT));
    try {
      await client.connect();
      const lock = await client.getMailboxLock(required(folder, "Mailmap"));
      try {
        const uidValidity = String(client.mailbox?.uidValidity ?? "");
        if (!uidValidity) throw Object.assign(new Error("UIDVALIDITY ontbreekt."), { code: "UIDVALIDITY_MISSING" });
        const reset = Boolean(checkpoint?.uidValidity && String(checkpoint.uidValidity) !== uidValidity);
        const continuing = Boolean(checkpoint?.uidValidity && !reset && Number(checkpoint?.highestUid) >= 0);
        const startUid = continuing ? Math.max(1, Number(checkpoint.highestUid) + 1) : 1;
        const matched = await client.search(continuing ? { uid: `${startUid}:*` } : { all: true }, { uid: true });
        const available = matched.filter((uid) => Number(uid) >= startUid).sort((a, b) => a - b);
        const uids = continuing ? available.slice(0, boundedLimit) : available.slice(-boundedLimit);
        const messages = [];
        if (uids.length) {
          for await (const item of client.fetch(uids, { uid: true, source: { maxLength: MAX_SOURCE_BYTES }, flags: true, internalDate: true, size: true }, { uid: true })) {
            if (!item.source) continue;
            const parsed = await this.parser(item.source, { skipHtmlToText: true, skipTextToHtml: true, maxHtmlLengthToParse: 4_000_000 });
            messages.push({
              folder, uidValidity, uid: Number(item.uid), messageId: parsed.messageId ?? null,
              inReplyTo: parsed.inReplyTo ?? null, references: references(parsed.references), from: addressList(parsed.from)[0] ?? null,
              to: addressList(parsed.to), cc: addressList(parsed.cc), replyTo: addressList(parsed.replyTo)[0] ?? null,
              subject: parsed.subject ?? "(geen onderwerp)", sentAt: parsed.date ?? item.internalDate,
              receivedAt: item.internalDate ?? parsed.date ?? new Date(), text: parsed.text ?? "", html: typeof parsed.html === "string" ? parsed.html : "",
              headers: headerRecord(parsed.headers), flags: [...(item.flags ?? [])].map(String), size: Number(item.size ?? item.source.length),
              attachments: (parsed.attachments ?? []).map((attachment, index) => ({ id: `${this.mailbox.id}-${uidValidity}-${item.uid}-${index}`, filename: attachment.filename ?? `bijlage-${index + 1}`, contentType: attachment.contentType, size: attachment.size, contentHash: attachment.checksum ?? null, disposition: attachment.contentDisposition, contentId: attachment.cid ?? null, storageReference: null })),
              rawReference: { kind: "IMAP", mailboxId: this.mailbox.id, folder, uidValidity, uid: Number(item.uid), immutable: false },
            });
          }
        }
        return { status: "SUCCEEDED", mailboxId: this.mailbox.id, folder, uidValidity, highestUid: uids.length ? Math.max(...uids) : Number(checkpoint?.highestUid ?? 0), resetRequired: Boolean(reset), messages };
      } finally { lock.release(); }
    } catch (cause) {
      return { status: "FAILED", mailboxId: this.mailbox.id, failureCode: String(cause?.code ?? "IMAP_FETCH_FAILED"), messages: [] };
    } finally { await client.logout().catch(() => undefined); }
  }

  #client() {
    return this.clientFactory({ host: this.mailbox.host, port: this.mailbox.port, secure: this.mailbox.secure, auth: { user: this.mailbox.user, pass: this.mailbox.secret }, logger: this.logger, disableAutoIdle: true, emitLogs: false });
  }
}

export class WbdMailConnectorScheduler {
  constructor({ service, connectors, intervalMs = 120_000, onResult = () => {}, onError = () => {} }) {
    this.service = service;
    this.connectors = connectors;
    this.intervalMs = Math.max(30_000, intervalMs);
    this.onResult = onResult;
    this.onError = onError;
    this.timer = null;
    this.running = false;
  }
  start() {
    if (this.timer || !this.connectors.some(({ mailbox }) => mailbox.configured)) return;
    this.timer = setInterval(() => this.refresh().catch(this.onError), this.intervalMs);
    this.timer.unref?.();
    queueMicrotask(() => this.refresh().catch(this.onError));
  }
  async refresh() {
    if (this.running) return [];
    this.running = true;
    try {
      const view = await this.service.workspaceView();
      const results = [];
      for (const connector of this.connectors.filter(({ mailbox }) => mailbox.configured)) {
        const mailbox = view.mailboxes.find(({ id }) => id === connector.mailbox.id);
        const snapshot = await connector.fetchIncremental({ checkpoint: mailbox?.checkpoint });
        const result = await this.service.ingestMailboxSnapshot(snapshot);
        results.push(result);
        await this.onResult(result);
      }
      return results;
    } finally { this.running = false; }
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

export const wbdImapConnectorContract = Object.freeze({ transport: "IMAP_TLS", defaultPort: 993, credentials: "SERVER_SIDE_ENV_ONLY", rendering: "CENTRAL_STATE_ONLY", initialSync: "RECENT_FIRST", incrementalIdentity: "UIDVALIDITY_UID", externalSend: false });
