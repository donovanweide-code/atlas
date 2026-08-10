export const WBD_WORKSPACE_BOUNDARY = "/workspace/wbd";
export const WBD_WORKSPACE_HOME = `${WBD_WORKSPACE_BOUNDARY}/overzicht`;

export type WorkspaceRouteAccess = "future-authenticated" | "system-public";
export type WorkspaceRouteStatus = "matched" | "not-found" | "parse-error";

export interface WorkspaceRouteDefinition {
  id: string;
  path: string;
  title: string;
  navigationId?: string;
  access: WorkspaceRouteAccess;
  organizationContext: boolean;
  directLink: boolean;
  focus: boolean;
}

export interface ResolvedWorkspaceRoute {
  status: WorkspaceRouteStatus;
  requestedPath: string;
  canonicalPath?: string;
  redirectTo?: string;
  definition?: WorkspaceRouteDefinition;
  params: Readonly<Record<string, string>>;
}

const authenticatedDefaults = {
  access: "future-authenticated",
  directLink: true,
} as const;

export const wbdWorkspaceRoutes = [
  { id: "home", path: `${WBD_WORKSPACE_BOUNDARY}/overzicht`, title: "Home", navigationId: "overzicht", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "organizations", path: `${WBD_WORKSPACE_BOUNDARY}/organisaties`, title: "Organisaties", navigationId: "organisaties", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "organization", path: `${WBD_WORKSPACE_BOUNDARY}/organisaties/:organizationId`, title: "Organisatiedossier", navigationId: "organisaties", organizationContext: true, focus: false, ...authenticatedDefaults },
  { id: "organization-documents", path: `${WBD_WORKSPACE_BOUNDARY}/organisaties/:organizationId/documenten`, title: "Documenten", navigationId: "organisaties", organizationContext: true, focus: false, ...authenticatedDefaults },
  { id: "organization-document-new", path: `${WBD_WORKSPACE_BOUNDARY}/organisaties/:organizationId/documenten/nieuw`, title: "Document toevoegen", navigationId: "organisaties", organizationContext: true, focus: true, ...authenticatedDefaults },
  { id: "organization-note-new", path: `${WBD_WORKSPACE_BOUNDARY}/organisaties/:organizationId/notities/nieuw`, title: "Notitie toevoegen", navigationId: "organisaties", organizationContext: true, focus: true, ...authenticatedDefaults },
  { id: "projects", path: `${WBD_WORKSPACE_BOUNDARY}/projecten`, title: "Projecten", navigationId: "projecten", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "development-partners", path: `${WBD_WORKSPACE_BOUNDARY}/ontwikkelpartners`, title: "Ontwikkelpartners", navigationId: "ontwikkelpartners", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "development-monitor", path: `${WBD_WORKSPACE_BOUNDARY}/ontwikkeling/monitor`, title: "Ontwikkelmonitor", navigationId: "ontwikkeling", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "development-history", path: `${WBD_WORKSPACE_BOUNDARY}/ontwikkeling/historie`, title: "Ontwikkelhistorie", navigationId: "ontwikkeling", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "development-feedback", path: `${WBD_WORKSPACE_BOUNDARY}/ontwikkeling/feedback`, title: "Feedback", navigationId: "ontwikkeling", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "business-foundation", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation`, title: "Business Foundation", navigationId: "business-foundation", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "company-details", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation/bedrijfsgegevens`, title: "Bedrijfsgegevens", navigationId: "business-foundation", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "finance", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation/finance`, title: "Financiën", navigationId: "business-foundation", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "incoming-invoices", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation/finance/inkomende-facturen`, title: "Inkomende facturen", navigationId: "business-foundation", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "invoice-list", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation/finance/facturen`, title: "Facturen", navigationId: "business-foundation", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "invoice-new", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation/finance/facturen/nieuw`, title: "Nieuwe factuur", navigationId: "business-foundation", organizationContext: false, focus: true, ...authenticatedDefaults },
  { id: "invoice-sent-list", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation/finance/facturen/verzonden`, title: "Verzonden facturen", navigationId: "business-foundation", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "invoice-concept", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation/finance/facturen/concepten/:invoiceId`, title: "Factuurconcept", navigationId: "business-foundation", organizationContext: false, focus: true, ...authenticatedDefaults },
  { id: "invoice-sent", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation/finance/facturen/verzonden/:invoiceId`, title: "Verzonden factuur", navigationId: "business-foundation", organizationContext: false, focus: true, ...authenticatedDefaults },
  { id: "templates", path: `${WBD_WORKSPACE_BOUNDARY}/business-foundation/templates`, title: "Templates", navigationId: "business-foundation", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "infrastructure", path: `${WBD_WORKSPACE_BOUNDARY}/infrastructuur`, title: "Infrastructuur", navigationId: "infrastructuur", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "knowledge-proposals", path: `${WBD_WORKSPACE_BOUNDARY}/kennisvoorstellen`, title: "Kennisvoorstellen", navigationId: "kennisvoorstellen", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "knowledge-proposal", path: `${WBD_WORKSPACE_BOUNDARY}/kennisvoorstellen/:proposalId`, title: "Kennisvoorstel", navigationId: "kennisvoorstellen", organizationContext: false, focus: true, ...authenticatedDefaults },
  { id: "knowledge", path: `${WBD_WORKSPACE_BOUNDARY}/kennis`, title: "Atlas Knowledge Repository", navigationId: "kennisvoorstellen", organizationContext: false, focus: false, ...authenticatedDefaults },
  { id: "continuity", path: `${WBD_WORKSPACE_BOUNDARY}/tijdlijn`, title: "Lokale back-up", organizationContext: false, focus: false, ...authenticatedDefaults },
] as const satisfies readonly WorkspaceRouteDefinition[];

const aliases = new Map<string, string>([
  [WBD_WORKSPACE_BOUNDARY, WBD_WORKSPACE_HOME],
  [`${WBD_WORKSPACE_BOUNDARY}/ontwikkeling`, `${WBD_WORKSPACE_BOUNDARY}/ontwikkeling/monitor`],
  [`${WBD_WORKSPACE_BOUNDARY}/business-foundation/finance/facturen/concepten`, `${WBD_WORKSPACE_BOUNDARY}/business-foundation/finance/facturen`],
]);

function normalizePath(pathname: string): { path: string; segments: string[] } | undefined {
  const path = pathname.replace(/\/+$/, "") || "/";
  const rawSegments = path.split("/").filter(Boolean);
  try {
    return { path, segments: rawSegments.map((segment) => decodeURIComponent(segment)) };
  } catch {
    return undefined;
  }
}

function matchDefinition(
  segments: readonly string[],
  definition: WorkspaceRouteDefinition,
): Readonly<Record<string, string>> | undefined {
  const templateSegments = definition.path.split("/").filter(Boolean);
  if (templateSegments.length !== segments.length) return undefined;

  const params: Record<string, string> = {};
  for (let index = 0; index < templateSegments.length; index += 1) {
    const template = templateSegments[index];
    const segment = segments[index];
    if (template.startsWith(":")) {
      if (!segment || segment === "." || segment === "..") return undefined;
      params[template.slice(1)] = segment;
    } else if (template !== segment) {
      return undefined;
    }
  }
  return params;
}

function interpolatePath(definition: WorkspaceRouteDefinition, params: Readonly<Record<string, string>>): string {
  return definition.path.replace(/:([A-Za-z][A-Za-z0-9]*)/g, (_match, name: string) => encodeURIComponent(params[name] ?? ""));
}

export function resolveWbdWorkspaceRoute(pathname: string): ResolvedWorkspaceRoute {
  const normalized = normalizePath(pathname);
  if (!normalized) return { status: "parse-error", requestedPath: pathname, params: {} };

  const aliasTarget = aliases.get(normalized.path);
  const effectivePath = aliasTarget ?? normalized.path;
  const effective = normalizePath(effectivePath);
  if (!effective) return { status: "parse-error", requestedPath: normalized.path, params: {} };

  for (const definition of wbdWorkspaceRoutes) {
    const params = matchDefinition(effective.segments, definition);
    if (!params) continue;
    const canonicalPath = interpolatePath(definition, params);
    return {
      status: "matched",
      requestedPath: normalized.path,
      canonicalPath,
      redirectTo: aliasTarget ? canonicalPath : undefined,
      definition,
      params,
    };
  }

  return { status: "not-found", requestedPath: normalized.path, params: {} };
}

export function workspaceDocumentTitle(page: string): string {
  return `${page} — WBD Workspace`;
}

