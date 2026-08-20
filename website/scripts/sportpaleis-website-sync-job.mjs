import { SportpaleisMariaDbStore } from "./sportpaleis-mariadb-store.mjs";
import { productionDatabaseCredentialsFromEnvironment } from "./workspace-runtime-config.mjs";
import {
  compareSportpaleisWebsiteSnapshot,
  createSportpaleisWebsiteSource,
  failSportpaleisWebsiteSync,
  stageSportpaleisWebsiteSync,
} from "./sportpaleis-website-sync.mjs";

const mode = process.argv.includes("--dry-run") ? "DRY_RUN"
  : process.argv.includes("--activate") ? "ACTIVATE"
    : "SCHEDULED";
const store = new SportpaleisMariaDbStore({
  database: productionDatabaseCredentialsFromEnvironment(process.env).workspace,
});
const source = createSportpaleisWebsiteSource();

try {
  await store.initialize();
  const current = await store.read();
  if (mode === "SCHEDULED" && current.websiteSync?.enabled !== true) {
    process.stdout.write(`${JSON.stringify({ status: "SKIPPED", reason: "NOT_ACTIVE" })}\n`);
    process.exitCode = 0;
  } else {
    let snapshot;
    try { snapshot = await source.snapshot(); }
    catch (error) {
      if (mode !== "DRY_RUN") await store.mutate(async (state) => ({ state, value: failSportpaleisWebsiteSync(state, error) }));
      throw error;
    }
    const comparison = compareSportpaleisWebsiteSnapshot(current, snapshot);
    if (mode === "DRY_RUN") {
      process.stdout.write(`${JSON.stringify({
        status: "DRY_RUN_OK",
        associations: snapshot.associations.length,
        articles: snapshot.associations.reduce((sum, association) => sum + association.articles.length, 0),
        changes: comparison.changes.length,
        sourceFingerprint: snapshot.fingerprint,
        datastoreRevision: current.revision,
        persisted: false,
      })}\n`);
    } else if (current.websiteSync?.sourceFingerprint === snapshot.fingerprint && (mode !== "ACTIVATE" || current.websiteSync.enabled === true)) {
      process.stdout.write(`${JSON.stringify({ status: "NO_CHANGES", sourceFingerprint: snapshot.fingerprint, datastoreRevision: current.revision, persisted: false })}\n`);
    } else {
      const outcome = await store.mutate(async (state) => ({
        state,
        value: stageSportpaleisWebsiteSync(state, snapshot, { trigger: mode === "ACTIVATE" ? "activation" : "scheduled", enabled: true }),
      }));
      process.stdout.write(`${JSON.stringify({
        status: outcome.value.status,
        associations: outcome.value.counts.associations,
        articles: outcome.value.counts.articles,
        attention: outcome.value.counts.attention,
        enabled: outcome.value.enabled,
      })}\n`);
    }
  }
} catch (error) {
  process.stderr.write(`${JSON.stringify({ status: "FAILED", code: String(error?.code ?? "WEBSITE_SYNC_FAILED"), message: "De websitecontrole is veilig gestopt; Workspace-catalogusdata is niet overschreven." })}\n`);
  process.exitCode = 1;
} finally {
  await store.close();
}
