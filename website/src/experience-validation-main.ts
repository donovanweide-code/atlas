import "./styles/experience-workspace.css";
import "./styles/experience-observatory.css";
import { canonicalExperiencePath, isCanonicalExperiencePath, normalizeExperiencePath } from "./experience-entry";
import { experienceApi } from "./experience-validation-api";
import { renderExperienceObservatory } from "./experience-observatory";
import { renderExperiencePrivacy } from "./experience-privacy";
import { renderExperienceWorkspace } from "./experience-workspace";

const app = document.querySelector<HTMLDivElement>("#app")!;
const path = normalizeExperiencePath(window.location.pathname);

function setCanonical(pathname: string): void {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (canonical) canonical.href = `https://experience.webuildanddesign.nl${pathname}/`;
}

async function renderCanonicalExperience(): Promise<void> {
  try {
    await experienceApi.organicState();
    await renderExperienceWorkspace(app);
  } catch {
    await import("./first-visit-v2-main");
  }
}

if (path === "/workspace/experience" || path.startsWith("/workspace/experience/")) {
  void import("./experience-admin-workspace").then(({ renderExperienceAdminWorkspace }) =>
    renderExperienceAdminWorkspace(app),
  );
} else if (path === "/privacy") {
  renderExperiencePrivacy(app);
} else if (path === "/observatory" || path.startsWith("/observatory/")) {
  void renderExperienceObservatory(app);
} else if (isCanonicalExperiencePath(path)) {
  setCanonical(canonicalExperiencePath);
  void renderCanonicalExperience();
} else {
  void renderExperienceWorkspace(app);
}
