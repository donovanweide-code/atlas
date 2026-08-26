import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { runReleaseSmoke } from "../scripts/release-engine-smoke-adapters.mjs";

async function withSmokeServer(handler, callback) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    await callback(String(address.port));
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("mail-r2-compatibility bewaart de WBD virtual-host en accepteert het bewezen R2-contract", async () => {
  let observedHost = null;
  await withSmokeServer((request, response) => {
    observedHost = request.headers.host;
    if (request.url !== "/health/wbd" || request.headers.host !== "workspace.webuildanddesign.nl") {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "not-found" }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", persistence: "mariadb", datastoreRevision: 82 }));
  }, async (port) => {
    const result = await runReleaseSmoke({ releaseId: "R2", adapterId: "mail-r2-compatibility", phase: "post-migration", environment: { PORT: port } });
    assert.equal(result.status, "PASS");
  });
  assert.equal(observedHost, "workspace.webuildanddesign.nl");
});

test("mail-runtime blijft strikt en accepteert het oudere R2-healthcontract niet als candidate-runtime", async () => {
  await withSmokeServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok", persistence: "mariadb", datastoreRevision: 82 }));
  }, async (port) => {
    await assert.rejects(
      runReleaseSmoke({ releaseId: "candidate", adapterId: "mail-runtime", phase: "post-switch", environment: { PORT: port } }),
      (error) => error?.code === "MAIL_SMOKE_FAIL",
    );
  });
});

test("mail-runtime accepteert uitsluitend het volledige candidate Mail-contract", async () => {
  await withSmokeServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      status: "ok",
      persistence: "mariadb",
      datastoreRevision: 86,
      mail: { status: "available", connectedMailboxes: 0, connectorCallsDuringRender: 0 },
    }));
  }, async (port) => {
    const result = await runReleaseSmoke({ releaseId: "candidate", adapterId: "mail-runtime", phase: "post-switch", environment: { PORT: port } });
    assert.equal(result.status, "PASS");
  });
});

test("een echte ontbrekende smoke-route blijft fail-closed als SMOKE_HTTP_FAIL", async () => {
  await withSmokeServer((_request, response) => {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "not-found" }));
  }, async (port) => {
    await assert.rejects(
      runReleaseSmoke({ releaseId: "R2", adapterId: "mail-r2-compatibility", phase: "post-migration", environment: { PORT: port } }),
      (error) => error?.code === "SMOKE_HTTP_FAIL",
    );
  });
});
