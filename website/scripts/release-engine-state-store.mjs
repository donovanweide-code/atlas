import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { assertTransition, createAuditEvent, verifyAuditChain } from "./release-engine-core.mjs";

const safePart = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

function safeKey({ tenant, application, releaseId }) {
  for (const [name, value] of Object.entries({ tenant, application, releaseId })) {
    if (!safePart.test(String(value ?? ""))) throw new Error(`${name} is geen veilige release-store sleutel.`);
  }
  return `${tenant}--${application}--${releaseId}`;
}

export class InMemoryReleaseStateStore {
  #runs = new Map();
  #locks = new Set();

  async events(identity) {
    return structuredClone(this.#runs.get(safeKey(identity)) ?? []);
  }

  async append(identity, event) {
    const key = safeKey(identity);
    const events = this.#runs.get(key) ?? [];
    const current = verifyAuditChain(events).current;
    if (events.some((existing) => existing.idempotencyKey === event.idempotencyKey)) {
      return structuredClone(events.find((existing) => existing.idempotencyKey === event.idempotencyKey));
    }
    if (event.previousHash !== (current?.eventHash ?? null) || event.sequence !== Number(current?.sequence ?? 0) + 1) throw new Error("Optimistic audit append conflict.");
    verifyAuditChain([...events, event]);
    events.push(structuredClone(event));
    this.#runs.set(key, events);
    return structuredClone(event);
  }

  async lock(identity, owner) {
    const key = `${identity.tenant}--${identity.application}`;
    if (this.#locks.has(key)) throw Object.assign(new Error(`Release lock bezet voor ${key}.`), { code: "CONCURRENT_RELEASE" });
    this.#locks.add(key);
    return async () => { this.#locks.delete(key); };
  }
}

export class FileReleaseStateStore {
  constructor({ root }) {
    this.root = path.resolve(root);
  }

  file(identity) {
    return path.join(this.root, "events", `${safeKey(identity)}.jsonl`);
  }

  async events(identity) {
    try {
      const text = await readFile(this.file(identity), "utf8");
      const events = text.split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
      verifyAuditChain(events);
      return events;
    } catch (error) {
      if (error?.code === "ENOENT") return [];
      throw error;
    }
  }

  async append(identity, event) {
    const file = this.file(identity);
    await mkdir(path.dirname(file), { recursive: true, mode: 0o750 });
    const events = await this.events(identity);
    const duplicate = events.find((existing) => existing.idempotencyKey === event.idempotencyKey);
    if (duplicate) return duplicate;
    const current = verifyAuditChain(events).current;
    if (event.previousHash !== (current?.eventHash ?? null) || event.sequence !== Number(current?.sequence ?? 0) + 1) throw new Error("Optimistic audit append conflict.");
    const next = [...events, event];
    verifyAuditChain(next);
    const temporary = `${file}.${process.pid}.tmp`;
    const handle = await open(temporary, "wx", 0o640);
    try {
      await handle.writeFile(`${next.map((item) => JSON.stringify(item)).join("\n")}\n`, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, file);
    try {
      const directoryHandle = await open(path.dirname(file), "r");
      try { await directoryHandle.sync(); } finally { await directoryHandle.close(); }
    } catch (error) {
      if (process.platform !== "win32") throw error;
    }
    return event;
  }

  async lock(identity, owner) {
    const lock = path.join(this.root, "locks", `${safeKey({ ...identity, releaseId: "lock" }).replace(/--lock$/u, "")}.lock`);
    await mkdir(path.dirname(lock), { recursive: true, mode: 0o750 });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await mkdir(lock, { mode: 0o750 });
        await writeFile(path.join(lock, "owner.json"), JSON.stringify({ owner, pid: process.pid, acquiredAt: new Date().toISOString() }), { encoding: "utf8", mode: 0o640, flag: "wx" });
        break;
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        let metadata;
        try { metadata = JSON.parse(await readFile(path.join(lock, "owner.json"), "utf8")); } catch { throw Object.assign(new Error(`Release lock bezet en niet veilig verifieerbaar voor ${identity.tenant}/${identity.application}.`), { code: "CONCURRENT_RELEASE" }); }
        let alive = true;
        try { process.kill(Number(metadata.pid), 0); } catch (processError) { if (processError?.code === "ESRCH") alive = false; else throw processError; }
        if (alive || attempt > 0) throw Object.assign(new Error(`Release lock bezet voor ${identity.tenant}/${identity.application}.`), { code: "CONCURRENT_RELEASE" });
        await rm(lock, { recursive: true, force: false });
      }
    }
    let released = false;
    return async () => {
      if (released) return;
      released = true;
      await rm(lock, { recursive: true, force: false });
    };
  }
}

export async function currentReleaseState(store, identity) {
  return verifyAuditChain(await store.events(identity)).current;
}

export async function appendReleaseTransition(store, identity, { to, type, actorId, actorDisplayName, details, idempotencyKey, at }) {
  const previous = await currentReleaseState(store, identity);
  if (previous) assertTransition(previous.state, to);
  else if (to !== "CANDIDATE") throw new Error("Eerste release-event moet CANDIDATE zijn.");
  const event = createAuditEvent({ previous, state: to, type, ...identity, actorId, actorDisplayName, details, idempotencyKey, at });
  return store.append(identity, event);
}
