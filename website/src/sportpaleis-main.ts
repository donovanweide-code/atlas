import "./styles/workspace-base.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Sportpaleis Workspace root ontbreekt.");

void import("./sportpaleis-workspace")
  .then(({ mountSportpaleisWorkspaceApplication }) => mountSportpaleisWorkspaceApplication(app))
  .catch(() => import("./sportpaleis-workspace").then(({ renderSportpaleisWorkspaceError }) => renderSportpaleisWorkspaceError(app)));
