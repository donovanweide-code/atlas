import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { selectDomainMigrationTrack } from "../scripts/production-migrate.mjs";

const root = new URL("../sportpaleis-server/production-migrations/workspace/", import.meta.url);
const files = await Promise.all((await readdir(root)).filter(name => /^\d{3}-.*\.sql$/u.test(name)).sort().map(async name => {
  const sql = await readFile(new URL(name, root), "utf8");
  return { name, version: Number(name.slice(0, 3)), sql, checksum: createHash("sha256").update(sql).digest("hex") };
}));
const registered = versions => files.filter(file => versions.includes(file.version));
const versions = rows => rows.map(({ version }) => version);

test("fresh and existing legacy stores retain only 007 while admitting Owner migration 008", () => {
  for (const rows of [[], registered([1, 7])]) {
    const selected = versions(selectDomainMigrationTrack(files, rows));
    assert.ok(selected.includes(7)); assert.ok(selected.includes(8));
    assert.ok(!selected.some(version => version >= 701 && version <= 708));
  }
});
test("existing complete or interrupted broker track never receives legacy 007", () => {
  for (const rows of [registered([701]), registered([701, 702, 703, 704, 705, 706, 707, 708])]) {
    const selected = versions(selectDomainMigrationTrack(files, rows));
    assert.ok(!selected.includes(7)); assert.ok(selected.includes(8));
    for (let version = 701; version <= 708; version++) assert.ok(selected.includes(version));
  }
});
test("mixed registrations and altered checksum or name fail closed", () => {
  assert.throws(() => selectDomainMigrationTrack(files, registered([7, 701])), /Mixed/);
  assert.throws(() => selectDomainMigrationTrack(files, [{ ...registered([7])[0], checksum: "bad" }]), /checksum/);
  assert.throws(() => selectDomainMigrationTrack(files, [{ ...registered([701])[0], name: "different.sql" }]), /name/);
});
test("equivalence uses actual SQL statements and rejects missing or divergent alternatives", () => {
  assert.throws(() => selectDomainMigrationTrack(files.filter(({ version }) => version !== 708), []), /incomplete/);
  const divergent = files.map(file => file.version === 708 ? { ...file, sql: file.sql + "\nCREATE TABLE unexpected(id INT);" } : file);
  assert.throws(() => selectDomainMigrationTrack(divergent, []), /not equivalent/);
});
