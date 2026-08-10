import {
  resolveWbdWorkspaceRoute,
  WBD_WORKSPACE_HOME,
} from "./workspace-routes.ts";

export type WorkspaceId = "atlas" | "wbd" | "experience";

export interface WorkspaceNavigationItem {
  id: string;
  label: string;
  href: string;
  description: string;
  /**
   * Reserved for a future, editorial attention cue. The navigation renders no
   * indicator unless an explicit human-readable label is supplied.
   */
  attentionLabel?: string;
}

export interface WorkspaceConfig {
  id: WorkspaceId;
  name: string;
  shortName: string;
  description: string;
  homeHref: string;
  /**
   * Keep the identity block presentational when a Workspace has no distinct
   * home destination behind it. Navigation remains available through the
   * configured navigation and Workspace switcher.
   */
  brandIsInteractive?: boolean;
  mark: string;
  navigation: readonly WorkspaceNavigationItem[];
  /**
   * Optional, deliberately small browse-navigation for the mobile shell.
   * The platform renders only configured capabilities; this is not a
   * permission boundary and does not imply that every customer has them.
   */
  mobileNavigation?: readonly WorkspaceNavigationItem[];
  mobileMoreNavigation?: readonly WorkspaceNavigationItem[];
  secondaryNavigation?: readonly WorkspaceNavigationItem[];
  poweredBy?: string;
  footerLink?: {
    label: string;
    href: string;
  };
}

export const atlasWorkspace: WorkspaceConfig = {
  id: "atlas",
  name: "Atlas",
  shortName: "Atlas",
  description: "Aandacht, werkelijkheid, begrip en bevestigde kennis.",
  homeHref: "/atlas",
  mark: "A",
  navigation: [
    { id: "overzicht", label: "Vandaag", href: "/atlas#overzicht", description: "Focus en bewuste stilte voor vandaag." },
    { id: "werkelijkheid", label: "Werkelijkheid", href: "/atlas#werkelijkheid", description: "Bevestigde werkelijkheid, observaties en praktijkbronnen." },
    { id: "daily-horizon", label: "Horizon", href: "/atlas#daily-horizon", description: "Wat bewust op afstand blijft." },
    { id: "werkruimte", label: "Werkruimte", href: "/atlas#werkruimte", description: "Cases, Understanding, kennisvoorstellen, ideeën en logboek." },
  ],
  secondaryNavigation: [
    { id: "fundament", label: "Fundament", href: "/atlas/fundament", description: "De secundaire ingang naar de onderbouwing van Atlas." },
  ],
  footerLink: {
    label: "Publieke website",
    href: "/",
  },
};

