import { SportpaleisMariaDbStore } from "./sportpaleis-mariadb-store.mjs";
import { productionDatabaseCredentialsFromEnvironment } from "./workspace-runtime-config.mjs";
import { setSportpaleisTeamwearPilotExposure } from "./sportpaleis-pilot-foundation.mjs";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const principalId = argument("--principal");
const expectedEmail = argument("--expected-email")?.trim().toLocaleLowerCase("en-US") ?? null;
const actorId = argument("--actor") ?? "system:teamwear-pilot-control";
const dryRun = process.argv.includes("--dry-run");
const enable = process.argv.includes("--enable");
const disable = process.argv.includes("--disable");

if (!principalId || enable === disable || (!dryRun && !expectedEmail)) {
  throw new Error("Gebruik --principal ID, exact één van --enable/--disable en bij wijzigen --expected-email EMAIL. Voeg --dry-run toe voor inspectie.");
}

const store = new SportpaleisMariaDbStore({
  database: productionDatabaseCredentialsFromEnvironment(process.env).workspace,
});

try {
  await store.initialize();
  const before = await store.read();
  const principal = before.users.find(({ id }) => id === principalId);
  if (!principal) throw new Error("De exacte principal bestaat niet.");
  if (expectedEmail && principal.email.trim().toLocaleLowerCase("en-US") !== expectedEmail) throw new Error("Principal en verwacht e-mailadres komen niet overeen.");
  if (dryRun) {
    process.stdout.write(`${JSON.stringify({ dryRun: true, principalId: principal.id, email: principal.email, role: principal.role, status: principal.status, enabled: principal.featureExposure?.teamwearExperiencePilot === true, revision: before.revision })}\n`);
  } else {
    const result = await store.mutate(async (state) => ({
      state,
      value: setSportpaleisTeamwearPilotExposure(state, principalId, enable, actorId),
    }));
    process.stdout.write(`${JSON.stringify({ ...result.value, revision: result.state.revision, auditRecorded: true })}\n`);
  }
} finally {
  await store.close();
}
