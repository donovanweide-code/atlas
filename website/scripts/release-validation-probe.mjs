import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { setTimeout as delay } from "node:timers/promises";

const assertionTypes = new Set([
  "status",
  "bodyIncludes",
  "bodyExcludes",
  "bodySha256",
  "headerIncludes",
  "headerExcludes",
]);

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function releaseValidationProfileSha256(config) {
  return createHash("sha256").update(stableJson(config)).digest("hex").toUpperCase();
}

export function validateReleaseValidationConfig(config) {
  if (!config?.endpoints?.target || !config?.endpoints?.control) {
    throw new Error("Configuratie vereist target- en control-endpoints.");
  }

  for (const [endpointName, endpoint] of Object.entries(config.endpoints)) {
    const url = new URL(endpoint.url);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(`${endpointName} gebruikt geen ondersteund HTTP(S)-protocol.`);
    }
    if (!Array.isArray(endpoint.assertions) || endpoint.assertions.length === 0) {
      throw new Error(`${endpointName} vereist minstens één expliciete assertion.`);
    }

    const assertionIds = new Set();
    for (const assertion of endpoint.assertions) {
      if (!assertion.id || assertionIds.has(assertion.id)) {
        throw new Error(`${endpointName} bevat een ontbrekende of dubbele assertion-id.`);
      }
      assertionIds.add(assertion.id);
      if (!assertionTypes.has(assertion.type)) {
        throw new Error(`${endpointName} bevat een onbekend assertiontype: ${assertion.type ?? "ontbreekt"}.`);
      }
      const expected = assertion.equals ?? assertion.value;
      if (expected === undefined || String(expected).includes("REPLACE")) {
        throw new Error(`${endpointName}/${assertion.id} bevat geen definitieve verwachting.`);
      }
    }
  }
}

function normalizedHeaders(headers) {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name.toLowerCase(),
      Array.isArray(value) ? value.join(", ") : String(value ?? ""),
    ]),
  );
}

function assertionResult(assertion, observation) {
  const critical = assertion.critical !== false;
  const body = observation.body ?? "";
  const headers = observation.http?.headers ?? {};
  let actual;
  let pass;

  switch (assertion.type) {
    case "status":
      actual = observation.http?.status ?? null;
      pass = actual === assertion.equals;
      break;
    case "bodyIncludes":
      actual = body.includes(assertion.value);
      pass = actual;
      break;
    case "bodyExcludes":
      actual = body.includes(assertion.value);
      pass = !actual;
      break;
    case "bodySha256":
      actual = observation.http?.bodySha256 ?? null;
      pass = actual?.toLowerCase() === String(assertion.equals).toLowerCase();
      break;
    case "headerIncludes":
      actual = headers[String(assertion.name).toLowerCase()] ?? null;
      pass = typeof actual === "string" && actual.toLowerCase().includes(String(assertion.value).toLowerCase());
      break;
    case "headerExcludes":
      actual = headers[String(assertion.name).toLowerCase()] ?? null;
      pass = typeof actual !== "string" || !actual.toLowerCase().includes(String(assertion.value).toLowerCase());
      break;
    default:
      throw new Error(`Onbekend assertiontype: ${assertion.type}`);
  }

  return {
    id: assertion.id,
    type: assertion.type,
    critical,
    pass,
    expected: assertion.equals ?? assertion.value ?? null,
    actual,
  };
}

async function resolveHost(hostname) {
  try {
    const results = await lookup(hostname, { all: true });
    return {
      ok: true,
      addresses: results.map(({ address, family }) => ({ address, family })),
      errorCode: null,
    };
  } catch (error) {
    return {
      ok: false,
      addresses: [],
      errorCode: error?.code ?? "DNS_ERROR",
    };
  }
}

