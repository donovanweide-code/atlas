import type { CaseSnapshotLoadResult } from "./atlas-case-snapshot";
import type { AquaFlaskCase, FocusItem } from "./atlas-workspace-data";

export type FocusRecommendation = {
  kind: "day-focus" | "aquaflask" | "wbd-snapshot" | "wbd-unavailable";
  title: string;
  reason: string;
  prepared: string;
};

export function focusRecommendation(
  items: FocusItem[],
  aquaFlask: AquaFlaskCase,
  case0001: CaseSnapshotLoadResult,
): FocusRecommendation {
  const next = items.find((item) => !item.completed);
  if (next) {
    const caseName = next.caseId === "0001"
      ? "We Build And Design"
      : next.caseId === "0002"
        ? "AquaFlask"
        : "je dagfocus";
    return {
      kind: "day-focus",
      title: `Begin vandaag met ${caseName}: ${next.text}`,
      reason: "Deze stap staat als eerste onafgeronde keuze in je dagfocus. Atlas adviseert; jij bepaalt.",
      prepared: "Ik heb je eerste onafgeronde stap klaargezet.",
    };
  }

  if (aquaFlask.nextStep.trim()) {
    return {
      kind: "aquaflask",
      title: `Begin vandaag met AquaFlask: ${aquaFlask.nextStep}`,
      reason: "De klantcontext is aanwezig en er ligt een concrete, nog niet afgeronde vervolgstap.",
      prepared: "Ik heb de case voor je klaargezet.",
    };
  }

  if (case0001.state === "confirmed") {
    return {
      kind: "wbd-snapshot",
      title: case0001.snapshot.priority.text,
      reason: case0001.snapshot.meaning.text,
      prepared: case0001.snapshot.nextStep.text,
    };
  }

  return {
    kind: "wbd-unavailable",
    title: "Actueel casebeeld vraagt herbevestiging.",
    reason: "Atlas geeft voorlopig geen richting totdat een geldige Confirmed revision beschikbaar is.",
    prepared: "De eerdere briefing wordt niet als waarheid teruggezet.",
  };
}
