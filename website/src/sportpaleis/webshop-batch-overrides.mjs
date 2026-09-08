import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// Local review persistence: deltas and idempotency receipts only. No source blobs.
export class BatchOverrideStore {
  constructor(filename) {
    mkdirSync(dirname(filename), { recursive: true });
    this.db = new DatabaseSync(filename);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=1000;
      CREATE TABLE IF NOT EXISTS meta (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL);
      INSERT OR IGNORE INTO meta VALUES (1,0);
      CREATE TABLE IF NOT EXISTS overrides (id TEXT PRIMARY KEY, source_hash TEXT NOT NULL, order_number TEXT NOT NULL,
        changes TEXT NOT NULL, excluded INTEGER NOT NULL, reviewed INTEGER NOT NULL, structural INTEGER NOT NULL,
        updated_at TEXT NOT NULL, actor TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS receipts (id TEXT PRIMARY KEY, source_hash TEXT NOT NULL, item_ids TEXT NOT NULL,
        created_at TEXT NOT NULL, actor TEXT NOT NULL);`);
  }
  snapshot(sourceHash) {
    const rows = this.db.prepare("SELECT * FROM overrides WHERE source_hash=?").all(sourceHash);
    const receipts = this.db.prepare("SELECT * FROM receipts WHERE source_hash=?").all(sourceHash);
    return { revision: this.db.prepare("SELECT revision FROM meta WHERE id=1").get().revision,
      overrides: Object.fromEntries(rows.map((r) => [r.id, { changes: JSON.parse(r.changes), excluded: !!r.excluded,
        reviewed: !!r.reviewed, structuralRuleCandidate: !!r.structural, updatedAt: r.updated_at, actor: r.actor }])),
      completedIds: receipts.flatMap((r) => JSON.parse(r.item_ids)) };
  }
  transaction(expectedRevision, fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const revision = this.db.prepare("SELECT revision FROM meta WHERE id=1").get().revision;
      if (revision !== expectedRevision) throw Object.assign(new Error("De batch is intussen gewijzigd. Vernieuw de weergave."), { statusCode: 409, code: "REVISION_CONFLICT" });
      const result = fn();
      this.db.exec("UPDATE meta SET revision=revision+1 WHERE id=1; COMMIT;");
      return result;
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  save(row, override, expectedRevision, actor) {
    return this.transaction(expectedRevision, () => {
      this.db.prepare(`INSERT INTO overrides VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
        changes=excluded.changes,excluded=excluded.excluded,reviewed=excluded.reviewed,structural=excluded.structural,updated_at=excluded.updated_at,actor=excluded.actor`)
        .run(row.id, row.sourceHash, row.orderNumber, JSON.stringify(override.changes), +override.excluded, +override.reviewed, +override.structuralRuleCandidate, new Date().toISOString(), actor);
    });
  }
  receipt(id) {
    const value = this.db.prepare("SELECT * FROM receipts WHERE id=?").get(id);
    return value ? { id: value.id, sourceHash: value.source_hash, itemIds: JSON.parse(value.item_ids), createdAt: value.created_at, actor: value.actor, status: "DRY_RUN_CONFIRMED" } : null;
  }
  confirm(id, sourceHash, itemIds, expectedRevision, actor) {
    const previous = this.receipt(id);
    if (previous) return { ...previous, duplicate: true };
    this.transaction(expectedRevision, () => {
      const completed = new Set(this.snapshot(sourceHash).completedIds);
      if (itemIds.some((itemId) => completed.has(itemId))) throw Object.assign(new Error("Een geselecteerde regel is al voorbereid."), { statusCode: 409, code: "ALREADY_PREPARED" });
      this.db.prepare("INSERT INTO receipts VALUES (?,?,?,?,?)").run(id, sourceHash, JSON.stringify(itemIds), new Date().toISOString(), actor);
    });
    return { ...this.receipt(id), duplicate: false };
  }
  close() { this.db.close(); }
}
