import {
  workspaces,
  type WorkspaceConfig,
  type WorkspaceNavigationItem,
} from "./workspace-config";
import { renderWorkspaceIcon } from "./workspace-icons";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderWorkspaceMark(workspace: WorkspaceConfig, className: string): string {
  if (workspace.id === "wbd" || workspace.id === "experience") {
    return `<span class="${className} ${className}--wbd" aria-hidden="true"><span>W</span><i></i><span>BD</span></span>`;
  }

  return `<span class="${className}" aria-hidden="true">${escapeHtml(workspace.mark)}</span>`;
}

function resolveWorkspaceHref(workspace: WorkspaceConfig): string {
  const { hostname, port } = window.location;
  const local = hostname === "127.0.0.1" || hostname === "localhost";

  if (workspace.id === "experience") {
    if (hostname === "experience.webuildanddesign.nl" || (local && port !== "5173")) return workspace.homeHref;
    if (local) return `http://${hostname}:5180${workspace.homeHref}`;
    return `https://experience.webuildanddesign.nl${workspace.homeHref}`;
  }

  if (hostname === "experience.webuildanddesign.nl") return `https://webuildanddesign.nl${workspace.homeHref}`;
  if (local && port !== "5173") return `http://${hostname}:5173${workspace.homeHref}`;
  return workspace.homeHref;
}

export function renderWorkspaceSwitcher(activeWorkspace: WorkspaceConfig): string {
  const options = workspaces.map((workspace) => `
    <a href="${escapeHtml(resolveWorkspaceHref(workspace))}" ${workspace.id === activeWorkspace.id ? 'aria-current="page"' : ""}>
      ${renderWorkspaceMark(workspace, "workspace-switcher__mark")}
      <span><strong>${escapeHtml(workspace.name)}</strong><small>${escapeHtml(workspace.description)}</small></span>
    </a>`).join("");

  return `<details class="workspace-switcher">
    <summary aria-label="Wissel van Workspace">
      <span class="workspace-switcher__eyebrow">Actieve Workspace</span>
      <strong>${escapeHtml(activeWorkspace.name)}</strong>
      <i aria-hidden="true">⌄</i>
    </summary>
    <div class="workspace-switcher__options">${options}</div>
  </details>`;
}

export function renderWorkspaceSidebar(
  workspace: WorkspaceConfig,
  activeNavigationId: string,
  mobileContext?: {
    label: string;
    backHref?: string;
    backLabel?: string;
  },
): string {
  const renderNavigationItem = (item: WorkspaceNavigationItem) => {
    const attention = item.attentionLabel
      ? `<span class="workspace-nav__attention" aria-label="${escapeHtml(item.attentionLabel)}"><i aria-hidden="true"></i>${escapeHtml(item.attentionLabel)}</span>`
      : "";

    return `
    <a class="${item.id === activeNavigationId ? "is-current" : ""}" data-navigation-id="${escapeHtml(item.id)}" href="${escapeHtml(item.href)}" title="${escapeHtml(item.label)}" ${item.id === activeNavigationId ? 'aria-current="page"' : ""}>
      ${renderWorkspaceIcon(item.id, "workspace-nav__icon")}<span class="workspace-nav__label">${escapeHtml(item.label)}</span>${attention}
    </a>`;
  };

  const usesVisualFoundation = Boolean(workspace.mobileNavigation?.length);
  const primaryItems = usesVisualFoundation ? workspace.navigation.slice(0, 6) : workspace.navigation;
  const overflowItems = usesVisualFoundation
    ? [...workspace.navigation.slice(6), ...(workspace.secondaryNavigation ?? [])]
    : [];
  const navigation = primaryItems.map(renderNavigationItem).join("");
  const secondaryNavigation = !usesVisualFoundation && workspace.secondaryNavigation?.length
    ? `<div class="workspace-nav__secondary"><span class="workspace-nav__section-label">Secundair</span>${workspace.secondaryNavigation.map(renderNavigationItem).join("")}</div>`
    : "";
  const overflowNavigation = overflowItems.length
    ? `<details class="workspace-nav__more" ${overflowItems.some((item) => item.id === activeNavigationId) ? 'data-current="true"' : ""}>
        <summary>${renderWorkspaceIcon("more", "workspace-nav__icon")}<span>Meer</span></summary>
        <div>${overflowItems.map(renderNavigationItem).join("")}</div>
      </details>`
    : "";

  const footer = workspace.poweredBy
    ? `<p class="workspace-powered">Powered by <strong>${escapeHtml(workspace.poweredBy)}</strong></p>`
    : workspace.footerLink
      ? `<p>We Build And Design</p><a href="${escapeHtml(workspace.footerLink.href)}">${escapeHtml(workspace.footerLink.label)} <span aria-hidden="true">↗</span></a>`
      : "";

  const mobileShell = workspace.mobileNavigation?.length
    ? renderWorkspaceMobileShell(workspace, activeNavigationId, mobileContext)
    : "";

  const brandContent = `${renderWorkspaceMark(workspace, "workspace-brand__mark")}
      <span><strong>${escapeHtml(workspace.name)}</strong><small>Workspace</small></span>`;
  const brand = workspace.brandIsInteractive === false
    ? `<div class="workspace-brand" data-brand-interactive="false">${brandContent}</div>`
    : `<a class="workspace-brand" href="${escapeHtml(resolveWorkspaceHref(workspace))}" aria-label="${escapeHtml(workspace.name)} Workspace">${brandContent}</a>`;

  return `${usesVisualFoundation ? '<a class="workspace-skip-link" href="#workspace-main-content">Direct naar inhoud</a>' : ""}<aside class="workspace-sidebar" data-workspace="${escapeHtml(workspace.id)}" ${usesVisualFoundation ? 'data-visual-foundation="light"' : ""}>
    ${brand}
    ${renderWorkspaceSwitcher(workspace)}
    <nav class="workspace-nav" data-attention-ready="true" aria-label="${escapeHtml(workspace.name)} navigatie">${navigation}${secondaryNavigation}${overflowNavigation}</nav>
    <div class="workspace-sidebar__footer">${footer}</div>
  </aside>${mobileShell}`;
}

