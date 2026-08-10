import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { atlasRuntimeExperienceVersion, createInitialRuntime, resumeRuntime, transitionRuntime } from "../src/atlas-runtime.ts";
import { createFirstVisitRuntime } from "../src/atlas-first-visit.ts";

const websiteRoot = fileURLToPath(new URL("..", import.meta.url));
const distRoot = path.join(websiteRoot, "dist-experience");
const firstVisitSnapshot = JSON.parse(await readFile(path.join(websiteRoot, "context-first-sources", "webuildanddesign.nl.snapshot.json"), "utf8"));
const statePath = process.env.EXPERIENCE_LOCAL_STATE_PATH
  ? path.resolve(process.env.EXPERIENCE_LOCAL_STATE_PATH)
  : path.join(websiteRoot, ".codex-tmp", "experience-validation-data.json");
const port = Number(process.env.EXPERIENCE_LOCAL_PORT ?? 5180);
const adminPassword = process.env.EXPERIENCE_LOCAL_ADMIN_PASSWORD;
if (!adminPassword || adminPassword.length < 16) throw new Error("EXPERIENCE_LOCAL_ADMIN_PASSWORD van minimaal 16 tekens is verplicht.");

const experienceVersion = atlasRuntimeExperienceVersion;
const flowRecompositionVersion = "5.0-flow-recomposition-v1";
const livingResearchLoopVersion = "4.0-living-research-loop-v1";
const conversationInsightVersion = "3.0-conversation-insight-v1";
const steps = ["moment", "attention", "energy", "natural"];
const livingSteps = ["moment", "attention"];
const supportsInsight = version => [flowRecompositionVersion, livingResearchLoopVersion, conversationInsightVersion].includes(version);
const stepsForVersion = version => [flowRecompositionVersion, livingResearchLoopVersion].includes(version) ? livingSteps : steps;
const emptyState = () => ({ invitations: [], sessions: {}, feedback: [], events: [], observations: {}, access: {}, admin: {} });
await mkdir(path.dirname(statePath), { recursive: true });
let state;
try { state = { ...emptyState(), ...JSON.parse(await readFile(statePath, "utf8")) }; } catch { state = emptyState(); }

const now = () => new Date().toISOString();
const hash = value => createHash("sha256").update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const persist = () => writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
const cookies = request => Object.fromEntries((request.headers.cookie ?? "").split(";").filter(Boolean).map(part => { const [key, ...rest] = part.trim().split("="); return [key, decodeURIComponent(rest.join("="))]; }));
const clean = (value, maximum = 1600, required = true) => {
  if (typeof value !== "string") throw Object.assign(new Error("Ongeldige invoer."), { status: 422 });
  const result = value.replaceAll("\0", "").trim();
  if (required && !result) throw Object.assign(new Error("Dit antwoord mag niet leeg zijn."), { status: 422 });
  if (result.length > maximum) throw Object.assign(new Error("Deze invoer is te lang."), { status: 422 });
  return result;
};

function responseJson(response, data, status = 200, cookie) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
    "X-Content-Type-Options": "nosniff",
    ...(cookie ? { "Set-Cookie": cookie } : {}),
  });
  response.end(JSON.stringify({ data }));
}

function responseError(response, message, status = 400, code = "REQUEST_FAILED") {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow, noarchive" });
  response.end(JSON.stringify({ error: message, code }));
}

async function jsonBody(request) {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > 12000) throw Object.assign(new Error("Dit verzoek is te groot."), { status: 413 });
  }
  return raw ? JSON.parse(raw) : {};
}

function publicSession(session, returned = false) {
  if (!session) return undefined;
  const { runtimeJournal: _runtimeJournal, ...publicState } = session;
  return { ...publicState, returned };
}

