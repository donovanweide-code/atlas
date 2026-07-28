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

function executionConfig() {
  return {
    approvedRunnerContexts: [{
      id: "test-network-runner",
      networkCapable: true,
      networkContexts: ["loopback-ipv4"],
    }],
    localPermissionErrorCodes: ["EACCES", "EPERM"],
    localPermissionRetryLimit: 1,
  };
}

function observation({ errorCode = null } = {}) {
  const pass = errorCode === null;
  return {
    dns: { ok: true, addresses: [{ address: "127.0.0.1", family: 4 }], errorCode: null },
    transport: {
      ok: pass,
      errorCode,
      remoteAddress: pass ? "127.0.0.1" : null,
      remotePort: pass ? 443 : null,
    },
    tls: {
      applicable: true,
      ok: pass,
      authorized: pass,
      protocol: pass ? "TLSv1.3" : null,
      errorCode,
    },
    http: {
      received: pass,
      status: pass ? 200 : null,
      headers: {},
      durationMs: 1,
      bodyBytes: pass ? 2 : 0,
      bodyTruncated: false,
      bodySha256: pass ? "A".repeat(64) : null,
    },
    body: pass ? "ok" : "",
  };
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
      execution: executionConfig(),
      endpoints: { target: endpoint, control: endpoint },
    };
    const report = await captureReleaseValidationReport(config, {
      phase: "post-switch",
      sourceId: "local-test-runner",
      routeId: "loopback-test-route",
      runnerContext: "test-network-runner",
      networkContext: "loopback-ipv4",
      addressFamily: 4,
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
    assert.equal(report.source.addressFamily, 4);
    assert.equal(report.source.runnerContext, "test-network-runner");
    assert.equal(report.source.networkContext, "loopback-ipv4");
    assert.equal(report.runner.approved, true);
    assert.equal(report.probeFailure, null);
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

test("classificeert een beperkte runner na één herhaalmeting als lokaal niet bevoegd", async () => {
  let calls = 0;
  const endpoint = {
    url: "https://example.test/",
    assertions: [{ id: "status", type: "status", equals: 200, critical: true }],
  };
  const config = {
    probe: { attempts: 2, intervalMs: 0, timeoutMs: 100 },
    execution: executionConfig(),
    endpoints: { target: endpoint, control: endpoint },
  };
  const report = await captureReleaseValidationReport(config, {
    phase: "preflight",
    sourceId: "restricted-runner-test",
    routeId: "loopback-route",
    runnerContext: "test-network-runner",
    networkContext: "loopback-ipv4",
    addressFamily: 4,
  }, {
    requestUrlImpl: async () => {
      calls += 1;
      return observation({ errorCode: "EACCES" });
    },
  });

  assert.equal(calls, 8);
  assert.equal(report.runner.localPermissionRetry.attempted, true);
  assert.equal(report.runner.localPermissionRetry.outcome, "local-permission-denied");
  assert.equal(report.probeFailure.kind, "local-runner-not-authorized");
  assert.equal(report.probeFailure.code, "EACCES");
});

test("vermindert een tijdelijke lokale false negative met precies één herhaalmeting", async () => {
  let calls = 0;
  const endpoint = {
    url: "https://example.test/",
    assertions: [{ id: "status", type: "status", equals: 200, critical: true }],
  };
  const config = {
    probe: { attempts: 2, intervalMs: 0, timeoutMs: 100 },
    execution: executionConfig(),
    endpoints: { target: endpoint, control: endpoint },
  };
  const report = await captureReleaseValidationReport(config, {
    phase: "preflight",
    sourceId: "retry-test",
    routeId: "loopback-route",
    runnerContext: "test-network-runner",
    networkContext: "loopback-ipv4",
    addressFamily: 4,
  }, {
    requestUrlImpl: async () => {
      calls += 1;
      return calls <= 4 ? observation({ errorCode: "EPERM" }) : observation();
    },
  });

  assert.equal(calls, 8);
  assert.equal(report.runner.localPermissionRetry.attempted, true);
  assert.equal(report.runner.localPermissionRetry.outcome, "completed");
  assert.equal(report.probeFailure, null);
  assert.ok(report.endpoints.target.samples.every((item) => item.transport.ok));
});

test("weigert een niet-goedgekeurde context vóórdat een netwerkprobe start", async () => {
  let calls = 0;
  const endpoint = {
    url: "https://example.test/",
    assertions: [{ id: "status", type: "status", equals: 200, critical: true }],
  };
  const config = {
    probe: { attempts: 2, intervalMs: 0, timeoutMs: 100 },
    execution: executionConfig(),
    endpoints: { target: endpoint, control: endpoint },
  };
  const report = await captureReleaseValidationReport(config, {
    phase: "preflight",
    sourceId: "unapproved-test",
    routeId: "loopback-route",
    runnerContext: "restricted-windows-runner",
    networkContext: "loopback-ipv4",
    addressFamily: 4,
  }, {
    requestUrlImpl: async () => {
      calls += 1;
      return observation();
    },
  });

  assert.equal(calls, 0);
  assert.equal(report.runner.approved, false);
  assert.equal(report.probeFailure.code, "RUNNER_CONTEXT_NOT_APPROVED");
});
