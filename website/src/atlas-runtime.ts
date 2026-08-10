export const atlasRuntimeExperienceVersion = "6.0-runtime-v1";
export const atlasRuntimeArchitectureVersion = "1.0-runtime-architecture-v1";

export type RuntimeMovement =
  | "free-telling"
  | "concretize"
  | "reflective-hypothesis"
  | "counterexample"
  | "perspective"
  | "time-shift"
  | "correction"
  | "connect"
  | "external-correction"
  | "silence";

export type RuntimeDecisionKind = "question" | "external-correction" | "silence";
export type RuntimeConfidence = "glimpse" | "plausible" | "contested" | "weakened" | "bounded";
export type RuntimeHypothesisStatus = "candidate" | "active" | "contested" | "parked" | "abandoned";

export interface RuntimeInquiryFrame {
  purpose: string;
  phase: "investigate";
  mandate: "research-with-participant";
  participantIds: string[];
  scope: string;
  excluded: string[];
  consent: "voluntary";
}

export interface RuntimeRealityContact {
  id: string;
  eventId: string;
  kind: "participant-contribution";
  actorId: string;
  directness: "self-report";
  content: string;
  observedAt: string;
  receivedAt: string;
  foundationRefs: string[];
}

export interface RuntimeMeaning {
  id: string;
  type: "experiential" | "relational" | "functional" | "causal" | "normative";
  actorId: string;
  statement: string;
  contactIds: string[];
  status: "proposed" | "participant-owned" | "contested" | "revised";
}

export interface RuntimeHypothesis {
  id: string;
  statement: string;
  alternative: string;
  status: RuntimeHypothesisStatus;
  confidence: RuntimeConfidence;
  evidenceContactIds: string[];
  counterEvidenceContactIds: string[];
  originRevision: number;
  deathReason?: "insufficient-support" | "better-explanation" | "refuted-same-conditions" | "out-of-scope";
}

export interface RuntimeUnknown {
  id: string;
  kind: "concrete-event" | "causal-distinction" | "counterexample" | "perspective" | "time-boundary" | "external-observation";
  question: string;
  status: "open" | "asked" | "resolved" | "parked";
  hypothesisId?: string;
  openedAtRevision: number;
}

export interface RuntimeRiskState {
  level: "ordinary" | "potential-high";
  reasons: string[];
  externalCorrectionRequired: boolean;
}

export interface RuntimeAttentionState {
  focus: string;
  reason: string;
  movement: RuntimeMovement;
}

export interface RuntimeMetaState {
  acceptedTransitions: number;
  consecutiveNoChange: number;
  lastChangeType: string;
  consolidationCount: number;
  lastConsolidatedRevision: number;
}

export interface AtlasRuntimeField {
  schemaVersion: 1;
  architectureVersion: typeof atlasRuntimeArchitectureVersion;
  sessionId: string;
  revision: number;
  inquiryFrame: RuntimeInquiryFrame;
  realityContacts: RuntimeRealityContact[];
  meanings: RuntimeMeaning[];
  hypotheses: RuntimeHypothesis[];
  openUnknowns: RuntimeUnknown[];
  risk: RuntimeRiskState;
  worldKnowledge: [];
  attention: RuntimeAttentionState;
  qualitativeConfidence: RuntimeConfidence;
  meta: RuntimeMetaState;
  updatedAt: string;
}

export interface RuntimeDecision {
  revision: number;
  kind: RuntimeDecisionKind;
  movement: RuntimeMovement;
  kicker: string;
  title: string;
  question?: string;
  prompt?: string;
  originQuote?: string;
  reason: string;
  canStop: true;
  requiresResponse: boolean;
  uncertainty: RuntimeConfidence;
  riskBoundary: string;
  participantOptions: string[];
  continuation: "internal" | "external-correction-required";
  foundationRefs: string[];
}

export interface RuntimeContributionEvent {
  id: string;
  type: "contribution";
  inquiryId: string;
  actorId: string;
  content: string;
  observedAt: string;
  receivedAt: string;
  baseRevision: number;
}

export interface RuntimeResumeEvent {
  id: string;
  type: "resume";
  inquiryId: string;
  actorId: string;
  observedAt: string;
  receivedAt: string;
  baseRevision: number;
}

export type RuntimeEvent = RuntimeContributionEvent | RuntimeResumeEvent;

export interface RuntimeJournalEntry {
  eventId: string;
  eventType: RuntimeEvent["type"];
  baseRevision: number;
  committedRevision: number;
  changeType: string;
  gateStatus: "accepted" | "external-correction-required" | "no-change";
  affectedContactIds: string[];
  affectedHypothesisIds: string[];
  foundationRefs: string[];
  decision: RuntimeDecision;
  createdAt: string;
}

