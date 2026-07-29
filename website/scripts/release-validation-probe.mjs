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

const DEFAULT_LOCAL_PERMISSION_ERROR_CODES = ["EACCES", "EPERM"];
const DEFAULT_ACTIVATION_SETTINGS = Object.freeze({
  maximumPropagationMs: 1_200_000,
  pollIntervalMs: 60_000,
  minimumStableRounds: 3,
});

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

  const runnerContexts = config?.execution?.approvedRunnerContexts;
  if (!Array.isArray(runnerContexts) || runnerContexts.length === 0) {
    throw new Error("Configuratie vereist minstens één expliciet goedgekeurde runnercontext.");
  }
  const runnerIds = new Set();
  for (const runner of runnerContexts) {
    if (!runner?.id || runnerIds.has(runner.id)) {
      throw new Error("Goedgekeurde runnercontexten vereisen unieke id's.");
    }
    runnerIds.add(runner.id);
    if (runner.networkCapable !== true) {
      throw new Error(`Runnercontext ${runner.id} is niet als netwerkgeschikt vastgelegd.`);
    }
    if (!Array.isArray(runner.networkContexts) || runner.networkContexts.length === 0) {
      throw new Error(`Runnercontext ${runner.id} vereist minstens één netwerkcontext.`);
    }
  }
  const permissionCodes = new Set(
    config.execution.localPermissionErrorCodes ?? DEFAULT_LOCAL_PERMISSION_ERROR_CODES,
  );
  if (!permissionCodes.has("EACCES") || !permissionCodes.has("EPERM")) {
    throw new Error("De lokale permissieclassificatie moet EACCES en EPERM bevatten.");
  }
  if ((config.execution.localPermissionRetryLimit ?? 1) !== 1) {
    throw new Error("De lokale permissieherhaling moet exact één meetronde zijn.");
  }

  if (config.activation) {
    const settings = {
      ...DEFAULT_ACTIVATION_SETTINGS,
      ...config.activation,
    };
    if (!Number.isFinite(settings.maximumPropagationMs) || settings.maximumPropagationMs <= 0) {
      throw new Error("activation.maximumPropagationMs moet een positief getal zijn.");
    }
    if (!Number.isFinite(settings.pollIntervalMs) || settings.pollIntervalMs <= 0) {
      throw new Error("activation.pollIntervalMs moet een positief getal zijn.");
    }
    if (!Number.isInteger(settings.minimumStableRounds) || settings.minimumStableRounds < 1) {
      throw new Error("activation.minimumStableRounds moet minstens 1 zijn.");
    }

    const validateArtifact = (name, artifact) => {
      if (!artifact?.id) throw new Error(`activation.${name}.id is verplicht.`);
      const includes = artifact.bodyIncludes;
      const hasIncludes = Array.isArray(includes)
        && includes.length > 0
        && includes.every((value) => typeof value === "string" && value.length > 0);
      const hasHash = typeof artifact.bodySha256 === "string"
        && /^[a-f0-9]{64}$/i.test(artifact.bodySha256);
      if (!hasIncludes && !hasHash) {
        throw new Error(`activation.${name} vereist bodyIncludes en/of een geldige bodySha256.`);
      }
      if (Array.isArray(includes) && includes.some((value) => value.includes("REPLACE"))) {
        throw new Error(`activation.${name} bevat geen definitieve bundelverwachting.`);
      }
    };
    validateArtifact("previousArtifact", config.activation.previousArtifact);
    validateArtifact("candidateArtifact", config.activation.candidateArtifact);
    if (config.activation.previousArtifact.id === config.activation.candidateArtifact.id) {
      throw new Error("Vorige en kandidaat-release vereisen verschillende artefact-id's.");
    }
    const healthAssertionIds = config.activation.healthAssertionIds;
    if (!Array.isArray(healthAssertionIds) || healthAssertionIds.length === 0) {
      throw new Error("activation.healthAssertionIds vereist minstens één gezondheidsassertion.");
    }
    const targetAssertions = new Map(
      config.endpoints.target.assertions.map((assertion) => [assertion.id, assertion]),
    );
    for (const assertionId of healthAssertionIds) {
      const assertion = targetAssertions.get(assertionId);
      if (!assertion) {
        throw new Error(`Onbekende activatie-gezondheidsassertion: ${assertionId}.`);
      }
      if (assertion.critical === false) {
        throw new Error(`Activatie-gezondheidsassertion ${assertionId} moet kritiek zijn.`);
      }
    }

    if (config.activation.routes !== undefined) {
      if (!Array.isArray(config.activation.routes)
        || config.activation.routes.length < (config.validation?.minimumIndependentRoutes ?? 2)) {
        throw new Error("activation.routes bevat onvoldoende expliciete meetroutes.");
      }
      for (const route of config.activation.routes) {
        if (!route?.sourceId || !route?.routeId || !route?.runnerContext || !route?.networkContext) {
          throw new Error("Iedere activatieroute vereist sourceId, routeId, runnerContext en networkContext.");
        }
        if (![0, 4, 6].includes(route.addressFamily ?? 0)) {
          throw new Error("Een activatieroute gebruikt een ongeldige addressFamily.");
        }
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

function artifactMatches(observation, artifact) {
  if (!artifact || observation?.http?.received !== true) return false;
  const body = observation.body ?? "";
  const includesMatch = !Array.isArray(artifact.bodyIncludes)
    || artifact.bodyIncludes.every((value) => body.includes(value));
  const hashMatch = !artifact.bodySha256
    || observation.http?.bodySha256?.toLowerCase() === artifact.bodySha256.toLowerCase();
  return includesMatch && hashMatch;
}

function detectArtifactIdentity(observation, activation) {
  if (!activation || observation?.http?.received !== true) {
    return {
      identity: "unknown",
      artifactId: null,
      matchedPrevious: false,
      matchedCandidate: false,
    };
  }
  const matchedPrevious = artifactMatches(observation, activation.previousArtifact);
  const matchedCandidate = artifactMatches(observation, activation.candidateArtifact);
  if (matchedPrevious === matchedCandidate) {
    return {
      identity: "unknown",
      artifactId: null,
      matchedPrevious,
      matchedCandidate,
    };
  }
  const artifact = matchedCandidate
    ? activation.candidateArtifact
    : activation.previousArtifact;
  return {
    identity: matchedCandidate ? "candidate" : "previous",
    artifactId: artifact.id,
    matchedPrevious,
    matchedCandidate,
  };
}

async function resolveHost(hostname, addressFamily) {
  try {
    const results = await lookup(hostname, {
      all: true,
      ...(addressFamily ? { family: addressFamily } : {}),
    });
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

async function requestUrl(url, { timeoutMs, maxBodyBytes, addressFamily }) {
  const started = performance.now();
  const parsed = new URL(url);
  const dns = await resolveHost(parsed.hostname, addressFamily);

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
      ...(addressFamily ? { family: addressFamily } : {}),
    });

    request.once("response", (response) => {
      const chunks = [];
      let bytes = 0;
      let truncated = false;
      const responseSocket = response.socket;

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
        const isTls = parsed.protocol === "https:";
        resolve({
          dns,
          transport: {
            ok: true,
            errorCode: null,
            remoteAddress: responseSocket?.remoteAddress ?? null,
            remotePort: responseSocket?.remotePort ?? null,
          },
          tls: {
            applicable: isTls,
            ok: !isTls || responseSocket?.authorized === true,
            authorized: isTls ? responseSocket?.authorized === true : null,
            protocol: isTls && typeof responseSocket?.getProtocol === "function" ? responseSocket.getProtocol() : null,
            errorCode: isTls ? responseSocket?.authorizationError ?? null : null,
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

function localPermissionErrorCodes(config) {
  return new Set(
    config?.execution?.localPermissionErrorCodes ?? DEFAULT_LOCAL_PERMISSION_ERROR_CODES,
  );
}

function observationFailureKind(observation, permissionErrorCodes) {
  const code = observation?.transport?.errorCode ?? observation?.tls?.errorCode ?? null;
  return permissionErrorCodes.has(code) ? "local-runner-not-authorized" : null;
}

async function captureEndpoint(
  endpoint,
  probeOptions,
  requestUrlImpl,
  permissionErrorCodes,
  activation,
) {
  const samples = [];
  for (let index = 0; index < probeOptions.attempts; index += 1) {
    const at = new Date().toISOString();
    const observation = await requestUrlImpl(endpoint.url, probeOptions);
    const failureKind = observationFailureKind(observation, permissionErrorCodes);
    samples.push({
      at,
      dns: observation.dns,
      transport: { ...observation.transport, failureKind },
      tls: { ...observation.tls, failureKind },
      http: observation.http,
      assertions: (endpoint.assertions ?? []).map((assertion) => assertionResult(assertion, observation)),
      artifact: detectArtifactIdentity(observation, activation),
    });
    if (index < probeOptions.attempts - 1) await delay(probeOptions.intervalMs);
  }
  return { url: endpoint.url, samples };
}

function findApprovedRunner(config, runnerContext, networkContext) {
  return config.execution.approvedRunnerContexts.find((runner) => (
    runner.id === runnerContext
    && runner.networkCapable === true
    && runner.networkContexts.includes(networkContext)
  ));
}

function hasLocalPermissionFailure(endpoints) {
  const samples = [
    ...(endpoints?.target?.samples ?? []),
    ...(endpoints?.control?.samples ?? []),
  ];
  return samples.some(
    (sample) => sample?.transport?.failureKind === "local-runner-not-authorized",
  );
}

function firstLocalPermissionCode(endpoints) {
  const samples = [
    ...(endpoints?.target?.samples ?? []),
    ...(endpoints?.control?.samples ?? []),
  ];
  return samples.find((sample) => sample?.transport?.failureKind === "local-runner-not-authorized")
    ?.transport?.errorCode ?? null;
}

export async function captureReleaseValidationReport(config, {
  phase,
  sourceId,
  routeId,
  addressFamily = 0,
  runnerContext,
  networkContext,
}, {
  requestUrlImpl = requestUrl,
} = {}) {
  if (!["preflight", "post-switch"].includes(phase)) {
    throw new Error("Capturefase moet preflight of post-switch zijn.");
  }
  if (!sourceId || !routeId || !runnerContext || !networkContext) {
    throw new Error("sourceId, routeId, runnerContext en networkContext zijn verplicht.");
  }
  if (![0, 4, 6].includes(addressFamily)) {
    throw new Error("addressFamily moet 4, 6 of 0 (automatisch) zijn.");
  }
  validateReleaseValidationConfig(config);

  const approvedRunner = findApprovedRunner(config, runnerContext, networkContext);
  const startedAt = new Date().toISOString();
  if (!approvedRunner) {
    return {
      schemaVersion: 2,
      phase,
      validationProfileSha256: releaseValidationProfileSha256(config),
      source: {
        id: sourceId,
        routeId,
        addressFamily: addressFamily || "auto",
        runnerContext,
        networkContext,
      },
      runner: {
        approved: false,
        networkCapable: false,
        localPermissionRetry: {
          attempted: false,
          limit: config.execution?.localPermissionRetryLimit ?? 1,
          outcome: "not-eligible",
        },
      },
      probeFailure: {
        code: "RUNNER_CONTEXT_NOT_APPROVED",
        kind: "runner-context-invalid",
        reason: "De opgegeven runner- en netwerkcontext vormen geen goedgekeurde meetcontext.",
      },
      startedAt,
      completedAt: new Date().toISOString(),
      endpoints: {
        target: { url: config.endpoints.target.url, samples: [] },
        control: { url: config.endpoints.control.url, samples: [] },
      },
    };
  }

  const probeOptions = {
    attempts: config.probe?.attempts ?? 3,
    intervalMs: config.probe?.intervalMs ?? 2_000,
    timeoutMs: config.probe?.timeoutMs ?? 8_000,
    maxBodyBytes: config.probe?.maxBodyBytes ?? 1024 * 1024,
    addressFamily,
  };
  if (probeOptions.attempts < 2) throw new Error("Minstens twee meetpogingen zijn vereist.");

  const permissionErrorCodes = localPermissionErrorCodes(config);
  let [target, control] = await Promise.all([
    captureEndpoint(
      config.endpoints.target,
      probeOptions,
      requestUrlImpl,
      permissionErrorCodes,
      config.activation,
    ),
    captureEndpoint(
      config.endpoints.control,
      probeOptions,
      requestUrlImpl,
      permissionErrorCodes,
      null,
    ),
  ]);
  const retryLimit = config.execution?.localPermissionRetryLimit ?? 1;
  const shouldRetry = retryLimit === 1
    && hasLocalPermissionFailure({ target, control });
  let retryOutcome = "not-needed";

  if (shouldRetry) {
    [target, control] = await Promise.all([
      captureEndpoint(
        config.endpoints.target,
        probeOptions,
        requestUrlImpl,
        permissionErrorCodes,
        config.activation,
      ),
      captureEndpoint(
        config.endpoints.control,
        probeOptions,
        requestUrlImpl,
        permissionErrorCodes,
        null,
      ),
    ]);
    retryOutcome = hasLocalPermissionFailure({ target, control })
      ? "local-permission-denied"
      : "completed";
  }

  const localRunnerFailure = hasLocalPermissionFailure({ target, control });
  const localRunnerFailureCode = firstLocalPermissionCode({ target, control });

  return {
    schemaVersion: 2,
    phase,
    validationProfileSha256: releaseValidationProfileSha256(config),
    source: {
      id: sourceId,
      routeId,
      addressFamily: addressFamily || "auto",
      runnerContext,
      networkContext,
    },
    runner: {
      approved: true,
      networkCapable: true,
      localPermissionRetry: {
        attempted: shouldRetry,
        limit: retryLimit,
        outcome: retryOutcome,
      },
    },
    probeFailure: localRunnerFailure ? {
      code: localRunnerFailureCode,
      kind: "local-runner-not-authorized",
      reason: "De lokale runner mocht geen uitgaande netwerkverbinding openen.",
    } : null,
    startedAt,
    completedAt: new Date().toISOString(),
    endpoints: { target, control },
  };
}
