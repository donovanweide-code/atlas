import {
  createInitialRuntime,
  type AtlasRuntimeField,
  type RuntimeDecision,
} from "./atlas-runtime.ts";

export const contextFirstExperimentVersion = "1.0-context-first-local-candidate";
export const mandatoryContextQuestionCount = 2;

export type ContextSourceStatus = "participant-input" | "public-observation" | "provisional-inference" | "unknown";

export interface PublicObservation {
  id: string;
  statement: string;
  evidenceExcerpt: string;
  sourceUrl: string;
}

export interface ContextSnapshot {
  schemaVersion: 1;
  sourceId: string;
  organizationAliases: string[];
  canonicalUrl: string;
  acceptedHosts: string[];
  retrievedAt: string;
  acquisition: {
    method: "explicit-local-snapshot-from-live-public-source";
    homepageBytes: number;
    homepageSha256: string;
    bundlePath: string;
    bundleBytes: number;
    bundleSha256: string;
  };
  observations: PublicObservation[];
  questionGrounding: {
    publicPromiseObservationId: string;
    visibleEntryObservationId: string;
    unknown: string;
  };
}

export interface ContextRealityContact {
  id: string;
  sourceStatus: "participant-input" | "public-observation";
  kind: "industry" | "organization-identity" | "organization-website" | "reference-organization" | "reference-reason" | "public-fact";
  content: string;
  sourceUrl?: string;
  evidenceExcerpt?: string;
  snapshotId?: string;
  observedAt: string;
}

export interface ContextInference {
  id: string;
  sourceStatus: "provisional-inference";
  statement: string;
  contactIds: string[];
  confidence: "glimpse";
}

export interface ContextUnknown {
  id: string;
  sourceStatus: "unknown";
  statement: string;
  contactIds: string[];
  status: "open";
}

export interface ContextJournalEntry {
  id: string;
  revision: number;
  eventType: "participant-context" | "public-grounding" | "provisional-interpretation" | "runtime-decision";
  sourceStatus: ContextSourceStatus;
  affectedContactIds: string[];
  affectedInferenceIds: string[];
  affectedUnknownIds: string[];
  reason: string;
  createdAt: string;
}

export interface ContextFirstRuntimeState {
  schemaVersion: 1;
  experimentVersion: typeof contextFirstExperimentVersion;
  revision: number;
  baseField: AtlasRuntimeField;
  contextRealityContacts: ContextRealityContact[];
  provisionalInferences: ContextInference[];
  openUnknowns: ContextUnknown[];
  decision: RuntimeDecision;
  journal: ContextJournalEntry[];
}

export interface ContextFirstInput {
  industry: string;
  organizationName: string;
  websiteUrl?: string;
  referenceOrganization?: string;
  referenceReason?: string;
}

export interface ContextFirstCandidate {
  state: ContextFirstRuntimeState;
  facts: ContextRealityContact[];
  provisionalPicture: ContextInference;
  unknown: ContextUnknown;
  firstDistinction: string;
  firstQuestion: string;
  source?: ContextSnapshot;
  sourceAvailability: "controlled-public-source" | "not-observed";
}

