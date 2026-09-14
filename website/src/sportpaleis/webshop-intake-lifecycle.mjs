import { batchHash } from "./webshop-batch-projection.mjs";
import { normalizeWebshopOrder } from "./webshop-order-input.mjs";

// Durable index only: source authority and order contents stay in mailbox evidence.
export function stageWebshopBatch(state, { batch, attachment, message, actorId, now }) {
  let source = state.webshopIntake.sources.find((source) => source.sha256 === batch.sourceHash);
  if (source) return { source, matches: state.webshopIntake.matches.filter((match) => match.sourceId === source.id) };
  source = { id: `webshop-source-${batch.sourceHash.slice(0, 24)}`, sourceMessageId: message.messageId ?? message.sourceKey,
    receivedAt: message.receivedAt, filename: attachment.filename, mimeType: "application/pdf", sizeBytes: attachment.size,
    sha256: batch.sourceHash, immutable: true, importedAt: now, importedBy: actorId,
    mailboxEvidence: { storageReference: attachment.storageReference, contentHash: attachment.contentHash, messageId: message.id, attachmentId: attachment.id } };
  if (!source.mailboxEvidence.storageReference || source.mailboxEvidence.contentHash !== batch.sourceHash) throw new Error("Webshop mailbox evidence ontbreekt.");
  state.webshopIntake.sources.unshift(source);
  const matches = [...new Set([...batch.items.map((row) => row.orderNumber), ...batch.sourceWarnings.map((warning) => warning.orderNumber)])].map((externalReference) => {
    const rows = batch.items.filter((row) => row.orderNumber === externalReference);
    let reviewReasons = [];
    try { normalizeWebshopOrder(state, batch, externalReference, { filename: source.filename }); }
    catch (error) { reviewReasons = [error.message]; }
    const existing = state.orders.find((order) => order.sourceContext?.source === "WEBSHOP_XPRT" && order.sourceContext.externalReference === externalReference);
    const match = { id: `webshop-match-${batchHash([batch.sourceHash, externalReference]).slice(0, 24)}`, sourceId: source.id,
      externalReference, orderDate: rows[0]?.orderDate ?? null, status: existing?.deletion?.status === "DELETED" ? "DELETED" : existing ? "ACCEPTED" : "HUMAN_CHECK",
      orderId: existing?.id ?? null, revision: 1, projectionVersion: batch.version ?? "WEBSHOP_PRINT_BATCH_V1", reviewReasons,
      itemCount: rows.length, source: { pageNumbers: [...new Set([...rows.flatMap((row) => row.sourcePages), ...batch.sourceWarnings.filter((warning) => warning.orderNumber === externalReference).map((warning) => warning.page)])], sourceOrderIndex: rows[0]?.sourceOrderIndex ?? null },
      articles: [], acceptedAt: null, acceptedBy: null };
    state.webshopIntake.matches.unshift(match);
    return match;
  });
  state.webshopIntake.lastSuccessfulRetrievalAt = now;
  state.webshopIntake.highWaterMark = message.receivedAt;
  return { source, matches };
}
