const normalizeEan = (value) => String(value ?? "").replace(/\s+/gu, "");

export function createOrderPickProof({ order, sourceSnapshot, now = new Date().toISOString() }) {
  if (!order?.id) throw new Error("Order ontbreekt.");
  if (sourceSnapshot?.source !== "ACA_XPRT" || !sourceSnapshot?.sourceId || !sourceSnapshot?.observedAt || !Array.isArray(sourceSnapshot.records)) throw new Error("Een expliciete ACA-bronsnapshot is vereist.");
  const ageMs = Date.parse(now) - Date.parse(sourceSnapshot.observedAt);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 24 * 60 * 60 * 1000) throw new Error("ACA-bronsnapshot is niet actueel genoeg voor orderpick-proof.");
  return { id: `pick-proof:${order.id}:${sourceSnapshot.sourceId}`, orderId: order.id, source: { source: sourceSnapshot.source, sourceId: sourceSnapshot.sourceId, observedAt: sourceSnapshot.observedAt }, scans: [], audit: [], status: "READY" };
}

export function scanOrderPickProof(session, order, sourceSnapshot, value, at = new Date().toISOString()) {
  const ean = normalizeEan(value);
  if (!ean) throw new Error("Scan ontbreekt.");
  const matches = sourceSnapshot.records.filter((record) => normalizeEan(record.ean) === ean);
  if (matches.length !== 1) throw new Error(matches.length ? "EAN is niet uniek in de ACA-bronsnapshot." : "EAN is onbekend in de ACA-bronsnapshot.");
  const match = matches[0];
  if (!order.items.some((item) => item.articleId === match.articleId || item.articleNumber === match.articleNumber)) throw new Error("Scan hoort niet bij een artikelregel van deze order.");
  if (session.scans.some((scan) => scan.ean === ean && scan.status === "ACTIVE")) return { ...session, duplicate: true };
  return {
    ...session,
    duplicate: false,
    scans: [...session.scans, { id: `scan:${session.scans.length + 1}`, ean, articleId: match.articleId, articleNumber: match.articleNumber, status: "ACTIVE", at }],
    audit: [...session.audit, { at, action: "SCAN_MATCHED", ean, articleId: match.articleId }],
  };
}

export function undoOrderPickProofScan(session, scanId, at = new Date().toISOString()) {
  const scan = session.scans.find(({ id }) => id === scanId);
  if (!scan || scan.status !== "ACTIVE") throw new Error("Alleen een actieve scan kan worden teruggedraaid.");
  return { ...session, scans: session.scans.map((entry) => entry.id === scanId ? { ...entry, status: "UNDONE", undoneAt: at } : entry), audit: [...session.audit, { at, action: "SCAN_UNDONE", scanId, ean: scan.ean }] };
}
