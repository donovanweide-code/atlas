type MobileNavigationSidebar = Pick<HTMLElement, "classList" | "querySelector" | "setAttribute" | "removeAttribute">;
type MobileNavigationTrigger = Pick<HTMLButtonElement, "setAttribute" | "focus">;
type MobileNavigationBackdrop = Pick<HTMLButtonElement, "hidden" | "setAttribute">;
type MobileNavigationBody = Pick<HTMLElement, "classList">;

export interface MobileNavigationElements {
  sidebar: MobileNavigationSidebar | null;
  trigger: MobileNavigationTrigger | null;
  backdrop: MobileNavigationBackdrop | null;
  body: MobileNavigationBody;
}

export function setMobileNavigation(elements: MobileNavigationElements, open: boolean, restoreFocus = true): boolean {
  const { sidebar, trigger, backdrop, body } = elements;
  if (!sidebar || !trigger) return false;
  sidebar.classList.toggle("is-open", open);
  sidebar.setAttribute("aria-hidden", String(!open));
  trigger.setAttribute("aria-expanded", String(open));
  if (backdrop) {
    backdrop.hidden = !open;
    backdrop.setAttribute("aria-hidden", String(!open));
  }
  body.classList.toggle("sp-mobile-nav-open", open);
  if (open) sidebar.querySelector<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')?.focus({ preventScroll: true });
  else if (restoreFocus) trigger.focus({ preventScroll: true });
  return open;
}

export function toggleMobileNavigation(elements: MobileNavigationElements): boolean {
  return setMobileNavigation(elements, !elements.sidebar?.classList.contains("is-open"));
}

/**
 * Own the dismissal click at the backdrop itself. Closing from the delegated
 * application click handler changes hit-testing beneath the pointer while the
 * event is still bubbling and allowed the mobile primary action underneath to
 * receive the same Human tap in Chrome. A direct handler consumes the complete
 * event before hiding the backdrop.
 */
export function bindMobileNavigationBackdrop(backdrop: HTMLButtonElement | null, dismiss: () => void): () => void {
  if (!backdrop) return () => undefined;
  const onClick = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopImmediatePropagation();
    dismiss();
  };
  backdrop.addEventListener("click", onClick);
  return () => { backdrop.removeEventListener("click", onClick); };
}

export function syncMobileNavigationForViewport(elements: MobileNavigationElements, mobile: boolean): void {
  if (mobile) {
    if (!elements.sidebar?.classList.contains("is-open")) setMobileNavigation(elements, false, false);
    return;
  }
  elements.sidebar?.classList.remove("is-open");
  elements.sidebar?.removeAttribute("aria-hidden");
  elements.trigger?.setAttribute("aria-expanded", "false");
  if (elements.backdrop) {
    elements.backdrop.hidden = true;
    elements.backdrop.setAttribute("aria-hidden", "true");
  }
  elements.body.classList.remove("sp-mobile-nav-open");
}
