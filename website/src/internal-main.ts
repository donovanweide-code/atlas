import "./styles/main.css";
import "./styles/atlas-expedition.css";
import "./styles/public-pages.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
const route = window.location.pathname.replace(/\/+$/, "") || "/";

if (route === "/atlas") {
  void import("./atlas-workspace").then(({ renderAtlasWorkspace }) =>
    renderAtlasWorkspace(app),
  );
} else if (route === "/atlas-lab") {
  void import("./atlas-lab").then(({ renderAtlasLab }) => renderAtlasLab(app));
} else {
  app.innerHTML = `
    <main>
      <h1>Interne route niet gevonden</h1>
      <p>Open de Atlas Workspace via <a href="/atlas">/atlas</a>.</p>
    </main>`;
}
