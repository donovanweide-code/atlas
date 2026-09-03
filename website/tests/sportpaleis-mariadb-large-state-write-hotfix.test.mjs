import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import {
  decodeSportpaleisRuntimeState,
  encodeSportpaleisRuntimeState,
  updateSportpaleisRuntimeState,
} from "../scripts/sportpaleis-mariadb-store.mjs";

class RecordingConnection {
  constructor({ failFinalUpdate = false } = {}) {
    this.failFinalUpdate = failFinalUpdate;
    this.queries = [];
    this.persisted = null;
  }

  async query(sql, parameters = []) {
    this.queries.push({ sql, parameters });
    if (sql.startsWith("UPDATE sp_runtime_state")) {
      if (this.failFinalUpdate) throw Object.assign(new Error("simulated final update failure"), { code: "SIMULATED_WRITE_FAILURE" });
      this.persisted = parameters[2];
      return { affectedRows: 1 };
    }
    throw new Error(`Onverwachte query: ${sql}`);
  }
}

test("kleine state behoudt de bestaande enkelvoudige revision-checked update", async () => {
  const state = { schemaVersion: 13, revision: 9, organizationId: "sport-2000-sportpaleis-bv", marker: "klein" };
  const connection = new RecordingConnection();
  const result = await updateSportpaleisRuntimeState(connection, state, 8);

  assert.equal(result.affectedRows, 1);
  assert.equal(connection.queries.length, 1);
  assert.equal(connection.persisted, JSON.stringify(state));
  assert.deepEqual(connection.queries[0].parameters.slice(-2), [state.organizationId, 8]);
});

test("grote state wordt integer gecomprimeerd en in één revision-checked update atomisch geschreven", async () => {
  const state = {
    schemaVersion: 13,
    revision: 1459,
    organizationId: "sport-2000-sportpaleis-bv",
    payload: `${"A".repeat(8 * 1024 * 1024)}😀einde`,
  };
  const expected = JSON.stringify(state);
  const connection = new RecordingConnection();
  const result = await updateSportpaleisRuntimeState(connection, state, 1458);

  assert.equal(result.affectedRows, 1);
  assert.equal(connection.queries.length, 1);
  assert.ok(Buffer.byteLength(connection.persisted, "utf8") < 8 * 1024 * 1024);
  assert.notEqual(connection.persisted, expected);
  assert.deepEqual(decodeSportpaleisRuntimeState(connection.persisted), state);
  assert.deepEqual(connection.queries[0].parameters.slice(-2), [state.organizationId, 1458]);
});

test("mislukte grote-state update blijft één faalbare databasehandeling voor transaction rollback", async () => {
  const state = { schemaVersion: 13, revision: 3, organizationId: "sport-2000-sportpaleis-bv", payload: "B".repeat(9 * 1024 * 1024) };
  const connection = new RecordingConnection({ failFinalUpdate: true });

  await assert.rejects(() => updateSportpaleisRuntimeState(connection, state, 2), (error) => error.code === "SIMULATED_WRITE_FAILURE");
  assert.equal(connection.queries.length, 1);
  assert.equal(connection.persisted, null);
});

test("gecomprimeerde state weigert stille corruptie op hash en lengte", () => {
  const state = { schemaVersion: 17, revision: 1505, organizationId: "sport-2000-sportpaleis-bv", payload: "C".repeat(9 * 1024 * 1024) };
  const encoded = encodeSportpaleisRuntimeState(state);
  const envelope = JSON.parse(encoded.serialized);
  envelope.sha256 = "0".repeat(64);
  assert.throws(() => decodeSportpaleisRuntimeState(JSON.stringify(envelope)), (error) => error.code === "DATABASE_STATE_ENCODING_INVALID");
});

test("oncompressibele state faalt vóór een databasewrite buiten het packetbudget", async () => {
  const noise = randomBytes(7 * 1024 * 1024);
  const state = { schemaVersion: 17, revision: 1505, organizationId: "sport-2000-sportpaleis-bv", payload: noise.toString("base64") };
  const connection = new RecordingConnection();
  await assert.rejects(() => updateSportpaleisRuntimeState(connection, state, 1504), (error) => error.code === "DATABASE_STATE_PACKET_BUDGET_EXCEEDED");
  assert.equal(connection.queries.length, 0);
});
