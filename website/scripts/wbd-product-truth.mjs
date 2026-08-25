import { createHash, randomUUID } from "node:crypto";

const MATURITY = new Set(["CONCEPT", "BUILT", "FIRST_REAL_USE", "PROVEN", "REUSABLE"]);
const ROADMAP = new Set(["NOW", "NEXT", "LATER", "PARKED"]);
const SCOPE = new Set(["CUSTOMER_SPECIFIC", "GENERIC", "GENERIC_WITH_CONFIGURATION", "UNRESOLVED"]);
const PRICING_STATUS = new Set(["UNKNOWN", "NEEDS_OWNER_CONFIRMATION", "HYPOTHESIS", "DEFINITIVE"]);
const SOURCE_STATUS = new Set(["VERIFIED", "DOCUMENTED", "NEEDS_OWNER_CONFIRMATION", "NOT_AVAILABLE"]);

const iso = (value = new Date()) => value instanceof Date ? value.toISOString() : new Date(value).toISOString();
const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
const stableJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
};
const unique = (values) => [...new Set((values ?? []).filter(Boolean))];
const required = (value, label, maximum = 1_000) => {
  const text = String(value ?? "").trim();
  if (!text || text.length > maximum) throw new Error(`${label} is ongeldig.`);
  return text;
};
const enumValue = (value, values, label) => {
  if (!values.has(value)) throw new Error(`${label} is ongeldig.`);
  return value;
};
const money = (value, label) => {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) throw new Error(`${label} is ongeldig.`);
  return Math.round(amount * 100) / 100;
};

const MODULE_SEED = Object.freeze([
  { id: "workspace-core", name: "Workspace Core", description: "De veilige organisatie-, identity-, context- en ownerbasis waarop modules aansluiten.", boundary: "CORE", maturity: "FIRST_REAL_USE", roadmap: "NOW", dependencies: [], connectors: [], sourceRefs: ["website/scripts/workspace-runtime.mjs", "website/scripts/wbd-owner-foundation.mjs"] },
  { id: "owner-control-plane", name: "Owner Control Plane", description: "Evidence, Attention, Next Best Action, Product Truth en gecontroleerde besluitvorming voor WBD Owner.", boundary: "MODULE", maturity: "FIRST_REAL_USE", roadmap: "NOW", dependencies: ["workspace-core"], connectors: ["wbd-homepage-metadata"], sourceRefs: ["docs/atlas/WBD-ATLAS-CONTROL-PLANE-ARCHITECTURE.md", "website/scripts/wbd-atlas-control-plane.mjs"] },
  { id: "production", name: "Production", description: "Klantgebonden order-, intake-, productie- en plotjobflows met expliciete Human Check.", boundary: "MODULE", maturity: "PROVEN", roadmap: "NOW", dependencies: ["workspace-core"], connectors: [], sourceRefs: ["website/src/sportpaleis/quick-production-intake.mjs", "website/scripts/sportpaleis-pilot-foundation.mjs"] },
  { id: "document-source-intake", name: "Document & Source Intake", description: "Bronnen veilig opnemen, herleidbaar bewaren en gecontroleerd naar werkcontext vertalen.", boundary: "CAPABILITY_GROUP", maturity: "BUILT", roadmap: "NEXT", dependencies: ["workspace-core"], connectors: [], sourceRefs: ["website/src/sportpaleis/quick-production-intake.mjs", "docs/atlas/WBD-DOSSIER-FOUNDATION-V1.md"] },
  { id: "commerce", name: "Commerce", description: "Websites, WooCommerce-diagnose en begrensde managed continuiteit.", boundary: "MODULE", maturity: "PROVEN", roadmap: "NEXT", dependencies: ["workspace-core"], connectors: [], sourceRefs: ["clients/0002-aquaflask/CASE.md", "docs/atlas/PRAKTIJKREVIEW-BIJ-CEES-LEVERING-2026-07-25.md"] },
  { id: "experience", name: "Experience", description: "Publieke begeleide intake en prospectcontext met centrale evidencegrens.", boundary: "MODULE", maturity: "FIRST_REAL_USE", roadmap: "NEXT", dependencies: ["workspace-core"], connectors: [], sourceRefs: ["docs/atlas/ATLAS-RUNTIME-PRODUCTION-DEPLOYMENT-V1.md", "website/src/experience-entry.ts"] },
  { id: "inventory", name: "Inventory", description: "Voorraad- en beschikbaarheidscontext als toekomstige configureerbare productrichting.", boundary: "MODULE_CANDIDATE", maturity: "CONCEPT", roadmap: "LATER", dependencies: ["workspace-core"], connectors: [], sourceRefs: ["docs/atlas/PROJECT-WS-BASE0-WORKSPACE-BASIS-VALUE-SPORTPALEIS-FIT-REVIEW.md"] },
  { id: "b2b", name: "B2B", description: "Organisatie-, voorstel- en samenwerkingscontext; nog niet als zelfstandig bewezen product.", boundary: "MODULE_CANDIDATE", maturity: "CONCEPT", roadmap: "LATER", dependencies: ["workspace-core"], connectors: [], sourceRefs: ["docs/atlas/PROJECT-WS-BASE0-WORKSPACE-BASIS-VALUE-SPORTPALEIS-FIT-REVIEW.md"] },
]);

