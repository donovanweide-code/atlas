import type { SportpaleisProductionFont, SportpaleisProductionLine } from "./workspace-data.ts";

export function managedFontIdentity(font: Pick<SportpaleisProductionFont, "id" | "version" | "sha256">): string {
  return `${font.id}@${font.version}#${font.sha256}`;
}

export function exactManagedFontForLine(
  fonts: readonly SportpaleisProductionFont[],
  line: Pick<SportpaleisProductionLine, "source" | "validation">,
): SportpaleisProductionFont | null {
  if (line.validation.status !== "VALID" || line.source.kind !== "FONT" || !line.source.sha256) return null;
  if (!/^[A-F0-9]{64}$/u.test(line.source.sha256)) return null;
  const matches = fonts.filter((font) => font.id === line.source.id
    && font.version === line.source.version
    && font.sha256 === line.source.sha256
    && font.status === "TECHNICALLY_VALID");
  return matches.length === 1 ? matches[0] : null;
}
