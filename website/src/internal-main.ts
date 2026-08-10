import "./styles/main.css";
import "./styles/atlas-expedition.css";
import "./styles/public-pages.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
const route = window.location.pathname.replace(/\/+$/, "") || "/";

if (route === "/experience") {
  window.location.replace("/workspace/experience");
} else if (route === "/workspace/experience" || route.startsWith("/workspace/experience/")) {
  void import("./experience-admin-workspace").then(({ renderExperienceAdminWorkspace }) =>
    renderExperienceAdminWorkspace(app),
  );
} else if (route === "/atlas" || route === "/atlas/fundament") {
  void import("./atlas-workspace").then(({ renderAtlasWorkspace }) =>
    renderAtlasWorkspace(app),
  );
} else if (route === "/workspace/wbd" || route.startsWith("/workspace/wbd/")) {
  void import("./wbd-workspace")
    .then(({ mountWbdWorkspaceApplication }) => mountWbdWorkspaceApplication(app))
    .catch(() => {
      document.title = "Workspace tijdelijk niet beschikbaar — WBD Workspace";
      app.innerHTML = `<main><h1>Workspace tijdelijk niet beschikbaar</h1><p>De applicatie kon niet veilig worden gestart.</p><p><a href="/workspace/wbd/overzicht">Terug naar Home</a></p></main>`;
    });
} else if (route === "/workspace/sportpaleis" || route.startsWith("/workspace/sportpaleis/")) {
  void import("./sportpaleis-workspace")
    .then(({ mountSportpaleisWorkspaceApplication }) => mountSportpaleisWorkspaceApplication(app))
    .catch(() => {
      document.title = "Workspace tijdelijk niet beschikbaar — Sportpaleis";
      app.innerHTML = `<main><h1>Workspace tijdelijk niet beschikbaar</h1><p>Gebruik de bestaande productieroute.</p><p><a href="/workspace/sportpaleis/overzicht">Terug naar het overzicht</a></p></main>`;
    });
} else if (route === "/atlas-lab") {
  void import("./atlas-lab").then(({ renderAtlasLab }) => renderAtlasLab(app));
} else if (route === "/sportpaleis-proof") {
  void import("./sportpaleis-proof").then(({ renderSportpaleisProof }) =>
    renderSportpaleisProof(app),
  );
} else {
  app.innerHTML = `
    <main>
      <h1>Interne route niet gevonden</h1>
      <p>Open de Atlas Workspace via <a href="/atlas">/atlas</a>.</p>
    </main>`;
}
