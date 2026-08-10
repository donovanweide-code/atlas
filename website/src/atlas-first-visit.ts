import {
  createInitialRuntime,
  type AtlasRuntimeField,
  type RuntimeDecision,
  type RuntimeJournalEntry,
  type RuntimeView,
} from "./atlas-runtime.ts";
import {
  normalizeOrganizationUrl,
  snapshotSupportsUrl,
  type ContextSnapshot,
} from "./atlas-context-first-experiment.ts";

export const firstVisitVersion = "2.0-first-visit-v2";

export type FirstVisitSourceStatus = "participant-input" | "public-observation" | "provisional-inference" | "unknown";

export interface FirstVisitInput {
  industry: string;
  organizationName: string;
  websiteUrl?: string;
}

export interface FirstVisitContextContact {
  id: string;
  sourceStatus: FirstVisitSourceStatus;
  kind: "industry" | "organization" | "website" | "public-fact" | "provisional-picture" | "internal-unknown";
  content: string;
  sourceUrl?: string;
  evidenceExcerpt?: string;
  observedAt: string;
}

export interface FirstVisitContextState {
  schemaVersion: 1;
  experienceVersion: typeof firstVisitVersion;
  sourceAvailability: "controlled-public-source" | "not-observed";
  contacts: FirstVisitContextContact[];
  firstPicture: string;
  firstQuestion: string;
}

export interface FirstVisitRuntimeField extends AtlasRuntimeField {
  firstVisitContext: FirstVisitContextState;
}

export interface FirstVisitRuntimeSeed extends RuntimeView {
  field: FirstVisitRuntimeField;
  context: FirstVisitContextState;
  journalEntry: RuntimeJournalEntry;
}

function compact(value: string, maximum = 180): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

