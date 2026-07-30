import "./styles/sportpaleis-proof.css";
import sportpaleisLogo from "./assets/images/sportpaleis/sportpaleis-logo.svg";
import shirtHome from "./assets/images/sportpaleis/asc-shirt-home.webp";
import shirtAway from "./assets/images/sportpaleis/asc-shirt-away.webp";
import matchShorts from "./assets/images/sportpaleis/asc-match-shorts.webp";
import socks from "./assets/images/sportpaleis/asc-socks.webp";
import polo from "./assets/images/sportpaleis/asc-polo.webp";
import reserveShirt from "./assets/images/sportpaleis/asc-reserve-shirt.webp";
import trainingShirt from "./assets/images/sportpaleis/asc-training-shirt.webp";
import fullZipJacket from "./assets/images/sportpaleis/asc-full-zip-jacket.webp";
import zipTop from "./assets/images/sportpaleis/asc-zip-top.webp";
import trainingPants from "./assets/images/sportpaleis/asc-training-pants.webp";

interface CatalogArticle {
  id: string;
  articleNumber: string;
  name: string;
  image: string;
  category: "Wedstrijd" | "Training" | "Presentatie" | "Accessoire";
  supports: readonly ("initials" | "backNumber" | "shortsNumber")[];
}

interface SelectedArticle {
  articleId: string;
  quantity: number;
  size?: string;
  backNumberOverride?: string;
}

const catalog: readonly CatalogArticle[] = [
  { id: "home-shirt", articleNumber: "ASC-1001", name: "Wedstrijdshirt thuis", image: shirtHome, category: "Wedstrijd", supports: ["initials", "backNumber"] },
  { id: "home-shorts", articleNumber: "ASC-1002", name: "Wedstrijdshort thuis", image: matchShorts, category: "Wedstrijd", supports: ["initials", "shortsNumber"] },
  { id: "socks", articleNumber: "ASC-1003", name: "Wedstrijdkousen", image: socks, category: "Wedstrijd", supports: [] },
  { id: "polo", articleNumber: "ASC-1004", name: "Presentatiepolo", image: polo, category: "Presentatie", supports: ["initials"] },
  { id: "training-pants", articleNumber: "ASC-1009", name: "Trainingsbroek", image: trainingPants, category: "Training", supports: ["initials"] },
  { id: "away-shirt", articleNumber: "ASC-1010", name: "Wedstrijdshirt uit", image: shirtAway, category: "Wedstrijd", supports: ["initials", "backNumber"] },
  { id: "keeper-shirt", articleNumber: "ASC-1011", name: "Keeperstrui", image: reserveShirt, category: "Wedstrijd", supports: ["initials", "backNumber"] },
  { id: "training-shirt", articleNumber: "ASC-1012", name: "Inloopshirt", image: trainingShirt, category: "Training", supports: ["initials"] },
  { id: "training-jacket", articleNumber: "ASC-1005", name: "Trainingsjack", image: fullZipJacket, category: "Training", supports: ["initials"] },
  { id: "hoodie", articleNumber: "ASC-1006", name: "Hoodie", image: zipTop, category: "Presentatie", supports: ["initials"] },
  { id: "training-set-top", articleNumber: "ASC-1007", name: "Trainingspak top", image: polo, category: "Training", supports: ["initials"] },
  { id: "training-set-pants", articleNumber: "ASC-1008", name: "Trainingspak broek", image: trainingPants, category: "Training", supports: ["initials"] },
  { id: "sports-bag", articleNumber: "ASC-1013", name: "Sporttas", image: fullZipJacket, category: "Accessoire", supports: ["initials"] },
  { id: "backpack", articleNumber: "ASC-1014", name: "Rugtas", image: zipTop, category: "Accessoire", supports: ["initials"] },
  { id: "cap", articleNumber: "ASC-1015", name: "Clubcap", image: reserveShirt, category: "Accessoire", supports: [] },
  { id: "bottle", articleNumber: "ASC-1016", name: "Bidon", image: socks, category: "Accessoire", supports: [] },
];

const associations = [
  "A.S.C. Waterwijk",
  "Almere City FC",
  "Buitenhout MHC",
  "FC Almere",
  "Forza Almere",
  "Hockeyclub Almere",
  "S.V. Almere",
  "SC Buitenboys",
  "Sporting Almere",
  "SV Batavia '90",
  "VV AS '80",
  "Waterwijk Basketbal",
] as const;

