const ISOLATED_SAFE_INTERACTION_ROUTES = Object.freeze([
  Object.freeze({ method: "POST", pattern: /^\/api\/sportpaleis\/v1\/visual-compositions$/u }),
  Object.freeze({ method: "PATCH", pattern: /^\/api\/sportpaleis\/v1\/visual-compositions\/[^/]+$/u }),
  Object.freeze({ method: "POST", pattern: /^\/api\/sportpaleis\/v1\/visual-compositions\/[^/]+\/review$/u }),
  Object.freeze({ method: "POST", pattern: /^\/api\/sportpaleis\/v1\/creative-vector-drafts$/u }),
  Object.freeze({ method: "POST", pattern: /^\/api\/sportpaleis\/v1\/teamkit-proposals$/u }),
  Object.freeze({ method: "PATCH", pattern: /^\/api\/sportpaleis\/v1\/teamkit-proposals\/[^/]+$/u }),
  Object.freeze({ method: "POST", pattern: /^\/api\/sportpaleis\/v1\/teamkit-proposals\/[^/]+\/sources$/u }),
  Object.freeze({ method: "POST", pattern: /^\/api\/sportpaleis\/v1\/production-fonts$/u }),
  Object.freeze({ method: "PATCH", pattern: /^\/api\/sportpaleis\/v1\/orders\/[^/]+$/u }),
]);

export function classifySportpaleisReviewRequest({ method, route, isolatedCandidateState = false }) {
  const normalizedMethod = String(method ?? "").trim().toUpperCase();
  const normalizedRoute = String(route ?? "").trim();
  if (normalizedMethod === "GET") return "candidate.review.read";
  if (!isolatedCandidateState) return null;
  return ISOLATED_SAFE_INTERACTION_ROUTES.some((entry) => entry.method === normalizedMethod && entry.pattern.test(normalizedRoute))
    ? "candidate.ui.safe-interact"
    : null;
}
