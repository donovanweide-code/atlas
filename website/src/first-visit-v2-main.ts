import "./styles/experience-workspace.css";
import "./styles/first-visit-v2.css";
import snapshotText from "../context-first-sources/webuildanddesign.nl.snapshot.json?raw";
import { createFirstVisitRuntime, type FirstVisitInput } from "./atlas-first-visit.ts";
import { normalizeOrganizationUrl, type ContextSnapshot } from "./atlas-context-first-experiment.ts";
import { experienceApi, ExperienceApiError } from "./experience-validation-api.ts";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("First Visit V2 root ontbreekt.");
const app: HTMLDivElement = appRoot;
const snapshot = JSON.parse(snapshotText) as ContextSnapshot;
const storageKey = "wbd_first_visit_v2_draft";
if (new URLSearchParams(window.location.search).get("harness") === "mobile") {
  document.documentElement.classList.add("first-visit-mobile-preview");
}

interface FirstVisitDraft extends FirstVisitInput {
  step: 1 | 2 | 3 | 4;
}

function loadDraft(): FirstVisitDraft {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "null") as Partial<FirstVisitDraft> | null;
    return {
      step: value?.step === 2 || value?.step === 3 || value?.step === 4 ? value.step : 1,
      industry: typeof value?.industry === "string" ? value.industry : "",
      organizationName: typeof value?.organizationName === "string" ? value.organizationName : "",
      websiteUrl: typeof value?.websiteUrl === "string" ? value.websiteUrl : "",
    };
  } catch {
    return { step: 1, industry: "", organizationName: "", websiteUrl: "" };
  }
}

let draft = loadDraft();

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function brand(): string {
  return `<header class="experience-brand" aria-label="We Build And Design">
    <span class="experience-brand__mark" aria-hidden="true"><span>W</span><i></i><span>BD</span></span>
    <span class="experience-brand__name">We Build And Design</span>
  </header>`;
}

function frame(content: string): string {
  return `<main class="experience-workspace first-visit">${brand()}${content}<footer class="experience-footer"><a href="/privacy">Hoe we met je woorden omgaan</a></footer></main>`;
}

function persist(): void {
  localStorage.setItem(storageKey, JSON.stringify(draft));
}