export const wbdWorkspace: WorkspaceConfig = {
  id: "wbd",
  name: "We Build And Design",
  shortName: "WBD",
  description: "De dagelijkse werkplek voor organisaties, projecten, documenten en communicatie.",
  homeHref: WBD_WORKSPACE_HOME,
  mark: "W",
  navigation: [
    { id: "overzicht", label: "Overzicht", href: "/workspace/wbd/overzicht", description: "De rustige ingang naar het dagelijkse werk." },
    { id: "organisaties", label: "Organisaties", href: "/workspace/wbd/organisaties", description: "Dossiers voor organisaties en hun gezamenlijke geschiedenis." },
    { id: "projecten", label: "Projecten", href: "/workspace/wbd/projecten", description: "Afgerond, actief en hierna in één heldere volgorde." },
    { id: "ontwikkelpartners", label: "Ontwikkelpartners", href: "/workspace/wbd/ontwikkelpartners", description: "Organisaties die ontwikkeling in de praktijk valideren." },
    { id: "ontwikkeling", label: "Ontwikkeling", href: "/workspace/wbd/ontwikkeling/monitor", description: "Monitor, historie en feedback uit de praktijk." },
    { id: "business-foundation", label: "Business Foundation", href: "/workspace/wbd/business-foundation", description: "Financiën, bedrijfsgegevens en herbruikbare templates." },
    { id: "infrastructuur", label: "Infrastructuur", href: "/workspace/wbd/infrastructuur", description: "Voorbereiding op de toekomstige online basis." },
    { id: "kennisvoorstellen", label: "Kennisvoorstellen", href: "/workspace/wbd/kennisvoorstellen", description: "Nieuwe inzichten wachten hier op menselijke beoordeling." },
  ],
  mobileNavigation: [
    { id: "overzicht", label: "Home", href: "/workspace/wbd/overzicht", description: "De rustige ingang naar het dagelijkse werk." },
    { id: "organisaties", label: "Organisaties", href: "/workspace/wbd/organisaties", description: "Dossiers per organisatie." },
    { id: "projecten", label: "Projecten", href: "/workspace/wbd/projecten", description: "De actuele projectvolgorde." },
    { id: "business-foundation", label: "Financiën", href: "/workspace/wbd/business-foundation/finance", description: "Financiële continuïteit." },
  ],
  mobileMoreNavigation: [
    { id: "ontwikkelpartners", label: "Ontwikkelpartners", href: "/workspace/wbd/ontwikkelpartners", description: "Praktijkvalidatie met organisaties." },
    { id: "ontwikkeling", label: "Ontwikkeling", href: "/workspace/wbd/ontwikkeling/monitor", description: "Monitor, historie en feedback." },
    { id: "infrastructuur", label: "Infrastructuur", href: "/workspace/wbd/infrastructuur", description: "De toekomstige online basis." },
    { id: "kennisvoorstellen", label: "Atlas & kennis", href: "/workspace/wbd/kennisvoorstellen", description: "Menselijke kennisreview." },
  ],
  poweredBy: "Atlas",
};

export const experienceWorkspace: WorkspaceConfig = {
  id: "experience",
  name: "Experience",
  shortName: "Experience",
  description: "Overzicht van Experiences, sessies, antwoorden en menselijke review.",
  homeHref: "/workspace/experience",
  brandIsInteractive: false,
  mark: "W",
  navigation: [
    { id: "overzicht", label: "Overzicht", href: "/workspace/experience", description: "Toegangen, sessies en menselijke opvolging." },
  ],
  secondaryNavigation: [
    { id: "observatory", label: "Observatory", href: "/observatory", description: "Onderzoek, historie en specialistische review." },
  ],
  poweredBy: "We Build And Design",
};

export const workspaces = [atlasWorkspace, wbdWorkspace, experienceWorkspace] as const;

const atlasRealityHashes = new Set(["#werkelijkheid", "#observatie-review", "#praktijkdossiers", "#waarnemen"]);
const atlasWorkroomHashes = new Set(["#werkruimte", "#cases", "#case-wbd", "#case-aquaflask", "#understanding", "#ideeen", "#logboek"]);

export function getAtlasNavigationItem(pathname: string, hash = ""): WorkspaceNavigationItem {
  const normalizedPath = pathname.replace(/\/+$/, "") || atlasWorkspace.homeHref;
  if (normalizedPath === "/atlas/fundament") return atlasWorkspace.secondaryNavigation![0];
  if (hash === "#daily-horizon") return atlasWorkspace.navigation[2];
  if (atlasRealityHashes.has(hash)) return atlasWorkspace.navigation[1];
  if (atlasWorkroomHashes.has(hash)) return atlasWorkspace.navigation[3];
  return atlasWorkspace.navigation[0];
}

export function getWbdNavigationItem(pathname: string): WorkspaceNavigationItem | undefined {
  const resolved = resolveWbdWorkspaceRoute(pathname);
  if (resolved.status !== "matched" || !resolved.definition?.navigationId) return undefined;
  return wbdWorkspace.navigation.find((item) => item.id === resolved.definition?.navigationId);
}
