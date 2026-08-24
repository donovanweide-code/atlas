import type { PilotBootstrap } from "./sportpaleis/pilot-api.ts";

export type WorkspaceSearchKind = "ORDER" | "ARTICLE" | "ASSOCIATION" | "EMPLOYEE" | "PRODUCTION_JOB" | "PRODUCTION_ASSET";

export interface WorkspaceSearchItem {
  id: string;
  kind: WorkspaceSearchKind;
  group: string;
  title: string;
  context: string;
  href: string;
  terms: string;
  previewSrc?: string;
}

function normalized(value: unknown): string {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/gu, "")
    .trim().replace(/\s+/gu, " ").toLocaleLowerCase("nl-NL");
}

export function isConfirmedPilotTestOrder(order: PilotBootstrap["orders"][number]): boolean {
  const email = String(order.customerEmail ?? "").trim().toLocaleLowerCase("nl-NL");
  const customer = String(order.customer ?? "").trim().toLocaleLowerCase("nl-NL");
  return email.endsWith("@example.invalid")
    || /^snijtest-/iu.test(order.id)
    || /^interne productietest\b/u.test(customer)
    || /^pilot groepstest\b/u.test(customer)
    || /^test(?:\s|\d|$)/u.test(customer);
}

export function isOperationalOrder(order: PilotBootstrap["orders"][number]): boolean {
  return !order.deletion && !isConfirmedPilotTestOrder(order);
}

export function isOperationalProductionOrder(order: PilotBootstrap["orders"][number]): boolean {
  return isOperationalOrder(order) && order.productionArchive?.status !== "ARCHIVED";
}

export function buildWorkspaceSearchIndex(state: PilotBootstrap, base = "/workspace/sportpaleis"): WorkspaceSearchItem[] {
  const items: WorkspaceSearchItem[] = [];
  for (const order of state.orders.filter(isOperationalOrder)) {
    const articleTerms = order.items.flatMap(({ articleNumber, product, association, variants }) => [articleNumber, product, association, ...(variants ?? []).map(({ participantName }) => participantName)]).filter(Boolean);
    items.push({
      id: order.id, kind: "ORDER", group: order.sourceContext?.source === "WEBSHOP_XPRT" ? "Webshoporders" : "Winkelorders",
      title: order.sourceContext?.externalReference || order.id,
      context: `${order.customer} · ${order.association}`,
      href: `${base}/orders/${encodeURIComponent(order.id)}`,
      terms: normalized([order.id, order.sourceContext?.externalReference, order.customer, order.customerEmail, order.customerPhone, order.association, order.salesAttribution?.salesNumber, order.salesAttribution?.label, ...articleTerms].join(" ")),
    });
  }
  for (const article of state.articles) items.push({
    id: article.id, kind: "ARTICLE", group: "Artikelen", title: article.name,
    context: `${article.articleNumber} · ${article.association}`,
    href: state.capabilities.admin ? `${base}/beheer/artikelen#${encodeURIComponent(article.id)}` : `${base}/orders/nieuw`,
    terms: normalized([article.name, article.articleNumber, article.supplierArticleNumber, article.association, article.category].join(" ")),
  });
  for (const association of state.associations) items.push({
    id: association.id, kind: "ASSOCIATION", group: "Verenigingen en teams", title: association.name,
    context: `${state.articles.filter(({ association: name }) => name === association.name).length} artikelen`,
    href: state.capabilities.admin ? `${base}/beheer/verenigingen?vereniging=${encodeURIComponent(association.name)}` : `${base}/orders/nieuw?vereniging=${encodeURIComponent(association.name)}`,
    terms: normalized([association.name, association.source?.file, association.notes].join(" ")),
  });
  for (const employee of state.employees ?? []) items.push({
    id: employee.id, kind: "EMPLOYEE", group: "Medewerkers", title: employee.name,
    context: `Verkoopnummer ${employee.salesNumber} · ${employee.active ? "Actief" : "Inactief"}`,
    href: state.capabilities.admin ? `${base}/beheer/werknemers#${encodeURIComponent(employee.id)}` : `${base}/orders/nieuw?verkoopnummer=${encodeURIComponent(employee.salesNumber)}`,
    terms: normalized([employee.name, "verkoopnummer", employee.salesNumber].join(" ")),
  });
  if (state.capabilities.operator || state.capabilities.admin) for (const job of state.productionJobs) items.push({
    id: job.id, kind: "PRODUCTION_JOB", group: "Productiehistorie", title: job.jobNumber,
    context: `${job.snapshot.association} · ${job.initiatedBy.name}`,
    href: `${base}/productie/historie/${encodeURIComponent(job.id)}`,
    terms: normalized([job.jobNumber, job.snapshot.association, job.initiatedBy.name, ...job.snapshot.orderIds, ...job.snapshot.elements.map(({ value }) => value)].join(" ")),
  });
  if (state.capabilities.operator || state.capabilities.admin) for (const asset of (state.productionElements ?? []).filter(({ lifecycleStatus }) => lifecycleStatus === "PRODUCTION_READY")) {
    const candidateId = asset.sourceSelection?.candidateIds[0];
    items.push({
      id: asset.id, kind: "PRODUCTION_ASSET", group: "Productieassets", title: asset.name,
      context: [asset.ownerName, ...(asset.contexts ?? []).map(({ label }) => label), ...(asset.applications ?? []).map(({ kind }) => kind)].filter(Boolean).join(" · "),
      href: `${base}/productie/elementen#${encodeURIComponent(asset.id)}`,
      terms: normalized([asset.name, asset.ownerName, ...(asset.contexts ?? []).map(({ label }) => label), ...(asset.applications ?? []).map(({ kind, placement }) => `${kind} ${placement ?? ""}`)].join(" ")),
      ...(asset.sourceId && candidateId ? { previewSrc: `${base.replace(/\/workspace\/sportpaleis$/u, "")}/api/sportpaleis/v1/production-asset-sources/${encodeURIComponent(asset.sourceId)}/candidates/${encodeURIComponent(candidateId)}/preview.svg` } : {}),
    });
  }
  return items;
}

export function queryWorkspaceSearch(index: readonly WorkspaceSearchItem[], query: string, limit = 40): WorkspaceSearchItem[] {
  const needle = normalized(query);
  if (needle.length < 1) return [];
  const tokens = needle.split(" ");
  return index
    .filter(({ terms }) => tokens.every((token) => terms.includes(token)))
    .sort((left, right) => {
      const leftTitle = normalized(left.title); const rightTitle = normalized(right.title);
      const leftScore = leftTitle === needle ? 0 : leftTitle.startsWith(needle) ? 1 : left.terms.startsWith(needle) ? 2 : 3;
      const rightScore = rightTitle === needle ? 0 : rightTitle.startsWith(needle) ? 1 : right.terms.startsWith(needle) ? 2 : 3;
      return leftScore - rightScore || left.group.localeCompare(right.group, "nl-NL") || left.title.localeCompare(right.title, "nl-NL");
    })
    .slice(0, limit);
}