export interface RouteAResult {
  state: AtlasRuntimeField;
  decision: RuntimeDecision;
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeOrganizationUrl(value: string): string | undefined {
  const input = compact(value);
  if (!input) return undefined;
  try {
    const parsed = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function snapshotSupportsUrl(snapshot: ContextSnapshot, value: string): boolean {
  const normalized = normalizeOrganizationUrl(value);
  if (!normalized) return false;
  return snapshot.acceptedHosts.includes(new URL(normalized).hostname.toLocaleLowerCase("nl-NL"));
}

export function createRouteA(sessionId: string, timestamp: string): RouteAResult {
  const initial = createInitialRuntime(sessionId, "participant-local", timestamp);
  return { state: initial.field, decision: initial.decision };
}

export function createContextFirstBaselineCandidate(
  input: ContextFirstInput,
  timestamp: string,
): ContextFirstCandidate {
  const industry = compact(input.industry);
  const organizationName = compact(input.organizationName);
  const websiteUrl = normalizeOrganizationUrl(input.websiteUrl ?? "");
  if (!industry) throw new Error("Industry is required.");
  if (!organizationName) throw new Error("Organization name is required.");

  const base = createInitialRuntime("context-first-local", "participant-local", timestamp);
  const participantContacts: ContextRealityContact[] = [
    {
      id: "context-participant-industry",
      sourceStatus: "participant-input",
      kind: "industry",
      content: industry,
      observedAt: timestamp,
    },
    {
      id: "context-participant-organization",
      sourceStatus: "participant-input",
      kind: "organization-identity",
      content: organizationName,
      observedAt: timestamp,
    },
  ];
  if (websiteUrl) {
    participantContacts.push({
      id: "context-participant-website",
      sourceStatus: "participant-input",
      kind: "organization-website",
      content: websiteUrl,
      observedAt: timestamp,
    });
  }

  const provisionalPicture: ContextInference = {
    id: "context-inference-first-picture",
    sourceStatus: "provisional-inference",
    statement: `${organizationName} werkt binnen ${industry}. Zonder gecontroleerde publieke observatie blijft nog open waar de dagelijkse werkelijkheid het meest afwijkt van hoe het werk bedoeld is.`,
    contactIds: ["context-participant-industry", "context-participant-organization"],
    confidence: "glimpse",
  };
  const unknown: ContextUnknown = {
    id: "context-unknown-first-reality",
    sourceStatus: "unknown",
    statement: `Nog onbekend is welk concreet moment binnen ${organizationName} vandaag het meeste onderzoek verdient.`,
    contactIds: ["context-participant-industry", "context-participant-organization"],
    status: "open",
  };
  const firstDistinction = "Branche en organisatienaam geven richting, maar vertellen nog niet waar het werk in de praktijk schuurt.";
  const firstQuestion = `Waar merkt ${organizationName} binnen ${industry} vandaag het meest dat het werk anders loopt dan bedoeld?`;
  const decision: RuntimeDecision = {
    revision: 3,
    kind: "question",
    movement: "free-telling",
    kicker: "Een voorlopig onderzoekskader",
    title: "Van context naar een concreet moment",
    question: firstQuestion,
    prompt: "Een concreet moment of voorbeeld is genoeg.",
    originQuote: `${industry} / ${organizationName}`,
    reason: "De vraag gebruikt uitsluitend de branche en organisatienaam die de deelnemer zelf heeft gegeven en opent wat nog onbekend is.",
    canStop: true,
    requiresResponse: false,
    uncertainty: "glimpse",
    riskBoundary: firstDistinction,
    participantOptions: ["Beantwoorden", "Eerst corrigeren", "Voor vandaag stoppen"],
    continuation: "internal",
    foundationRefs: ["reality-contact", "epistemic-humility", "participant-ownership"],
  };
  const journal: ContextJournalEntry[] = [
    {
      id: "context-journal-1",
      revision: 1,
      eventType: "participant-context",
      sourceStatus: "participant-input",
      affectedContactIds: participantContacts.map(({ id }) => id),
      affectedInferenceIds: [],
      affectedUnknownIds: [],
      reason: "De deelnemer benoemt branche en organisatie. Een eventuele website blijft deelnemerinput zolang Atlas die niet gecontroleerd heeft kunnen observeren.",
      createdAt: timestamp,
    },
    {
      id: "context-journal-2",
      revision: 2,
      eventType: "provisional-interpretation",
      sourceStatus: "provisional-inference",
      affectedContactIds: provisionalPicture.contactIds,
      affectedInferenceIds: [provisionalPicture.id],
      affectedUnknownIds: [unknown.id],
      reason: "Het voorlopige onderzoekskader gebruikt alleen deelnemerinput en maakt de ontbrekende publieke observatie expliciet.",
      createdAt: timestamp,
    },
    {
      id: "context-journal-3",
      revision: 3,
      eventType: "runtime-decision",
      sourceStatus: "unknown",
      affectedContactIds: provisionalPicture.contactIds,
      affectedInferenceIds: [provisionalPicture.id],
      affectedUnknownIds: [unknown.id],
      reason: decision.reason,
      createdAt: timestamp,
    },
  ];

  return {
    state: {
      schemaVersion: 1,
      experimentVersion: contextFirstExperimentVersion,
      revision: 3,
      baseField: base.field,
      contextRealityContacts: participantContacts,
      provisionalInferences: [provisionalPicture],
      openUnknowns: [unknown],
      decision,
      journal,
    },
    facts: participantContacts,
    provisionalPicture,
    unknown,
    firstDistinction,
    firstQuestion,
    sourceAvailability: "not-observed",
  };
}

export function createContextFirstCandidate(
  input: ContextFirstInput,
  snapshot: ContextSnapshot,
  timestamp: string,
): ContextFirstCandidate {
  const industry = compact(input.industry);
  const organizationName = compact(input.organizationName);
  const websiteUrl = normalizeOrganizationUrl(input.websiteUrl ?? "");
  if (!industry) throw new Error("Industry is required.");
  if (!organizationName) throw new Error("Organization name is required.");
  if (!websiteUrl) throw new Error("A valid organization website is required for this source-backed candidate.");
  if (!snapshotSupportsUrl(snapshot, websiteUrl)) {
    throw new Error("No explicit local source snapshot is available for this website.");
  }

  const base = createInitialRuntime("context-first-local", "participant-local", timestamp);
  const participantContacts: ContextRealityContact[] = [
    {
      id: "context-participant-industry",
      sourceStatus: "participant-input",
      kind: "industry",
      content: industry,
      observedAt: timestamp,
    },
    {
      id: "context-participant-organization",
      sourceStatus: "participant-input",
      kind: "organization-identity",
      content: organizationName,
      observedAt: timestamp,
    },
    {
      id: "context-participant-website",
      sourceStatus: "participant-input",
      kind: "organization-website",
      content: websiteUrl,
      observedAt: timestamp,
    },
  ];

  const referenceOrganization = compact(input.referenceOrganization ?? "");
  const referenceReason = compact(input.referenceReason ?? "");
  if (referenceOrganization) {
    participantContacts.push({
      id: "context-participant-reference",
      sourceStatus: "participant-input",
      kind: "reference-organization",
      content: referenceOrganization,
      observedAt: timestamp,
    });
  }
  if (referenceReason) {
    participantContacts.push({
      id: "context-participant-reference-reason",
      sourceStatus: "participant-input",
      kind: "reference-reason",
      content: referenceReason,
      observedAt: timestamp,
    });
  }

  const publicContacts = snapshot.observations.map<ContextRealityContact>((observation) => ({
    id: `context-${observation.id}`,
    sourceStatus: "public-observation",
    kind: "public-fact",
    content: observation.statement,
    sourceUrl: observation.sourceUrl,
    evidenceExcerpt: observation.evidenceExcerpt,
    snapshotId: snapshot.sourceId,
    observedAt: snapshot.retrievedAt,
  }));
  const contacts = [...participantContacts, ...publicContacts];
  const promiseContactId = `context-${snapshot.questionGrounding.publicPromiseObservationId}`;
  const entryContactId = `context-${snapshot.questionGrounding.visibleEntryObservationId}`;
  const referenceSuffix = referenceOrganization && referenceReason
    ? ` Het contrast met ${referenceOrganization} is alleen een voorkeurssignaal van de deelnemer: ${referenceReason}.`
    : "";
  const provisionalPicture: ContextInference = {
    id: "context-inference-first-picture",
    sourceStatus: "provisional-inference",
    statement: `${organizationName} positioneert begrijpen vóór oplossen, terwijl de eerste publieke uitnodiging nog breed en open is.${referenceSuffix}`,
    contactIds: ["context-participant-organization", promiseContactId, entryContactId, ...(
      referenceOrganization && referenceReason
        ? ["context-participant-reference", "context-participant-reference-reason"]
        : []
    )],
    confidence: "glimpse",
  };
  const unknown: ContextUnknown = {
    id: "context-unknown-first-translation",
    sourceStatus: "unknown",
    statement: snapshot.questionGrounding.unknown,
    contactIds: [promiseContactId, entryContactId],
    status: "open",
  };
  const firstDistinction = "De website laat zien wat de organisatie belooft; niet hoe het eerste gesprek intern werkelijk verloopt.";
  const firstQuestion = `Binnen ${industry} belooft jullie website eerst te begrijpen hoe een organisatie werkt. De zichtbare eerste stap vraagt mensen om te vertellen wat er speelt. Waar moet een ondernemer bij ${organizationName} op dat moment nog zelf vertalen wat er in de organisatie gebeurt?`;
  const decision: RuntimeDecision = {
    revision: 4,
    kind: "question",
    movement: "connect",
    kicker: "Een eerste onderscheid",
    title: "Van publieke belofte naar het eerste echte gesprek",
    question: firstQuestion,
    prompt: "Een concreet moment of voorbeeld is genoeg.",
    originQuote: "Begrijpen is het vertrekpunt. / Vertel wat er speelt",
    reason: "De vraag verbindt twee direct zichtbare publieke feiten en opent precies wat daaruit nog niet bekend is.",
    canStop: true,
    requiresResponse: false,
    uncertainty: "glimpse",
    riskBoundary: firstDistinction,
    participantOptions: ["Beantwoorden", "Eerst corrigeren", "Voor vandaag stoppen"],
    continuation: "internal",
    foundationRefs: ["reality-contact", "epistemic-humility", "participant-ownership"],
  };
  const journal: ContextJournalEntry[] = [
    {
      id: "context-journal-1",
      revision: 1,
      eventType: "participant-context",
      sourceStatus: "participant-input",
      affectedContactIds: participantContacts.map(({ id }) => id),
      affectedInferenceIds: [],
      affectedUnknownIds: [],
      reason: "De deelnemer benoemt branche, organisatie en website; Atlas neemt dit aan als deelnemerinput, niet als geverifieerd intern feit.",
      createdAt: timestamp,
    },
    {
      id: "context-journal-2",
      revision: 2,
      eventType: "public-grounding",
      sourceStatus: "public-observation",
      affectedContactIds: publicContacts.map(({ id }) => id),
      affectedInferenceIds: [],
      affectedUnknownIds: [],
      reason: "Alleen expliciet gesnapshote, herleidbare publieke observaties worden toegevoegd.",
      createdAt: timestamp,
    },
    {
      id: "context-journal-3",
      revision: 3,
      eventType: "provisional-interpretation",
      sourceStatus: "provisional-inference",
      affectedContactIds: provisionalPicture.contactIds,
      affectedInferenceIds: [provisionalPicture.id],
      affectedUnknownIds: [unknown.id],
      reason: "Het eerste beeld blijft voorlopig en noemt expliciet wat onbekend is.",
      createdAt: timestamp,
    },
    {
      id: "context-journal-4",
      revision: 4,
      eventType: "runtime-decision",
      sourceStatus: "unknown",
      affectedContactIds: [promiseContactId, entryContactId],
      affectedInferenceIds: [provisionalPicture.id],
      affectedUnknownIds: [unknown.id],
      reason: decision.reason,
      createdAt: timestamp,
    },
  ];

  return {
    state: {
      schemaVersion: 1,
      experimentVersion: contextFirstExperimentVersion,
      revision: 4,
      baseField: base.field,
      contextRealityContacts: contacts,
      provisionalInferences: [provisionalPicture],
      openUnknowns: [unknown],
      decision,
      journal,
    },
    facts: contacts,
    provisionalPicture,
    unknown,
    firstDistinction,
    firstQuestion,
    source: snapshot,
    sourceAvailability: "controlled-public-source",
  };
}
