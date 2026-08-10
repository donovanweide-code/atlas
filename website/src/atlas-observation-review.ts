import {
  type Observation,
  type ObservationReviewDecision,
  type ObservationStatus,
  type ObservationStore,
} from "./atlas-observations.ts";

export const observationReviewOutcomes = [
  {
    id: "confirmed",
    label: "Bevestig als werkelijkheid",
    description: "Relevant en herleidbaar, maar nog geen herbruikbare kennis.",
  },
  {
    id: "linked",
    label: "Koppel aan een Case",
    description: "Wijs de observatie bewust toe aan een bestaande Case.",
  },
  {
    id: "question",
    label: "Maak er een open vraag van",
    description: "Houd de betekenis open omdat eerst meer duidelijkheid nodig is.",
  },
  {
    id: "parked",
    label: "Parkeer bewust",
    description: "Bewaar de observatie met een concrete terugkeertrigger.",
  },
  {
    id: "rejected",
    label: "Wijs af",
    description: "Onvoldoende herleidbaar, relevant of betrouwbaar; historie blijft behouden.",
  },
] as const;

export type ObservationReviewOutcome = (typeof observationReviewOutcomes)[number]["id"];

export interface ObservationReviewInput {
  status: ObservationReviewOutcome;
  reviewedBy: string;
  rationale: string;
  caseId?: string;
  returnTrigger?: string;
}

const reviewedStatuses = new Set<ObservationStatus>(observationReviewOutcomes.map((outcome) => outcome.id));

export function observationsNeedingReview(store: ObservationStore): Observation[] {
  return store.observations.filter((observation) => observation.status === "unreviewed");
}

export function observationReviewTitle(observation: Observation, maximum = 96): string {
  const sentence = observation.text.split(/(?<=[.!?])\s/)[0]?.trim() || observation.text.trim();
  if (sentence.length <= maximum) return sentence;
  return `${sentence.slice(0, Math.max(1, maximum - 1)).trimEnd()}…`;
}

export function observationSourceKindLabel(observation: Observation): string {
  return observation.source.kind === "practice-source" ? "Praktijkbron" : "Oppervlak";
}

export function observationOriginLabel(observation: Observation): string {
  const labels = {
    website: "Website",
    workspace: "Workspace",
    experience: "Experience",
    observatory: "Observatory",
    "practice-source": "Praktijkbron",
  } as const;
  return labels[observation.source.origin];
}

export function prepareObservationReview(input: ObservationReviewInput): ObservationReviewDecision {
  if (!reviewedStatuses.has(input.status)) throw new Error("Kies een geldige menselijke uitkomst.");
  const reviewedBy = input.reviewedBy.trim();
  const rationale = input.rationale.trim();
  if (!reviewedBy) throw new Error("Vul de naam van de beoordelaar in.");
  if (!rationale) throw new Error("Leg kort uit waarom je deze beslissing neemt.");
  const decision: ObservationReviewDecision = { status: input.status, reviewedBy, rationale };
  if (input.status === "linked") {
    const caseId = input.caseId?.trim();
    if (!caseId) throw new Error("Kies de Case waaraan je deze observatie koppelt.");
    decision.caseId = caseId;
  }
  if (input.status === "parked") {
    const returnTrigger = input.returnTrigger?.trim();
    if (!returnTrigger) throw new Error("Beschrijf wanneer deze observatie opnieuw aandacht verdient.");
    decision.returnTrigger = returnTrigger;
  }
  return decision;
}
