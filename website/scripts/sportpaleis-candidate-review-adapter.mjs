import { randomBytes } from "node:crypto";
import path from "node:path";

import {
  createSportpaleisPilotRequestHandler,
  SportpaleisFileStore,
  SportpaleisPilotService,
} from "./sportpaleis-pilot-foundation.mjs";

export async function createSportpaleisCandidateReviewAdapter({
  identity,
  runtimeRoot,
  candidateId,
  humanGoReference,
  ttlMs = 30 * 60 * 1_000,
}) {
  const fixturePassword = randomBytes(24).toString("base64url");
  const store = new SportpaleisFileStore({
    filePath: path.join(runtimeRoot, "candidate-state.json"),
    backupDirectory: path.join(runtimeRoot, "backups"),
    seedPasswords: { kevin: fixturePassword, patrick: fixturePassword, collega: fixturePassword, "donovan-support": fixturePassword },
  });
  const service = new SportpaleisPilotService({
    store,
    artifactRoot: path.join(runtimeRoot, "artifacts"),
    runtimeArtifactRoot: path.join(runtimeRoot, "runtime-artifacts"),
    activeReviewCandidateIds: [candidateId],
    reviewAccessEnabled: true,
    reviewAccessIsolatedState: true,
    reviewAccessIssuerPrincipalIds: ["kevin"],
    releaseId: identity.releaseId,
    uploadsEnabled: true,
    productionAssetUploadsEnabled: true,
    fontUploadsEnabled: true,
    mailMode: "capture",
  });
  await service.initialize();
  const issuer = await service.login({ email: "kevin@sportpaleis.nl", password: fixturePassword });
  const issued = await service.issueReviewDeveloperGrant(issuer.token, issuer.csrfToken, {
    candidateId,
    scopes: ["candidate.review.read", "candidate.ui.safe-interact", "candidate.debug.read", "candidate.test-state.isolated"],
    humanGoReference,
    ttlMs,
  });
  const handoff = new URL(issued.activationPath, "http://review.invalid");
  const values = new URLSearchParams(handoff.hash.replace(/^#/, ""));
  let activated = null;
  const handler = createSportpaleisPilotRequestHandler(service);
  return {
    handleRequest: handler,
    setOrigin(origin) { service.allowedOrigin = origin; },
    async activate() {
      if (activated) throw Object.assign(new Error("De tijdelijke reviewstart is al gebruikt."), { statusCode: 409, code: "REVIEW_GRANT_ACTIVATION_REPLAY" });
      activated = await service.activateReviewDeveloperGrant({ activationToken: values.get("token"), candidateId: values.get("candidate") });
      return { headers: { "Set-Cookie": `sportpaleis_session=${activated.sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${activated.cookieMaxAgeSeconds}` } };
    },
    async evidence() {
      const state = await store.read();
      const grant = state.reviewDeveloperAccess?.grants?.find(({ id }) => id === issued.grant.id);
      return {
        tenantId: "sportpaleis",
        candidateId,
        principalId: "wbd-review-codex",
        grantState: grant?.revokedAt ? "REVOKED" : grant?.completedAt ? "COMPLETED" : grant?.activatedAt ? "ACTIVE" : "AWAITING_ACTIVATION",
        scopes: [...issued.grant.scopes],
        stateBoundary: "DISPOSABLE_CANDIDATE_ONLY",
        mailAuthority: false,
        hardwareAuthority: false,
        deploymentAuthority: false,
        productionMutationAuthority: false,
        auditCount: state.audit.filter(({ userId }) => userId === "wbd-review-codex").length,
      };
    },
    async close() {
      if (activated) {
        try { await service.revokeReviewDeveloperGrant(issuer.token, issuer.csrfToken, issued.grant.id); } catch { /* Runtime destruction remains the final fail-closed boundary. */ }
      }
    },
    service,
    store,
  };
}
