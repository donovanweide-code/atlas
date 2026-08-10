import type { RuntimeView } from "./atlas-runtime.ts";
import { atlasRuntimeExperienceVersion } from "./atlas-runtime.ts";

export const experienceVersion = atlasRuntimeExperienceVersion;
export const flowRecompositionVersion = "5.0-flow-recomposition-v1";
export const livingResearchLoopVersion = "4.0-living-research-loop-v1";
export const conversationInsightVersion = "3.0-conversation-insight-v1";

export const experienceStepDefinitions = [
  {
    id: "moment",
    number: 1,
    label: "Vertellen",
    question: "Welke werksituatie van vandaag bleef bij je hangen?",
    prompt: "Neem één concreet moment. Klein is goed.",
    examples: "Bijvoorbeeld wachten, overdragen, zoeken, opnieuw uitleggen of een planning die verschoof.",
    action: "Ga verder",
    acknowledgement: "Laten we één stap dichterbij kijken.",
    transition: "De volgende vraag komt voort uit wat je vertelde.",
    summaryLabel: "Wat er gebeurde",
  },
  {
    id: "attention",
    number: 2,
    label: "Verhelderen",
    question: "Wat gebeurde er direct vóór dit moment?",
    prompt: "Vertel alleen wat je toen zag gebeuren.",
    examples: "",
    action: "Bekijk een mogelijke richting",
    acknowledgement: "Mag ik je een gedachte voorleggen?",
    transition: "Dit is een mogelijkheid om samen te toetsen, geen conclusie.",
    summaryLabel: "Wat mogelijk meespeelde",
  },
] as const;

const livingResearchLoopStepDefinitions = [
  {
    id: "moment", number: 1, label: "Vertellen", question: "Welke werksituatie van vandaag bleef bij je hangen?",
    prompt: "Beschrijf alleen wat er gebeurde. Je hoeft nog niet te weten waarom het belangrijk is.", examples: "Misschien helpt dit je herinneren: een overdracht, planning, klantvraag, e-mail, Excel, papier of informatie zoeken in meerdere systemen.",
    action: "Vertel dit moment", acknowledgement: "Dank je. We beginnen bij wat jij werkelijk meemaakte.", transition: "Om niet te snel iets in te vullen, kijken we eerst naar wat dit moment volgens jou zo liet verlopen.", summaryLabel: "Wat er gebeurde",
  },
  {
    id: "attention", number: 2, label: "Verhelderen", question: "Wat maakte volgens jou dat dit moment zo verliep?",
    prompt: "Noem wat volgens jou meespeelde. Een vermoeden is genoeg; dit hoeft nog geen conclusie te zijn.", examples: "Denk bijvoorbeeld aan wachten, onduidelijke afspraken, informatie op meerdere plekken, een overdracht, een leverancier of afhankelijkheid van een collega.",
    action: "Neem deze verheldering mee", acknowledgement: "Dank je. Dit blijft jouw eerste verheldering; we nemen nog niets aan.", transition: "Je beschreef wat er gebeurde en wat volgens jou meespeelde. We geven eerst rustig terug wat daarin zichtbaar wordt; daarna bepaal jij wat volgt.", summaryLabel: "Wat mogelijk meespeelde",
  },
] as const;