async function requestUrl(url, { timeoutMs, maxBodyBytes }) {
  const started = performance.now();
  const parsed = new URL(url);
  const dns = await resolveHost(parsed.hostname);

  if (!dns.ok) {
    return {
      dns,
      transport: { ok: false, errorCode: dns.errorCode },
      tls: { applicable: parsed.protocol === "https:", ok: false, errorCode: null },
      http: { received: false, status: null, headers: {}, durationMs: Math.round(performance.now() - started) },
      body: "",
    };
  }

  return new Promise((resolve) => {
    const client = parsed.protocol === "https:" ? https : http;
    const request = client.get(parsed, {
      headers: {
        "accept": "text/html,application/xhtml+xml",
        "user-agent": "Atlas-Release-Validator/1.0",
      },
      rejectUnauthorized: true,
      timeout: timeoutMs,
    });

    request.once("response", (response) => {
      const chunks = [];
      let bytes = 0;
      let truncated = false;

      response.on("data", (chunk) => {
        if (bytes >= maxBodyBytes) {
          truncated = true;
          return;
        }
        const remaining = maxBodyBytes - bytes;
        const accepted = chunk.subarray(0, remaining);
        chunks.push(accepted);
        bytes += accepted.length;
        if (accepted.length < chunk.length) truncated = true;
      });

      response.on("end", () => {
        const bodyBuffer = Buffer.concat(chunks);
        const socket = response.socket;
        const isTls = parsed.protocol === "https:";
        resolve({
          dns,
          transport: {
            ok: true,
            errorCode: null,
            remoteAddress: socket.remoteAddress ?? null,
            remotePort: socket.remotePort ?? null,
          },
          tls: {
            applicable: isTls,
            ok: !isTls || socket.authorized === true,
            authorized: isTls ? socket.authorized === true : null,
            protocol: isTls && typeof socket.getProtocol === "function" ? socket.getProtocol() : null,
            errorCode: isTls ? socket.authorizationError ?? null : null,
          },
          http: {
            received: true,
            status: response.statusCode ?? null,
            headers: normalizedHeaders(response.headers),
            durationMs: Math.round(performance.now() - started),
            bodyBytes: bodyBuffer.length,
            bodyTruncated: truncated,
            bodySha256: createHash("sha256").update(bodyBuffer).digest("hex").toUpperCase(),
          },
          body: bodyBuffer.toString("utf8"),
        });
      });
    });

    request.once("timeout", () => request.destroy(Object.assign(new Error("Request timeout"), { code: "ETIMEDOUT" })));
    request.once("error", (error) => {
      resolve({
        dns,
        transport: {
          ok: false,
          errorCode: error?.code ?? "REQUEST_ERROR",
          remoteAddress: null,
          remotePort: null,
        },
        tls: {
          applicable: parsed.protocol === "https:",
          ok: false,
          authorized: false,
          protocol: null,
          errorCode: error?.code ?? "TLS_OR_TRANSPORT_ERROR",
        },
        http: {
          received: false,
          status: null,
          headers: {},
          durationMs: Math.round(performance.now() - started),
          bodyBytes: 0,
          bodyTruncated: false,
          bodySha256: null,
        },
        body: "",
      });
    });
  });
}

async function captureEndpoint(endpoint, probeOptions) {
  const samples = [];
  for (let index = 0; index < probeOptions.attempts; index += 1) {
    const at = new Date().toISOString();
    const observation = await requestUrl(endpoint.url, probeOptions);
    samples.push({
      at,
      dns: observation.dns,
      transport: observation.transport,
      tls: observation.tls,
      http: observation.http,
      assertions: (endpoint.assertions ?? []).map((assertion) => assertionResult(assertion, observation)),
    });
    if (index < probeOptions.attempts - 1) await delay(probeOptions.intervalMs);
  }
  return { url: endpoint.url, samples };
}

export async function captureReleaseValidationReport(config, { phase, sourceId, routeId }) {
  if (!["preflight", "post-switch"].includes(phase)) {
    throw new Error("Capturefase moet preflight of post-switch zijn.");
  }
  if (!sourceId || !routeId) throw new Error("sourceId en routeId zijn verplicht.");
  validateReleaseValidationConfig(config);

  const probeOptions = {
    attempts: config.probe?.attempts ?? 3,
    intervalMs: config.probe?.intervalMs ?? 2_000,
    timeoutMs: config.probe?.timeoutMs ?? 8_000,
    maxBodyBytes: config.probe?.maxBodyBytes ?? 1024 * 1024,
  };
  if (probeOptions.attempts < 2) throw new Error("Minstens twee meetpogingen zijn vereist.");

  const startedAt = new Date().toISOString();
  const [target, control] = await Promise.all([
    captureEndpoint(config.endpoints.target, probeOptions),
    captureEndpoint(config.endpoints.control, probeOptions),
  ]);

  return {
    schemaVersion: 1,
    phase,
    validationProfileSha256: releaseValidationProfileSha256(config),
    source: { id: sourceId, routeId },
    startedAt,
    completedAt: new Date().toISOString(),
    endpoints: { target, control },
  };
}