export interface RuntimeTransitionResult {
  field: AtlasRuntimeField;
  decision: RuntimeDecision;
  journalEntry: RuntimeJournalEntry;
}

export interface RuntimeView {
  field: AtlasRuntimeField;
  decision: RuntimeDecision;
}

const stopWords = new Set([
  "aandacht", "alleen", "altijd", "andere", "bijna", "daarna", "daarom", "dezelfde", "deze", "door", "eigenlijk", "enkele", "gebeurde", "gewoon", "heeft", "hele", "hier", "iemand", "iedere", "iets", "kunnen", "later", "meer", "meestal", "meteen", "moest", "niet", "omdat", "onze", "opnieuw", "over", "precies", "soms", "steeds", "toen", "vandaag", "vanuit", "veel", "volgens", "vooral", "waren", "werd", "werden", "zelf", "zoals", "zonder",
]);

const highRiskPattern = /\b(onveilig|gevaar|gevaarlijk|schade|gewond|medisch|medicijn|pati[eë]nt|su[iï]cid|brand|fraude|wettelijk verplicht|datalek|privacy-incident)\b/i;
const uncertaintyPattern = /\b(misschien|mogelijk|vermoed|denk dat|zou kunnen|weet ik niet|geen idee|onzeker)\b/i;
const correctionPattern = /^(nee\b|niet helemaal\b|dat klopt niet\b|anders\b)|\b(maar eigenlijk|ik zie het anders|dat bedoel ik niet|klopt niet)\b/i;
const explanationPattern = /\b(omdat|doordat|waardoor|lag aan|kwam door|speelde mee|de reden|veroorzaakte)\b/i;
const actorPattern = /\b(klant|collega|team|manager|medewerker|leverancier|partner|eigenaar|afdeling|mensen|iemand)\b/i;
const timePattern = /\b(toen|daarna|ervoor|vooraf|later|eerst|vervolgens|sinds|iedere keer|vorige|vandaag|gisteren)\b/i;
const noGroundPattern = /^(weet ik (nog )?niet|geen idee|onbekend|geen antwoord)[.!]?$/i;

function compact(value: string, maximum = 150): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function meaningfulWords(value: string): string[] {
  return [...new Set((value.toLocaleLowerCase("nl-NL").match(/[a-zà-ÿ][a-zà-ÿ-]{3,}/g) ?? [])
    .filter((word) => !stopWords.has(word)))];
}

function latestActiveHypothesis(field: AtlasRuntimeField): RuntimeHypothesis | undefined {
  return [...field.hypotheses].reverse().find((hypothesis) => hypothesis.status === "active" || hypothesis.status === "candidate" || hypothesis.status === "contested");
}

function nextId(prefix: string, revision: number, index = 1): string {
  return `${prefix}-${revision}-${index}`;
}

function initialUnknown(): RuntimeUnknown {
  return {
    id: "unknown-0-1",
    kind: "concrete-event",
    question: "Welke concrete werksituatie bleef bij je hangen?",
    status: "asked",
    openedAtRevision: 0,
  };
}

export function createInitialRuntime(sessionId: string, participantId: string, timestamp: string): RuntimeView {
  const decision: RuntimeDecision = {
    revision: 0,
    kind: "question",
    movement: "free-telling",
    kicker: "Jouw moment",
    title: "Laten we beginnen bij één moment uit je werkdag.",
    question: "Welke werksituatie van vandaag bleef bij je hangen?",
    prompt: "Vertel alleen wat er gebeurde. Je hoeft nog niet te weten waarom het belangrijk is.",
    reason: "De inquiry begint bij één door de deelnemer gekozen werkelijkheidscontact.",
    canStop: true,
    requiresResponse: true,
    uncertainty: "glimpse",
    riskBoundary: "Geen bijzonder risico zichtbaar; iedere gedachte blijft voorlopig.",
    participantOptions: ["vertellen", "niet-weten benoemen", "stoppen"],
    continuation: "internal",
    foundationRefs: ["F · waarnemen", "CI · 5", "CE · 4.15", "RA-02"],
  };
  return {
    field: {
      schemaVersion: 1,
      architectureVersion: atlasRuntimeArchitectureVersion,
      sessionId,
      revision: 0,
      inquiryFrame: {
        purpose: "Samen één werksituatie beter begrijpen zonder al te adviseren.",
        phase: "investigate",
        mandate: "research-with-participant",
        participantIds: [participantId],
        scope: "Een door de deelnemer gekozen moment uit de eigen werkpraktijk.",
        excluded: ["advies", "diagnose", "automatische conclusie"],
        consent: "voluntary",
      },
      realityContacts: [],
      meanings: [],
      hypotheses: [],
      openUnknowns: [initialUnknown()],
      risk: { level: "ordinary", reasons: [], externalCorrectionRequired: false },
      worldKnowledge: [],
      attention: { focus: "concrete-event", reason: "Er is nog geen gebeurtenis ingebracht.", movement: "free-telling" },
      qualitativeConfidence: "glimpse",
      meta: { acceptedTransitions: 0, consecutiveNoChange: 0, lastChangeType: "initialization", consolidationCount: 0, lastConsolidatedRevision: 0 },
      updatedAt: timestamp,
    },
    decision,
  };
}