const PRICING_SEED = Object.freeze([
  {
    id: "pricing-workspace-basis-founding-context", subjectType: "MODULE", subjectId: "workspace-core",
    oneTime: null, monthly: 75, fromPrice: false, currency: "EUR", status: "HYPOTHESIS", internalCost: false,
    summary: "€75 is uitsluitend founding/pilotcontext bij Sportpaleis en geen gevalideerde generieke marktprijs.",
    source: "docs/atlas/PROJECT-WS-BASE0-WORKSPACE-BASIS-VALUE-SPORTPALEIS-FIT-REVIEW.md",
    sourceAuthority: "PRODUCT_ASSESSMENT", effectiveDate: "2026-08-12", humanApproved: false,
    history: [{ status: "HYPOTHESIS", oneTime: null, monthly: 75, currency: "EUR", effectiveDate: "2026-08-12", source: "docs/atlas/PROJECT-WS-BASE0-WORKSPACE-BASIS-VALUE-SPORTPALEIS-FIT-REVIEW.md" }],
  },
  {
    id: "pricing-runtime-current-approved-cost", subjectType: "INTERNAL_COST", subjectId: "workspace-core",
    oneTime: 0, monthly: 35, fromPrice: false, currency: "EUR", status: "DEFINITIVE", internalCost: true,
    summary: "Goedgekeurde nieuwe TransIP-runtimekosten, exclusief btw; dit is geen klantprijs.",
    source: "docs/atlas/PROJECT-002-INFRASTRUCTURE-IMPLEMENTATION-GATE-2026-08-10.md",
    sourceAuthority: "APPROVED_COST_GATE", effectiveDate: "2026-08-10", humanApproved: true,
    history: [{ status: "DEFINITIVE", oneTime: 0, monthly: 35, currency: "EUR", effectiveDate: "2026-08-10", source: "docs/atlas/PROJECT-002-INFRASTRUCTURE-IMPLEMENTATION-GATE-2026-08-10.md" }],
  },
  {
    id: "pricing-commerce-managed-care", subjectType: "MODULE", subjectId: "commerce",
    oneTime: null, monthly: null, fromPrice: false, currency: "EUR", status: "NEEDS_OWNER_CONFIRMATION", internalCost: false,
    summary: "Managed Commerce Care is een begrensde producthypothese; een definitieve prijs ontbreekt.",
    source: "website/scripts/wbd-capability-catalog.mjs", sourceAuthority: "CAPABILITY_STRATEGY", effectiveDate: "2026-08-15", humanApproved: false,
    history: [{ status: "NEEDS_OWNER_CONFIRMATION", oneTime: null, monthly: null, currency: "EUR", effectiveDate: "2026-08-15", source: "website/scripts/wbd-capability-catalog.mjs" }],
  },
]);

