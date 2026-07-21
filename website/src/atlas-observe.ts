import "./styles/atlas-observe.css";
import {
  getBoundary,
  loadObservingContext,
  saveObservation,
  type ObservationBoundaryId,
} from "./atlas-observations";

const pageContext = new Map([
  ["/", { id: "public.home", label: "Homepage" }],
  ["/projecten", { id: "public.projects", label: "Projecten" }],
  ["/contact", { id: "public.contact", label: "Contact" }],
]);

function visibleArea(element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const width = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
  const height = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
  return width * height;
}

function detectedBoundary(elements: HTMLElement[]): ObservationBoundaryId {
  return elements
    .map((element) => ({
      id: element.dataset.atlasObservation as ObservationBoundaryId,
      area: visibleArea(element),
      distance: Math.abs(element.getBoundingClientRect().top),
    }))
    .sort((a, b) => b.area - a.area || a.distance - b.distance)[0].id;
}

function formatMoment(date: Date): string {
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function mountObservationCapture(): void {
  const observingContext = loadObservingContext(localStorage);
  if (!observingContext || document.querySelector("[data-atlas-observe-root]")) return;

  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const page = pageContext.get(path);
  const boundaryElements = Array.from(
    document.querySelectorAll<HTMLElement>("[data-atlas-observation]"),
  ).filter((element) => getBoundary(element.dataset.atlasObservation ?? ""));
  if (!page || boundaryElements.length === 0) return;

  const root = document.createElement("div");
  root.className = "atlas-observe";
  root.dataset.atlasObserveRoot = "";
  root.innerHTML = `
    <button class="atlas-observe__trigger" type="button" aria-expanded="false" aria-controls="atlas-observe-panel">
      <span aria-hidden="true"></span>Waarnemen
    </button>
    <section class="atlas-observe__panel" id="atlas-observe-panel" aria-labelledby="atlas-observe-title" hidden>
      <header>
        <div><p>Waarnemen</p><h2 id="atlas-observe-title">Wat zie of ervaar je?</h2></div>
        <button type="button" data-observe-close aria-label="Sluit Waarnemen">Sluiten</button>
      </header>
      <p class="atlas-observe__support">Beschrijf de waarneming. De betekenis volgt later.</p>
      <form data-observe-form>
        <label class="atlas-observe__text"><span class="sr-only">Waarneming</span><textarea name="text" rows="4" maxlength="1200" required></textarea></label>
        <section class="atlas-observe__context" aria-labelledby="atlas-observe-context-title">
          <div class="atlas-observe__context-heading">
            <div><p>Atlas herkent</p><h3 id="atlas-observe-context-title">Bevestig deze context</h3></div>
            <span data-observe-moment></span>
          </div>
          <dl>
            <div><dt>Pagina</dt><dd data-observe-page></dd></div>
            <div><dt>Ervaringsgrens</dt><dd><select name="boundary" aria-label="Betekenisvolle ervaringsgrens"></select></dd></div>
            <div><dt>Case</dt><dd>0001 · We Build And Design</dd></div>
            <div><dt>Sprint</dt><dd data-observe-sprint></dd></div>
            <div><dt>Viewport</dt><dd data-observe-viewport></dd></div>
          </dl>
        </section>
        <button class="atlas-observe__save" type="submit">Bevestig context en bewaar waarneming</button>
        <p class="atlas-observe__confirmation" data-observe-confirmation role="status" aria-live="polite"></p>
      </form>
    </section>`;

  document.body.append(root);
  const trigger = root.querySelector<HTMLButtonElement>(".atlas-observe__trigger")!;
  const panel = root.querySelector<HTMLElement>(".atlas-observe__panel")!;
  const closeButton = root.querySelector<HTMLButtonElement>("[data-observe-close]")!;
  const form = root.querySelector<HTMLFormElement>("[data-observe-form]")!;
  const textField = form.elements.namedItem("text") as HTMLTextAreaElement;
  const boundarySelect = form.elements.namedItem("boundary") as HTMLSelectElement;
  const confirmation = root.querySelector<HTMLElement>("[data-observe-confirmation]")!;

  boundaryElements.forEach((element) => {
    const boundary = getBoundary(element.dataset.atlasObservation ?? "");
    if (!boundary || boundarySelect.querySelector(`[value="${boundary.id}"]`)) return;
    const option = document.createElement("option");
    option.value = boundary.id;
    option.textContent = boundary.label;
    boundarySelect.append(option);
  });

  root.querySelector<HTMLElement>("[data-observe-page]")!.textContent = page.label;
  root.querySelector<HTMLElement>("[data-observe-sprint]")!.textContent = observingContext.sprintId;

  const refreshContext = () => {
    boundarySelect.value = detectedBoundary(boundaryElements);
    root.querySelector<HTMLElement>("[data-observe-moment]")!.textContent = formatMoment(new Date());
    root.querySelector<HTMLElement>("[data-observe-viewport]")!.textContent = `${window.innerWidth} × ${window.innerHeight} px`;
  };

  const closePanel = () => {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  };

  trigger.addEventListener("click", () => {
    refreshContext();
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    confirmation.textContent = "";
    textField.focus();
  });
  closeButton.addEventListener("click", closePanel);
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const boundary = getBoundary(boundarySelect.value);
    if (!boundary || !textField.value.trim()) {
      textField.setCustomValidity("Beschrijf eerst wat je ziet of ervaart.");
      textField.reportValidity();
      return;
    }
    textField.setCustomValidity("");
    const saved = saveObservation(localStorage, {
      text: textField.value,
      context: {
        surface: "public",
        path,
        hash: boundary.hash,
        pageId: page.id,
        pageLabel: page.label,
        boundaryId: boundary.id,
        boundaryLabel: boundary.label,
        caseId: "0001",
        sprintId: observingContext.sprintId,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      },
    });
    if (!saved) {
      confirmation.textContent = "Waarneming kon niet lokaal worden bewaard.";
      return;
    }
    form.reset();
    boundarySelect.value = boundary.id;
    confirmation.textContent = "Waarneming bewaard · nog niet beoordeeld";
    textField.focus();
  });

  textField.addEventListener("input", () => textField.setCustomValidity(""));
}