function currentUnknownKind(field: AtlasRuntimeField): RuntimeUnknown["kind"] {
  if (field.revision === 0) return "concrete-event";
  if (field.attention.focus === "concrete-event") return "concrete-event";
  if (field.attention.focus === "perspective") return "perspective";
  if (field.attention.focus === "time-boundary") return "time-boundary";
  if (field.attention.movement === "counterexample") return "counterexample";
  return "causal-distinction";
}

function markCurrentUnknown(field: AtlasRuntimeField, unknowns: RuntimeUnknown[], status: "resolved" | "parked"): RuntimeUnknown[] {
  const kind = currentUnknownKind(field);
  return unknowns.map((unknown) => unknown.kind === kind && (unknown.status === "open" || unknown.status === "asked") ? { ...unknown, status } : unknown);
}

function addAskedUnknown(field: AtlasRuntimeField, unknowns: RuntimeUnknown[], kind: RuntimeUnknown["kind"], question: string, hypothesisId?: string): RuntimeUnknown[] {
  const existing = unknowns.find((unknown) => unknown.kind === kind && unknown.hypothesisId === hypothesisId && unknown.status !== "resolved");
  if (existing) return unknowns.map((unknown) => unknown.id === existing.id ? { ...unknown, status: "asked", question } : unknown);
  return [...unknowns, {
    id: nextId("unknown", field.revision + 1, unknowns.length + 1),
    kind,
    question,
    status: "asked",
    hypothesisId,
    openedAtRevision: field.revision + 1,
  }];
}

function contributionMeaning(event: RuntimeContributionEvent, contactId: string, revision: number): RuntimeMeaning | undefined {
  if (!/\b(voelde|betekent|voor mij|ik wilde|ik dacht|ik merkte|belangrijk)\b/i.test(event.content)) return undefined;
  return {
    id: nextId("meaning", revision),
    type: "experiential",
    actorId: event.actorId,
    statement: compact(event.content),
    contactIds: [contactId],
    status: "participant-owned",
  };
}

function candidateHypothesis(field: AtlasRuntimeField, event: RuntimeContributionEvent, contactId: string): RuntimeHypothesis | undefined {
  if (!explanationPattern.test(event.content)) return undefined;
  const statement = compact(event.content);
  return {
    id: nextId("hypothesis", field.revision + 1, field.hypotheses.length + 1),
    statement,
    alternative: "De genoemde omstandigheden kunnen tegelijk aanwezig zijn zonder het moment volledig te verklaren.",
    status: "active",
    confidence: uncertaintyPattern.test(event.content) ? "glimpse" : "plausible",
    evidenceContactIds: [contactId],
    counterEvidenceContactIds: [],
    originRevision: field.revision + 1,
  };
}

function derivedConnectionHypothesis(field: AtlasRuntimeField, contactId: string): RuntimeHypothesis | undefined {
  if (field.realityContacts.length !== 2 || field.hypotheses.length > 0) return undefined;
  const first = field.realityContacts[0];
  const latest = field.realityContacts.at(-1)!;
  return {
    id: nextId("hypothesis", field.revision + 1, 1),
    statement: `“${compact(first.content, 72)}” en “${compact(latest.content, 72)}” zouden met elkaar kunnen samenhangen.`,
    alternative: "De twee beschreven details kunnen tegelijk aanwezig zijn zonder hetzelfde mechanisme te hebben.",
    status: "candidate",
    confidence: "glimpse",
    evidenceContactIds: [first.id, contactId],
    counterEvidenceContactIds: [],
    originRevision: field.revision + 1,
  };
}