const CUSTOMER_PROOF_SEED = Object.freeze([
  {
    id: "proof-sportpaleis-production", organizationId: "sportpaleis", organizationName: "Sportpaleis",
    capabilityIds: ["orders-workflow", "production-proposals", "production-plotjob-history", "production-quick-intake"],
    moduleIds: ["production", "document-source-intake"], scopeClass: "CUSTOMER_SPECIFIC", proofStatus: "VERIFIED",
    summary: "De actuele Sportpaleis-productionflow bewijst order-, intake-, plotjob- en historiegedrag binnen deze specifieke productiecontext.",
    evidenceRefs: ["docs/sportpaleis/SPW-PILOT-READINESS-004-FINAL-REPORT.md", "website/tests/sportpaleis-quick-intake-adaptive-svg-v1.test.mjs"],
    limitations: "Geen automatische generieke productclaim; productieprofielen, WIT/ZWART-regels en fysieke proceskeuzes blijven klantgebonden.",
    privacy: "PRIVATE_SUMMARY_ONLY", lastVerifiedAt: "2026-08-24T12:00:00.000Z",
  },
  {
    id: "proof-aquaflask-commerce", organizationId: "aquaflask", organizationName: "AquaFlask / BijCees",
    capabilityIds: ["commerce-woocommerce-diagnostics"], moduleIds: ["commerce"], scopeClass: "GENERIC_WITH_CONFIGURATION", proofStatus: "DOCUMENTED",
    summary: "De AquaFlask-praktijkcase bewijst begrensde WooCommerce-diagnose; hergebruik vereist klantconfiguratie en nieuwe verificatie.",
    evidenceRefs: ["clients/0002-aquaflask/CASE.md", "docs/atlas/PRAKTIJKREVIEW-BIJ-CEES-LEVERING-2026-07-25.md"],
    limitations: "Geen claim over live monitoring of structurele Commerce Care buiten de vastgelegde diagnose.",
    privacy: "PRIVATE_SUMMARY_ONLY", lastVerifiedAt: "2026-07-25T12:00:00.000Z",
  },
  {
    id: "proof-wbd-owner-release", organizationId: "we-build-and-design", organizationName: "We Build And Design",
    capabilityIds: ["monitoring-release-validation"], moduleIds: ["workspace-core", "owner-control-plane"], scopeClass: "GENERIC", proofStatus: "VERIFIED",
    summary: "WBD gebruikt immutable releaseartifacts, provenance, checksums en rollbackcontrole als herhaalbare interne releasefoundation.",
    evidenceRefs: ["ops/production/spw-immutable-release.sh", "docs/atlas/RELEASES"],
    limitations: "Bewijst releasecontrole, niet automatisch de functionele kwaliteit van iedere afzonderlijke capability.",
    privacy: "INTERNAL_PRODUCT_PROOF", lastVerifiedAt: "2026-08-25T12:00:00.000Z",
  },
  {
    id: "proof-wbd-experience", organizationId: "we-build-and-design", organizationName: "WBD Experience",
    capabilityIds: ["experience-intake"], moduleIds: ["experience"], scopeClass: "GENERIC_WITH_CONFIGURATION", proofStatus: "VERIFIED",
    summary: "De WBD Experience bewijst centrale sessies, antwoorden, events en hervatten binnen de bestaande Experience-context.",
    evidenceRefs: ["docs/atlas/ATLAS-RUNTIME-PRODUCTION-DEPLOYMENT-V1.md"],
    limitations: "Prospecttelemetrie en commerciële conversie zijn geen automatisch bewezen productclaims.",
    privacy: "INTERNAL_PRODUCT_PROOF", lastVerifiedAt: "2026-08-04T12:00:00.000Z",
  },
]);

const RULE_SEED = Object.freeze([
  { id: "rule-core-module-boundary", category: "PRODUCT", statement: "Core draagt identity, organisatiecontext en veilige workspacegrenzen; klantproceslogica blijft module- of capabilityspecifiek.", status: "DOCUMENTED", sourceRefs: ["docs/atlas/PROJECT-WS-BASE0-WORKSPACE-BASIS-VALUE-SPORTPALEIS-FIT-REVIEW.md"] },
  { id: "rule-reuse-value", category: "COMMERCIAL", statement: "Hergebruik verlaagt implementatielast maar prijs volgt klantwaarde, verantwoordelijkheid en configuratie; niet alleen bestede bouwuren.", status: "NEEDS_OWNER_CONFIRMATION", sourceRefs: ["website/scripts/wbd-capability-catalog.mjs"] },
  { id: "rule-portability", category: "PRODUCT", statement: "Voorkom slechte lock-in: centrale context bewaart betekenis en provenance; bronsystemen blijven eigenaar van ruwe waarheid waar passend.", status: "DOCUMENTED", sourceRefs: ["docs/atlas/PROJECT-WBD-WORKSPACE-CANONICAL-REVIEW.md"] },
  { id: "rule-managed-responsibility", category: "COMMERCIAL", statement: "Terugkerende prijs vereist expliciete managed verantwoordelijkheid, grenzen en externe terugkerende kosten.", status: "NEEDS_OWNER_CONFIRMATION", sourceRefs: ["website/scripts/wbd-capability-catalog.mjs"] },
]);