const conversationInsightStepDefinitions = [
  {
    id: "moment", number: 1, label: "Wat gebeurde er?",
    question: "Welke werksituatie van vandaag bleef bij je hangen?",
    prompt: "Beschrijf alleen wat er gebeurde. Je hoeft nog niet te weten waarom het belangrijk is.",
    examples: "Misschien helpt dit je herinneren: een overdracht, planning, klantvraag, e-mail, Excel, papier of informatie zoeken in meerdere systemen.",
    action: "Neem deze situatie mee", acknowledgement: "Dank je. Deze situatie nemen we mee.",
    transition: "Je hebt beschreven wat er gebeurde. Nu onderzoeken we rustig wat eraan bijdroeg.", summaryLabel: "De situatie",
  },
  {
    id: "attention", number: 2, label: "Wat zat erachter?", question: "Wat maakte dat deze situatie zo verliep?",
    prompt: "Noem wat volgens jou meespeelde. Een vermoeden is genoeg; dit hoeft nog geen conclusie te zijn.",
    examples: "Denk bijvoorbeeld aan wachten, onduidelijke afspraken, informatie op meerdere plekken, een overdracht, een leverancier of afhankelijkheid van een collega.",
    action: "Neem deze aanleiding mee", acknowledgement: "Dank je. We behandelen dit als jouw eerste verklaring, niet als een vaststaand antwoord.",
    transition: "Je noemt wat er mogelijk achter zat. Nu kijken we wie binnen de organisatie de gevolgen merkte.", summaryLabel: "Wat mogelijk meespeelde",
  },
  {
    id: "energy", number: 3, label: "Wie merkte het intern?", question: "Wie binnen je organisatie merkte hier iets van, en waaraan?",
    prompt: "Dat mag jijzelf zijn, maar ook een collega, team of andere afdeling. Beschrijf alleen het merkbare gevolg.",
    examples: "Bijvoorbeeld opnieuw werk doen, wachten, extra afstemmen, een planning aanpassen of informatie nogmaals opzoeken.",
    action: "Neem dit gevolg mee", acknowledgement: "Dank je. Zo wordt zichtbaar waar de situatie binnen de organisatie doorwerkte.",
    transition: "Een gevolg stopt niet altijd bij het team. We kijken nog één stap naar buiten.", summaryLabel: "Het interne gevolg",
  },
  {
    id: "natural", number: 4, label: "Wie merkte het buiten de organisatie?", question: "Wie buiten je organisatie kon hier iets van merken, en wat dan?",
    prompt: "Denk aan een klant, leverancier of partner. Als niemand buiten de organisatie dit merkte, mag je dat ook zeggen.",
    examples: "Bijvoorbeeld langer wachten, opnieuw informatie geven, onduidelijkheid ervaren of later antwoord krijgen.",
    action: "Bekijk de hele keten", acknowledgement: "Dank je. Je hebt nu niet alleen de situatie, maar ook de mogelijke gevolgen eromheen beschreven.",
    transition: "Je woorden vormen een eerste keten van gebeurtenis, mogelijke oorzaak, gevolg en impact. We kijken nu voorzichtig wat daarin opvalt.", summaryLabel: "De externe impact",
  },
] as const;

const legacyExperienceStepDefinitions = [
  { id: "moment", number: 1, label: "We beginnen bij vandaag", question: "Als je aan vandaag terugdenkt: welk moment bleef bij je hangen?", prompt: "Dat mag iets kleins zijn. Je hoeft nog niet te weten waarom het belangrijk is.", examples: "", action: "Neem dit moment mee", acknowledgement: "Dank je. Dit nemen we mee.", transition: "Een moment zegt wat er gebeurde. Nu kijken we naar wat ruimte innam.", summaryLabel: "Dit bleef bij je" },
  { id: "attention", number: 2, label: "Wat ruimte innam", question: "Waar ging vandaag meer tijd of aandacht naartoe dan je wilde?", prompt: "Denk aan iets dat terugkwam, onderbrak of meer ruimte innam dan goed voelde.", examples: "", action: "Neem dit mee", acknowledgement: "Dank je. Je woorden blijven bij deze ervaring.", transition: "Wat tijd kost en wat energie kost, is niet altijd hetzelfde.", summaryLabel: "Hier ging je aandacht heen" },
  { id: "energy", number: 3, label: "Wat het van je vroeg", question: "Welk deel van je dag voelde zwaarder dan nodig?", prompt: "Een kort of onzeker antwoord is ook goed. Je mag dit moment ook open laten.", examples: "", action: "Neem dit mee", acknowledgement: "Dank je. Je hoeft dit nog niet op te lossen.", transition: "Je hebt beschreven wat er gebeurde en wat het van je vroeg. Nog één moment, zonder een oplossing te hoeven bedenken.", summaryLabel: "Dit voelde zwaarder dan nodig" },
  { id: "natural", number: 4, label: "Wat natuurlijker mocht", question: "Als één moment van vandaag natuurlijker had mogen verlopen, welk moment kies je dan?", prompt: "Je hoeft geen oplossing te bedenken. Alleen het moment aanwijzen is genoeg.", examples: "", action: "Bekijk mijn woorden", acknowledgement: "Dank je. Kijk nu rustig terug naar wat je zelf onder woorden bracht.", transition: "We voegen geen advies of conclusie toe. Jij bepaalt wat hiervan betekenis heeft.", summaryLabel: "Dit mocht natuurlijker" },
] as const;

