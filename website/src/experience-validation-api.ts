import type {
  ExperienceFeedbackInput,
  ExperienceEntryType,
  OrganicParticipantInput,
  ExperienceSession,
  ExperienceStepId,
  InsightExplorationTopic,
  InsightRecognition,
  InvitationStatus,
  ParticipantState,
} from "./experience-store";
import type { RuntimeMovement } from "./atlas-runtime.ts";
import type { FirstVisitContextState, FirstVisitInput } from "./atlas-first-visit.ts";

export interface FirstVisitCreateResult {
  token: string;
  context: FirstVisitContextState;
}

export interface ObservatoryCounts {
  invitations: number;
  organicEntries: number;
  organicStarted: number;
  organicResumed: number;
  sharedEntries: number;
  opened: number;
  started: number;
  completed: number;
  returned: number;
  feedback: number;
  lastActivity?: string;
}

export interface ObservatoryInvitation {
  id: string;
  description?: string;
  status: InvitationStatus;
  entryType: ExperienceEntryType;
  participantName?: string;
  participantRole?: string;
  participantOrganization?: string;
  referralId?: string;
  createdAt: string;
  openedAt?: string;
  startedAt?: string;
  completedAt?: string;
  lastActiveAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  technicalTest: boolean;
}

export interface ObservatoryEvent {
  id: string;
  type: "invitation_opened" | "organic_entry_created" | "organic_shared_entry_created" | "organic_participant_resumed" | "experience_started" | "question_answered" | "runtime_transition_committed" | "runtime_external_correction_required" | "insight_recognized" | "insight_explored" | "insight_reflection_saved" | "insight_exploration_finished" | "experience_completed" | "workspace_opened" | "experience_returned" | "feedback_submitted";
  stepId?: ExperienceStepId | InsightRecognition | InsightExplorationTopic | RuntimeMovement;
  createdAt: string;
}

export interface ObservatoryFeedback extends ExperienceFeedbackInput {
  id: string;
  createdAt: string;
}

export interface ObservatoryObservation {
  expected: string;
  surprising: string;
  valuable: string;
  confusing: string;
  improvement: string;
  updatedAt?: string;
}

export interface ObservatoryDetail {
  invitation: ObservatoryInvitation;
  session?: ExperienceSession;
  events: ObservatoryEvent[];
  feedback: ObservatoryFeedback[];
  observation: ObservatoryObservation;
}

export interface ObservatoryOverview {
  counts: ObservatoryCounts;
  invitations: ObservatoryInvitation[];
}