function renderWorkspaceMobileShell(
  workspace: WorkspaceConfig,
  activeNavigationId: string,
  mobileContext?: {
    label: string;
    backHref?: string;
    backLabel?: string;
  },
): string {
  const mobileItems = workspace.mobileNavigation ?? [];
  const moreItems = workspace.mobileMoreNavigation ?? [];
  const activeItem = [...mobileItems, ...moreItems, ...workspace.navigation]
    .find((item) => item.id === activeNavigationId);
  const moreIsCurrent = moreItems.some((item) => item.id === activeNavigationId);
  const workspaceOptions = workspaces.map((item) => `
    <a href="${escapeHtml(resolveWorkspaceHref(item))}" ${item.id === workspace.id ? 'aria-current="page"' : ""}>
      ${renderWorkspaceMark(item, "workspace-switcher__mark")}
      <span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></span>
    </a>`).join("");

  const bottomItems = mobileItems.map((item) => `
    <a href="${escapeHtml(item.href)}" ${item.id === activeNavigationId ? 'class="is-current" aria-current="page"' : ""}>
      ${renderWorkspaceIcon(item.id)}<span>${escapeHtml(item.label)}</span>
    </a>`).join("");
  const moreLinks = moreItems.map((item) => `
    <a href="${escapeHtml(item.href)}" ${item.id === activeNavigationId ? 'aria-current="page"' : ""}>
      ${renderWorkspaceIcon(item.id)}<span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.description)}</small></span>
    </a>`).join("");

  const backLink = mobileContext?.backHref
    ? `<a class="workspace-mobile-topbar__back" href="${escapeHtml(mobileContext.backHref)}" aria-label="${escapeHtml(mobileContext.backLabel ?? "Terug")}">${renderWorkspaceIcon("back")}</a>`
    : "";

  return `<header class="workspace-mobile-topbar${backLink ? " has-back" : ""}" data-workspace="${escapeHtml(workspace.id)}">
    ${backLink}
    <a class="workspace-mobile-topbar__identity" href="${escapeHtml(resolveWorkspaceHref(workspace))}" aria-label="${escapeHtml(workspace.name)} Home">
      ${renderWorkspaceMark(workspace, "workspace-mobile-topbar__mark")}
      <span><strong>${escapeHtml(workspace.shortName)}</strong><small title="${escapeHtml(mobileContext?.label ?? activeItem?.label ?? "Workspace")}">${escapeHtml(mobileContext?.label ?? activeItem?.label ?? "Workspace")}</small></span>
    </a>
    <button type="button" class="workspace-mobile-topbar__menu" data-action="open-workspace-more" aria-haspopup="dialog" aria-controls="workspace-mobile-more" aria-label="Open meer navigatie">
      ${renderWorkspaceIcon("menu")}
    </button>
  </header>
  <nav class="workspace-bottom-nav" aria-label="Primaire mobiele navigatie">
    ${bottomItems}
    <button type="button" class="${moreIsCurrent ? "is-current" : ""}" data-action="open-workspace-more" aria-haspopup="dialog" aria-controls="workspace-mobile-more" ${moreIsCurrent ? 'aria-current="page"' : ""}>
      ${renderWorkspaceIcon("more")}<span>Meer</span>
    </button>
  </nav>
  <dialog class="workspace-mobile-more" id="workspace-mobile-more" aria-labelledby="workspace-mobile-more-title">
    <div class="workspace-mobile-more__header">
      <div><p>Workspace</p><h2 id="workspace-mobile-more-title">Meer</h2></div>
      <button type="button" data-action="close-workspace-more" aria-label="Sluit meer navigatie">${renderWorkspaceIcon("close")}</button>
    </div>
    <nav aria-label="Meer Workspace-navigatie">${moreLinks}</nav>
    <section aria-labelledby="workspace-switch-title">
      <h3 id="workspace-switch-title">Wissel van Workspace</h3>
      <div class="workspace-mobile-more__workspaces">${workspaceOptions}</div>
    </section>
  </dialog>`;
}

export function attachWorkspaceShellInteractions(root: HTMLElement): void {
  root.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const openButton = target.closest<HTMLButtonElement>('[data-action="open-workspace-more"]');
    if (openButton) {
      const dialog = root.querySelector<HTMLDialogElement>("#workspace-mobile-more");
      if (dialog && !dialog.open) dialog.showModal();
      return;
    }

    const closeButton = target.closest<HTMLButtonElement>('[data-action="close-workspace-more"]');
    if (closeButton) {
      closeButton.closest<HTMLDialogElement>("dialog")?.close();
    }
  });
}
