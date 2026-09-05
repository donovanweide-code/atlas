import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

import { splitMigrationStatements } from "../scripts/production-migrate.mjs";

test("workspace-migratieversies zijn uniek en de domeinsplitsing volgt mailmigraties", async () => {
  const directory = new URL("../sportpaleis-server/production-migrations/workspace/", import.meta.url);
  const names = (await readdir(directory)).filter((name) => /^\d{3}-[a-z0-9-]+\.sql$/u.test(name)).sort();
  const versions = names.map((name) => Number(name.slice(0, 3)));
  assert.equal(new Set(versions).size, versions.length);
  assert.ok(names.includes("007-sportpaleis-domain-state.sql"));
  assert.ok(names.includes("008-wbd-owner-domain-state.sql"));
  assert.equal(names.some((name) => name === "003-sportpaleis-domain-state.sql"), false);
});

test("Owner-domeinmigratie is additief en bewaart de legacybron", async () => {
  const sql = await readFile(new URL("../sportpaleis-server/production-migrations/workspace/008-wbd-owner-domain-state.sql", import.meta.url), "utf8");
  const statements = splitMigrationStatements(sql);
  assert.equal(statements.length, 4);
  assert.ok(statements.every((statement) => statement.startsWith("CREATE TABLE IF NOT EXISTS")));
  assert.doesNotMatch(sql, /DROP|TRUNCATE|DELETE FROM|UPDATE wbd_owner_state/iu);
});

test("multi-statement domeinmigratie wordt veilig per statement uitgevoerd", async () => {
  const sql = await readFile(new URL("../sportpaleis-server/production-migrations/workspace/007-sportpaleis-domain-state.sql", import.meta.url), "utf8");
  const statements = splitMigrationStatements(sql);
  assert.equal(statements.length, 8);
  assert.ok(statements.every((statement) => statement.startsWith("CREATE TABLE IF NOT EXISTS")));
  assert.ok(statements.every((statement) => !statement.includes(";")));
});

test("SQL-splitter breekt niet op separators in strings, identifiers of comments", () => {
  const statements = splitMigrationStatements("-- comment;\nCREATE TABLE `a;b` (value VARCHAR(20) DEFAULT 'x;y'); /* c; */ INSERT INTO `a;b` VALUES ('z;z');");
  assert.deepEqual(statements, ["CREATE TABLE `a;b` (value VARCHAR(20) DEFAULT 'x;y')", "INSERT INTO `a;b` VALUES ('z;z')"]);
  assert.throws(() => splitMigrationStatements("CREATE TABLE x (value VARCHAR(20) DEFAULT 'open);"), /niet-afgesloten/);
});
