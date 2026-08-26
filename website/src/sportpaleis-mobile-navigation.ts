type MobileNavigationSidebar = Pick<HTMLElement, "classList">;
type MobileNavigationTrigger = Pick<HTMLElement, "setAttribute">;

export function toggleMobileNavigation(sidebar: MobileNavigationSidebar | null, trigger: MobileNavigationTrigger): boolean {
  const open = sidebar?.classList.toggle("is-open") ?? false;
  trigger.setAttribute("aria-expanded", String(open));
  return open;
}
