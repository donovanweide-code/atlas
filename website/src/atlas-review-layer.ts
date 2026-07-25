import { bijCeesDeliveryReview } from "./atlas-delivery-review.ts";

export type ReviewLane = "today" | "review" | "horizon";
export type ReviewItemType = "action" | "idea" | "observation" | "candidate";
export type ReviewAuthority = "review-result" | "candidate" | "horizon";

export interface ReviewLayerItem {
  id: string;
  lane: ReviewLane;
  title: string;
  why: string;
  sourceLabel: string;
  sourcePath: string;
  type: ReviewItemType;
  status: string;
  authority: ReviewAuthority;
  nextReview: string;
  approval: string;
}

export interface ReviewLayer {
  sender: "We Build And Design";
  signature: "Powered by Atlas";
  signatureStatus: "design-exploration";
  workingBoundary: string;
  today: ReviewLayerItem & {
    relatedOpenItems: readonly string[];
  };
  review: readonly ReviewLayerItem[];
  horizon: readonly ReviewLayerItem[];
  handoffPath: string;
}

const handoffPath = "docs/atlas/CANDIDATE-HANDOFF-DENKLAAG-2026-07-25.md";

export const workspaceReviewLayer = {
  sender: "We Build And Design",
  signature: "Powered by Atlas",
  signatureStatus: "design-exploration",
  workingBoundary: bijCeesDeliveryReview.feedback.scope,
  today: {
    id: "bij-cees-seo-source",
    lane: "today",
    title: "Vergelijk eerst de oorspronkelijke SEO-teksten.",
    why: bijCeesDeliveryReview.blockers[0],
    sourceLabel: "Bij Cees · Delivery Review",
    sourcePath: "docs/atlas/PRAKTIJKREVIEW-BIJ-CEES-LEVERING-2026-07-25.md",
    type: "action",
    status: "Open",
    authority: "review-result",
    nextReview: bijCeesDeliveryReview.openItems[0],
    approval: "Geen acceptatie veronderstellen; eerst de ontbrekende bron vergelijken.",
    relatedOpenItems: bijCeesDeliveryReview.openItems,
  },
  review: [
    {
      id: "source-versus-current-norm",
      lane: "review",
      title: "Bron versus actuele norm",
      why:
        "De Bij Cees-review liet zien dat een oorspronkelijke vraag historisch bewijs is, maar een latere bewuste ondernemersbeslissing de actuele werkelijkheid kan veranderen.",
      sourceLabel: "Praktijkreview · Bij Cees Delivery Review",
      sourcePath: handoffPath,
      type: "candidate",
      status: "Nog beoordelen",
      authority: "candidate",
      nextReview:
        "Onderzoek bij een live afwijking eerst of een later besluit of acceptatiespoor bestaat voordat zij als fout wordt behandeld.",
      approval: "Expliciet besluit nodig voordat dit een blijvende Atlas-regel wordt.",
    },
    {
      id: "workspace-voice",
      lane: "review",
      title: "We Build And Design als stem",
      why:
        "Tijdens klantgericht gebruik voelde We Build And Design of ‘wij’ natuurlijker als afzender dan ‘Atlas heeft vastgesteld’.",
      sourceLabel: "Praktijkreview · Workspace-identiteit",
      sourcePath: handoffPath,
      type: "candidate",
      status: "Ontwerpverkenning",
      authority: "candidate",
      nextReview:
        "Toets de afzender en het subtiele ‘Powered by Atlas’ in werkelijk ondernemers- en klantgebruik.",
      approval: "Geen definitieve merkbeslissing; afzonderlijke beoordeling blijft nodig.",
    },
    {
      id: "visible-supported-recommendations",
      lane: "review",
      title: "Onderbouwde aanbevelingen zichtbaar maken",
      why:
        "De review maakt feiten goed zichtbaar; de praktijkreview vraagt of een voorzichtige, uitlegbare richting daarna extra houvast geeft.",
      sourceLabel: "Praktijkreview · Atlas mag initiatief tonen",
      sourcePath: handoffPath,
      type: "candidate",
      status: "Nog beoordelen",
      authority: "candidate",
      nextReview:
        "Toets eerst of één handmatig gekozen aanbeveling helpt zonder als automatische beslissing te voelen.",
      approval: "Geen automatische aanbevelingslogica zonder afzonderlijke scope en GO.",
    },
    {
      id: "workspace-action-idea-layer",
      lane: "review",
      title: "Actie- en ideeënlaag in de Workspace",
      why:
        "Tijdens dagelijks gebruik ontbrak één plek voor open acties, praktijkcandidates, Waarnemingen en Horizon.",
      sourceLabel: "Implementatiecandidate · Denklaag",
      sourcePath: handoffPath,
      type: "candidate",
      status: "In praktijktoets",
      authority: "candidate",
      nextReview:
        "Beoordeel of dit Werkbeeld binnen enkele seconden antwoord geeft zonder Focus, Horizon of Stilte te verdringen.",
      approval: "De implementatie mag worden getoetst; duurzame opname vraagt review.",
    },
  ],
  horizon: [
    {
      id: "safe-staging-cycle",
      lane: "horizon",
      title: "Veilige stagingcyclus",
      why:
        "De praktijkreview ziet waarde in een herstelbare route van klantvraag naar staging, gecontroleerde wijziging en preview vóór live.",
      sourceLabel: "WordPress Execution Foundation · toekomstige richting",
      sourcePath: "website/docs/future/atlas-wordpress-execution-foundation.md",
      type: "idea",
      status: "Horizon",
      authority: "horizon",
      nextReview:
        "Herbeoordeel wanneer een concrete klantwijziging een herhaalbare staging- en previewroute aantoonbaar nodig heeft.",
      approval: "Nu geen uitvoeringsopdracht, productieverbinding of architectuurbesluit.",
    },
  ],
  handoffPath,
} as const satisfies ReviewLayer;

export const reviewItemTypeLabels: Record<ReviewItemType, string> = {
  action: "Actiepunt",
  idea: "Idee",
  observation: "Waarneming",
  candidate: "Candidate",
};

export const reviewAuthorityLabels: Record<ReviewAuthority, string> = {
  "review-result": "Vastgesteld open",
  candidate: "Goedkeuring nodig",
  horizon: "Bewust later",
};
