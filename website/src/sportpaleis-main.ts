import "./styles/workspace-base.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Sportpaleis Workspace root ontbreekt.");

const publicProposalRoute = location.pathname.match(/(?:^\/voorstel\/|\/workspace\/sportpaleis\/voorstel\/)([^/]+)$/u);
if (publicProposalRoute) {
  void import("./sportpaleis-proposal-public")
    .then(({ mountSportpaleisProposalPublic }) => mountSportpaleisProposalPublic(app, decodeURIComponent(publicProposalRoute[1])))
    .catch(() => { app.innerHTML = '<main class="tk-public-state"><h1>Voorstel tijdelijk niet beschikbaar</h1><p>Probeer het later opnieuw of neem contact op met Sportpaleis.</p></main>'; });
} else {
  void import("./sportpaleis-workspace")
    .then(({ mountSportpaleisWorkspaceApplication }) => mountSportpaleisWorkspaceApplication(app))
    .catch(() => import("./sportpaleis-workspace").then(({ renderSportpaleisWorkspaceError }) => renderSportpaleisWorkspaceError(app)));
}
