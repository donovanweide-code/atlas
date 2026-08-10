import { CaptureTransport, MailFoundation, createMailOrganizations } from "./mail-foundation.mjs";

export const SPORTPALEIS_PRODUCTION_MAIL_CAPTURE_DIRECTORY = "/srv/wbd/shared/mail/captures";

const MAIL_STATE_SCHEMA_VERSION = 1;
const MAIL_ORGANIZATION_ID = "sportpaleis";
const MAX_MAIL_ATTEMPTS = 5_000;
const MAX_MAIL_EVENTS = 5_000;
const MAX_MAIL_IDEMPOTENCY_RECORDS = 5_000;

function emptyMailState() {
  return { schemaVersion: MAIL_STATE_SCHEMA_VERSION, attempts: [], events: [], idempotency: {} };
}

function boundedMailState(input) {
  const state = structuredClone(input ?? emptyMailState());
  if (state.schemaVersion !== MAIL_STATE_SCHEMA_VERSION
    || !Array.isArray(state.attempts)
    || !Array.isArray(state.events)
    || !state.idempotency
    || Array.isArray(state.idempotency)
    || typeof state.idempotency !== "object") {
    throw new Error("Ongeldige Sportpaleis Mail Foundation-state.");
  }
  if (state.attempts.length > MAX_MAIL_ATTEMPTS
    || state.events.length > MAX_MAIL_EVENTS
    || Object.keys(state.idempotency).length > MAX_MAIL_IDEMPOTENCY_RECORDS) {
    throw new Error("Sportpaleis Mail Foundation-state overschrijdt de productiegrens.");
  }
  if (state.attempts.some(({ organizationId }) => organizationId !== MAIL_ORGANIZATION_ID)
    || state.events.some(({ organizationId }) => organizationId !== MAIL_ORGANIZATION_ID)
    || Object.keys(state.idempotency).some((key) => !key.startsWith(`${MAIL_ORGANIZATION_ID}:`))) {
    throw new Error("Sportpaleis Mail Foundation-state bevat organisatievreemde gegevens.");
  }
  return state;
}

export class SportpaleisMariaDbMailStore {
  constructor({ workspaceStore }) {
    if (!workspaceStore || typeof workspaceStore.read !== "function" || typeof workspaceStore.mutate !== "function") {
      throw new Error("Workspace MariaDB-store ontbreekt voor de Sportpaleis Mail Foundation.");
    }
    this.workspaceStore = workspaceStore;
  }

  async read() {
    const workspaceState = await this.workspaceStore.read();
    return boundedMailState(workspaceState.mailFoundation?.[MAIL_ORGANIZATION_ID]);
  }

  async mutate(mutator) {
    const result = await this.workspaceStore.mutate(async (workspaceState) => {
      const mailState = boundedMailState(workspaceState.mailFoundation?.[MAIL_ORGANIZATION_ID]);
      const value = await mutator(mailState);
      workspaceState.mailFoundation ??= {};
      workspaceState.mailFoundation[MAIL_ORGANIZATION_ID] = boundedMailState(mailState);
      return { state: workspaceState, value };
    });
    return result.value === undefined ? undefined : structuredClone(result.value);
  }
}

export function createSportpaleisProductionMailFoundation({
  workspaceStore,
  captureDirectory = SPORTPALEIS_PRODUCTION_MAIL_CAPTURE_DIRECTORY,
  simulation = "success",
} = {}) {
  const store = new SportpaleisMariaDbMailStore({ workspaceStore });
  const transport = new CaptureTransport({ captureDirectory, simulation });
  if (transport.externalNetworkEnabled !== false || transport.name !== "capture") {
    throw new Error("Sportpaleis production mail moet netwerkloos in capture mode blijven.");
  }
  return new MailFoundation({
    organizations: createMailOrganizations({ organizationIds: [MAIL_ORGANIZATION_ID] }),
    store,
    transport,
  });
}

export const sportpaleisProductionMailPolicy = Object.freeze({
  organizationId: MAIL_ORGANIZATION_ID,
  persistence: "workspace-mariadb-runtime-state",
  namespace: `mailFoundation.${MAIL_ORGANIZATION_ID}`,
  transport: "capture",
  externalNetworkEnabled: false,
  captureDirectory: SPORTPALEIS_PRODUCTION_MAIL_CAPTURE_DIRECTORY,
  limits: Object.freeze({
    attempts: MAX_MAIL_ATTEMPTS,
    events: MAX_MAIL_EVENTS,
    idempotencyRecords: MAX_MAIL_IDEMPOTENCY_RECORDS,
  }),
});