const COVERAGE_SEED = Object.freeze([
  { sourceId: "immutable-releases", label: "Immutable releases", status: "VERIFIED", authority: "PRIMARY_RUNTIME", sourceRefs: ["ops/production/spw-immutable-release.sh", "RELEASE-MANIFEST.json"] },
  { sourceId: "capability-registry", label: "Capability Registry", status: "VERIFIED", authority: "CENTRAL_PRODUCT_REGISTRY", sourceRefs: ["website/scripts/wbd-capability-catalog.mjs"] },
  { sourceId: "pricing-commercial", label: "Pricing en commerciele context", status: "DOCUMENTED", authority: "MULTIPLE_SOURCES", sourceRefs: ["docs/atlas/PROJECT-WS-BASE0-WORKSPACE-BASIS-VALUE-SPORTPALEIS-FIT-REVIEW.md", "docs/atlas/PROJECT-002-INFRASTRUCTURE-IMPLEMENTATION-GATE-2026-08-10.md"] },
  { sourceId: "experience", label: "Experience", status: "VERIFIED", authority: "PRODUCTION_AND_REPOSITORY", sourceRefs: ["docs/atlas/ATLAS-RUNTIME-PRODUCTION-DEPLOYMENT-V1.md", "website/src/experience-entry.ts"] },
  { sourceId: "owner-state", label: "Owner centrale state", status: "VERIFIED", authority: "CENTRAL_MARIADB", sourceRefs: ["website/scripts/wbd-owner-mariadb-store.mjs"] },
  { sourceId: "sportpaleis", label: "Sportpaleis klantfoundation", status: "VERIFIED", authority: "PRODUCTION_AND_TESTS", sourceRefs: ["website/scripts/sportpaleis-pilot-foundation.mjs", "website/tests/sportpaleis-quick-intake-adaptive-svg-v1.test.mjs"] },
  { sourceId: "bijcees-aquaflask", label: "BijCees en AquaFlask", status: "DOCUMENTED", authority: "CUSTOMER_CASE_EVIDENCE", sourceRefs: ["clients/0002-aquaflask/CASE.md", "docs/atlas/PRAKTIJKREVIEW-BIJ-CEES-LEVERING-2026-07-25.md"] },
  { sourceId: "teamkit", label: "Teamkit / digitaal voorstel", status: "NEEDS_OWNER_CONFIRMATION", authority: "NO_CANONICAL_SOURCE_FOUND", sourceRefs: [] },
]);

const COMPONENT_RULES = Object.freeze([
  { id: "OWNER_CONTROL", match: /^(?:app\/)?(?:scripts\/(?:wbd-|workspace-runtime)|src\/(?:wbd-|styles\/wbd-owner)|tests\/wbd-)/u, capabilityIds: ["owner-product-truth", "release-harvest-ingestion", "monitoring-release-validation"], moduleIds: ["owner-control-plane"] },
  { id: "SPORTPALEIS_QUICK_INTAKE", match: /quick-production-intake|quick-intake-adaptive/u, capabilityIds: ["production-quick-intake", "documents-intake", "orders-workflow"], moduleIds: ["production", "document-source-intake"] },
  { id: "SPORTPALEIS_PRODUCTION", match: /sportpaleis/u, capabilityIds: ["orders-workflow", "production-proposals", "production-plotjob-history"], moduleIds: ["production"] },
  { id: "EXPERIENCE", match: /experience/u, capabilityIds: ["experience-intake"], moduleIds: ["experience"] },
  { id: "COMMERCE", match: /aquaflask|bij.?cees|woocommerce|commerce/iu, capabilityIds: ["commerce-website-delivery", "commerce-woocommerce-diagnostics", "commerce-managed-care"], moduleIds: ["commerce"] },
  { id: "TEAMKIT", match: /teamkit|digital-proposal|digitaal-voorstel/iu, capabilityIds: [], moduleIds: ["b2b"] },
]);