function createRuntimeSession(invitationId, participantId, timestamp, sessionId = randomUUID()) {
  const id = sessionId;
  return {
    id,
    invitationId,
    phase: "runtime",
    currentStep: 0,
    answers: [],
    reflections: [],
    workspaceOpened: false,
    version: experienceVersion,
    startedAt: timestamp,
    lastActiveAt: timestamp,
    runtime: createInitialRuntime(id, participantId, timestamp),
    runtimeJournal: [],
  };
}

function publicParticipant(invitation, returned = false) {
  return {
    invitationId: invitation.id,
    participantId: invitation.entryType === "organic" ? invitation.id : undefined,
    invitationStatus: invitation.status,
    entryType: invitation.entryType ?? "personal",
    description: invitation.description,
    participantName: invitation.participantName,
    participantRole: invitation.participantRole,
    participantOrganization: invitation.participantOrganization,
    referralId: invitation.referralId,
    expiresAt: invitation.expiresAt,
    session: publicSession(state.sessions[invitation.id], returned),
  };
}

function participant(request, expectedEntryType) {
  const credential = cookies(request).wbd_experience_access;
  const invitationId = credential ? state.access[hash(credential)] : undefined;
  const invitation = state.invitations.find(item => item.id === invitationId);
  if (!invitation) throw Object.assign(new Error("Open je beveiligde persoonlijke toegang om verder te gaan."), { status: 401 });
  if (expectedEntryType && (invitation.entryType ?? "personal") !== expectedEntryType) throw Object.assign(new Error("Deze toegang hoort bij een andere Experience-ingang."), { status: 404 });
  if (invitation.status === "revoked" || invitation.revokedAt) throw Object.assign(new Error("Deze persoonlijke toegang is niet meer actief."), { status: 410 });
  if (invitation.expiresAt && Date.parse(invitation.expiresAt) <= Date.now()) throw Object.assign(new Error("Deze persoonlijke toegang is verlopen."), { status: 410 });
  return invitation;
}

function admin(request) {
  const credential = cookies(request).wbd_experience_observatory;
  if (!credential || !state.admin[hash(credential)]) throw Object.assign(new Error("Meld je eerst veilig aan."), { status: 401 });
}

function addEvent(invitationId, sessionId, type, stepId) {
  state.events.push({ id: randomUUID(), invitationId, sessionId, type, stepId, createdAt: now() });
}

function touch(invitation) { invitation.lastActiveAt = now(); }
function markCompleted(invitation, session) {
  const completed = now();
  session.completedAt ??= completed;
  session.lastActiveAt = completed;
  invitation.status = "completed";
  invitation.completedAt ??= completed;
  invitation.lastActiveAt = completed;
  addEvent(invitation.id, session.id, "experience_completed");
}