function decisionFor(
  previous: AtlasRuntimeField,
  next: AtlasRuntimeField,
  event: RuntimeContributionEvent,
  changeType: string,
  noMeaningfulChange: boolean,
): RuntimeDecision {
  const active = latestActiveHypothesis(next);
  const originQuote = compact(event.content, 180);
  const common = {
    revision: next.revision,
    canStop: true as const,
    requiresResponse: true,
    originQuote,
    uncertainty: next.qualitativeConfidence,
    riskBoundary: next.risk.externalCorrectionRequired ? "Verdere talige afleiding is begrensd tot een externe werkelijkheidstoets." : "Iedere gedachte blijft voorlopig en corrigeerbaar.",
    participantOptions: ["bevestigen", "corrigeren", "een alternatief geven", "stoppen"],
    continuation: next.risk.externalCorrectionRequired ? "external-correction-required" as const : "internal" as const,
  };

  if (next.risk.externalCorrectionRequired) {
    return {
      ...common,
      kind: "external-correction",
      movement: "external-correction",
      kicker: "Eerst een veilige grens",
      title: "Hier wil ik niet alleen op woorden verder redeneren.",
      question: "Welke bevoegde persoon, bron of directe waarneming kan dit verantwoord helpen beoordelen?",
      prompt: "Je hoeft dit hier niet verder uit te leggen. Benoem alleen welke werkelijkheidstoets passend is, of laat dit onderwerp rusten.",
      reason: "Een mogelijk hoog-risicosignaal vereist externe correctie vóór verdere inhoudelijke afleiding.",
      foundationRefs: ["F · hiërarchie", "CE · 4.16", "CE · 20.7", "RA-11", "RA-14"],
    };
  }

  if (noMeaningfulChange && next.meta.consecutiveNoChange === 1 && previous.realityContacts.some((contact) => !noGroundPattern.test(contact.content) && contact.content.length >= 12)) {
    const question = "Wie zou ditzelfde moment vanuit een andere positie kunnen zien, en wat kon diegene werkelijk merken?";
    next.openUnknowns = addAskedUnknown(previous, next.openUnknowns, "perspective", question, active?.id);
    next.attention = { focus: "perspective", reason: "De huidige toets leverde geen nieuwe grond op; een ander waarnemingsperspectief kan meer onderscheid geven.", movement: "perspective" };
    return {
      ...common,
      kind: "question",
      movement: "perspective",
      kicker: "We kijken bewust anders",
      title: "Deze richting geeft nu geen nieuw onderscheid.",
      question,
      prompt: "Blijf bij wat die ander kon waarnemen; een intentie hoef je niet in te vullen.",
      reason: "Een opbrengstarme toets verplaatst de aandacht naar een bereikbare andere waarnemingspositie.",
      foundationRefs: ["CI · 14.5", "CE · 7.22", "CE · 11.3", "CE · 12.2–3", "RA-12"],
    };
  }

  if (noMeaningfulChange && next.meta.consecutiveNoChange === 2) {
    const question = "Welk ander moment in je werk is nu betekenisvoller om te onderzoeken?";
    next.openUnknowns = addAskedUnknown(previous, next.openUnknowns, "concrete-event", question);
    next.attention = { focus: "concrete-event", reason: "Twee bewegingen zonder opbrengst maken een ander, door de deelnemer gekozen moment waardevoller dan verder duwen.", movement: "free-telling" };
    return {
      ...common,
      kind: "question",
      movement: "free-telling",
      kicker: "Dit spoor mag rusten",
      title: "Ik wil niet langer op dezelfde gedachte blijven drukken.",
      question,
      prompt: "Je kunt ook bij dit moment blijven of voor vandaag stoppen; jij kiest de richting.",
      reason: "Na twee bewegingen zonder opbrengst parkeert Atlas de niet-toetsbare richting en opent hij ruimte voor een gekozen nieuw spoor.",
      foundationRefs: ["CI · 8.7", "CI · 14.5", "CE · 7.19", "CE · 19.2", "CE · 20.3", "RA-12"],
    };
  }

  if (noMeaningfulChange) {
    next.attention = { focus: "open-space", reason: "Verder vragen zou nu alleen de lus in leven houden; de deelnemer kan zelf nieuwe grond inbrengen.", movement: "silence" };
    return {
      ...common,
      kind: "silence",
      movement: "silence",
      kicker: "Ruimte zonder druk",
      title: "Ik stel nu niet opnieuw een vraag.",
      prompt: "Als een ander moment of een correctie bij je opkomt, kun je die zelf inbrengen. Je kunt dit ook laten rusten.",
      reason: "Na herhaalde no-change beschermt Atlas het onderzoek tegen geforceerde diepte en blijft de deelname open.",
      foundationRefs: ["CI · 14.5", "CE · 7.29", "CE · 11.6", "CE · 18", "CE · 24.8", "RA-12"],
    };
  }

  if (changeType === "correction") {
    return {
      ...common,
      kind: "question",
      movement: "correction",
      kicker: "Dan verandert mijn gedachte",
      title: "Je correctie maakt mijn eerdere richting minder houdbaar.",
      question: "Welk onderscheid moet ik volgens jou voortaan wél vasthouden?",
      prompt: "Zeg vooral wat ik niet opnieuw op één hoop mag leggen.",
      reason: "Een correctie krijgt werkelijk veranderingsrecht en opent een herzien onderzoeksbeeld.",
      foundationRefs: ["CI · 8", "CE · 7.25–26", "CE · 23.7–8", "RA-08"],
    };
  }

  if (changeType === "hypothesis-abandonment") {
    const question = "Welke gebeurtenis of andere verklaring past beter bij wat er werkelijk gebeurde?";
    next.openUnknowns = addAskedUnknown(previous, next.openUnknowns, "concrete-event", question);
    next.attention = { focus: "concrete-event", reason: "De eerdere hypothese is na herhaalde expliciete correctie losgelaten; de grondlaag krijgt opnieuw voorrang.", movement: "correction" };
    return {
      ...common,
      kind: "question",
      movement: "correction",
      kicker: "Die gedachte laat ik los",
      title: "Mijn eerdere verklaring is niet langer verantwoord.",
      question,
      prompt: "Een andere verklaring mag klein en voorlopig beginnen.",
      reason: "Herhaalde expliciete correctie weerlegt de hypothese in haar huidige vorm en heroriënteert het onderzoek op de gedeelde werkelijkheid.",
      foundationRefs: ["CI · 8.8", "CE · 7.5", "CE · 7.20", "CE · 23.7–8", "RA-07"],
    };
  }

  if (active && active.counterEvidenceContactIds.length === 0) {
    const question = "Wanneer gebeurde iets vergelijkbaars juist níét, of liep het merkbaar anders?";
    next.openUnknowns = addAskedUnknown(previous, next.openUnknowns, "counterexample", question, active.id);
    next.attention = { focus: active.id, reason: "De actieve hypothese heeft nog geen tegenvoorbeeld of grens.", movement: "counterexample" };
    return {
      ...common,
      kind: "question",
      movement: "counterexample",
      kicker: "Atlas toetst een mogelijkheid",
      title: "Dit kan een verband zijn, maar ik wil het niet te snel vastzetten.",
      question,
      prompt: "Een uitzondering helpt meer dan nog een bevestiging.",
      reason: "De actieve hypothese heeft een onderscheidende tegenaanwijzing of grens nodig.",
      foundationRefs: ["CI · 7–8", "CI · 17.1–3", "CE · 9", "CE · 23.6–7", "RA-07"],
    };
  }

  const words = meaningfulWords(event.content);
  const previousWords = new Set(previous.realityContacts.flatMap((item) => meaningfulWords(item.content)));
  const novel = words.find((word) => !previousWords.has(word));
  if (novel && previous.realityContacts.length >= 2) {
    const question = `Je noemt nu ook ‘${novel}’. Verandert dat je eerdere verklaring, of opent dit een ander spoor?`;
    next.openUnknowns = addAskedUnknown(previous, next.openUnknowns, "causal-distinction", question, active?.id);
    next.attention = { focus: novel, reason: "Een nieuw betekenisvol woord past nog niet vanzelf in het bestaande onderzoeksbeeld.", movement: "connect" };
    return {
      ...common,
      kind: "question",
      movement: "connect",
      kicker: "Er verandert iets in het beeld",
      title: "Je laatste antwoord voegt een nieuw mogelijk spoor toe.",
      question,
      prompt: "Kies alleen wat het dichtst bij jouw ervaring blijft.",
      reason: "Nieuwe informatie vraagt om onderscheid tussen verfijning en een zelfstandig spoor.",
      foundationRefs: ["CI · 10", "CI · 15", "CE · 7.7–10", "RA-12"],
    };
  }

  if (!actorPattern.test(event.content) && !next.openUnknowns.some((unknown) => unknown.kind === "perspective" && unknown.status === "asked")) {
    const question = "Wie kon dit moment anders zien of er iets anders van merken dan jij?";
    next.openUnknowns = addAskedUnknown(previous, next.openUnknowns, "perspective", question, active?.id);
    next.attention = { focus: "perspective", reason: "Het onderzoeksbeeld bevat nog maar één waarnemingspositie.", movement: "perspective" };
    return {
      ...common,
      kind: "question",
      movement: "perspective",
      kicker: "Nog één perspectief",
      title: "Ik zie dit moment nu alleen vanuit jouw positie.",
      question,
      prompt: "Noem alleen wat die ander kon zien of ervaren; vul geen intentie in.",
      reason: "Een tweede actor kan relationele betekenis zichtbaar maken zonder innerlijke betekenis over te nemen.",
      foundationRefs: ["CI · 13", "CE · 4.3", "CE · 14.4", "RA-09"],
    };
  }

  if (!timePattern.test(event.content)) {
    const question = "Wat gebeurde er direct vóór dit moment, en wat veranderde er meteen erna?";
    next.openUnknowns = addAskedUnknown(previous, next.openUnknowns, "time-boundary", question, active?.id);
    next.attention = { focus: "time-boundary", reason: "Volgorde en mogelijke werking zijn nog niet onderscheiden.", movement: "time-shift" };
    return {
      ...common,
      kind: "question",
      movement: "time-shift",
      kicker: "Kijken naar de volgorde",
      title: "De volgorde kan veranderen wat hier oorzaak of gevolg lijkt.",
      question,
      prompt: "Blijf bij wat je werkelijk zag gebeuren.",
      reason: "Tijd en context begrenzen causale afleiding.",
      foundationRefs: ["CI · 13", "CE · 4.15", "CE · 7.13", "RA-02"],
    };
  }

  return {
    ...common,
    kind: "question",
    movement: "concretize",
    kicker: "Atlas blijft onderzoeken",
    title: "Je antwoord verandert het beeld, maar maakt het nog niet af.",
    question: "Welk concreet detail zou mijn huidige lezing het sterkst kunnen veranderen?",
    prompt: "Een correctie, uitzondering of ontbrekende gebeurtenis is welkom.",
    reason: "De huidige gedachte blijft voorlopig en zoekt de meest onderscheidende volgende grond.",
    foundationRefs: ["CI · 15", "CI · 22", "CE · 11", "CE · 23.2", "RA-12"],
  };
}

