import assert from "node:assert/strict";
import test from "node:test";

import { updateSportpaleisRuntimeState } from "../scripts/sportpaleis-mariadb-store.mjs";

class RecordingConnection {
  constructor({ failFinalUpdate = false } = {}) {
    this.failFinalUpdate = failFinalUpdate;
    this.queries = [];
    this.sessionValue = null;
    this.persisted = null;
  }

  async query(sql, parameters = []) {
    this.queries.push({ sql, parameters });
    if (sql === "SET @wbd_sportpaleis_runtime_state_json = ?") {
      this.sessionValue = parameters[0];
      return { affectedRows: 0 };
    }
    if (sql.startsWith("SET @wbd_sportpaleis_runtime_state_json = CONCAT")) {
      this.sessionValue += parameters[0];
      return { affectedRows: 0 };
    }
    if (sql === "SET @wbd_sportpaleis_runtime_state_json = NULL") {
      this.sessionValue = null;
      return { affectedRows: 0 };
    }
    if (sql.startsWith("UPDATE sp_runtime_state")) {
      if (this.failFinalUpdate) throw Object.assign(new Error("simulated final update failure"), { code: "SIMULATED_WRITE_FAILURE" });
      this.persisted = sql.includes("state_json = @wbd_sportpaleis_runtime_state_json") ? this.sessionValue : parameters[2];
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

test("grote state wordt bytegetrouw in begrensde UTF-8-veilige sessiechunks opgebouwd en atomisch geschreven", async () => {
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
  assert.equal(connection.persisted, expected);
  assert.equal(connection.sessionValue, null, "de poolconnection houdt geen grote sessievariabele vast");
  const chunkQueries = connection.queries.filter(({ sql }) => sql.includes("CONCAT"));
  assert.ok(chunkQueries.length > 1);
  assert.ok(chunkQueries.every(({ parameters }) => Buffer.byteLength(parameters[0], "utf8") < 3 * 1024 * 1024));
  const final = connection.queries.find(({ sql }) => sql.startsWith("UPDATE sp_runtime_state"));
  assert.ok(final.sql.includes("state_json = @wbd_sportpaleis_runtime_state_json"));
  assert.deepEqual(final.parameters, [state.schemaVersion, state.revision, state.organizationId, 1458]);
});

test("mislukte finale update ruimt de sessiebuffer op zodat transaction rollback schoon blijft", async () => {
  const state = { schemaVersion: 13, revision: 3, organizationId: "sport-2000-sportpaleis-bv", payload: "B".repeat(9 * 1024 * 1024) };
  const connection = new RecordingConnection({ failFinalUpdate: true });

  await assert.rejects(() => updateSportpaleisRuntimeState(connection, state, 2), (error) => error.code === "SIMULATED_WRITE_FAILURE");
  assert.equal(connection.sessionValue, null);
  assert.equal(connection.queries.at(-1).sql, "SET @wbd_sportpaleis_runtime_state_json = NULL");
});
