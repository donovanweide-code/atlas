import { AsyncLocalStorage } from "node:async_hooks";

// Request authority is carried with the prepared command, never serialized into
// durable data. Stores recheck it under their existing revision/write lock.
// Session policy and capability resolution remain separate callers of this hook.
const authority = new AsyncLocalStorage();
export function withWorkspaceMutationAuthority(check, operation) {
  const parent = authority.getStore();
  return authority.run(state => { parent?.(state); check(state); }, operation);
}
export function captureWorkspaceMutationAuthority() { return authority.getStore() || null; }
