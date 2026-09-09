import { readFile } from "node:fs/promises";
import { SportpaleisDomainMariaDbStore } from "./sportpaleis-domain-mariadb-store.mjs";
import { productionDatabaseCredentialsFromEnvironment } from "./workspace-runtime-config.mjs";
import { applySportpaleisPermissionMigration, permissionPolicyHash, planSportpaleisPermissionMigration } from "./sportpaleis-permission-migration.mjs";

const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
const apply = process.argv.includes("--apply");
const gates = { planningReady: true, mailReady: false, intakeReady: false, teamwearReady: false };
const store = new SportpaleisDomainMariaDbStore({ database: productionDatabaseCredentialsFromEnvironment(process.env).workspace });
try {
  await store.initialize();
  if (apply) {
    const manifest = JSON.parse(await readFile(new URL("../../RELEASE-MANIFEST.json", import.meta.url), "utf8"));
    const releaseId = argument("--release-id");
    if (manifest.releaseId !== releaseId || process.env.RELEASE_ID !== releaseId || manifest.commit !== argument("--commit")) throw new Error("Actieve runtime en exacte release-authority komen niet overeen.");
    console.log(JSON.stringify(await applySportpaleisPermissionMigration(store, { expectedRevision: Number(argument("--expected-revision")), expectedPolicyHash: argument("--policy-sha256"), releaseId, gates })));
  } else {
    const state = await store.read(); const plan = planSportpaleisPermissionMigration(state, gates);
    console.log(JSON.stringify({ status: plan.status, revision: state.revision, blockers: plan.blockers, mapping: plan.mapping, gates, policySha256: plan.policy && permissionPolicyHash(plan.policy), effective: plan.effective.map(({ userId, presetId, allowed }) => ({ userId, presetId, allowed })), mutations: 0 }));
    if (plan.status === "BLOCKED") process.exitCode = 2;
  }
} finally { await store.close(); }
