import type { AquaFlaskCase, FocusItem } from "./atlas-workspace-data";

export const wbdBrief = {
  currentReality:
    "We Build And Design staat bekend als websitebouwer. Dat is een waardevolle ingang en de website heeft nu de hoogste prioriteit.",
  understanding:
    "De publieke ervaring voelt rustig en aandachtig, maar maakt nog te laat concreet dat een website de eerste zichtbare stap is.",
  nextTest:
    "Toets of een ervaren ondernemer binnen zestig seconden begrijpt wat WBD realiseert, waarom WBD eerst begrijpt en waar de bestaande contactroute begint.",
  horizon:
    "Bevestigd publiek werk kan later als bewijs worden toegevoegd zonder de route opnieuw te ontwerpen.",
  silence:
    "Er is nog geen bevestigde publieke bewijsset of nieuw contactkanaal. Atlas vult die ruimte niet met aannames.",
  source: "Foundation.md · Case 0001 · Sprint 001D-review",
} as const;

export function focusRecommendation(
  items: FocusItem[],
  aquaFlask: AquaFlaskCase,
): { title: string; reason: string } {
  const next = items.find((item) => !item.completed);
  if (next) {
    const caseName = next.caseId === "0001"
      ? "We Build And Design"
      : next.caseId === "0002"
        ? "AquaFlask"
        : "je dagfocus";
    return {
      title: `Begin met ${caseName}: ${next.text}`,
      reason:
        "Deze stap staat als eerste onafgeronde keuze in je dagfocus. Atlas adviseert; jij bepaalt.",
    };
  }

  if (aquaFlask.nextStep.trim()) {
    return {
      title: `AquaFlask: ${aquaFlask.nextStep}`,
      reason:
        "De klantcontext is aanwezig en er ligt een concrete, nog niet afgeronde vervolgstap.",
    };
  }

  return {
    title: "We Build And Design: toets de eerste publieke minuut.",
    reason:
      "De website heeft nu de hoogste prioriteit. AquaFlask wacht terecht op nieuw bewijs en vraagt vandaag geen aandacht.",
  };
}