function go(step: FirstVisitDraft["step"], push = true): void {
  draft.step = step;
  persist();
  if (push) window.history.pushState({ firstVisitStep: step }, "", window.location.href);
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fieldForm(options: { kicker: string; line: string; question: string; label: string; name: "industry" | "organizationName"; value: string; autocomplete?: string }): string {
  return frame(`<section class="experience-question first-visit__question" data-testid="first-visit-step-${draft.step}">
    <p class="experience-kicker">${escapeHtml(options.kicker)}</p>
    <p class="first-visit__line">${escapeHtml(options.line)}</p>
    <h1>${escapeHtml(options.question)}</h1>
    <form data-form="first-visit-field">
      <label class="experience-answer-label" for="first-visit-input">${escapeHtml(options.label)}</label>
      <input id="first-visit-input" data-testid="first-visit-input" name="${options.name}" value="${escapeHtml(options.value)}" maxlength="180"${options.autocomplete ? ` autocomplete="${options.autocomplete}"` : ""} required>
      <button class="experience-button" type="submit">Verder</button>
    </form>
  </section>`);
}

function renderWebsite(): string {
  return frame(`<section class="experience-question first-visit__question" data-testid="first-visit-step-3">
    <p class="experience-kicker">Een eerste venster · optioneel</p>
    <p class="first-visit__line">Een website laat iets zien van hoe een organisatie zich naar buiten presenteert. Niet hoe alles intern werkelijk gaat.</p>
    <h1>Hebben jullie een website? Dan kijk ik daar graag eerst kort naar.</h1>
    <form data-form="first-visit-website">
      <label class="experience-answer-label" for="first-visit-website">Website (optioneel)</label>
      <input id="first-visit-website" data-testid="first-visit-website" name="websiteUrl" inputmode="url" autocomplete="url" placeholder="www.organisatie.nl" value="${escapeHtml(draft.websiteUrl ?? "")}" maxlength="240">
      <button class="experience-button" type="submit">Vorm een eerste beeld</button>
      <button class="experience-text-action" data-action="skip-website" type="button">We hebben geen website</button>
    </form>
    <p class="experience-decline">Geen website of nog niet leesbaar? Dan gaan we gewoon verder vanuit branche en organisatie.</p>
  </section>`);
}

function renderPicture(): string {
  const seed = createFirstVisitRuntime("first-visit-preview", "participant-preview", draft, snapshot, new Date().toISOString());
  const publicFacts = seed.context.contacts.filter(({ sourceStatus }) => sourceStatus === "public-observation");
  const sourceAvailable = seed.context.sourceAvailability === "controlled-public-source";
  return frame(`<section class="experience-question first-visit__picture" data-testid="first-visit-picture">
    <p class="experience-kicker">Dit is mijn eerste beeld, nog geen conclusie.</p>
    <h1>We kijken naar ${escapeHtml(draft.organizationName)} binnen ${escapeHtml(draft.industry)}.</h1>
    ${sourceAvailable
      ? `<p>Via de website zie ik voorlopig: ${escapeHtml((publicFacts[0]?.content ?? "hoe de organisatie zich publiek presenteert").replace(/[.?!]+$/, ""))}.</p>`
      : `<p data-testid="website-boundary">Ik heb nog geen gecontroleerd beeld van de website. Dat houdt ons niet tegen.</p>`}
    <p>${escapeHtml(seed.context.contacts.find(({ sourceStatus }) => sourceStatus === "unknown")?.content ?? "Hoe dit intern werkt, weet ik nog niet.")}</p>
    <div class="first-visit__question-preview">
      <p>Daarom begin ik hier.</p>
      <h2 data-testid="first-visit-first-question">${escapeHtml(seed.decision.question ?? "")}</h2>
    </div>
    <button class="experience-button" data-action="start-first-visit" type="button">Begin bij deze vraag</button>
    <button class="experience-text-action" data-action="back-to-website" type="button">Pas het eerste beeld aan</button>
    <p class="experience-status" data-testid="first-visit-status" hidden></p>
  </section>`);
}

function render(): void {
  document.documentElement.classList.add("experience-mode");
  if (draft.step === 1) {
    app.innerHTML = fieldForm({ kicker: "Eerst de wereld waarin we binnenkomen", line: "Dit geeft richting zonder al iets over de organisatie te besluiten.", question: "In welke branche werken we vandaag?", label: "Branche", name: "industry", value: draft.industry });
  } else if (draft.step === 2) {
    app.innerHTML = fieldForm({ kicker: "Nu weten we vanuit welke wereld we kijken", line: `Binnen ${draft.industry} kijken we vandaag naar één organisatie.`, question: "Voor welke organisatie kijken we vandaag?", label: "Naam van de organisatie", name: "organizationName", value: draft.organizationName, autocomplete: "organization" });
  } else if (draft.step === 3) {
    app.innerHTML = renderWebsite();
  } else {
    app.innerHTML = renderPicture();
  }
  attach();
}

function showStatus(message: string): void {
  const status = app.querySelector<HTMLElement>("[data-testid='first-visit-status']");
  if (!status) return;
  status.hidden = false;
  status.textContent = message;
  status.setAttribute("role", "alert");
}

function attach(): void {
  const field = app.querySelector<HTMLFormElement>("[data-form='first-visit-field']");
  const fieldInput = field?.querySelector<HTMLInputElement>("[data-testid='first-visit-input']");
  fieldInput?.addEventListener("input", () => {
    if (draft.step === 1) draft.industry = fieldInput.value;
    if (draft.step === 2) draft.organizationName = fieldInput.value;
    persist();
  });
  field?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(field);
    if (draft.step === 1) draft.industry = String(data.get("industry") ?? "").trim();
    if (draft.step === 2) draft.organizationName = String(data.get("organizationName") ?? "").trim();
    if (draft.step === 1 && draft.industry) go(2);
    else if (draft.step === 2 && draft.organizationName) go(3);
  });
  const website = app.querySelector<HTMLFormElement>("[data-form='first-visit-website']");
  const websiteInput = website?.querySelector<HTMLInputElement>("[data-testid='first-visit-website']");
  websiteInput?.addEventListener("input", () => {
    draft.websiteUrl = websiteInput.value;
    persist();
  });
  website?.addEventListener("submit", (event) => {
    event.preventDefault();
    draft.websiteUrl = String(new FormData(website).get("websiteUrl") ?? "").trim();
    go(4);
  });
  app.querySelector<HTMLButtonElement>("[data-action='skip-website']")?.addEventListener("click", () => {
    draft.websiteUrl = "";
    go(4);
  });
  app.querySelector<HTMLButtonElement>("[data-action='back-to-website']")?.addEventListener("click", () => go(3));
  app.querySelector<HTMLButtonElement>("[data-action='start-first-visit']")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    try {
      const result = await experienceApi.createFirstVisit({
        industry: draft.industry,
        organizationName: draft.organizationName,
        websiteUrl: normalizeOrganizationUrl(draft.websiteUrl ?? "") ?? draft.websiteUrl,
      });
      localStorage.removeItem(storageKey);
      window.location.assign(`/e/#token=${encodeURIComponent(result.token)}`);
    } catch (error) {
      showStatus(error instanceof ExperienceApiError ? error.message : "De veilige verbinding kon het onderzoek niet starten. Probeer het rustig opnieuw.");
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  });
}

window.addEventListener("popstate", (event) => {
  const step = Number(event.state?.firstVisitStep);
  if (step >= 1 && step <= 4) draft.step = step as FirstVisitDraft["step"];
  else draft.step = Math.max(1, draft.step - 1) as FirstVisitDraft["step"];
  persist();
  render();
});

window.history.replaceState({ firstVisitStep: draft.step }, "", window.location.href);
render();
