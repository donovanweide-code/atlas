export interface FreeProductionLineSettingsTarget {
  id: string;
  type: "TEXT" | "INITIALS" | "NUMBER";
  fontId: string;
  heightMm: number;
  foilColor: string;
  quantity: number;
}

export function applyFreeProductionBulkSettings<T extends FreeProductionLineSettingsTarget>(lines: T[], selectedIds: ReadonlySet<string>, settings: { type?: T["type"]; heightCm?: number; foilColor?: string; fontId?: string; quantity?: number }): number {
  const heightMm = settings.heightCm && settings.heightCm > 0 ? Math.max(1, Math.min(430, settings.heightCm * 10)) : null;
  let changed = 0;
  for (const line of lines) {
    if (!selectedIds.has(line.id)) continue;
    if (heightMm !== null) line.heightMm = heightMm;
    if (settings.type) line.type = settings.type;
    if (settings.foilColor) line.foilColor = settings.foilColor;
    if (settings.fontId) line.fontId = settings.fontId;
    if (Number.isInteger(settings.quantity) && Number(settings.quantity) > 0) line.quantity = Math.min(999, Number(settings.quantity));
    changed += 1;
  }
  return changed;
}
