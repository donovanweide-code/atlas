export type ReadonlyCacheObservation =
  | "CACHE_TOO_LARGE"
  | "CACHE_WRITE_FAILED"
  | "CACHE_READ_FAILED"
  | "CACHE_CORRUPT"
  | "CACHE_STORAGE_UNAVAILABLE";

interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface NonCriticalReadonlyCacheOptions<T> {
  key: string;
  keyPrefix: string;
  maxBytes: number;
  resolveStorage: () => StorageLike | undefined;
  validate: (value: unknown) => value is T;
  observe?: (observation: ReadonlyCacheObservation) => void;
}

export interface NonCriticalReadonlyCache<T> {
  clear(): void;
  read(): T | undefined;
  replace(value: T): "STORED" | "SKIPPED_TOO_LARGE" | "STORAGE_UNAVAILABLE" | "WRITE_FAILED";
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function createNonCriticalReadonlyCache<T>(options: NonCriticalReadonlyCacheOptions<T>): NonCriticalReadonlyCache<T> {
  // Core invariant: cache and cache-observability are non-critical and may never block auth, bootstrap or central state.
  const observe = (observation: ReadonlyCacheObservation): void => {
    try { options.observe?.(observation); } catch { /* Observability is non-critical too. */ }
  };

  const storage = (): StorageLike | undefined => {
    try {
      const resolved = options.resolveStorage();
      if (!resolved) observe("CACHE_STORAGE_UNAVAILABLE");
      return resolved;
    } catch {
      observe("CACHE_STORAGE_UNAVAILABLE");
      return undefined;
    }
  };

  const removeOwnedEntries = (resolved: StorageLike, includeCurrent: boolean): void => {
    try {
      const keys = Array.from({ length: resolved.length }, (_, index) => resolved.key(index))
        .filter((key): key is string => Boolean(key?.startsWith(options.keyPrefix)))
        .filter((key) => includeCurrent || key !== options.key);
      for (const key of keys) resolved.removeItem(key);
      if (includeCurrent) resolved.removeItem(options.key);
    } catch {
      observe("CACHE_WRITE_FAILED");
    }
  };

  return {
    clear(): void {
      const resolved = storage();
      if (resolved) removeOwnedEntries(resolved, true);
    },

    read(): T | undefined {
      const resolved = storage();
      if (!resolved) return undefined;
      removeOwnedEntries(resolved, false);
      try {
        const raw = resolved.getItem(options.key);
        if (!raw) return undefined;
        const parsed: unknown = JSON.parse(raw);
        if (!options.validate(parsed)) {
          resolved.removeItem(options.key);
          observe("CACHE_CORRUPT");
          return undefined;
        }
        return parsed;
      } catch {
        try { resolved.removeItem(options.key); } catch { /* Cache is non-critical. */ }
        observe("CACHE_READ_FAILED");
        return undefined;
      }
    },

    replace(value: T): "STORED" | "SKIPPED_TOO_LARGE" | "STORAGE_UNAVAILABLE" | "WRITE_FAILED" {
      let serialized: string;
      try {
        serialized = JSON.stringify(value);
      } catch {
        observe("CACHE_WRITE_FAILED");
        return "WRITE_FAILED";
      }
      const resolved = storage();
      if (!resolved) return "STORAGE_UNAVAILABLE";
      removeOwnedEntries(resolved, true);
      let serializedBytes: number;
      try { serializedBytes = byteLength(serialized); }
      catch {
        observe("CACHE_WRITE_FAILED");
        return "WRITE_FAILED";
      }
      if (serializedBytes > options.maxBytes) {
        observe("CACHE_TOO_LARGE");
        return "SKIPPED_TOO_LARGE";
      }
      try {
        resolved.setItem(options.key, serialized);
        return "STORED";
      } catch {
        try { resolved.removeItem(options.key); } catch { /* Cache is non-critical. */ }
        observe("CACHE_WRITE_FAILED");
        return "WRITE_FAILED";
      }
    },
  };
}
