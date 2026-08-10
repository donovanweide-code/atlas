const iconPaths: Readonly<Record<string, string>> = {
  overzicht: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-6h6v6"/>',
  organisaties: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  projecten: '<path d="M3 7.5h6l2-2h10v14H3z"/><path d="M8 14h8M8 17h5"/>',
  ontwikkelpartners: '<path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M2 21v-2a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v2M14 16h2a5 5 0 0 1 5 5"/>',
  ontwikkeling: '<path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/><path d="M2 19h22"/>',
  "business-foundation": '<circle cx="12" cy="12" r="9"/><path d="M15.5 7.5h-4a3 3 0 0 0 0 6h1a3 3 0 0 1 0 6h-4M12 5v14"/>',
  infrastructuur: '<rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h7M11 17h7"/>',
  kennisvoorstellen: '<path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23z"/><path d="M20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23z"/>',
  timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  document: '<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/>',
  contact: '<circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  back: '<path d="m15 18-6-6 6-6"/><path d="M9 12h11"/>',
};

export function renderWorkspaceIcon(name: string, className = "workspace-icon"): string {
  const paths = iconPaths[name] ?? iconPaths.projecten;
  return `<svg class="${className}" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" focusable="false">${paths}</svg>`;
}