const initialSelection: readonly SelectedArticle[] = [
  { articleId: "home-shirt", quantity: 1 },
  { articleId: "home-shorts", quantity: 1 },
  { articleId: "socks", quantity: 2 },
  { articleId: "polo", quantity: 1 },
  { articleId: "training-pants", quantity: 1 },
  { articleId: "away-shirt", quantity: 1 },
  { articleId: "keeper-shirt", quantity: 1, backNumberOverride: "14" },
  { articleId: "training-shirt", quantity: 2 },
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getArticle(id: string): CatalogArticle {
  return catalog.find((article) => article.id === id)!;
}

export function renderSportpaleisProof(app: HTMLDivElement): void {
  document.documentElement.classList.add("sportpaleis-proof-mode");
  document.title = "Winkelorder SP-2026-0104 — Sportpaleis";

  let selected: SelectedArticle[] = initialSelection.map((item) => ({ ...item }));
  let searchTerm = "";
  let category = "Alle";
  let initials = "DW";
  let backNumber = "10";
  let shortsNumber = "10";

  const renderCatalog = (): string => {
    const visibleArticles = catalog.filter((article) => {
      const matchesSearch = `${article.name} ${article.articleNumber}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      return matchesSearch && (category === "Alle" || article.category === category);
    });

    return visibleArticles.map((article) => {
      const selectedItem = selected.find(({ articleId }) => articleId === article.id);
      return `
        <button class="catalog-card${selectedItem ? " is-selected" : ""}" type="button" data-select-article="${article.id}" aria-pressed="${Boolean(selectedItem)}">
          <span class="catalog-card__check">${selectedItem ? "✓" : ""}</span>
          <span class="catalog-card__image"><img src="${article.image}" alt="" /></span>
          <strong>${escapeHtml(article.name)}</strong>
          <small>${article.articleNumber}</small>
          ${selectedItem ? `<i>${selectedItem.quantity}×</i>` : ""}
        </button>
      `;
    }).join("");
  };

  const applicablePrint = (article: CatalogArticle, item: SelectedArticle): string => {
    const values: string[] = [];
    if (article.supports.includes("initials")) values.push(initials);
    if (article.supports.includes("backNumber")) {
      values.push(`Rug ${item.backNumberOverride ?? backNumber}`);
    }
    if (article.supports.includes("shortsNumber")) values.push(`Short ${shortsNumber}`);
    return values.length
      ? values.map((value) => `<span>${escapeHtml(value)}</span>`).join("")
      : "<span>Geen bedrukking</span>";
  };

  const renderSelected = (): string => selected.map((item) => {
    const article = getArticle(item.articleId);
    const hasDeviation = Boolean(item.backNumberOverride);
    return `
      <article class="selected-row${hasDeviation ? " has-deviation" : ""}" data-selected-row="${article.id}">
        <img src="${article.image}" alt="" />
        <div class="selected-row__identity">
          <strong>${escapeHtml(article.name)}</strong>
          <div class="selected-row__print">${applicablePrint(article, item)}</div>
        </div>
        <div class="quantity-control" aria-label="Aantal ${escapeHtml(article.name)}">
          <button type="button" data-quantity="${article.id}" data-delta="-1" aria-label="Aantal verlagen">−</button>
          <span>${item.quantity}×</span>
          <button type="button" data-quantity="${article.id}" data-delta="1" aria-label="Aantal verhogen">+</button>
        </div>
        <button class="selected-row__status" type="button" data-override="${article.id}">
          ${hasDeviation ? '<i>!</i><span>Afwijking<small>Rugnummer 14</small></span>' : '<i>✓</i><span>Standaard</span>'}
        </button>
        <button class="selected-row__details" type="button" data-details="${article.id}" aria-expanded="false" aria-label="Details voor ${escapeHtml(article.name)}">•••</button>
        <div class="selected-row__options" hidden>
          <label>Maat (optioneel)<select data-size="${article.id}"><option value="">Niet opgegeven</option><option${item.size === "S" ? " selected" : ""}>S</option><option${item.size === "M" ? " selected" : ""}>M</option><option${item.size === "L" ? " selected" : ""}>L</option></select></label>
          <button type="button" data-remove="${article.id}">Verwijder uit order</button>
        </div>
      </article>
    `;
  }).join("");

  const renderSummary = (): void => {
    const selectedRoot = app.querySelector<HTMLElement>("[data-selected-list]")!;
    selectedRoot.innerHTML = renderSelected();
    for (const count of app.querySelectorAll<HTMLElement>("[data-selected-count]")) {
      count.textContent = String(selected.length);
    }
    app.querySelector<HTMLElement>("[data-total-quantity]")!.textContent = String(
      selected.reduce((total, item) => total + item.quantity, 0),
    );
    app.querySelector<HTMLElement>("[data-catalog-grid]")!.innerHTML = renderCatalog();
  };

  app.innerHTML = `
    <main class="order-entry-demo">
      <aside class="demo-sidebar">
        <div class="demo-sidebar__brand"><img src="${sportpaleisLogo}" alt="Sportpaleis" /><span>Productiewerkplek</span></div>
        <div class="demo-sidebar__label"><p>Verenigingen</p><span>${associations.length}</span></div>
        <nav aria-label="Verenigingen — demonstratie">
          ${associations.map((association, index) => `<div class="${index === 0 ? "is-current" : ""}"><span>${escapeHtml(association.slice(0, 2).toUpperCase())}</span><p>${escapeHtml(association)}</p>${index === 0 ? "<i>8</i>" : ""}</div>`).join("")}
        </nav>
        <div class="demo-sidebar__sections"><span>Orders</span><span>Artikelen</span><span>Instellingen</span></div>
        <p class="demo-sidebar__note">Lokale simulatie<br />Reset volledig na herladen</p>
      </aside>

      <section class="order-entry-main">
        <header class="entry-header">
          <div class="entry-header__identity">
            <div><span>Winkelorder</span><strong>Open</strong></div>
            <h1>SP-2026-0104</h1>
            <p>A.S.C. Waterwijk · winkelorder · directe invoer</p>
          </div>
          <dl class="entry-meta">
            <div><dt>Bron</dt><dd>Winkel</dd></div>
            <div><dt>Extern ordernummer</dt><dd>—</dd></div>
            <div><dt>Klant</dt><dd>Daniël Wouters</dd></div>
            <div><dt>E-mailadres</dt><dd>demo@sportpaleis.test <i>✓</i></dd></div>
            <div><dt>Telefoonnummer</dt><dd>06 0000 0000 <i>✓</i></dd></div>
            <details><summary>Validatievoorbeeld</summary><p><b>Ongeldig:</b> markeer het veld rood en blokkeer later afronden tot correctie. Geen externe verificatie.</p></details>
          </dl>
        </header>

        <section class="print-defaults" aria-labelledby="defaults-title">
          <div><p>Standaardbedrukking voor deze order</p><h2 id="defaults-title">Eén keer invoeren</h2></div>
          <label>Initialen<input data-default="initials" value="${initials}" maxlength="4" /></label>
          <label>Rugnummer<input data-default="backNumber" value="${backNumber}" maxlength="3" /></label>
          <label>Shortnummer<input data-default="shortsNumber" value="${shortsNumber}" maxlength="3" /></label>
          <p><i>✓</i> Deze waarden worden automatisch toegepast op alle geselecteerde artikelen. Alleen afwijkingen pas je per artikel aan.</p>
        </section>

        <div class="entry-workspace">
          <section class="catalog-panel" aria-labelledby="catalog-title">
            <header>
              <div class="step-title"><span>1</span><div><h2 id="catalog-title">Kies artikelen</h2><p>Klik op de artikelen die de klant heeft gekocht.</p></div></div>
              <div class="catalog-tools">
                <label><span class="sr-only">Zoek artikel</span><input type="search" placeholder="Zoek artikel…" data-search /></label>
                <label><span class="sr-only">Categorie</span><select data-category><option>Alle</option><option>Wedstrijd</option><option>Training</option><option>Presentatie</option><option>Accessoire</option></select></label>
              </div>
            </header>
            <div class="catalog-grid" data-catalog-grid>${renderCatalog()}</div>
            <p class="catalog-demo-note">16 beschikbare demo-artikelen · openbare productbeelden worden lokaal hergebruikt waar nog geen apart beeld beschikbaar is.</p>
          </section>

          <aside class="selection-panel" aria-labelledby="selection-title">
            <header>
              <div class="step-title"><span>2</span><div><h2 id="selection-title">Geselecteerde artikelen (<b data-selected-count>${selected.length}</b>)</h2><p>Controleer alleen uitzonderingen.</p></div></div>
              <button type="button" class="finish-demo" data-finish>Order controleren →</button>
            </header>
            <div class="selected-list" data-selected-list>${renderSelected()}</div>
            <div class="selection-totals">
              <div><span>Aantal artikelen</span><strong data-selected-count>${selected.length}</strong></div>
              <div><span>Totaal aantal stuks</span><strong><b data-total-quantity>${selected.reduce((total, item) => total + item.quantity, 0)}</b> stuks</strong></div>
            </div>
            <section class="association-profile">
              <p>Bedrukkingsprofiel van deze vereniging</p>
              <dl>
                <div><dt>Lettertype</dt><dd>Spain</dd></div>
                <div><dt>Initialen / borstnummer</dt><dd>3,5 cm</dd></div>
                <div><dt>Rugnummer</dt><dd>23,5 cm</dd></div>
                <div><dt>Shortnummer</dt><dd>Nog te valideren</dd></div>
              </dl>
            </section>
            <p class="finish-message" data-finish-message hidden>Demonstratie: controle voltooid. Er is niets opgeslagen of verwerkt.</p>
          </aside>
        </div>
      </section>
    </main>
  `;

  app.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const selectButton = target.closest<HTMLButtonElement>("[data-select-article]");
    if (selectButton) {
      const articleId = selectButton.dataset.selectArticle!;
      const existing = selected.findIndex((item) => item.articleId === articleId);
      if (existing >= 0) selected.splice(existing, 1);
      else selected.push({ articleId, quantity: 1 });
      renderSummary();
      return;
    }

    const quantityButton = target.closest<HTMLButtonElement>("[data-quantity]");
    if (quantityButton) {
      const item = selected.find(({ articleId }) => articleId === quantityButton.dataset.quantity);
      if (item) item.quantity = Math.max(1, item.quantity + Number(quantityButton.dataset.delta));
      renderSummary();
      return;
    }

    const overrideButton = target.closest<HTMLButtonElement>("[data-override]");
    if (overrideButton) {
      const item = selected.find(({ articleId }) => articleId === overrideButton.dataset.override);
      const article = item && getArticle(item.articleId);
      if (item && article?.supports.includes("backNumber")) {
        item.backNumberOverride = item.backNumberOverride ? undefined : "14";
        renderSummary();
      }
      return;
    }

    const detailsButton = target.closest<HTMLButtonElement>("[data-details]");
    if (detailsButton) {
      const options = detailsButton.closest(".selected-row")?.querySelector<HTMLElement>(".selected-row__options");
      if (options) {
        options.hidden = !options.hidden;
        detailsButton.setAttribute("aria-expanded", String(!options.hidden));
      }
      return;
    }

    const removeButton = target.closest<HTMLButtonElement>("[data-remove]");
    if (removeButton) {
      selected = selected.filter(({ articleId }) => articleId !== removeButton.dataset.remove);
      renderSummary();
      return;
    }

    if (target.closest("[data-finish]")) {
      app.querySelector<HTMLElement>("[data-finish-message]")!.hidden = false;
    }
  });

  app.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement;
    if (target.matches("[data-search]")) {
      searchTerm = target.value;
      app.querySelector<HTMLElement>("[data-catalog-grid]")!.innerHTML = renderCatalog();
    }
    if (target.dataset.default === "initials") initials = target.value.toUpperCase();
    if (target.dataset.default === "backNumber") backNumber = target.value;
    if (target.dataset.default === "shortsNumber") shortsNumber = target.value;
    if (target.dataset.default) {
      app.querySelector<HTMLElement>("[data-selected-list]")!.innerHTML = renderSelected();
    }
  });

  app.addEventListener("change", (event) => {
    const target = event.target as HTMLSelectElement;
    if (target.matches("[data-category]")) {
      category = target.value;
      app.querySelector<HTMLElement>("[data-catalog-grid]")!.innerHTML = renderCatalog();
    }
    if (target.dataset.size) {
      const item = selected.find(({ articleId }) => articleId === target.dataset.size);
      if (item) item.size = target.value || undefined;
    }
  });
}