function shouldConsolidate(field: AtlasRuntimeField): boolean {
  const activeUnknowns = field.openUnknowns.filter((unknown) => unknown.status === "open" || unknown.status === "asked").length;
  return activeUnknowns > 8 || field.revision - field.meta.lastConsolidatedRevision >= 10;
}

function consolidate(field: AtlasRuntimeField): AtlasRuntimeField {
  const seen = new Set<string>();
  const unknowns = [...field.openUnknowns].reverse().filter((unknown) => {
    const key = `${unknown.kind}:${unknown.hypothesisId ?? "field"}:${unknown.status}`;
    if (unknown.status === "resolved" && seen.has(key)) return false;
    seen.add(key);
    return true;
  }).reverse();
  return {
    ...field,
    openUnknowns: unknowns,
    meta: {
      ...field.meta,
      consolidationCount: field.meta.consolidationCount + 1,
      lastConsolidatedRevision: field.revision,
    },
  };
}

function constitutionalGate(previous: AtlasRuntimeField, next: AtlasRuntimeField, decision: RuntimeDecision, changeType: string): RuntimeJournalEntry["gateStatus"] {
  if (next.sessionId !== previous.sessionId || next.inquiryFrame.mandate !== previous.inquiryFrame.mandate) throw new Error("RUNTIME_GATE_REJECTED");
  if (next.revision !== previous.revision + 1) throw new Error("RUNTIME_GATE_REJECTED");
  if (!decision.reason || decision.foundationRefs.length === 0 || decision.canStop !== true) throw new Error("RUNTIME_GATE_REJECTED");
  if (next.hypotheses.some((hypothesis) => !hypothesis.alternative || hypothesis.evidenceContactIds.length === 0)) throw new Error("RUNTIME_GATE_REJECTED");
  if (next.risk.externalCorrectionRequired && (decision.kind !== "external-correction" || decision.continuation !== "external-correction-required")) throw new Error("RUNTIME_GATE_REJECTED");
  if (changeType === "no-meaningful-change" && decision.reason.includes("verband gevormd")) throw new Error("RUNTIME_GATE_REJECTED");
  return next.risk.externalCorrectionRequired ? "external-correction-required" : changeType === "no-meaningful-change" ? "no-change" : "accepted";
}