export class ExperienceApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ExperienceApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("X-WBD-Experience", "1");
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const response = await fetch(`/api/${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({ error: "De omgeving gaf geen leesbaar antwoord." })) as {
    data?: T;
    error?: string;
    code?: string;
  };
  if (!response.ok || payload.error) {
    throw new ExperienceApiError(payload.error ?? "Deze handeling kon niet worden uitgevoerd.", response.status, payload.code);
  }
  return payload.data as T;
}

export const experienceApi = {
  createFirstVisit(input: FirstVisitInput): Promise<FirstVisitCreateResult> {
    return request("participant/first-visit/create", { method: "POST", body: JSON.stringify(input) });
  },
  exchangeInvitation(token: string): Promise<ParticipantState> {
    return request("participant/exchange", { method: "POST", body: JSON.stringify({ token }) });
  },
  currentState(): Promise<ParticipantState> {
    return request("participant/state");
  },
  organicState(): Promise<ParticipantState> {
    return request("participant/organic/state");
  },
  createOrganicParticipant(input: OrganicParticipantInput): Promise<ParticipantState> {
    return request("participant/organic/create", { method: "POST", body: JSON.stringify(input) });
  },
  resumeOrganicParticipant(): Promise<ParticipantState> {
    return request("participant/organic/resume", { method: "POST", body: "{}" });
  },
  releaseOrganicParticipant(): Promise<void> {
    return request("participant/organic/release", { method: "POST", body: "{}" });
  },
  start(): Promise<ParticipantState> {
    return request("participant/start", { method: "POST", body: "{}" });
  },
  answer(stepId: ExperienceStepId, answer: string): Promise<ParticipantState> {
    return request("participant/answer", { method: "POST", body: JSON.stringify({ stepId, answer }) });
  },
  runtimeContribute(input: { eventId: string; content: string; observedAt: string; baseRevision: number }): Promise<ParticipantState> {
    return request("participant/runtime/contribute", { method: "POST", body: JSON.stringify(input) });
  },
  resumeRuntime(): Promise<ParticipantState> {
    return request("participant/runtime/resume", { method: "POST", body: "{}" });
  },
  continue(): Promise<ParticipantState> {
    return request("participant/continue", { method: "POST", body: "{}" });
  },
  editAnswer(stepId: ExperienceStepId, answer: string): Promise<ParticipantState> {
    return request("participant/answer/edit", { method: "POST", body: JSON.stringify({ stepId, answer }) });
  },
  showChoice(): Promise<ParticipantState> {
    return request("participant/summary/confirm", { method: "POST", body: "{}" });
  },
  recognizeInsight(recognition: InsightRecognition): Promise<ParticipantState> {
    return request("participant/insight/recognition", { method: "POST", body: JSON.stringify({ recognition }) });
  },
  exploreInsight(topic: InsightExplorationTopic, response?: string): Promise<ParticipantState> {
    return request("participant/insight/explore", { method: "POST", body: JSON.stringify({ topic, response }) });
  },
  finishInsight(): Promise<ParticipantState> {
    return request("participant/insight/finish", { method: "POST", body: "{}" });
  },
  choose(stepId: ExperienceStepId): Promise<ParticipantState> {
    return request("participant/choice", { method: "POST", body: JSON.stringify({ stepId }) });
  },
  backToSummary(): Promise<ParticipantState> {
    return request("participant/summary/back", { method: "POST", body: "{}" });
  },
  openWorkspace(): Promise<ParticipantState> {
    return request("participant/workspace", { method: "POST", body: "{}" });
  },
  finish(): Promise<ParticipantState> {
    return request("participant/finish", { method: "POST", body: "{}" });
  },
  feedback(input: ExperienceFeedbackInput): Promise<void> {
    return request("participant/feedback", { method: "POST", body: JSON.stringify(input) });
  },
  deleteSession(): Promise<void> {
    return request("participant/session", { method: "DELETE", body: JSON.stringify({ confirm: "VERWIJDER MIJN SESSIE" }) });
  },
  adminLogin(password: string): Promise<void> {
    return request("admin/login", { method: "POST", body: JSON.stringify({ password }) });
  },
  adminLogout(): Promise<void> {
    return request("admin/logout", { method: "POST", body: "{}" });
  },
  observatoryOverview(): Promise<ObservatoryOverview> {
    return request("admin/overview");
  },
  createInvitation(input: { description?: string; expiresAt?: string; technicalTest: boolean }): Promise<{ invitation: ObservatoryInvitation; url: string }> {
    return request("admin/invitations", { method: "POST", body: JSON.stringify(input) });
  },
  observatoryDetail(id: string): Promise<ObservatoryDetail> {
    return request(`admin/invitations/${encodeURIComponent(id)}`);
  },
  saveObservation(id: string, observation: Omit<ObservatoryObservation, "updatedAt">): Promise<ObservatoryObservation> {
    return request(`admin/invitations/${encodeURIComponent(id)}/observation`, { method: "PUT", body: JSON.stringify(observation) });
  },
  revokeInvitation(id: string): Promise<ObservatoryInvitation> {
    return request(`admin/invitations/${encodeURIComponent(id)}/revoke`, { method: "POST", body: "{}" });
  },
  deleteTechnicalInvitation(id: string): Promise<void> {
    return request(`admin/invitations/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify({ confirm: "VERWIJDER TESTDATA" }) });
  },
};
