import assert from "node:assert/strict";
import http from "node:http";
import test from "node:test";
import {
  captureReleaseValidationReport,
  releaseValidationProfileSha256,
  validateReleaseValidationConfig,
} from "../scripts/release-validation-probe.mjs";

async function withServer(handler, assertion) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    await assertion(`http://127.0.0.1:${address.port}/`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("legt DNS, transport, HTTP, hash en assertions per endpoint vast", async () => {
  await withServer((request, response) => {
    response.writeHead(200, {
      "connection": "close",
      "content-type": "text/html; charset=utf-8",
    });
    response.end("<html><script src=\"/assets/index-canonical.js\"></script></html>");
  }, async (url) => {
    const endpoint = {
      url,
      assertions: [
        { id: "status", type: "status", equals: 200, critical: true },
        {
          id: "bundle",
          type: "bodyIncludes",
          value: "/assets/index-canonical.js",
          critical: true,
        },
      ],
    };
    const config = {
      probe: { attempts: 2, intervalMs: 0, timeoutMs: 1_000 },
      endpoints: { target: endpoint, control: endpoint },
    };
    const report = await captureReleaseValidationReport(config, {
      phase: "post-switch",
      sourceId: "local-test-runner",
      routeId: "loopback-test-route",
    });

    const target = report.endpoints.target.samples;
    assert.equal(target.length, 2);
    assert.equal(target[0].dns.ok, true);
    assert.equal(target[0].transport.ok, true);
    assert.equal(target[0].tls.applicable, false);
    assert.equal(target[0].http.status, 200);
    assert.match(target[0].http.bodySha256, /^[A-F0-9]{64}$/);
    assert.ok(target[0].assertions.every((item) => item.pass));
    assert.equal(report.validationProfileSha256, releaseValidationProfileSha256(config));
  });
});

test("weigert een oningevuld releaseprofiel vóór de eerste probe", () => {
  assert.throws(() => validateReleaseValidationConfig({
    endpoints: {
      target: {
        url: "https://webuildanddesign.nl/",
        assertions: [{
          id: "bundle",
          type: "bodyIncludes",
          value: "/assets/index-REPLACE.js",
        }],
      },
      control: {
        url: "https://preview.webuildanddesign.nl/",
        assertions: [{ id: "status", type: "status", equals: 200 }],
      },
    },
  }), /geen definitieve verwachting/);
});