export type ExperienceStepId = "moment" | "attention" | "energy" | "natural";
export type ExperiencePhase = "welcome" | "runtime" | "question" | "listening" | "summary" | "insight" | "explore" | "choice" | "workspace" | "completed";
export type InvitationStatus = "created" | "opened" | "started" | "completed" | "revoked";
export type ExperienceEntryType = "personal" | "organic";
export type InsightRecognition = "yes" | "partly" | "not-yet";
export type InsightExplorationTopic = "why" | "evidence" | "customers" | "colleagues" | "begin" | "other";

export interface ExperienceReflection {
  topic: InsightExplorationTopic;
  response?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceAnswer {
  stepId: ExperienceStepId;
  answer: string;
  submittedAt: string;
}

export interface ExperienceSession {
  id: string;
  invitationId: string;
  phase: ExperiencePhase;
  currentStep: number;
  answers: ExperienceAnswer[];
  insightRecognition?: InsightRecognition;
  activeReflectionTopic?: InsightExplorationTopic;
  reflections: ExperienceReflection[];
  chosenStepId?: ExperienceStepId;
  workspaceOpened: boolean;
  version: string;
  startedAt: string;
  completedAt?: string;
  lastActiveAt: string;
  returned?: boolean;
  runtime?: RuntimeView;
}

export interface ParticipantState {
  invitationId: string;
  participantId?: string;
  invitationStatus: InvitationStatus;
  entryType: ExperienceEntryType;
  description?: string;
  participantName?: string;
  participantRole?: string;
  participantOrganization?: string;
  referralId?: string;
  expiresAt?: string;
  session?: ExperienceSession;
}

export interface OrganicParticipantInput {
  name: string;
  role?: string;
  organization?: string;
  referralId?: string;
  technicalTest?: boolean;
}

export interface ExperienceFeedbackInput {
  expected: string;
  happened: string;
  natural: string;
}

export interface SummaryItem {
  stepId: ExperienceStepId;
  label: string;
  answer: string;
}

export interface ExperienceInsight {
  hasEvidence: boolean;
  headline: string;
  explanation: string;
  evidence: SummaryItem[];
}

export interface FlowPrompt {
  question: string;
  prompt: string;
  signal: "information" | "handoff" | "customer" | "planning" | "general";
}

export interface ExperienceCheckpoint {
  schemaVersion: 2;
  invitationId: string;
  sessionId?: string;
  draftStepId?: ExperienceStepId | "runtime";
  draft?: string;
  updatedAt: string;
}

const checkpointKey = "wbd-experience-validation-v2-checkpoint";

export function stepsForSession(session: Pick<ExperienceSession, "version">) {
  if (session.version === flowRecompositionVersion) return experienceStepDefinitions;
  if (session.version === livingResearchLoopVersion) return livingResearchLoopStepDefinitions;
  if (session.version === conversationInsightVersion) return conversationInsightStepDefinitions;
  return legacyExperienceStepDefinitions;
}

export function stepById(stepId: ExperienceStepId, version = flowRecompositionVersion) {
  const definitions = version === flowRecompositionVersion
    ? experienceStepDefinitions
    : version === livingResearchLoopVersion
      ? livingResearchLoopStepDefinitions
    : version === conversationInsightVersion
      ? conversationInsightStepDefinitions
      : legacyExperienceStepDefinitions;
  return definitions.find((step) => step.id === stepId)!;
}

function signalFor(text: string): FlowPrompt["signal"] {
  const normalized = text.toLocaleLowerCase("nl-NL");
  if (/informatie|zoeken|zocht|e-?mail|excel|word|papier|systeem|bestand|document|versie/.test(normalized)) return "information";
  if (/\b(wacht|wachten|wachtte|overdracht|collega|team|afstemmen|doorgeven|uitleggen|opnieuw|dubbel)\b/.test(normalized)) return "handoff";
  if (/klant|opdrachtgever|leverancier|partner|bezoeker/.test(normalized)) return "customer";
  if (/planning|plannen|deadline|agenda|rooster/.test(normalized)) return "planning";
  return "general";
}

export function flowPromptFor(session: ExperienceSession): FlowPrompt {
  const moment = session.answers.find((answer) => answer.stepId === "moment")?.answer ?? "";
  const signal = signalFor(moment);
  return ({
    information: { signal, question: "Waar stond de informatie die je op dat moment nodig had?", prompt: "Noem de plekken of mensen waar je moest kijken." },
    handoff: { signal, question: "Wie moest wachten, opnieuw beginnen of iets extra uitleggen?", prompt: "Eén merkbaar gevolg is genoeg." },
    customer: { signal, question: "Wat merkte de klant of leverancier hier als eerste van?", prompt: "Blijf bij wat diegene kon zien of ervaren." },
    planning: { signal, question: "Wat gebeurde er vlak voordat de planning begon te schuiven?", prompt: "Neem het laatste concrete moment ervoor." },
    general: { signal, question: "Wat gebeurde er direct vóór dit moment?", prompt: "Vertel alleen wat je toen zag gebeuren." },
  } as const)[signal];
}

export function flowObservationFor(session: ExperienceSession): string {
  const signal = signalFor(session.answers.map((answer) => answer.answer).join(" "));
  if (signal === "information") return "Zou het kunnen dat niet het zoeken zelf, maar het verspreid staan of overdragen van informatie hier frictie gaf? Of lag het vooral aan onduidelijkheid over wat actueel was?";
  if (signal === "handoff") return "Zou het kunnen dat het moment vooral stroef werd op de overgang tussen mensen? Of zat de vertraging al eerder in onduidelijke afspraken?";
  if (signal === "customer") return "Zou het kunnen dat een intern werkmoment eerder zichtbaar wordt voor de klant dan je organisatie merkt? Of was dit juist een eenmalige uitzondering?";
  if (signal === "planning") return "Zou het kunnen dat de verschoven planning een gevolg was van iets dat eerder onzichtbaar bleef? Of zat het vooral in één onverwachte gebeurtenis?";
  return "Ik weet niet of dit hier speelt, maar ik zie twee mogelijke richtingen: dit was een losse gebeurtenis, of het maakte een terugkerende frictie zichtbaar. Welke komt het dichtst in de buurt?";
}

export function summaryItems(session: ExperienceSession): SummaryItem[] {
  return stepsForSession(session).flatMap((step) => {
    const answer = session.answers.find((item) => item.stepId === step.id);
    return answer ? [{ stepId: step.id, label: step.summaryLabel, answer: answer.answer }] : [];
  });
}

function isSubstantive(answer?: string): boolean {
  if (!answer) return false;
  const normalized = answer.trim().toLocaleLowerCase("nl-NL");
  return normalized.length >= 18
    && normalized !== "weet ik nog niet."
    && !/^(weet ik (nog )?niet|geen idee|onbekend)\b/.test(normalized);
}

export function deriveFirstInsight(session: ExperienceSession): ExperienceInsight {
  const items = summaryItems(session);
  const byStep = new Map(items.map((item) => [item.stepId, item]));
  const evidence = [byStep.get("moment"), byStep.get("attention"), byStep.get("energy"), byStep.get("natural")]
    .filter((item): item is SummaryItem => Boolean(item && isSubstantive(item.answer)));
  const hasLivingGrounding = [flowRecompositionVersion, livingResearchLoopVersion].includes(session.version)
    && isSubstantive(byStep.get("moment")?.answer)
    && isSubstantive(byStep.get("attention")?.answer);
  const hasConversationChain = session.version === conversationInsightVersion
    && isSubstantive(byStep.get("moment")?.answer)
    && isSubstantive(byStep.get("attention")?.answer)
    && (isSubstantive(byStep.get("energy")?.answer) || isSubstantive(byStep.get("natural")?.answer));
  const hasChain = hasLivingGrounding || hasConversationChain;

  if (!hasChain) {
    return {
      hasEvidence: false,
      headline: "We zien nog niet genoeg voor een eerlijk eerste inzicht.",
      explanation: session.version === flowRecompositionVersion
        ? "Ik zie nog geen zorgvuldige verbinding. Eén gerichte vraag kan helpen; als die er niet is, laten we het voor nu open."
        : session.version === livingResearchLoopVersion
          ? "Je woorden zijn waardevol, maar de verbinding tussen wat er gebeurde en wat volgens jou meespeelde is nog niet duidelijk genoeg. Daarom vullen we niets voor je in."
        : "Je woorden zijn waardevol, maar de verbinding tussen wat er gebeurde, wat eraan bijdroeg en wie de gevolgen merkte is nog niet duidelijk genoeg. Daarom vullen we niets voor je in.",
      evidence,
    };
  }

  return {
    hasEvidence: true,
    headline: session.version === flowRecompositionVersion
      ? "Mag ik je een gedachte voorleggen?"
      : session.version === livingResearchLoopVersion
        ? "Dit moment lijkt niet los te staan van wat volgens jou meespeelde."
      : "Eén werksituatie lijkt verder door te werken dan het eerste moment.",
    explanation: session.version === flowRecompositionVersion
      ? flowObservationFor(session)
      : session.version === livingResearchLoopVersion
        ? "Je beschrijft eerst een concrete gebeurtenis en daarna wat die situatie volgens jou zo liet verlopen. Dat mogelijke verband komt rechtstreeks uit jouw twee antwoorden. Het is nog geen conclusie; eerst horen we graag of jij het herkent."
      : "Je beschrijft eerst een concrete gebeurtenis, daarna wat er volgens jou aan bijdroeg en vervolgens wie de gevolgen merkte. Juist die verbinding viel op. Het kan betekenen dat een dagelijks werkmoment niet op zichzelf staat. Dat is nog geen conclusie, maar een eerste spoor om samen te toetsen.",
    evidence: evidence.slice(0, 4),
  };
}

export function selectedSummaryItem(session: ExperienceSession): SummaryItem | undefined {
  return session.chosenStepId
    ? summaryItems(session).find((item) => item.stepId === session.chosenStepId)
    : undefined;
}

export function saveCheckpoint(checkpoint: ExperienceCheckpoint): void {
  try {
    const current = loadCheckpoint();
    const preserveDraft = current?.invitationId === checkpoint.invitationId
      && current.sessionId === checkpoint.sessionId
      && checkpoint.draftStepId === undefined
      && checkpoint.draft === undefined;
    localStorage.setItem(checkpointKey, JSON.stringify(preserveDraft ? { ...current, ...checkpoint } : checkpoint));
  } catch {
    // Centrale opslag blijft leidend; een lokale herstelcache mag de ervaring nooit blokkeren.
  }
}

export function loadCheckpoint(): ExperienceCheckpoint | undefined {
  try {
    const raw = localStorage.getItem(checkpointKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<ExperienceCheckpoint>;
    if (parsed.schemaVersion !== 2 || typeof parsed.invitationId !== "string" || typeof parsed.updatedAt !== "string") {
      return undefined;
    }
    return parsed as ExperienceCheckpoint;
  } catch {
    return undefined;
  }
}

export function clearCheckpoint(): void {
  try {
    localStorage.removeItem(checkpointKey);
  } catch {
    // Een niet-beschikbare lokale cache verandert niets aan de centrale sessie.
  }
}