function validateModule(input) {
  const value = structuredClone(input);
  value.id = required(value.id, "Module-ID", 100);
  value.name = required(value.name, "Modulenaam", 160);
  value.description = required(value.description, "Modulebeschrijving", 600);
  value.boundary = required(value.boundary, "Modulegrens", 80);
  value.maturity = enumValue(value.maturity, MATURITY, "Modulematurity");
  value.roadmap = enumValue(value.roadmap, ROADMAP, "Moduleroadmap");
  value.dependencies = unique(value.dependencies);
  value.connectors = unique(value.connectors);
  value.sourceRefs = unique(value.sourceRefs);
  return value;
}

function validatePricing(input) {
  const value = structuredClone(input);
  value.id = required(value.id, "Pricing-ID", 140);
  value.subjectType = required(value.subjectType, "Pricingsubjecttype", 80);
  value.subjectId = required(value.subjectId, "Pricingsubject", 120);
  value.oneTime = money(value.oneTime, "Eenmalige prijs");
  value.monthly = money(value.monthly, "Maandprijs");
  value.fromPrice = value.fromPrice === true;
  value.currency = value.currency === "EUR" ? "EUR" : required(value.currency, "Valuta", 3);
  value.status = enumValue(value.status, PRICING_STATUS, "Pricingstatus");
  value.internalCost = value.internalCost === true;
  value.summary = required(value.summary, "Pricingsamenvatting", 600);
  value.source = required(value.source, "Pricingbron", 500);
  value.sourceAuthority = required(value.sourceAuthority, "Pricingautoriteit", 100);
  value.effectiveDate = required(value.effectiveDate, "Pricingdatum", 10);
  value.humanApproved = value.humanApproved === true;
  if (value.status === "DEFINITIVE" && !value.humanApproved) throw new Error("Definitieve pricing vereist menselijke goedkeuring.");
  if (value.status !== "DEFINITIVE" && value.humanApproved) throw new Error("Menselijke pricinggoedkeuring hoort alleen bij definitieve pricing.");
  value.history = (Array.isArray(value.history) ? value.history : []).map((entry) => ({
    status: enumValue(entry.status, PRICING_STATUS, "Historische pricingstatus"),
    oneTime: money(entry.oneTime, "Historische eenmalige prijs"),
    monthly: money(entry.monthly, "Historische maandprijs"),
    currency: entry.currency === "EUR" ? "EUR" : required(entry.currency, "Historische valuta", 3),
    effectiveDate: required(entry.effectiveDate, "Historische pricingdatum", 10),
    source: required(entry.source, "Historische pricingbron", 500),
  }));
  return value;
}

function validateCustomerProof(input) {
  const value = structuredClone(input);
  value.id = required(value.id, "Customer-proof-ID", 140);
  value.organizationId = required(value.organizationId, "Prooforganisatie", 120);
  value.organizationName = required(value.organizationName, "Prooforganisatienaam", 180);
  value.capabilityIds = unique(value.capabilityIds);
  value.moduleIds = unique(value.moduleIds);
  value.scopeClass = enumValue(value.scopeClass, SCOPE, "Proofscope");
  value.proofStatus = enumValue(value.proofStatus, SOURCE_STATUS, "Proofstatus");
  value.summary = required(value.summary, "Proofsamenvatting", 800);
  value.evidenceRefs = unique(value.evidenceRefs);
  value.limitations = required(value.limitations, "Proofbeperkingen", 800);
  value.privacy = required(value.privacy, "Proofprivacy", 80);
  value.lastVerifiedAt = iso(value.lastVerifiedAt);
  if (value.proofStatus === "VERIFIED" && value.evidenceRefs.length === 0) throw new Error("Geverifieerd customer proof vereist evidence.");
  return value;
}

function validateRelease(input) {
  const value = structuredClone(input);
  value.id = required(value.id, "Release-ID", 180);
  value.commit = required(value.commit, "Releasecommit", 80);
  value.tag = required(value.tag, "Releasetag", 180);
  value.organizationId = required(value.organizationId, "Releaseorganisatie", 120);
  value.productId = required(value.productId, "Releaseproduct", 120);
  value.observedAt = iso(value.observedAt);
  value.ingestedAt = iso(value.ingestedAt);
  value.manifestHash = required(value.manifestHash, "Manifesthash", 64);
  value.validationStatus = required(value.validationStatus, "Releasevalidatie", 80);
  value.capabilityIds = unique(value.capabilityIds);
  value.moduleIds = unique(value.moduleIds);
  value.changedComponentIds = unique(value.changedComponentIds);
  value.componentFingerprints = value.componentFingerprints && typeof value.componentFingerprints === "object" ? value.componentFingerprints : {};
  value.fileCount = Number.isSafeInteger(value.fileCount) && value.fileCount >= 0 ? value.fileCount : 0;
  value.inferenceConfidence = new Set(["HIGH", "MEDIUM", "LOW", "INSUFFICIENT_EVIDENCE"]).has(value.inferenceConfidence) ? value.inferenceConfidence : "LOW";
  return value;
}

