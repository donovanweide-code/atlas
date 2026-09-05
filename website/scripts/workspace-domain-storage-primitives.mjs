import { createHash } from "node:crypto";

export function canonicalJsonSha256(value) {
  const active = new WeakSet();
  const normalize = (nested) => {
    if (!nested || typeof nested !== "object" || Buffer.isBuffer(nested)) return nested;
    if (active.has(nested)) throw new TypeError("Cyclische state kan niet worden gehasht.");
    active.add(nested);
    const normalized = Array.isArray(nested)
      ? nested.map(normalize)
      : Object.fromEntries(Object.keys(nested).sort().map((key) => [key, normalize(nested[key])]));
    active.delete(nested);
    return normalized;
  };
  return createHash("sha256").update(JSON.stringify(normalize(value))).digest("hex");
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || Object.isFrozen(value) || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, seen);
  return Object.freeze(value);
}

export function immutableSnapshot(value) {
  return deepFreeze(structuredClone(value));
}

export function createTopLevelCopyOnWriteDraft(snapshot, { cloneValue = (_key, value) => structuredClone(value), domainForKey, hash = canonicalJsonSha256 } = {}) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) throw new TypeError("State-snapshot moet een object zijn.");
  if (typeof domainForKey !== "function") throw new TypeError("domainForKey is verplicht.");
  const touched = new Set();
  const values = new Map();
  const draft = new Proxy({}, {
    get(_target, key) {
      if (typeof key === "symbol") return undefined;
      if (values.has(key)) return values.get(key);
      if (!Object.hasOwn(snapshot, key)) return undefined;
      const value = cloneValue(key, snapshot[key]);
      values.set(key, value);
      touched.add(key);
      return value;
    },
    set(_target, key, value) {
      if (typeof key !== "string") return false;
      values.set(key, value);
      touched.add(key);
      return true;
    },
    deleteProperty(_target, key) {
      if (typeof key !== "string") return false;
      values.set(key, undefined);
      touched.add(key);
      return true;
    },
    has(_target, key) { return values.has(key) || Object.hasOwn(snapshot, key); },
    ownKeys() { return [...new Set([...Reflect.ownKeys(snapshot), ...values.keys()])]; },
    getOwnPropertyDescriptor(_target, key) {
      if (!values.has(key) && !Object.hasOwn(snapshot, key)) return undefined;
      return { configurable: true, enumerable: true, writable: true, value: values.has(key) ? values.get(key) : snapshot[key] };
    },
  });
  return {
    draft,
    finalize() {
      const next = { ...snapshot };
      const changedKeys = [];
      for (const key of touched) {
        const value = values.get(key);
        if (value === undefined) delete next[key]; else next[key] = value;
        if (hash(value) !== hash(snapshot[key])) changedKeys.push(key);
      }
      return {
        state: next,
        changedKeys: Object.freeze(changedKeys.sort()),
        changedDomains: Object.freeze([...new Set(changedKeys.map(domainForKey))].sort()),
        clonedKeys: Object.freeze([...touched].sort()),
      };
    },
  };
}

export function diffStableRecords(previous, next, { identity, hash = canonicalJsonSha256 } = {}) {
  if (typeof identity !== "function") throw new TypeError("Recordidentity is verplicht.");
  const previousById = new Map(previous.map((record, ordinal) => [identity(record), { record, ordinal }]));
  const nextById = new Map(next.map((record, ordinal) => [identity(record), { record, ordinal }]));
  if (previousById.size !== previous.length || nextById.size !== next.length) throw new Error("Recordcollectie bevat dubbele identities.");
  const deleted = [...previousById.keys()].filter((id) => !nextById.has(id));
  const changed = [];
  for (const [id, candidate] of nextById) {
    const prior = previousById.get(id);
    const candidateHash = hash(candidate.record);
    if (!prior || prior.ordinal !== candidate.ordinal || hash(prior.record) !== candidateHash) changed.push({ id, ...candidate, hash: candidateHash });
  }
  return Object.freeze({ deleted: Object.freeze(deleted), changed: Object.freeze(changed) });
}
