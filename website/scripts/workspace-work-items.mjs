import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { validDay, projectWorkItems } from "../src/workspace-work-item.ts";

const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
const text = (value, max, required = false) => {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) fail(400, "Controleer de ingevulde tekst.");
  return value.trim();
};
const relationTypes = new Set(["CONTACT", "CUSTOMER", "ORDER", "WEBSHOP_ORDER", "EMAIL", "DOCUMENT", "SUPPLIER", "TEAMWEAR", "PRODUCTION_CONTEXT"]);
export class WorkItemFileStore {
  constructor(filePath) { this.filePath = path.resolve(filePath); }
  async read() {
    try { return JSON.parse(await readFile(this.filePath, "utf8")); }
    catch (error) { if (error.code === "ENOENT") return { schemaVersion: 1, items: [], events: [] }; throw error; }
  }
  async mutate(fn) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    let lock;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { lock = await open(`${this.filePath}.lock`, "wx", 0o600); break; }
      catch (error) { if (error.code !== "EEXIST") throw error; await new Promise(resolve => setTimeout(resolve, 20)); }
    }
    if (!lock) fail(503, "Planning is bezig met opslaan. Probeer opnieuw.");
    const temporary = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      const state = await this.read(); const result = fn(state);
      const file = await open(temporary, "wx", 0o600);
      try { await file.writeFile(JSON.stringify(state)); await file.sync(); } finally { await file.close(); }
      await rename(temporary, this.filePath); return structuredClone(result);
    } finally { await unlink(temporary).catch(() => {}); await lock.close(); await unlink(`${this.filePath}.lock`); }
  }
}
export class WorkItemService {
  constructor({ store, config, now = () => new Date() }) { this.store = store; this.config = config; this.now = now; }
  async scope(context) {
    const config = await this.config(); const rule = config.workspaces?.[context.workspaceId];
    if (!rule?.enabledUserIds?.includes(context.user.id)) fail(403, "Planning is nog niet beschikbaar voor dit account.");
    const users = context.users.filter(user => user.status === "Actief" && rule.eligibleUserIds.includes(user.id)).map(({ id, name }) => ({ id, name }));
    return { ...context, users, allowedIds: new Set(users.map(user => user.id)), teams: context.teams || [] };
  }
  visible(item, scope) { return item.workspaceId === scope.workspaceId && (item.owner === scope.user.id || item.sharedWith.includes(scope.user.id) || item.sharedWithTeams.some(id => scope.teams.some(team => team.id === id && team.memberIds.includes(scope.user.id)))); }
  async list(context) {
    const scope = await this.scope(context); const state = await this.store.read();
    const items = state.items.filter(item => this.visible(item, scope));
    return { users: scope.users, items, projection: projectWorkItems(items, this.now()), serverTime: this.now().toISOString() };
  }
  validate(input, scope, previous) {
    const item = { type: "TASK", title: "", description: "", owner: scope.user.id, sharedWith: [], sharedWithTeams: [], dueDate: null, startTime: null, endTime: null, relatedEntities: [], ...previous };
    const allowed = ["type", "title", "description", "owner", "sharedWith", "sharedWithTeams", "dueDate", "startTime", "endTime", "relatedEntities"];
    for (const key of allowed) if (Object.hasOwn(input, key)) item[key] = input[key];
    if (!["TASK", "APPOINTMENT"].includes(item.type)) fail(400, "Kies een taak of afspraak.");
    item.title = text(item.title, 300, true); item.description = text(item.description, 10000);
    if (!scope.allowedIds.has(item.owner)) fail(400, "Kies een actieve collega.");
    if (!Array.isArray(item.sharedWith) || item.sharedWith.length > 100 || item.sharedWith.some(id => !scope.allowedIds.has(id))) fail(400, "Controleer met wie je deelt.");
    item.sharedWith = [...new Set(item.sharedWith)];
    if (!Array.isArray(item.sharedWithTeams) || item.sharedWithTeams.some(id => !scope.teams.some(team => team.id === id && team.memberIds.includes(scope.user.id)))) fail(400, "Dit team is niet beschikbaar.");
    if (!previous && item.owner !== scope.user.id && !item.sharedWith.includes(scope.user.id)) item.sharedWith.push(scope.user.id);
    if (item.dueDate !== null && !validDay(item.dueDate)) fail(400, "Kies een geldige datum.");
    for (const field of ["startTime", "endTime"]) if (item[field] !== null && (typeof item[field] !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(item[field]))) fail(400, "Kies een geldige tijd.");
    if (item.type === "APPOINTMENT" && (!item.dueDate || !item.startTime)) fail(400, "Een afspraak heeft een datum en starttijd nodig.");
    if (item.endTime && (!item.startTime || item.endTime <= item.startTime)) fail(400, "Eindtijd moet na de starttijd liggen, op dezelfde dag.");
    if (item.type === "TASK") { item.startTime = null; item.endTime = null; }
    if (!Array.isArray(item.relatedEntities) || item.relatedEntities.length > 30) fail(400, "Te veel contextkoppelingen.");
    item.relatedEntities = item.relatedEntities.map(relation => {
      if (!relationTypes.has(relation?.entityType)) fail(400, "Onbekend contexttype.");
      return { entityType: relation.entityType, entityId: text(relation.entityId, 200, true), displayLabel: text(relation.displayLabel, 300, true) };
    });
    // Relations are references only. No linked content is resolved without its own permission check.
    return item;
  }
  async create(context, input) {
    const scope = await this.scope(context); const value = this.validate(input, scope); const at = this.now().toISOString();
    const item = { ...value, id: randomUUID(), workspaceId: scope.workspaceId, createdBy: scope.user.id, timeZone: "Europe/Amsterdam", status: "OPEN", createdAt: at, updatedAt: at, completedAt: null, completedBy: null, revision: 1, notes: [], activity: [{ id: randomUUID(), actor: scope.user.id, at, action: "CREATED" }] };
    return this.store.mutate(state => { state.items.push(item); return item; });
  }
  async change(context, id, action, input = {}) {
    const scope = await this.scope(context); const at = this.now().toISOString();
    return this.store.mutate(state => {
      const index = state.items.findIndex(item => item.id === id && this.visible(item, scope));
      if (index < 0) fail(404, "Werkitem niet gevonden.");
      let item = state.items[index];
      if (action === "complete" && item.status === "COMPLETED") return item;
      if (input.revision !== item.revision) fail(409, "Een collega heeft dit werk bijgewerkt. Herlaad de kaart voordat je opslaat.");
      if (action === "edit") {
        if (item.status !== "OPEN") fail(409, "Dit werk is al afgerond.");
        item = this.validate(input, scope, item);
      } else if (action === "note") {
        item.notes.push({ id: randomUUID(), author: scope.user.id, at, text: text(input.text, 10000, true) });
      } else if (action === "complete") {
        item.status = "COMPLETED"; item.completedAt = at; item.completedBy = scope.user.id;
        state.events.push({ id: randomUUID(), type: "WORK_ITEM_COMPLETED", version: 1, workspaceId: scope.workspaceId, workItemId: item.id, completedBy: scope.user.id, completedAt: at, revision: item.revision + 1 });
      } else fail(400, "Onbekende actie.");
      item.revision++; item.updatedAt = at;
      item.activity.push({ id: randomUUID(), actor: scope.user.id, at, action: action === "complete" ? "COMPLETED" : action === "note" ? "NOTE_ADDED" : "UPDATED", ...(action === "edit" ? { fields: Object.keys(input).filter(key => key !== "revision") } : {}) });
      state.items[index] = item; return item;
    });
  }
}
export function workItemServiceFromEnvironment(environment = process.env) {
  const filePath = environment.WORKSPACE_WORK_ITEMS_FILE; const configPath = environment.WORKSPACE_WORK_ITEMS_CONFIG;
  if (!filePath || !configPath) return null;
  return new WorkItemService({ store: new WorkItemFileStore(filePath), config: async () => JSON.parse(await readFile(configPath, "utf8")) });
}