export function createInitialProductTruth({ now = new Date() } = {}) {
  return validateProductTruth({
    schemaVersion: 1,
    organizationId: "we-build-and-design",
    modules: MODULE_SEED,
    pricing: PRICING_SEED,
    roadmap: MODULE_SEED.map(({ id, roadmap, sourceRefs }) => ({ id: `roadmap-${id}`, subjectType: "MODULE", subjectId: id, lane: roadmap, rationale: "Afgeleid uit de huidige aantoonbare product- en evidencegrens.", sourceRefs, status: "ACTIVE" })),
    customerProof: CUSTOMER_PROOF_SEED,
    releases: [],
    harvestCandidates: [],
    issues: [
      { id: "issue-workspace-market-price", type: "PRICING_CONFIRMATION", title: "Definitieve Workspace-prijs ontbreekt", summary: "De €75-bron is founding/pilotcontext en mag niet als generieke marktprijs worden gebruikt.", status: "NEEDS_OWNER_CONFIRMATION", materialDecision: true, evidenceRefs: ["pricing-workspace-basis-founding-context"], createdAt: iso(now) },
      { id: "issue-teamkit-source-coverage", type: "SOURCE_COVERAGE", title: "Teamkit-context vraagt bronbevestiging", summary: "In de actuele repository is geen canonieke Teamkit- of digitaal-voorstelbron aangetroffen; er is niets als gebouwd of bewezen gepromoveerd.", status: "NEEDS_OWNER_CONFIRMATION", materialDecision: false, evidenceRefs: [], createdAt: iso(now) },
    ],
    rules: RULE_SEED,
    experienceContext: { eligibleModuleIds: ["commerce", "experience"], configuratorCompatibility: "PREPARED", pricingAuthority: "PRODUCT_TRUTH_ONLY_WHEN_DEFINITIVE", sourceRefs: ["website/src/experience-entry.ts", "docs/atlas/MODULE-EXPERIENCE-STANDARD-V1.md"] },
    sourceCoverage: COVERAGE_SEED,
    audit: [{ id: `product-audit-${randomUUID()}`, eventType: "PRODUCT_TRUTH_BOOTSTRAPPED", subjectId: "we-build-and-design", actor: "ATLAS_DETERMINISTIC", occurredAt: iso(now), details: { sourceCount: COVERAGE_SEED.length } }],
    lastSynchronizedAt: iso(now),
  });
}

export function validateProductTruth(input) {
  const truth = structuredClone(input ?? {});
  if (truth.schemaVersion !== 1 || truth.organizationId !== "we-build-and-design") throw new Error("WBD Product Truth-identiteit is ongeldig.");
  truth.modules = (truth.modules ?? []).map(validateModule);
  truth.pricing = (truth.pricing ?? []).map(validatePricing);
  truth.roadmap = (truth.roadmap ?? []).map((item) => ({ ...structuredClone(item), id: required(item.id, "Roadmap-ID", 140), subjectType: required(item.subjectType, "Roadmapsubjecttype", 80), subjectId: required(item.subjectId, "Roadmapsubject", 120), lane: enumValue(item.lane, ROADMAP, "Roadmaplane"), rationale: required(item.rationale, "Roadmapduiding", 600), sourceRefs: unique(item.sourceRefs), status: item.status === "PARKED" ? "PARKED" : "ACTIVE" }));
  truth.customerProof = (truth.customerProof ?? []).map(validateCustomerProof);
  truth.releases = (truth.releases ?? []).map(validateRelease);
  truth.harvestCandidates = Array.isArray(truth.harvestCandidates) ? truth.harvestCandidates : [];
  truth.issues = Array.isArray(truth.issues) ? truth.issues : [];
  truth.rules = Array.isArray(truth.rules) ? truth.rules : [];
  truth.experienceContext = truth.experienceContext && typeof truth.experienceContext === "object" ? truth.experienceContext : {};
  truth.sourceCoverage = (truth.sourceCoverage ?? []).map((item) => ({ ...structuredClone(item), sourceId: required(item.sourceId, "Coveragebron", 120), label: required(item.label, "Coveragelabel", 160), status: enumValue(item.status, SOURCE_STATUS, "Coveragestatus"), authority: required(item.authority, "Coverageautoriteit", 120), sourceRefs: unique(item.sourceRefs) }));
  truth.audit = Array.isArray(truth.audit) ? truth.audit.slice(-2_000) : [];
  truth.lastSynchronizedAt = iso(truth.lastSynchronizedAt);
  for (const key of ["modules", "pricing", "roadmap", "customerProof", "releases", "harvestCandidates", "issues", "sourceCoverage"]) {
    const ids = truth[key].map(({ id, sourceId }) => id ?? sourceId);
    if (new Set(ids).size !== ids.length) throw new Error(`Dubbele Product Truth-identiteit in ${key}.`);
  }
  return truth;
}