async function api(request, response, route) {
  if (request.headers["x-wbd-experience"] !== "1") return responseError(response, "Dit verzoek hoort niet bij deze Experience.", 400);
  const method = request.method ?? "GET";
  const input = method === "GET" ? {} : await jsonBody(request);

  if (route === "participant/first-visit/create" && method === "POST") {
    const industry = clean(input.industry, 180); const organizationName = clean(input.organizationName, 180); const websiteUrl = clean(input.websiteUrl ?? "", 240, false);
    const timestamp = now(); const invitationId = randomUUID(); const sessionId = randomUUID(); const inviteToken = token();
    const seeded = createFirstVisitRuntime(sessionId, invitationId, { industry, organizationName, websiteUrl }, firstVisitSnapshot, timestamp);
    const invitation = { id: invitationId, tokenHash: hash(inviteToken), entryType: "personal", participantOrganization: organizationName, description: "first-visit-v2", status: "started", technicalTest: false, createdAt: timestamp, startedAt: timestamp, lastActiveAt: timestamp };
    state.invitations.push(invitation);
    state.sessions[invitationId] = {
      id: sessionId,
      invitationId,
      phase: "runtime",
      currentStep: 0,
      answers: [],
      reflections: [],
      workspaceOpened: false,
      version: experienceVersion,
      startedAt: timestamp,
      lastActiveAt: timestamp,
      runtime: { field: seeded.field, decision: seeded.decision },
      runtimeJournal: [seeded.journalEntry],
    };
    addEvent(invitationId, sessionId, "experience_started");
    await persist();
    return responseJson(response, { token: inviteToken, context: seeded.context }, 201);
  }

  if (route === "participant/organic/create" && method === "POST") {
    const name = clean(input.name, 120); const role = clean(input.role ?? "", 120, false); const organization = clean(input.organization ?? "", 160, false); const referralId = clean(input.referralId ?? "", 96, false);
    if (referralId && !/^[A-Za-z0-9_-]+$/.test(referralId)) return responseError(response, "De gedeelde route heeft geen geldige vorm.", 422, "INVALID_REFERRAL");
    const timestamp = now(); const invitationId = randomUUID(); const sessionId = randomUUID(); const accessToken = token();
    const invitation = { id: invitationId, tokenHash: hash(token()), entryType: "organic", participantName: name, participantRole: role || undefined, participantOrganization: organization || undefined, referralId: referralId || undefined, description: undefined, status: "started", technicalTest: input.technicalTest === true && referralId.startsWith("acceptance-"), createdAt: timestamp, openedAt: timestamp, startedAt: timestamp, lastActiveAt: timestamp };
    state.invitations.push(invitation);
    state.sessions[invitationId] = createRuntimeSession(invitationId, invitationId, timestamp, sessionId);
    state.access[hash(accessToken)] = invitationId;
    addEvent(invitationId, sessionId, "organic_entry_created");
    if (referralId) addEvent(invitationId, sessionId, "organic_shared_entry_created");
    addEvent(invitationId, sessionId, "experience_started");
    await persist();
    return responseJson(response, publicParticipant(invitation), 201, `wbd_experience_access=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
  }
  if (route === "participant/organic/state" && method === "GET") return responseJson(response, publicParticipant(participant(request, "organic")));
  if (route === "participant/organic/resume" && method === "POST") {
    const invitation = participant(request, "organic"); const session = state.sessions[invitation.id];
    if (!session) return responseError(response, "Deze Experience kan niet worden hervat.", 409);
    addEvent(invitation.id, session.id, "organic_participant_resumed"); touch(invitation); await persist(); return responseJson(response, publicParticipant(invitation, true));
  }
  if (route === "participant/organic/release" && method === "POST") {
    const credential = cookies(request).wbd_experience_access; const invitationId = credential ? state.access[hash(credential)] : undefined; const invitation = state.invitations.find(item => item.id === invitationId);
    if (credential && invitation?.entryType === "organic") delete state.access[hash(credential)];
    await persist(); return responseJson(response, null, 200, "wbd_experience_access=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
  }

  if (route === "participant/exchange" && method === "POST") {
    const inviteToken = clean(input.token, 180);
    const invitation = state.invitations.find(item => item.tokenHash === hash(inviteToken) && (item.entryType ?? "personal") === "personal");
    if (!invitation) return responseError(response, "Deze persoonlijke toegang is niet geldig.", 404, "INVITATION_NOT_FOUND");
    if (invitation.status === "revoked") return responseError(response, "Deze persoonlijke toegang is niet meer actief.", 410, "INVITATION_REVOKED");
    if (invitation.expiresAt && Date.parse(invitation.expiresAt) <= Date.now()) return responseError(response, "Deze persoonlijke toegang is verlopen.", 410, "INVITATION_EXPIRED");
    const accessToken = token();
    state.access[hash(accessToken)] = invitation.id;
    const session = state.sessions[invitation.id];
    const returned = Boolean(session?.completedAt);
    if (returned) addEvent(invitation.id, session.id, "experience_returned");
    else if (!invitation.openedAt) addEvent(invitation.id, undefined, "invitation_opened");
    invitation.openedAt ??= now();
    if (invitation.status === "created") invitation.status = "opened";
    touch(invitation);
    await persist();
    return responseJson(response, publicParticipant(invitation, returned), 200, `wbd_experience_access=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
  }
  if (route === "participant/state" && method === "GET") return responseJson(response, publicParticipant(participant(request, "personal")));
  if (route === "participant/start" && method === "POST") {
    const invitation = participant(request);
    if (!state.sessions[invitation.id]) {
      const timestamp = now();
      state.sessions[invitation.id] = createRuntimeSession(invitation.id, invitation.id, timestamp);
      invitation.status = "started"; invitation.startedAt = timestamp; touch(invitation);
      addEvent(invitation.id, state.sessions[invitation.id].id, "experience_started");
      await persist();
    }
    return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/runtime/contribute" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id];
    if (!session || session.version !== experienceVersion || session.phase !== "runtime" || !session.runtime) return responseError(response, "Deze bijdrage hoort niet bij een actieve Runtime-sessie.", 409, "RUNTIME_NOT_ACTIVE");
    const eventId = clean(input.eventId, 96); const content = clean(input.content); const observedAt = clean(input.observedAt, 64); const baseRevision = Number(input.baseRevision);
    session.runtimeJournal ??= [];
    if (session.runtimeJournal.some(entry => entry.eventId === eventId)) return responseJson(response, publicParticipant(invitation));
    try {
      const transition = transitionRuntime(session.runtime.field, { id: eventId, type: "contribution", inquiryId: session.id, actorId: invitation.id, content, observedAt, receivedAt: now(), baseRevision });
      session.runtime = { field: transition.field, decision: transition.decision };
      session.runtimeJournal.push(transition.journalEntry);
      session.lastActiveAt = transition.field.updatedAt;
      touch(invitation);
      addEvent(invitation.id, session.id, "runtime_transition_committed", transition.decision.movement);
      if (transition.journalEntry.gateStatus === "external-correction-required") addEvent(invitation.id, session.id, "runtime_external_correction_required", transition.decision.movement);
      await persist();
      return responseJson(response, publicParticipant(invitation));
    } catch (error) {
      if (error instanceof Error && error.message === "RUNTIME_STALE_REVISION") return responseError(response, "Het gesprek is intussen gewijzigd. De actuele toestand is opnieuw geladen.", 409, error.message);
      if (error instanceof Error && error.message.startsWith("RUNTIME_")) return responseError(response, "Deze bijdrage kon niet veilig worden verwerkt.", 422, error.message);
      throw error;
    }
  }
  if (route === "participant/runtime/resume" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id];
    if (!session || session.version !== experienceVersion || session.phase !== "completed" || !session.runtime) return responseError(response, "Dit onderzoek kan nu niet worden hervat.", 409, "RUNTIME_NOT_RESUMABLE");
    const receivedAt = now();
    const transition = resumeRuntime(session.runtime.field, { id: randomUUID(), type: "resume", inquiryId: session.id, actorId: invitation.id, observedAt: receivedAt, receivedAt, baseRevision: session.runtime.field.revision });
    session.runtime = { field: transition.field, decision: transition.decision }; session.runtimeJournal ??= []; session.runtimeJournal.push(transition.journalEntry);
    session.phase = "runtime"; session.completedAt = undefined; session.lastActiveAt = receivedAt;
    invitation.status = "started"; invitation.completedAt = undefined; touch(invitation);
    addEvent(invitation.id, session.id, "experience_returned", session.runtime.decision.movement);
    await persist();
    return responseJson(response, publicParticipant(invitation, true));
  }
  if (route === "participant/answer" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id];
    if (!session || session.phase !== "question" || stepsForVersion(session.version)[session.currentStep] !== input.stepId) return responseError(response, "Deze vraag is nu niet aan de beurt.", 409);
    const answer = clean(input.answer); const existing = session.answers.find(item => item.stepId === input.stepId);
    if (existing) Object.assign(existing, { answer, submittedAt: now() }); else session.answers.push({ stepId: input.stepId, answer, submittedAt: now() });
    if (session.version === flowRecompositionVersion) {
      if (session.currentStep >= livingSteps.length - 1) session.phase = "insight";
      else { session.currentStep += 1; session.phase = "question"; }
    } else session.phase = "listening";
    session.lastActiveAt = now(); touch(invitation); addEvent(invitation.id, session.id, "question_answered", input.stepId); await persist();
    return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/continue" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id];
    if (!session || session.phase !== "listening") return responseError(response, "Deze overgang is nu niet beschikbaar.", 409);
    if (session.currentStep >= stepsForVersion(session.version).length - 1) session.phase = "summary"; else { session.currentStep += 1; session.phase = "question"; }
    session.lastActiveAt = now(); touch(invitation); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/answer/edit" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id]; const item = session?.answers.find(answer => answer.stepId === input.stepId);
    if (!session || session.phase !== "summary" || !item) return responseError(response, "Je woorden kunnen nu niet worden aangepast.", 409);
    item.answer = clean(input.answer); item.submittedAt = now(); touch(invitation); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/summary/confirm" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id]; if (!session || session.phase !== "summary") return responseError(response, "De samenvatting is nu niet beschikbaar.", 409);
    session.phase = supportsInsight(session.version) ? "insight" : "choice"; session.lastActiveAt = now(); touch(invitation); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/insight/recognition" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id]; const recognition = clean(input.recognition, 16);
    if (!session || session.phase !== "insight" || !supportsInsight(session.version) || !["yes", "partly", "not-yet"].includes(recognition)) return responseError(response, "Dit inzicht is nu niet beschikbaar.", 409);
    session.insightRecognition = recognition; session.activeReflectionTopic = undefined; session.phase = "explore"; session.lastActiveAt = now(); addEvent(invitation.id, session.id, "insight_recognized", recognition); touch(invitation); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/insight/explore" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id]; const topic = clean(input.topic, 24); const responseText = clean(input.response ?? "", 1600, false);
    if (!session || session.phase !== "explore" || !supportsInsight(session.version) || !["why", "evidence", "customers", "colleagues", "begin", "other"].includes(topic)) return responseError(response, "Deze verdieping is nu niet beschikbaar.", 409);
    session.reflections ??= []; const existing = session.reflections.find(item => item.topic === topic); const timestamp = now();
    if (existing) { if (responseText) existing.response = responseText; existing.updatedAt = timestamp; } else session.reflections.push({ topic, response: responseText || undefined, createdAt: timestamp, updatedAt: timestamp });
    session.activeReflectionTopic = topic; session.lastActiveAt = timestamp; addEvent(invitation.id, session.id, responseText ? "insight_reflection_saved" : "insight_explored", topic); touch(invitation); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/insight/finish" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id];
    if (!session || !["insight", "explore"].includes(session.phase) || !supportsInsight(session.version)) return responseError(response, "Deze overgang is nu niet beschikbaar.", 409);
    session.phase = "choice"; session.activeReflectionTopic = undefined; session.lastActiveAt = now(); addEvent(invitation.id, session.id, "insight_exploration_finished"); touch(invitation); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/choice" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id];
    if (!session || session.phase !== "choice" || !steps.includes(input.stepId)) return responseError(response, "Kies één van je eigen momenten.", 409);
    session.chosenStepId = input.stepId; session.lastActiveAt = now(); touch(invitation); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/summary/back" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id]; if (!session) return responseError(response, "Er is nog geen Experience om terug te kijken.", 409);
    session.phase = "summary"; session.lastActiveAt = now(); touch(invitation); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/workspace" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id]; if (!session?.chosenStepId) return responseError(response, "Kies eerst wat je wilt bewaren.", 409);
    session.phase = "workspace"; session.workspaceOpened = true; addEvent(invitation.id, session.id, "workspace_opened"); markCompleted(invitation, session); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/finish" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id]; if (!session) return responseError(response, "Er is nog geen Experience om af te ronden.", 409);
    session.phase = "completed"; markCompleted(invitation, session); await persist(); return responseJson(response, publicParticipant(invitation));
  }
  if (route === "participant/feedback" && method === "POST") {
    const invitation = participant(request); const session = state.sessions[invitation.id]; if (!session) return responseError(response, "Begin eerst aan je Experience.", 409);
    state.feedback.push({ id: randomUUID(), sessionId: session.id, expected: clean(input.expected), happened: clean(input.happened), natural: clean(input.natural), createdAt: now() });
    addEvent(invitation.id, session.id, "feedback_submitted"); touch(invitation); await persist(); return responseJson(response, null, 201);
  }
  if (route === "participant/session" && method === "DELETE") {
    const invitation = participant(request); if (input.confirm !== "VERWIJDER MIJN SESSIE") return responseError(response, "Bevestig de verwijdering opnieuw.", 422);
    const sessionId = state.sessions[invitation.id]?.id; delete state.sessions[invitation.id]; delete state.observations[invitation.id];
    state.events = state.events.filter(item => item.invitationId !== invitation.id); state.feedback = state.feedback.filter(item => item.sessionId !== sessionId); invitation.status = "revoked"; invitation.revokedAt = now();
    for (const [key, id] of Object.entries(state.access)) if (id === invitation.id) delete state.access[key]; await persist(); return responseJson(response, null, 200, "wbd_experience_access=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
  }
  if (route === "admin/login" && method === "POST") {
    const incoming = Buffer.from(clean(input.password, 256)); const expected = Buffer.from(adminPassword);
    if (incoming.length !== expected.length || !timingSafeEqual(incoming, expected)) return responseError(response, "Het beheerwachtwoord is niet juist.", 401);
    const credential = token(); state.admin[hash(credential)] = now(); await persist(); return responseJson(response, null, 200, `wbd_experience_observatory=${encodeURIComponent(credential)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800`);
  }
  if (route === "admin/logout" && method === "POST") {
    const credential = cookies(request).wbd_experience_observatory; if (credential) delete state.admin[hash(credential)]; await persist(); return responseJson(response, null, 200, "wbd_experience_observatory=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0");
  }
  if (route.startsWith("admin/")) admin(request);
  if (route === "admin/overview" && method === "GET") {
    const organicEntries = state.invitations.filter(item => item.entryType === "organic").length;
    const counts = { invitations: state.invitations.length, organicEntries, organicStarted: state.invitations.filter(item => item.entryType === "organic" && item.startedAt).length, organicResumed: new Set(state.events.filter(item => item.type === "organic_participant_resumed").map(item => item.invitationId)).size, sharedEntries: state.invitations.filter(item => item.entryType === "organic" && item.referralId).length, opened: state.invitations.filter(item => item.openedAt).length, started: state.invitations.filter(item => item.startedAt).length, completed: state.invitations.filter(item => item.completedAt).length, returned: new Set(state.events.filter(item => ["experience_returned", "organic_participant_resumed"].includes(item.type)).map(item => item.invitationId)).size, feedback: state.feedback.length, lastActivity: state.invitations.map(item => item.lastActiveAt).filter(Boolean).sort().at(-1) };
    return responseJson(response, { counts, invitations: [...state.invitations].sort((a,b) => (b.lastActiveAt ?? b.createdAt).localeCompare(a.lastActiveAt ?? a.createdAt)).map(({ tokenHash, ...item }) => item) });
  }
  if (route === "admin/invitations" && method === "POST") {
    const inviteToken = token(); const createdAt = now(); const invitation = { id: randomUUID(), tokenHash: hash(inviteToken), entryType: "personal", description: clean(input.description ?? "", 120, false) || undefined, status: "created", technicalTest: input.technicalTest === true, createdAt, expiresAt: input.expiresAt || undefined };
    state.invitations.push(invitation); await persist(); const { tokenHash, ...publicInvitation } = invitation; return responseJson(response, { invitation: publicInvitation, url: `http://127.0.0.1:${port}/e/#${inviteToken}` }, 201);
  }
  const detailMatch = route.match(/^admin\/invitations\/([0-9a-f-]{36})$/);
  if (detailMatch && method === "GET") {
    const invitation = state.invitations.find(item => item.id === detailMatch[1]); if (!invitation) return responseError(response, "Deze Experience bestaat niet.", 404);
    const session = state.sessions[invitation.id]; const { tokenHash, ...publicInvitation } = invitation;
    return responseJson(response, { invitation: publicInvitation, session, events: state.events.filter(item => item.invitationId === invitation.id), feedback: state.feedback.filter(item => item.sessionId === session?.id), observation: state.observations[invitation.id] ?? { expected: "", surprising: "", valuable: "", confusing: "", improvement: "" } });
  }
  const observationMatch = route.match(/^admin\/invitations\/([0-9a-f-]{36})\/observation$/);
  if (observationMatch && method === "PUT") {
    const observation = { expected: clean(input.expected ?? "", 2400, false), surprising: clean(input.surprising ?? "", 2400, false), valuable: clean(input.valuable ?? "", 2400, false), confusing: clean(input.confusing ?? "", 2400, false), improvement: clean(input.improvement ?? "", 2400, false), updatedAt: now() };
    state.observations[observationMatch[1]] = observation; await persist(); return responseJson(response, observation);
  }
  const revokeMatch = route.match(/^admin\/invitations\/([0-9a-f-]{36})\/revoke$/);
  if (revokeMatch && method === "POST") {
    const invitation = state.invitations.find(item => item.id === revokeMatch[1]); if (!invitation) return responseError(response, "Deze Experience bestaat niet.", 404);
    invitation.status = "revoked"; invitation.revokedAt = now(); touch(invitation); for (const [key,id] of Object.entries(state.access)) if (id === invitation.id) delete state.access[key]; await persist(); const { tokenHash, ...publicInvitation } = invitation; return responseJson(response, publicInvitation);
  }
  if (detailMatch && method === "DELETE") {
    const invitation = state.invitations.find(item => item.id === detailMatch[1]); if (!invitation) return responseError(response, "Deze Experience bestaat niet.", 404);
    if (!invitation.technicalTest || input.confirm !== "VERWIJDER TESTDATA") return responseError(response, "Alleen expliciete technische testdata kan hier worden verwijderd.", 409);
    const sessionId = state.sessions[invitation.id]?.id; state.invitations = state.invitations.filter(item => item.id !== invitation.id); delete state.sessions[invitation.id]; delete state.observations[invitation.id]; state.events = state.events.filter(item => item.invitationId !== invitation.id); state.feedback = state.feedback.filter(item => item.sessionId !== sessionId); await persist(); return responseJson(response, null);
  }
  responseError(response, "Deze handeling bestaat niet.", 404);
}

const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml" };
async function staticFile(request, response, pathname) {
  if (pathname === "/sitemap.xml") return responseError(response, "Niet gevonden.", 404, "NOT_FOUND");
  let filePath = path.join(distRoot, pathname === "/" ? "index.html" : pathname);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(distRoot))) return responseError(response, "Niet gevonden.", 404);
  const info = await stat(resolved).catch(() => null);
  if (!info?.isFile()) filePath = path.join(distRoot, "index.html");
  const bytes = await readFile(filePath);
  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
    "Cache-Control": path.extname(filePath) === ".html" ? "no-store" : "public, max-age=31536000, immutable",
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  });
  response.end(bytes);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? `127.0.0.1:${port}`}`);
    if (url.pathname.startsWith("/api/")) await api(request, response, url.pathname.slice(5));
    else await staticFile(request, response, decodeURIComponent(url.pathname));
  } catch (error) {
    responseError(response, error instanceof SyntaxError ? "Het verzoek kon niet veilig worden gelezen." : error.message ?? "Deze handeling kon niet worden afgerond.", error.status ?? 500);
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Experience validation server: http://127.0.0.1:${port}`));