export function transitionRuntime(field: AtlasRuntimeField, event: RuntimeContributionEvent): RuntimeTransitionResult {
  if (event.inquiryId !== field.sessionId) throw new Error("RUNTIME_INQUIRY_MISMATCH");
  if (event.baseRevision !== field.revision) throw new Error("RUNTIME_STALE_REVISION");
  const content = event.content.replaceAll("\0", "").trim();
  if (!content || content.length > 1600) throw new Error("RUNTIME_INVALID_CONTRIBUTION");

  const revision = field.revision + 1;
  const contact: RuntimeRealityContact = {
    id: nextId("contact", revision, field.realityContacts.length + 1),
    eventId: event.id,
    kind: "participant-contribution",
    actorId: event.actorId,
    directness: "self-report",
    content,
    observedAt: event.observedAt,
    receivedAt: event.receivedAt,
    foundationRefs: ["F · waarnemen", "CE · 4.15", "RA-02"],
  };

  const noMeaningfulChange = content.length < 12 || noGroundPattern.test(content);
  const correction = correctionPattern.test(content) && field.hypotheses.length > 0;
  const risk = highRiskPattern.test(content)
    ? { level: "potential-high" as const, reasons: ["De bijdrage bevat een mogelijk hoog-risicosignaal dat niet alleen talig mag worden onderzocht."], externalCorrectionRequired: true }
    : field.risk;
  let unknowns = markCurrentUnknown(field, field.openUnknowns, noMeaningfulChange ? "parked" : "resolved");
  const meaning = contributionMeaning(event, contact.id, revision);
  const hypotheses = field.hypotheses.map((hypothesis) => ({ ...hypothesis, evidenceContactIds: [...hypothesis.evidenceContactIds], counterEvidenceContactIds: [...hypothesis.counterEvidenceContactIds] }));
  const activeBefore = latestActiveHypothesis(field);
  let changeType = noMeaningfulChange ? "no-meaningful-change" : "addition";

  if (correction && activeBefore) {
    const target = hypotheses.find((hypothesis) => hypothesis.id === activeBefore.id)!;
    target.counterEvidenceContactIds.push(contact.id);
    if (target.status === "contested" && target.confidence === "weakened") {
      target.status = "abandoned";
      target.confidence = "weakened";
      target.deathReason = "refuted-same-conditions";
      changeType = "hypothesis-abandonment";
    } else {
      target.status = "contested";
      target.confidence = "weakened";
      changeType = "correction";
    }
  } else if (!noMeaningfulChange) {
    const explicit = candidateHypothesis(field, event, contact.id);
    if (explicit) {
      hypotheses.push(explicit);
      changeType = "alternative-formation";
    } else if (field.realityContacts.length === 1 && field.hypotheses.length === 0) {
      const withCurrentContact: AtlasRuntimeField = { ...field, realityContacts: [...field.realityContacts, contact] };
      const connected = derivedConnectionHypothesis(withCurrentContact, contact.id);
      if (connected) {
        hypotheses.push(connected);
        changeType = "hypothesis-formation";
      }
    } else if (activeBefore && field.attention.movement === "counterexample") {
      const target = hypotheses.find((hypothesis) => hypothesis.id === activeBefore.id);
      if (target) {
        target.counterEvidenceContactIds.push(contact.id);
        target.status = "contested";
        target.confidence = "bounded";
        changeType = "boundary-formation";
      }
    }
  }

  if (noMeaningfulChange) {
    const nextNoChange = field.meta.consecutiveNoChange + 1;
    if (activeBefore && nextNoChange >= 2) {
      const target = hypotheses.find((hypothesis) => hypothesis.id === activeBefore.id);
      if (target) {
        target.status = "parked";
        target.confidence = "weakened";
        changeType = "hypothesis-parking";
      }
    } else {
      changeType = "attention-shift";
    }
  }

  let next: AtlasRuntimeField = {
    ...field,
    revision,
    realityContacts: [...field.realityContacts, contact],
    meanings: meaning ? [...field.meanings, meaning] : [...field.meanings],
    hypotheses,
    openUnknowns: unknowns,
    risk,
    qualitativeConfidence: latestActiveHypothesis({ ...field, hypotheses } as AtlasRuntimeField)?.confidence ?? hypotheses.at(-1)?.confidence ?? field.qualitativeConfidence,
    attention: { ...field.attention },
    meta: {
      ...field.meta,
      acceptedTransitions: field.meta.acceptedTransitions + 1,
      consecutiveNoChange: noMeaningfulChange ? field.meta.consecutiveNoChange + 1 : 0,
      lastChangeType: changeType,
    },
    updatedAt: event.receivedAt,
  };

  const decision = decisionFor(field, next, { ...event, content }, changeType, noMeaningfulChange);
  next.attention = { ...next.attention, movement: decision.movement };
  if (shouldConsolidate(next)) next = consolidate(next);
  const gateStatus = constitutionalGate(field, next, decision, changeType);
  const journalEntry: RuntimeJournalEntry = {
    eventId: event.id,
    eventType: event.type,
    baseRevision: field.revision,
    committedRevision: next.revision,
    changeType,
    gateStatus,
    affectedContactIds: [contact.id],
    affectedHypothesisIds: next.hypotheses.filter((hypothesis) => {
      const before = field.hypotheses.find((candidate) => candidate.id === hypothesis.id);
      return hypothesis.originRevision === revision
        || hypothesis.counterEvidenceContactIds.includes(contact.id)
        || Boolean(before && (before.status !== hypothesis.status || before.confidence !== hypothesis.confidence || before.deathReason !== hypothesis.deathReason));
    }).map((hypothesis) => hypothesis.id),
    foundationRefs: [...new Set([...contact.foundationRefs, ...decision.foundationRefs])],
    decision,
    createdAt: event.receivedAt,
  };
  return { field: next, decision, journalEntry };
}