function componentFingerprints(files) {
  const result = {};
  for (const rule of COMPONENT_RULES) {
    const matches = files.filter(({ path }) => rule.match.test(String(path))).map(({ path, sha256: digest }) => `${path}:${digest}`).sort();
    if (matches.length) result[rule.id] = sha256(matches.join("\n"));
  }
  return result;
}

function normalizeReleaseManifest(manifest, now) {
  if (!manifest || typeof manifest !== "object") return null;
  const releaseId = required(manifest.releaseId, "Manifest release-ID", 180);
  const commit = required(manifest.commit, "Manifestcommit", 80);
  const tag = required(manifest.tag, "Manifesttag", 180);
  const files = Array.isArray(manifest.files) ? manifest.files.filter((item) => item && typeof item.path === "string" && typeof item.sha256 === "string") : [];
  const manifestHash = sha256(stableJson({ releaseId, commit, tag, baseFreeze: manifest.baseFreeze ?? null, files: files.map(({ path, sha256: digest }) => ({ path, sha256: digest })) }));
  return { releaseId, commit, tag, observedAt: manifest.sourceDate ? `${manifest.sourceDate}T12:00:00.000Z` : iso(now), manifestHash, files, componentFingerprints: componentFingerprints(files) };
}

function inferRelease(previous, normalized) {
  const componentIds = Object.keys(normalized.componentFingerprints);
  const changed = previous
    ? componentIds.filter((id) => previous.componentFingerprints[id] !== normalized.componentFingerprints[id])
    : componentIds;
  const capabilityIds = unique(changed.flatMap((componentId) => COMPONENT_RULES.find(({ id }) => id === componentId)?.capabilityIds ?? []));
  const moduleIds = unique(changed.flatMap((componentId) => COMPONENT_RULES.find(({ id }) => id === componentId)?.moduleIds ?? []));
  return { changed, capabilityIds, moduleIds, confidence: previous ? "MEDIUM" : "LOW" };
}

export function synchronizeProductTruth(inputTruth, { capabilities = [], releaseManifest = null, now = new Date() } = {}) {
  const truth = validateProductTruth(inputTruth ?? createInitialProductTruth({ now }));
  const events = [];
  const normalized = normalizeReleaseManifest(releaseManifest, now);
  if (normalized && !truth.releases.some(({ id }) => id === normalized.releaseId)) {
    const previous = truth.releases.at(-1) ?? null;
    const inference = inferRelease(previous, normalized);
    const release = validateRelease({
      id: normalized.releaseId,
      commit: normalized.commit,
      tag: normalized.tag,
      organizationId: "we-build-and-design",
      productId: "workspace-core",
      observedAt: normalized.observedAt,
      ingestedAt: iso(now),
      manifestHash: normalized.manifestHash,
      validationStatus: "IMMUTABLE_RELEASE_MANIFEST",
      capabilityIds: inference.capabilityIds.filter((id) => capabilities.some((capability) => capability.id === id)),
      moduleIds: inference.moduleIds,
      changedComponentIds: inference.changed,
      componentFingerprints: normalized.componentFingerprints,
      fileCount: normalized.files.length,
      inferenceConfidence: inference.confidence,
    });
    truth.releases.push(release);
    const candidate = {
      id: `product-harvest-${sha256(release.id).slice(0, 24)}`,
      sourceType: "IMMUTABLE_RELEASE",
      sourceId: release.id,
      title: "Release-evidence naar Product Truth",
      summary: `${release.id} is automatisch opgenomen. Component- en capabilityduiding blijft ${release.inferenceConfidence.toLowerCase()} confidence totdat klantgebruik of gerichte evidence dit bevestigt.`,
      proposedScopeClass: "UNRESOLVED",
      capabilityIds: release.capabilityIds,
      moduleIds: release.moduleIds,
      evidenceRefs: [`product-release-${release.manifestHash.slice(0, 24)}`],
      confidence: release.inferenceConfidence,
      status: "CANDIDATE",
      promotionRequiresHumanDecision: true,
      createdAt: iso(now),
    };
    truth.harvestCandidates.push(candidate);
    truth.audit.push({ id: `product-audit-${randomUUID()}`, eventType: "RELEASE_EVIDENCE_INGESTED", subjectId: release.id, actor: "ATLAS_DETERMINISTIC", occurredAt: iso(now), details: { manifestHash: release.manifestHash, capabilityIds: release.capabilityIds, moduleIds: release.moduleIds } });
    truth.audit.push({ id: `product-audit-${randomUUID()}`, eventType: "HARVEST_CANDIDATE_CREATED", subjectId: candidate.id, actor: "ATLAS_DETERMINISTIC", occurredAt: iso(now), details: { sourceId: release.id, confidence: candidate.confidence } });
    events.push({ type: "RELEASE_INGESTED", release, candidate });
  }
  truth.lastSynchronizedAt = iso(now);
  if (truth.audit.length > 2_000) truth.audit.splice(0, truth.audit.length - 2_000);
  return { truth: validateProductTruth(truth), events };
}

