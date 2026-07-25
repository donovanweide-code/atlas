export type OrientationStatus = "unassigned";

export interface ConfirmedOrientation {
  subject: string;
  status: OrientationStatus;
  signal: string;
  meaning: string;
  reviewOwner: string;
  confirmedAt: string;
  returnTrigger: string;
  sourcePath: string;
  boundaries: readonly string[];
}

export const confirmedOrientations = [
  {
    subject: "Bij Cees",
    status: "unassigned",
    signal:
      "Na meerdere wijzigingen door We Build And Design aan de webshop van Bij Cees bleven tijdens Donovans controle nog niet gespecificeerde fricties zichtbaar. Wat er daadwerkelijk gebeurde en welke betekenis dat had, was nog niet voldoende begrepen om de oplevering als afgerond te beschouwen, nieuwe conclusies te trekken of verdere wijzigingen te rechtvaardigen.",
    meaning:
      "Bron, waarneming, besluit en resultaat moeten over meerdere momenten uit elkaar kunnen blijven totdat nieuwe herleidbare werkelijkheid betekenis toevoegt.",
    reviewOwner: "Donovan",
    confirmedAt: "2026-07-25",
    returnTrigger:
      "Herbeoordeel de toewijzing zodra een herleidbare bron nieuwe betekenis toevoegt. Dat kan de oorspronkelijke klantvraag zijn, een concrete brongebonden frictie of nieuw inhoudelijk contact met de ondernemer.",
    sourcePath: "docs/atlas/PRAKTIJKVALIDATIE-BIJ-CEES-CANDIDATE.md",
    boundaries: [
      "Geen case-ID",
      "Geen CASE-SNAPSHOT",
      "Geen Focus- of Kompaspositie",
    ],
  },
] as const satisfies readonly ConfirmedOrientation[];

export function orientationStatusLabel(status: OrientationStatus): string {
  return status === "unassigned" ? "Nog niet toegewezen" : status;
}
