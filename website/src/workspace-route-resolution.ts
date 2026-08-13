export type WorkspaceApplication = "wbd" | "sportpaleis";

const SPORTPALEIS_HOST = "workspace.sportpaleis.nl";
const SPORTPALEIS_BOUNDARY = "/workspace/sportpaleis";

export function resolveWorkspaceApplication(location: { hostname: string; pathname: string }): WorkspaceApplication {
  const hostname = location.hostname.trim().toLocaleLowerCase("en-US");
  const pathname = location.pathname.replace(/\/+$/, "") || "/";

  if (hostname === SPORTPALEIS_HOST) return "sportpaleis";
  if (pathname === SPORTPALEIS_BOUNDARY || pathname.startsWith(`${SPORTPALEIS_BOUNDARY}/`)) return "sportpaleis";
  return "wbd";
}