function capabilityMaturity(capability) {
  if (capability.status === "PROVEN_REUSABLE") return "REUSABLE";
  if (String(capability.status).startsWith("PROVEN_")) return "PROVEN";
  if (capability.status === "PARTIAL") return "BUILT";
  return "CONCEPT";
}

function moduleForCapability(capability) {
  const category = String(capability.category ?? "");
  if (/Production|Orders/u.test(category)) return "production";
  if (/Document/u.test(category)) return "document-source-intake";
  if (/Commerce/u.test(category)) return "commerce";
  if (/Experience/u.test(category)) return "experience";
  if (/Identity|Organization|Infrastructure/u.test(category)) return "workspace-core";
  return "owner-control-plane";
}

export function projectProductTruth(inputTruth, { capabilities = [], now = new Date() } = {}) {
  const truth = validateProductTruth(inputTruth);
  const capabilityContext = capabilities.map((capability) => {
    const moduleId = moduleForCapability(capability);
    return {
      capabilityId: capability.id,
      moduleId,
      maturity: capabilityMaturity(capability),
      scopeClass: capability.customerSpecificShare === "HIGH" ? "CUSTOMER_SPECIFIC" : capability.customerSpecificShare === "MEDIUM" ? "GENERIC_WITH_CONFIGURATION" : "GENERIC",
      roadmap: truth.roadmap.find((item) => item.subjectId === moduleId)?.lane ?? "LATER",
      pricing: truth.pricing.filter((item) => item.subjectId === capability.id || item.subjectId === moduleId),
      recentReleases: truth.releases.filter((release) => release.capabilityIds.includes(capability.id) || release.moduleIds.includes(moduleId)).slice(-3).reverse().map(({ id, observedAt, inferenceConfidence }) => ({ id, observedAt, inferenceConfidence })),
      limitations: capability.guidance,
    };
  });
  return {
    schemaVersion: 1,
    generatedAt: iso(now),
    lastSynchronizedAt: truth.lastSynchronizedAt,
    modules: truth.modules,
    pricing: truth.pricing,
    roadmap: truth.roadmap,
    customerProof: truth.customerProof,
    releases: truth.releases.slice().reverse(),
    harvestCandidates: truth.harvestCandidates.filter(({ status }) => status === "CANDIDATE"),
    issues: truth.issues.filter(({ status }) => status !== "RESOLVED"),
    rules: truth.rules,
    experienceContext: truth.experienceContext,
    sourceCoverage: truth.sourceCoverage,
    capabilityContext,
    auditTail: truth.audit.slice(-50).reverse(),
  };
}

export const wbdProductTruthContract = Object.freeze({
  schemaVersion: 1,
  maturity: Object.freeze([...MATURITY]),
  roadmap: Object.freeze([...ROADMAP]),
  scopeClasses: Object.freeze([...SCOPE]),
  pricingStatuses: Object.freeze([...PRICING_STATUS]),
});
