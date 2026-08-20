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
    try {
      const knownProductionArticleIds = new Set((current.articles ?? []).filter(({ profileId }) => profileId && profileId !== "profile-none").map((article) => String(article.articleNumber ?? "").trim() || String(article.id ?? "").match(/^sp-live-(.+)$/u)?.[1]).filter(Boolean));
      snapshot = await source.snapshot(new Date(), { knownProductionArticleIds, relevanceIndex: current.websiteSync?.sourceRelevanceIndex ?? {} });
    }
    catch (error) {
      if (mode !== "DRY_RUN") await store.mutate(async (state) => ({ state, value: failSportpaleisWebsiteSync(state, error) }));
      throw error;
    }
    const comparison = compareSportpaleisWebsiteSnapshot(current, snapshot);
    if (mode === "DRY_RUN") {
      const articles = snapshot.associations.flatMap((association) => association.articles);
      const productionRelevant = articles.filter(({ productionRelevance }) => productionRelevance?.status === "RELEVANT").length;
      const automaticallyIgnored = articles.filter(({ productionRelevance }) => productionRelevance?.status === "NOT_RELEVANT").length;
      const ambiguous = articles.filter(({ productionRelevance }) => productionRelevance?.status !== "RELEVANT" && productionRelevance?.status !== "NOT_RELEVANT").length;
      process.stdout.write(`${JSON.stringify({
        status: "DRY_RUN_OK",
        rawCandidates: snapshot.rawArticleCandidates,
        notLiveAssociationCandidates: snapshot.notLiveAssociationCandidates,
        liveStorefrontCandidates: articles.length,
        productionRelevant,
        automaticallyIgnored,
        ambiguous,
        associations: snapshot.associations.length,
        reviewRequired: comparison.changes.length,
        reconciledLegacy: comparison.reconciledLegacyCount,
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
  process.stderr.write(`${JSON.stringify({ status: "FAILED", code: String(error?.code ?? "WEBSITE_SYNC_FAILED"), ...(mode === "DRY_RUN" && error?.sourceUrl ? { sourceUrl: String(error.sourceUrl) } : {}), message: "De websitecontrole is veilig gestopt; Workspace-catalogusdata is niet overschreven." })}\n`);
  process.exitCode = 1;
} finally {
  await store.close();
}
