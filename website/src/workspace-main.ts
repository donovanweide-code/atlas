import "./styles/workspace-base.css";
import {
  mountWbdWorkspaceApplication,
  renderWorkspaceApplicationError,
} from "./wbd-workspace";
import { resolveWorkspaceApplication } from "./workspace-route-resolution";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Workspace application root ontbreekt.");
}

if (resolveWorkspaceApplication(window.location) === "sportpaleis") {
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
