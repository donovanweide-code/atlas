import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectQuickProductionSource } from "../src/sportpaleis/quick-production-intake.mjs";
import { parseSportpaleisDividePdfText, reconcileSportpaleisDivideRevision } from "./sportpaleis-divide-import.mjs";

const sourcePath = process.argv[2];
if (!sourcePath) throw new Error("Gebruik: node scripts/validate-sportpaleis-real-webshop-pdf.mjs <pdf-pad>");
const contract = JSON.parse(await readFile(new URL("../tests/fixtures/sportpaleis/real-webshop-pdf-012653.contract.json", import.meta.url), "utf8"));
const bytes = await readFile(resolve(sourcePath));
const inspected = await inspectQuickProductionSource({ filename: "012653-order.pdf", mimeType: "application/pdf", dataBase64: bytes.toString("base64") });
const input = { pages: inspected.extraction.textPages, layoutPages: inspected.extraction.layoutPages, sourceDocumentId: inspected.source.sha256, sourceHash: inspected.source.sha256, detectedAt: "2026-08-27T00:00:00.000Z" };
const parsed = parseSportpaleisDividePdfText(input);
const replayed = parseSportpaleisDividePdfText(input);
const proposalRows = parsed.orders.flatMap((order) => order.productionLines.flatMap((line) => line.personalization.map((decoration) => ({ externalReference: order.externalReference, sourceLineId: line.sourceLineId, articleNumber: line.articleNumber, quantity: line.quantity, kind: decoration.kind, value: decoration.value, sourceValue: decoration.sourceValue, decorationIdentity: decoration.decorationIdentity, status: decoration.status }))));
const decoratedOrders = parsed.orders.filter(({ productionLines }) => productionLines.length > 0);
const actualGolden = Object.fromEntries(Object.keys(contract.goldenOrders).map((reference) => [reference, proposalRows.filter(({ externalReference }) => externalReference === reference).map(({ articleNumber, kind, value }) => [articleNumber, kind, value])]));
const metrics = {
  sourceSha256: inspected.source.sha256,
  pdfPages: inspected.extraction.pageCount,
  uniqueOrders: new Set(parsed.orders.map(({ externalReference }) => externalReference)).size,
  ordersWithExplicitDecoration: decoratedOrders.length,
  decoratedArticleLines: parsed.orders.reduce((total, order) => total + order.productionLines.length, 0),
  decorationItems: proposalRows.length,
  customersPresent: parsed.orders.filter(({ customer }) => customer).length,
  customerPhonesPresent: parsed.orders.filter(({ customerPhone }) => customerPhone).length,
  customerEmailsPresent: parsed.orders.filter(({ customerEmail }) => customerEmail).length,
  attentionRequired: proposalRows.filter(({ status }) => status === "ATTENTION_REQUIRED").length,
};
const assertions = {
  sourceHash: metrics.sourceSha256 === contract.sourceSha256,
  pdfPages: metrics.pdfPages === contract.pdfPages,
  uniqueOrders: metrics.uniqueOrders === contract.uniqueOrders && parsed.orders.length === contract.uniqueOrders,
  ordersWithExplicitDecoration: metrics.ordersWithExplicitDecoration === contract.ordersWithExplicitDecoration,
  decoratedArticleLines: metrics.decoratedArticleLines === contract.decoratedArticleLines,
  decorationItems: metrics.decorationItems === contract.decorationItems,
  attentionRequired: metrics.attentionRequired === contract.attentionRequired,
  customersPresent: metrics.customersPresent === contract.customersPresent,
  customerPhonesPresent: metrics.customerPhonesPresent === contract.customerPhonesPresent,
  customerEmailsPresent: metrics.customerEmailsPresent === contract.customerEmailsPresent,
  goldenOrders: JSON.stringify(actualGolden) === JSON.stringify(contract.goldenOrders),
  dedupe: parsed.orders.every((order, index) => reconcileSportpaleisDivideRevision([reconcileSportpaleisDivideRevision([], order).record], replayed.orders[index]).action === "NO_OP"),
  articleDecorationCardinality: new Set(proposalRows.map(({ decorationIdentity }) => decorationIdentity)).size === proposalRows.length,
  evidencePreserved: parsed.orders.every(({ source }) => source.sha256 === contract.sourceSha256 && source.originalEvidence.length > 0),
  unprintedLinesExcluded: parsed.orders.every((order) => order.productionLines.every(({ personalization }) => personalization.length > 0)),
  failClosedAttention: decoratedOrders.filter(({ status }) => status === "READY").length === contract.readyDecoratedOrders && decoratedOrders.filter(({ status }) => status === "ATTENTION_REQUIRED").length === 1,
};
console.log(JSON.stringify({ metrics, assertions }, null, 2));
if (Object.values(assertions).some((passed) => !passed)) process.exitCode = 1;
