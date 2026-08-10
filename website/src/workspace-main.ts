import "./styles/workspace-base.css";
import {
  mountWbdWorkspaceApplication,
  renderWorkspaceApplicationError,
} from "./wbd-workspace";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Workspace application root ontbreekt.");
}

const route = window.location.pathname.replace(/\/+$/, "") || "/";

if (route === "/workspace/sportpaleis" || route.startsWith("/workspace/sportpaleis/")) {
  void import("./sportpaleis-workspace")
    .then(({ mountSportpaleisWorkspaceApplication }) => mountSportpaleisWorkspaceApplication(app))
    .catch(() => import("./sportpaleis-workspace").then(({ renderSportpaleisWorkspaceError }) =>
      renderSportpaleisWorkspaceError(app)));
} else {
  try {
    mountWbdWorkspaceApplication(app);
  } catch {
    renderWorkspaceApplicationError(app);
  }
}
