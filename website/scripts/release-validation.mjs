import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  evaluateReleaseValidation,
  RELEASE_VALIDATION_CLASSIFICATION,
} from "./release-validation-core.mjs";
import {
  captureReleaseValidationReport,
  releaseValidationProfileSha256,
  validateReleaseValidationConfig,
} from "./release-validation-probe.mjs";
import { runPostSwitchActivation } from "./release-validation-activation.mjs";

function usage() {
  return [
    "Gebruik:",
    "  node scripts/release-validation.mjs capture --config <json> --phase <preflight|post-switch> --source <id> --route <id> --runner-context <id> --network-context <id> [--family <4|6>] --output <json>",
    "  node scripts/release-validation.mjs evaluate --config <json> --phase preflight --report <json> --report <json> [--output <json>]",
    "  node scripts/release-validation.mjs activate --config <json> --switch-requested-at <ISO-8601> --output <json>",
  ].join("\n");
}

function parseArguments(argv) {
  const [command, ...tokens] = argv;
  const options = { report: [] };
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) throw new Error(`Onbekend argument: ${token}`);
    const name = token.slice(2);
    const value = tokens[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Waarde ontbreekt voor --${name}`);
    if (name === "report") options.report.push(value);
    else options[name] = value;
    index += 1;
  }
  return { command, options };
}

async function readJson(file) {
  return JSON.parse(await readFile(path.resolve(file), "utf8"));
}

async function writeJson(file, value) {
  await writeFile(path.resolve(file), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function required(options, name) {
  if (!options[name]) throw new Error(`--${name} is verplicht.`);
  return options[name];
}

async function capture(options) {
  const config = await readJson(required(options, "config"));
  const report = await captureReleaseValidationReport(config, {
    phase: required(options, "phase"),
    sourceId: required(options, "source"),
    routeId: required(options, "route"),
    runnerContext: required(options, "runner-context"),
    networkContext: required(options, "network-context"),
    addressFamily: options.family ? Number(options.family) : 0,
  });
  await writeJson(required(options, "output"), report);
  console.log(`Meetrapport vastgelegd: ${options.output}`);
}

async function evaluate(options) {
  const config = await readJson(required(options, "config"));
  validateReleaseValidationConfig(config);
  const phase = required(options, "phase");
  if (phase === "post-switch") {
    throw new Error("Gebruik voor post-switchvalidatie het commando activate met een vast switchRequestedAt.");
  }
  if (options.report.length === 0) throw new Error("Minstens één --report is verplicht.");
  const reports = await Promise.all(options.report.map(readJson));
  const result = evaluateReleaseValidation({
    phase,
    reports,
    expectedProfileSha256: releaseValidationProfileSha256(config),
    maximumEvidenceAgeMs: (config.validation?.maximumEvidenceAgeSeconds ?? 600) * 1000,
    minimumConsecutiveSamples: config.validation?.minimumConsecutiveSamples ?? 2,
    minimumIndependentRoutes: config.validation?.minimumIndependentRoutes ?? 2,
    minimumObservationSpanMs: config.validation?.minimumObservationSpanMs ?? 0,
    approvedRunnerContexts: config.execution.approvedRunnerContexts,
  });

  if (options.output) await writeJson(options.output, result);
  console.log(JSON.stringify(result, null, 2));

  const exitCodes = {
    [RELEASE_VALIDATION_CLASSIFICATION.pass]: 0,
    [RELEASE_VALIDATION_CLASSIFICATION.probeInvalid]: 20,
    [RELEASE_VALIDATION_CLASSIFICATION.validationFailed]: 30,
    [RELEASE_VALIDATION_CLASSIFICATION.productionFailed]: 40,
  };
  process.exitCode = exitCodes[result.classification];
}

async function activate(options) {
  const config = await readJson(required(options, "config"));
  const output = required(options, "output");
  const result = await runPostSwitchActivation(config, {
    switchRequestedAt: required(options, "switch-requested-at"),
    onUpdate: async (update) => {
      await writeJson(output, update);
      console.log(
        `Ronde ${update.currentRound}: ${update.activationStatus} — ${update.reason}`,
      );
    },
  });

  const exitCodes = {
    [RELEASE_VALIDATION_CLASSIFICATION.pass]: 0,
    [RELEASE_VALIDATION_CLASSIFICATION.probeInvalid]: 20,
    [RELEASE_VALIDATION_CLASSIFICATION.validationFailed]: 30,
    [RELEASE_VALIDATION_CLASSIFICATION.productionFailed]: 40,
    [RELEASE_VALIDATION_CLASSIFICATION.activationTimeout]: 50,
  };
  process.exitCode = exitCodes[result.classification] ?? 30;
}

export async function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArguments(argv);
  if (command === "capture") return capture(options);
  if (command === "evaluate") return evaluate(options);
  if (command === "activate") return activate(options);
  throw new Error(usage());
}

const executedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (executedDirectly) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error(usage());
    process.exitCode = 2;
  }
}