export function resumeRuntime(field: AtlasRuntimeField, event: RuntimeResumeEvent): RuntimeTransitionResult {
  if (event.inquiryId !== field.sessionId) throw new Error("RUNTIME_INQUIRY_MISMATCH");
  if (event.baseRevision !== field.revision) throw new Error("RUNTIME_STALE_REVISION");
  const revision = field.revision + 1;
  const externalCorrectionRequired = field.risk.externalCorrectionRequired;
  const question = externalCorrectionRequired
    ? "Welke bevoegde persoon, bron of directe waarneming kan dit inmiddels verantwoord helpen beoordelen?"
    : "Wat is er sinds ons vorige gesprek veranderd — in de situatie, in jouw blik erop, of juist helemaal niet?";
  let next: AtlasRuntimeField = {
    ...field,
    revision,
    openUnknowns: addAskedUnknown(field, field.openUnknowns, "time-boundary", question, latestActiveHypothesis(field)?.id),
    attention: { focus: "resume-context", reason: "Verstreken tijd en context mogen niet stilzwijgend als onveranderd worden aangenomen.", movement: externalCorrectionRequired ? "external-correction" : "time-shift" },
    meta: { ...field.meta, acceptedTransitions: field.meta.acceptedTransitions + 1, consecutiveNoChange: 0, lastChangeType: "resume-revalidation" },
    updatedAt: event.receivedAt,
  };
  if (shouldConsolidate(next)) next = consolidate(next);
  const decision: RuntimeDecision = {
    revision,
    kind: externalCorrectionRequired ? "external-correction" : "question",
    movement: externalCorrectionRequired ? "external-correction" : "time-shift",
    kicker: "De draad opnieuw opnemen",
    title: externalCorrectionRequired ? "De eerdere veiligheidsgrens blijft actief." : "We beginnen niet alsof er niets is veranderd.",
    question,
    prompt: externalCorrectionRequired ? "Ga niet alleen op woorden verder; laat dit onderwerp anders rusten." : "‘Er is niets veranderd’ is ook een geldig antwoord.",
    reason: "Hervatten herijkt tijd, context, onderzoeksframe en actualiteit vóór een nieuwe inhoudelijke beweging.",
    canStop: true,
    requiresResponse: true,
    uncertainty: next.qualitativeConfidence,
    riskBoundary: next.risk.externalCorrectionRequired ? "Een eerdere risicogrens blijft actief totdat externe correctie beschikbaar is." : "Eerdere gedachten blijven voorlopig en corrigeerbaar.",
    participantOptions: ["verandering benoemen", "onveranderdheid bevestigen", "corrigeren", "stoppen"],
    continuation: next.risk.externalCorrectionRequired ? "external-correction-required" : "internal",
    foundationRefs: ["CI · 9", "CE · 4.0", "CE · 13.4", "CE · 20.6", "RA-17"],
  };
  const gateStatus = constitutionalGate(field, next, decision, "resume-revalidation");
  const journalEntry: RuntimeJournalEntry = {
    eventId: event.id,
    eventType: event.type,
    baseRevision: field.revision,
    committedRevision: revision,
    changeType: "resume-revalidation",
    gateStatus,
    affectedContactIds: [],
    affectedHypothesisIds: [],
    foundationRefs: decision.foundationRefs,
    decision,
    createdAt: event.receivedAt,
  };
  return { field: next, decision, journalEntry };
}
