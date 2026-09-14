import { randomBytes } from "node:crypto";
import { createSportpaleisProductionBootstrap, SportpaleisPilotService, validateFinalProductionTruth } from "../../scripts/sportpaleis-pilot-foundation.mjs";
import { normalizeWebshopPrintItem } from "./webshop-order-input.mjs";
import { batchHash } from "./webshop-batch-projection.mjs";

// The existing order contract runs against throwaway memory only. There is no
// database store, transport, runtime route, artifact builder or job creator here.
export function createBatchPlotJobDryRun() {
  const state = createSportpaleisProductionBootstrap(new Date("2026-09-08T00:00:00Z"));
  for (const key of ["orders", "productionJobs", "productionProposals", "teamkitProposals", "audit", "employees"]) state[key] = [];
  const token = randomBytes(24).toString("hex"), csrf = randomBytes(24).toString("hex");
  state.users = [{ id: "batch-dry-run-operator", name: "Lokale contractcontrole", role: "operator", status: "Actief" }];
  state.sessions = [{ idHash: batchHash(token), csrfHash: batchHash(csrf), userId: state.users[0].id, expiresAt: "2099-01-01T00:00:00.000Z" }];
  const store = { read: async () => state, mutate: async (mutator) => mutator(state) };
  const service = new SportpaleisPilotService({ store, websiteSource: {}, mailMode: "capture", uploadsEnabled: false,
    installedProductionAssetRoot: null, prewarmProductionBuildIsolation: false });
  const truthHash = batchHash([state.articles, state.associations, state.productionProfiles, state.productionFonts, state.foilRolls]);
  const catalog = (row) => {
    const matches = state.articles.filter((a) => a.active !== false && String(a.articleNumber) === row.values.articleNumber && (!row.club || a.association === row.club));
    const article = matches.length === 1 ? matches[0] : null;
    return article ? { id: article.id, name: article.name, imageKey: article.imageKey, sizes: article.availableSizes ?? [] } : null;
  };
  const cache = new Map();
  let tail = Promise.resolve();
  async function evaluate(row) {
    const key = batchHash([row.id, row.values, row.issues, row.club, truthHash]);
    if (cache.has(key)) return structuredClone(await cache.get(key));
    const operation = tail.then(async () => {
      const normalized = normalizeWebshopPrintItem(state, row);
      if (normalized.status !== "READY") return { ...normalized, truthHash };
      const { article, productType, item } = normalized;
      try {
        // The existing contract applies its own size-class, colour, profile and
        // price/placement rules; this adapter never copies those rules.
        const created = await service.createOrder(token, csrf, { orderKind: "INDIVIDUAL", customer: `Lokale proef ${row.orderNumber}`, association: article.association,
          source: "WEBSHOP_XPRT", externalReference: row.orderNumber, provenance: `PDF SHA256 ${row.sourceHash}; regel ${row.sourceLineId}`,
          standardPersonalization: {}, items: [item] }, `batch-evaluate:${key}`);
        const order = structuredClone(created.value);
        // Stable review identities replace random transient IDs before final
        // contract validation; they are never allocated production order IDs.
        const previousItem = order.items[0].id;
        const variants = new Map(order.items[0].variants.map((variant, index) => [variant.id, `${row.id}:variant:${index}`]));
        order.id = `batch-review:${row.id}`;
        order.items[0].id = row.id;
        order.items[0].variants.forEach((variant) => { variant.id = variants.get(variant.id); });
        for (const [index, line] of order.productionLines.entries()) {
          line.id = `${row.id}:line:${index}`; line.orderId = order.id;
          if (line.itemId === previousItem) line.itemId = row.id;
          if (variants.has(line.variantId)) line.variantId = variants.get(line.variantId);
          if (line.variantIds) line.variantIds = line.variantIds.map((id) => variants.get(id) ?? id);
          for (const [oldId, newId] of variants) if (line.provenance) line.provenance = line.provenance.replaceAll(oldId, newId);
          if (line.decorationIdentity) {
            line.decorationIdentity.orderId = order.id; line.decorationIdentity.itemId = row.id;
            if (variants.has(line.decorationIdentity.variantId)) line.decorationIdentity.variantId = variants.get(line.decorationIdentity.variantId);
            if (variants.has(line.decorationIdentity.occurrenceId)) line.decorationIdentity.occurrenceId = variants.get(line.decorationIdentity.occurrenceId);
          }
        }
        const validation = validateFinalProductionTruth(state, order, order.productionLines);
        const contract = { operation: "EXISTING_PLOTJOB_CONTRACT_DRY_RUN", sourceItemId: row.id, externalReference: row.orderNumber,
          articleId: article.id, articleNumber: row.values.articleNumber, articleColor: row.values.color, size: row.values.size,
          association: article.association, productType, quantity: row.values.quantity, foilColor: order.items[0].foilColor,
          items: order.items, productionLines: order.productionLines, validation };
        const resolvedProfile = order.items[0].variants[0]?.backNumberProduction;
        const sizeProfile = resolvedProfile?.sizeClass && ["SOURCE_CONFIGURED", "VALIDATED"].includes(resolvedProfile.status)
          ? { value: resolvedProfile.sizeClass, automatic: !["JUNIOR", "SENIOR"].includes(row.values.sizeProfile), source: resolvedProfile.source, heightMm: resolvedProfile.physicalHeightMm }
          : { value: row.values.sizeProfile ?? "AUTO", automatic: false, source: null };
        const findings = validation.findings.map(({ reason, message, code }) => ({ field: "production", message: /FONT/u.test(code ?? "") ? "Productielettertype ontbreekt of is nog niet bevestigd." : "Productiebron of maatvoering nog niet bevestigd.", code }));
        return { status: validation.status === "VALID" ? "READY" : "REVIEW_REQUIRED", issues: findings,
          sizeProfile, club: article.association, productType, foilColor: order.items[0].foilColor, truthHash, contract };
      } catch (error) {
        return { status: "REVIEW_REQUIRED", issues: [{ field: "production", message: error.code === "ARTICLE_SIZE_UNAVAILABLE" ? "Maat niet bekend voor dit artikel. Pas de maat aan." : error.code === "BACK_NUMBER_SIZE_CLASS_REQUIRED" ? "Junior/Senior niet bepaalbaar. Kies het juiste profiel." : "Productiebron of plaatsing nog niet bevestigd. Controleer deze regel.", code: error.code ?? "CONTRACT_REJECTED" }], truthHash, contract: null };
      } finally {
        state.orders = []; state.audit = []; state.idempotency = {}; state.nextOrderSequence = 1;
      }
    });
    cache.set(key, operation);
    tail = operation.then(() => {}, () => {});
    if (cache.size > 128) cache.delete(cache.keys().next().value);
    return structuredClone(await operation);
  }
  return { evaluate, catalog, truthHash, persistentOrders: 0, productionJobsCreated: 0 };
}