export function createFirstVisitRuntime(
  sessionId: string,
  participantId: string,
  input: FirstVisitInput,
  snapshot: ContextSnapshot,
  timestamp: string,
): FirstVisitRuntimeSeed {
  const industry = compact(input.industry);
  const organizationName = compact(input.organizationName);
  const normalizedWebsite = normalizeOrganizationUrl(input.websiteUrl ?? "");
  if (!industry) throw new Error("Industry is required.");
  if (!organizationName) throw new Error("Organization name is required.");

  const supportedWebsite = Boolean(normalizedWebsite && snapshotSupportsUrl(snapshot, normalizedWebsite));
  const participantContacts: FirstVisitContextContact[] = [
    { id: "first-visit-industry", sourceStatus: "participant-input", kind: "industry", content: industry, observedAt: timestamp },
    { id: "first-visit-organization", sourceStatus: "participant-input", kind: "organization", content: organizationName, observedAt: timestamp },
  ];
  if (normalizedWebsite) {
    participantContacts.push({ id: "first-visit-website", sourceStatus: "participant-input", kind: "website", content: normalizedWebsite, observedAt: timestamp });
  }

  const publicContacts = supportedWebsite
    ? snapshot.observations.slice(0, 3).map<FirstVisitContextContact>((observation) => ({
      id: `first-visit-${observation.id}`,
      sourceStatus: "public-observation",
      kind: "public-fact",
      content: observation.statement,
      sourceUrl: observation.sourceUrl,
      evidenceExcerpt: observation.evidenceExcerpt,
      observedAt: snapshot.retrievedAt,
    }))
    : [];
  const firstPicture = supportedWebsite
    ? `${organizationName} werkt binnen ${industry}. Op de website is zichtbaar hoe de organisatie zich publiek presenteert; hoe dit intern wordt uitgevoerd is nog onbekend.`
    : `${organizationName} werkt binnen ${industry}. Er is nog geen gecontroleerd beeld van de website of interne werkwijze.`;
  const firstQuestion = supportedWebsite
    ? `De website laat zien hoe ${organizationName} zich binnen ${industry} presenteert. Waar begint een klantvraag in de praktijk meestal, en wat gebeurt er daarna?`
    : `Waar begint het dagelijkse werk binnen ${organizationName} in ${industry} meestal, en welk deel daarvan wil je vandaag beter begrijpen?`;
  const contextContacts: FirstVisitContextContact[] = [
    ...participantContacts,
    ...publicContacts,
    { id: "first-visit-picture", sourceStatus: "provisional-inference", kind: "provisional-picture", content: firstPicture, observedAt: timestamp },
    {
      id: "first-visit-internal-unknown",
      sourceStatus: "unknown",
      kind: "internal-unknown",
      content: supportedWebsite
        ? "Nog onbekend is hoe de publieke belofte in het dagelijkse werk wordt uitgevoerd."
        : "Nog onbekend zijn de publieke presentatie en de interne werkwijze.",
      observedAt: timestamp,
    },
  ];
  const context: FirstVisitContextState = {
    schemaVersion: 1,
    experienceVersion: firstVisitVersion,
    sourceAvailability: supportedWebsite ? "controlled-public-source" : "not-observed",
    contacts: contextContacts,
    firstPicture,
    firstQuestion,
  };

  const initial = createInitialRuntime(sessionId, participantId, timestamp);
  const contactId = "contact-1-1";
  const field: FirstVisitRuntimeField = {
    ...initial.field,
    revision: 1,
    inquiryFrame: {
      ...initial.field.inquiryFrame,
      scope: `Onderzoek met ${organizationName} binnen ${industry}; publieke context blijft begrensd tot gecontroleerde observaties.`,
    },
    realityContacts: [{
      id: contactId,
      eventId: "first-visit-context-v2",
      kind: "participant-contribution",
      actorId: participantId,
      directness: "self-report",
      content: `Branche: ${industry}. Organisatie: ${organizationName}.${normalizedWebsite ? ` Website door deelnemer opgegeven: ${normalizedWebsite}.` : " Geen website opgegeven."}`,
      observedAt: timestamp,
      receivedAt: timestamp,
      foundationRefs: ["F · waarnemen", "CI · 5", "CE · 4.15", "RA-02"],
    }],
    openUnknowns: [{
      id: "unknown-1-1",
      kind: supportedWebsite ? "external-observation" : "concrete-event",
      question: firstQuestion,
      status: "asked",
      openedAtRevision: 1,
    }],
    attention: {
      focus: supportedWebsite ? "public-to-internal-reality" : "organization-reality",
      reason: supportedWebsite
        ? "De gecontroleerde publieke observatie opent een vraag naar de nog onbekende interne uitvoering."
        : "Branche en organisatie geven richting; een concreet werkelijkheidscontact ontbreekt nog.",
      movement: "free-telling",
    },
    meta: { ...initial.field.meta, acceptedTransitions: 1, lastChangeType: "first-visit-context-established" },
    updatedAt: timestamp,
    firstVisitContext: context,
  };
  const decision: RuntimeDecision = {
    revision: 1,
    kind: "question",
    movement: "free-telling",
    kicker: "Een eerste gerichte vraag",
    title: "Laten we van het eerste beeld naar de dagelijkse werkelijkheid gaan.",
    question: firstQuestion,
    prompt: "Vertel alleen wat er werkelijk gebeurt. Een kort voorbeeld is genoeg.",
    reason: supportedWebsite
      ? "De vraag verbindt deelnemerinput met een gecontroleerde publieke observatie en opent wat intern nog onbekend is."
      : "De vraag komt uitsluitend voort uit branche en organisatie en opent de ontbrekende dagelijkse werkelijkheid zonder een websitebeeld te verzinnen.",
    canStop: true,
    requiresResponse: true,
    uncertainty: "glimpse",
    riskBoundary: "Het organisatiebeeld is voorlopig; openbare informatie is geen bewijs van de interne werkwijze.",
    participantOptions: ["vertellen", "corrigeren", "stoppen"],
    continuation: "internal",
    foundationRefs: ["F · waarnemen", "CI · 5", "CE · 4.15", "RA-02"],
  };
  const journalEntry: RuntimeJournalEntry = {
    eventId: "first-visit-context-v2",
    eventType: "contribution",
    baseRevision: 0,
    committedRevision: 1,
    changeType: "first-visit-context-established",
    gateStatus: "accepted",
    affectedContactIds: [contactId],
    affectedHypothesisIds: [],
    foundationRefs: decision.foundationRefs,
    decision,
    createdAt: timestamp,
  };

  return { field, decision, context, journalEntry };
}
