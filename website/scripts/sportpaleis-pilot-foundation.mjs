import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile, readdir } from "node:fs/promises";
import { closeSync, fsyncSync, linkSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  SPORTPALEIS_ASSOCIATIONS,
  SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM,
  SPORTPALEIS_CONFIGURATION_VERSION,
  SPORTPALEIS_FONT_CONFIRMATION,
  SPORTPALEIS_JUNIOR_RULE_SOURCE,
} from "../config/sportpaleis-bedrukking-configuration.mjs";
import { authoritativeProductionAssetById, SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS } from "../config/sportpaleis-authoritative-production-assets.mjs";
import { SPORTPALEIS_LIVE_PILOT_ARTICLES } from "../config/sportpaleis-live-pilot-catalog.mjs";
import { createCutJobBatch, createProductionPreview, groupSemanticNumberObjects, SPORTPALEIS_MACHINE_CONSTRAINTS } from "../src/sportpaleis/direct-print/index.ts";
import {
  CUTJOB_SVG_WRITER,
  PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID,
  productionPieceFromSource,
  productionSourceByIdentity,
  resolveProductionSource,
  availableProductionSourceIdentities,
} from "../src/sportpaleis/production-sources.ts";
import {
  createManagedFontProductionPiece,
  inspectManagedFontAdmission,
  validateManagedFontBytes,
} from "../src/sportpaleis/managed-font-production.mjs";
import {
  inspectProductionAssetSource,
  NUMBER_GLYPH_SPACING_MM,
  productionAssetPreviewSvg,
  productionAssetPiece,
  productionAssetPieces,
} from "../src/sportpaleis/production-assets.mjs";
import { verifiedProductionNumberSources } from "../src/sportpaleis/verified-production-number-sources.mjs";
import { OWNER_SUPPLIED_FONT_EVIDENCE } from "../src/sportpaleis/front-name-production-truth.mjs";
import { buildSportpaleisProductCatalog, querySportpaleisProductCatalog } from "../src/sportpaleis/product-catalog.ts";
import { canonicalTeamkitArticleSurfaceTruth, canonicalTeamkitProductType, canonicalTeamkitSurfaceTruth } from "../src/sportpaleis/teamkit-product-surfaces.mjs";
import { resolveCatalogPersonalizationPrice } from "../src/sportpaleis/catalog-personalization-pricing.mjs";
import { canonicalArticlePersonalizationFields, canonicalOrderFoilColors, executableProductionAssetDecision, productionAssetContextDecision, productionAssetReuseDecision, productionFontAssociationDecision, productionFontExecutableDecision, productionObjectFitsTrack } from "../src/sportpaleis/production-practice-contract.mjs";
import {
  createWorkspacePasswordRecord,
  verifyWorkspacePassword,
} from "./workspace-auth-foundation.mjs";
import {
  ensureWbdReviewDeveloperAccessState,
  persistWbdReviewDeveloperAccessDenial,
  WBD_REVIEW_DEVELOPER_PRINCIPAL,
  WbdReviewDeveloperAccessPolicy,
} from "./wbd-review-developer-access.mjs";
import { classifySportpaleisReviewRequest } from "./sportpaleis-review-access-policy.mjs";
import {
  reconcileSportpaleisEmployeeDirectory,
} from "./sportpaleis-employee-directory.mjs";
import {
  createSportpaleisWebsiteSource,
  createSportpaleisWebsiteSyncState,
  failSportpaleisWebsiteSync,
  publicSportpaleisWebsiteSync,
  stageSportpaleisWebsiteSync,
} from "./sportpaleis-website-sync.mjs";
import {
  createSportpaleisWebshopIntakeState,
  parseSportpaleisDividePdfText,
  reconcileSportpaleisDivideRevision,
} from "./sportpaleis-divide-import.mjs";
import {
  SPORTPALEIS_MAILBOX_ID,
  classifySportpaleisMailboxMessage,
  createSportpaleisMailboxRoutingState,
  prepareSportpaleisMailboxMessage,
  publicSportpaleisMailboxRouting,
} from "./sportpaleis-mailbox-routing.mjs";
import {
  createQuickProductionIntakeRecord,
  inspectQuickProductionSource,
  publicQuickProductionIntake,
  quickIntakeOrderPayload,
} from "../src/sportpaleis/quick-production-intake.mjs";
import {
  createVisualStudioComposition,
  submitVisualStudioReview,
  updateVisualStudioComposition,
  upgradeVisualStudioComposition,
  validateVisualStudioCompositions,
} from "../src/sportpaleis/visual-studio.mjs";
import { createCreativeVectorCandidate } from "../src/sportpaleis/creative-vectorization.mjs";
import { cleanupEvidenceManifest, preliveCleanupInventory } from "./sportpaleis-prelive-order-cleanup.mjs";
import {
  approvedFulfillmentTasks,
  assertImmutableAuthoritativeProposalVisualProof,
  createCustomerAccess,
  createProposalRevision,
  customerProposal,
  findProposalByCustomerToken,
  generateProposalPdf,
  inspectTeamkitProposalSource,
  normalizeProposalItems,
  proposalSha256,
  publicProposal,
  renderProposalPreview,
  validateTeamkitProposalState,
} from "../src/sportpaleis/teamkit-proposals.mjs";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "sportpaleis_session";
const BOOTSTRAP_CSRF_PREFIX = "session-bound:";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PERSONAL_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 6;
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const ROLE = new Set(["admin", "operator", "store", "support"]);
const STAGE_ORDER = ["ORDER", "CONTROL", "PRINT", "DONE"];
const MAX_BODY_BYTES = 34 * 1024 * 1024;
const PILOT_SCHEMA_VERSION = 18;
const BOOTSTRAP_RECENT_PRODUCTION_JOB_LIMIT = 24;
const PRODUCTION_HISTORY_PAGE_LIMIT = 40;
const PRODUCTION_HISTORY_PAGE_LIMIT_MAX = 80;
const BOOTSTRAP_RECENT_COMPLETED_ORDER_LIMIT = 120;
const ORDER_HISTORY_PAGE_LIMIT = 40;
const ORDER_HISTORY_PAGE_LIMIT_MAX = 80;
const PILOT_RELEASE_ID = "SPW-FOIL-ROLLS-PILOT-CORRECTION-20260817";
const LEGACY_PIONEERS_ASSOCIATION = "Almerer Pioneers";
const CANONICAL_PIONEERS_ASSOCIATION = "Almere Pioneers";
const canonicalAssociationName = (value) => String(value ?? "") === LEGACY_PIONEERS_ASSOCIATION ? CANONICAL_PIONEERS_ASSOCIATION : value;
const DEFAULT_ARTIFACT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const INSTALLED_PRODUCTION_ASSET_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist-workspace");
const BACK_NUMBER_SIZE_CLASSES = new Set(["JUNIOR", "SENIOR"]);
const PERSONALIZATION_FIELDS = ["initials", "name", "backNumber", "chestNumber", "shortsNumber"];
const CANONICAL_PRODUCTION_RESOLVER_VERSION = "CANONICAL_PRODUCTION_TRUTH_V2";
export const SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH = Object.freeze({
  kind: "NAAMBALK",
  semantic: "COMPOSED_APPLICATION",
  componentFields: Object.freeze(["name", "backNumber"]),
  aggregatePhysicalDimensions: null,
  dimensionAuthority: "EXISTING_COMPONENT_PRODUCTION_PROFILES",
  source: "Human Product Truth 2026-08-26",
});
const NON_WINKEL_ORDER_MAIL_TEMPLATES = new Set(["ORDER_QUESTION"]);
const PRODUCTION_PROOF_STATUSES = new Set(["CONFIGURED", "GEOMETRY_VALIDATED", "WINPLOT_VALIDATED", "PHYSICALLY_VALIDATED", "DATA_GAP"]);
const PRODUCTION_LINE_TYPES = new Set(["TEXT", "INITIALS", "NUMBER", "LOGO", "PRODUCTION_ELEMENT"]);
const FONT_SIGNATURES = new Map([
  ["00010000", { mimeType: "font/ttf", extension: ".ttf" }],
  ["4f54544f", { mimeType: "font/otf", extension: ".otf" }],
  ["774f4646", { mimeType: "font/woff", extension: ".woff" }],
  ["774f4632", { mimeType: "font/woff2", extension: ".woff2" }],
]);
function canonicalManagedFont(assetId) {
  const asset = authoritativeProductionAssetById(assetId);
  if (!asset || asset.kind !== "MANAGED_FONT") throw new Error(`Authoritative managed-font Product Truth ontbreekt: ${assetId}`);
  const {
    id, name, originalFilename, version, sha256: hash, mimeType, sizeBytes, addedAt, uploadedBy,
    provenance, authority, status, allowedInStore, artifactPath, familyName, subfamilyName, fullName,
    postscriptName, aliases, authoritativeIdentity, admission,
  } = asset;
  return Object.freeze({
    id, name, originalFilename, version, sha256: hash, mimeType, sizeBytes, addedAt, uploadedBy,
    provenance, authority, status, allowedInStore, sourceUrl: `/${artifactPath}`,
    registryProjection: "SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSET",
    ...(familyName ? { familyName } : {}),
    ...(subfamilyName ? { subfamilyName } : {}),
    ...(fullName ? { fullName } : {}),
    ...(postscriptName ? { postscriptName } : {}),
    ...(aliases ? { aliases: [...aliases] } : {}),
    ...(authoritativeIdentity ? { authoritativeIdentity } : {}),
    ...(admission ? { admission: structuredClone(admission) } : {}),
  });
}
const CANONICAL_PRODUCTION_FONTS = Object.freeze(SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.filter(({ kind }) => kind === "MANAGED_FONT").map(({ id }) => canonicalManagedFont(id)));
const PILOT_FONT = CANONICAL_PRODUCTION_FONTS.find(({ id }) => id === "font-liberation-sans-regular-f8ace1f8");
const SPAIN_EURO_2016_FONT = CANONICAL_PRODUCTION_FONTS.find(({ id }) => id === "font-5d083befacdf98ae");

function reconcileCanonicalProductionFonts(state) {
  state.productionFonts ??= [];
  for (const source of CANONICAL_PRODUCTION_FONTS) {
    const matches = state.productionFonts.filter(({ id, sha256: hash }) => id === source.id || String(hash ?? "").toUpperCase() === source.sha256);
    if (matches.length > 1) throw new Error(`Dubbele canonieke productiefontbron: ${source.id}`);
    if (matches.length === 1 && (matches[0].id !== source.id || String(matches[0].sha256 ?? "").toUpperCase() !== source.sha256)) throw new Error(`Conflicterende canonieke productiefontidentity: ${source.id}`);
    if (!matches.length) state.productionFonts.push(structuredClone(source));
    else {
      // An exact immutable registry identity owns these technical fields. A
      // legacy display projection (for example "Spain") must not erase the
      // authority that the same exact bytes already have in Product Truth.
      const existing = matches[0];
      const allowedInStore = existing.allowedInStore;
      Object.assign(existing, structuredClone(source));
      if (typeof allowedInStore === "boolean") existing.allowedInStore = allowedInStore;
    }
  }
}

const normalizedSourceIdentity = (value) => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/gu, "");

function registeredManagedFontForProfile(profile) {
  const configured = normalizedSourceIdentity(profile?.fontProfile);
  if (!configured) return null;
  const matches = SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.filter((asset) => asset.kind === "MANAGED_FONT"
    && [asset.name, asset.familyName, asset.postscriptName, ...(asset.aliases ?? [])].some((identity) => normalizedSourceIdentity(identity) === configured));
  if (matches.length > 1) throw new Error(`Conflicterende authoritative fontregistraties voor profiel ${profile.id}.`);
  return matches[0] ?? null;
}

function reconcileCanonicalProductionProfileSources(state) {
  for (const profile of state.productionProfiles ?? []) {
    const registered = registeredManagedFontForProfile(profile);
    if (profile.canonicalFontSourceId && registered && profile.canonicalFontSourceId !== registered.id) {
      if (profile.canonicalFontSourceAuthority !== "AUTHORITATIVE_REGISTRY_PROJECTION") {
        throw new Error(`Productieprofiel ${profile.id} conflicteert met de authoritative fontregistry.`);
      }
    }
    if (registered) {
      profile.canonicalFontSourceId = registered.id;
      profile.canonicalFontSourceAuthority = "AUTHORITATIVE_REGISTRY_PROJECTION";
    }
  }
}

const ARTICLE_CATALOG = structuredClone(SPORTPALEIS_LIVE_PILOT_ARTICLES);
for (const article of ARTICLE_CATALOG.filter(({ association, articleNumber }) => association === "Almere Pioneers" && ["116386", "116388"].includes(String(articleNumber)))) {
  article.supports = [...new Set([...(article.supports ?? []), "backNumber", "chestNumber"])];
  article.personalizationPolicy = { mode: "combination", fields: { ...(article.personalizationPolicy?.fields ?? {}), backNumber: "optional", chestNumber: "optional" } };
  if (!article.commercialPrintOptions?.some(({ canonicalField }) => canonicalField === "chestNumber")) article.commercialPrintOptions = [...(article.commercialPrintOptions ?? []), { sourceLabel: "Rug / Borst / Short nummer · borst", canonicalField: "chestNumber", priceEur: 0, status: "VALIDATED" }];
  article.priceConfiguration ??= { articleUnitPriceEur: null, personalizationUnitPricesEur: {}, sourceLabel: "Pioneers praktijkcorrectie 2026-08-25" };
  article.priceConfiguration.personalizationUnitPricesEur ??= {};
  article.priceConfiguration.personalizationUnitPricesEur.chestNumber ??= article.priceConfiguration.personalizationUnitPricesEur.backNumber ?? 0;
}
for (const article of ARTICLE_CATALOG.filter(({ association, articleNumber }) => association === "FC Huizen" && ["131245", "131246", "131247"].includes(String(articleNumber)))) {
  article.supports = [...new Set([...(article.supports ?? []), "name"])];
  article.personalizationPolicy = { mode: "combination", fields: { ...(article.personalizationPolicy?.fields ?? {}), name: "optional" } };
}
const ARTICLE_IMAGE_KEYS = new Set(ARTICLE_CATALOG.map(({ imageKey }) => imageKey));

const PRODUCTION_PROFILES = [
  { id: "profile-shirt", name: "A.S.C. wedstrijdshirt · rug", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Junior/Senior rugnummer 20 cm", fontProfile: "Schluber (Spain voor thuiswedstrijdshirt)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials", "name", "backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE }, JUNIOR: { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE } } },
  { id: "profile-keeper", name: "A.S.C. keeperstrui · rug", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Junior/Senior rugnummer 20 cm", fontProfile: "Schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials", "name", "backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE }, JUNIOR: { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE } } },
  { id: "profile-shorts", name: "A.S.C. wedstrijdshort · pijp", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Shortnummer 7,5 cm", fontProfile: "Schluber (Spain voor thuiswedstrijdshort)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials", "shortsNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-initials", name: "A.S.C. initialen · borst", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Initialen 3 cm", fontProfile: "Schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-none", name: "Geen bedrukking", placement: "Niet van toepassing", referenceDistanceCm: null, sizeLabel: "Geen", fontProfile: "Niet van toepassing", foilColor: "Niet van toepassing", mirror: false, rotationDeg: 0, supports: [], instruction: "Dit artikel heeft standaard geen bedrukking." },
  { id: "profile-pending", name: "Live artikel · productie-inrichting volgt", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "DATA_GAP", fontProfile: "Onbekend", foilColor: "Onbekend", mirror: null, rotationDeg: null, supports: [], instruction: "Kritieke productie-inrichting ontbreekt. Het artikel mag worden besteld en naar Productie gaan, maar de uiteindelijke productieactie blijft geblokkeerd tot maat, bedrukoptie, letterprofiel en foliekleur voldoende zijn bevestigd." },
];
PRODUCTION_PROFILES.push(
  { id: "profile-shirt-home", name: "A.S.C. thuiswedstrijdshirt · rugnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Junior bronwaarde 20 cm · Senior 22 cm", fontProfile: "Schluber (Spain voor thuiswedstrijdshirt)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A5:J5" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
  { id: "profile-shirt-standard", name: "A.S.C. shirt · rugnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Junior bronwaarde 20 cm · Senior 22 cm", fontProfile: "Schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A5:J5" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
  { id: "profile-shorts-home", name: "A.S.C. thuiswedstrijdshort · shortnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Shortnummer 7,5 cm", fontProfile: "Schluber (Spain voor thuiswedstrijdshort)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["shortsNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-shorts-standard", name: "A.S.C. short · shortnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Shortnummer 7,5 cm", fontProfile: "Schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["shortsNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-initials-shirt", name: "A.S.C. shirt · initialen", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Initialen op shirt 3 cm", fontProfile: "Schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-initials-other", name: "A.S.C. overig artikel · initialen", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "DATA_GAP · fysieke maat niet artikel-specifiek bevestigd", fontProfile: "Schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials"], instruction: "DATA_GAP: de fysieke bedrukkingsmaat ontbreekt en blokkeert productie. Positie, referentieafstand, rotatie en spiegeling zijn niet-blokkerende pilot-aandachtspunten." },
  { id: "profile-unmapped-number", name: "A.S.C. live optie ‘Nummer’ · betekenis onbevestigd", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "DATA_GAP", fontProfile: "Schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: [], instruction: "DATA_GAP: live optie ‘Nummer’ is niet bevestigd als rug-, borst- of shortnummer en mag niet naar productie." },
  { id: "profile-fc-shirt-home", name: "FC Almere wedstrijdshirt · rugnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Junior bronwaarde 20 cm · Senior 22 cm", fontProfile: "Schluber (Spain voor thuiswedstrijdshirt)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A10:J10" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
  { id: "profile-fc-unmapped-number", name: "FC Almere live optie ‘Nummer’ · betekenis onbevestigd", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "DATA_GAP", fontProfile: "Schluber (Spain voor thuiswedstrijdshort)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: [], instruction: "DATA_GAP: live optie ‘Nummer’ is niet bevestigd als rug-, borst- of shortnummer en mag niet naar productie." },
  { id: "profile-dcg-initials-set", name: "DCG trainingspak · initialen", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Initialen 3 cm", fontProfile: "Schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials"], instruction: "Verenigingsinstellingen voor DCG zijn leidend. Positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald." },
  { id: "profile-mhc-shirt-away", name: "MHC Lelystad uitshirt · naam/rugnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Naam 3,2 cm · Rug Senior 22 cm", fontProfile: "Myriad Pro Bold", foilColor: "Zwart", mirror: null, rotationDeg: null, supports: ["name", "backNumber"], instruction: "Verenigingsinstellingen voor MHC Lelystad zijn leidend. Uit is zwart; nummer is outline; naam met hoofdletter. Positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A13:J13" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Wordt door de vereniging-Juniorregel bepaald." } } },
  { id: "profile-pioneers-shirt", name: "Almere Pioneers shirt · nummer/naam", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Rug Junior/Senior 20 cm · breedte proportioneel afgeleid · Borst 8 cm · Naam 2 cm/max. 9 cm breed", fontProfile: "FFF englisch", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["backNumber", "name"], instruction: "De immutable Pioneers-SVG is genormaliseerd naar tien enkelglyphs 0–9; ieder rugnummer wordt op 200 mm hoogte en zonder horizontale vervorming gezet. Positie, spiegeling en rotatie volgen de productieregel.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE }, JUNIOR: { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE } } },
  { id: "profile-pioneers-shorts", name: "Almere Pioneers short · shortnummer/naam", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Shortnummer bronwaarde 8 cm · Naam 2 cm/max. 9 cm breed", fontProfile: "FFF englisch", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["shortsNumber", "name"], instruction: "DATA_GAP: de fysieke Snijtest 001 betrof Senior-rugnummers op 200 mm en bewijst geen shortplaatsing of shortoutput op 80 mm." },
);
const profileSlug = (value) => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sourceProfileFields = [
  ["initials", "Initialen", "initialsShirt"],
  ["name", "Naam", "nameHeight"],
  ["backNumber", "Rugnummer", "backNumberSenior"],
  ["chestNumber", "Borstnummer", "chestNumber"],
  ["shortsNumber", "Shortnummer", "shortsNumber"],
];
const articleProductionProfileField = (articleNumber, field) => articleNumber === "140298" && field === "chestNumber" ? "initials" : field;

export function canonicalProductionProfileForDecoration(state, item, field) {
  const productionField = articleProductionProfileField(item.articleNumber, field);
  const baseProfile = state.productionProfiles.find(({ id }) => id === item.productionProfileId);
  const fieldProfileId = `profile-source-${profileSlug(item.association)}-${productionField}`;
  const fieldProfile = state.productionProfiles.find(({ id, supports }) => id === fieldProfileId && supports?.includes(productionField));
  const profile = baseProfile?.supports?.includes(productionField) ? baseProfile : fieldProfile ?? baseProfile ?? null;
  return { field, productionField, profile, fieldProfileId };
}
for (const association of SPORTPALEIS_ASSOCIATIONS) {
  for (const [field, label, dimensionKey] of sourceProfileFields) {
    if (!(association.productionApplications ?? []).includes(field)) continue;
    const id = `profile-source-${profileSlug(association.name)}-${field}`;
    const dimensionCm = association.dimensionsCm[dimensionKey];
    const fontConfigured = Boolean(association.fontProfile && !["X", "DATA_GAP"].includes(association.fontProfile));
    const foilConfigured = association.foilColors.length > 0;
    PRODUCTION_PROFILES.push({
      id,
      name: `${association.name} · ${label.toLowerCase()}`,
      placement: "Onbevestigd",
      referenceDistanceCm: null,
      sizeLabel: dimensionCm == null ? `${label} · DATA_GAP` : `${label} ${dimensionCm} cm`,
      fontProfile: association.fontProfile || "Onbekend",
      foilColor: association.foilColors.join(" / ") || "Onbekend",
      mirror: null,
      rotationDeg: null,
      supports: [field],
      instruction: `Bronconfiguratie ${association.source.file} · ${association.source.sheet}!${association.source.range}. Workspace gebruikt de bevestigde maat, letter-/nummerbron en foliekleur; plaatsing, spiegeling en veilige rotatie volgen automatisch uit de productieregel.`,
      ...(field === "backNumber" ? {
        backNumberSizeClasses: {
          SENIOR: dimensionCm == null
            ? { physicalHeightMm: null, status: "DATA_GAP", source: `${association.source.file} · ${association.source.sheet}!${association.source.range}` }
            : { physicalHeightMm: dimensionCm * 10, status: "SOURCE_CONFIGURED", source: `${association.source.file} · ${association.source.sheet}!${association.source.range}` },
          JUNIOR: { physicalHeightMm: SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE },
        },
      } : {}),
      sourceValidation: {
        size: dimensionCm == null ? "DATA_GAP" : "SOURCE_CONFIGURED",
        font: fontConfigured ? "SOURCE_CONFIGURED" : "DATA_GAP",
        foilColor: foilConfigured ? "SOURCE_CONFIGURED" : "DATA_GAP",
      },
    });
  }
}
PRODUCTION_PROFILES.push({
  id: "profile-mhc-shirt-home",
  name: "MHC Lelystad thuisshirt · naam/rugnummer",
  placement: "Onbevestigd",
  referenceDistanceCm: null,
  sizeLabel: "Naam 3,2 cm · Rug Senior 22 cm",
  fontProfile: "Myriad Pro Bold",
  foilColor: "Wit",
  mirror: null,
  rotationDeg: null,
  supports: ["name", "backNumber"],
  instruction: "Bronconfiguratie: thuis wit; nummer outline; naam met hoofdletter. Workspace past plaatsing, spiegeling en veilige rotatie automatisch toe.",
  backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A13:J13" }, JUNIOR: { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE } },
});
for (const profile of PRODUCTION_PROFILES.filter(({ supports }) => supports?.includes("backNumber"))) {
  profile.backNumberSizeClasses = {
    SENIOR: { physicalHeightMm: SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE },
    JUNIOR: { physicalHeightMm: SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE },
  };
  profile.sizeLabel = String(profile.sizeLabel ?? "Rugnummer").replace(/(?:Junior[^·]*·\s*)?Senior\s*(?:rugnummer\s*)?\d+(?:[,.]\d+)?\s*cm/iu, "Junior/Senior rugnummer 20 cm");
}
for (const profile of PRODUCTION_PROFILES) {
  profile.revision = 1;
  profile.validationHistory = [];
  profile.validation = profile.id === "profile-none" ? {
    status: "VALIDATED", source: "Goedgekeurde artikelregel: dit profiel produceert geen bedrukking.",
    placement: "VALIDATED", referenceDistance: "VALIDATED", size: "VALIDATED", font: "VALIDATED", foilColor: "VALIDATED", rotation: "VALIDATED", mirror: "VALIDATED",
  } : {
    status: "PARTIAL", source: "Maat, letterprofiel en foliekleur: info bedrukkingen 2026.xlsx · Blad1!A5:J5. Positie, afstand, rotatie en spiegeling onbevestigd.",
    placement: "DATA_GAP", referenceDistance: "DATA_GAP", size: "SOURCE_CONFIGURED", font: "SOURCE_CONFIGURED", foilColor: "SOURCE_CONFIGURED", rotation: "DATA_GAP", mirror: "DATA_GAP",
  };
  if (["profile-initials-other", "profile-unmapped-number", "profile-fc-unmapped-number"].includes(profile.id)) {
    profile.validation.status = "DATA_GAP";
    profile.validation.size = "DATA_GAP";
  }
  if (profile.id === "profile-pending") {
    profile.validation = {
      status: "DATA_GAP",
      source: "Human pilotbesluit 2026-08-10: live artikelen blijven orderbaar; alleen werkelijk noodzakelijke uitvoerdata blokkeert de uiteindelijke productieactie.",
      placement: "DATA_GAP", referenceDistance: "DATA_GAP", size: "DATA_GAP", font: "DATA_GAP", foilColor: "DATA_GAP", rotation: "DATA_GAP", mirror: "DATA_GAP",
    };
  }
  if (profile.id.startsWith("profile-source-")) {
    profile.validation = {
      status: profile.sourceValidation.size === "SOURCE_CONFIGURED" && profile.sourceValidation.font === "SOURCE_CONFIGURED" && profile.sourceValidation.foilColor === "SOURCE_CONFIGURED" ? "PARTIAL" : "DATA_GAP",
      source: profile.instruction,
      placement: "DATA_GAP",
      referenceDistance: "DATA_GAP",
      size: profile.sourceValidation.size,
      font: profile.sourceValidation.font,
      foilColor: profile.sourceValidation.foilColor,
      rotation: "DATA_GAP",
      mirror: "DATA_GAP",
      cutContour: "DATA_GAP",
      physicalCutOutput: "DATA_GAP",
    };
    delete profile.sourceValidation;
  }
  if (profile.id.startsWith("profile-fc-")) profile.validation.source = "Maat, letterprofiel en foliekleur: info bedrukkingen 2026.xlsx · Blad1!A10:J10. Positie, afstand, rotatie en spiegeling onbevestigd.";
  if (profile.id === "profile-dcg-initials-set") profile.validation.source = "Maat, letterprofiel en foliekleur: info bedrukkingen 2026.xlsx · Blad1!A8:J8. Commerciële bedrukoptie: actuele live Sportpaleis-productpagina.";
  if (profile.id === "profile-mhc-shirt-away") profile.validation.source = "Maat, letterprofiel en foliekleur: info bedrukkingen 2026.xlsx · Blad1!A13:J13. Commerciële bedrukopties: actuele live Sportpaleis-productpagina.";
}
const pioneersShirtProfile = PRODUCTION_PROFILES.find(({ id }) => id === "profile-pioneers-shirt");
pioneersShirtProfile.validation = {
  status: "DATA_GAP",
  source: "info bedrukkingen 2026.xlsx · Blad1!A3:J3; outputs/Sportpaleis-Snijtest-001/PROVENANCE.md; website/docs/sportpaleis-workspace-pilot-001/PILOT-BUILD-AND-MIGRATION-READINESS.md; human confirmation 2026-08-10.",
  placement: "DATA_GAP", referenceDistance: "DATA_GAP", size: "SOURCE_CONFIGURED", font: "SOURCE_CONFIGURED", foilColor: "SOURCE_CONFIGURED", rotation: "DATA_GAP", mirror: "DATA_GAP",
  cutContour: "VALIDATED", physicalCutOutput: "VALIDATED",
  validatedScope: ["Senior rugnummerhoogte 200 mm", "Snijlijnen/cijfercontouren 2, 34 en 77", "Fysieke snijtest uitgevoerd en snijlijnen correct bevestigd"],
};
const pioneersShortsProfile = PRODUCTION_PROFILES.find(({ id }) => id === "profile-pioneers-shorts");
pioneersShortsProfile.validation.source = "info bedrukkingen 2026.xlsx · Blad1!A3:J3. Snijtest 001 valideert niet de shortoutput op 80 mm.";
pioneersShortsProfile.validation.cutContour = "DATA_GAP";
pioneersShortsProfile.validation.physicalCutOutput = "DATA_GAP";

const PILOT_SETTINGS = {
  processingDays: 5,
  deliveryFeeEur: 3.95,
  productionDefaults: { workingWidthMm: 440, maxSafeTrackWidthMm: SPORTPALEIS_MACHINE_CONSTRAINTS.maximumSafeTrackWidthMm, minimumGapMm: 6.4, edgeMarginMm: 5, defaultWidthMm: 180, defaultHeightMm: 30, defaultFontId: PILOT_FONT.id, defaultFoilColor: "Wit" },
  receiptMailText: "We hebben de kleding ontvangen. Controleer het overzicht van artikelen en afgesproken bedrukking. De verwachte wachttijd is circa 5 dagen. Je ontvangt bericht wanneer de bestelling klaarstaat.",
  readyMailText: "De bestelling ligt klaar. Neem deze e-mail mee bij het ophalen. Was bedrukte kleding binnenstebuiten, gebruik geen droger en volg altijd het waslabel.",
};

const FOIL_ROLLS = [
  { id: "foil-white", color: "Wit", supplierType: "Nog in te vullen", purchasePriceEur: null, originalLengthM: null, widthMm: 500, usedLengthMm: 327.4 },
  { id: "foil-red", color: "Rood", supplierType: "Nog in te vullen", purchasePriceEur: null, originalLengthM: null, widthMm: 500, usedLengthMm: 0 },
  { id: "foil-blue", color: "Blauw", supplierType: null, purchasePriceEur: null, originalLengthM: null, widthMm: null, usedLengthMm: null },
  { id: "foil-black", color: "Zwart", supplierType: null, purchasePriceEur: null, originalLengthM: null, widthMm: null, usedLengthMm: null },
  { id: "foil-green", color: "Groen", supplierType: null, purchasePriceEur: null, originalLengthM: null, widthMm: null, usedLengthMm: null },
  { id: "foil-yellow", color: "Geel", supplierType: null, purchasePriceEur: null, originalLengthM: null, widthMm: null, usedLengthMm: null },
];

function iso(now = new Date()) {
  return now.toISOString();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function immutableProductionJob({ id, jobNumber, createdAt, initiatedBy, kind = "ORIGINAL", originJobId = null, reason = null, snapshot, status, proofStatus, humanAcceptance }) {
  const frozenSnapshot = structuredClone(snapshot);
  return {
    id,
    jobNumber,
    createdAt,
    initiatedBy: structuredClone(initiatedBy),
    kind,
    originJobId,
    reason,
    snapshot: frozenSnapshot,
    snapshotHash: sha256(JSON.stringify(frozenSnapshot)),
    status,
    proofStatus,
    humanAcceptance: structuredClone(humanAcceptance),
  };
}

function createGoldenProductionJobs(recordedAt = iso()) {
  const actor = { userId: "donovan-support", name: "Donovan", role: "support" };
  const shared = {
    organizationId: "sport-2000-sportpaleis-bv",
    association: "Almere Pioneers",
    productionProfile: { id: "profile-pioneers-shirt", revision: 1, name: "Almere Pioneers shirt · Senior rugnummer 200 mm" },
    productionGroup: { foilColor: "Wit", material: "HTV-WHITE", workingWidthMm: 440 },
    scale: 1,
    humanControlRequiredBeforeHardware: true,
    hardwareSendPerformedByWorkspace: false,
  };
  const physicalCaseSnapshot = {
    ...shared,
    acceptedSourceDate: "2026-08-11",
    orderIds: ["GOLDEN-PHYSICAL-CASE-001"],
    elements: [{ type: "BACK_NUMBER", value: "2", quantity: 1, widthMm: 99.06, heightMm: 200, contourCount: 2 }],
    sourceContours: [{ id: "PIONEERS-2-200MM-V3", version: "V3", proofStatus: "PHYSICALLY_VALIDATED", immutable: true }],
    layout: { strategy: "SINGLE_GOLDEN_CASE", objectCount: 1, usedWidthMm: 99.06, usedLengthMm: 200, edgeMarginMm: null, minimumGapMm: null },
    orientation: { preMirrored: false, manualHorizontalFlipInWinPlot: true },
    artifact: { filename: "pioneers-number-2-200mm-1to1-v3.pdf", format: "PDF", version: "V3", sha256: "E1056776DE98673BE07058FD9C8D4F28AF1EF9A41E70B882AA465AE54FF03571", path: "output/pdf/sportpaleis-winplot-vector-pdf-003-20260811/pioneers-number-2-200mm-1to1-v3.pdf" },
  };
  const physicalBatchSnapshot = {
    ...shared,
    acceptedSourceDate: "2026-08-11",
    orderIds: ["SPW-HA-01", "SPW-HA-02", "SPW-HA-03", "SPW-HA-04", "SPW-HA-05", "SPW-HA-06", "SPW-HA-07", "SPW-HA-08", "SPW-HA-09", "SPW-HA-10"],
    elements: [
      { type: "BACK_NUMBER", value: "2", quantity: 4, widthMm: 99.05820855, heightMm: 200.000195312, contourCountPerObject: 1 },
      { type: "BACK_NUMBER", value: "34", quantity: 3, widthMm: 215.141389974, heightMm: 200.000195312, contourCountPerObject: 2 },
      { type: "BACK_NUMBER", value: "77", quantity: 3, widthMm: 211.915402561, heightMm: 200.000195312, contourCountPerObject: 2 },
    ],
    sourceContours: [
      { id: "PIONEERS-2", version: "Sportpaleis-Snijtest-001", proofStatus: "PHYSICALLY_VALIDATED", immutable: true },
      { id: "PIONEERS-34", version: "Sportpaleis-Snijtest-001", proofStatus: "PHYSICALLY_VALIDATED", immutable: true },
      { id: "PIONEERS-77", version: "Sportpaleis-Snijtest-001", proofStatus: "PHYSICALLY_VALIDATED", immutable: true },
    ],
    layout: { strategy: "DETERMINISTIC_MULTI_HEURISTIC_CONTOUR_SAFE_NO_SCALE", objectCount: 10, closedContourCount: 16, anchorCount: 234, usedWidthMm: 416.400390625, usedLengthMm: 872.716417101, edgeMarginMm: 5, minimumGapMm: 6.399953885000002 },
    orientation: { preMirrored: false, manualHorizontalFlipInWinPlot: true },
    artifact: { filename: "Sportpaleis-Pioneers-10-Orders-Human-Acceptance-001.ai", format: "AI", version: "SPW-PHYSICAL-MULTI-ORDER-001-20260811", sha256: "B226A6B7637BEE219FAB5E646D2DE8E9BA7421DB6822FC82629B8FA5175F507B", path: "outputs/sportpaleis-physical-multi-order-001-20260811/Sportpaleis-Pioneers-10-Orders-Human-Acceptance-001.ai" },
  };
  const autoMirrorBatchSnapshot = {
    ...structuredClone(physicalBatchSnapshot),
    acceptedSourceDate: "2026-08-11",
    orientation: { preMirrored: true, manualHorizontalFlipInWinPlot: false },
    artifact: { filename: "Sportpaleis-Golden-Physical-Batch-001-Auto-Mirrored-AB-001.ai", format: "AI", version: "SPW-GOLDEN-BATCH-001-AUTO-MIRROR-AB-001-20260811", sha256: "2FDADD9022E379BAAC3902103577F45D8F1C409FCF465DE2C342E0E5DB3ADDD4", path: "outputs/sportpaleis-golden-batch-001-auto-mirror-ab-20260811/Sportpaleis-Golden-Physical-Batch-001-Auto-Mirrored-AB-001.ai" },
  };
  const cutjobSvgPhysicalSnapshot = {
    ...shared,
    acceptedSourceDate: "2026-08-12",
    orderIds: ["SP-2026-0105"],
    elements: [{ type: "BACK_NUMBER", value: "2", quantity: 1, widthMm: 99.05, heightMm: 200, sourceId: "pioneers-rugnummer-2-200mm", sourceVersion: "Sportpaleis-Snijtest-001" }],
    sourceContours: [{ id: "pioneers-rugnummer-2-200mm", version: "Sportpaleis-Snijtest-001", sourceSetId: "pioneers-senior-rugnumber-200mm", proofStatus: "PHYSICALLY_VALIDATED", immutable: true }],
    layout: { strategy: "DETERMINISTIC_MULTI_HEURISTIC_CONTOUR_SAFE_NO_SCALE", objectCount: 1, usedWidthMm: 440, usedLengthMm: 109.05, edgeMarginMm: 5, minimumGapMm: 6.4 },
    orientation: { preMirrored: true, manualHorizontalFlipInWinPlot: false },
    outputWriter: { id: "cutjob-svg", version: "1", format: "SVG", proofStatus: "GEOMETRY_VALIDATED", physicalRouteStatus: "HUMAN_VALIDATION_REQUIRED" },
    artifact: { filename: "PLOT-2026-0004-production.svg", format: "SVG", version: "cutjob-svg@1", sha256: "26C326E26A34049CB7C3D270D335F1BEE03776E9865E94F9C81462817AEF9FD6", path: "outputs/sportpaleis-plotjobs/PLOT-2026-0004/PLOT-2026-0004-production.svg", productionDataHash: "28A2633F5E0953825A67D40258196F45006ACDD33329E062BDAFB61E72942C14" },
    physicalRouteEvidence: {
      validator: "Donovan",
      validationDate: "2026-08-12",
      route: ["PLOT-2026-0004-production.svg", "Adobe Illustrator", "Summa Send To WinPlot", "Summa", "fysieke snede"],
      machineContext: { productionComputer: "Sportpaleis productie-pc", cutterBrand: "Summa", exactModel: "DATA_GAP" },
      result: "PASS",
      scope: "Uitsluitend deze immutable SVG, cutjob-svg@1, Pioneers rugnummer 2 bronversie en de werkelijk gebruikte Illustrator/WinPlot/Summa-route; geen bewijs voor andere cijfers, fonts, verenigingen, contouren of machines.",
    },
  };
  return [
    immutableProductionJob({ id: "production-job-golden-case-001", jobNumber: "PLOT-2026-0001", createdAt: recordedAt, initiatedBy: actor, snapshot: physicalCaseSnapshot, status: "COMPLETED", proofStatus: "PHYSICALLY_VALIDATED", humanAcceptance: { status: "PASS", acceptedSourceDate: "2026-08-11", note: "Golden Physical Case 001; handmatige horizontale spiegeling in WinPlot was onderdeel van de geslaagde route." } }),
    immutableProductionJob({ id: "production-job-golden-batch-001", jobNumber: "PLOT-2026-0002", createdAt: recordedAt, initiatedBy: actor, snapshot: physicalBatchSnapshot, status: "COMPLETED", proofStatus: "PHYSICALLY_VALIDATED", humanAcceptance: { status: "PASS", acceptedSourceDate: "2026-08-11", note: "Golden Physical Batch 001; volledige batch fysiek geslaagd via Illustrator, Summa Send To WinPlot en handmatige horizontale spiegeling." } }),
    immutableProductionJob({ id: "production-job-golden-batch-001-auto-mirror-ab", jobNumber: "PLOT-2026-0003", createdAt: recordedAt, initiatedBy: actor, snapshot: autoMirrorBatchSnapshot, status: "COMPLETED", proofStatus: "WINPLOT_VALIDATED", humanAcceptance: { status: "PASS", acceptedSourceDate: "2026-08-11", note: "A/B-spiegel Human Acceptance door Donovan: vooraf gespiegeld AI-bestand kwam via Illustrator en Summa Send To WinPlot direct correct in WinPlot binnen; geen handmatige spiegeling of andere correctie nodig." } }),
    immutableProductionJob({ id: "production-job-cutjob-svg-physical-001", jobNumber: "PLOT-2026-0004", createdAt: recordedAt, initiatedBy: actor, snapshot: cutjobSvgPhysicalSnapshot, status: "COMPLETED", proofStatus: "PHYSICALLY_VALIDATED", humanAcceptance: { status: "PASS", acceptedSourceDate: "2026-08-12", note: "Donovan heeft exact artifact PLOT-2026-0004-production.svg fysiek gevalideerd via Adobe Illustrator, Summa Send To WinPlot en de echte Sportpaleis-Summa. Bewijs blijft begrensd tot de gekoppelde Pioneers-2 bron en deze route." } }),
  ];
}

function safeEqualHex(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export async function createSportpaleisPasswordRecord(password) {
  return createWorkspacePasswordRecord(password);
}

export async function createSportpaleisPinRecord(pin) {
  if (!/^\d{4,8}$/u.test(String(pin ?? ""))) throw new Error("Een snelle PIN bestaat uit 4 tot 8 cijfers.");
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(String(pin), salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { algorithm: "scrypt-pin-v1", salt, hash: Buffer.from(derived).toString("hex"), N: 16_384, r: 8, p: 1, enrolledAt: iso() };
}

const passwordRecord = createSportpaleisPasswordRecord;

async function verifyPassword(password, record) {
  return verifyWorkspacePassword(password, record);
}

async function verifyPin(pin, record) {
  if (!record || record.algorithm !== "scrypt-pin-v1" || !/^\d{4,8}$/u.test(String(pin ?? ""))) return false;
  const derived = await scrypt(String(pin), record.salt, 64, { N: record.N, r: record.r, p: record.p, maxmem: 64 * 1024 * 1024 });
  return safeEqualHex(Buffer.from(derived).toString("hex"), record.hash);
}

function publicUser(user) {
  const workContexts = user.workContexts ?? workContextsForRole(user.role);
  const reviewDeveloper = user.principalType === WBD_REVIEW_DEVELOPER_PRINCIPAL.principalType;
  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    role: reviewDeveloper ? "admin" : user.role,
    email: user.email,
    status: user.status,
    seatType: user.seatType,
    salesNumber: user.salesNumber ?? null,
    personType: user.personType ?? "HUMAN",
    workContexts,
    defaultContext: workContexts.includes(user.defaultContext) ? user.defaultContext : workContexts[0],
    quickAuth: user.quickPin?.hash ? { mode: "PIN", pinEnrolled: true } : { mode: "PASSWORD", pinEnrolled: false },
    ...(reviewDeveloper ? { principalType: user.principalType, candidateId: user.candidateId } : {}),
  };
}

function normalizedEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function publicAdminUser(user, state, now = new Date()) {
  const result = publicUser(user);
  if (user.status !== "Uitgenodigd") {
    const recoveries = (state.passwordResetRequests ?? []).filter((request) => request.userId === user.id && !request.usedAt);
    const latest = recoveries.sort((left, right) => String(right.requestedAt).localeCompare(String(left.requestedAt)))[0];
    return {
      ...result,
      recovery: latest ? {
        state: latest.tokenHash && new Date(latest.expiresAt).getTime() > now.getTime() ? "LINK_ISSUED" : "REQUESTED",
        requestedAt: latest.requestedAt,
        expiresAt: latest.tokenHash ? latest.expiresAt : null,
      } : { state: "NONE", requestedAt: null, expiresAt: null },
    };
  }
  const pendingInvites = (state.activationInvites ?? []).filter((invite) => invite.userId === user.id && !invite.usedAt);
  const invite = pendingInvites[0];
  const expiryTime = invite ? new Date(invite.expiresAt).getTime() : Number.NaN;
  const sameEmailUsers = state.users.filter((candidate) => candidate.id !== user.id && normalizedEmail(candidate.email) === normalizedEmail(user.email));
  const sameEmailAccounts = sameEmailUsers.filter((candidate) => candidate.status !== "Uitgenodigd");
  return {
    ...result,
    invitation: {
      state: pendingInvites.length > 1 || (invite && !Number.isFinite(expiryTime)) ? "AMBIGUOUS" : !invite ? "MISSING" : expiryTime <= now.getTime() ? "EXPIRED" : "VALID",
      expiresAt: pendingInvites.length === 1 && Number.isFinite(expiryTime) ? invite.expiresAt : null,
      identityState: sameEmailAccounts.length > 1 ? "AMBIGUOUS_ACCOUNTS" : sameEmailAccounts.length === 1 ? "ACCOUNT_EXISTS" : sameEmailUsers.length ? "PENDING_DUPLICATE" : "CLEAR",
    },
  };
}

function workContextsForRole(role) {
  if (role === "admin") return ["ORGANISATION", "STORE", "WEBSHOP", "PRODUCTION", "ALL"];
  if (role === "operator") return ["PRODUCTION", "WEBSHOP", "STORE", "ALL"];
  if (role === "store") return ["STORE", "WEBSHOP", "ALL"];
  return ["ORGANISATION", "ALL"];
}

export function createSportpaleisDefaultPreference() {
  return {
    view: "focus",
    density: "comfortable",
    optionalPanels: { recent: true, shortcuts: true },
    panelOrder: ["attention", "production", "recent", "shortcuts"],
    orderColumns: ["customer", "articles", "foilColors", "promisedAt", "owner", "status"],
    orderDensity: "compact",
    productionPanels: ["batch", "guidance", "fallback"],
  };
}

const defaultPreference = createSportpaleisDefaultPreference;
const CONFIRMED_EMPLOYEES = Object.freeze([
  { id: "employee-donovan-45", name: "Donovan", salesNumber: "45", active: true, userId: null, revision: 1 },
]);

export function createSportpaleisProductionBootstrap(now = new Date()) {
  return validateState({
    schemaVersion: PILOT_SCHEMA_VERSION,
    organizationId: "sport-2000-sportpaleis-bv",
    revision: 1,
    nextOrderSequence: 1,
    nextTeamkitOrderSequence: 1,
    nextProductionJobSequence: 5,
    users: [],
    employees: structuredClone(CONFIRMED_EMPLOYEES),
    employeeDirectorySource: null,
    sessions: [],
    loginAttempts: {},
    passwordResetRequests: [],
    orders: [],
    associations: structuredClone(SPORTPALEIS_ASSOCIATIONS),
    configurationVersion: SPORTPALEIS_CONFIGURATION_VERSION,
    fontConfirmationVersion: SPORTPALEIS_FONT_CONFIRMATION.id,
    articles: structuredClone(ARTICLE_CATALOG),
    productionProfiles: structuredClone(PRODUCTION_PROFILES),
    settings: structuredClone(PILOT_SETTINGS),
    foilRolls: structuredClone(FOIL_ROLLS),
    feedback: [],
    extraUserRequests: [],
    mailbatches: [],
    websiteSync: createSportpaleisWebsiteSyncState(),
    webshopIntake: createSportpaleisWebshopIntakeState(),
    mailboxRouting: createSportpaleisMailboxRoutingState(),
    productionElements: [],
    productionFonts: CANONICAL_PRODUCTION_FONTS.map((font) => structuredClone(font)),
    productionElementRequirements: [],
    productionJobs: createGoldenProductionJobs(iso(now)),
    productionProposals: [],
    teamkitProposals: [],
    quickProductionIntakes: [],
    visualCompositions: [],
    creativeVectorDrafts: [],
    reviewDeveloperAccess: { grants: [] },
    preferences: {},
    audit: [{
      id: "audit-production-bootstrap",
      at: iso(now),
      userId: "system",
      action: "Productieconfiguratie geïnitialiseerd",
      subject: "Sportpaleis Workspace",
      details: { ordersCreated: 0, usersCreated: 0, source: "approved-pilot-reference-data" },
    }],
    idempotency: {},
  });
}

export function migrateSportpaleisPilotState(input) {
  const state = structuredClone(input);
  if (!state || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, PILOT_SCHEMA_VERSION].includes(state.schemaVersion) || state.organizationId !== "sport-2000-sportpaleis-bv") return state;
  const previousSchemaVersion = state.schemaVersion;
  const previousConfigurationVersion = state.configurationVersion;
  const previousFontConfirmationVersion = state.fontConfirmationVersion;
  state.migrationWarnings ??= [];
  const legacyProfileInstructions = new Map([
    ["PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", "Workspace gebruikt de bevestigde maat, letter-/nummerbron en foliekleur. Plaatsing, spiegeling en veilige rotatie volgen automatisch uit de productieregel."],
    ["DATA_GAP: de fysieke bedrukkingsmaat ontbreekt en blokkeert productie. Positie, referentieafstand, rotatie en spiegeling zijn niet-blokkerende pilot-aandachtspunten.", "De fysieke bedrukkingsmaat ontbreekt. Voeg alleen deze noodzakelijke maat toe; plaatsing, spiegeling en veilige rotatie volgen automatisch."],
    ["DATA_GAP: live optie ‘Nummer’ is niet bevestigd als rug-, borst- of shortnummer en mag niet naar productie.", "Bevestig of ‘Nummer’ een rug-, borst- of shortnummer is. Daarna kiest Workspace automatisch de toepasselijke productieregel."],
    ["DATA_GAP: de fysieke Snijtest 001 betrof Senior-rugnummers op 200 mm en bewijst geen shortplaatsing of shortoutput op 80 mm.", "Voor shortnummers is een gecontroleerde productiebron van 80 mm nodig. Bestaande Senior-rugnummerbronnen worden niet als vervanging gebruikt."],
  ]);
  const humanProfileSource = (value) => String(value ?? "")
    .replace(/Positie, afstand, contour-\/fontoutput, rotatie en spiegeling blijven fail-closed totdat de specifieke route is gevalideerd\.?/gu, "Plaatsing, spiegeling en veilige rotatie volgen automatisch uit de productieregel.")
    .replace(/Positie, afstand, contour-\/fontoutput, rotatie en spiegeling blijven fail-closed\.?/gu, "Plaatsing, spiegeling en veilige rotatie volgen automatisch uit de productieregel.")
    .replace(/Positie, afstand, rotatie en spiegeling onbevestigd\.?/gu, "Plaatsing, spiegeling en veilige rotatie volgen automatisch uit de productieregel.");
  for (const profile of state.productionProfiles ?? []) {
    const previousInstruction = String(profile.instruction ?? "");
    profile.instruction = legacyProfileInstructions.get(previousInstruction) ?? humanProfileSource(previousInstruction);
    if (profile.validation?.source) profile.validation.source = humanProfileSource(profile.validation.source);
  }
  for (const user of state.users ?? []) {
    if (user.salesNumber === undefined) user.salesNumber = null;
    user.personType ??= "HUMAN";
    user.workContexts ??= workContextsForRole(user.role);
    user.defaultContext = user.workContexts.includes(user.defaultContext) ? user.defaultContext : user.workContexts[0];
    user.featureExposure ??= {};
    user.featureExposure.teamwearExperiencePilot ??= false;
    delete user.quickAuth;
  }
  state.employees = Array.isArray(state.employees) ? state.employees : [];
  for (const sourceEmployee of CONFIRMED_EMPLOYEES) {
    if (!state.employees.some(({ id, salesNumber }) => id === sourceEmployee.id || salesNumber === sourceEmployee.salesNumber)) state.employees.push(structuredClone(sourceEmployee));
  }
  if (state.employeeDirectorySource?.sourceId !== "sportpaleis-visible-sales-codes-20260820") {
    const reconciliation = reconcileSportpaleisEmployeeDirectory(state.employees);
    state.employees.push(...reconciliation.additions);
    state.employeeDirectorySource = reconciliation.summary;
    state.audit ??= [];
    state.audit.unshift({
      id: `audit-employee-directory-${randomBytes(8).toString("hex")}`,
      at: reconciliation.summary.comparedAt,
      userId: "system:employee-directory",
      action: "Verkoopnummers vergeleken",
      subject: "Werknemers",
      details: {
        sourceId: reconciliation.summary.sourceId,
        matched: reconciliation.summary.matched,
        added: reconciliation.summary.added,
        preservedNameDifferences: reconciliation.summary.preservedNameDifferences,
        unverified: reconciliation.summary.unverified,
      },
    });
  }
  for (const profile of state.productionProfiles ?? []) if (profile.supports?.includes("initials")) {
      const existing = profile.initialsInfixRule;
      profile.initialsInfixRule = {
        active: existing?.active !== false,
        // Canonical Sportpaleis default. Legacy spacing/baseline values remain
        // provenance only; the production runtime does not consume them.
        heightMm: existing?.heightMm ?? 20,
        horizontalSpacingMm: existing?.horizontalSpacingMm ?? null,
        baselineOffsetMm: existing?.baselineOffsetMm ?? null,
        alignment: "CENTER",
        status: existing?.heightMm != null ? "SOURCE_CONFIGURED" : "DATA_GAP",
        revision: Number(existing?.revision ?? 1),
      };
  }
  for (const order of state.orders ?? []) {
    order.association = canonicalAssociationName(order.association);
    if (Array.isArray(order.associations)) order.associations = order.associations.map(canonicalAssociationName);
    order.referenceSeries ??= order.teamkitContext?.kind === "TEAMKIT_APPROVAL" || /^TK-/u.test(String(order.id)) ? "TK" : "SP";
    order.standardPersonalization ??= { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "", initialsSemantic: null };
    order.standardPersonalization.initialsInfix ??= "";
    for (const item of order.items ?? []) for (const variant of item.variants ?? []) if (variant.personalizationValues) variant.personalizationValues.initialsInfix ??= "";
    order.standardPersonalization.backNumberSizeClass ??= "";
    order.orderKind ??= "LEGACY";
    order.acceptedBy ??= { userId: "unknown", name: order.owner || "Onbekend", salesNumber: null, at: order.createdAt };
    order.salesAttribution ??= { salesNumber: order.acceptedBy.salesNumber ?? null, label: order.acceptedBy.name ?? "Niet toegewezen", accountType: order.acceptedBy.salesNumber ? "HUMAN" : "UNASSIGNED", selectedByUserId: order.acceptedBy.userId ?? "unknown", selectedAt: order.acceptedBy.at ?? order.createdAt };
    order.sourceContext ??= { source: "STORE", label: "Winkel", externalReference: null, provenance: "Bestaande Workspace-order", transactionalAuthority: "WORKSPACE" };
    order.payment ??= { status: "UNKNOWN", updatedAt: null, updatedBy: null, source: "UNKNOWN" };
    order.fulfillment ??= { mode: "PICKUP", status: order.pickup?.status === "PICKED_UP" ? "PICKED_UP" : "PENDING", updatedAt: order.pickup?.pickedUpAt ?? null, updatedBy: order.pickup?.pickedUpBy ?? null, feeEur: 0, address: null };
    order.fulfillment.feeEur ??= order.fulfillment.mode === "DELIVERY" ? 3.95 : 0;
    order.fulfillment.address ??= null;
    order.operationalFacts ??= {};
    order.communication ??= { receipt: { status: "NOT_SENT", updatedAt: order.updatedAt ?? order.createdAt }, production: { status: "NOT_SENT", updatedAt: order.updatedAt ?? order.createdAt }, ready: { status: "NOT_SENT", updatedAt: order.updatedAt ?? order.createdAt } };
    order.communication.production ??= { status: "NOT_SENT", updatedAt: order.updatedAt ?? order.createdAt };
    order.communication.ready ??= { status: "NOT_SENT", updatedAt: order.updatedAt ?? order.createdAt };
    order.communication.requiredForIndividualOrder ??= false;
    // Mail-SLA is order truth once the order exists. Later global setting changes
    // are defaults for new work and must not silently reinterpret old evidence.
    order.communication.processingDaysSnapshot ??= Number(state.settings?.processingDays ?? PILOT_SETTINGS.processingDays);
    for (const item of order.items ?? []) {
      item.association = canonicalAssociationName(item.association);
      item.sourceType ??= item.articleId ? "CATALOG" : "CUSTOM";
      item.sourceProvenance ??= item.articleId ? "Bestaande Sportpaleis pilotcatalogus" : "Historisch eigen artikel; herkomst niet volledig vastgelegd";
      item.productionReadiness ??= item.productionProfileId ? { status: "CONFIGURED", reason: null } : { status: "DATA_GAP", reason: "Productieprofiel ontbreekt" };
      if (item.personalizationValues) item.personalizationValues.backNumberSizeClass ??= "";
      for (const variant of item.variants ?? []) {
        variant.participantName ??= "";
        if (variant.personalizationValues) variant.personalizationValues.backNumberSizeClass ??= "";
      }
    }
    if (order.standardPersonalization.backNumber && !order.standardPersonalization.backNumberSizeClass) {
      const warning = `${order.id}: bestaand rugnummer heeft geen gevalideerde Junior/Senior-classificatie`;
      if (!state.migrationWarnings.includes(warning)) state.migrationWarnings.push(warning);
    }
  }
  for (const association of state.associations ?? []) association.name = canonicalAssociationName(association.name);
  for (const article of state.articles ?? []) article.association = canonicalAssociationName(article.association);
  for (const profile of state.productionProfiles ?? []) if (typeof profile.name === "string") profile.name = profile.name.replaceAll(LEGACY_PIONEERS_ASSOCIATION, CANONICAL_PIONEERS_ASSOCIATION);
  if (!Array.isArray(state.associations) || !state.associations.length) state.associations = structuredClone(SPORTPALEIS_ASSOCIATIONS);
  else if (previousConfigurationVersion !== SPORTPALEIS_CONFIGURATION_VERSION) {
    const canonicalAssociations = SPORTPALEIS_ASSOCIATIONS.map((sourceAssociation) => {
      const existing = state.associations.find(({ id, name }) => id === sourceAssociation.id || name === sourceAssociation.name);
      if (!existing) return structuredClone(sourceAssociation);
      const existingValidatedJunior = existing.juniorValidationStatus === "VALIDATED" && Number(existing.juniorPhysicalHeightMm) > 0;
      return {
        ...structuredClone(sourceAssociation),
        ...structuredClone(existing),
        id: sourceAssociation.id,
        name: sourceAssociation.name,
        active: existing.active,
        notes: existing.notes,
        fontProfile: sourceAssociation.fontEvidence?.applied && sourceAssociation.fontEvidence.confirmationStatus === "MATCH"
          ? sourceAssociation.fontProfile
          : existing.fontProfile ?? sourceAssociation.fontProfile,
        fontEvidence: structuredClone(sourceAssociation.fontEvidence),
        foilColors: structuredClone(existing.foilColors ?? sourceAssociation.foilColors),
        dimensionsCm: structuredClone(existing.dimensionsCm ?? sourceAssociation.dimensionsCm),
        revision: existing.revision ?? 1,
        updatedAt: existing.updatedAt,
        validationHistory: existing.validationHistory ?? [],
        juniorValidationStatus: existingValidatedJunior ? "VALIDATED" : sourceAssociation.juniorValidationStatus,
        juniorPhysicalHeightMm: existingValidatedJunior ? Number(existing.juniorPhysicalHeightMm) : sourceAssociation.juniorPhysicalHeightMm,
        juniorGarmentSizes: structuredClone(existingValidatedJunior && Array.isArray(existing.juniorGarmentSizes) ? existing.juniorGarmentSizes : sourceAssociation.juniorGarmentSizes),
        juniorValidationNote: existingValidatedJunior ? existing.juniorValidationNote : sourceAssociation.juniorValidationNote,
        workspaceLogo: structuredClone(existing.workspaceLogo ?? sourceAssociation.workspaceLogo),
      };
    });
    const retainedAssociationRecords = state.associations.filter((existing) => !SPORTPALEIS_ASSOCIATIONS.some(({ id, name }) => id === existing.id || name === existing.name));
    state.associations = [...canonicalAssociations, ...structuredClone(retainedAssociationRecords)];
  }
  for (const association of state.associations) {
    association.revision ??= 1;
    association.validationHistory ??= [];
    association.juniorPhysicalHeightMm ??= null;
    association.juniorGarmentSizes ??= [];
    const sourceAssociation = SPORTPALEIS_ASSOCIATIONS.find(({ id, name }) => id === association.id || name === association.name);
    association.fontEvidence ??= structuredClone(sourceAssociation?.fontEvidence);
    if (association.juniorValidationStatus === "VALIDATED" && !(Number(association.juniorPhysicalHeightMm) > 0)) {
      association.juniorValidationStatus = "DATA_GAP";
      association.juniorValidationNote = "Eerdere status had geen fysieke millimeterwaarde en is veilig teruggezet naar DATA_GAP.";
    }
  }
  if (previousFontConfirmationVersion !== SPORTPALEIS_FONT_CONFIRMATION.id) {
    for (const association of state.associations) {
      const sourceAssociation = SPORTPALEIS_ASSOCIATIONS.find(({ id, name }) => id === association.id || name === association.name);
      if (!sourceAssociation?.fontEvidence) continue;
      const previous = association.fontProfile;
      if (sourceAssociation.fontEvidence.applied && sourceAssociation.fontEvidence.confirmationStatus === "MATCH") association.fontProfile = sourceAssociation.fontProfile;
      association.fontEvidence = structuredClone(sourceAssociation.fontEvidence);
      if (association.fontProfile !== previous) {
        association.revision = Number(association.revision ?? 1) + 1;
        association.validationHistory.push({
          at: "2026-08-12T00:00:00.000Z",
          userId: "system-human-confirmation",
          field: "fontProfile",
          previous,
          next: association.fontProfile,
          source: SPORTPALEIS_FONT_CONFIRMATION.authority,
        });
      }
    }
  }
  if (previousConfigurationVersion !== SPORTPALEIS_CONFIGURATION_VERSION) {
    const existingArticles = Array.isArray(state.articles) ? state.articles : [];
    const consumedIds = new Set();
    const articleIdRemap = new Map();
    const canonicalArticles = ARTICLE_CATALOG.map((sourceArticle) => {
      const existing = existingArticles.find(({ id }) => id === sourceArticle.id)
        ?? existingArticles.find(({ association, articleNumber }) => association === sourceArticle.association && String(articleNumber) === String(sourceArticle.articleNumber));
      if (!existing) return structuredClone(sourceArticle);
      consumedIds.add(existing.id);
      if (existing.id !== sourceArticle.id) articleIdRemap.set(existing.id, sourceArticle.id);
      return {
        ...structuredClone(sourceArticle),
        ...structuredClone(existing),
        id: sourceArticle.id,
        articleNumber: sourceArticle.articleNumber,
        supplierArticleNumber: sourceArticle.supplierArticleNumber,
        name: sourceArticle.name,
        association: sourceArticle.association,
        imageKey: sourceArticle.imageKey,
        catalogProvenance: structuredClone(sourceArticle.catalogProvenance),
        active: existing.active ?? sourceArticle.active,
        displayOrder: existing.displayOrder ?? sourceArticle.displayOrder,
        revision: Number(existing.revision ?? 1) + 1,
        validationHistory: structuredClone(existing.validationHistory ?? []),
      };
    });
    const retainedArticles = existingArticles.filter((article) => !consumedIds.has(article.id) && article.catalogProvenance?.authority !== "SPORTPALEIS_LIVE");
    state.articles = [...retainedArticles, ...canonicalArticles];
    for (const order of state.orders ?? []) for (const item of order.items ?? []) {
      const direct = articleIdRemap.get(item.articleId);
      const matched = direct ? null : ARTICLE_CATALOG.find(({ association, articleNumber }) => association === item.association && String(articleNumber) === String(item.articleNumber));
      if (direct || matched) item.articleId = direct ?? matched.id;
      if (order.stage !== "DONE" && /^profile-source-almerer-pioneers-/u.test(String(item.productionProfileId ?? ""))) item.productionProfileId = String(item.productionProfileId).replace("profile-source-almerer-pioneers-", "profile-source-almere-pioneers-");
    }
    const warning = "Final pre-live catalogus 006: 183 actuele artikelen met zichtbare bestelbare personalisatie canoniek ingericht; overige actuele clubartikelen blijven buiten Bedrukken; historische ordersnapshots blijven ongewijzigd.";
    if (!state.migrationWarnings.includes(warning)) state.migrationWarnings.push(warning);
  }
  state.configurationVersion = SPORTPALEIS_CONFIGURATION_VERSION;
  state.activationInvites ??= [];
  state.passwordResetRequests ??= [];
  state.mailbatches ??= [];
  state.websiteSync = { ...createSportpaleisWebsiteSyncState(), ...(state.websiteSync ?? {}) };
  state.webshopIntake = { ...createSportpaleisWebshopIntakeState(), ...(state.webshopIntake ?? {}) };
  state.webshopIntake.enabled = true;
  state.webshopIntake.status = state.webshopIntake.status === "ATTENTION" ? "ATTENTION" : "READY";
  state.webshopIntake.retrievalMode = "CONTROLLED_MAIL_DOCUMENT_ADAPTER";
  state.webshopIntake.sources ??= [];
  state.webshopIntake.matches ??= [];
  state.webshopIntake.printEvents ??= [];
  state.webshopIntake.stockLogo ??= { association: "VVA / Spartaan", currentStock: 74, unconfirmedValue20: 20, mutations: [] };
  const mailboxRouting = createSportpaleisMailboxRoutingState();
  state.mailboxRouting = { ...mailboxRouting, ...(state.mailboxRouting ?? {}) };
  state.mailboxRouting.mailbox = { ...mailboxRouting.mailbox, ...(state.mailboxRouting?.mailbox ?? {}) };
  state.mailboxRouting.messages ??= [];
  state.mailboxRouting.attentions ??= [];
  state.mailboxRouting.classificationHistory ??= [];
  state.productionElements ??= [];
  for (const element of state.productionElements) {
    element.ownerName = canonicalAssociationName(element.ownerName);
    for (const context of element.contexts ?? []) if (context.type === "ASSOCIATION") context.label = canonicalAssociationName(context.label);
  }
  state.productionAssetSources ??= [];
  reconcileVerifiedProductionNumberSources(state);
  for (const source of state.productionAssetSources) {
    source.revision ??= 1;
    source.intakeKind ??= source.inspection?.intakeKind ?? "ARTWORK";
    const canonicalSvg = source.original?.format === "SVG";
    source.conversion ??= { method: canonicalSvg ? "HUMAN_VERIFIED_SVG" : "ORIGINAL_PDF_INTERPRETATION", methodVersion: "1", derivedFromSourceId: null, derivedFromSha256: null };
    source.fidelity ??= canonicalSvg
      ? { status: "MATCHED", comparisonMethod: "CANONICAL_SVG_PREVIEW", referenceSha256: source.original.sha256, checkedAt: source.uploadedAt ?? null, checkedBy: source.uploadedBy ?? null, note: "Preview en productie gebruiken dezelfde gevalideerde SVG-geometrie." }
      : { status: "REFERENCE_REQUIRED", comparisonMethod: "HUMAN_SIDE_BY_SIDE", referenceSha256: source.original.sha256, checkedAt: null, checkedBy: null, note: null };
  }
  reconcileCanonicalProductionFonts(state);
  reconcileCanonicalProductionProfileSources(state);
  state.productionElementRequirements ??= [];
  state.productionJobs ??= [];
  state.productionProposals ??= [];
  state.teamkitProposals ??= [];
  for (const proposal of state.teamkitProposals) {
    proposal.approvalHistory ??= [];
    proposal.productionSizing ??= null;
    if (proposal.association) proposal.association.name = canonicalAssociationName(proposal.association.name);
  }
  state.quickProductionIntakes ??= [];
  state.visualCompositions ??= [];
  ensureWbdReviewDeveloperAccessState(state);
  state.visualCompositions = state.visualCompositions.map(upgradeVisualStudioComposition);
  state.creativeVectorDrafts ??= [];
  const goldenJobs = createGoldenProductionJobs();
  for (const goldenJob of goldenJobs) if (!state.productionJobs.some(({ id }) => id === goldenJob.id)) state.productionJobs.push(goldenJob);
  const immutableOrderIds = [
    ...(state.orders ?? []).map(({ id }) => id),
    ...(state.productionJobs ?? []).flatMap((job) => [...(job.snapshot?.orderIds ?? []), ...(job.snapshot?.orders ?? []).map(({ id }) => id), ...(job.orders ?? []).map(({ id }) => id)]),
    ...(state.productionProposals ?? []).flatMap((proposal) => (proposal.orders ?? []).map(({ id }) => id)),
  ];
  const highestSpOrderSequence = immutableOrderIds.reduce((highest, id) => Math.max(highest, Number(String(id).match(/^SP-\d{4}-(\d+)$/u)?.[1] ?? 0)), 0);
  state.nextOrderSequence = Math.max(Number(state.nextOrderSequence ?? 1), highestSpOrderSequence + 1);
  const highestJobSequence = state.productionJobs.reduce((highest, { jobNumber }) => Math.max(highest, Number(String(jobNumber ?? "").match(/(\d+)$/u)?.[1] ?? 0)), 0);
  state.nextProductionJobSequence = Math.max(Number(state.nextProductionJobSequence ?? 1), highestJobSequence + 1, 5);
  if (previousSchemaVersion < 3 || previousConfigurationVersion !== SPORTPALEIS_CONFIGURATION_VERSION) {
    state.productionProfiles ??= [];
    for (const profile of PRODUCTION_PROFILES) {
      const index = state.productionProfiles.findIndex(({ id }) => id === profile.id);
      if (index < 0) state.productionProfiles.push(structuredClone(profile));
      else if (Number(state.productionProfiles[index].revision ?? 1) <= 1) state.productionProfiles[index] = { ...structuredClone(profile), ...structuredClone(state.productionProfiles[index]), id: profile.id };
    }
    reconcileVerifiedProductionNumberSources(state);
    const warning = "Correctieronde 1: verenigingsbron behouden; kledingmaten 116–164 gebruiken de human-confirmed Juniorregel van 200 mm";
    if (!state.migrationWarnings.includes(warning)) state.migrationWarnings.push(warning);
  }
  if (previousSchemaVersion < 6) {
    state.articles = structuredClone(ARTICLE_CATALOG);
    state.productionProfiles = structuredClone(PRODUCTION_PROFILES);
    const warning = "Live catalogus 006: demoartikelen vervangen door brongecontroleerde Sportpaleis.nl-records; historische orders behouden hun bestaande snapshots";
    if (!state.migrationWarnings.includes(warning)) state.migrationWarnings.push(warning);
  }
  if (previousSchemaVersion < 8) {
    state.articles ??= [];
    const consumedArticleIds = new Set();
    const canonicalArticleIds = new Map();
    const migratedCatalog = ARTICLE_CATALOG.map((catalogArticle) => {
      const matches = state.articles.filter((candidate) => candidate.id === catalogArticle.id || (
        candidate.association === catalogArticle.association
        && String(candidate.articleNumber) === String(catalogArticle.articleNumber)
        && /-live-/.test(candidate.id)
      ));
      const selected = matches.sort((left, right) => (Number(right.revision ?? 1) - Number(left.revision ?? 1)) || (left.id === catalogArticle.id ? 1 : -1))[0];
      for (const match of matches) {
        consumedArticleIds.add(match.id);
        canonicalArticleIds.set(match.id, catalogArticle.id);
      }
      if (!selected) return structuredClone(catalogArticle);
      return {
        ...structuredClone(catalogArticle),
        ...structuredClone(selected),
        id: catalogArticle.id,
        articleNumber: catalogArticle.articleNumber,
        supplierArticleNumber: catalogArticle.supplierArticleNumber,
        name: catalogArticle.name,
        association: catalogArticle.association,
        imageKey: catalogArticle.imageKey,
        catalogProvenance: structuredClone(catalogArticle.catalogProvenance),
      };
    });
    state.articles = [
      ...state.articles.filter(({ id }) => !consumedArticleIds.has(id)),
      ...migratedCatalog,
    ];
    for (const order of state.orders ?? []) for (const item of order.items ?? []) {
      if (canonicalArticleIds.has(item.articleId)) item.articleId = canonicalArticleIds.get(item.articleId);
    }
    state.productionProfiles ??= [];
    const knownProfileIds = new Set(PRODUCTION_PROFILES.map(({ id }) => id));
    state.productionProfiles = [
      ...PRODUCTION_PROFILES.map((sourceProfile) => {
        const existing = state.productionProfiles.find(({ id }) => id === sourceProfile.id);
        return !existing ? structuredClone(sourceProfile) : Number(existing.revision ?? 1) <= 1 ? { ...structuredClone(sourceProfile), ...structuredClone(existing), id: sourceProfile.id } : existing;
      }),
      ...state.productionProfiles.filter(({ id }) => !knownProfileIds.has(id)),
    ];
    const warning = "Pilot readiness 007: dubbele legacy live-artikel-ID's naar de canonieke sp-live-ID's gemigreerd, ordersnapshots behouden en ongewijzigde profielteksten op human pilotbeleid gebracht";
    if (!state.migrationWarnings.includes(warning)) state.migrationWarnings.push(warning);
  }
  if (previousFontConfirmationVersion !== SPORTPALEIS_FONT_CONFIRMATION.id) {
    const legacyFontValues = new Set([
      "schluber", "schluber (Spain voor thuiswedstrijdshirt)", "schluber (Spain voor thuiswedstrijdshort)",
      "Myrad pro - Bold / zie map 'Lelystad'", "FFF englisch · Pioneers cijfercontouren",
    ]);
    for (const profile of state.productionProfiles ?? []) {
      const sourceProfile = PRODUCTION_PROFILES.find(({ id }) => id === profile.id);
      if (!sourceProfile || profile.fontProfile === sourceProfile.fontProfile) continue;
      if (!legacyFontValues.has(profile.fontProfile) && Number(profile.revision ?? 1) > 1) continue;
      const previous = profile.fontProfile;
      profile.fontProfile = sourceProfile.fontProfile;
      profile.revision = Number(profile.revision ?? 1) + 1;
      profile.validationHistory ??= [];
      profile.validationHistory.push({
        at: "2026-08-12T00:00:00.000Z",
        userId: "system-human-confirmation",
        previous: { fontProfile: previous },
        next: { fontProfile: profile.fontProfile },
        source: SPORTPALEIS_FONT_CONFIRMATION.authority,
      });
    }
  }
  for (const order of state.orders ?? []) {
    for (const line of order.productionLines ?? []) {
      if (line.source?.kind !== "PROFILE" || !/fontbestand|fontbron/iu.test(String(line.validation?.reason ?? ""))) continue;
      const profile = state.productionProfiles?.find(({ id }) => id === line.source.id);
      const font = configuredManagedFont(state, profile);
      if (!font) continue;
      line.source = { kind: "FONT", id: font.id, version: font.version, sha256: font.sha256 };
      line.preview = { ...line.preview, kind: "LIVE_FONT" };
      line.proofStatus = "CONFIGURED";
      line.validation = { status: "VALID", reason: null };
    }
    for (const item of order.items ?? []) {
      const itemLines = (order.productionLines ?? []).filter(({ itemId }) => !itemId || itemId === item.id);
      if (itemLines.length && itemLines.every(({ validation }) => validation?.status === "VALID") && /fontbestand|fontbron/iu.test(String(item.productionReadiness?.reason ?? ""))) {
        item.productionReadiness = { status: "CONFIGURED", reason: null };
      }
    }
  }
  if (previousSchemaVersion < 16) {
    for (const profile of state.productionProfiles ?? []) {
      const canonical = PRODUCTION_PROFILES.find(({ id, supports }) => id === profile.id && supports?.includes("backNumber"));
      if (!canonical?.backNumberSizeClasses) continue;
      const previous = { sizeLabel: profile.sizeLabel, backNumberSizeClasses: structuredClone(profile.backNumberSizeClasses ?? {}) };
      if (JSON.stringify(previous.backNumberSizeClasses) === JSON.stringify(canonical.backNumberSizeClasses) && profile.sizeLabel === canonical.sizeLabel) continue;
      profile.sizeLabel = canonical.sizeLabel;
      profile.backNumberSizeClasses = structuredClone(canonical.backNumberSizeClasses);
      profile.revision = Number(profile.revision ?? 1) + 1;
      profile.validationHistory ??= [];
      profile.validationHistory.push({
        at: "2026-09-02T00:00:00.000Z",
        userId: "system:back-number-height-v15",
        previous,
        next: { sizeLabel: profile.sizeLabel, backNumberSizeClasses: structuredClone(profile.backNumberSizeClasses) },
        source: SPORTPALEIS_JUNIOR_RULE_SOURCE,
      });
    }
    const consequentialOrderIds = new Set([
      ...(state.productionJobs ?? []).flatMap((job) => job.snapshot?.orderIds ?? []),
      ...(state.productionProposals ?? []).flatMap((proposal) => (proposal.orders ?? []).map(({ id }) => id)),
    ]);
    for (const order of state.orders ?? []) {
      if (order.orderKind !== "INDIVIDUAL" || !["ORDER", "CONTROL"].includes(order.stage) || consequentialOrderIds.has(order.id) || !order.productionLines?.length) continue;
      for (const item of order.items ?? []) {
        const reconcileBackNumberOccurrence = (occurrence) => {
          const backNumber = String(occurrence?.personalizationValues?.backNumber ?? "").trim();
          const sizeClass = occurrence?.backNumberProduction?.sizeClass ?? occurrence?.personalizationValues?.backNumberSizeClass;
          if (!backNumber || !BACK_NUMBER_SIZE_CLASSES.has(sizeClass)) return;
          occurrence.backNumberProduction = {
            ...(occurrence.backNumberProduction ?? {}),
            sizeClass,
            physicalHeightMm: SPORTPALEIS_BACK_NUMBER_PHYSICAL_HEIGHT_MM,
            status: "SOURCE_CONFIGURED",
            source: SPORTPALEIS_JUNIOR_RULE_SOURCE,
          };
        };
        for (const variant of item.variants ?? []) reconcileBackNumberOccurrence(variant);
        if (item.backNumberProduction) reconcileBackNumberOccurrence(item);
      }
      const hasBlockedComposite = order.productionLines.some((line) => line.placementRule?.compositionId && line.validation?.status === "BLOCKED");
      const hasStaleCanonicalHeight = order.productionLines.some((line) => {
        if (!line.personalizationField || !line.itemId) return false;
        const item = order.items?.find(({ id }) => id === line.itemId);
        const semantics = item ? canonicalLineSemantics(state, order, item, line) : null;
        return Number(semantics?.expectedHeightMm) > 0 && Math.abs(Number(line.heightMm) - Number(semantics.expectedHeightMm)) > .001;
      });
      if (!hasBlockedComposite && !hasStaleCanonicalHeight) continue;
      const previousLineHash = sha256(JSON.stringify(order.productionLines));
      const projected = stableExistingOrderProductionLines(resolveCanonicalProductionLines(state, order.id, order.items ?? []));
      if (!projected.length) continue;
      order.productionLines = projected;
      applyProductionReadiness(order.items ?? [], projected);
      order.revision = Number(order.revision ?? 1) + 1;
      const migratedAt = "2026-09-02T00:00:00.000Z";
      order.updatedAt = migratedAt;
      order.eventHistory ??= [];
      order.eventHistory.push({ id: `event-canonical-line-projection-v16-${order.id}`, type: "PRODUCTION_TRUTH_REPROJECTED", at: migratedAt, userId: "system:canonical-projection-v16", userName: "Workspace", source: "schema-migration", details: { previousLineHash, productionLineHash: sha256(JSON.stringify(projected)), reason: "Open, nog niet uitgevoerde productie naar actuele maat- en compositiewaarheid geprojecteerd" } });
    }
  }
  if (previousSchemaVersion < 17) {
    for (const user of state.users ?? []) {
      if (!["operator", "store"].includes(user.role)) continue;
      user.workContexts ??= workContextsForRole(user.role);
      if (!user.workContexts.includes("WEBSHOP")) {
        const allIndex = user.workContexts.indexOf("ALL");
        if (allIndex >= 0) user.workContexts.splice(allIndex, 0, "WEBSHOP");
        else user.workContexts.push("WEBSHOP");
      }
    }
  }
  const highestTeamkitSequence = (state.orders ?? []).reduce((highest, order) => Math.max(highest, Number(String(order.id).match(/^TK-\d{4}-(\d+)$/u)?.[1] ?? 0)), 0);
  state.nextTeamkitOrderSequence = Number.isInteger(state.nextTeamkitOrderSequence) && state.nextTeamkitOrderSequence > highestTeamkitSequence ? state.nextTeamkitOrderSequence : highestTeamkitSequence + 1;
  state.fontConfirmationVersion = SPORTPALEIS_FONT_CONFIRMATION.id;
  state.schemaVersion = PILOT_SCHEMA_VERSION;
  return state;
}

export function validateSportpaleisPilotState(input) {
  const state = migrateSportpaleisPilotState(input);
  if (!state || state.schemaVersion !== PILOT_SCHEMA_VERSION || state.organizationId !== "sport-2000-sportpaleis-bv") {
    throw new Error("Ongeldige Sportpaleis-pilotdatastore.");
  }
  if (!Array.isArray(state.users) || !Array.isArray(state.orders) || !Array.isArray(state.audit)) {
    throw new Error("Pilotdatastore mist verplichte collecties.");
  }
  state.articles ??= structuredClone(ARTICLE_CATALOG);
  state.associations ??= structuredClone(SPORTPALEIS_ASSOCIATIONS);
  state.configurationVersion ??= SPORTPALEIS_CONFIGURATION_VERSION;
  state.activationInvites ??= [];
  state.passwordResetRequests ??= [];
  state.mailbatches ??= [];
  state.productionElements ??= [];
  state.productionAssetSources ??= [];
  reconcileVerifiedProductionNumberSources(state);
  reconcileCanonicalProductionFonts(state);
  state.productionElementRequirements ??= [];
  state.productionJobs ??= [];
  state.productionProposals ??= [];
  state.teamkitProposals ??= [];
  for (const proposal of state.teamkitProposals) { proposal.approvalHistory ??= []; proposal.productionSizing ??= null; }
  state.quickProductionIntakes ??= [];
  state.visualCompositions ??= [];
  state.nextProductionJobSequence ??= 1;
  state.nextTeamkitOrderSequence ??= 1;
  if (!Number.isInteger(state.nextTeamkitOrderSequence) || state.nextTeamkitOrderSequence < 1) throw new Error("Ongeldige Teamkit-ordernummerreeks.");
  for (const article of ARTICLE_CATALOG) {
    const existing = state.articles.find(({ id }) => id === article.id);
    if (!existing) state.articles.push(structuredClone(article));
    else {
      existing.revision ??= article.revision;
      existing.variantLabels ??= structuredClone(article.variantLabels);
      existing.availableSizes ??= structuredClone(article.availableSizes);
      existing.validation ??= structuredClone(article.validation);
      existing.validationHistory ??= [];
      existing.priceConfiguration ??= structuredClone(article.priceConfiguration);
      existing.priceConfiguration.articleUnitPricesBySizeEur ??= structuredClone(article.priceConfiguration?.articleUnitPricesBySizeEur ?? {});
      for (const [size, amount] of Object.entries(article.priceConfiguration?.articleUnitPricesBySizeEur ?? {})) if (existing.priceConfiguration.articleUnitPricesBySizeEur[size] == null && amount != null) existing.priceConfiguration.articleUnitPricesBySizeEur[size] = amount;
      existing.priceConfiguration.personalizationUnitPricesEur ??= {};
      for (const field of PERSONALIZATION_FIELDS) if (existing.priceConfiguration.personalizationUnitPricesEur[field] == null && article.priceConfiguration?.personalizationUnitPricesEur?.[field] != null) existing.priceConfiguration.personalizationUnitPricesEur[field] = article.priceConfiguration.personalizationUnitPricesEur[field];
      if ((!existing.priceConfiguration.sourceLabel || existing.priceConfiguration.sourceLabel.startsWith("DATA_GAP")) && article.priceConfiguration?.sourceLabel) existing.priceConfiguration.sourceLabel = article.priceConfiguration.sourceLabel;
      existing.displayOrder ??= ARTICLE_CATALOG.findIndex(({ id }) => id === article.id) + 1;
      if (["140298", "141598"].includes(String(article.articleNumber)) || article.association === PIONEERS_ASSOCIATION && ["116386", "116388"].includes(String(article.articleNumber))) {
        existing.supports = structuredClone(article.supports);
        existing.personalizationPolicy = structuredClone(article.personalizationPolicy);
        existing.commercialPrintOptions = structuredClone(article.commercialPrintOptions);
        existing.printRelevance = structuredClone(article.printRelevance);
        if (article.articleNumber === "141598") {
          existing.priceConfiguration.personalizationUnitPricesEur.backNumber = null;
          existing.priceConfiguration.personalizationValuePricing = structuredClone(article.priceConfiguration.personalizationValuePricing);
          existing.priceConfiguration.sourceLabel = article.priceConfiguration.sourceLabel;
        }
      }
    }
  }
  state.productionProfiles ??= structuredClone(PRODUCTION_PROFILES);
  for (const profile of PRODUCTION_PROFILES) {
    const existing = state.productionProfiles.find(({ id }) => id === profile.id);
    if (!existing) state.productionProfiles.push(structuredClone(profile));
    else {
      if (profile.productionSourceSetId) existing.productionSourceSetId = profile.productionSourceSetId;
      if (profile.productionSourceSetFields) existing.productionSourceSetFields = structuredClone(profile.productionSourceSetFields);
      if (profile.outputWriterId) existing.outputWriterId = profile.outputWriterId;
    }
  }
  reconcileCanonicalProductionProfileSources(state);
  reconcileVerifiedProductionNumberSources(state);
  applyPioneersProductionAuthority(state);
  applyScBuitenboysShortAuthority(state);
  reconcileCanonicalProductionProfileSources(state);
  state.settings ??= structuredClone(PILOT_SETTINGS);
  state.settings.deliveryFeeEur ??= PILOT_SETTINGS.deliveryFeeEur;
  state.settings.productionDefaults = { ...structuredClone(PILOT_SETTINGS.productionDefaults), ...(state.settings.productionDefaults ?? {}) };
  state.foilRolls ??= [];
  for (const canonicalRoll of FOIL_ROLLS) {
    const exists = state.foilRolls.some(({ id, color }) => id === canonicalRoll.id || String(color).trim().toLocaleLowerCase("nl-NL") === canonicalRoll.color.toLocaleLowerCase("nl-NL"));
    if (!exists) state.foilRolls.push(structuredClone(canonicalRoll));
  }
  if (new Set(state.foilRolls.map(({ id }) => id)).size !== state.foilRolls.length || new Set(state.foilRolls.map(({ color }) => String(color).trim().toLocaleLowerCase("nl-NL"))).size !== state.foilRolls.length) throw new Error("Dubbele folierol of foliekleur.");
  state.preferences ??= {};
  for (const user of state.users) {
    state.preferences[user.id] = { ...defaultPreference(), ...(state.preferences[user.id] ?? {}) };
  }
  if (new Set(state.users.map(({ id }) => id)).size !== state.users.length) throw new Error("Dubbele gebruiker-ID.");
  if (new Set(state.employees.map(({ id }) => id)).size !== state.employees.length || new Set(state.employees.map(({ salesNumber }) => salesNumber)).size !== state.employees.length) throw new Error("Dubbele werknemer of dubbel verkoopnummer.");
  for (const employee of state.employees) {
    if (!employee.name || !/^\d{1,8}$/u.test(employee.salesNumber) || typeof employee.active !== "boolean" || !Number.isInteger(employee.revision) || employee.revision < 1) throw new Error("Ongeldige werknemer in datastore.");
    if (employee.userId && !state.users.some(({ id }) => id === employee.userId)) throw new Error("Werknemer verwijst naar een ontbrekende Workspace-gebruiker.");
    if (employee.accountType && !["HUMAN", "FUNCTION", "SYSTEM"].includes(employee.accountType)) throw new Error("Ongeldig verkoopnummer-accounttype.");
  }
  if (state.websiteSync.mode !== "STAGE_ONLY") throw new Error("Website-sync mag alleen bronwijzigingen klaarzetten.");
  if (state.webshopIntake.enabled !== true || state.webshopIntake.retrievalMode !== "CONTROLLED_MAIL_DOCUMENT_ADAPTER") throw new Error("Webshop document-intake moet uitsluitend via de gecontroleerde Mail/Document-adapter lopen.");
  for (const source of state.webshopIntake.sources ?? []) if (!source.immutable || source.mimeType !== "application/pdf" || sha256(Buffer.from(source.dataBase64, "base64")) !== String(source.sha256).toLowerCase()) throw new Error("Immutable webshop-PDF ontbreekt of is gewijzigd.");
  if (state.mailboxRouting?.mailbox?.id !== SPORTPALEIS_MAILBOX_ID || state.mailboxRouting.mailbox.organizationId !== state.organizationId || state.mailboxRouting.mailbox.destructiveMailboxActions !== false) throw new Error("Ongeldige of te ruime Sportpaleis-mailboxboundary.");
  if (new Set(state.mailboxRouting.messages.map(({ id }) => id)).size !== state.mailboxRouting.messages.length) throw new Error("Dubbele mailboxberichtidentiteit.");
  for (const message of state.mailboxRouting.messages) {
    if (message.organizationId !== state.organizationId || !["WEBSHOP_ORDER_PDF", "CUSTOMER_REPLY", "UNKNOWN"].includes(message.classification?.route)) throw new Error("Ongeldige mailboxrouting.");
    if (!message.rawEvidence?.immutable || !/^[a-f0-9]{64}$/u.test(String(message.rawEvidence.sha256)) || !message.rawEvidence.storageReference) throw new Error("Immutable mail-evidence ontbreekt.");
    if (message.rawDataBase64 || message.attachments.some(({ dataBase64 }) => Boolean(dataBase64))) throw new Error("Mailboxbytes mogen niet in de centrale state worden gedupliceerd.");
    if (message.classification.route === "CUSTOMER_REPLY" && message.classification.productionImpact?.detected && !message.attentionId) throw new Error("Productie-impact uit klantmail moet fail-closed Attention zijn.");
  }
  if (new Set(state.orders.map(({ id }) => id)).size !== state.orders.length) throw new Error("Dubbel ordernummer.");
  if (new Set(state.productionFonts.map(({ id }) => id)).size !== state.productionFonts.length || new Set(state.productionFonts.map(({ sha256: hash }) => hash)).size !== state.productionFonts.length) throw new Error("Dubbele productiefontbron.");
  for (const font of state.productionFonts.filter(({ status, authority }) => status === "TECHNICALLY_VALID" && authority === "ADMIN_VERIFIED_UPLOAD")) {
    const admission = productionFontExecutableDecision(font, font.admission?.applicationBindings?.[0] ?? "FREE_PRINT");
    if (!admission.allowed) throw new Error(`Geüploade productiefont is niet werkelijk uitvoerbaar: ${admission.code}.`);
  }
  if (new Set((state.productionAssetSources ?? []).map(({ id }) => id)).size !== (state.productionAssetSources ?? []).length || new Set((state.productionAssetSources ?? []).map(({ original }) => original.sha256)).size !== (state.productionAssetSources ?? []).length) throw new Error("Dubbele productieassetbron.");
  for (const source of state.productionAssetSources ?? []) {
    if (!source.original?.immutable || sha256(Buffer.from(source.original.dataBase64, "base64")).toUpperCase() !== source.original.sha256) throw new Error("Immutable productieassetbron ontbreekt of is gewijzigd.");
    if (!source.candidates?.length || source.candidates.some(({ geometryHash, controlledVector }) => sha256(JSON.stringify(controlledVector.contours)).toUpperCase() !== geometryHash)) throw new Error("Productieassetkandidaten zijn gewijzigd of onvolledig.");
    if (!Number.isInteger(Number(source.revision ?? 1)) || Number(source.revision ?? 1) < 1 || !["REFERENCE_REQUIRED", "MATCHED", "MISMATCH"].includes(source.fidelity?.status ?? "REFERENCE_REQUIRED")) throw new Error("Ongeldige bronfidelitystatus.");
    if (source.normalized) {
      if (!source.normalized.immutable || sha256(Buffer.from(source.normalized.dataBase64, "base64")).toUpperCase() !== source.normalized.sha256 || source.normalized.derivedFromSha256 !== source.original.sha256 || source.conversion?.derivedFromSha256 !== source.original.sha256 || source.conversion?.normalizedSha256 !== source.normalized.sha256) throw new Error("Een genormaliseerde productiebron mist de immutable original→normalized hashketen.");
    }
    if (source.original?.format === "SVG") {
      const directVerified = source.conversion?.method === "HUMAN_VERIFIED_SVG";
      const deterministicallyNormalized = Boolean(source.normalized && /^WBD_[A-Z0-9_]+_V\d+$/u.test(String(source.conversion?.method ?? "")));
      if ((!directVerified && !deterministicallyNormalized) || source.inspection?.engine !== "WBD_PRODUCTION_ASSET_SVG_INTAKE_V1" || source.fidelity?.status !== "MATCHED") throw new Error("Een SVG-productiebron mist het canonical SVG-validatiecontract.");
    }
    if (source.conversion?.method === "ILLUSTRATOR_MANUAL_VECTOR_PDF_EXPORT") {
      const reference = state.productionAssetSources.find(({ id }) => id === source.conversion.derivedFromSourceId);
      if (!reference || reference.original.sha256 !== source.conversion.derivedFromSha256 || source.fidelity?.referenceSha256 !== reference.original.sha256) throw new Error("Afgeleide productiebron mist immutable herleidbaarheid naar het origineel.");
    }
    if (source.reviewDraft) {
      const candidateIds = new Set(source.candidates.map(({ id }) => id));
      const invalidArtwork = Object.entries(source.reviewDraft.candidateArtwork ?? {}).some(([candidateId, artwork]) => !candidateIds.has(candidateId) || !artwork?.name || !["LOGO", "SPONSOR", "ARTWORK"].includes(artwork.kind));
      if (!Number.isInteger(source.reviewDraft.revision) || source.reviewDraft.revision < 1 || source.reviewDraft.selectedCandidateIds.some((id) => !candidateIds.has(id)) || invalidArtwork) throw new Error("Ongeldig concept voor productiebronreview.");
    }
  }
  for (const asset of state.productionElements.filter(({ lifecycleStatus }) => lifecycleStatus === "PRODUCTION_READY")) {
    // A physically supplied transfer is executable by its transfer contract,
    // not by the self-produced vector/plot contract below. It must never be
    // admitted to the plot route merely because its lifecycle is ready.
    if (asset.productionMethod === "PHYSICAL_TRANSFER") continue;
    if (!asset.sourceId || !state.productionAssetSources.some(({ id }) => id === asset.sourceId) || asset.controlledVector?.geometryHash !== asset.sourceSelection?.geometryHash) throw new Error("Productierijpe asset mist immutable bron- of geometrie-identiteit.");
    const admission = executableProductionAssetDecision(asset);
    if (!admission.allowed) throw new Error(`Productierijpe asset is niet werkelijk uitvoerbaar: ${admission.code}.`);
  }
  if (new Set(state.productionElements.map(({ id }) => id)).size !== state.productionElements.length) throw new Error("Dubbele productie-element-ID.");
  const registrationIds = state.productionElements.map(({ registrationId }) => registrationId).filter(Boolean);
  if (new Set(registrationIds).size !== registrationIds.length) throw new Error("Dubbele productiebronregistratie.");
  for (const profile of state.productionProfiles ?? []) if ((profile.productionNumberAssetIds ?? []).some((id) => !state.productionElements.some((asset) => asset.id === id && asset.lifecycleStatus === "PRODUCTION_READY"))) throw new Error("Productieprofiel verwijst naar een ontbrekende of niet-productierijpe bron.");
  if (new Set(state.productionJobs.map(({ id }) => id)).size !== state.productionJobs.length || new Set(state.productionJobs.map(({ jobNumber }) => jobNumber)).size !== state.productionJobs.length) throw new Error("Dubbele productiejob.");
  if (new Set(state.productionProposals.map(({ id }) => id)).size !== state.productionProposals.length || new Set(state.productionProposals.map(({ proposalNumber }) => proposalNumber)).size !== state.productionProposals.length) throw new Error("Dubbel productievoorstel.");
  if (new Set(state.quickProductionIntakes.map(({ id }) => id)).size !== state.quickProductionIntakes.length) throw new Error("Dubbele Quick Production Intake.");
  for (const intake of state.quickProductionIntakes) {
    if (!intake.source?.immutable || sha256(Buffer.from(intake.source.dataBase64, "base64")) !== intake.source.sha256 || !["HUMAN_CHECK", "ACCEPTED"].includes(intake.status)) throw new Error("Quick Production Intake-bron is gewijzigd of onvolledig.");
    if (intake.status === "ACCEPTED" && (!intake.orderId || !state.orders.some(({ id }) => id === intake.orderId))) throw new Error("Verwerkte Quick Production Intake mist de canonieke order.");
  }
  validateVisualStudioCompositions(state.visualCompositions);
  for (const composition of state.visualCompositions) {
    if (!composition.sourceRef) continue;
    if (!composition.sourceDataBase64 || sha256(Buffer.from(composition.sourceDataBase64, "base64")) !== composition.sourceRef.sha256) throw new Error("Creative Studio-bron is gewijzigd buiten de immutable compositie.");
  }
  if (new Set(state.creativeVectorDrafts.map(({ id }) => id)).size !== state.creativeVectorDrafts.length) throw new Error("Dubbel Creative Studio-vectorvoorstel.");
  for (const draft of state.creativeVectorDrafts) {
    if (draft.status !== "HUMAN_REVIEW_REQUIRED" || draft.engine !== "VTRACER_WASM_1_0_0_ALPHA_3" || draft.evidence?.canonicalPromotionPerformed !== false) throw new Error("Ongeldig Creative Studio-vectorvoorstel.");
    if (sha256(Buffer.from(draft.source.dataBase64, "base64")).toUpperCase() !== draft.source.sha256 || sha256(draft.derivative.svg).toUpperCase() !== draft.derivative.sha256 || draft.evidence.sourceSha256 !== draft.source.sha256 || draft.evidence.derivativeSha256 !== draft.derivative.sha256) throw new Error("Creative Studio-vectorbewijs is gewijzigd.");
  }
  for (const user of state.users) {
    if (!ROLE.has(user.role) || (user.status !== "Uitgenodigd" && !user.password?.hash)) throw new Error("Ongeldige gebruiker in datastore.");
  }
  for (const order of state.orders) {
    if (!Number.isInteger(order.revision) || order.revision < 1 || !STAGE_ORDER.includes(order.stage)) {
      throw new Error("Ongeldige order in datastore.");
    }
    if (order.stage === "ORDER" && order.orderKind === "INDIVIDUAL" && order.items?.length && !order.commercialPriceTruth) {
      order.commercialPriceTruth = catalogCommercialPriceTruth(state, order.items, "CATALOG_CONCEPT_REPROJECTION");
    }
    for (const line of order.productionLines ?? []) {
      const incompleteCompositeSegment = ["INITIALS_FIRST", "INITIALS_INFIX", "INITIALS_LAST"].includes(line.placementRole) && line.validation?.status === "BLOCKED" && line.widthMm >= 0 && line.heightMm >= 0;
      const explicitTeamkitDataGap = line.dataGap?.status === "DATA_GAP" && line.validation?.status === "BLOCKED" && Array.isArray(line.dataGap.fields) && line.dataGap.fields.length > 0 && line.widthMm >= 0 && line.heightMm >= 0;
      if (!PRODUCTION_LINE_TYPES.has(line.type) || !PRODUCTION_PROOF_STATUSES.has(line.proofStatus) || (!incompleteCompositeSegment && !explicitTeamkitDataGap && (!(line.widthMm > 0) || !(line.heightMm > 0))) || !Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Ongeldige productieregel in datastore.");
      if (line.source?.kind === "FONT" && !state.productionFonts.some(({ id, version, sha256: hash }) => id === line.source.id && version === line.source.version && hash === line.source.sha256)) throw new Error("Productieregel verwijst naar een ontbrekende fontversie.");
    }
    if (order.referenceSeries === "TK") {
      if (!order.teamkitContext || order.teamkitContext.kind !== "TEAMKIT_APPROVAL" || !/^TK-\d{4}-\d{4,}$/u.test(order.id)) throw new Error("Teamkit-productieorder mist expliciete immutable herkomst.");
      if (!order.teamkitContext.fulfillmentTaskIds?.length || !order.teamkitContext.idempotencyKey) throw new Error("Teamkit-productieorder mist taak- of idempotencyherkomst.");
    }
  }
  for (const job of state.productionJobs) {
    if (!job.snapshot || job.snapshotHash !== sha256(JSON.stringify(job.snapshot))) throw new Error("Productiejob-snapshot is gewijzigd of beschadigd.");
    if (!PRODUCTION_PROOF_STATUSES.has(job.proofStatus)) throw new Error("Ongeldige bewijsstatus voor productiejob.");
    if (!['ORIGINAL', 'REPLOT'].includes(job.kind) || !['AWAITING_HUMAN_CHECK', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) throw new Error("Ongeldige productiejobstatus.");
    if (job.kind === "REPLOT" && (!job.originJobId || !state.productionJobs.some(({ id }) => id === job.originJobId))) throw new Error("Herplot mist de oorspronkelijke productiejob.");
  }
  return validateTeamkitProposalState(state);
}

function cleanStartProtectedFingerprint(state) {
  const protectedState = Object.fromEntries(Object.entries(state).filter(([key]) => !["revision", "orders", "productionElementRequirements", "productionJobs", "productionProposals", "idempotency"].includes(key)));
  return sha256(JSON.stringify(protectedState));
}

export function cleanSportpaleisPilotOrders(input) {
  const state = validateSportpaleisPilotState(structuredClone(input));
  if (state.organizationId !== "sport-2000-sportpaleis-bv") throw new Error("Clean start is buiten de Sportpaleis-organisatie geweigerd.");
  const beforeFingerprint = cleanStartProtectedFingerprint(state);
  const orders = state.orders ?? [];
  for (const order of orders) {
    const structurallyPilotBound = /^(?:SP(?:W)?|TK)-/u.test(String(order.id))
      && ["INDIVIDUAL", "TEAM", "CUSTOM", "LEGACY"].includes(order.orderKind)
      && order.barcode?.value === `SPW:${order.id}`
      && Array.isArray(order.items)
      && order.items.every((item) => typeof item.sourceProvenance === "string");
    if (!structurallyPilotBound) throw new Error(`Clean start geweigerd: ${order.id || "onbekende order"} is niet eenduidig als Sportpaleis-pilotrecord bevestigd.`);
  }
  const orderIds = new Set(orders.map(({ id }) => id));
  const removedJobs = [];
  const retainedJobs = [];
  for (const job of state.productionJobs ?? []) {
    const referenced = job.snapshot?.orderIds ?? [];
    const matches = referenced.filter((id) => orderIds.has(id));
    if (matches.length && matches.length !== referenced.length) throw new Error(`Clean start geweigerd: PlotJob ${job.jobNumber} mengt te verwijderen en onbekende orders.`);
    (matches.length ? removedJobs : retainedJobs).push(job);
  }
  const removedProposals = [];
  const retainedProposals = [];
  for (const proposal of state.productionProposals ?? []) {
    const referenced = (proposal.orders ?? []).map(({ id }) => id);
    const matches = referenced.filter((id) => orderIds.has(id));
    if (matches.length && matches.length !== referenced.length) throw new Error(`Clean start geweigerd: productievoorstel ${proposal.proposalNumber} mengt te verwijderen en onbekende orders.`);
    (matches.length ? removedProposals : retainedProposals).push(proposal);
  }
  const removedRequirements = (state.productionElementRequirements ?? []).filter(({ orderId }) => orderIds.has(orderId));
  const retainedRequirements = (state.productionElementRequirements ?? []).filter(({ orderId }) => !orderIds.has(orderId));
  const removedIdempotencyKeys = Object.entries(state.idempotency ?? {}).filter(([, value]) => orders.some(({ id }) => JSON.stringify(value).includes(id))).map(([key]) => key);
  const retainedIdempotency = Object.fromEntries(Object.entries(state.idempotency ?? {}).filter(([key]) => !removedIdempotencyKeys.includes(key)));
  const artifactPaths = [...new Set(removedJobs.map((job) => String(job.snapshot?.artifact?.path ?? "").replaceAll("\\", "/")).filter((artifactPath) => /^outputs\/sportpaleis-plotjobs\/[A-Za-z0-9._/-]+$/u.test(artifactPath) && !artifactPath.includes("../")))];
  state.orders = [];
  state.productionElementRequirements = retainedRequirements;
  state.productionJobs = retainedJobs;
  state.productionProposals = retainedProposals;
  state.idempotency = retainedIdempotency;
  const afterFingerprint = cleanStartProtectedFingerprint(state);
  if (afterFingerprint !== beforeFingerprint) throw new Error("Clean start heeft beschermde Workspace-data gewijzigd en is teruggedraaid.");
  return {
    state,
    manifest: {
      organizationId: state.organizationId,
      protectedFingerprint: beforeFingerprint,
      before: { orders: orders.length, productionJobs: (input.productionJobs ?? []).length, productionProposals: (input.productionProposals ?? []).length, productionElementRequirements: (input.productionElementRequirements ?? []).length },
      removed: { orderIds: [...orderIds], productionJobIds: removedJobs.map(({ id }) => id), productionProposalIds: removedProposals.map(({ id }) => id), productionElementRequirementIds: removedRequirements.map(({ id }) => id), idempotencyKeys: removedIdempotencyKeys, artifactPaths },
      after: { orders: 0, productionJobs: retainedJobs.length, productionProposals: retainedProposals.length, productionElementRequirements: retainedRequirements.length },
    },
  };
}

const validateState = validateSportpaleisPilotState;

export class SportpaleisFileStore {
  constructor({ filePath, backupDirectory, seedPasswords, lockTimeoutMs = 5_000 }) {
    this.filePath = path.resolve(filePath);
    this.backupDirectory = path.resolve(backupDirectory);
    this.seedPasswords = seedPasswords;
    this.lockPath = `${this.filePath}.lock`;
    this.lockTimeoutMs = lockTimeoutMs;
    this.queue = Promise.resolve();
  }

  async initialize() {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await mkdir(this.backupDirectory, { recursive: true });
    try {
      const raw = JSON.parse(await readFile(this.filePath, "utf8"));
      const migrated = validateState(raw);
      if (raw.schemaVersion !== migrated.schemaVersion || raw.configurationVersion !== migrated.configurationVersion) {
        await this.#writeAtomic(migrated);
        const reason = raw.schemaVersion !== migrated.schemaVersion
          ? `schema-${raw.schemaVersion}-to-${migrated.schemaVersion}`
          : `configuration-${raw.configurationVersion ?? "unknown"}-to-${migrated.configurationVersion}`;
        await this.createBackup(reason);
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const { createSportpaleisDevelopmentSeed } = await import("./sportpaleis-development-seed.mjs");
      const state = validateState(await createSportpaleisDevelopmentSeed(this.seedPasswords));
      await this.#writeAtomic(state);
      await this.createBackup("initial");
    }
  }

  async read() {
    return validateState(JSON.parse(await readFile(this.filePath, "utf8")));
  }

  async mutate(mutator) {
    const run = async () => this.#withLock(async () => {
      const current = await this.read();
      const result = await mutator(structuredClone(current));
      const next = validateState(result.state);
      next.revision = current.revision + 1;
      await this.#writeAtomic(next);
      return { state: next, value: result.value };
    });
    const pending = this.queue.then(run, run);
    this.queue = pending.then(() => undefined, () => undefined);
    return pending;
  }

  async #withLock(operation) {
    const started = Date.now();
    let handle;
    while (!handle) {
      try {
        handle = await open(this.lockPath, "wx");
      } catch (error) {
        if (error?.code !== "EEXIST" || Date.now() - started > this.lockTimeoutMs) throw error;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    try {
      return await operation();
    } finally {
      await handle.close();
      await unlink(this.lockPath).catch(() => undefined);
    }
  }

  async #writeAtomic(state) {
    const temporary = `${this.filePath}.${randomBytes(8).toString("hex")}.tmp`;
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temporary, this.filePath);
  }

  async createBackup(reason = "manual") {
    const state = await this.read();
    const timestamp = new Date().toISOString().replaceAll(":", "-");
    const body = `${JSON.stringify(state, null, 2)}\n`;
    const filename = `sportpaleis-pilot-${timestamp}.json`;
    const target = path.join(this.backupDirectory, filename);
    await writeFile(target, body, { encoding: "utf8", mode: 0o600 });
    const manifest = {
      schemaVersion: PILOT_SCHEMA_VERSION,
      createdAt: iso(),
      reason,
      sourceRevision: state.revision,
      file: filename,
      bytes: Buffer.byteLength(body),
      sha256: sha256(body),
    };
    await writeFile(`${target}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    await this.#applyRetention(14);
    return manifest;
  }

  async verifyBackup(manifestPath) {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    const backupPath = path.join(path.dirname(manifestPath), manifest.file);
    const body = await readFile(backupPath, "utf8");
    validateState(JSON.parse(body));
    if (sha256(body) !== manifest.sha256 || Buffer.byteLength(body) !== manifest.bytes) {
      throw new Error("Back-uphash of bestandsgrootte komt niet overeen.");
    }
    return { valid: true, manifest, backupPath };
  }

  async latestBackupStatus() {
    const entries = (await readdir(this.backupDirectory)).filter((name) => name.endsWith(".manifest.json")).sort().reverse();
    if (!entries[0]) return { status: "missing" };
    try {
      const result = await this.verifyBackup(path.join(this.backupDirectory, entries[0]));
      return { status: "ok", createdAt: result.manifest.createdAt, sourceRevision: result.manifest.sourceRevision };
    } catch {
      return { status: "invalid" };
    }
  }

  async storageStatus() {
    const data = await stat(this.filePath);
    return { engine: "file-development", storageBytes: data.size };
  }

  async #applyRetention(maximum) {
    const files = (await readdir(this.backupDirectory)).filter((name) => name.endsWith(".json") && !name.endsWith(".manifest.json")).sort().reverse();
    for (const filename of files.slice(maximum)) {
      await unlink(path.join(this.backupDirectory, filename)).catch(() => undefined);
      await unlink(path.join(this.backupDirectory, `${filename}.manifest.json`)).catch(() => undefined);
    }
  }
}

function audit(state, userId, action, subject, details = {}) {
  state.audit.unshift({ id: `audit-${randomBytes(8).toString("hex")}`, at: iso(), userId, action, subject, details });
}

export function setSportpaleisTeamwearPilotExposure(state, principalId, enabled, actorId = "system:pilot-control") {
  const target = state.users.find(({ id }) => id === principalId);
  if (!target || target.status !== "Actief" || target.seatType !== "customer" || target.role !== "admin") {
    throw Object.assign(new Error("Teamwear-pilot vereist een exact actief klantbeheeraccount."), { statusCode: 409, code: "TEAMWEAR_PILOT_PRINCIPAL_INVALID" });
  }
  target.featureExposure ??= {};
  const previous = target.featureExposure.teamwearExperiencePilot === true;
  target.featureExposure.teamwearExperiencePilot = enabled === true;
  audit(state, actorId, enabled ? "Teamwear pilot ingeschakeld" : "Teamwear pilot uitgeschakeld", target.id, {
    previous,
    enabled: enabled === true,
    enforcement: "SERVER_PRINCIPAL_ALLOWLIST",
    defaultExposure: false,
  });
  return { principalId: target.id, email: target.email, role: target.role, previous, enabled: enabled === true };
}

function idempotent(state, key, userId, operation, valueFactory, requestPayload = undefined) {
  if (!key || key.length < 12 || key.length > 160) throw Object.assign(new Error("Ongeldige idempotency key."), { statusCode: 400, code: "INVALID_IDEMPOTENCY_KEY" });
  const identity = `${userId}:${operation}:${key}`;
  const requestHash = requestPayload === undefined ? null : sha256(JSON.stringify(requestPayload));
  if (state.idempotency[identity]) {
    const existingHash = state.idempotency[identity].requestHash ?? null;
    if (requestHash && existingHash !== requestHash) throw Object.assign(new Error("Deze idempotency key hoort bij een andere immutable opdracht."), { statusCode: 409, code: "IDEMPOTENCY_PAYLOAD_MISMATCH" });
    return { duplicate: true, value: state.idempotency[identity].value };
  }
  const value = valueFactory();
  state.idempotency[identity] = { at: iso(), requestHash, value };
  return { duplicate: false, value };
}

const FULFILLMENT_TRANSITION_ACTIONS = new Set(["READY_FOR_PICKUP", "PICKED_UP", "DELIVERED"]);
const TEAMKIT_EXTERNAL_TASK_SEQUENCE = ["READY_TO_SEND", "SENT", "CONFIRMED", "RETURNED", "READY", "COMPLETED"];

function assertFulfillmentTransition(state, order, action) {
  if (!FULFILLMENT_TRANSITION_ACTIONS.has(action)) return;
  if (order.stage !== "DONE") throw Object.assign(new Error("Uitleveren kan pas nadat Productie de order Gereed heeft gemeld."), { statusCode: 409, code: "ORDER_NOT_READY" });
  const closure = productionClosureForOrder(state, order);
  if (closure.status !== "CONFIRMED") throw Object.assign(new Error(`Uitleveren is geblokkeerd: ${closure.reason ?? "productie-afsluiting is niet verifieerbaar"}`), { statusCode: 409, code: "PRODUCTION_CLOSURE_NOT_CONFIRMED", closure });
  if (["READY_FOR_PICKUP", "PICKED_UP"].includes(action) && order.fulfillment?.mode === "DELIVERY") throw Object.assign(new Error("Deze order staat op bezorgen."), { statusCode: 409, code: "FULFILLMENT_MODE_CONFLICT" });
  if (action === "READY_FOR_PICKUP" && order.fulfillment?.status !== "PENDING") throw Object.assign(new Error("Deze order is al vrijgegeven voor afhalen of afgehaald."), { statusCode: 409, code: "FULFILLMENT_ALREADY_ADVANCED" });
  if (action === "PICKED_UP" && order.fulfillment?.status !== "READY_FOR_PICKUP") throw Object.assign(new Error("Meld de order eerst Klaar om op te halen."), { statusCode: 409, code: "ORDER_NOT_READY_FOR_PICKUP" });
  if (action === "DELIVERED" && order.fulfillment?.mode !== "DELIVERY") throw Object.assign(new Error("Deze order staat op afhalen."), { statusCode: 409, code: "FULFILLMENT_MODE_CONFLICT" });
  if (action === "DELIVERED" && order.fulfillment?.status !== "PENDING") throw Object.assign(new Error("Deze order is al bezorgd."), { statusCode: 409, code: "FULFILLMENT_ALREADY_ADVANCED" });
}

function applyCanonicalFulfillmentTransition(state, order, action, user, at, { exception = null } = {}) {
  assertFulfillmentTransition(state, order, action);
  order.operationalFacts ??= {};
  order.operationalFacts[action] = { at, userId: user.id, userName: user.name, source: "MANUAL_WORKSPACE" };
  if (action === "READY_FOR_PICKUP") order.fulfillment = { mode: "PICKUP", status: "READY_FOR_PICKUP", updatedAt: at, updatedBy: user.id, feeEur: 0, address: null };
  if (action === "PICKED_UP") {
    order.pickup = { status: "PICKED_UP", pickedUpAt: at, pickedUpBy: user.id, ...(exception ? { exception } : {}) };
    order.fulfillment = { mode: "PICKUP", status: "PICKED_UP", updatedAt: at, updatedBy: user.id, feeEur: 0, address: null };
  }
  if (action === "DELIVERED") order.fulfillment = { ...(order.fulfillment ?? {}), mode: "DELIVERY", status: "DELIVERED", updatedAt: at, updatedBy: user.id };
}

function teamwearUseForCatalogProduct(product) {
  const source = `${product.category} ${product.model}`;
  if (/tas|sok|kous|accessoire/iu.test(source)) return "ACCESSOIRES";
  if (/polo|presentatie|jas|jacket/iu.test(source)) return "PRESENTATIE";
  if (/training|zip|broek|pants/iu.test(source)) return "TRAINING";
  return "WEDSTRIJD";
}

function currentTeamwearCatalogProjection(state, { brand = null, use = null } = {}) {
  const products = buildSportpaleisProductCatalog(state.articles).filter((product) => (!brand || product.brand.toLocaleLowerCase("nl-NL") === brand.toLocaleLowerCase("nl-NL")) && (!use || teamwearUseForCatalogProduct(product) === use));
  return products.map((product) => {
    const article = state.articles.find(({ id }) => id === product.variants[0]?.sourceArticleId);
    const sourceStatusForVariant = ({ sourceArticleId }) => {
      const sourceArticle = state.articles.find(({ id }) => id === sourceArticleId);
      return Boolean(sourceArticle?.catalogProvenance || (sourceArticle?.teamwearCatalog?.status === "SELECTABLE" && (sourceArticle.teamwearCatalog.sourceLabel || sourceArticle.catalogProvenance)));
    };
    const sourceStatus = product.variants.every(sourceStatusForVariant) ? "AUTHORITATIVE" : "MIXED_VARIANT_AUTHORITY";
    return {
      ...product,
      supplierName: product.brand === "Stanno" ? "Stanno / Deventrade" : product.brand || "Sportpaleis",
      supplierArticleName: product.model,
      supplierArticleNumber: product.variants[0]?.sourceArticleNumber ?? product.id,
      use: teamwearUseForCatalogProduct(product),
      collection: product.variants.map(({ sourceArticleId }) => state.articles.find(({ id }) => id === sourceArticleId)?.teamwearCatalog?.collection).find(Boolean) ?? null,
      familyKey: null,
      advicePriceEur: typeof article?.priceConfiguration?.articleUnitPriceEur === "number" ? article.priceConfiguration.articleUnitPriceEur : null,
      sourceStatus,
      syncStatus: "REVIEW_REQUIRED",
      variants: product.variants.map((variant) => { const variantArticle = state.articles.find(({ id }) => id === variant.sourceArticleId); return { ...variant, colorHex: null, advicePriceEur: typeof variantArticle?.priceConfiguration?.articleUnitPriceEur === "number" ? variantArticle.priceConfiguration.articleUnitPriceEur : null, sourceStatus: sourceStatusForVariant(variant) ? "AUTHORITATIVE" : "DATA_GAP" }; }),
    };
  });
}

function exactSourceFirstArticleBinding(state, item, proposalSources = []) {
  const snapshot = item.catalogSnapshot ?? {};
  const candidates = new Map();
  const remember = (article, evidenceKind, evidenceReference) => {
    if (!article?.active) return;
    const existing = candidates.get(article.id);
    candidates.set(article.id, existing ?? { article, evidence: [] });
    candidates.get(article.id).evidence.push({ kind: evidenceKind, reference: evidenceReference });
  };

  if (snapshot.sourceProductId && snapshot.sourceColorId) {
    for (const article of state.articles) if (article.catalogMedia?.some((media) => media.sourceProductId === snapshot.sourceProductId && media.sourceColorId === snapshot.sourceColorId && media.classification === "SOURCE_GALLERY_ORDER_V1")) remember(article, "OFFICIAL_VARIANT_IDENTITY", `${snapshot.sourceProductId}:${snapshot.sourceColorId}`);
  }
  if (snapshot.sourceStatus === "AUTHORITATIVE" && snapshot.catalogProductId) {
    const article = state.articles.find(({ id, active }) => active && id === snapshot.catalogProductId);
    if (article) remember(article, "CANONICAL_CATALOG_ARTICLE", snapshot.catalogProductId);
  }

  if (candidates.size === 0) return { status: "UNRESOLVED", binding: null, evidence: [] };
  if (candidates.size > 1) return { status: "CONFLICTING", binding: null, evidence: [...candidates.values()].flatMap(({ article, evidence }) => evidence.map((entry) => ({ ...entry, sourceArticleId: article.id }))) };
  const [{ article, evidence }] = [...candidates.values()];
  // Direct uploads are immutable visual evidence, never product identity. A
  // client-controlled filename (even one containing an SKU) cannot establish
  // physical sides or placements. Preserve its provenance only after a server-
  // authoritative catalog/variant binding has independently resolved identity.
  for (const sourceId of [snapshot.directFrontSourceId, snapshot.directBackSourceId].filter(Boolean)) {
    const source = proposalSources.find(({ id }) => id === sourceId);
    if (source) evidence.push({ kind: "IMMUTABLE_PRODUCT_IMAGE_SOURCE", reference: `${source.id}@${source.sha256}` });
  }
  const truth = canonicalTeamkitArticleSurfaceTruth(article);
  const body = {
    version: "TEAMKIT_CANONICAL_PRODUCT_IDENTITY_V1",
    sourceArticleId: article.id,
    articleNumber: article.articleNumber,
    productType: truth.productType,
    physicalSides: [...truth.physicalSides],
    printableSides: [...truth.printableSides],
    authority: "SPORTPALEIS_SERVER_PRODUCT_TRUTH",
    evidenceKind: evidence.map(({ kind }) => kind).sort().join("+"),
    evidenceReference: evidence.map(({ reference }) => reference).sort().join(" | "),
  };
  return { status: "RESOLVED", article, binding: { ...body, evidenceHash: sha256(JSON.stringify(body)) }, evidence };
}

function catalogSnapshotForAuthoritativeArticle(article) {
  const truth = canonicalTeamkitArticleSurfaceTruth(article);
  const productType = truth.productType;
  const front = article.catalogMedia?.find(({ kind, classification }) => kind === "FRONT" && classification === "SOURCE_GALLERY_ORDER_V1");
  const back = article.catalogMedia?.find(({ kind, classification }) => kind === "BACK" && classification === "SOURCE_GALLERY_ORDER_V1");
  return {
    catalogProductId: article.id,
    brand: article.teamwearCatalog?.brand ?? "Sportpaleis",
    supplierName: article.teamwearCatalog?.supplierName ?? article.teamwearCatalog?.brand ?? "Sportpaleis",
    supplierArticleName: article.name,
    supplierArticleNumber: article.articleNumber,
    category: article.teamwearCatalog?.category ?? article.category ?? productType,
    collection: article.teamwearCatalog?.collection ?? null,
    audience: article.teamwearCatalog?.audiences ?? [],
    colorLabel: front?.colorLabel ?? "Nog te bepalen",
    imageKey: front?.imageKey ?? article.imageKey,
    backImageKey: back?.imageKey ?? null,
    frontSourceUrl: front?.sourceUrl ?? null,
    backSourceUrl: back?.sourceUrl ?? null,
    sourceProductId: front?.sourceProductId ?? null,
    sourceColorId: front?.sourceColorId ?? null,
    mediaClassification: front?.classification ?? null,
    advicePriceEur: typeof article.priceConfiguration?.articleUnitPriceEur === "number" ? article.priceConfiguration.articleUnitPriceEur : null,
    effectivePriceEur: null,
    priceLabel: null,
    minimumQuantity: null,
    pricingPolicyRef: null,
    sourceAdapterId: "sportpaleis-existing",
    sourceStatus: "AUTHORITATIVE",
    directFrontSourceId: null,
    directBackSourceId: null,
    productType,
    printableSides: [...truth.printableSides],
    sourceReference: `Server-authoritative artikel ${article.articleNumber}`,
  };
}

function canonicalArticleMedia(article) {
  const official = (article.catalogMedia ?? []).filter(({ classification }) => classification === "SOURCE_GALLERY_ORDER_V1");
  const front = official.find(({ kind }) => kind === "FRONT") ?? null;
  const back = official.find(({ kind, sourceProductId, sourceColorId }) => kind === "BACK" && (!front || (sourceProductId === front.sourceProductId && sourceColorId === front.sourceColorId))) ?? null;
  if (official.some(({ kind }) => kind === "BACK") && !back) throw Object.assign(new Error("De officiële voor- en achterkant horen niet aantoonbaar bij dezelfde artikelvariant."), { statusCode: 409, code: "TEAMKIT_ARTICLE_MEDIA_VARIANT_CONFLICT", articleId: article.id });
  return { front, back };
}

function assertRequestedArticleMediaIdentity(state, item, article) {
  const snapshot = item.catalogSnapshot ?? {};
  const { front, back } = canonicalArticleMedia(article);
  const conflicts = [];
  const compare = (field, actual, expected) => { if (actual != null && String(actual).trim() && String(actual) !== String(expected ?? "")) conflicts.push({ field, actual, expected: expected ?? null }); };
  if (item.articleNumber && item.articleNumber !== article.articleNumber) conflicts.push({ field: "item.articleNumber", actual: item.articleNumber, expected: article.articleNumber });
  if (snapshot.catalogProductId && state.articles.some(({ id }) => id === snapshot.catalogProductId) && snapshot.catalogProductId !== article.id) conflicts.push({ field: "catalogProductId", actual: snapshot.catalogProductId, expected: article.id });
  compare("supplierArticleNumber", snapshot.supplierArticleNumber, article.articleNumber);
  compare("sourceProductId", snapshot.sourceProductId, front?.sourceProductId);
  compare("sourceColorId", snapshot.sourceColorId, front?.sourceColorId);
  if (!snapshot.directFrontSourceId && !String(snapshot.imageKey ?? "").startsWith("proposal-source:")) compare("imageKey", snapshot.imageKey, front?.imageKey ?? article.imageKey);
  if (!snapshot.directBackSourceId && snapshot.backImageKey) compare("backImageKey", snapshot.backImageKey, back?.imageKey ?? null);
  if (!snapshot.directFrontSourceId) compare("frontSourceUrl", snapshot.frontSourceUrl, front?.sourceUrl ?? article.catalogProvenance?.imageUrl ?? null);
  if (!snapshot.directBackSourceId) compare("backSourceUrl", snapshot.backSourceUrl, back?.sourceUrl ?? null);
  if (conflicts.length) throw Object.assign(new Error("De aangeleverde artikelmedia hoort niet bij exact hetzelfde canonieke artikel/SKU."), { statusCode: 409, code: "TEAMKIT_ARTICLE_MEDIA_IDENTITY_CONFLICT", itemId: item.id ?? null, articleId: article.id, conflicts });
  return { front, back };
}

function bindCatalogSnapshotToCanonicalArticle(item, article, truth, media, { preserveDirectMedia = false } = {}) {
  const requested = item.catalogSnapshot ?? {};
  const directFrontSourceId = preserveDirectMedia ? requested.directFrontSourceId ?? null : null;
  const directBackSourceId = preserveDirectMedia ? requested.directBackSourceId ?? null : null;
  item.articleId = article.id;
  item.articleNumber = article.articleNumber;
  item.productName = article.name;
  item.catalogSnapshot = {
    ...requested,
    catalogProductId: article.id,
    supplierArticleName: article.name,
    supplierArticleNumber: article.articleNumber,
    imageKey: directFrontSourceId ? requested.imageKey : media.front?.imageKey ?? article.imageKey,
    backImageKey: directBackSourceId ? requested.backImageKey : media.back?.imageKey ?? null,
    frontSourceUrl: directFrontSourceId ? requested.frontSourceUrl ?? null : media.front?.sourceUrl ?? article.catalogProvenance?.imageUrl ?? null,
    backSourceUrl: directBackSourceId ? requested.backSourceUrl ?? null : media.back?.sourceUrl ?? null,
    sourceProductId: media.front?.sourceProductId ?? null,
    sourceColorId: media.front?.sourceColorId ?? null,
    mediaClassification: media.front?.classification ?? null,
    sourceAdapterId: "sportpaleis-existing",
    sourceStatus: "AUTHORITATIVE",
    directFrontSourceId,
    directBackSourceId,
    directFrontSourceRef: directFrontSourceId ? requested.directFrontSourceRef ?? null : null,
    directBackSourceRef: directBackSourceId ? requested.directBackSourceRef ?? null : null,
    productType: truth.productType,
    category: truth.productType,
  };
}

function normalizeTeamkitItemsWithCanonicalProductTruth(state, requestedItems, proposalSources = []) {
  const items = structuredClone(requestedItems);
  for (const item of items) {
    if (!item.catalogSnapshot && item.articleId) {
      const article = state.articles.find(({ id, active }) => id === item.articleId && active);
      if (!article) throw Object.assign(new Error("Het gekozen bekende artikel bestaat niet meer in de actuele productwaarheid."), { statusCode: 409, code: "TEAMKIT_ARTICLE_TRUTH_NOT_FOUND", itemId: item.id ?? null, articleId: item.articleId });
      item.catalogSnapshot = catalogSnapshotForAuthoritativeArticle(article);
    }
    if (!item.catalogSnapshot) continue;
    const requestedType = canonicalTeamkitProductType(item.catalogSnapshot.productType);
    const requestedSides = Array.isArray(item.catalogSnapshot.printableSides) ? [...new Set(item.catalogSnapshot.printableSides)] : null;
    // Never accept a client-carried server binding. Every request is resolved
    // again from current authoritative state and immutable proposal sources.
    delete item.catalogSnapshot.canonicalProductIdentity;
    if (item.articleId) {
      const article = state.articles.find(({ id, active }) => id === item.articleId && active);
      if (!article) throw Object.assign(new Error("Het gekozen bekende artikel bestaat niet meer in de actuele productwaarheid."), { statusCode: 409, code: "TEAMKIT_ARTICLE_TRUTH_NOT_FOUND", itemId: item.id ?? null, articleId: item.articleId });
      const truth = canonicalTeamkitArticleSurfaceTruth(article);
      const canonicalType = truth.productType;
      if (requestedType && requestedType !== canonicalType) throw Object.assign(new Error("De opgegeven productsoort conflicteert met het gekozen canonieke artikel."), { statusCode: 409, code: "TEAMKIT_PRODUCT_TYPE_CONFLICT", itemId: item.id ?? null, articleId: article.id, requestedType, canonicalType });
      const media = assertRequestedArticleMediaIdentity(state, item, article);
      const hasDirectMedia = Boolean(item.catalogSnapshot.directFrontSourceId || item.catalogSnapshot.directBackSourceId);
      if (hasDirectMedia) {
        const directResolution = exactSourceFirstArticleBinding(state, { ...item, articleId: null }, proposalSources);
        if (directResolution.status !== "RESOLVED" || directResolution.article.id !== article.id) throw Object.assign(new Error("De directe klantmedia kan niet aantoonbaar aan exact hetzelfde canonieke artikel worden gekoppeld."), { statusCode: 409, code: "TEAMKIT_ARTICLE_MEDIA_IDENTITY_CONFLICT", itemId: item.id ?? null, articleId: article.id, evidence: directResolution.evidence });
      }
      bindCatalogSnapshotToCanonicalArticle(item, article, truth, media, { preserveDirectMedia: hasDirectMedia });
      const body = { version: "TEAMKIT_CANONICAL_PRODUCT_IDENTITY_V1", sourceArticleId: article.id, articleNumber: article.articleNumber, productType: truth.productType, physicalSides: [...truth.physicalSides], printableSides: [...truth.printableSides], authority: "SPORTPALEIS_SERVER_PRODUCT_TRUTH", evidenceKind: "ARTICLE_ID", evidenceReference: article.id };
      item.catalogSnapshot.canonicalProductIdentity = { ...body, evidenceHash: sha256(JSON.stringify(body)) };
    } else {
      const resolution = exactSourceFirstArticleBinding(state, item, proposalSources);
      if (resolution.status !== "RESOLVED") throw Object.assign(new Error(resolution.status === "CONFLICTING" ? "De directe artikelbron matcht meerdere conflicterende canonieke productidentiteiten." : "De directe artikelbron bevat onvoldoende authoritative identiteit om fysieke zijden en placements veilig vast te stellen."), { statusCode: 409, code: `TEAMKIT_CANONICAL_PRODUCT_IDENTITY_${resolution.status}`, itemId: item.id ?? null, evidence: resolution.evidence });
      const canonicalType = resolution.binding.productType;
      if (requestedType && requestedType !== canonicalType) throw Object.assign(new Error("De opgegeven productsoort conflicteert met de server-authoritative artikelbron."), { statusCode: 409, code: "TEAMKIT_PRODUCT_TYPE_CONFLICT", itemId: item.id ?? null, sourceArticleId: resolution.binding.sourceArticleId, requestedType, canonicalType });
      const truth = canonicalTeamkitArticleSurfaceTruth(resolution.article);
      const media = assertRequestedArticleMediaIdentity(state, item, resolution.article);
      bindCatalogSnapshotToCanonicalArticle(item, resolution.article, truth, media, { preserveDirectMedia: Boolean(item.catalogSnapshot.directFrontSourceId || item.catalogSnapshot.directBackSourceId) });
      item.catalogSnapshot.canonicalProductIdentity = resolution.binding;
    }
    const truth = canonicalTeamkitSurfaceTruth(item.catalogSnapshot.productType);
    if (requestedSides?.some((side) => !truth.printableSides.includes(side))) throw Object.assign(new Error("De opgegeven bedrukbare zijde conflicteert met de server-authoritative productsurface-truth."), { statusCode: 409, code: "TEAMKIT_PRODUCT_SIDE_NOT_PRINTABLE", itemId: item.id ?? null, requestedSides, canonicalSides: truth.printableSides });
    item.catalogSnapshot.printableSides = requestedSides?.length ? requestedSides : [...truth.printableSides];
  }
  return normalizeProposalItems(items);
}

function transitionTeamkitFulfillmentTask(task, payload) {
  const priorStatus = task.status;
  const requestedRoute = payload.route ? allowedValue(payload.route, ["INTERN_BEDRUKKEN", "EXTERNE_BEDRUKKER", "NOG_TE_BEPALEN"], "Afhandelroute") : task.route;
  const routeChanged = requestedRoute !== task.route;
  if (routeChanged) {
    if (task.orderId || !["HUMAN_CHECK", "READY_TO_SEND"].includes(task.status)) throw Object.assign(new Error("De afhandelroute kan niet meer wijzigen nadat afhandeling of productie is gestart."), { statusCode: 409, code: "TEAMKIT_FULFILLMENT_ROUTE_LOCKED" });
    task.route = requestedRoute;
    task.kind = requestedRoute === "INTERN_BEDRUKKEN" ? "INTERNAL_PRODUCTION" : requestedRoute === "EXTERNE_BEDRUKKER" ? "EXTERNAL_SUPPLIER" : "ROUTE_DECISION";
    task.attention = requestedRoute === "NOG_TE_BEPALEN" ? "Bepaal wie deze bedrukking uitvoert." : null;
    task.status = requestedRoute === "EXTERNE_BEDRUKKER" ? "READY_TO_SEND" : "HUMAN_CHECK";
  }
  if (!payload.status) return;
  const requestedStatus = allowedValue(payload.status, ["HUMAN_CHECK", ...TEAMKIT_EXTERNAL_TASK_SEQUENCE], "Taakstatus");
  if (routeChanged && requestedStatus === priorStatus) return;
  if (requestedStatus === task.status) return;
  if (task.route !== "EXTERNE_BEDRUKKER" || task.kind !== "EXTERNAL_SUPPLIER") throw Object.assign(new Error("De status van interne productie volgt uitsluitend de gekoppelde WorkspaceOrder."), { statusCode: 409, code: "TEAMKIT_FULFILLMENT_STATUS_MANAGED" });
  const currentIndex = TEAMKIT_EXTERNAL_TASK_SEQUENCE.indexOf(task.status);
  if (currentIndex < 0 || TEAMKIT_EXTERNAL_TASK_SEQUENCE[currentIndex + 1] !== requestedStatus) throw Object.assign(new Error("Kies uitsluitend de volgende geldige afhandelstap; overslaan of terugzetten is geblokkeerd."), { statusCode: 409, code: "TEAMKIT_FULFILLMENT_TRANSITION_INVALID" });
  if (requestedStatus === "SENT" && !String(payload.supplierName ?? task.supplierName ?? "").trim()) throw Object.assign(new Error("Leg eerst vast naar welke externe bedrukker dit gaat."), { statusCode: 409, code: "TEAMKIT_SUPPLIER_REQUIRED" });
  task.status = requestedStatus;
}

function assertProductionAssetContexts(state, productionLines, order) {
  for (const line of productionLines.filter(({ source }) => source.kind === "PRODUCTION_ELEMENT")) {
    const asset = state.productionElements.find(({ id }) => id === line.source.id); if (!asset) continue;
    // Transfers are deliberately blocked by production readiness and never become
    // plot geometry. Context isolation is consequential for sources that can
    // actually enter the self-produced SVG/PlotJob route.
    if (asset.productionMethod !== "SELF_PRODUCED") continue;
    const item = order?.items?.find(({ id }) => id === line.itemId);
    const association = item ? state.associations.find(({ id, name }) => id === item.association || name === item.association) : null;
    const decision = productionAssetContextDecision({
      asset,
      orderKind: order?.orderKind,
      associationIdentities: [item?.association, association?.id, association?.name].filter(Boolean),
      articleIdentities: [item?.id, item?.articleId, item?.articleNumber].filter(Boolean),
      orderId: order?.id,
    });
    if (!decision.allowed) throw Object.assign(new Error(decision.reason), { statusCode: 409, code: decision.code });
  }
}

function createWorkspaceOrderRecord(state, user, payload, options = {}) {
  const referenceSeries = options.referenceSeries === "TK" ? "TK" : "SP";
  const sequenceKey = referenceSeries === "TK" ? "nextTeamkitOrderSequence" : "nextOrderSequence";
  const sequence = Number(state[sequenceKey]);
  if (!Number.isInteger(sequence) || sequence < 1) throw Object.assign(new Error("De ordernummerreeks is ongeldig."), { statusCode: 409, code: "ORDER_SEQUENCE_INVALID" });
  state[sequenceKey] += 1;
  const id = `${referenceSeries}-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`;
  const orderKind = ["INDIVIDUAL", "TEAM", "CUSTOM"].includes(payload.orderKind) ? payload.orderKind : "LEGACY";
  const strictPilotContract = ["INDIVIDUAL", "TEAM"].includes(orderKind);
  let productionLines = validateProductionLines(payload.productionLines ?? [], state, user, orderKind, { allowTeamkitDataGaps: referenceSeries === "TK" });
  const standardPersonalization = validatePersonalization(payload.standardPersonalization ?? {}, { requireBackNumberSizeClass: false });
  const items = validateItems(payload.items, state, standardPersonalization, { requireBackNumberSizeClass: strictPilotContract, defaultAssociation: payload.association, freeProduction: orderKind === "CUSTOM" && productionLines.length > 0, optionalAssociation: orderKind === "TEAM", maximumQuantity: referenceSeries === "TK" ? 10_000 : orderKind === "TEAM" ? 999 : 99 });
  if (orderKind === "TEAM") items.forEach((item, index) => {
    if (!String(payload.items?.[index]?.size ?? "").trim()) item.size = "";
    item.variants?.forEach((variant, variantIndex) => { if (!String(payload.items?.[index]?.variants?.[variantIndex]?.size ?? "").trim()) variant.size = ""; });
  });
  if (["TEAM", "CUSTOM"].includes(orderKind) && items.length === 1) productionLines = productionLines.map((line) => {
    const item = items[0];
    const foilColor = line.foilColor ?? item.foilColor;
    const existingIdentity = line.decorationIdentity ?? {};
    const sourceAsset = line.source?.kind === "PRODUCTION_ELEMENT" ? state.productionElements.find(({ id }) => id === line.source.id) : null;
    const visualApplications = [...new Set((sourceAsset?.applications ?? []).map(({ kind }) => String(kind).toUpperCase()).filter((kind) => ["LOGO", "SPONSOR", "ARTWORK"].includes(kind)))];
    const inferredVisualDecoration = visualApplications.length === 1 ? visualApplications[0].toLowerCase() : null;
    const decorationType = line.personalizationField ?? existingIdentity.decorationType ?? inferredVisualDecoration ?? line.type;
    return {
      ...line,
      orderId: id,
      itemId: item.id,
      decorationIdentity: {
        ...existingIdentity,
        orderId: id,
        itemId: item.id,
        articleNumber: existingIdentity.articleNumber || item.articleNumber || item.id,
        decorationType,
        placement: existingIdentity.placement || line.personalizationField || line.teamkitProductionContext?.preset || line.type,
        value: line.content,
        foilColor,
        productionProfileId: existingIdentity.productionProfileId || item.productionProfileId || line.source.id,
      },
    };
  });
  if (orderKind === "CUSTOM") for (const item of items) {
    const colors = canonicalOrderFoilColors({ items: [], productionLines: productionLines.filter(({ itemId }) => itemId === item.id) });
    if (colors.length) item.foilColor = colors.length === 1 ? colors[0] : "Meerdere kleuren";
  }
  const associations = [...new Set(items.map(({ association }) => association).filter((association) => association && association !== "Geen vereniging"))];
  assertProductionAssetContexts(state, productionLines, { id, orderKind, items });
  if (orderKind === "INDIVIDUAL" && !productionLines.length) productionLines = deriveCatalogProductionLines(state, id, items);
  applyProductionReadiness(items, productionLines);
  const teamContext = orderKind === "TEAM" ? requiredText(payload.teamContext || payload.customer || (associations.length === 1 ? associations[0] : "Teamorder"), "Team / opdrachtgever / omschrijving", 120) : null;
  const teamCustomerFallback = teamContext ? `Teamorder · ${teamContext}` : associations.length === 1 ? `Teamorder · ${associations[0]}` : "Teamorder";
  const createdAt = iso();
  const note = String(payload.internalNote ?? "").trim();
  const priority = validatePriority(payload.priority, user, createdAt);
  const requestedSalesNumber = String(payload.salesNumber ?? user.salesNumber ?? "").trim() || null;
  const salesEmployee = requestedSalesNumber ? state.employees.find((candidate) => candidate.active && candidate.salesNumber === requestedSalesNumber) : null;
  if (requestedSalesNumber && !salesEmployee) throw Object.assign(new Error("Dit verkoopnummer is niet gekoppeld aan een actieve werknemer."), { statusCode: 400, code: "SALES_ATTRIBUTION_INVALID" });
  const source = allowedValue(payload.source ?? "STORE", ["STORE", "WEBSHOP_XPRT", "TEAM_MAIL", "INVOICE", "MANUAL"], "Orderbron");
  const sourceContext = {
    source,
    label: ({ STORE: "Winkel", WEBSHOP_XPRT: "Webshop · ACA XPRT", TEAM_MAIL: "Team-/verenigingsmail", INVOICE: "Factuur", MANUAL: "Handmatig" })[source],
    externalReference: String(payload.externalReference ?? "").trim() || null,
    provenance: source === "STORE" ? "Handmatig vastgelegd in Sportpaleis Workspace" : requiredText(payload.provenance, "Bronverwijzing", 400),
    transactionalAuthority: source === "WEBSHOP_XPRT" ? "ACA_XPRT" : source === "STORE" || source === "MANUAL" ? "WORKSPACE" : "EXTERNAL",
  };
  const fulfillmentMode = allowedValue(payload.deliveryMode ?? "PICKUP", ["PICKUP", "DELIVERY"], "Leverwijze");
  const deliveryAddress = validDeliveryAddress(payload.deliveryAddress, fulfillmentMode);
  const teamkitContext = options.teamkitContext ? structuredClone(options.teamkitContext) : null;
  const order = {
    id,
    referenceSeries,
    ...(teamkitContext ? { teamkitContext } : {}),
    revision: 1,
    customer: orderKind === "TEAM" ? String(payload.customer ?? "").trim().slice(0, 120) || teamCustomerFallback : orderKind === "CUSTOM" ? String(payload.customer ?? "").trim().slice(0, 120) || "Vrije productieopdracht" : requiredText(payload.customer, "Klant", 120),
    customerEmail: optionalEmail(payload.customerEmail),
    customerPhone: String(payload.customerPhone ?? "").trim().slice(0, 40),
    association: associations.length === 1 ? associations[0] : associations.length > 1 ? "Meerdere verenigingen" : "Geen vereniging",
    associations,
    standardPersonalization,
    commercialPriceTruth: catalogCommercialPriceTruth(state, items),
    createdAt,
    updatedAt: createdAt,
    promisedAt: payload.promisedAt ? validDate(payload.promisedAt) : null,
    stage: "ORDER",
    owner: user.name,
    acceptedBy: { userId: user.id, name: user.name, salesNumber: user.salesNumber ?? null, at: createdAt },
    salesAttribution: { employeeId: salesEmployee?.id ?? null, salesNumber: requestedSalesNumber, label: salesEmployee?.name ?? "Niet gekoppeld", accountType: salesEmployee?.accountType ?? (salesEmployee ? "HUMAN" : "UNASSIGNED"), selectedByUserId: user.id, selectedAt: createdAt },
    sourceContext,
    orderKind,
    ...(teamContext ? { teamContext } : {}),
    communication: { requiredForIndividualOrder: orderKind === "INDIVIDUAL" && source !== "WEBSHOP_XPRT", processingDaysSnapshot: Number(state.settings.processingDays), receipt: { status: "NOT_SENT", updatedAt: createdAt }, production: { status: "NOT_SENT", updatedAt: createdAt }, ready: { status: "NOT_SENT", updatedAt: createdAt } },
    notes: note ? [{ id: `note-${randomBytes(6).toString("hex")}`, scope: "order", kind: payload.noteKind === "attention" || payload.noteAttention ? "attention" : "internal", text: requiredText(note, "Opmerking", 600), authorId: user.id, authorName: user.name, createdAt }] : [],
    priority,
    attention: priority ? `Prioriteitsuitzondering: ${priority.reasonLabel}` : (payload.noteKind === "attention" || payload.noteAttention) && note ? note : productionAttentionText(items),
    barcode: { value: `SPW:${id}`, featureEnabled: false, hardwareValidated: false },
    pickup: { status: "NOT_PICKED_UP", pickedUpAt: null, pickedUpBy: null },
    payment: { status: "UNKNOWN", updatedAt: null, updatedBy: null, source: source === "WEBSHOP_XPRT" ? "ACA_XPRT" : "UNKNOWN" },
    fulfillment: { mode: fulfillmentMode, status: "PENDING", updatedAt: null, updatedBy: null, feeEur: fulfillmentMode === "DELIVERY" ? state.settings.deliveryFeeEur : 0, address: deliveryAddress },
    operationalFacts: {},
    eventHistory: [{ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_CREATED", at: createdAt, userId: user.id, userName: user.name, source: "button" }],
    totalPieces: items.reduce((sum, item) => sum + item.quantity, 0),
    foilStates: canonicalOrderFoilColors({ items, productionLines }).map((color) => ({ color, status: color.toLowerCase() === "rood" ? "HOLD" : "READY" })),
    items,
    productionLines,
  };
  assertOrderProductionDecorationCardinality(state, order);
  if (teamkitContext) order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "TEAMKIT_APPROVED_ORDER_CREATED", at: createdAt, userId: user.id, userName: user.name, source: "human-go", details: { ...teamkitContext } });
  const automaticValidationBlocker = productionProposalBlockReason({ ...order, stage: "CONTROL" }, state);
  if (!automaticValidationBlocker) order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_VALIDATED", at: createdAt, userId: user.id, userName: user.name, source: "automatic-validation" });
  else if (!order.attention) order.attention = automaticValidationBlocker;
  state.orders.unshift(order);
  audit(state, user.id, teamkitContext ? "Teamkit-productiereferentie aangemaakt" : "Order aangemaakt", id, { revision: 1, referenceSeries, automaticValidation: automaticValidationBlocker ? "ATTENTION" : "PASSED", ...(automaticValidationBlocker ? { reason: automaticValidationBlocker } : {}), ...(teamkitContext ? { teamkitContext } : {}) });
  return order;
}

function normalizedTeamkitSizingItems(revision, inputItems, { allowLegacyTotals = false } = {}) {
  const supplied = new Map((Array.isArray(inputItems) ? inputItems : []).map((item) => [String(item?.itemId ?? ""), item]));
  if (!Array.isArray(inputItems) || inputItems.length !== revision.snapshot.items.length || supplied.size !== revision.snapshot.items.length || revision.snapshot.items.some(({ id }) => !supplied.has(id))) throw Object.assign(new Error("Vul maten en aantallen in voor ieder artikel uit de approved compositie."), { statusCode: 409, code: "TEAMKIT_PRODUCTION_SIZING_INCOMPLETE" });
  return revision.snapshot.items.map((item) => {
    const input = supplied.get(item.id); const seen = new Set(); const sizeQuantities = [];
    for (const row of Array.isArray(input?.sizeQuantities) ? input.sizeQuantities : []) {
      const size = requiredText(row?.size, `${item.productName} maat`, 40); const key = size.toLocaleLowerCase("nl-NL"); const quantity = Number(row?.quantity);
      if (seen.has(key) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw Object.assign(new Error(`Controleer de maatverdeling voor ${item.productName}.`), { statusCode: 400, code: "TEAMKIT_SIZE_QUANTITY_INVALID" });
      seen.add(key); sizeQuantities.push({ size, quantity });
    }
    if (sizeQuantities.length) {
      sizeQuantities.sort((left, right) => left.size.localeCompare(right.size, "nl-NL", { numeric: true, sensitivity: "base" }));
      return { itemId: item.id, quantity: sizeQuantities.reduce((sum, { quantity }) => sum + quantity, 0), sizes: sizeQuantities.map(({ size }) => size), sizeQuantities, allocationMode: "PER_SIZE" };
    }
    const quantity = Number(input?.quantity); const sizes = [...new Set((Array.isArray(input?.sizes) ? input.sizes : []).map((size) => requiredText(size, `${item.productName} maat`, 40)))];
    if (!allowLegacyTotals || !Number.isInteger(quantity) || quantity < 1 || quantity > 999 || !sizes.length) throw Object.assign(new Error(`Vul voor ${item.productName} per maat een aantal in.`), { statusCode: 409, code: "TEAMKIT_PRODUCTION_SIZING_REQUIRED" });
    return { itemId: item.id, quantity, sizes, sizeQuantities: [], allocationMode: "TOTAL_ACROSS_SELECTED_SIZES" };
  });
}

function createTeamkitProductionSizing(proposal, revision, inputItems, actor, { allowLegacyTotals = false } = {}) {
  const items = normalizedTeamkitSizingItems(revision, inputItems, { allowLegacyTotals });
  const sizingRevision = proposal.productionSizing?.approvedRevision === revision.number ? proposal.productionSizing.revision + 1 : 1;
  const body = { proposalId: proposal.id, approvedRevision: revision.number, revision: sizingRevision, items };
  return { ...body, snapshotHash: proposalSha256(JSON.stringify(body)), updatedAt: iso(), updatedBy: { id: actor.id, name: actor.name, role: actor.role } };
}

function teamkitSizingForItem(proposal, revision, item) {
  if (proposal.productionSizing?.approvedRevision !== revision.number) return null;
  return proposal.productionSizing.items.find(({ itemId }) => itemId === item.id) ?? null;
}

function teamkitEffectiveItem(proposal, revision, item) {
  const sizing = teamkitSizingForItem(proposal, revision, item);
  return sizing ? { ...item, quantity: sizing.quantity, sizes: sizing.sizes } : item;
}

function refreshTeamkitFulfillmentSizing(proposal, revision, state) {
  const freshById = new Map(approvedFulfillmentTasks(proposal, revision, state).map((task) => [task.id, task]));
  for (const task of proposal.fulfillmentTasks.filter(({ approvedRevision }) => approvedRevision === revision.number)) {
    const fresh = freshById.get(task.id); if (!fresh) continue;
    fresh.route = task.route; fresh.kind = task.route === "INTERN_BEDRUKKEN" ? "INTERNAL_PRODUCTION" : task.route === "EXTERNE_BEDRUKKER" ? "EXTERNAL_SUPPLIER" : "ROUTE_DECISION"; fresh.supplierName = task.supplierName;
    const missingAttention = fresh.attention?.startsWith("Controleer ontbrekend:") ? fresh.attention : null;
    fresh.attention = fresh.route === "NOG_TE_BEPALEN" ? "Bepaal wie deze bedrukking uitvoert." : missingAttention;
    fresh.status = fresh.route === "EXTERNE_BEDRUKKER" && !fresh.attention ? "READY_TO_SEND" : "HUMAN_CHECK";
    task.specification = fresh.specification; task.attention = fresh.attention; task.status = fresh.status; task.updatedAt = iso();
  }
}

function teamkitProfileProductionLine(state, proposal, revision, item, placement, task, provenance) {
  const field = ({ NAME: "name", INITIALS: "initials", BACK_NUMBER: "backNumber", CHEST_NUMBER: "chestNumber", SHORT_NUMBER: "shortsNumber" })[placement.kind];
  if (!field) return null;
  const article = state.articles.find(({ id, active }) => id === item.articleId && active);
  const association = article ? state.associations.find(({ name }) => name === article.association) : null;
  const resolution = article ? canonicalProductionProfileForDecoration(state, {
    articleNumber: article.articleNumber,
    association: association?.name ?? article.association,
    productionProfileId: article.profileId,
  }, field) : null;
  const profile = resolution?.profile ?? null;
  const proposalAssociationMatches = !revision.snapshot.association.name || association?.name === revision.snapshot.association.name;
  const applicable = Boolean(article && association && profile && proposalAssociationMatches && article.supports?.includes(field) && profile.supports?.includes(resolution.productionField));
  const override = placement.physicalSizeOverride ?? null;
  let backNumberProduction = null;
  if (applicable && field === "backNumber") {
    const classes = [...new Set((item.sizes ?? []).map((size) => inferBackNumberSizeClass(association, article, size)).filter(Boolean))];
    if (classes.length === 1) backNumberProduction = resolveBackNumberProductionContext(association, profile, classes[0], item.sizes[0]);
  }
  const dimensionKey = ({ initials: "initialsShirt", name: "nameHeight", chestNumber: "chestNumber", shortsNumber: "shortsNumber" })[field];
  const associationHeightMm = dimensionKey ? Number(association?.dimensionsCm?.[dimensionKey]) * 10 : 0;
  const profileHeightMm = Number(String(profile?.sizeLabel ?? "").match(/([\d,.]+)\s*cm/iu)?.[1]?.replace(",", ".")) * 10;
  const resolvedHeightMm = field === "backNumber" ? Number(backNumberProduction?.physicalHeightMm) : associationHeightMm > 0 ? associationHeightMm : profileHeightMm > 0 ? profileHeightMm : 0;
  const productionGroupId = String(item.productionGroupId ?? "all");
  const variant = {
    id: `${placement.id}:${productionGroupId}`,
    quantity: item.quantity,
    personalizationValues: { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: backNumberProduction?.sizeClass ?? "", shortsNumber: "", [field]: placement.text },
    backNumberProduction,
  };
  const derived = applicable ? resolveCanonicalProductionLines(state, `teamkit-resolver:${proposal.id}:${revision.number}`, [{ id: item.id, articleNumber: article.articleNumber, association: association.name, productionProfileId: article.profileId, foilColor: effectiveCatalogFoilColor(article, association, profile), sourceProvenance: provenance, variants: [variant] }]).find(({ personalizationField }) => personalizationField === field) : null;
  const textualShortNumber = field === "shortsNumber" && !/^\d{1,4}$/u.test(String(placement.text ?? "").trim());
  const textualShortFont = textualShortNumber && profile ? configuredManagedFont(state, profile) : null;
  const fields = [];
  if (!applicable || (!textualShortFont && (!derived || derived.validation.status !== "VALID"))) fields.push("SOURCE");
  if (!override && !(resolvedHeightMm > 0)) fields.push("DIMENSIONS");
  const visualFoilOverride = managedFoilColorFromStudioValue(state, placement.colorOverride);
  const requestedFoil = applicable ? visualFoilOverride ?? effectiveCatalogFoilColor(article, association, profile) : "";
  const foilColor = requestedFoil ? managedFoilColor(state, requestedFoil) : null;
  if (!foilColor || Boolean(placement.colorOverride && !visualFoilOverride)) fields.push("FOIL_COLOR");
  const widthMm = Number(override?.widthMm ?? (resolvedHeightMm > 0 && derived?.heightMm > 0 ? derived.widthMm * resolvedHeightMm / derived.heightMm : derived?.widthMm ?? 0));
  const heightMm = Number(override?.heightMm ?? resolvedHeightMm);
  const measurementSource = override ? "EXPLICIT_PROPOSAL_OVERRIDE" : resolvedHeightMm > 0 ? "PRODUCTION_PROFILE" : "DATA_GAP";
  const measurementEvidence = override
    ? `${proposal.proposalNumber} V${revision.number} · expliciete goedgekeurde maatoverride`
    : field === "backNumber" && backNumberProduction
      ? `${backNumberProduction.source} · ${backNumberProduction.sizeClass}`
      : associationHeightMm > 0
        ? `${association.source.file} · ${association.source.sheet}!${association.source.range} · ${dimensionKey}`
        : profileHeightMm > 0
          ? `Productieprofiel ${profile.id}@${profile.revision ?? 1} · ${profile.sizeLabel}`
          : "Geen toepasselijke server-authoritative productiemaat gevonden";
  const context = { proposalPlacementId: placement.id, side: placement.side, preset: placement.preset, articleId: article?.id ?? null, associationName: association?.name ?? null, profileId: profile?.id ?? null, profileRevision: profile?.revision ?? null, fontProfile: profile?.fontProfile ?? null, sizeLabel: profile?.sizeLabel ?? null, mirror: profile?.mirror ?? null, productionGroupId, productionSizeClass: backNumberProduction?.sizeClass ?? null, deferredBySizing: field === "backNumber" && !(item.sizes ?? []).length, measurementSource, measurementEvidence, explicitOverride: override };
  const canonicalType = textualShortNumber
    ? "TEXT"
    : derived?.type ?? ({ NAME: "TEXT", INITIALS: "INITIALS", BACK_NUMBER: "NUMBER", CHEST_NUMBER: "NUMBER", SHORT_NUMBER: "NUMBER" })[placement.kind];
  const base = {
    id: `teamkit-line-${proposal.id}-${revision.number}-${item.id}-${placement.id}-${productionGroupId}`.replace(/[^a-zA-Z0-9_-]/gu, "-"),
    type: canonicalType,
    content: String(placement.text ?? placement.label).trim(),
    sourceId: textualShortFont?.id ?? derived?.source?.id ?? profile?.id ?? null,
    sourceVersion: textualShortFont?.version ?? derived?.source?.version ?? String(profile?.revision ?? "unresolved"),
    sourceSha256: textualShortFont?.sha256 ?? derived?.source?.sha256,
    widthMm: Math.round(widthMm * 1000) / 1000,
    heightMm: Math.round(heightMm * 1000) / 1000,
    foilColor: foilColor ?? undefined,
    quantity: item.quantity,
    personalizationField: field,
    decorationIdentity: {
      orderId: `teamkit:${proposal.id}:${revision.number}`,
      itemId: item.id,
      articleNumber: article?.articleNumber ?? item.articleNumber ?? item.id,
      decorationType: field,
      placement: placement.preset,
      value: String(placement.text ?? placement.label).trim(),
      foilColor: foilColor ?? (requestedFoil || "Onbekend"),
      productionProfileId: profile?.id ?? "profile-data-gap",
      assetId: textualShortFont?.id ?? derived?.source?.id ?? null,
      assetVersion: textualShortFont?.version ?? derived?.source?.version ?? null,
      targetGroup: productionGroupId,
    },
    previewLabel: placement.label,
    provenance: `${provenance} · maatbron ${measurementEvidence}${override ? ` · override ${override.widthMm}×${override.heightMm} mm` : ""}`,
    teamkitProductionContext: context,
  };
  if (!fields.length) return base;
  const labels = { SOURCE: "toepasselijke productierijpe profiel-/contourbron", DIMENSIONS: "productieprofiel/default of expliciete fysieke maatoverride", FOIL_COLOR: "beheerde foliekleur" };
  return { ...base, dataGap: { fields: [...new Set(fields)], reason: `Controle nodig: ${[...new Set(fields)].map((entry) => labels[entry]).join(", ")} ontbreekt.` } };
}

function teamkitProductionLine(state, proposal, revision, item, placement, task) {
  const type = ({ CLUB_LOGO: "LOGO", SPONSOR: "LOGO", NAME: "TEXT", INITIALS: "INITIALS", BACK_NUMBER: "NUMBER", CHEST_NUMBER: "NUMBER", SHORT_NUMBER: /^\d{1,4}$/u.test(String(placement.text ?? "").trim()) ? "NUMBER" : "TEXT", FREE_TEXT: "TEXT" })[placement.kind] ?? "PRODUCTION_ELEMENT";
  const provenance = `${proposal.proposalNumber} V${revision.number} · item ${item.id} · placement ${placement.id} · task ${task.id} · asset ${task.assetRef.productionAssetId ?? task.assetRef.sourceId ?? "ontbreekt"}@${task.assetRef.version ?? "onbekend"}#${task.assetRef.sha256 ?? "onbekend"}`;
  const profileLine = teamkitProfileProductionLine(state, proposal, revision, item, placement, task, provenance);
  if (profileLine) return profileLine;
  const asset = state.productionElements.find(({ id }) => id === task.assetRef.productionAssetId);
  const actualAssetHash = asset?.sourceLayers?.physicallyProvenContour?.sha256 ?? asset?.sourceLayers?.validatedCutContour?.sha256 ?? asset?.sourceLayers?.vectorSource?.sha256 ?? null;
  const expectedProductionAsset = task.assetRef.productionAsset ?? (task.assetRef.productionAssetId ? { id: task.assetRef.productionAssetId, version: task.assetRef.version, sha256: task.assetRef.sha256 } : null);
  const sourceMatches = Boolean(asset
    && asset.lifecycleStatus === "PRODUCTION_READY"
    && asset.productionMethod === "SELF_PRODUCED"
    && (!expectedProductionAsset?.version || expectedProductionAsset.version === asset.version)
    && (!expectedProductionAsset?.sha256 || expectedProductionAsset.sha256 === actualAssetHash));
  const override = placement.physicalSizeOverride ?? null;
  const widthMm = Number(override?.widthMm ?? asset?.sizePolicy?.defaultWidthMm ?? asset?.variants?.find(({ widthMm: width, heightMm: height }) => Number(width) > 0 && Number(height) > 0)?.widthMm ?? 0);
  const heightMm = Number(override?.heightMm ?? asset?.sizePolicy?.defaultHeightMm ?? asset?.variants?.find(({ widthMm: width, heightMm: height }) => Number(width) > 0 && Number(height) > 0)?.heightMm ?? 0);
  const association = state.associations.find(({ id, name }) => id === revision.snapshot.association.id || name === revision.snapshot.association.name);
  const visualFoilOverride = managedFoilColorFromStudioValue(state, placement.colorOverride);
  const requestedFoil = String(visualFoilOverride ?? asset?.defaultFoilColor ?? association?.defaultFoilColor ?? "").trim();
  const foilColor = requestedFoil ? managedFoilColor(state, requestedFoil) : null;
  const fields = [];
  if (!sourceMatches) fields.push("SOURCE");
  if (!(widthMm > 0) || !(heightMm > 0)) fields.push("DIMENSIONS");
  if (!foilColor || Boolean(placement.colorOverride && !visualFoilOverride)) fields.push("FOIL_COLOR");
  const content = String(placement.text ?? asset?.name ?? placement.label).trim();
  const measurementEvidence = override ? `${proposal.proposalNumber} V${revision.number} · expliciete goedgekeurde maatoverride` : asset ? `Production Asset ${asset.id}@${asset.version ?? asset.revision}` : "Geen toepasselijke productiemaat gevonden";
  const productionGroupId = String(item.productionGroupId ?? "all");
  const base = { id: `teamkit-line-${proposal.id}-${revision.number}-${item.id}-${placement.id}-${productionGroupId}`.replace(/[^a-zA-Z0-9_-]/gu, "-"), type, content, sourceId: asset?.id ?? task.assetRef.sourceId ?? null, sourceVersion: task.assetRef.version ?? asset?.version ?? null, sourceSha256: task.assetRef.sha256 ?? undefined, widthMm, heightMm, foilColor: foilColor ?? undefined, quantity: item.quantity, previewLabel: placement.label, provenance: `${provenance} · voorstelbron ${task.assetRef.proposalSource?.id ?? "niet van toepassing"} · productiebron ${expectedProductionAsset?.id ?? "ontbreekt"} · maatbron ${measurementEvidence}${override ? ` · override ${override.widthMm}×${override.heightMm} mm` : ""}`, decorationIdentity: { orderId: `teamkit:${proposal.id}:${revision.number}`, itemId: item.id, articleNumber: item.articleNumber ?? item.id, decorationType: placement.kind, placement: placement.preset, value: content, foilColor: foilColor ?? (requestedFoil || "Onbekend"), productionProfileId: asset?.id ?? "production-asset-data-gap", assetId: asset?.id ?? null, assetVersion: asset?.version ?? null, targetGroup: productionGroupId }, teamkitProductionContext: { proposalPlacementId: placement.id, side: placement.side, preset: placement.preset, articleId: item.articleId ?? null, associationName: association?.name ?? revision.snapshot.association.name ?? null, profileId: null, profileRevision: null, fontProfile: null, sizeLabel: widthMm > 0 && heightMm > 0 ? `${Math.round(widthMm * 1000) / 1000}×${Math.round(heightMm * 1000) / 1000} mm` : null, mirror: null, productionGroupId, productionSizeClass: null, measurementSource: override ? "EXPLICIT_PROPOSAL_OVERRIDE" : asset ? "PRODUCTION_ASSET" : "DATA_GAP", measurementEvidence, explicitOverride: override } };
  if (!fields.length) return base;
  const labels = { SOURCE: "goedgekeurde productiebron", DIMENSIONS: "fysieke maat in millimeters", FOIL_COLOR: "beheerde foliekleur" };
  const reason = `Controle nodig: ${fields.map((field) => labels[field]).join(", ")} ontbreekt of wijkt af van de goedgekeurde bron.`;
  return { ...base, sourceVersion: task.assetRef.version ?? "unresolved", sourceSha256: task.assetRef.sha256 ?? undefined, dataGap: { fields, reason } };
}

function teamkitPlacementRuleFromLine(line) {
  const context = line.teamkitProductionContext ?? {};
  const body = {
    resolverVersion: CANONICAL_PRODUCTION_RESOLVER_VERSION,
    status: line.dataGap ? "REVIEW_REQUIRED" : "RESOLVED",
    resolver: context.profileId ? "ARTICLE_PROFILE" : context.measurementSource === "PRODUCTION_ASSET" ? "PRODUCTION_ASSET" : "UNRESOLVED",
    articleId: context.articleId ?? null,
    associationName: context.associationName ?? null,
    profileId: context.profileId ?? null,
    profileRevision: context.profileRevision ?? null,
    fontProfile: context.fontProfile ?? null,
    foilColor: line.foilColor ?? null,
    sizeLabel: context.sizeLabel ?? null,
    physicalWidthMm: Number(line.widthMm) > 0 ? Number(line.widthMm) : null,
    physicalHeightMm: Number(line.heightMm) > 0 ? Number(line.heightMm) : null,
    mirror: context.mirror ?? null,
    measurementSource: context.measurementSource ?? "DATA_GAP",
    sourceId: line.sourceId ?? line.source?.id ?? null,
    sourceVersion: line.sourceVersion ?? line.source?.version ?? null,
    sourceSha256: line.sourceSha256 ?? line.source?.sha256 ?? null,
    reason: line.dataGap?.reason ?? null,
    deferredMaterialization: context.deferredBySizing ? ["PRODUCTION_SIZE_CLASS"] : [],
  };
  const intentBody = {
    resolverVersion: body.resolverVersion,
    articleId: body.articleId,
    associationName: body.associationName,
    profileId: body.profileId,
    profileRevision: body.profileRevision,
    fontProfile: body.fontProfile,
    foilColor: body.foilColor,
    mirror: body.mirror,
    placement: context.preset ?? null,
    sourceRole: body.resolver,
    sourceId: body.sourceId,
    sourceVersion: body.sourceVersion,
  };
  const rule = { ...body, intentRuleHash: proposalSha256(JSON.stringify(intentBody)) };
  return { ...rule, ruleHash: proposalSha256(JSON.stringify(rule)) };
}

function teamkitPlacementTask(proposal, state, placement) {
  const source = proposal.sources.find(({ id }) => id === placement.sourceId);
  const asset = state.productionElements.find(({ id }) => id === placement.productionAssetId);
  const productionAssetSha256 = asset?.sourceLayers?.physicallyProvenContour?.sha256
    ?? asset?.sourceLayers?.validatedCutContour?.sha256
    ?? asset?.sourceLayers?.vectorSource?.sha256
    ?? null;
  return {
    id: `proposal-rule-${placement.id}`,
    assetRef: {
      sourceId: source?.id ?? null,
      productionAssetId: asset?.id ?? null,
      version: asset?.version ?? placement.assetVersion ?? null,
      sha256: productionAssetSha256,
      proposalSource: source ? { id: source.id, version: String(source.version), sha256: source.sha256, role: "PROPOSAL_EVIDENCE" } : null,
      productionAsset: asset ? { id: asset.id, version: asset.version ?? String(asset.revision), sha256: productionAssetSha256, role: "PRODUCTION_READY" } : null,
    },
  };
}

function resolveTeamkitPlacementProductionRules(state, proposal, revisionNumber) {
  const revision = { number: revisionNumber, snapshot: { association: structuredClone(proposal.association) } };
  for (const item of proposal.items) for (const placement of item.placements) {
    const line = teamkitProductionLine(state, proposal, revision, { ...item, sizes: [] }, placement, teamkitPlacementTask(proposal, state, placement));
    placement.productionRule = teamkitPlacementRuleFromLine(line);
  }
}

function enforceApprovedTeamkitPlacementRule(line, placement) {
  const current = teamkitPlacementRuleFromLine(line); const approved = placement.productionRule;
  const traced = { ...line, teamkitProductionContext: { ...line.teamkitProductionContext, approvedProductionRuleHash: approved?.ruleHash ?? null, approvedProductionIntentHash: approved?.intentRuleHash ?? null, currentProductionRuleHash: current.ruleHash, currentProductionIntentHash: current.intentRuleHash } };
  if (approved?.ruleHash === current.ruleHash) return traced;
  const sizingWasIntentionallyDeferred = approved?.status === "REVIEW_REQUIRED"
    && approved?.deferredMaterialization?.includes("PRODUCTION_SIZE_CLASS")
    && approved?.intentRuleHash === current.intentRuleHash
    && current.status === "RESOLVED";
  if (sizingWasIntentionallyDeferred) return traced;
  const fields = [...new Set([...(line.dataGap?.fields ?? []), approved ? "APPROVED_RULE_DRIFT" : "APPROVED_RULE"])];
  const reason = approved
    ? approved.status === "REVIEW_REQUIRED"
      ? approved.reason ?? "De approved Teamwear-compositie bevat nog een productiecontrole."
      : "Productieprofiel, lettertype, foliekleur, maat of bron wijkt af van de approved Teamwear-compositie."
    : "De approved Teamwear-compositie bevat geen immutable productie-instelling.";
  return { ...traced, dataGap: { fields, reason } };
}

function teamkitPhysicalMaterializationItems(proposal, revision, item) {
  const sizing = teamkitSizingForItem(proposal, revision, item);
  if (!sizing) return [];
  if (sizing.allocationMode !== "PER_SIZE" || !sizing.sizeQuantities.length) return [{ ...item, quantity: sizing.quantity, sizes: sizing.sizes, productionGroupId: "all" }];
  return sizing.sizeQuantities.map(({ size, quantity }) => ({
    ...item,
    quantity,
    sizes: [size],
    productionGroupId: `size-${String(size).normalize("NFKC").toLocaleLowerCase("nl-NL").replace(/[^a-z0-9_-]/gu, "-")}`,
  }));
}

function groupCanonicalTeamkitProductionLines(lines) {
  const grouped = new Map();
  for (const line of lines) {
    const identity = line.decorationIdentity ?? {};
    const key = JSON.stringify([
      line.type, line.personalizationField ?? null, identity.articleNumber ?? null,
      identity.decorationType ?? null, identity.placement ?? null, identity.value ?? line.content,
      identity.foilColor ?? line.foilColor ?? null, identity.productionProfileId ?? null,
      line.sourceId ?? null, line.sourceVersion ?? null, line.sourceSha256 ?? null,
      line.widthMm, line.heightMm, line.teamkitProductionContext?.productionSizeClass ?? null,
      line.dataGap?.fields ?? null, line.dataGap?.reason ?? null,
    ]);
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += line.quantity;
      existing.teamkitProductionContext.materializationGroups.push(line.teamkitProductionContext?.productionGroupId ?? "all");
      existing.decorationIdentity.targetGroup = existing.teamkitProductionContext.materializationGroups.join("+");
    } else {
      grouped.set(key, {
        ...line,
        teamkitProductionContext: { ...line.teamkitProductionContext, materializationGroups: [line.teamkitProductionContext?.productionGroupId ?? "all"] },
      });
    }
  }
  return [...grouped.values()];
}

function teamkitOrderInput(state, proposal, revision, approvedItem, tasks) {
  const sizing = teamkitSizingForItem(proposal, revision, approvedItem);
  if (!sizing) throw Object.assign(new Error(`Vul voor ${approvedItem.productName} eerst de maten en aantallen in.`), { statusCode: 409, code: "TEAMKIT_PRODUCTION_SIZING_REQUIRED" });
  const item = teamkitEffectiveItem(proposal, revision, approvedItem);
  if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) throw Object.assign(new Error(`Vul voor ${item.productName} eerst een uitvoerbaar aantal van 1–999 in.`), { statusCode: 409, code: "TEAMKIT_ITEM_QUANTITY_REQUIRED" });
  const placements = tasks.map((task) => {
    const placement = item.placements.find(({ id }) => id === task.placementId);
    if (!placement) throw Object.assign(new Error("Een interne afhandelingstaak mist de immutable placement."), { statusCode: 409, code: "TEAMKIT_PLACEMENT_NOT_FOUND" });
    return { placement, task };
  });
  const physicalItems = teamkitPhysicalMaterializationItems(proposal, revision, approvedItem);
  const canonicalArticleNumber = item.articleNumber ?? item.catalogSnapshot?.supplierArticleNumber ?? item.id;
  const productionLines = groupCanonicalTeamkitProductionLines(physicalItems.flatMap((physicalItem) => placements.map(({ placement, task }) => {
    const line = enforceApprovedTeamkitPlacementRule(teamkitProductionLine(state, proposal, revision, physicalItem, placement, task), placement);
    return line.decorationIdentity ? { ...line, decorationIdentity: { ...line.decorationIdentity, articleNumber: canonicalArticleNumber } } : line;
  })));
  const association = state.associations.find(({ id, name }) => id === revision.snapshot.association.id || name === revision.snapshot.association.name);
  const printableSummary = placements.map(({ placement }) => `${placement.label}${placement.text ? `: ${placement.text}` : ""}`).join(" · ");
  const teamLabel = [revision.snapshot.association.name, item.team ?? revision.snapshot.team, item.productName].filter(Boolean).join(" · ").slice(0, 120);
  return {
    orderKind: "TEAM",
    teamContext: teamLabel || `${proposal.proposalNumber} · ${item.productName}`,
    customer: revision.snapshot.customer.name,
    customerEmail: revision.snapshot.customer.email,
    customerPhone: revision.snapshot.customer.phone ?? "",
    standardPersonalization: { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" },
    source: "MANUAL",
    externalReference: `${proposal.proposalNumber}/V${revision.number}/${item.articleNumber ?? item.id}`,
    provenance: `Immutable Teamkit approval ${proposal.proposalNumber} V${revision.number} · snapshot ${revision.snapshotHash} · PDF ${proposal.approval.pdfSha256}`,
    internalNote: `Klantakkoord ${proposal.proposalNumber} · V${revision.number}. Productie alleen via bestaande Human GO.`,
    items: [{ product: item.productName, articleId: item.articleId ?? undefined, articleNumber: canonicalArticleNumber, ...(association ? { association: association.name } : {}), size: sizing.allocationMode === "PER_SIZE" ? "" : sizing.sizes.join(", "), quantity: item.quantity, ...(sizing.allocationMode === "PER_SIZE" ? { variants: sizing.sizeQuantities.map(({ size, quantity }) => ({ size, quantity, deviation: true, overrides: { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" } })) } : {}), personalization: printableSummary || "Approved Teamkit-bedrukking", foilColor: productionLines.find(({ foilColor }) => foilColor)?.foilColor ?? "Onbekend", deviation: true, overrides: { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "" } }],
    productionLines,
  };
}

function parseDelimitedRows(text, delimiter) {
  const rows = []; let row = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(value.trim()); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim()); value = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else value += char;
  }
  row.push(value.trim()); if (row.some(Boolean)) rows.push(row);
  if (quoted) throw Object.assign(new Error("De export bevat een niet-afgesloten aanhalingsteken."), { statusCode: 400, code: "MAILBATCH_EXPORT_INVALID" });
  return rows;
}

const MAILBATCH_HEADER_ALIASES = {
  externalId: ["externalid", "regelid", "orderregelid", "recordid"],
  externalReference: ["externalreference", "ordernummer", "bestelnummer", "orderid"],
  customer: ["customer", "klant", "klantnaam"],
  association: ["association", "vereniging", "club"],
  changes: ["changes", "wijzigingen", "bedrukking", "personalisatie"],
  productionConcept: ["productionconcept", "naarproductie", "productie"],
};

const normalizedHeader = (value) => String(value ?? "").toLocaleLowerCase("nl-NL").normalize("NFD").replace(/[\u0300-\u036f]/gu, "").replace(/[^a-z0-9]/gu, "");

export function parseSportpaleisMailbatchExport(rawText, filename = "mailbatch.csv") {
  const text = String(rawText ?? "").replace(/^\uFEFF/u, "");
  if (!text.trim() || Buffer.byteLength(text, "utf8") > 1_000_000) throw Object.assign(new Error("De Mailbatch-export is leeg of groter dan 1 MB."), { statusCode: 400, code: "MAILBATCH_EXPORT_INVALID" });
  const firstLine = text.split(/\r?\n/u).find((line) => line.trim()) ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : (firstLine.split(";").length >= firstLine.split(",").length ? ";" : ",");
  const rows = parseDelimitedRows(text, delimiter);
  if (rows.length < 2) throw Object.assign(new Error("De Mailbatch-export bevat geen gegevensregels."), { statusCode: 400, code: "MAILBATCH_EXPORT_INVALID" });
  const headers = rows[0].map(normalizedHeader);
  const indexes = Object.fromEntries(Object.entries(MAILBATCH_HEADER_ALIASES).map(([field, aliases]) => [field, headers.findIndex((header) => aliases.includes(header))]));
  for (const field of ["externalId", "externalReference", "customer"]) if (indexes[field] < 0) {
    throw Object.assign(new Error("De exportkoppen zijn nog niet gekoppeld aan het ACA XPRT Mailbatch-contract."), { statusCode: 400, code: "MAILBATCH_EXPORT_HEADERS_UNKNOWN", headers: rows[0] });
  }
  const cell = (row, field) => indexes[field] < 0 ? "" : String(row[indexes[field]] ?? "").trim();
  const records = rows.slice(1).map((row, index) => {
    const externalId = requiredText(cell(row, "externalId"), `Regel-ID op rij ${index + 2}`, 160);
    const externalReference = requiredText(cell(row, "externalReference"), `Ordernummer op rij ${index + 2}`, 160);
    const customer = requiredText(cell(row, "customer"), `Klant op rij ${index + 2}`, 180);
    const productionValue = cell(row, "productionConcept").toLocaleLowerCase("nl-NL");
    return { externalId, externalReference, customer, association: cell(row, "association") || null, changes: cell(row, "changes").split(/\s*[|]\s*/u).filter(Boolean), productionConcept: ["1", "true", "ja", "yes", "productie"].includes(productionValue) };
  });
  if (new Set(records.map(({ externalId }) => externalId)).size !== records.length) throw Object.assign(new Error("De export bevat dubbele regel-ID's."), { statusCode: 400, code: "MAILBATCH_EXPORT_DUPLICATE_ROW" });
  return { records, input: { filename: requiredText(filename, "Bestandsnaam", 180), format: delimiter === "\t" ? "TSV" : "CSV", sha256: sha256(text), rowCount: records.length, sourceStatus: "REAL_EXPORT_UNCONFIRMED" } };
}

export function sportpaleisProductionInventoryView(state) {
  const openOrderIds = new Set((state.orders ?? []).filter(({ stage }) => stage !== "DONE").map(({ id }) => id));
  const requirements = (state.productionElementRequirements ?? []).filter(({ orderId }) => openOrderIds.has(orderId));
  return (state.productionElements ?? []).flatMap((element) => element.variants.map((variant) => {
    const openDemand = requirements.filter(({ variantId }) => variantId === variant.id).reduce((sum, { quantity }) => sum + quantity, 0);
    const projectedFreeStock = Number.isInteger(variant.currentStock) ? variant.currentStock - openDemand : null;
    const shortage = projectedFreeStock !== null && Number.isInteger(variant.minimumStock) && projectedFreeStock < variant.minimumStock;
    const suggestedReplenishment = shortage && Number.isInteger(variant.targetStock) ? Math.max(0, variant.targetStock - projectedFreeStock) : shortage ? Math.max(0, variant.minimumStock - projectedFreeStock) : shortage === false && projectedFreeStock !== null ? 0 : null;
    const dataGaps = [];
    if (element.sourceStatus !== "AVAILABLE") dataGaps.push("bronasset niet lokaal productieklaar bevestigd");
    if (!(Number(variant.widthMm) > 0) || !(Number(variant.heightMm) > 0)) dataGaps.push("afmeting ontbreekt");
    if (!Number.isInteger(variant.currentStock)) dataGaps.push("voorraad onbekend");
    if (!Number.isInteger(variant.minimumStock)) dataGaps.push("minimum onbekend");
    if (!Number.isInteger(variant.targetStock)) dataGaps.push("aanvulniveau onbekend");
    return { elementId: element.id, elementName: element.name, ownerName: element.ownerName, variantId: variant.id, variantLabel: variant.label, productionMode: variant.productionMode, currentStock: variant.currentStock, openDemand, projectedFreeStock, minimumStock: variant.minimumStock, targetStock: variant.targetStock, shortage, suggestedReplenishment, dataGaps };
  }));
}

function assertRole(user, allowed) {
  if (user.principalType === WBD_REVIEW_DEVELOPER_PRINCIPAL.principalType
    && user.candidateStateIsolated === true
    && user.scopes?.includes("candidate.ui.safe-interact")
    && allowed.includes("admin")) return;
  if (!allowed.includes(user.role)) {
    throw Object.assign(new Error("Onvoldoende rechten."), { statusCode: 403, code: "FORBIDDEN" });
  }
}

function assertCreativeStudioAccess(user, enabled) {
  if (enabled !== true) {
    throw Object.assign(new Error("Creative Studio is niet beschikbaar in deze pilot."), { statusCode: 403, code: "CREATIVE_STUDIO_DISABLED" });
  }
  assertRole(user, ["admin", "operator"]);
}

const SPORTPALEIS_REVIEW_CANDIDATES = Object.freeze([Object.freeze({
  id: "spw-r20-human-review-20260827",
  title: "Sportpaleis R20 · Bibliotheek + Teamwear",
  status: "CANDIDATE",
  stateBoundary: "DISPOSABLE_SESSION_ONLY",
  capabilities: Object.freeze({
    library: "READ_SAFE",
    teamkitDraft: "CANDIDATE_STATE_ONLY_FROM_LIVE_CONTEXT",
    proof: "SAME_CANONICAL_COMPOSITION_READ_SAFE",
    uploads: "DISABLED",
    orders: "FORBIDDEN",
    production: "FORBIDDEN",
    mail: "FORBIDDEN",
    externalApis: "FORBIDDEN",
  }),
})]);

function reviewModeAllowed(user, principalIds, reviewCandidates) {
  if (user.principalType === WBD_REVIEW_DEVELOPER_PRINCIPAL.principalType) {
    return user.scopes?.includes("candidate.review.read")
      && reviewCandidates.some(({ id }) => id === user.candidateId);
  }
  return reviewCandidates.length > 0
    && user.role === "admin"
    && user.seatType === "customer"
    && user.featureExposure?.teamwearExperiencePilot === true
    && principalIds.has(user.id);
}

function inspectProductionFontRequest(state, payload) {
  const guidedProfileId = optional(payload.productionProfileId, 180) || null;
  const guidedField = optional(payload.applicationField, 40) || null;
  const guidedAssociationId = optional(payload.associationId, 180) || null;
  let guidedProfile = null;
  if (guidedProfileId || guidedField || guidedAssociationId) {
    if (!guidedProfileId || !guidedField || !guidedAssociationId) throw Object.assign(new Error("De bedoelde lettertoepassing is onvolledig. Open de bron opnieuw vanuit Ontbrekende productiebronnen."), { statusCode: 400, code: "PRODUCTION_FONT_APPLICATION_CONTEXT_INCOMPLETE" });
    guidedProfile = state.productionProfiles.find(({ id }) => id === guidedProfileId);
    const guidedAssociation = state.associations.find(({ id }) => id === guidedAssociationId);
    const profileBelongsToAssociation = guidedProfile && guidedAssociation && state.articles.some(({ association, profileId, active }) => active !== false && association === guidedAssociation.name && profileId === guidedProfile.id);
    if (!guidedProfile || !guidedAssociation || !profileBelongsToAssociation || !guidedProfile.supports?.includes(guidedField)) throw Object.assign(new Error("De bedoelde lettertoepassing hoort niet bij dit productieprofiel en deze vereniging."), { statusCode: 409, code: "PRODUCTION_FONT_APPLICATION_CONTEXT_MISMATCH" });
    const requirement = canonicalLineSourceRequirement(state, guidedAssociation, guidedProfile, guidedField);
    if (requirement.kind !== "MANAGED_FONT") throw Object.assign(new Error("Voor deze toepassing verwacht Workspace een SVG/vector-nummerset. Een fontbestand kan die bron niet vervangen."), { statusCode: 409, code: "PRODUCTION_FONT_SOURCE_TYPE_MISMATCH", expectedSourceType: requirement.kind, applicationField: guidedField });
    if (requirement.canonicalName && normalizedProductionIdentity(payload.name) !== normalizedProductionIdentity(requirement.canonicalName)) throw Object.assign(new Error(`Voor deze toepassing is ${requirement.canonicalName} de bevestigde letterbron. Een andere fontnaam wordt niet stil gekoppeld.`), { statusCode: 409, code: "PRODUCTION_CANONICAL_FONT_NAME_MISMATCH" });
  }
  const name = requiredText(payload.name, "Fontnaam", 120);
  const filename = requiredText(payload.filename, "Bestandsnaam", 180);
  const dataBase64 = requiredText(payload.dataBase64, "Fontbron", 7_500_000);
  let bytes; try { bytes = Buffer.from(dataBase64, "base64"); } catch { bytes = Buffer.alloc(0); }
  if (bytes.length < 12 || bytes.length > 5 * 1024 * 1024) throw Object.assign(new Error("Een fontbestand moet technisch leesbaar en maximaal 5 MB zijn."), { statusCode: 400, code: "FONT_FILE_INVALID" });
  const signature = bytes.subarray(0, 4).toString("hex"); const format = FONT_SIGNATURES.get(signature);
  if (!format || !filename.toLowerCase().endsWith(format.extension)) throw Object.assign(new Error("Gebruik een geldig TTF-, OTF-, WOFF- of WOFF2-bestand met overeenkomende bestandsextensie."), { statusCode: 400, code: "FONT_SIGNATURE_INVALID" });
  const representativeValues = guidedField === "initials" ? ["MW", "SP"] : guidedField === "name" ? ["VAN DER MEER", "SPORTPALEIS"] : ["MW", "SPORTPALEIS", "34"];
  let admissionProof;
  try { admissionProof = inspectManagedFontAdmission(bytes, { representativeValues }); }
  catch (error) { throw Object.assign(new Error(error?.message ?? "De fontbron is niet production-executable."), { statusCode: 400, code: error?.code ?? "FONT_FILE_INVALID" }); }
  if (guidedProfile) {
    const guidedAssociation = state.associations.find(({ id }) => id === guidedAssociationId);
    const requirement = canonicalLineSourceRequirement(state, guidedAssociation, guidedProfile, guidedField);
    const expectedIdentity = normalizedSourceIdentity(requirement.canonicalName);
    const actualIdentities = [admissionProof.metadata.familyName, admissionProof.metadata.fullName, admissionProof.metadata.postscriptName]
      .map(normalizedSourceIdentity)
      .filter(Boolean);
    if (expectedIdentity && !actualIdentities.some((identity) => identity === expectedIdentity || identity.includes(expectedIdentity) || expectedIdentity.includes(identity))) {
      throw Object.assign(new Error(`De interne fontidentity hoort niet bij de bevestigde letterbron ${requirement.canonicalName}. De zichtbare uploadnaam is geen bronbewijs.`), { statusCode: 409, code: "PRODUCTION_CANONICAL_FONT_IDENTITY_MISMATCH", expectedIdentity: requirement.canonicalName, actualIdentities: admissionProof.metadata });
    }
  }
  const hash = sha256(bytes).toUpperCase();
  const inspectionSha256 = sha256(JSON.stringify({ schemaVersion: 1, name, filename, sourceSha256: hash, metadata: admissionProof.metadata, representativeProofs: admissionProof.representativeProofs, executabilitySha256: admissionProof.executabilitySha256, productionProfileId: guidedProfileId, applicationField: guidedField, associationId: guidedAssociationId })).toUpperCase();
  return { name, filename, bytes, format, hash, guidedProfile, guidedProfileId, guidedField, guidedAssociationId, admissionProof, inspectionSha256 };
}

function assessWebshopProductionArticle(state, association, sourceArticle) {
  const articleMatches = state.articles.filter(({ active, association: owner, articleNumber }) => active !== false && owner === association && String(articleNumber) === String(sourceArticle.articleNumber));
  if (articleMatches.length !== 1) return { article: null, resolutions: [], issues: [{ code: "WEBSHOP_ARTICLE_MATCH_REVIEW_REQUIRED", reason: `${sourceArticle.articleNumber}: artikelmatch is niet exact; controle blijft vereist.` }] };
  const article = articleMatches[0];
  const supported = new Set(article.supports ?? []);
  const resolutions = [];
  const issues = [];
  const usedFields = new Set();
  for (const personalization of sourceArticle.personalization) {
    if (personalization.kind === "STOCK_LOGO") { resolutions.push({ personalization, field: null }); continue; }
    if (personalization.status === "ATTENTION_REQUIRED") {
      issues.push({ code: "WEBSHOP_DECORATION_VALUE_REVIEW_REQUIRED", reason: personalization.attentionReason || `${sourceArticle.articleNumber}: opdrukwaarde vraagt controle` });
      continue;
    }
    let field = ({ INITIALS: "initials", NAME_PRINT: "name", BACK_NAME: "name", BACK_NUMBER: "backNumber", CHEST_NUMBER: "chestNumber", SHORTS_NUMBER: "shortsNumber" })[personalization.kind];
    if (personalization.kind === "NUMBER") {
      const placements = ["backNumber", "chestNumber", "shortsNumber"].filter((candidate) => supported.has(candidate));
      if (placements.length !== 1) {
        issues.push({ code: "WEBSHOP_DECORATION_PLACEMENT_REVIEW_REQUIRED", reason: `${sourceArticle.articleNumber}: ‘${personalization.sourceLabel}’ heeft geen eenduidige artikelplaatsing; controle blijft vereist.` });
        continue;
      }
      [field] = placements;
    }
    if (!field || !supported.has(field)) {
      issues.push({ code: "WEBSHOP_DECORATION_PROFILE_REVIEW_REQUIRED", reason: `${sourceArticle.articleNumber}: ${personalization.sourceLabel} past niet aantoonbaar bij de productie-inrichting van dit artikel.` });
      continue;
    }
    if (usedFields.has(field)) {
      issues.push({ code: "WEBSHOP_DECORATION_CARDINALITY_REVIEW_REQUIRED", reason: `${sourceArticle.articleNumber}: meerdere bronopdrukken zouden op hetzelfde productieveld terechtkomen.` });
      continue;
    }
    usedFields.add(field);
    resolutions.push({ personalization, field });
  }
  return { article, resolutions, issues };
}

function mailboxEvidencePath(runtimeArtifactRoot, kind, hash, extension) {
  const root = path.resolve(runtimeArtifactRoot);
  const relative = path.join("sportpaleis-mailbox-evidence", kind, `${hash}.${extension}`);
  const absolute = path.resolve(root, relative);
  if (path.relative(root, absolute).startsWith("..") || path.isAbsolute(path.relative(root, absolute))) throw Object.assign(new Error("Mailbox-evidencepad valt buiten de runtimeboundary."), { code: "SPORTPALEIS_MAIL_EVIDENCE_PATH_INVALID" });
  return { absolute, relative: relative.replaceAll(path.sep, "/") };
}

async function persistImmutableMailboxBytes(runtimeArtifactRoot, kind, bytes, extension) {
  const hash = sha256(bytes);
  const target = mailboxEvidencePath(runtimeArtifactRoot, kind, hash, extension);
  await mkdir(path.dirname(target.absolute), { recursive: true, mode: 0o700 });
  let handle;
  try {
    handle = await open(target.absolute, "wx", 0o600);
    await handle.writeFile(bytes);
    await handle.sync();
  } catch (cause) {
    if (cause?.code !== "EEXIST") throw cause;
    const existing = await readFile(target.absolute);
    if (sha256(existing) !== hash) throw Object.assign(new Error("Bestaande mailbox-evidence wijkt af van de content hash."), { code: "SPORTPALEIS_MAIL_EVIDENCE_COLLISION" });
  } finally {
    await handle?.close();
  }
  return { sha256: hash, sizeBytes: bytes.length, storageReference: target.relative, immutable: true };
}

async function persistMailboxMessageEvidence(runtimeArtifactRoot, message) {
  if (!message.rawDataBase64) throw Object.assign(new Error("De immutable ruwe mailbron ontbreekt."), { code: "SPORTPALEIS_RAW_MAIL_REQUIRED" });
  const rawBytes = Buffer.from(message.rawDataBase64, "base64");
  const rawEvidence = await persistImmutableMailboxBytes(runtimeArtifactRoot, "raw", rawBytes, "eml");
  if (message.rawEvidence.sha256 && message.rawEvidence.sha256 !== rawEvidence.sha256) throw Object.assign(new Error("De ruwe mailbron wijkt af van de connectorhash."), { code: "SPORTPALEIS_MAIL_HASH_MISMATCH" });
  const attachments = [];
  for (const attachment of message.attachments) {
    if (!attachment.dataBase64) { attachments.push(attachment); continue; }
    const bytes = Buffer.from(attachment.dataBase64, "base64");
    const evidence = await persistImmutableMailboxBytes(runtimeArtifactRoot, "attachments", bytes, "bin");
    if (attachment.contentHash && attachment.contentHash !== evidence.sha256) throw Object.assign(new Error("Attachmentbytes wijken af van de connectorhash."), { code: "SPORTPALEIS_ATTACHMENT_HASH_MISMATCH" });
    attachments.push({ ...attachment, contentHash: evidence.sha256, size: evidence.sizeBytes, storageReference: evidence.storageReference, immutable: true });
  }
  const { rawDataBase64: _rawDataBase64, ...metadata } = message;
  return { ...metadata, rawEvidence, attachments: attachments.map(({ dataBase64: _dataBase64, ...attachment }) => attachment) };
}

async function readMailboxAttachment(runtimeArtifactRoot, attachment) {
  if (!attachment?.storageReference || !attachment?.contentHash) throw Object.assign(new Error("Immutable attachment-evidence ontbreekt."), { code: "SPORTPALEIS_ATTACHMENT_EVIDENCE_MISSING" });
  const root = path.resolve(runtimeArtifactRoot);
  const absolute = path.resolve(root, ...String(attachment.storageReference).split("/"));
  const relative = path.relative(root, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw Object.assign(new Error("Attachment-evidence valt buiten de runtimeboundary."), { code: "SPORTPALEIS_ATTACHMENT_EVIDENCE_PATH_INVALID" });
  const bytes = await readFile(absolute);
  if (sha256(bytes) !== attachment.contentHash) throw Object.assign(new Error("Immutable attachment-evidence is gewijzigd."), { code: "SPORTPALEIS_ATTACHMENT_EVIDENCE_CHANGED" });
  return bytes;
}

async function assessMailboxPdfAttachments(message, attachmentBytes = new Map()) {
  const assessments = [];
  for (const attachment of message.attachments.filter(({ contentType, filename }) => contentType === "application/pdf" || /\.pdf$/iu.test(filename))) {
    try {
      const bytes = attachment.dataBase64 ? Buffer.from(attachment.dataBase64, "base64") : attachmentBytes.get(attachment.id);
      if (!bytes) throw Object.assign(new Error("PDF-bytes ontbreken."), { code: "SPORTPALEIS_MAIL_PDF_BYTES_MISSING" });
      const inspected = await inspectQuickProductionSource({ filename: attachment.filename, mimeType: "application/pdf", dataBase64: bytes.toString("base64") });
      const parsed = parseSportpaleisDividePdfText({ pages: inspected.extraction.textPages?.length ? inspected.extraction.textPages : [inspected.extraction.extractedText], layoutPages: inspected.extraction.layoutPages, sourceDocumentId: inspected.source.sha256, sourceHash: inspected.source.sha256, detectedAt: message.receivedAt });
      assessments.push({ attachmentId: attachment.id, valid: parsed.orders.length > 0, productionOrderCount: parsed.orders.filter(({ productionLines }) => productionLines.length > 0).length, inspected, parsed });
    } catch (cause) {
      assessments.push({ attachmentId: attachment.id, valid: false, productionOrderCount: 0, failureCode: String(cause?.code ?? "SPORTPALEIS_MAIL_PDF_UNRECOGNIZED") });
    }
  }
  return assessments;
}

function ingestWebshopDocumentIntoState(state, { sourceMessageId, receivedAt, inspected, parsed, actorId }) {
  const sameMessage = state.webshopIntake.sources.find((source) => source.sourceMessageId === sourceMessageId);
  if (sameMessage && sameMessage.sha256 !== inspected.source.sha256) throw Object.assign(new Error("Dit mailbericht-ID is al met een andere immutable PDF vastgelegd."), { statusCode: 409, code: "WEBSHOP_SOURCE_ID_CONFLICT" });
  if (sameMessage) return { source: sameMessage, matches: state.webshopIntake.matches.filter(({ sourceId }) => sourceId === sameMessage.id) };
  const duplicateHash = state.webshopIntake.sources.find(({ sha256: hash }) => hash === inspected.source.sha256);
  if (duplicateHash) return { source: duplicateHash, matches: state.webshopIntake.matches.filter(({ sourceId }) => sourceId === duplicateHash.id) };
  const importedAt = iso();
  const source = { id: `webshop-source-${randomBytes(8).toString("hex")}`, sourceMessageId, receivedAt, filename: inspected.source.filename, mimeType: "application/pdf", sizeBytes: inspected.source.sizeBytes, sha256: inspected.source.sha256, dataBase64: inspected.source.dataBase64, immutable: true, importedAt, importedBy: actorId };
  state.webshopIntake.sources.unshift(source);
  const productionOrders = parsed.orders.filter(({ productionLines }) => productionLines.length > 0);
  const matches = productionOrders.map((parsedOrder) => {
    const catalogAssociationSets = parsedOrder.articles
      .map(({ articleNumber }) => new Set(state.articles.filter(({ active, articleNumber: candidate }) => active !== false && String(candidate) === String(articleNumber)).map(({ association }) => association)))
      .filter((candidates) => candidates.size > 0);
    const inferredAssociations = catalogAssociationSets.length ? [...catalogAssociationSets[0]].filter((association) => catalogAssociationSets.every((candidates) => candidates.has(association))) : [];
    const association = parsedOrder.association || (inferredAssociations.length === 1 ? inferredAssociations[0] : null);
    const existingRevisions = state.webshopIntake.matches.filter(({ externalReference }) => externalReference === parsedOrder.externalReference).map(({ contentHash }, index) => ({ revision: index + 1, contentHash }));
    const revision = reconcileSportpaleisDivideRevision(existingRevisions, parsedOrder);
    if (revision.action === "NO_OP") return state.webshopIntake.matches.find(({ externalReference, contentHash }) => externalReference === parsedOrder.externalReference && contentHash === parsedOrder.contentHash);
    const reviewReasons = [...new Set([
      ...parsedOrder.attention.map(({ reason }) => reason),
      ...(!parsedOrder.customer ? ["Klantnaam ontbreekt"] : []),
      ...(!association ? ["Vereniging is niet eenduidig uit bron of catalogus af te leiden"] : []),
      ...parsedOrder.articles.flatMap((article) => [...(!article.description ? [`${article.articleNumber}: omschrijving ontbreekt`] : []), ...(!article.size ? [`${article.articleNumber}: maat ontbreekt`] : []), ...(!article.color ? [`${article.articleNumber}: artikelkleur ontbreekt`] : [])]),
      ...(association ? parsedOrder.articles.filter(({ personalization }) => personalization.length > 0).flatMap((article) => assessWebshopProductionArticle(state, association, article).issues.map(({ reason }) => reason)) : []),
    ])];
    const match = { id: `webshop-match-${randomBytes(8).toString("hex")}`, sourceId: source.id, externalReference: parsedOrder.externalReference, orderDate: parsedOrder.orderDate, customer: parsedOrder.customer, customerEmail: parsedOrder.customerEmail, customerPhone: parsedOrder.customerPhone, association, contentHash: parsedOrder.contentHash, status: "HUMAN_CHECK", orderId: null, reviewReasons, articles: parsedOrder.articles.map(({ sourceLineId, articleNumber, description, size, color, quantity, personalization, articlePersonalizationRule }) => ({ sourceLineId, articleNumber, description, size, color, quantity, personalization, ...(articlePersonalizationRule ? { articlePersonalizationRule } : {}) })), source: { pageNumbers: parsedOrder.pageNumbers, segmentHash: parsedOrder.source.segmentHash, originalEvidence: parsedOrder.source.originalEvidence }, acceptedAt: null, acceptedBy: null };
    state.webshopIntake.matches.unshift(match);
    state.webshopIntake.processedOrderRevisionIdentifiers.push(`${parsedOrder.externalReference}:${parsedOrder.contentHash}`);
    return match;
  }).filter(Boolean);
  state.webshopIntake.processedSourceIdentifiers.push(`${sourceMessageId}:${source.sha256}`);
  state.webshopIntake.lastSuccessfulRetrievalAt = importedAt;
  state.webshopIntake.highWaterMark = receivedAt;
  state.webshopIntake.status = matches.some(({ reviewReasons }) => reviewReasons.length) ? "ATTENTION" : "READY";
  audit(state, actorId, "Webshopmail-PDF immutable ingelezen", source.id, { sourceMessageId, filename: source.filename, sha256: source.sha256, parsedOrders: parsed.orders.length, productionIntakes: matches.length, ordersWithoutDecoration: parsed.orders.length - productionOrders.length, automaticOrderCreation: false });
  return { source, matches };
}

export class SportpaleisPilotService {
  constructor({ store, mailFoundation, websiteSource = createSportpaleisWebsiteSource(), releaseId = PILOT_RELEASE_ID, secureCookies = false, allowedOrigin = "http://127.0.0.1:5173", sessionTtlMs = SESSION_TTL_MS, demoMode = false, uploadsEnabled = true, productionAssetUploadsEnabled = uploadsEnabled, fontUploadsEnabled = uploadsEnabled, mailMode = "capture", mailboxConfiguration = { configured: false }, creativeStudioEnabled = true, artifactRoot = DEFAULT_ARTIFACT_ROOT, runtimeArtifactRoot = artifactRoot, installedProductionAssetRoot = INSTALLED_PRODUCTION_ASSET_ROOT, reviewPrincipalIds = [], activeReviewCandidateIds = [], reviewAccessIssuerPrincipalIds = [], reviewAccessEnabled = false, reviewAccessIsolatedState = false }) {
    this.store = store;
    this.mailFoundation = mailFoundation;
    this.websiteSource = websiteSource;
    this.releaseId = releaseId;
    this.secureCookies = secureCookies;
    this.allowedOrigin = allowedOrigin;
    this.sessionTtlMs = sessionTtlMs;
    this.demoMode = demoMode === true;
    this.uploadsEnabled = uploadsEnabled === true;
    this.productionAssetUploadsEnabled = productionAssetUploadsEnabled === true;
    this.fontUploadsEnabled = fontUploadsEnabled === true;
    this.mailMode = mailMode;
    this.mailboxConfiguration = { configured: mailboxConfiguration?.configured === true };
    this.creativeStudioEnabled = creativeStudioEnabled === true;
    this.artifactRoot = path.resolve(artifactRoot);
    this.runtimeArtifactRoot = path.resolve(runtimeArtifactRoot);
    this.installedProductionAssetRoot = installedProductionAssetRoot === null ? null : path.resolve(installedProductionAssetRoot);
    this.reviewPrincipalIds = new Set(reviewPrincipalIds);
    const activeCandidateIds = new Set(activeReviewCandidateIds);
    const knownReviewCandidates = new Map(SPORTPALEIS_REVIEW_CANDIDATES.map((candidate) => [candidate.id, candidate]));
    this.reviewCandidates = [...activeCandidateIds].map((id) => knownReviewCandidates.get(id) ?? Object.freeze({
      id,
      title: id,
      status: "CANDIDATE",
      stateBoundary: "DISPOSABLE_SESSION_ONLY",
      capabilities: Object.freeze({ fullWorkspace: "READ_SAFE", safeInteraction: "CANDIDATE_STATE_ONLY", orders: "FORBIDDEN", production: "FORBIDDEN", mail: "FORBIDDEN", externalApis: "FORBIDDEN" }),
    }));
    this.reviewDeveloperAccessPolicy = reviewAccessEnabled === true
      ? new WbdReviewDeveloperAccessPolicy({ issuerPrincipalIds: reviewAccessIssuerPrincipalIds, allowedCandidateIds: activeReviewCandidateIds, tenantId: "sportpaleis" })
      : null;
    this.reviewAccessIsolatedState = reviewAccessIsolatedState === true;
  }

  async initialize() {
    await this.store.initialize();
  }

  async reviewManifest(token) {
    const { user } = await this.authenticate(token);
    if (!reviewModeAllowed(user, this.reviewPrincipalIds, this.reviewCandidates)) {
      throw Object.assign(new Error("Review Mode is niet beschikbaar voor dit account."), { statusCode: 403, code: "REVIEW_MODE_FORBIDDEN" });
    }
    return {
      mode: "CANDIDATE",
      principalId: user.id,
      candidateStateAuthority: "CANDIDATE_ONLY",
      productionMutationAuthority: false,
      candidates: this.reviewCandidates,
    };
  }

  async issueReviewDeveloperGrant(token, csrfToken, payload, now = new Date()) {
    if (!this.reviewDeveloperAccessPolicy) throw Object.assign(new Error("Tijdelijke reviewtoegang is niet geconfigureerd."), { statusCode: 404, code: "REVIEW_ACCESS_DISABLED" });
    const { user } = await this.authenticate(token, now);
    if (user.principalType === WBD_REVIEW_DEVELOPER_PRINCIPAL.principalType) throw Object.assign(new Error("Een tijdelijke reviewer kan geen nieuwe toegang uitgeven."), { statusCode: 403, code: "REVIEW_GRANT_CHAIN_FORBIDDEN" });
    await this.#assertCsrf(token, csrfToken);
    const issued = await this.#mutateReviewDeveloperAccess((state) => this.reviewDeveloperAccessPolicy.issueGrant(state, {
        issuer: user,
        tenantId: "sportpaleis",
        candidateId: payload.candidateId,
        scopes: payload.scopes,
        humanGoReference: payload.humanGoReference,
        ttlMs: payload.ttlMs,
      }, now));
    return {
      grant: issued.grant,
      activationPath: `/workspace/sportpaleis/review-toegang#token=${issued.activationToken}&candidate=${encodeURIComponent(issued.grant.candidateId)}`,
      delivery: "LOCAL_HANDOFF_ONLY",
    };
  }

  async activateReviewDeveloperGrant(payload, now = new Date()) {
    if (!this.reviewDeveloperAccessPolicy) throw Object.assign(new Error("Tijdelijke reviewtoegang is niet geconfigureerd."), { statusCode: 404, code: "REVIEW_ACCESS_DISABLED" });
    const activated = await this.#mutateReviewDeveloperAccess((state) => this.reviewDeveloperAccessPolicy.activateGrant(state, {
        activationToken: payload.activationToken,
        tenantId: "sportpaleis",
        candidateId: payload.candidateId,
      }, now));
    return { ...activated, cookieMaxAgeSeconds: Math.max(0, Math.floor((new Date(activated.expiresAt).getTime() - now.getTime()) / 1_000)) };
  }

  async revokeReviewDeveloperGrant(token, csrfToken, grantId, now = new Date()) {
    if (!this.reviewDeveloperAccessPolicy) throw Object.assign(new Error("Tijdelijke reviewtoegang is niet geconfigureerd."), { statusCode: 404, code: "REVIEW_ACCESS_DISABLED" });
    const { user } = await this.authenticate(token, now);
    if (user.principalType === WBD_REVIEW_DEVELOPER_PRINCIPAL.principalType) throw Object.assign(new Error("Een tijdelijke reviewer kan geen toegang beheren."), { statusCode: 403, code: "REVIEW_GRANT_CHAIN_FORBIDDEN" });
    await this.#assertCsrf(token, csrfToken);
    return this.#mutateReviewDeveloperAccess((state) => this.reviewDeveloperAccessPolicy.revokeGrant(state, { issuer: user, grantId }, now));
  }

  async #mutateReviewDeveloperAccess(operation) {
    let rejection = null;
    const result = await this.store.mutate(async (state) => {
      try {
        return { state, value: operation(state) };
      } catch (cause) {
        rejection = cause;
        return { state, value: null };
      }
    });
    if (rejection) throw rejection;
    return result.value;
  }

  async #persistReviewDeveloperAccessDenial(cause) {
    if (!cause) return false;
    const result = await this.store.mutate(async (state) => ({ state, value: persistWbdReviewDeveloperAccessDenial(state, cause) }));
    return result.value;
  }

  async assertTemporaryReviewRequest(token, { method, route }, now = new Date()) {
    if (!this.reviewDeveloperAccessPolicy || !token) return null;
    const state = await this.store.read();
    let context;
    try {
      context = this.reviewDeveloperAccessPolicy.authenticateSession(state, { sessionToken: token, tenantId: "sportpaleis" }, now);
    } catch (cause) {
      await this.#persistReviewDeveloperAccessDenial(cause);
      if (cause?.code === "REVIEW_SESSION_UNKNOWN") return null;
      throw cause;
    }
    const capability = classifySportpaleisReviewRequest({ method, route, isolatedCandidateState: this.reviewAccessIsolatedState });
    if (!capability) {
      await this.store.mutate(async (next) => {
        try {
          this.reviewDeveloperAccessPolicy.authorizeCapability(next, {
            sessionToken: token,
            tenantId: "sportpaleis",
            candidateId: context.grant.candidateId,
            capability: "review.side-effect.denied",
            method,
            route,
          }, now);
        } catch {
          return { state: next, value: null };
        }
        return { state: next, value: null };
      });
      throw Object.assign(new Error("De tijdelijke Codex-principal heeft geen productie- of beheerwrite-authority."), { statusCode: 403, code: "REVIEW_SIDE_EFFECT_FORBIDDEN" });
    }
    const result = await this.store.mutate(async (next) => ({
      state: next,
      value: this.reviewDeveloperAccessPolicy.authorizeCapability(next, {
        sessionToken: token,
        tenantId: "sportpaleis",
        candidateId: context.grant.candidateId,
        capability,
        method,
        route,
      }, now),
    }));
    return result.value;
  }

  async login({ email, password, deviceMode = "SHARED", remoteAddress = "unknown", now = new Date() }) {
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const attemptKey = sha256(`${remoteAddress}:${normalizedEmail}`);
    const state = await this.store.read();
    const recent = (state.loginAttempts[attemptKey] ?? []).filter((value) => now.getTime() - new Date(value).getTime() < LOGIN_WINDOW_MS);
    if (recent.length >= MAX_LOGIN_ATTEMPTS) {
      throw Object.assign(new Error("Te veel aanmeldpogingen. Probeer later opnieuw."), { statusCode: 429, code: "RATE_LIMITED" });
    }
    const user = state.users.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);
    const valid = Boolean(user && user.status === "Actief" && await verifyPassword(String(password ?? ""), user.password));
    if (!valid) {
      await this.store.mutate(async (next) => {
        next.loginAttempts[attemptKey] = [...(next.loginAttempts[attemptKey] ?? []).filter((value) => now.getTime() - new Date(value).getTime() < LOGIN_WINDOW_MS), iso(now)];
        audit(next, user?.id ?? "unknown", "Ongeldige login", "Authenticatie");
        return { state: next, value: undefined };
      });
      throw Object.assign(new Error("E-mailadres of wachtwoord is onjuist."), { statusCode: 401, code: "INVALID_LOGIN" });
    }
    const token = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(24).toString("base64url");
    const normalizedDeviceMode = allowedValue(deviceMode, ["SHARED", "PERSONAL"], "Apparaattype");
    const ttlMs = normalizedDeviceMode === "PERSONAL" ? PERSONAL_SESSION_TTL_MS : this.sessionTtlMs;
    const session = {
      idHash: sha256(token),
      userId: user.id,
      csrfHash: sha256(csrfToken),
      createdAt: iso(now),
      lastSeenAt: iso(now),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      deviceMode: normalizedDeviceMode,
      authMethod: "PASSWORD",
    };
    await this.store.mutate(async (next) => {
      next.sessions = next.sessions.filter(({ expiresAt }) => new Date(expiresAt).getTime() > now.getTime());
      next.sessions.push(session);
      next.loginAttempts[attemptKey] = [];
      audit(next, user.id, "Ingelogd", "Workspace");
      return { state: next, value: undefined };
    });
    return { token, csrfToken, user: publicUser(user), expiresAt: session.expiresAt, deviceMode: normalizedDeviceMode, cookieMaxAgeSeconds: Math.floor(ttlMs / 1000) };
  }

  async requestPasswordReset({ email, remoteAddress = "unknown", now = new Date() }) {
    const requestedEmail = normalizedEmail(email);
    const attemptKey = sha256(`account-recovery:${remoteAddress}:${requestedEmail}`);
    await this.store.mutate(async (state) => {
      const recent = (state.loginAttempts[attemptKey] ?? []).filter((value) => now.getTime() - new Date(value).getTime() < LOGIN_WINDOW_MS);
      if (recent.length >= 4) return { state, value: undefined };
      state.loginAttempts[attemptKey] = [...recent, iso(now)];
      const matches = state.users.filter((candidate) => candidate.status === "Actief" && normalizedEmail(candidate.email) === requestedEmail);
      if (matches.length === 1) {
        const target = matches[0];
        state.passwordResetRequests = (state.passwordResetRequests ?? []).filter((request) => request.userId !== target.id || request.usedAt);
        state.passwordResetRequests.push({
          id: `recovery-${randomBytes(8).toString("hex")}`,
          userId: target.id,
          requestedAt: iso(now),
          requestedFromHash: sha256(String(remoteAddress ?? "unknown")),
          tokenHash: null,
          issuedAt: null,
          expiresAt: null,
          usedAt: null,
          issuedBy: null,
        });
        audit(state, target.id, "Wachtwoordherstel aangevraagd", "Authenticatie");
      } else {
        audit(state, "unknown", "Wachtwoordherstel aangevraagd", "Authenticatie");
      }
      return { state, value: undefined };
    });
    return { accepted: true, message: "Als dit e-mailadres bij een actief account hoort, staat de veilige herstelstap klaar voor de beheerder." };
  }

  async issuePasswordReset(token, csrfToken, targetUserId, now = new Date()) {
    const { user } = await this.authenticate(token, now);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    let rawToken = "";
    let expiresAt = "";
    await this.store.mutate(async (state) => {
      const target = state.users.find(({ id, status, seatType }) => id === targetUserId && status === "Actief" && seatType === "customer");
      if (!target) throw Object.assign(new Error("Actieve gebruiker niet gevonden."), { statusCode: 404, code: "USER_NOT_FOUND" });
      const pending = (state.passwordResetRequests ?? []).filter((request) => request.userId === target.id && !request.usedAt);
      if (!pending.length) throw Object.assign(new Error("Deze gebruiker heeft geen openstaand herstelverzoek."), { statusCode: 409, code: "RECOVERY_NOT_REQUESTED" });
      rawToken = randomBytes(32).toString("base64url");
      expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS).toISOString();
      state.passwordResetRequests = (state.passwordResetRequests ?? []).filter((request) => request.userId !== target.id || request.usedAt);
      state.passwordResetRequests.push({ ...pending.sort((left, right) => String(right.requestedAt).localeCompare(String(left.requestedAt)))[0], tokenHash: sha256(rawToken), issuedAt: iso(now), expiresAt, issuedBy: user.id });
      audit(state, user.id, "Eenmalige wachtwoordherstellink gemaakt", target.id, { expiresAt });
      return { state, value: undefined };
    });
    return { resetPath: `/workspace/sportpaleis/wachtwoord-herstellen#token=${rawToken}`, expiresAt, delivery: "LOCAL_HANDOFF_ONLY" };
  }

  async completePasswordReset(payload, now = new Date()) {
    const rawToken = requiredText(payload.token, "Herstelcode", 200);
    const nextPassword = await passwordRecord(String(payload.password ?? ""));
    const result = await this.store.mutate(async (state) => {
      const request = (state.passwordResetRequests ?? []).find((candidate) => candidate.tokenHash && !candidate.usedAt && safeEqualHex(candidate.tokenHash, sha256(rawToken)));
      if (!request || !request.expiresAt || new Date(request.expiresAt).getTime() <= now.getTime()) throw Object.assign(new Error("Deze herstellink is ongeldig of verlopen."), { statusCode: 400, code: "RECOVERY_INVALID" });
      const target = state.users.find(({ id, status }) => id === request.userId && status === "Actief" && id !== "donovan-support");
      if (!target) throw Object.assign(new Error("Deze gebruiker kan niet worden hersteld."), { statusCode: 409, code: "RECOVERY_STATE_INVALID" });
      target.password = nextPassword;
      request.usedAt = iso(now);
      state.sessions = state.sessions.filter((session) => session.userId !== target.id);
      for (const candidate of state.passwordResetRequests ?? []) if (candidate.userId === target.id && candidate.id !== request.id && !candidate.usedAt) candidate.usedAt = iso(now);
      audit(state, target.id, "Wachtwoord veilig hersteld", target.id, { sessionsInvalidated: true });
      return { state, value: publicUser(target) };
    });
    return { user: result.value, reset: true };
  }

  async demoLogin(view, now = new Date()) {
    if (!this.demoMode) throw Object.assign(new Error("Demo-aanmelding is niet beschikbaar."), { statusCode: 404, code: "DEMO_DISABLED" });
    const targetId = view === "admin" ? "kevin" : view === "operator" ? "patrick" : view === "store" ? "collega" : "";
    const state = await this.store.read();
    const user = state.users.find(({ id }) => id === targetId && id !== "donovan-support");
    if (!user || user.status !== "Actief") throw Object.assign(new Error("Demo-rol is niet beschikbaar."), { statusCode: 404, code: "DEMO_ROLE_UNAVAILABLE" });
    const token = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(24).toString("base64url");
    const session = { idHash: sha256(token), userId: user.id, csrfHash: sha256(csrfToken), createdAt: iso(now), lastSeenAt: iso(now), expiresAt: new Date(now.getTime() + this.sessionTtlMs).toISOString(), deviceMode: "SHARED", authMethod: "DEMO", demo: true };
    await this.store.mutate(async (next) => {
      next.sessions = next.sessions.filter(({ expiresAt }) => new Date(expiresAt).getTime() > now.getTime());
      next.sessions.push(session);
      audit(next, user.id, "Demo aangemeld", view === "admin" ? "Kevin Demo" : view === "operator" ? "Patrick Demo" : "Winkelmedewerker Demo");
      return { state: next, value: undefined };
    });
    return { token, csrfToken, user: { ...publicUser(user), name: view === "admin" ? "Kevin Demo" : view === "operator" ? "Patrick Demo" : "Winkelmedewerker Demo" }, expiresAt: session.expiresAt, deviceMode: "SHARED", cookieMaxAgeSeconds: Math.floor(this.sessionTtlMs / 1000), demo: true };
  }

  async authenticate(token, now = new Date()) {
    if (!token) throw Object.assign(new Error("Aanmelding vereist."), { statusCode: 401, code: "UNAUTHENTICATED" });
    const state = typeof this.store.readSnapshot === "function" ? await this.store.readSnapshot() : await this.store.read();
    const session = state.sessions.find(({ idHash }) => safeEqualHex(idHash, sha256(token)));
    if (!session) {
      if (this.reviewDeveloperAccessPolicy) {
        try {
          const context = this.reviewDeveloperAccessPolicy.authenticateSession(state, { sessionToken: token, tenantId: "sportpaleis" }, now);
          const user = {
            ...context.principal,
            email: "codex-review@internal.invalid",
            status: "Actief",
            workContexts: ["ORGANISATION", "STORE", "WEBSHOP", "PRODUCTION", "ALL"],
            defaultContext: "ALL",
            featureExposure: { teamwearExperiencePilot: true },
            candidateStateIsolated: this.reviewAccessIsolatedState,
          };
          return { state, session: { ...context.session, reviewGrantId: context.grant.id, deviceMode: "SHARED", authMethod: "TEMPORARY_REVIEW_GRANT" }, user, reviewGrant: context.grant };
        } catch (cause) {
          await this.#persistReviewDeveloperAccessDenial(cause);
          if (cause?.code !== "REVIEW_SESSION_UNKNOWN") throw cause;
        }
      }
      throw Object.assign(new Error("Sessie is verlopen."), { statusCode: 401, code: "SESSION_EXPIRED" });
    }
    if (new Date(session.expiresAt).getTime() <= now.getTime()) throw Object.assign(new Error("Sessie is verlopen."), { statusCode: 401, code: "SESSION_EXPIRED" });
    const user = state.users.find(({ id }) => id === session.userId);
    if (!user || user.status !== "Actief") throw Object.assign(new Error("Gebruiker is niet actief."), { statusCode: 401, code: "UNAUTHENTICATED" });
    return { state, session, user };
  }

  async issueSessionView(token) {
    const { user, session } = await this.authenticate(token);
    if (user.principalType === WBD_REVIEW_DEVELOPER_PRINCIPAL.principalType) {
      const rotated = await this.#mutateReviewDeveloperAccess((state) => this.reviewDeveloperAccessPolicy.rotateSessionCsrf(state, { sessionToken: token, tenantId: "sportpaleis", candidateId: user.candidateId }));
      return { user: publicUser(user), csrfToken: rotated.csrfToken, expiresAt: rotated.session.expiresAt, deviceMode: "SHARED", authMethod: "TEMPORARY_REVIEW_GRANT", demo: false };
    }
    const csrfToken = randomBytes(24).toString("base64url");
    await this.store.mutate(async (state) => {
      const active = state.sessions.find(({ idHash }) => idHash === session.idHash);
      if (!active) throw Object.assign(new Error("Sessie is verlopen."), { statusCode: 401, code: "SESSION_EXPIRED" });
      active.csrfHash = sha256(csrfToken);
      active.lastSeenAt = iso();
      return { state, value: undefined };
    });
    const sessionUser = session.demo ? { ...publicUser(user), name: user.role === "admin" ? "Kevin Demo" : user.role === "operator" ? "Patrick Demo" : "Winkelmedewerker Demo" } : publicUser(user);
    return { user: sessionUser, csrfToken, expiresAt: session.expiresAt, deviceMode: session.deviceMode ?? "SHARED", authMethod: session.authMethod ?? "PASSWORD", demo: Boolean(session.demo) };
  }

  async loginWithPersistedCsrf(input) {
    return this.login(input);
  }

  async logout(token, user, csrfToken, now = new Date()) {
    if (user.principalType === WBD_REVIEW_DEVELOPER_PRINCIPAL.principalType) {
      await this.#mutateReviewDeveloperAccess((state) => this.reviewDeveloperAccessPolicy.completeSession(state, { sessionToken: token, csrfToken, tenantId: "sportpaleis", candidateId: user.candidateId }, now));
      return;
    }
    await this.#assertCsrf(token, csrfToken);
    await this.store.mutate(async (state) => {
      state.sessions = state.sessions.filter(({ idHash }) => idHash !== sha256(token));
      audit(state, user.id, "Uitgelogd", "Workspace");
      return { state, value: undefined };
    });
  }

  async fastSwitch(token, csrfToken, payload, now = new Date()) {
    const { user: currentUser, session } = await this.authenticate(token, now);
    if (currentUser.principalType === WBD_REVIEW_DEVELOPER_PRINCIPAL.principalType) {
      throw Object.assign(new Error("De tijdelijke Codex-principal mag geen gebruikersidentiteit overnemen."), { statusCode: 403, code: "REVIEW_IDENTITY_SWITCH_FORBIDDEN" });
    }
    await this.#assertCsrf(token, csrfToken);
    const state = await this.store.read();
    const target = state.users.find(({ id, status, seatType }) => id === payload.targetUserId && status === "Actief" && seatType === "customer");
    if (!target) throw Object.assign(new Error("Gebruiker is niet beschikbaar voor snelle wissel."), { statusCode: 404, code: "SWITCH_TARGET_UNAVAILABLE" });
    const usePin = String(payload.authMode ?? (payload.pin ? "PIN" : "PASSWORD")).toUpperCase() === "PIN";
    if (usePin && (session.deviceMode ?? "SHARED") !== "SHARED") throw Object.assign(new Error("Snelle PIN is alleen beschikbaar op een gedeelde werkplek."), { statusCode: 403, code: "PIN_SHARED_DEVICE_ONLY" });
    if (usePin && ["admin", "support"].includes(target.role)) throw Object.assign(new Error("Beheer- en supportaccounts vereisen altijd het volledige wachtwoord."), { statusCode: 403, code: "PIN_STEP_UP_REQUIRED" });
    if (usePin && !target.quickPin?.hash) throw Object.assign(new Error("Voor deze medewerker is nog geen snelle PIN ingericht."), { statusCode: 409, code: "PIN_NOT_ENROLLED" });
    const attemptKey = sha256(`${usePin ? "pin" : "password"}-switch:${target.id}:${String(payload.remoteAddress ?? "unknown")}`);
    const recent = (state.loginAttempts[attemptKey] ?? []).filter((value) => now.getTime() - new Date(value).getTime() < LOGIN_WINDOW_MS);
    const maximumAttempts = usePin ? 5 : MAX_LOGIN_ATTEMPTS;
    if (recent.length >= maximumAttempts) throw Object.assign(new Error("Te veel wisselpogingen. Probeer na 15 minuten opnieuw of gebruik volledige authenticatie."), { statusCode: 429, code: "PIN_LOCKED" });
    const credentialValid = usePin ? await verifyPin(payload.pin, target.quickPin) : await verifyPassword(String(payload.password ?? ""), target.password);
    if (!credentialValid) {
      await this.store.mutate(async (next) => {
        next.loginAttempts[attemptKey] = [...recent, iso(now)];
        audit(next, currentUser.id, usePin ? "Ongeldige PIN-wissel" : "Ongeldige snelle wissel", target.id, { authMethod: usePin ? "PIN" : "PASSWORD" });
        return { state: next, value: undefined };
      });
      throw Object.assign(new Error(usePin ? "PIN is onjuist." : "Wachtwoord is onjuist."), { statusCode: 401, code: "INVALID_SWITCH_CREDENTIAL" });
    }
    const deviceMode = allowedValue(payload.deviceMode ?? session.deviceMode ?? "SHARED", ["SHARED", "PERSONAL"], "Apparaattype");
    const ttlMs = deviceMode === "PERSONAL" ? PERSONAL_SESSION_TTL_MS : this.sessionTtlMs;
    const nextToken = randomBytes(32).toString("base64url");
    const nextCsrf = randomBytes(24).toString("base64url");
    const nextSession = { idHash: sha256(nextToken), userId: target.id, csrfHash: sha256(nextCsrf), createdAt: iso(now), lastSeenAt: iso(now), expiresAt: new Date(now.getTime() + ttlMs).toISOString(), deviceMode, authMethod: usePin ? "PIN" : "PASSWORD" };
    await this.store.mutate(async (next) => {
      next.sessions = next.sessions.filter(({ idHash, expiresAt }) => idHash !== sha256(token) && new Date(expiresAt).getTime() > now.getTime());
      next.sessions.push(nextSession);
      next.loginAttempts[attemptKey] = [];
      audit(next, currentUser.id, "Gebruiker gewisseld", target.id, { deviceMode, authMethod: usePin ? "PIN" : "PASSWORD" });
      audit(next, target.id, "Ingelogd via snelle wissel", "Workspace", { previousUserId: currentUser.id, deviceMode, authMethod: usePin ? "PIN" : "PASSWORD" });
      return { state: next, value: undefined };
    });
    return { token: nextToken, csrfToken: nextCsrf, user: publicUser(target), expiresAt: nextSession.expiresAt, deviceMode, cookieMaxAgeSeconds: Math.floor(ttlMs / 1000) };
  }

  async setQuickPin(token, csrfToken, targetUserId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const target = state.users.find(({ id, seatType }) => id === targetUserId && seatType === "customer");
      if (!target) throw Object.assign(new Error("Gebruiker niet gevonden."), { statusCode: 404, code: "USER_NOT_FOUND" });
      if (["admin", "support"].includes(target.role)) throw Object.assign(new Error("Beheer- en supportaccounts blijven wachtwoord-only."), { statusCode: 409, code: "PIN_ROLE_NOT_ALLOWED" });
      if (payload.disable === true) { delete target.quickPin; audit(state, user.id, "Snelle PIN verwijderd", target.id); }
      else { target.quickPin = await createSportpaleisPinRecord(String(payload.pin ?? "")); audit(state, user.id, "Snelle PIN ingesteld", target.id); }
      return { state, value: publicUser(target) };
    });
    return result.value;
  }

  async bootstrap(token) {
    const { state, user, session } = await this.authenticate(token);
    const reviewDeveloper = user.principalType === WBD_REVIEW_DEVELOPER_PRINCIPAL.principalType;
    const reviewSafeInteract = reviewDeveloper && this.reviewAccessIsolatedState === true && user.scopes?.includes("candidate.ui.safe-interact");
    const admin = user.role === "admin" || reviewDeveloper;
    const productionWorkspace = admin || user.role === "operator";
    const sessionUser = session.demo ? { ...publicUser(user), name: user.role === "admin" ? "Kevin Demo" : user.role === "operator" ? "Patrick Demo" : "Winkelmedewerker Demo" } : publicUser(user);
    const finalCleanStartOrder = (order) => order.deletion?.byUserId === "system:final-clean-start"
      || (order.eventHistory ?? []).some((event) => event.source === "final-clean-start");
    const allOperationalOrders = state.orders.filter((order) => !finalCleanStartOrder(order));
    const operationalOrderIds = new Set(allOperationalOrders.map(({ id }) => id));
    const terminalOrder = (order) => order.deletion
      || (order.stage === "DONE" && ["PICKED_UP", "DELIVERED"].includes(order.fulfillment?.status));
    const sortedOperationalOrders = [...allOperationalOrders].sort((left, right) => String(right.updatedAt ?? right.createdAt ?? "").localeCompare(String(left.updatedAt ?? left.createdAt ?? "")) || right.id.localeCompare(left.id));
    const activeOrders = sortedOperationalOrders.filter((order) => !terminalOrder(order));
    const activeOrderIds = new Set(activeOrders.map(({ id }) => id));
    const bootstrapOrders = sortedOperationalOrders.filter((order, index) => activeOrderIds.has(order.id) || index < BOOTSTRAP_RECENT_COMPLETED_ORDER_LIMIT);
    const knownOrderIds = new Set(state.orders.map(({ id }) => id));
    const operationalJobs = state.productionJobs.filter(({ snapshot }) => snapshot.orderIds.some((id) => operationalOrderIds.has(id)) || snapshot.orderIds.every((id) => !knownOrderIds.has(id)));
    const sortedOperationalJobs = [...operationalJobs].sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.jobNumber.localeCompare(left.jobNumber));
    const activeProductionJobIds = new Set(sortedOperationalJobs.filter(({ status }) => status === "AWAITING_HUMAN_CHECK").map(({ id }) => id));
    const bootstrapJobs = sortedOperationalJobs.filter((job, index) => activeProductionJobIds.has(job.id) || index < BOOTSTRAP_RECENT_PRODUCTION_JOB_LIMIT);
    const operationalProposals = state.productionProposals.filter((proposal) => proposal.orders?.some(({ id }) => operationalOrderIds.has(id)));
    return {
      schemaVersion: PILOT_SCHEMA_VERSION,
      revision: state.revision,
      currentUserId: user.id,
      currentUser: sessionUser,
      csrfToken: session.csrfHash ? `${BOOTSTRAP_CSRF_PREFIX}${session.csrfHash}` : undefined,
      users: reviewDeveloper ? [sessionUser] : admin ? state.users.filter(({ seatType }) => seatType === "customer").map((candidate) => publicAdminUser(candidate, state)) : [publicUser(user)],
      employees: admin || user.role === "store" ? structuredClone(state.employees) : [],
      switchableUsers: reviewDeveloper ? [] : state.users.filter(({ seatType, status }) => seatType === "customer" && status === "Actief").map(publicUser),
      orders: structuredClone(bootstrapOrders.map((order) => publicOrderWithProductionTruth(state, order, { includeReconciliation: !terminalOrder(order) }))),
      orderHistory: { total: sortedOperationalOrders.length, loaded: bootstrapOrders.length, pageSize: ORDER_HISTORY_PAGE_LIMIT, bounded: true },
      feedback: state.feedback.filter((item) => admin || item.userId === user.id).map((item) => ({ ...item, attachments: (item.attachments ?? []).map(({ dataBase64: _dataBase64, ...attachment }) => attachment) })),
      extraUserRequests: admin ? structuredClone(state.extraUserRequests) : [],
      mailbatches: structuredClone(state.mailbatches),
      websiteSync: admin ? publicSportpaleisWebsiteSync(state) : undefined,
      webshopIntake: productionWorkspace ? structuredClone({ ...state.webshopIntake, sources: (state.webshopIntake.sources ?? []).map(({ dataBase64: _dataBase64, ...source }) => source) }) : undefined,
      mailboxRouting: productionWorkspace && !reviewDeveloper ? publicSportpaleisMailboxRouting(state.mailboxRouting, this.mailboxConfiguration) : undefined,
      employeeDirectorySource: admin ? structuredClone(state.employeeDirectorySource) : undefined,
      productionElements: productionWorkspace ? structuredClone(state.productionElements.map((element) => {
        const decision = executableProductionAssetDecision(element);
        const executability = element.sourceId && element.controlledVector?.geometryHash && element.sourceLayers?.vectorSource?.sha256
          ? { contract: "SERVER_PROJECTED_PRODUCTION_ASSET_EXECUTABILITY_V1", allowed: decision.allowed, code: decision.code, reason: decision.reason, assetId: element.id, assetVersion: element.version ?? String(element.revision), sourceId: element.sourceId, sourceSha256: element.sourceLayers.vectorSource.sha256, geometrySha256: element.controlledVector.geometryHash }
          : undefined;
        return { ...element, executability, controlledVector: element.controlledVector ? (({ contours: _contours, ...metadata }) => metadata)(element.controlledVector) : undefined, numberGlyphs: element.numberGlyphs ? Object.fromEntries(Object.entries(element.numberGlyphs).map(([glyph, value]) => [glyph, (({ contours: _contours, ...metadata }) => metadata)(value)])) : undefined, sourceLayers: element.sourceLayers ? Object.fromEntries(Object.entries(element.sourceLayers).map(([key, value]) => [key, value ? (({ dataBase64: _dataBase64, ...metadata }) => metadata)(value) : null])) : undefined };
      })) : [],
      productionAssetSources: admin ? structuredClone((state.productionAssetSources ?? []).map((source) => ({ ...(({ documentPreviewSvg: _documentPreviewSvg, ...metadata }) => metadata)(source), original: (({ dataBase64: _dataBase64, ...metadata }) => metadata)(source.original), candidates: source.candidates.map((candidate) => (({ previewSvg: _previewSvg, controlledVector: _controlledVector, ...metadata }) => metadata)(candidate)) }))) : [],
      productionFonts: structuredClone(state.productionFonts.map(({ sourceDataBase64: _sourceDataBase64, ...font }) => font)),
      productionElementRequirements: productionWorkspace ? structuredClone(state.productionElementRequirements) : [],
      productionInventory: productionWorkspace ? sportpaleisProductionInventoryView(state) : [],
      productionJobs: productionWorkspace ? structuredClone(bootstrapJobs) : [],
      productionHistory: productionWorkspace ? { total: sortedOperationalJobs.length, loaded: bootstrapJobs.length, pageSize: PRODUCTION_HISTORY_PAGE_LIMIT, bounded: true } : { total: 0, loaded: 0, pageSize: PRODUCTION_HISTORY_PAGE_LIMIT, bounded: true },
      productionProposals: productionWorkspace ? structuredClone(operationalProposals).sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.proposalNumber.localeCompare(left.proposalNumber)) : [],
      teamkitProposals: user.featureExposure?.teamwearExperiencePilot === true ? state.teamkitProposals.filter(({ status }) => status !== "ARCHIVED").map(publicProposal).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt) || right.proposalNumber.localeCompare(left.proposalNumber)) : [],
      quickProductionIntakes: productionWorkspace ? state.quickProductionIntakes.map(publicQuickProductionIntake).sort((left, right) => right.createdAt.localeCompare(left.createdAt)) : [],
      visualCompositions: productionWorkspace ? state.visualCompositions.map(publicVisualComposition).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)) : [],
      creativeVectorDrafts: productionWorkspace ? state.creativeVectorDrafts.map(publicCreativeVectorDraft).sort((left, right) => right.createdAt.localeCompare(left.createdAt)) : [],
      preferences: { [user.id]: structuredClone(state.preferences[user.id] ?? defaultPreference()) },
      articles: structuredClone(state.articles.filter(({ active }) => admin || active)),
      associations: structuredClone(state.associations),
      configurationVersion: state.configurationVersion,
      productionProfiles: structuredClone(state.productionProfiles),
      settings: admin ? structuredClone(state.settings) : { processingDays: state.settings.processingDays, deliveryFeeEur: state.settings.deliveryFeeEur, productionDefaults: structuredClone(state.settings.productionDefaults) },
      foilRolls: admin ? structuredClone(state.foilRolls) : [],
      commercialAdministration: admin ? {
        sourceLabel: "Sportpaleis Workspace Pilot Foundation 006",
        seats: {
          customerSeats: state.users.filter(({ seatType }) => seatType === "customer").length,
          activeCustomerSeats: state.users.filter(({ seatType, status }) => seatType === "customer" && status === "Actief").length,
          supportAccessOutsideSeats: state.users.some(({ seatType }) => seatType === "support"),
          pendingExtraUserRequests: state.extraUserRequests.filter(({ status }) => status === "Aangevraagd").length,
        },
        agreements: [
          { label: "Klanttoegang", value: "3 klantseats voor Sportpaleis", source: "Pilot Foundation 006 · Rollen" },
          { label: "Technische ondersteuning", value: "Donovan/WBD-toegang valt buiten de drie klantseats", source: "Pilot Foundation 006 · Rollen" },
          { label: "Financiële bron", value: "Alleen gevalideerde bronbedragen tonen; ontbrekende waarden blijven onbekend", source: "Pilot Foundation 006 · Beheergrens" },
        ],
        subscription: { status: "Niet gekoppeld", monthlyPriceEur: null, source: "Geen gevalideerde abonnementsbron aangesloten" },
        invoices: { status: "Geen factuurbron aangesloten", records: [], source: "Geen gevalideerde WBD-factuurrecords in Workspace" },
      } : undefined,
      audit: state.audit.filter((entry) => admin || entry.userId === user.id || entry.subject.startsWith("SP-") || entry.subject === "SNIJTEST-001").slice(0, 100),
      capabilities: { admin, operator: user.role === "operator", store: user.role === "store", support: user.role === "support", reviewDeveloper, workContexts: publicUser(user).workContexts, deviceMode: session.deviceMode ?? "SHARED", authMethod: session.authMethod ?? "PASSWORD", quickPinEnabled: state.users.some(({ quickPin }) => Boolean(quickPin?.hash)), teamwearExperiencePilot: user.featureExposure?.teamwearExperiencePilot === true, creativeStudio: this.creativeStudioEnabled && ["admin", "operator"].includes(user.role), reviewMode: reviewModeAllowed(user, this.reviewPrincipalIds, this.reviewCandidates), demo: Boolean(session.demo), demoEnabled: this.demoMode, uploadsEnabled: reviewSafeInteract ? true : reviewDeveloper ? false : this.uploadsEnabled, productionAssetUploadsEnabled: reviewSafeInteract ? true : reviewDeveloper ? false : this.productionAssetUploadsEnabled, fontUploadsEnabled: reviewSafeInteract ? true : reviewDeveloper ? false : admin && this.fontUploadsEnabled, mailMode: reviewDeveloper ? "disabled" : this.mailMode, barcodeEnabled: false, barcodeHardwareValidated: false, hardwareSendEnabled: false },
      releaseId: this.releaseId,
    };
  }

  async productionJobHistory(token, input = {}) {
    const { state, user } = await this.authenticate(token); assertRole(user, ["admin", "operator"]);
    const finalCleanStartOrder = (order) => order.deletion?.byUserId === "system:final-clean-start"
      || (order.eventHistory ?? []).some((event) => event.source === "final-clean-start");
    const operationalOrderIds = new Set(state.orders.filter((order) => !finalCleanStartOrder(order)).map(({ id }) => id));
    const knownOrderIds = new Set(state.orders.map(({ id }) => id));
    const query = String(input.query ?? "").trim().toLocaleLowerCase("nl-NL").slice(0, 160);
    const limit = Math.min(PRODUCTION_HISTORY_PAGE_LIMIT_MAX, Math.max(1, Number(input.limit) || PRODUCTION_HISTORY_PAGE_LIMIT));
    const sorted = state.productionJobs
      .filter(({ snapshot }) => snapshot.orderIds.some((id) => operationalOrderIds.has(id)) || snapshot.orderIds.every((id) => !knownOrderIds.has(id)))
      .filter((job) => !query || [job.jobNumber, job.snapshot.association, job.initiatedBy.name, job.status, job.proofStatus, job.snapshot.productionGroup?.foilColor, ...job.snapshot.orderIds, ...job.snapshot.elements.flatMap(({ type, value }) => [type, value])].join(" ").toLocaleLowerCase("nl-NL").includes(query))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.jobNumber.localeCompare(left.jobNumber));
    const cursorIndex = input.cursor ? sorted.findIndex(({ id }) => id === input.cursor) : -1;
    const offset = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    const items = sorted.slice(offset, offset + limit);
    return { items: structuredClone(items), total: sorted.length, pageSize: limit, query, nextCursor: offset + items.length < sorted.length ? items.at(-1)?.id ?? null : null, bounded: true };
  }

  async orderHistory(token, input = {}) {
    const { state, user } = await this.authenticate(token); assertRole(user, ["admin", "operator", "store"]);
    const finalCleanStartOrder = (order) => order.deletion?.byUserId === "system:final-clean-start"
      || (order.eventHistory ?? []).some((event) => event.source === "final-clean-start");
    const query = String(input.query ?? "").trim().toLocaleLowerCase("nl-NL").slice(0, 160);
    const limit = Math.min(ORDER_HISTORY_PAGE_LIMIT_MAX, Math.max(1, Number(input.limit) || ORDER_HISTORY_PAGE_LIMIT));
    const searchable = (order) => [
      order.id, order.externalReference, order.sourceContext?.externalReference, order.customer, order.customerEmail,
      order.customerPhone, order.association, ...(order.associations ?? []), order.teamContext,
      ...(order.items ?? []).flatMap(({ product, articleNumber, personalization, size }) => [product, articleNumber, personalization, size]),
    ].filter(Boolean).join(" ").toLocaleLowerCase("nl-NL");
    const sorted = state.orders
      .filter((order) => !finalCleanStartOrder(order))
      .filter((order) => !query || searchable(order).includes(query))
      .sort((left, right) => String(right.updatedAt ?? right.createdAt ?? "").localeCompare(String(left.updatedAt ?? left.createdAt ?? "")) || right.id.localeCompare(left.id));
    const cursorIndex = input.cursor ? sorted.findIndex(({ id }) => id === input.cursor) : -1;
    const offset = cursorIndex >= 0 ? cursorIndex + 1 : 0;
    const items = sorted.slice(offset, offset + limit).map((order) => publicOrderWithProductionTruth(state, order));
    return { items: structuredClone(items), total: sorted.length, pageSize: limit, query, nextCursor: offset + items.length < sorted.length ? items.at(-1)?.id ?? null : null, bounded: true };
  }

  async order(token, orderId) {
    const { state, user } = await this.authenticate(token); assertRole(user, ["admin", "operator", "store"]);
    const order = state.orders.find((candidate) => candidate.id === orderId
      && candidate.deletion?.byUserId !== "system:final-clean-start"
      && !(candidate.eventHistory ?? []).some((event) => event.source === "final-clean-start"));
    if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
    return structuredClone(publicOrderWithProductionTruth(state, order));
  }

  async productionJob(token, productionJobId) {
    const { state, user } = await this.authenticate(token); assertRole(user, ["admin", "operator"]);
    const cleanStartOrderIds = new Set(state.orders.filter((order) => order.deletion?.byUserId === "system:final-clean-start" || (order.eventHistory ?? []).some((event) => event.source === "final-clean-start")).map(({ id }) => id));
    const job = state.productionJobs.find(({ id, snapshot }) => id === productionJobId && !snapshot.orderIds.some((orderId) => cleanStartOrderIds.has(orderId)));
    if (!job) throw Object.assign(new Error("Productiejob niet gevonden."), { statusCode: 404, code: "PRODUCTION_JOB_NOT_FOUND" });
    return structuredClone(job);
  }

  async assertTeamwearPilotAccess(token) {
    const { user } = await this.authenticate(token);
    if (user.featureExposure?.teamwearExperiencePilot !== true) {
      throw Object.assign(new Error("Deze Teamwear-pilot is niet voor dit account vrijgegeven."), { statusCode: 403, code: "TEAMWEAR_PILOT_NOT_ENABLED" });
    }
    return { principalId: user.id, enabled: true };
  }

  async currentRevision(token) {
    const { state } = await this.authenticate(token);
    return { revision: state.revision };
  }

  async searchTeamwearCatalog(token, input = {}) {
    const { state, user } = await this.authenticate(token);
    if (user.featureExposure?.teamwearExperiencePilot !== true) throw Object.assign(new Error("Deze Teamwear-pilot is niet voor dit account vrijgegeven."), { statusCode: 403, code: "TEAMWEAR_PILOT_NOT_ENABLED" });
    const startedAt = performance.now();
    const query = optional(input.query, 160); const brand = optional(input.brand, 80); const use = optional(input.use, 40).toLocaleUpperCase() || undefined; const audience = optional(input.audience, 40).toLocaleUpperCase() || undefined;
    const offset = Math.max(0, Number(input.offset ?? 0)); const limit = Math.max(1, Math.min(48, Number(input.limit ?? 24)));
    const products = currentTeamwearCatalogProjection(state, { brand: brand || null, use: use ?? null });
    const catalogPage = querySportpaleisProductCatalog(products, { query, audience: audience ?? null, offset, limit });
    const page = { products: catalogPage.products, total: catalogPage.total, nextOffset: catalogPage.hasMore ? offset + limit : null };
    return { ...page, bounded: true, resolver: "CANONICAL_PRODUCT_CATALOG_V1", normalizedQuery: query.toLocaleLowerCase("nl-NL"), normalizedFilters: { brand: brand || null, use: use ?? null, audience: audience ?? null }, stateRevision: state.revision, elapsedMs: Math.round((performance.now() - startedAt) * 1000) / 1000 };
  }

  async createTeamkitProposal(token, csrfToken, payload, idempotencyKey = null) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      state.teamkitProposals ??= [];
      const create = () => {
        const year = new Date().getUTCFullYear();
        const highest = state.teamkitProposals.reduce((value, proposal) => Math.max(value, Number(String(proposal.proposalNumber).match(/(\d+)$/u)?.[1] ?? 0)), 0);
        const now = iso(); const id = `teamkit-proposal-${randomBytes(10).toString("hex")}`;
        const associationName = optional(payload.associationName, 160) || null;
        const association = associationName ? state.associations.find(({ id: associationId, name }) => associationId === payload.associationId || name === associationName) : null;
        const requestedCustomerId = optional(payload.customerId, 160) || null;
        const reusableCustomerId = !association && requestedCustomerId && state.teamkitProposals.some((candidate) => !candidate.association.id && candidate.customer.id === requestedCustomerId) ? requestedCustomerId : null;
        const proposal = {
          id, proposalNumber: `PV-${year}-${String(highest + 1).padStart(4, "0")}`, aggregateRevision: 1, currentRevision: 1, status: "DRAFT",
          title: requiredText(payload.title, "Interne titel", 180), type: optional(payload.type, 120) || "Teamkit",
          customer: { id: association ? null : reusableCustomerId ?? `customer-context-${randomBytes(10).toString("hex")}`, name: optional(payload.customerName, 160) || requiredText(payload.title, "Werkreferentie", 180), contactName: optional(payload.contactName, 160) || "", email: optionalEmail(payload.customerEmail), phone: optional(payload.customerPhone, 40) || null },
          association: { id: association?.id ?? (optional(payload.associationId, 160) || null), name: association?.name ?? associationName },
          team: optional(payload.team, 120) || null, season: optional(payload.season, 80) || null, category: optional(payload.category, 80) || null, deadline: payload.deadline ? new Date(payload.deadline).toISOString() : null,
          notes: optional(payload.notes, 1_500) || null, items: [], sources: [], intake: { status: "NOT_REQUESTED", requestedAt: null, openedAt: null, draftSavedAt: null, submittedAt: null, data: {} },
          customerAccess: null, feedback: [], revisions: [], approval: null, approvalHistory: [], productionSizing: null, fulfillmentTasks: [], deliveryEvidence: [], createdAt: now, createdBy: { id: user.id, name: user.name, role: user.role }, updatedAt: now, updatedBy: { id: user.id, name: user.name, role: user.role }, archivedAt: null, copiedFrom: null,
        };
        const requestedSources = Array.isArray(payload.sources) ? payload.sources : [];
        if (requestedSources.length > 12) throw Object.assign(new Error("Gebruik maximaal twaalf proposalbronnen per atomaire intake."), { statusCode: 400, code: "PROPOSAL_SOURCE_LIMIT" });
        const sourceRefs = new Map();
        for (const upload of requestedSources) {
          const source = inspectTeamkitProposalSource(upload, { proposalId: id, associationName: proposal.association.name, uploaderKind: "EMPLOYEE", uploaderId: user.id, uploaderName: user.name });
          if (!proposal.sources.some(({ sha256: hash }) => hash === source.sha256)) proposal.sources.push(source);
          if (upload.clientRef) sourceRefs.set(requiredText(upload.clientRef, "Lokale bronreferentie", 80), proposal.sources.find(({ sha256: hash }) => hash === source.sha256).id);
        }
        if (payload.items !== undefined) {
          const items = structuredClone(payload.items);
          for (const item of items) {
            if (item.catalogSnapshot?.directFrontSourceRef) {
              if (!sourceRefs.has(item.catalogSnapshot.directFrontSourceRef)) throw Object.assign(new Error("De directe voorkantbron ontbreekt in deze atomaire proposal-intake."), { statusCode: 409, code: "TEAMKIT_DIRECT_PRODUCT_SOURCE_INVALID" });
              item.catalogSnapshot.directFrontSourceId = sourceRefs.get(item.catalogSnapshot.directFrontSourceRef);
            }
            if (item.catalogSnapshot?.directBackSourceRef) {
              if (!sourceRefs.has(item.catalogSnapshot.directBackSourceRef)) throw Object.assign(new Error("De directe achterkantbron ontbreekt in deze atomaire proposal-intake."), { statusCode: 409, code: "TEAMKIT_DIRECT_PRODUCT_SOURCE_INVALID" });
              item.catalogSnapshot.directBackSourceId = sourceRefs.get(item.catalogSnapshot.directBackSourceRef);
            }
            const directSourceIds = [item.catalogSnapshot?.directFrontSourceId, item.catalogSnapshot?.directBackSourceId].filter(Boolean);
            if (directSourceIds.some((sourceId) => !proposal.sources.some(({ id: candidate }) => candidate === sourceId))) throw Object.assign(new Error("De directe artikelbron hoort niet bij deze atomaire proposal-intake."), { statusCode: 409, code: "TEAMKIT_DIRECT_PRODUCT_SOURCE_INVALID" });
          }
          proposal.items = normalizeTeamkitItemsWithCanonicalProductTruth(state, items, proposal.sources);
          resolveTeamkitPlacementProductionRules(state, proposal, 1);
        }
        proposal.revisions.push(createProposalRevision(proposal, { id: user.id, name: user.name, role: user.role }, proposal.sources.length || proposal.items.length ? "Source-first voorstel atomair aangemaakt" : "Voorstel aangemaakt", [], new Date(), state));
        state.teamkitProposals.unshift(proposal);
        audit(state, user.id, "Voorstel atomair aangemaakt", proposal.id, { proposalNumber: proposal.proposalNumber, association: proposal.association.name, sourceCount: proposal.sources.length, itemCount: proposal.items.length, idempotencyKey: idempotencyKey ?? null });
        return publicProposal(proposal);
      };
      const outcome = idempotencyKey ? idempotent(state, idempotencyKey, user.id, "CREATE_TEAMKIT_PROPOSAL", create, payload) : { duplicate: false, value: create() };
      return { state, value: outcome.value };
    }); return result.value;
  }

  async updateTeamkitProposal(token, csrfToken, proposalId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId); if (!proposal) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
      if (proposal.aggregateRevision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Dit voorstel is ondertussen gewijzigd. Vernieuw eerst de pagina."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: proposal.aggregateRevision });
      if (proposal.status === "APPROVED" && payload.reopenApproved !== true) throw Object.assign(new Error("De goedgekeurde versie is immutable. Start expliciet een nieuwe revision."), { statusCode: 409, code: "APPROVED_REVISION_IMMUTABLE" });
      const priorApprovalRevision = proposal.approval?.revision ?? null;
      if (proposal.status === "APPROVED" && proposal.approval) { proposal.approvalHistory ??= []; if (!proposal.approvalHistory.some(({ revision }) => revision === proposal.approval.revision)) proposal.approvalHistory.push(structuredClone(proposal.approval)); proposal.approval = null; proposal.productionSizing = null; }
      proposal.title = payload.title === undefined ? proposal.title : requiredText(payload.title, "Titel", 180);
      proposal.type = payload.type === undefined ? proposal.type : requiredText(payload.type, "Voorsteltype", 120);
      if (payload.customer) proposal.customer = { id: proposal.customer.id ?? (!proposal.association.id ? `customer-context-${randomBytes(10).toString("hex")}` : null), name: requiredText(payload.customer.name, "Klant", 160), contactName: optional(payload.customer.contactName, 160) || "", email: optionalEmail(payload.customer.email), phone: optional(payload.customer.phone, 40) || null };
      if (payload.association) { const match = state.associations.find(({ id, name }) => id === payload.association.id || name === payload.association.name); proposal.association = { id: match?.id ?? (optional(payload.association.id, 160) || null), name: match?.name ?? (optional(payload.association.name, 160) || null) }; }
      for (const key of ["team", "season", "category", "notes"]) if (Object.hasOwn(payload, key)) proposal[key] = optional(payload[key], key === "notes" ? 1_500 : 160) || null;
      if (Object.hasOwn(payload, "deadline")) proposal.deadline = payload.deadline ? new Date(payload.deadline).toISOString() : null;
      if (payload.items) {
        const items = structuredClone(payload.items);
        const association = state.associations.find(({ id, name }) => id === proposal.association.id || name === proposal.association.name);
        for (const item of items) {
          const directSourceIds = [item.catalogSnapshot?.directFrontSourceId, item.catalogSnapshot?.directBackSourceId].filter(Boolean);
          if (directSourceIds.some((sourceId) => !proposal.sources.some(({ id }) => id === sourceId))) throw Object.assign(new Error("De directe artikelbron hoort niet bij dit voorstel."), { statusCode: 409, code: "TEAMKIT_DIRECT_PRODUCT_SOURCE_INVALID" });
        }
        for (const item of items) for (const placement of item.placements ?? []) {
          const sharedMatch = String(placement.sourceId ?? "").match(/^shared-source:([^:]+):(.+)$/u);
          if (sharedMatch) {
            const [, originProposalId, originSourceId] = sharedMatch;
            const origin = state.teamkitProposals?.find(({ id }) => id === originProposalId);
            const originSource = origin?.sources.find(({ id }) => id === originSourceId);
            const sameAssociation = Boolean(proposal.association.id && origin?.association.id === proposal.association.id);
            const sameCustomer = Boolean(!proposal.association.id && !origin?.association.id && proposal.customer.id && origin?.customer.id === proposal.customer.id);
            if (!origin || !originSource?.dataBase64 || (!sameAssociation && !sameCustomer)) throw Object.assign(new Error("Dit asset hoort niet bij deze klant- of verenigingscontext."), { statusCode: 403, code: "TEAMWEAR_SHARED_ASSET_FORBIDDEN" });
            let source = proposal.sources.find(({ sha256 }) => sha256 === originSource.sha256);
            if (!source) {
              source = inspectTeamkitProposalSource({ filename: originSource.filename, mimeType: originSource.mimeType, dataBase64: originSource.dataBase64 }, { proposalId, associationName: proposal.association.name, uploaderKind: "EMPLOYEE", uploaderId: user.id, uploaderName: user.name });
              source.libraryOrigin = { proposalId: origin.id, sourceId: originSource.id, sha256: originSource.sha256 };
              proposal.sources.push(source);
              audit(state, user.id, "Gedeeld contextasset in voorstel hergebruikt", proposal.id, { sourceId: source.id, originProposalId: origin.id, originSourceId: originSource.id, sha256: source.sha256 });
            }
            placement.sourceId = source.id;
            continue;
          }
          const match = String(placement.sourceId ?? "").match(/^association-logo:([^:]+):([A-Fa-f0-9]{64})$/u);
          if (!match) continue;
          const [, associationId, expectedSha256] = match;
          if (!association?.workspaceLogo || association.id !== associationId || association.workspaceLogo.sha256.toUpperCase() !== expectedSha256.toUpperCase()) throw Object.assign(new Error("Het verenigingslogo is ondertussen gewijzigd. Kies het logo opnieuw."), { statusCode: 409, code: "ASSOCIATION_LOGO_CHANGED" });
          let source = proposal.sources.find(({ sha256 }) => sha256.toUpperCase() === expectedSha256.toUpperCase());
          if (!source) {
            const logoBytes = Buffer.from(association.workspaceLogo.dataBase64, "base64"); const storedAsWebp = logoBytes.subarray(0, 4).toString("ascii") === "RIFF" && logoBytes.subarray(8, 12).toString("ascii") === "WEBP";
            const filename = storedAsWebp ? association.workspaceLogo.filename.replace(/\.[^.]+$/u, ".webp") : association.workspaceLogo.filename;
            source = inspectTeamkitProposalSource({ filename, mimeType: storedAsWebp ? "image/webp" : association.workspaceLogo.mimeType, dataBase64: association.workspaceLogo.dataBase64 }, { proposalId, associationName: proposal.association.name, uploaderKind: "EMPLOYEE", uploaderId: user.id, uploaderName: user.name });
            proposal.sources.push(source);
            audit(state, user.id, "Verenigingslogo als immutable voorstelbron vastgelegd", proposal.id, { sourceId: source.id, associationId: association.id, sha256: source.sha256 });
          }
          placement.sourceId = source.id;
        }
        proposal.items = normalizeTeamkitItemsWithCanonicalProductTruth(state, items, proposal.sources);
        resolveTeamkitPlacementProductionRules(state, proposal, proposal.currentRevision + 1);
      }
      proposal.currentRevision += 1; proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: user.id, name: user.name, role: user.role };
      if (proposal.status === "APPROVED") proposal.status = "IN_DESIGN"; else if (["DRAFT", "READY_FOR_DESIGN", "CUSTOMER_FEEDBACK", "READY_FOR_REVIEW"].includes(proposal.status)) proposal.status = "IN_DESIGN";
      const feedbackIds = Array.isArray(payload.feedbackIds) ? payload.feedbackIds.map(String) : [];
      for (const feedback of proposal.feedback.filter(({ id }) => feedbackIds.includes(id))) { feedback.status = "PROCESSED"; feedback.processedAt = proposal.updatedAt; feedback.processedBy = user.id; }
      const revision = createProposalRevision(proposal, { id: user.id, name: user.name, role: user.role }, optional(payload.reason, 500) || (priorApprovalRevision ? `Nieuwe revision na akkoord V${priorApprovalRevision}` : "Voorstelinhoud bijgewerkt"), feedbackIds, new Date(), state);
      proposal.revisions.push(revision); audit(state, user.id, priorApprovalRevision ? "Nieuwe voorstelrevision na akkoord" : "Voorstelrevision gemaakt", proposal.id, { proposalNumber: proposal.proposalNumber, revision: revision.number, snapshotHash: revision.snapshotHash, feedbackIds });
      return { state, value: publicProposal(proposal) };
    }); return result.value;
  }

  async issueTeamkitCustomerLink(token, csrfToken, proposalId) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    const issued = createCustomerAccess();
    const result = await this.store.mutate(async (state) => {
      const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId); if (!proposal) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
      if (proposal.customerAccess) proposal.customerAccess.revokedAt = iso();
      const intakePhase = ["DRAFT", "WAITING_FOR_CUSTOMER_INPUT", "READY_FOR_DESIGN"].includes(proposal.status);
      proposal.customerAccess = issued.access; if (intakePhase) { proposal.intake.status = "REQUESTED"; proposal.intake.requestedAt = iso(); proposal.status = "WAITING_FOR_CUSTOMER_INPUT"; } proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: user.id, name: user.name, role: user.role };
      audit(state, user.id, "Veilige voorstelklantlink gemaakt", proposal.id, { proposalNumber: proposal.proposalNumber, accessContextId: issued.access.id, expiresAt: issued.access.expiresAt, purpose: intakePhase ? "INTAKE" : "REVIEW" });
      return { state, value: { proposal: publicProposal(proposal), path: `/voorstel/${issued.token}`, expiresAt: issued.access.expiresAt } };
    }); return result.value;
  }

  async addTeamkitProposalSource(token, csrfToken, proposalId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    if (!this.uploadsEnabled) throw Object.assign(new Error("Bronuploads zijn uitgeschakeld."), { statusCode: 403, code: "UPLOADS_DISABLED" });
    const result = await this.store.mutate(async (state) => {
      const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId); if (!proposal) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
      const source = inspectTeamkitProposalSource(payload, { proposalId, associationName: proposal.association.name, uploaderKind: "EMPLOYEE", uploaderId: user.id, uploaderName: user.name });
      const duplicate = proposal.sources.find(({ sha256: hash }) => hash === source.sha256); if (duplicate) return { state, value: { source: publicProposal({ ...proposal, sources: [duplicate] }).sources[0], duplicate: true } };
      proposal.sources.push(source); proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: user.id, name: user.name, role: user.role };
      audit(state, user.id, "Voorstelbron geüpload", proposal.id, { sourceId: source.id, filename: source.filename, mimeType: source.mimeType, sha256: source.sha256, quality: source.quality.status });
      return { state, value: { source: publicProposal({ ...proposal, sources: [source] }).sources[0], duplicate: false } };
    }); return result.value;
  }

  async linkTeamkitProposalSource(token, csrfToken, proposalId, sourceId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId); const source = proposal?.sources.find(({ id }) => id === sourceId);
      if (!proposal || !source) throw Object.assign(new Error("Voorstelbron niet gevonden."), { statusCode: 404, code: "PROPOSAL_SOURCE_NOT_FOUND" });
      if (proposal.aggregateRevision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Dit voorstel is ondertussen gewijzigd. Vernieuw eerst de pagina."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: proposal.aggregateRevision });
      const productionSourceId = requiredText(payload.productionSourceId, "Production Asset-bron", 180);
      const productionSource = state.productionAssetSources?.find(({ id }) => id === productionSourceId);
      if (!productionSource || productionSource.original.sha256 !== source.sha256) throw Object.assign(new Error("De Production Asset-bron komt niet exact overeen met de immutable voorstelbron."), { statusCode: 409, code: "PROPOSAL_SOURCE_HASH_MISMATCH" });
      source.promotedProductionSourceId = productionSource.id; proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: user.id, name: user.name, role: user.role };
      audit(state, user.id, "Voorstelbron gekoppeld aan Production Assets", proposal.id, { sourceId, productionSourceId, sha256: source.sha256, proposalNumber: proposal.proposalNumber });
      return { state, value: publicProposal(proposal) };
    }); return result.value;
  }

  async setTeamkitProposalStatus(token, csrfToken, proposalId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const allowed = new Set(["IN_DESIGN", "READY_FOR_REVIEW", "READY_FOR_APPROVAL", "ARCHIVED"]); const status = String(payload.status ?? "");
    if (status === "SENT_TO_CUSTOMER") throw Object.assign(new Error("Een voorstel geldt pas als verstuurd nadat de gecontracteerde mailroute deliverybewijs heeft vastgelegd."), { statusCode: 409, code: "PROPOSAL_DELIVERY_EVIDENCE_REQUIRED" });
    if (!allowed.has(status)) throw Object.assign(new Error("Deze status kan alleen via de bijbehorende veilige flow worden gezet."), { statusCode: 400, code: "PROPOSAL_STATUS_INVALID" });
    const result = await this.store.mutate(async (state) => {
      const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId); if (!proposal) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
      if (proposal.aggregateRevision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Dit voorstel is ondertussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: proposal.aggregateRevision });
      if (proposal.status === "APPROVED" && status !== "ARCHIVED") throw Object.assign(new Error("Een approved proposal blijft immutable."), { statusCode: 409, code: "APPROVED_REVISION_IMMUTABLE" });
      if (["READY_FOR_REVIEW", "READY_FOR_APPROVAL"].includes(status) && !proposal.items.length) throw Object.assign(new Error("Voeg minimaal één artikel toe voordat dit voorstel naar de klant gaat."), { statusCode: 409, code: "PROPOSAL_ITEMS_REQUIRED" });
      if (status === "READY_FOR_APPROVAL") {
        const revision = proposal.revisions.find(({ number }) => number === proposal.currentRevision);
        if (!revision) throw Object.assign(new Error("De exacte voorstelversie ontbreekt."), { statusCode: 409, code: "PROPOSAL_REVISION_MISSING" });
        assertImmutableAuthoritativeProposalVisualProof(revision.snapshot);
      }
      proposal.status = status; proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: user.id, name: user.name, role: user.role }; if (status === "ARCHIVED") proposal.archivedAt = proposal.updatedAt;
      audit(state, user.id, status === "READY_FOR_APPROVAL" ? "Goedkeuring gevraagd" : status === "ARCHIVED" ? "Voorstel gearchiveerd" : "Voorstelstatus gewijzigd", proposal.id, { status, revision: proposal.currentRevision });
      return { state, value: publicProposal(proposal) };
    }); return result.value;
  }

  async copyTeamkitProposal(token, csrfToken, proposalId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const source = state.teamkitProposals?.find(({ id }) => id === proposalId); if (!source) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
      const year = new Date().getUTCFullYear(); const highest = state.teamkitProposals.reduce((value, proposal) => Math.max(value, Number(String(proposal.proposalNumber).match(/(\d+)$/u)?.[1] ?? 0)), 0); const now = iso();
      const copy = structuredClone(source); copy.id = `teamkit-proposal-${randomBytes(10).toString("hex")}`; copy.proposalNumber = `PV-${year}-${String(highest + 1).padStart(4, "0")}`; copy.aggregateRevision = 1; copy.currentRevision = 1; copy.status = "DRAFT"; copy.title = optional(payload.title, 180) || `${source.title} — nieuw seizoen`; copy.season = optional(payload.season, 80) || null; copy.customerAccess = null; copy.feedback = []; copy.revisions = []; copy.approval = null; copy.approvalHistory = []; copy.productionSizing = null; copy.fulfillmentTasks = []; copy.deliveryEvidence = []; copy.intake = { status: "NOT_REQUESTED", requestedAt: null, openedAt: null, draftSavedAt: null, submittedAt: null, data: {} }; copy.createdAt = now; copy.createdBy = { id: user.id, name: user.name, role: user.role }; copy.updatedAt = now; copy.updatedBy = { id: user.id, name: user.name, role: user.role }; copy.archivedAt = null; copy.copiedFrom = { proposalId: source.id, approvedRevision: source.approval?.revision ?? source.approvalHistory?.at(-1)?.revision ?? null };
      copy.sources = copy.sources.map((item) => ({ ...item, proposalId: copy.id })); copy.revisions.push(createProposalRevision(copy, { id: user.id, name: user.name, role: user.role }, `Gebruikt als basis vanuit ${source.proposalNumber}`, [], new Date(), state));
      state.teamkitProposals.unshift(copy); audit(state, user.id, "Voorstel gekopieerd", copy.id, { sourceProposalId: source.id, sourceApprovedRevision: source.approval?.revision ?? null, proposalNumber: copy.proposalNumber });
      return { state, value: publicProposal(copy) };
    }); return result.value;
  }

  async publicTeamkitProposal(token, now = new Date()) {
    const result = await this.store.mutate(async (state) => { const proposal = findProposalByCustomerToken(state, token, now); proposal.customerAccess.lastOpenedAt = now.toISOString(); proposal.intake.openedAt ??= now.toISOString(); audit(state, "customer", "Klantformulier geopend", proposal.id, { accessContextId: proposal.customerAccess.id }); return { state, value: customerProposal(proposal) }; }); return result.value;
  }

  async savePublicTeamkitIntake(token, payload, { submit = false } = {}) {
    const result = await this.store.mutate(async (state) => {
      const proposal = findProposalByCustomerToken(state, token); const data = proposalIntakeData(payload.data);
      const uploads = Array.isArray(payload.sources) ? payload.sources.slice(0, 12) : []; let total = proposal.sources.reduce((sum, source) => sum + source.sizeBytes, 0);
      for (const upload of uploads) {
        const source = inspectTeamkitProposalSource(upload, { proposalId: proposal.id, associationName: proposal.association.name, uploaderKind: "CUSTOMER", uploaderId: proposal.customerAccess.id, uploaderName: proposal.customer.contactName }); total += source.sizeBytes;
        if (total > 24 * 1024 * 1024) throw Object.assign(new Error("De totale upload voor dit voorstel is groter dan 24 MB."), { statusCode: 413, code: "PROPOSAL_TOTAL_UPLOAD_LIMIT" });
        if (!proposal.sources.some(({ sha256: hash }) => hash === source.sha256)) { proposal.sources.push(source); audit(state, "customer", "Bron geüpload", proposal.id, { sourceId: source.id, filename: source.filename, mimeType: source.mimeType, sha256: source.sha256, quality: source.quality.status }); }
      }
      proposal.intake.data = { ...proposal.intake.data, ...data }; proposal.intake.status = submit ? "SUBMITTED" : "DRAFT_SAVED"; proposal.intake.draftSavedAt = iso(); if (submit) proposal.intake.submittedAt = iso();
      proposal.status = submit ? "READY_FOR_DESIGN" : "WAITING_FOR_CUSTOMER_INPUT"; proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: proposal.customerAccess.id, name: proposal.customer.contactName, role: "customer" };
      audit(state, "customer", submit ? "Klantformulier ingediend" : "Klantformulier concept opgeslagen", proposal.id, { accessContextId: proposal.customerAccess.id, sourceCount: proposal.sources.length });
      return { state, value: customerProposal(proposal) };
    }); return result.value;
  }

  async savePublicTeamkitFeedback(token, payload) {
    const result = await this.store.mutate(async (state) => {
      const proposal = findProposalByCustomerToken(state, token); const revision = Number(payload.revision);
      if (revision !== proposal.currentRevision) throw Object.assign(new Error("Er is inmiddels een nieuwere versie. Vernieuw de preview voordat u feedback geeft."), { statusCode: 409, code: "PROPOSAL_REVISION_STALE", currentRevision: proposal.currentRevision });
      const kind = allowedValue(payload.kind ?? "GENERAL", ["GENERAL", "ITEM", "PLACEMENT"], "Feedbacksoort"); const decision = allowedValue(payload.decision ?? "CHANGE", ["CORRECT", "CHANGE"], "Feedbackkeuze");
      const feedback = { id: `proposal-feedback-${randomBytes(8).toString("hex")}`, revision, createdAt: iso(), customerName: requiredText(payload.customerName ?? proposal.customer.contactName, "Naam", 160), kind, targetId: optional(payload.targetId, 180) || null, decision, message: requiredText(payload.message, "Feedback", 1_500), status: "OPEN", processedAt: null, processedBy: null };
      proposal.feedback.push(feedback); proposal.status = "CUSTOMER_FEEDBACK"; proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: proposal.customerAccess.id, name: feedback.customerName, role: "customer" };
      audit(state, "customer", "Feedback ontvangen", proposal.id, { feedbackId: feedback.id, revision, kind, targetId: feedback.targetId, decision }); return { state, value: customerProposal(proposal) };
    }); return result.value;
  }

  async approvePublicTeamkitProposal(token, payload) {
    const result = await this.store.mutate(async (state) => {
      const proposal = findProposalByCustomerToken(state, token); const revisionNumber = Number(payload.revision);
      if (proposal.approval?.revision === revisionNumber) return { state, value: customerProposal(proposal) };
      if (!["SENT_TO_CUSTOMER", "READY_FOR_APPROVAL"].includes(proposal.status)) throw Object.assign(new Error("Sportpaleis heeft deze versie nog niet voor akkoord vrijgegeven."), { statusCode: 409, code: "PROPOSAL_APPROVAL_NOT_READY" });
      if (revisionNumber !== proposal.currentRevision) throw Object.assign(new Error("Deze preview is niet meer de actuele versie."), { statusCode: 409, code: "PROPOSAL_REVISION_STALE", currentRevision: proposal.currentRevision });
      const revision = proposal.revisions.find(({ number }) => number === revisionNumber); if (!revision) throw Object.assign(new Error("De exacte voorstelversie ontbreekt."), { statusCode: 409, code: "PROPOSAL_REVISION_MISSING" });
      assertImmutableAuthoritativeProposalVisualProof(revision.snapshot);
      const customerName = requiredText(payload.customerName, "Naam", 160); const customerEmail = validEmail(payload.customerEmail ?? proposal.customer.email); const pdf = await generateProposalPdf(revision.snapshot, true, { state, proposal }); const previewHtml = renderProposalPreview(revision.snapshot, { customer: true });
      proposal.approval = { revision: revisionNumber, approvedAt: iso(), customerName, customerEmail, accessContextId: proposal.customerAccess.id, snapshotHash: revision.snapshotHash, previewHtml, previewSha256: proposalSha256(previewHtml), pdfBase64: pdf.toString("base64"), pdfSha256: proposalSha256(pdf), artifactFilename: `${proposal.proposalNumber}-V${revisionNumber}-akkoord.pdf` };
      const legacySizingComplete = revision.snapshot.items.length > 0 && revision.snapshot.items.every(({ quantity, sizes }) => Number.isInteger(quantity) && quantity > 0 && Array.isArray(sizes) && sizes.length > 0);
      proposal.productionSizing = legacySizingComplete ? createTeamkitProductionSizing(proposal, revision, revision.snapshot.items.map(({ id, quantity, sizes }) => ({ itemId: id, quantity, sizes })), { id: proposal.customerAccess.id, name: customerName, role: "customer" }, { allowLegacyTotals: true }) : null;
      proposal.approvalHistory ??= []; const nextTasks = approvedFulfillmentTasks(proposal, revision, state); proposal.fulfillmentTasks.push(...nextTasks.filter(({ id }) => !proposal.fulfillmentTasks.some((task) => task.id === id))); proposal.status = "APPROVED"; proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: proposal.customerAccess.id, name: customerName, role: "customer" };
      audit(state, "customer", "Klant akkoord", proposal.id, { proposalNumber: proposal.proposalNumber, revision: revisionNumber, snapshotHash: revision.snapshotHash, previewSha256: proposal.approval.previewSha256, pdfSha256: proposal.approval.pdfSha256, fulfillmentTaskIds: proposal.fulfillmentTasks.map(({ id }) => id) });
      for (const task of proposal.fulfillmentTasks) audit(state, "system", task.kind === "INTERNAL_PRODUCTION" ? "Interne afhandeling voorbereid" : task.kind === "EXTERNAL_SUPPLIER" ? "Uitbesteedtaak voorbereid" : "Afhandelroute vereist", task.id, { proposalId: proposal.id, approvedRevision: revisionNumber, itemId: task.itemId, placementId: task.placementId, route: task.route, assetRef: task.assetRef });
      return { state, value: customerProposal(proposal) };
    }); return result.value;
  }

  async updateTeamkitProductionSizing(token, csrfToken, proposalId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId);
      if (!proposal) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
      if (!proposal.approval || proposal.status !== "APPROVED") throw Object.assign(new Error("Maten en aantallen worden gekoppeld aan de exact goedgekeurde compositie."), { statusCode: 409, code: "TEAMKIT_APPROVAL_REQUIRED" });
      if (proposal.aggregateRevision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Dit voorstel is ondertussen gewijzigd. Vernieuw eerst de pagina."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: proposal.aggregateRevision });
      const revision = proposal.revisions.find(({ number }) => number === proposal.approval.revision);
      if (!revision || revision.snapshotHash !== proposal.approval.snapshotHash) throw Object.assign(new Error("De immutable approved compositie is niet exact beschikbaar."), { statusCode: 409, code: "TEAMKIT_APPROVAL_EVIDENCE_INVALID" });
      const lockedTask = proposal.fulfillmentTasks.find(({ approvedRevision, orderId, status }) => approvedRevision === revision.number && (Boolean(orderId) || ["SENT", "CONFIRMED", "RETURNED", "COMPLETED"].includes(status)));
      if (lockedTask) throw Object.assign(new Error("Maten en aantallen kunnen niet meer wijzigen nadat afhandeling of productie is gestart."), { statusCode: 409, code: "TEAMKIT_PRODUCTION_SIZING_LOCKED" });
      proposal.productionSizing = createTeamkitProductionSizing(proposal, revision, payload.items, user);
      refreshTeamkitFulfillmentSizing(proposal, revision, state);
      proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: user.id, name: user.name, role: user.role };
      audit(state, user.id, "Teamwear maten en aantallen vastgelegd", proposal.id, { approvedRevision: revision.number, sizingRevision: proposal.productionSizing.revision, sizingSnapshotHash: proposal.productionSizing.snapshotHash, items: proposal.productionSizing.items.map(({ itemId, quantity, sizeQuantities }) => ({ itemId, quantity, sizeQuantities })) });
      return { state, value: publicProposal(proposal) };
    }); return result.value;
  }

  async teamkitProposalSource(token, proposalId, sourceId) {
    const { state, user } = await this.authenticate(token); assertRole(user, ["admin", "operator", "store"]); const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId); const source = proposal?.sources.find(({ id }) => id === sourceId);
    if (!source?.dataBase64) throw Object.assign(new Error("Bronbestand niet gevonden."), { statusCode: 404, code: "PROPOSAL_SOURCE_NOT_FOUND" });
    return { bytes: source.safePreviewSvg ? Buffer.from(source.safePreviewSvg, "utf8") : Buffer.from(source.dataBase64, "base64"), mimeType: source.safePreviewSvg ? "image/svg+xml" : source.mimeType, filename: source.filename, sha256: source.sha256, cacheControl: "private, no-store", allowSameOriginFrame: source.format === "PDF" };
  }

  async publicTeamkitProposalSource(token, sourceId) {
    const state = await this.store.read(); const proposal = findProposalByCustomerToken(state, token); const source = proposal.sources.find(({ id }) => id === sourceId); if (!source) throw Object.assign(new Error("Bronbestand niet gevonden."), { statusCode: 404, code: "PROPOSAL_SOURCE_NOT_FOUND" });
    if (!["SVG", "PNG", "JPG", "PDF"].includes(source.format)) throw Object.assign(new Error("Voor dit brontype is geen veilige browserpreview beschikbaar."), { statusCode: 415, code: "PROPOSAL_SOURCE_PREVIEW_UNAVAILABLE" });
    return { bytes: source.safePreviewSvg ? Buffer.from(source.safePreviewSvg, "utf8") : Buffer.from(source.dataBase64, "base64"), mimeType: source.safePreviewSvg ? "image/svg+xml" : source.mimeType, filename: source.filename, sha256: source.sha256, cacheControl: "private, no-store", allowSameOriginFrame: source.format === "PDF" };
  }

  async teamkitProposalPdf(token, proposalId, requestedRevision = null) {
    const { state, user } = await this.authenticate(token); assertRole(user, ["admin", "operator", "store"]); const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId); if (!proposal) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
    if (requestedRevision !== null) { const revisionNumber = Number(requestedRevision); const approved = [proposal.approval, ...(proposal.approvalHistory ?? [])].filter(Boolean).find(({ revision }) => revision === revisionNumber); if (!approved) throw Object.assign(new Error("Deze approved voorstelversie is niet beschikbaar."), { statusCode: 404, code: "PROPOSAL_APPROVED_PDF_NOT_FOUND" }); return { bytes: Buffer.from(approved.pdfBase64, "base64"), mimeType: "application/pdf", filename: approved.artifactFilename, sha256: approved.pdfSha256, cacheControl: "private, no-store", allowSameOriginFrame: true }; }
    const revision = proposal.revisions.find(({ number }) => number === proposal.currentRevision); const bytes = proposal.approval?.revision === proposal.currentRevision ? Buffer.from(proposal.approval.pdfBase64, "base64") : await generateProposalPdf(revision.snapshot, false, { state, proposal });
    return { bytes, mimeType: "application/pdf", filename: proposal.approval?.revision === proposal.currentRevision ? proposal.approval.artifactFilename : `${proposal.proposalNumber}-V${proposal.currentRevision}-concept.pdf`, sha256: proposalSha256(bytes), cacheControl: "private, no-store", allowSameOriginFrame: true };
  }

  async publicTeamkitProposalPdf(token) {
    const state = await this.store.read(); const proposal = findProposalByCustomerToken(state, token); if (!proposal.approval) throw Object.assign(new Error("De definitieve PDF is nog niet beschikbaar."), { statusCode: 404, code: "PROPOSAL_PDF_NOT_AVAILABLE" });
    return { bytes: Buffer.from(proposal.approval.pdfBase64, "base64"), mimeType: "application/pdf", filename: proposal.approval.artifactFilename, sha256: proposal.approval.pdfSha256, cacheControl: "private, no-store", allowSameOriginFrame: true };
  }

  async updateTeamkitFulfillmentTask(token, csrfToken, proposalId, taskId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId); const task = proposal?.fulfillmentTasks.find(({ id }) => id === taskId); if (!proposal || !task) throw Object.assign(new Error("Afhandelingstaak niet gevonden."), { statusCode: 404, code: "PROPOSAL_TASK_NOT_FOUND" });
      if (task.approvedRevision !== proposal.approval?.revision) throw Object.assign(new Error("Deze taak hoort niet bij de immutable approved revision."), { statusCode: 409, code: "PROPOSAL_TASK_REVISION_INVALID" });
      if (Object.hasOwn(payload, "supplierName")) task.supplierName = optional(payload.supplierName, 160) || null;
      if (Object.hasOwn(payload, "orderId") && (optional(payload.orderId, 160) || null) !== task.orderId) throw Object.assign(new Error("Een TK-order wordt uitsluitend atomair via ‘Interne productie klaarzetten’ gekoppeld."), { statusCode: 409, code: "TEAMKIT_ORDER_LINK_MANAGED" });
      transitionTeamkitFulfillmentTask(task, payload);
      task.updatedAt = iso(); proposal.aggregateRevision += 1; proposal.updatedAt = task.updatedAt; proposal.updatedBy = { id: user.id, name: user.name, role: user.role }; audit(state, user.id, "Voorstelafhandeling gewijzigd", task.id, { proposalId: proposal.id, approvedRevision: task.approvedRevision, route: task.route, status: task.status, orderId: task.orderId });
      return { state, value: publicProposal(proposal) };
    }); return result.value;
  }

  async prepareTeamkitInternalProduction(token, csrfToken, proposalId, payload = {}) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId);
      if (!proposal) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
      if (!proposal.approval || proposal.status !== "APPROVED") throw Object.assign(new Error("Alleen een exact goedgekeurd voorstel kan naar interne productie."), { statusCode: 409, code: "TEAMKIT_APPROVAL_REQUIRED" });
      const revision = proposal.revisions.find(({ number }) => number === proposal.approval.revision);
      if (!revision || revision.snapshotHash !== proposal.approval.snapshotHash) throw Object.assign(new Error("De immutable approved revision is niet exact beschikbaar."), { statusCode: 409, code: "TEAMKIT_APPROVAL_EVIDENCE_INVALID" });
      assertImmutableAuthoritativeProposalVisualProof(revision.snapshot);
      const tasks = proposal.fulfillmentTasks.filter(({ approvedRevision, route, kind }) => approvedRevision === revision.number && route === "INTERN_BEDRUKKEN" && kind === "INTERNAL_PRODUCTION");
      if (!tasks.length) throw Object.assign(new Error("Dit voorstel bevat geen interne bedrukking voor de approved revision."), { statusCode: 409, code: "TEAMKIT_INTERNAL_PRODUCTION_EMPTY" });
      const grouped = new Map();
      for (const task of tasks) grouped.set(task.itemId, [...(grouped.get(task.itemId) ?? []), task]);
      const existingOrders = [...grouped.entries()].map(([itemId, itemTasks]) => {
        const linkedIds = [...new Set(itemTasks.map(({ orderId }) => orderId).filter(Boolean))];
        if (linkedIds.length !== 1) return null;
        const order = state.orders.find(({ id }) => id === linkedIds[0]);
        return order?.teamkitContext?.proposalId === proposal.id && order.teamkitContext.approvedRevision === revision.number && order.teamkitContext.itemId === itemId ? order : null;
      });
      if (existingOrders.every(Boolean)) return { state, value: { duplicate: true, proposal: publicProposal(proposal), orders: existingOrders.map((order) => ({ ...order, ...productionStatusForOrder(state, order) })) } };
      if (proposal.productionSizing?.approvedRevision !== revision.number || proposal.productionSizing.items.length !== revision.snapshot.items.length) throw Object.assign(new Error("Vul eerst de maten en aantallen in voor de approved Teamwear-compositie."), { statusCode: 409, code: "TEAMKIT_PRODUCTION_SIZING_REQUIRED" });
      if (payload.expectedRevision !== undefined && proposal.aggregateRevision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Dit voorstel is ondertussen gewijzigd. Vernieuw eerst de pagina."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: proposal.aggregateRevision });
      const orders = [];
      for (const [itemId, itemTasks] of grouped) {
        const item = revision.snapshot.items.find(({ id }) => id === itemId);
        if (!item) throw Object.assign(new Error("Een interne afhandelingstaak mist het immutable approved artikel."), { statusCode: 409, code: "TEAMKIT_ITEM_NOT_FOUND" });
        const deterministicKey = `teamkit-order:${proposal.id}:${revision.number}:${item.id}`;
        const context = {
          kind: "TEAMKIT_APPROVAL",
          proposalId: proposal.id,
          proposalNumber: proposal.proposalNumber,
          approvedRevision: revision.number,
          itemId: item.id,
          itemSnapshotHash: proposalSha256(JSON.stringify(item)),
          productionSizingRevision: proposal.productionSizing.revision,
          productionSizingSnapshotHash: proposal.productionSizing.snapshotHash,
          fulfillmentTaskIds: itemTasks.map(({ id }) => id),
          placementRefs: itemTasks.map((task) => ({ placementId: task.placementId, taskId: task.id, assetId: task.assetRef.productionAssetId ?? task.assetRef.sourceId ?? null, assetVersion: task.assetRef.version ?? null, assetSha256: task.assetRef.sha256 ?? null })),
          materializationUnits: proposal.productionSizing.items.find(({ itemId: sizingItemId }) => sizingItemId === item.id)?.sizeQuantities.map(({ size, quantity }) => ({ groupId: `size-${String(size).normalize("NFKC").toLocaleLowerCase("nl-NL").replace(/[^a-z0-9_-]/gu, "-")}`, size, quantity })) ?? [],
          snapshotHash: revision.snapshotHash,
          previewSha256: proposal.approval.previewSha256,
          pdfSha256: proposal.approval.pdfSha256,
          idempotencyKey: deterministicKey,
        };
        const alreadyExists = state.orders.find(({ teamkitContext }) => teamkitContext?.idempotencyKey === deterministicKey);
        const outcome = alreadyExists ? { duplicate: true, value: alreadyExists } : idempotent(state, deterministicKey, "system:teamkit", "CREATE_TEAMKIT_ORDER", () => createWorkspaceOrderRecord(state, user, teamkitOrderInput(state, proposal, revision, item, itemTasks), { referenceSeries: "TK", teamkitContext: context }));
        const order = state.orders.find(({ id }) => id === outcome.value.id);
        if (!order) throw Object.assign(new Error("De Teamkit-productiereferentie kon niet atomair worden teruggevonden."), { statusCode: 500, code: "TEAMKIT_ORDER_ATOMIC_LINK_FAILED" });
        const status = productionStatusForOrder(state, order);
        for (const task of itemTasks) {
          if (task.orderId && task.orderId !== order.id) throw Object.assign(new Error("Een Teamkit-taak is al aan een andere order gekoppeld."), { statusCode: 409, code: "TEAMKIT_TASK_ORDER_CONFLICT" });
          task.orderId = order.id; task.status = status.productionStatus === "READY" ? "READY" : "HUMAN_CHECK"; task.attention = status.productionStatus === "READY" ? null : status.productionStatusReason; task.updatedAt = iso();
        }
        audit(state, user.id, "Teamkit-afhandeling atomair gekoppeld", order.id, { proposalId: proposal.id, proposalNumber: proposal.proposalNumber, approvedRevision: revision.number, itemId: item.id, fulfillmentTaskIds: itemTasks.map(({ id }) => id), productionStatus: status.productionStatus, productionStatusReason: status.productionStatusReason, idempotencyKey: deterministicKey, plotJobCreated: false });
        orders.push({ ...order, ...status });
      }
      proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: user.id, name: user.name, role: user.role };
      audit(state, user.id, "Human GO · interne Teamkit-productie klaargezet", proposal.id, { proposalNumber: proposal.proposalNumber, approvedRevision: revision.number, orderIds: orders.map(({ id }) => id), plotJobCreated: false });
      return { state, value: { duplicate: false, proposal: publicProposal(proposal), orders } };
    });
    return result.value;
  }

  async inspectProductionFont(token, csrfToken, payload) {
    const { state, user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin"]);
    if (!this.fontUploadsEnabled) throw Object.assign(new Error("Fontuploads zijn in deze omgeving uitgeschakeld."), { statusCode: 403, code: "UPLOADS_DISABLED" });
    const inspection = inspectProductionFontRequest(state, payload);
    return {
      inspectionSha256: inspection.inspectionSha256,
      sourceSha256: inspection.hash,
      filename: inspection.filename,
      metadata: inspection.admissionProof.metadata,
      representativeProofs: inspection.admissionProof.representativeProofs,
      executabilitySha256: inspection.admissionProof.executabilitySha256,
      applicationField: inspection.guidedField,
      productionProfileId: inspection.guidedProfileId,
      associationId: inspection.guidedAssociationId,
      authoritative: false,
    };
  }

  async addProductionFont(token, csrfToken, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin"]);
    if (!this.fontUploadsEnabled) throw Object.assign(new Error("Fontuploads zijn in deze omgeving uitgeschakeld."), { statusCode: 403, code: "UPLOADS_DISABLED" });
    if (payload.humanAcceptance !== true) throw Object.assign(new Error("Controleer de getoonde fontidentity en productiepreview en bevestig daarna de bron."), { statusCode: 409, code: "PRODUCTION_FONT_HUMAN_CONFIRMATION_REQUIRED" });
    const result = await this.store.mutate(async (state) => {
      const { name, filename, bytes, format, hash, guidedProfile, guidedField, guidedAssociationId, admissionProof, inspectionSha256 } = inspectProductionFontRequest(state, payload);
      if (!payload.inspectionSha256 || String(payload.inspectionSha256).toUpperCase() !== inspectionSha256) throw Object.assign(new Error("De bevestiging hoort niet bij de huidige fontbytes, identity en toepassing. Valideer de bron opnieuw."), { statusCode: 409, code: "PRODUCTION_FONT_INSPECTION_MISMATCH" });
      const existing = state.productionFonts.find(({ sha256: candidate }) => candidate === hash);
      if (existing) {
        const admissionDecision = productionFontExecutableDecision(existing, guidedField || "FREE_PRINT");
        if (!admissionDecision.allowed) throw Object.assign(new Error(admissionDecision.reason), { statusCode: 409, code: admissionDecision.code });
        if (guidedProfile) {
          if (guidedProfile.canonicalFontSourceId && guidedProfile.canonicalFontSourceId !== existing.id) throw Object.assign(new Error(`Letterprofiel ${guidedProfile.name} is al aan een andere canonieke fontmaster gekoppeld.`), { statusCode: 409, code: "PRODUCTION_CANONICAL_FONT_CONFLICT", profileId: guidedProfile.id, currentSourceId: guidedProfile.canonicalFontSourceId, requestedSourceId: existing.id });
          guidedProfile.canonicalFontSourceId = existing.id;
          guidedProfile.canonicalFontSourceAuthority = "HUMAN_CONFIRMED_APPLICATION_BINDING";
          audit(state, user.id, "Bestaande productiefont aan toepassing gekoppeld", existing.id, { sha256: hash, profileId: guidedProfile.id, applicationField: guidedField, associationId: guidedAssociationId });
        }
        const { sourceDataBase64: _sourceDataBase64, ...publicFont } = existing; return { state, value: structuredClone(publicFont) };
      }
      try { validateManagedFontBytes(bytes); }
      catch (error) { throw Object.assign(new Error("De fontbron is geen technisch leesbaar outline-font."), { statusCode: 400, code: error?.code ?? "FONT_FILE_INVALID" }); }
      const addedAt = iso(); const id = `font-${hash.slice(0, 16).toLowerCase()}`;
      const provenance = optional(payload.provenance, 500) || `Door ${user.name} toegevoegd via Beheer op ${addedAt}`;
      const applicationBindings = [...new Set([...(guidedField ? [guidedField] : []), ...(payload.allowedInStore !== false ? ["FREE_PRINT"] : [])])];
      if (!applicationBindings.length) throw Object.assign(new Error("Koppel de fontbron aan een concrete lettertoepassing of Vrije opdruk."), { statusCode: 409, code: "PRODUCTION_FONT_APPLICATION_REQUIRED" });
      const font = { id, name, originalFilename: filename, version: hash.slice(0, 12), sha256: hash, mimeType: format.mimeType, sizeBytes: bytes.length, addedAt, uploadedBy: { userId: user.id, name: user.name }, provenance, authority: "ADMIN_VERIFIED_UPLOAD", status: "TECHNICALLY_VALID", allowedInStore: payload.allowedInStore !== false, authoritativeIdentity: id, sourceUrl: `/api/sportpaleis/v1/production-fonts/${id}/source`, sourceDataBase64: bytes.toString("base64"), ...admissionProof.metadata, admission: { lifecycle: "AUTHORITATIVE", sourceType: "FONT", authority: "ADMIN_VERIFIED_UPLOAD", stages: ["STORED", "IDENTIFIED", "VALIDATED", "APPLICATION_COMPATIBLE", "PRODUCTION_EXECUTABLE", "PREVIEWED", "HUMAN_CONFIRMED", "AUTHORITATIVE"], applicationBindings, sourceSha256: admissionProof.sourceSha256, metadata: admissionProof.metadata, representativeProofs: admissionProof.representativeProofs, executabilitySha256: admissionProof.executabilitySha256, confirmedAt: addedAt, confirmedBy: { userId: user.id, name: user.name } } };
      state.productionFonts.push(font);
      const boundProfileIds = [];
      for (const profile of guidedProfile ? [guidedProfile] : []) {
        if (profile.canonicalFontSourceId && profile.canonicalFontSourceId !== id) throw Object.assign(new Error(`Letterprofiel ${profile.name} is al aan een andere canonieke fontmaster gekoppeld.`), { statusCode: 409, code: "PRODUCTION_CANONICAL_FONT_CONFLICT", profileId: profile.id, currentSourceId: profile.canonicalFontSourceId, requestedSourceId: id });
        profile.canonicalFontSourceId = id;
        profile.canonicalFontSourceAuthority = "HUMAN_CONFIRMED_APPLICATION_BINDING";
        boundProfileIds.push(profile.id);
      }
      audit(state, user.id, "Productiefont toegevoegd", id, { sha256: hash, filename, allowedInStore: font.allowedInStore, authoritativeIdentity: id, boundProfileIds, applicationField: guidedField, associationId: guidedAssociationId, admissionLifecycle: font.admission.lifecycle, executabilitySha256: font.admission.executabilitySha256, metadata: font.admission.metadata });
      const { sourceDataBase64: _sourceDataBase64, ...publicFont } = font;
      return { state, value: structuredClone(publicFont) };
    });
    return result.value;
  }

  async productionFontSource(token, fontId) {
    const { state } = await this.authenticate(token); const font = state.productionFonts.find(({ id }) => id === fontId);
    if (!font || font.status !== "TECHNICALLY_VALID") throw Object.assign(new Error("Fontbron niet gevonden."), { statusCode: 404, code: "PRODUCTION_FONT_NOT_FOUND" });
    if (!font.sourceDataBase64) return { redirect: font.sourceUrl };
    return { bytes: Buffer.from(font.sourceDataBase64, "base64"), mimeType: font.mimeType, filename: font.originalFilename, sha256: font.sha256 };
  }

  async productionJobArtifact(token, productionJobId) {
    const { state, user } = await this.authenticate(token); assertRole(user, ["admin", "operator"]);
    const job = state.productionJobs.find(({ id }) => id === productionJobId);
    if (!job) throw Object.assign(new Error("Productiejob niet gevonden."), { statusCode: 404, code: "PRODUCTION_JOB_NOT_FOUND" });
    const artifact = job.snapshot?.artifact;
    if (!artifact?.path || String(artifact.path).startsWith("immutable://")) throw Object.assign(new Error("Voor deze productiejob is geen downloadbaar productieartefact vastgelegd."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_NOT_AVAILABLE" });
    const roots = [...new Set([this.runtimeArtifactRoot, this.artifactRoot])];
    const candidates = roots.map((root) => ({ root, candidate: path.resolve(root, artifact.path) }));
    if (candidates.some(({ root, candidate }) => ![path.resolve(root, "output"), path.resolve(root, "outputs")].some((allowed) => candidate.startsWith(`${allowed}${path.sep}`)))) throw Object.assign(new Error("Het productieartefact valt buiten de gecontroleerde artefactgrens."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_PATH_INVALID" });
    const existing = [];
    for (const { candidate } of candidates) {
      try { existing.push(await readFile(candidate)); } catch (error) { if (error?.code !== "ENOENT") throw error; }
    }
    if (!existing.length) throw Object.assign(new Error("Het vastgelegde productieartefact ontbreekt."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_MISSING" });
    const hashes = existing.map((bytes) => sha256(bytes).toUpperCase());
    if (hashes.some((hash) => hash !== artifact.sha256)) throw Object.assign(new Error("Het vastgelegde productieartefact wijkt af van de immutable hash."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_HASH_MISMATCH" });
    const bytes = existing[0]; const hash = hashes[0];
    const mimeType = artifact.format === "AI" ? "application/illustrator" : artifact.format === "PDF" ? "application/pdf" : artifact.format === "SVG" ? "image/svg+xml" : "application/octet-stream";
    return { bytes, mimeType, filename: artifact.filename, sha256: hash, disposition: "attachment" };
  }

  async createProductionProposal(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const selections = Array.isArray(payload.orders) ? payload.orders : [];
    if (selections.length < 1 || selections.length > 40) throw Object.assign(new Error("Selecteer 1 tot 40 gecontroleerde orders."), { statusCode: 400, code: "VALIDATION_ERROR" });
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "CREATE_PRODUCTION_PROPOSAL", () => {
        const orders = selections.map(({ id, expectedRevision }) => {
          const order = state.orders.find((candidate) => candidate.id === id);
          if (!order) throw Object.assign(new Error(`${id}: order niet gevonden.`), { statusCode: 404, code: "ORDER_NOT_FOUND" });
          if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error(`${order.id}: intussen gewijzigd; ververs de orderselectie.`), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
          const blocker = productionProposalBlockReason(order, state);
          if (blocker) throw Object.assign(new Error(`${order.id}: ${blocker}`), { statusCode: 409, code: "ORDER_NOT_READY" });
          return order;
        });
        const createdAt = iso();
        const overlapping = openProductionProposalOverlap(state, orders.map(({ id }) => id));
        if (overlapping) throw Object.assign(new Error(`Er bestaat al een open productievoorstel ${overlapping.proposalNumber} voor deze fysieke orderwaarheid.`), { statusCode: 409, code: "PRODUCTION_PROPOSAL_ALREADY_OPEN", proposalId: overlapping.id });
        const highest = state.productionProposals.reduce((value, proposal) => Math.max(value, Number(String(proposal.proposalNumber).match(/(\d+)$/u)?.[1] ?? 0)), 0);
        const groups = buildProductionProposalGroups(state, orders);
        const eligibleLineRefs = groups.flatMap(({ productionLineRefs }) => productionLineRefs);
        for (const order of orders) materializeProductionExecutionSnapshot(state, order, user, { reason: "PRODUCTION_PROPOSAL_CREATE", eligibleLineRefs });
        const proposal = {
          id: `production-proposal-${randomBytes(10).toString("hex")}`,
          proposalNumber: `PV-${new Date(createdAt).getUTCFullYear()}-${String(highest + 1).padStart(4, "0")}`,
          createdAt,
          initiatedBy: { userId: user.id, name: user.name, role: user.role },
          orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })),
          groups,
          status: "OPEN",
          productionJobId: null,
          productionJobIds: [],
        };
        state.productionProposals.unshift(proposal);
        audit(state, user.id, "Productievoorstel aangemaakt", proposal.proposalNumber, { orderIds: proposal.orders.map(({ id }) => id), hardwareSendPerformed: false });
        return proposal;
      }, payload);
      return { state, value: outcome };
    });
    return result.value;
  }

  async analyzeProductionEfficiency(token, csrfToken, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const selections = Array.isArray(payload.orders) ? payload.orders : [];
    if (selections.length < 1 || selections.length > 40) throw Object.assign(new Error("Selecteer 1 tot 40 gecontroleerde orders."), { statusCode: 400, code: "VALIDATION_ERROR" });
    const requestedFoilColor = requiredText(payload.foilColor, "Foliekleur", 80);
    const state = await this.store.read();
    const orders = selections.map(({ id, expectedRevision }) => {
      const order = state.orders.find((candidate) => candidate.id === id);
      if (!order) throw Object.assign(new Error(`${id}: order niet gevonden.`), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error(`${order.id}: intussen gewijzigd; ververs de orderselectie.`), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      const blocker = productionProposalBlockReason(order, state);
      if (blocker) throw Object.assign(new Error(`${order.id}: ${blocker}`), { statusCode: 409, code: "ORDER_NOT_READY" });
      return order;
    });
    const proposal = { groups: buildProductionProposalGroups(state, orders) };
    const requestedGroups = proposal.groups.filter(({ foilColor }) => foilColor.toLocaleLowerCase("nl-NL") === requestedFoilColor.toLocaleLowerCase("nl-NL"));
    const currentGroup = requestedGroups.find(({ id }) => productionGroupSequenceState(state, proposal, id) === "CURRENT");
    if (!currentGroup) throw Object.assign(new Error(`${requestedFoilColor} is geen beschikbare OPEN foliekleur.`), { statusCode: 409, code: "PRODUCTION_GROUP_NOT_AVAILABLE" });
    return analyzeProductionEfficiency(state, user, orders, currentGroup, payload.supplement);
  }

  async prepareCurrentProductionGroup(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const selections = Array.isArray(payload.orders) ? payload.orders : [];
    if (selections.length < 1 || selections.length > 40) throw Object.assign(new Error("Selecteer 1 tot 40 gecontroleerde orders."), { statusCode: 400, code: "VALIDATION_ERROR" });
    const requestedFoilColor = requiredText(payload.foilColor, "Foliekleur", 80);
    const idempotencyPayload = {
      orders: selections.map(({ id, expectedRevision }) => ({ id, expectedRevision: Number(expectedRevision) })).sort((left, right) => String(left.id).localeCompare(String(right.id))),
      foilColor: normalizedProductionFoilColor(requestedFoilColor),
      ...(payload.supplement ? { supplement: structuredClone(payload.supplement), efficiencyAnalysisHash: payload.efficiencyAnalysisHash } : {}),
    };
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "PREPARE_CURRENT_PRODUCTION_GROUP", () => {
        const orders = selections.map(({ id, expectedRevision }) => {
          const order = state.orders.find((candidate) => candidate.id === id);
          if (!order) throw Object.assign(new Error(`${id}: order niet gevonden.`), { statusCode: 404, code: "ORDER_NOT_FOUND" });
          if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error(`${order.id}: intussen gewijzigd; ververs de orderselectie.`), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
          const blocker = productionProposalBlockReason(order, state);
          if (blocker) throw Object.assign(new Error(`${order.id}: ${blocker}`), { statusCode: 409, code: "ORDER_NOT_READY" });
          return order;
        });
        const overlapping = openProductionProposalOverlap(state, orders.map(({ id }) => id));
        if (overlapping) throw Object.assign(new Error(`Er bestaat al een open productievoorstel ${overlapping.proposalNumber} voor deze fysieke orderwaarheid.`), { statusCode: 409, code: "PRODUCTION_PROPOSAL_ALREADY_OPEN", proposalId: overlapping.id });
        const groups = buildProductionProposalGroups(state, orders);
        const eligibleLineRefs = groups.flatMap(({ productionLineRefs }) => productionLineRefs);
        for (const order of orders) materializeProductionExecutionSnapshot(state, order, user, { reason: "PRODUCTION_GROUP_PREPARE", eligibleLineRefs });
        const requestedNewGroups = groups.filter(({ foilColor }) => normalizedProductionFoilColor(foilColor) === normalizedProductionFoilColor(requestedFoilColor));
        const mergeTarget = requestedNewGroups.length === 1 ? (state.productionProposals ?? []).flatMap((candidate) => candidate.status === "OPEN"
          ? (candidate.groups ?? []).filter((group) => group.status === "OPEN"
            && productionGroupCompatibilityKey(group) === productionGroupCompatibilityKey(requestedNewGroups[0]))
            .map((group) => ({ proposal: candidate, group }))
          : []).find(({ proposal, group }) => openProductionGroupRevisionsCurrent(state, group) && productionGroupSequenceState(state, proposal, group.id) === "CURRENT") : null;
        const createdAt = iso();
        let proposal;
        if (mergeTarget) {
          proposal = mergeTarget.proposal;
          const proposalOrderIds = new Set(proposal.orders.map(({ id }) => id));
          for (const order of orders) if (!proposalOrderIds.has(order.id)) {
            proposal.orders.push({ id: order.id, expectedRevision: order.revision });
            proposalOrderIds.add(order.id);
          }
          for (const newGroup of groups) {
            const compatible = proposal.groups.find((group) => group.status === "OPEN" && productionGroupCompatibilityKey(group) === productionGroupCompatibilityKey(newGroup));
            if (compatible) mergeOpenProductionGroup(compatible, newGroup);
            else proposal.groups.push(newGroup);
          }
        } else {
          const highest = state.productionProposals.reduce((value, candidate) => Math.max(value, Number(String(candidate.proposalNumber).match(/(\d+)$/u)?.[1] ?? 0)), 0);
          proposal = {
            id: `production-proposal-${randomBytes(10).toString("hex")}`,
            proposalNumber: `PV-${new Date(createdAt).getUTCFullYear()}-${String(highest + 1).padStart(4, "0")}`,
            createdAt,
            initiatedBy: { userId: user.id, name: user.name, role: user.role },
            orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })),
            groups,
            status: "OPEN",
            productionJobId: null,
            productionJobIds: [],
          };
        }
        const requestedGroups = proposal.groups.filter(({ status, foilColor }) => status === "OPEN" && normalizedProductionFoilColor(foilColor) === normalizedProductionFoilColor(requestedFoilColor));
        const currentGroup = requestedGroups.find((group) => (!mergeTarget || productionGroupCompatibilityKey(group) === productionGroupCompatibilityKey(requestedNewGroups[0]))
          && productionGroupSequenceState(state, proposal, group.id) === "CURRENT");
        if (!currentGroup) throw Object.assign(new Error(requestedGroups.length ? "Er is al een andere fysieke kleurstap actief. Rond die eerst af; er is niets opgeslagen." : `${requestedFoilColor} is geen beschikbare OPEN foliekleur; er is niets opgeslagen.`), { statusCode: 409, code: requestedGroups.length ? "PRODUCTION_PHYSICAL_STEP_CONFLICT" : "PRODUCTION_GROUP_NOT_AVAILABLE" });
        if (!managedFoilColor(state, currentGroup.foilColor)) throw Object.assign(new Error("De huidige productiegroep heeft geen actieve beheerde foliekleur."), { statusCode: 409, code: "PRODUCTION_FOIL_COLOR_UNMANAGED" });
        if (payload.supplement) {
          const efficiency = analyzeProductionEfficiency(state, user, orders, currentGroup, payload.supplement);
          if (efficiency.status !== "FIT") throw Object.assign(new Error("Deze extra opdruk past niet aantoonbaar in de bestaande veilige folieruimte."), { statusCode: 409, code: "PRODUCTION_SUPPLEMENT_NO_SAFE_CAPACITY" });
          if (!payload.efficiencyAnalysisHash || payload.efficiencyAnalysisHash !== efficiency.analysisHash) throw Object.assign(new Error("De restcapaciteitscontrole is gewijzigd. Controleer opnieuw; er is niets opgeslagen."), { statusCode: 409, code: "PRODUCTION_EFFICIENCY_ANALYSIS_STALE" });
          currentGroup.supplements = [efficiency.supplement];
          currentGroup.efficiencyEvidence = efficiency.evidence;
        }
        const currentOrders = currentGroup.orders.map(({ id, expectedRevision }) => {
          const order = state.orders.find((candidate) => candidate.id === id);
          if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
          if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error("Een order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
          if (!["ORDER", "CONTROL", "PRINT"].includes(order.stage)) throw Object.assign(new Error("Alle orders moeten klaar voor of in productie zijn."), { statusCode: 409, code: "ORDER_NOT_READY" });
          const selectedLineIds = new Set(currentGroup.productionLineRefs.filter(({ orderId }) => orderId === order.id).map(({ lineId }) => lineId));
          const selectedLines = productionLinesForOrder(state, order).filter(({ id }) => selectedLineIds.has(id));
          if (!selectedLines.length || selectedLines.length !== selectedLineIds.size || selectedLines.some(({ validation }) => validation.status !== "VALID")) throw Object.assign(new Error("Een geselecteerde productieregel is nog geblokkeerd of niet meer exact aanwezig."), { statusCode: 409, code: "PRODUCTION_LINE_BLOCKED" });
          return order;
        });
        const sequence = state.nextProductionJobSequence;
        const jobNumber = `PLOT-${new Date(createdAt).getUTCFullYear()}-${String(sequence).padStart(4, "0")}`;
        const snapshot = buildProductionJobSnapshot(state, currentOrders, jobNumber, createdAt, this.artifactRoot, this.runtimeArtifactRoot, {
          installedProductionAssetRoot: this.installedProductionAssetRoot,
          lineRefs: currentGroup.productionLineRefs,
          foilColor: currentGroup.foilColor,
          sourceChannel: currentGroup.sourceChannel,
          groupId: currentGroup.id,
          groupLabel: currentGroup.label,
          supplements: currentGroup.supplements ?? [],
          efficiencyEvidence: currentGroup.efficiencyEvidence,
        });
        if (snapshot.artifact.format === "MANIFEST") throw Object.assign(new Error("Voor deze regels kan nog geen werkelijk vector-productiebestand worden gemaakt. Koppel eerst de juiste gevalideerde contour- of fontbron."), { statusCode: 409, code: "PRODUCTION_VECTOR_ARTIFACT_UNAVAILABLE" });
        const job = immutableProductionJob({ id: `production-job-${randomBytes(10).toString("hex")}`, jobNumber, createdAt, initiatedBy: { userId: user.id, name: user.name, role: user.role }, kind: "ORIGINAL", originJobId: null, reason: null, snapshot, status: "AWAITING_HUMAN_CHECK", proofStatus: "GEOMETRY_VALIDATED", humanAcceptance: { status: "PENDING", note: "Het immutable vectorbestand is geometrisch gevalideerd. Een nieuwe fysieke Human Acceptance blijft vereist; Workspace stuurt niets naar Illustrator, WinPlot, Summa of hardware." } });
        state.nextProductionJobSequence += 1;
        if (!mergeTarget) state.productionProposals.unshift(proposal);
        state.productionJobs.unshift(job);
        currentGroup.status = "CONVERTED";
        currentGroup.productionJobId = job.id;
        proposal.productionJobIds ??= [];
        proposal.productionJobIds.push(job.id);
        if (proposal.groups.every(({ status }) => status === "CONVERTED")) { proposal.status = "CONVERTED"; proposal.productionJobId = job.id; }
        for (const order of currentOrders) {
          order.stage = "PRINT"; order.revision += 1; order.updatedAt = createdAt; order.eventHistory ??= [];
          order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_JOB_CREATED", at: createdAt, userId: user.id, userName: user.name, source: "human-go", details: { productionJobId: job.id, jobNumber, productionGroupId: currentGroup.id, foilColor: currentGroup.foilColor, productionLineRefs: currentGroup.productionLineRefs.filter(({ orderId }) => orderId === order.id) } });
          syncOpenProposalOrderRevisions(state, order);
        }
        audit(state, user.id, mergeTarget ? "Gelijke foliekleur veilig aan bestaand productievoorstel toegevoegd" : "Productievoorstel aangemaakt", proposal.proposalNumber, { orderIds: proposal.orders.map(({ id }) => id), productionGroupId: currentGroup.id, foilColor: currentGroup.foilColor, sameColorGroupMerged: Boolean(mergeTarget), hardwareSendPerformed: false });
        audit(state, user.id, "Human GO · PlotJob vastgelegd", jobNumber, { orderIds: currentOrders.map(({ id }) => id), productionGroupId: currentGroup.id, productionGroupLabel: currentGroup.label, foilColor: currentGroup.foilColor, physicalStepSelectedBy: user.name, snapshotHash: job.snapshotHash, ...(currentGroup.efficiencyEvidence ? { efficiencyAnalysisHash: currentGroup.efficiencyEvidence.analysisHash, productionSupplementIds: currentGroup.supplements.map(({ id }) => id), customerOrderLinesCreatedForSupplement: false } : {}), hardwareSendPerformed: false });
        return { proposal, job };
      }, idempotencyPayload);
      return { state, value: outcome };
    });
    return result.value;
  }

  async createProductionJob(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const selections = Array.isArray(payload.orders) ? payload.orders : [];
    if (selections.length < 1 || selections.length > 40) throw Object.assign(new Error("Selecteer 1 tot 40 gecontroleerde orders."), { statusCode: 400, code: "VALIDATION_ERROR" });
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "CREATE_PRODUCTION_JOB", () => {
        let proposal = payload.proposalId ? state.productionProposals.find(({ id }) => id === payload.proposalId) : null;
        if (payload.proposalId && (!proposal || proposal.status !== "OPEN")) throw Object.assign(new Error("Het productievoorstel is niet meer open."), { statusCode: 409, code: "PRODUCTION_PROPOSAL_NOT_OPEN" });
        let proposalGroup = proposal?.groups?.length
          ? proposal.groups.find(({ id }) => id === payload.proposalGroupId) ?? (proposal.groups.length === 1 && !payload.proposalGroupId ? proposal.groups[0] : null)
          : null;
        if (proposal?.groups?.length && (!proposalGroup || proposalGroup.status !== "OPEN")) throw Object.assign(new Error("De productiegroep is niet meer open."), { statusCode: 409, code: "PRODUCTION_GROUP_NOT_OPEN" });
        if (proposalGroup && productionGroupSequenceState(state, proposal, proposalGroup.id) !== "CURRENT") throw Object.assign(new Error("Er is al een andere fysieke kleurstap actief of een expliciete productieafhankelijkheid is nog niet afgerond."), { statusCode: 409, code: "PRODUCTION_PHYSICAL_STEP_CONFLICT" });
        if (proposalGroup && !managedFoilColor(state, proposalGroup.foilColor)) throw Object.assign(new Error("De productiegroep heeft geen actieve beheerde foliekleur."), { statusCode: 409, code: "PRODUCTION_FOIL_COLOR_UNMANAGED" });
        const expectedSelections = proposalGroup?.orders ?? selections;
        if (proposalGroup) {
          const submitted = [...new Set(selections.map(({ id }) => id))].sort();
          const expected = [...new Set(expectedSelections.map(({ id }) => id))].sort();
          if (submitted.length !== expected.length || submitted.some((id, index) => id !== expected[index])) throw Object.assign(new Error("Human GO moet exact de opgeslagen productiegroep gebruiken."), { statusCode: 409, code: "PRODUCTION_GROUP_SELECTION_MISMATCH" });
        }
        const orders = expectedSelections.map(({ id, expectedRevision }) => {
          const order = state.orders.find((candidate) => candidate.id === id);
          if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
          if (order.deletion?.status === "DELETED") throw Object.assign(new Error("Een verwijderde order kan niet worden geproduceerd."), { statusCode: 409, code: "ORDER_DELETED" });
          if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error("Een order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
          const allowedStages = proposalGroup ? ["ORDER", "CONTROL", "PRINT"] : ["CONTROL", "PRINT"];
          if (!allowedStages.includes(order.stage)) throw Object.assign(new Error("Alle orders moeten klaar voor of in productie zijn."), { statusCode: 409, code: "ORDER_NOT_READY" });
          const selectedLineIds = proposalGroup ? new Set(proposalGroup.productionLineRefs.filter(({ orderId }) => orderId === order.id).map(({ lineId }) => lineId)) : null;
          const selectedLines = selectedLineIds ? productionLinesForOrder(state, order).filter(({ id }) => selectedLineIds.has(id)) : productionLinesForOrder(state, order);
          if (!selectedLines.length || selectedLineIds && selectedLines.length !== selectedLineIds.size || selectedLines.some(({ validation }) => validation.status !== "VALID")) throw Object.assign(new Error("Een geselecteerde productieregel is nog geblokkeerd of niet meer exact aanwezig."), { statusCode: 409, code: "PRODUCTION_LINE_BLOCKED" });
          return order;
        });
        if (!proposalGroup) {
          const directFoilColors = new Set(orders.flatMap((order) => productionLinesForOrder(state, order).map((line) => productionLineFoilColor(state, order, line)).filter(Boolean)));
          if ([...directFoilColors].some((color) => !managedFoilColor(state, color))) throw Object.assign(new Error("Een productieregel heeft geen actieve beheerde foliekleur."), { statusCode: 409, code: "PRODUCTION_FOIL_COLOR_UNMANAGED" });
          if (directFoilColors.size > 1) throw Object.assign(new Error("Een order met meerdere foliekleuren moet eerst als afzonderlijke kleurproductiegroepen worden voorbereid."), { statusCode: 409, code: "PRODUCTION_COLOR_GROUP_REQUIRED" });
          const overlapping = openProductionProposalOverlap(state, orders.map(({ id }) => id));
          if (overlapping) throw Object.assign(new Error(`Gebruik het bestaande open productievoorstel ${overlapping.proposalNumber}; een tweede fysieke execution is geblokkeerd.`), { statusCode: 409, code: "PRODUCTION_PROPOSAL_ALREADY_OPEN", proposalId: overlapping.id });
          for (const order of orders) materializeProductionExecutionSnapshot(state, order, user, { reason: "DIRECT_PRODUCTION_JOB_CREATE" });
          const groups = buildProductionProposalGroups(state, orders);
          if (groups.length !== 1) throw Object.assign(new Error("Directe productie vereist exact één canonieke productiegroep."), { statusCode: 409, code: "PRODUCTION_GROUP_REQUIRED" });
          const createdAt = iso();
          const highest = state.productionProposals.reduce((value, candidate) => Math.max(value, Number(String(candidate.proposalNumber).match(/(\d+)$/u)?.[1] ?? 0)), 0);
          proposal = { id: `production-proposal-${randomBytes(10).toString("hex")}`, proposalNumber: `PV-${new Date(createdAt).getUTCFullYear()}-${String(highest + 1).padStart(4, "0")}`, createdAt, initiatedBy: { userId: user.id, name: user.name, role: user.role }, orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })), groups, status: "OPEN", productionJobId: null, productionJobIds: [], canonicalIntentKey: canonicalProductionProposalIntentKey(orders) };
          proposalGroup = groups[0];
          state.productionProposals.unshift(proposal);
          audit(state, user.id, "Directe productiewaarheid aan voorstel gekoppeld", proposal.proposalNumber, { orderIds: proposal.orders.map(({ id }) => id), hardwareSendPerformed: false });
        }
        const createdAt = iso(); const sequence = state.nextProductionJobSequence; state.nextProductionJobSequence += 1;
        const jobNumber = `PLOT-${new Date(createdAt).getUTCFullYear()}-${String(sequence).padStart(4, "0")}`;
        const snapshot = buildProductionJobSnapshot(state, orders, jobNumber, createdAt, this.artifactRoot, this.runtimeArtifactRoot, { installedProductionAssetRoot: this.installedProductionAssetRoot, lineRefs: proposalGroup.productionLineRefs, foilColor: proposalGroup.foilColor, sourceChannel: proposalGroup.sourceChannel, groupId: proposalGroup.id, groupLabel: proposalGroup.label });
        if (snapshot.artifact.format === "MANIFEST") throw Object.assign(new Error("Voor deze regels kan nog geen werkelijk vector-productiebestand worden gemaakt. Koppel eerst de juiste gevalideerde contour- of fontbron."), { statusCode: 409, code: "PRODUCTION_VECTOR_ARTIFACT_UNAVAILABLE" });
        const job = immutableProductionJob({ id: `production-job-${randomBytes(10).toString("hex")}`, jobNumber, createdAt, initiatedBy: { userId: user.id, name: user.name, role: user.role }, kind: "ORIGINAL", originJobId: null, reason: null, snapshot, status: "AWAITING_HUMAN_CHECK", proofStatus: "GEOMETRY_VALIDATED", humanAcceptance: { status: "PENDING", note: "Het immutable vectorbestand is geometrisch gevalideerd. Een nieuwe fysieke Human Acceptance blijft vereist; Workspace stuurt niets naar Illustrator, WinPlot, Summa of hardware." } });
        state.productionJobs.unshift(job);
        proposalGroup.status = "CONVERTED";
        proposalGroup.productionJobId = job.id;
        proposal.productionJobIds ??= [];
        proposal.productionJobIds.push(job.id);
        if (proposal.groups.every(({ status }) => status === "CONVERTED")) {
          proposal.status = "CONVERTED";
          proposal.productionJobId = proposal.productionJobIds.length === 1 ? job.id : null;
        }
        for (const order of orders) {
          order.stage = "PRINT"; order.revision += 1; order.updatedAt = createdAt; order.eventHistory ??= []; order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_JOB_CREATED", at: createdAt, userId: user.id, userName: user.name, source: "human-go", details: { productionJobId: job.id, jobNumber, ...(proposalGroup ? { productionGroupId: proposalGroup.id, foilColor: proposalGroup.foilColor, productionLineRefs: proposalGroup.productionLineRefs.filter(({ orderId }) => orderId === order.id) } : {}) } });
          syncOpenProposalOrderRevisions(state, order);
        }
        audit(state, user.id, "Human GO · PlotJob vastgelegd", jobNumber, { orderIds: orders.map(({ id }) => id), ...(proposalGroup ? { productionGroupId: proposalGroup.id, productionGroupLabel: proposalGroup.label, foilColor: proposalGroup.foilColor, physicalStepSelectedBy: user.name } : {}), snapshotHash: job.snapshotHash, hardwareSendPerformed: false });
        return job;
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async completeProductionJob(token, csrfToken, productionJobId, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `COMPLETE_PRODUCTION_JOB:${productionJobId}`, () => {
        const job = state.productionJobs.find(({ id }) => id === productionJobId);
        if (!job) throw Object.assign(new Error("Productiejob niet gevonden."), { statusCode: 404, code: "PRODUCTION_JOB_NOT_FOUND" });
        if (job.status !== "AWAITING_HUMAN_CHECK") throw Object.assign(new Error("Deze productiejob kan niet opnieuw als bedrukt worden gemarkeerd."), { statusCode: 409, code: "PRODUCTION_JOB_NOT_OPEN" });
        if (job.kind === "REPLOT") {
          const origin = state.productionJobs.find(({ id }) => id === job.originJobId);
          if (!origin || origin.snapshotHash !== job.snapshotHash || job.snapshotHash !== sha256(JSON.stringify(job.snapshot))) throw Object.assign(new Error("De replot mist de exacte immutable oorspronkelijke uitvoering."), { statusCode: 409, code: "REPLOT_ORIGIN_IDENTITY_MISMATCH" });
          const at = iso();
          job.status = "COMPLETED";
          job.humanAcceptance = { status: "PASS", acceptedSourceDate: at.slice(0, 10), sourceProofStatus: job.proofStatus, note: `Replot bevestigd door ${user.name}; de oorspronkelijke ordercompletion is niet herschreven.` };
          audit(state, user.id, "Replot bedrukt", job.jobNumber, { productionJobId: job.id, originJobId: origin.id, originJobNumber: origin.jobNumber, snapshotHash: job.snapshotHash, orderCompletionMutated: false });
          return structuredClone(job);
        }
        const proposal = state.productionProposals.find(({ groups }) => groups?.some(({ productionJobId: id }) => id === job.id));
        const group = proposal?.groups?.find(({ productionJobId: id }) => id === job.id);
        if (!proposal || !group) throw Object.assign(new Error("Deze productiejob mist de onveranderlijke productieregelkoppeling."), { statusCode: 409, code: "PRODUCTION_GROUP_LINK_MISSING" });
        for (const line of job.snapshot?.productionLines ?? []) {
          const order = state.orders.find(({ id }) => id === line.orderId);
          if (order) {
            assertPioneersNumberSource(state, order, line);
            assertScBuitenboysShortSource(state, order, line);
          }
        }
        const at = iso();
        job.status = "COMPLETED";
        job.humanAcceptance = { status: "PASS", acceptedSourceDate: at.slice(0, 10), sourceProofStatus: job.proofStatus, note: `Bedrukt bevestigd door ${user.name}; immutable snapshot en artifacthash zijn ongewijzigd.` };
        for (const { id: orderId } of group.orders) {
          const order = state.orders.find(({ id }) => id === orderId);
          if (!order) throw Object.assign(new Error("Een gekoppelde bronorder ontbreekt."), { statusCode: 409, code: "PRODUCTION_ORDER_LINK_MISSING" });
          order.stage = "PRINT"; order.revision += 1; order.updatedAt = at; order.eventHistory ??= [];
          order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_GROUP_PRINTED", at, userId: user.id, userName: user.name, source: "production-job", details: { productionJobId: job.id, jobNumber: job.jobNumber, productionGroupId: group.id, foilColor: group.foilColor, productionLineRefs: group.productionLineRefs.filter(({ orderId: id }) => id === order.id) } });
          syncOpenProposalOrderRevisions(state, order);
        }
        audit(state, user.id, "Productiegroep bedrukt", job.jobNumber, { productionJobId: job.id, productionGroupId: group.id, foilColor: group.foilColor, productionLineRefs: structuredClone(group.productionLineRefs), snapshotHash: job.snapshotHash });
        return structuredClone(job);
      }, { productionJobId });
      return { state, value: outcome };
    });
    const completedJob = result.value.value;
    const affectedOrderIds = new Set(completedJob.snapshot?.orderIds ?? []);
    return {
      ...result.value,
      projection: {
        revision: result.state.revision,
        orders: result.state.orders.filter(({ id }) => affectedOrderIds.has(id)).map((order) => publicOrderWithProductionTruth(result.state, order, { includeReconciliation: true })),
        productionJobs: [structuredClone(completedJob)],
        productionProposals: result.state.productionProposals.filter(({ groups }) => (groups ?? []).some(({ productionJobId }) => productionJobId === completedJob.id)).map((proposal) => structuredClone(proposal)),
      },
    };
  }

  async retryRejectedProductionJob(token, csrfToken, productionJobId, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const reason = requiredText(payload?.reason, "Reden van afkeuring", 500);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `RETRY_REJECTED_PRODUCTION_JOB:${productionJobId}`, () => {
        const rejectedJob = state.productionJobs.find(({ id }) => id === productionJobId);
        if (!rejectedJob) throw Object.assign(new Error("Productiejob niet gevonden."), { statusCode: 404, code: "PRODUCTION_JOB_NOT_FOUND" });
        if (rejectedJob.kind !== "ORIGINAL" || rejectedJob.status !== "AWAITING_HUMAN_CHECK" || rejectedJob.humanAcceptance?.status !== "PENDING") throw Object.assign(new Error("Alleen een nog niet als Bedrukt vastgelegde oorspronkelijke job kan na menselijke afkeuring veilig opnieuw worden opgebouwd."), { statusCode: 409, code: "PRODUCTION_REJECTION_RETRY_NOT_ALLOWED" });
        if (!rejectedJob.snapshotHash || sha256(JSON.stringify(rejectedJob.snapshot)) !== rejectedJob.snapshotHash) throw Object.assign(new Error("Het immutable snapshot van de afgekeurde job wijkt af; retry blijft fail-closed."), { statusCode: 409, code: "PRODUCTION_REJECTION_SNAPSHOT_INTEGRITY_FAILED" });
        const proposal = state.productionProposals.find(({ groups }) => groups?.some(({ productionJobId: id }) => id === rejectedJob.id));
        const group = proposal?.groups?.find(({ productionJobId: id }) => id === rejectedJob.id);
        if (!proposal || !group) throw Object.assign(new Error("De afgekeurde job mist de exacte productiegroepkoppeling."), { statusCode: 409, code: "PRODUCTION_GROUP_LINK_MISSING" });
        const orders = group.orders.map(({ id }) => state.orders.find((order) => order.id === id));
        if (orders.some((order) => !order)) throw Object.assign(new Error("Een gekoppelde bronorder ontbreekt."), { statusCode: 409, code: "PRODUCTION_ORDER_LINK_MISSING" });
        if (orders.some((order) => (order.eventHistory ?? []).some(({ type, details }) => type === "PRODUCTION_GROUP_PRINTED" && details?.productionJobId === rejectedJob.id))) throw Object.assign(new Error("Deze job is al als fysiek Bedrukt vastgelegd en kan niet via broncorrectie worden herschreven."), { statusCode: 409, code: "PRODUCTION_REJECTION_AFTER_PRINT_FORBIDDEN" });
        const corrections = orders.map((order) => ({ order, ...reprojectRejectedProductionExecution(state, order, user, rejectedJob, reason) }));
        const correctedLines = corrections.flatMap(({ productionLines }) => productionLines).filter(({ id, orderId }) => group.productionLineRefs.some((ref) => ref.orderId === orderId && ref.lineId === id));
        if (correctedLines.length !== group.productionLineRefs.length) throw Object.assign(new Error("Niet iedere afgekeurde productieregel is exact in de gecorrigeerde uitvoering teruggevonden."), { statusCode: 409, code: "PRODUCTION_REJECTION_REPROJECTION_MISMATCH" });
        const rejectedLinesById = new Map((rejectedJob.snapshot?.productionLines ?? []).map((line) => [`${line.orderId}:${line.id}`, line]));
        const sourceCorrections = correctedLines.map((line) => {
          const rejectedLine = rejectedLinesById.get(`${line.orderId}:${line.id}`);
          return {
            orderId: line.orderId,
            lineId: line.id,
            previousSource: rejectedLine?.source ?? null,
            correctedSource: line.source ?? null,
            changed: Boolean(rejectedLine) && sha256(JSON.stringify(rejectedLine.source ?? null)) !== sha256(JSON.stringify(line.source ?? null)),
          };
        });
        if (sourceCorrections.some(({ previousSource }) => !previousSource) || !sourceCorrections.some(({ changed }) => changed)) throw Object.assign(new Error("De actuele Product Truth bewijst geen gewijzigde bronidentiteit voor de afgekeurde uitvoering; een nieuwe job wordt niet gemaakt."), { statusCode: 409, code: "PRODUCTION_REJECTION_SOURCE_UNCHANGED", sourceCorrections });
        for (const line of correctedLines) {
          const order = orders.find(({ id }) => id === line.orderId);
          assertPioneersNumberSource(state, order, line);
          assertScBuitenboysShortSource(state, order, line);
          productionLineWriterIdentity(state, line);
        }
        const createdAt = iso();
        const sequence = state.nextProductionJobSequence;
        state.nextProductionJobSequence += 1;
        const jobNumber = `PLOT-${new Date(createdAt).getUTCFullYear()}-${String(sequence).padStart(4, "0")}`;
        const snapshot = buildProductionJobSnapshot(state, orders, jobNumber, createdAt, this.artifactRoot, this.runtimeArtifactRoot, { installedProductionAssetRoot: this.installedProductionAssetRoot, lineRefs: group.productionLineRefs, foilColor: group.foilColor, sourceChannel: group.sourceChannel, groupId: group.id, groupLabel: group.label });
        if (snapshot.artifact.format === "MANIFEST") throw Object.assign(new Error("De veilige retry leverde geen aantoonbaar nieuw gecorrigeerd vectorartifact op."), { statusCode: 409, code: "PRODUCTION_REJECTION_RETRY_NOT_CORRECTED" });
        const retryJob = immutableProductionJob({ id: `production-job-${randomBytes(10).toString("hex")}`, jobNumber, createdAt, initiatedBy: { userId: user.id, name: user.name, role: user.role }, kind: "ORIGINAL", originJobId: null, reason, snapshot, status: "AWAITING_HUMAN_CHECK", proofStatus: "GEOMETRY_VALIDATED", humanAcceptance: { status: "PENDING", sourceProofStatus: rejectedJob.proofStatus, note: `Nieuwe immutable broncorrectie na menselijke afkeuring van ${rejectedJob.jobNumber}; opnieuw fysieke Human Acceptance vereist.` } });
        const rejectedAt = createdAt;
        rejectedJob.status = "FAILED";
        rejectedJob.humanAcceptance = { status: "FAIL", acceptedSourceDate: rejectedAt.slice(0, 10), sourceProofStatus: rejectedJob.proofStatus, note: `${reason} Afgekeurd door ${user.name}; immutable snapshot en artifacthash blijven behouden.` };
        state.productionJobs.unshift(retryJob);
        group.productionJobId = retryJob.id;
        group.status = "CONVERTED";
        proposal.productionJobIds ??= [];
        if (!proposal.productionJobIds.includes(retryJob.id)) proposal.productionJobIds.push(retryJob.id);
        proposal.status = proposal.groups.every(({ status }) => status === "CONVERTED") ? "CONVERTED" : "OPEN";
        proposal.productionJobId = proposal.status === "CONVERTED" && proposal.productionJobIds.length === 1 ? retryJob.id : null;
        for (const { order, previousExecutionHash, executionHash } of corrections) {
          order.stage = "PRINT";
          order.revision += 1;
          order.updatedAt = createdAt;
          order.eventHistory ??= [];
          order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_JOB_REJECTED", at: rejectedAt, userId: user.id, userName: user.name, source: "human-acceptance", details: { productionJobId: rejectedJob.id, jobNumber: rejectedJob.jobNumber, immutableArtifactSha256: rejectedJob.snapshot.artifact.sha256, reason, previousExecutionHash } });
          order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_JOB_CREATED", at: createdAt, userId: user.id, userName: user.name, source: "human-rejected-source-retry", details: { productionJobId: retryJob.id, jobNumber, productionGroupId: group.id, foilColor: group.foilColor, productionLineRefs: group.productionLineRefs.filter(({ orderId }) => orderId === order.id), correctedExecutionHash: executionHash, rejectedProductionJobId: rejectedJob.id } });
          syncOpenProposalOrderRevisions(state, order);
        }
        audit(state, user.id, "Productiejob menselijk afgekeurd", rejectedJob.jobNumber, { productionJobId: rejectedJob.id, immutableArtifactSha256: rejectedJob.snapshot.artifact.sha256, reason, replacementJobId: retryJob.id, replacementJobNumber: retryJob.jobNumber, sourceCorrections });
        audit(state, user.id, "Gecorrigeerde immutable productiejob vastgelegd", retryJob.jobNumber, { productionJobId: retryJob.id, rejectedProductionJobId: rejectedJob.id, orderIds: orders.map(({ id }) => id), productionGroupId: group.id, foilColor: group.foilColor, snapshotHash: retryJob.snapshotHash, artifactSha256: retryJob.snapshot.artifact.sha256, sourceCorrections, hardwareSendPerformed: false });
        return { rejectedJob: structuredClone(rejectedJob), job: structuredClone(retryJob) };
      }, { productionJobId, reason });
      return { state, value: outcome };
    });
    return result.value;
  }

  async replotProductionJob(token, csrfToken, productionJobId, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `REPLOT_PRODUCTION_JOB:${productionJobId}`, () => {
        const requested = state.productionJobs.find(({ id }) => id === productionJobId);
        if (!requested) throw Object.assign(new Error("Productiejob niet gevonden."), { statusCode: 404, code: "PRODUCTION_JOB_NOT_FOUND" });
        const origin = requested.kind === "REPLOT" ? state.productionJobs.find(({ id }) => id === requested.originJobId) : requested;
        if (!origin) throw Object.assign(new Error("Oorspronkelijke productiejob niet gevonden."), { statusCode: 409, code: "PRODUCTION_JOB_ORIGIN_MISSING" });
        const sequence = state.nextProductionJobSequence;
        state.nextProductionJobSequence += 1;
        const createdAt = iso();
        const job = immutableProductionJob({
          id: `production-job-${randomBytes(10).toString("hex")}`,
          jobNumber: `PLOT-${new Date(createdAt).getUTCFullYear()}-${String(sequence).padStart(4, "0")}`,
          createdAt,
          initiatedBy: { userId: user.id, name: user.name, role: user.role },
          kind: "REPLOT",
          originJobId: origin.id,
          reason: optional(payload.reason, 500),
          snapshot: origin.snapshot,
          status: "AWAITING_HUMAN_CHECK",
          proofStatus: "CONFIGURED",
          humanAcceptance: { status: "PENDING", sourceProofStatus: origin.proofStatus, note: "Controleer het hergebruikte immutable jobsnapshot vóór iedere fysieke output." },
        });
        state.productionJobs.unshift(job);
        audit(state, user.id, "Opnieuw plotten voorbereid", job.jobNumber, { originJobId: origin.id, originJobNumber: origin.jobNumber, snapshotHash: job.snapshotHash, reason: job.reason, hardwareSendPerformed: false });
        return job;
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async createOrder(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "CREATE_ORDER", () => createWorkspaceOrderRecord(state, user, payload), payload);
      return { state, value: outcome };
    });
    return result.value;
  }

  async createQuickProductionIntake(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const inspected = await inspectQuickProductionSource(payload);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "CREATE_QUICK_PRODUCTION_INTAKE", () => {
        const duplicate = state.quickProductionIntakes.find(({ source }) => source.sha256 === inspected.source.sha256);
        if (duplicate) return publicQuickProductionIntake(duplicate);
        const intake = createQuickProductionIntakeRecord(inspected, user);
        state.quickProductionIntakes.unshift(intake);
        audit(state, user.id, "Quick Production Intake-bron opgeslagen", intake.id, { filename: intake.source.filename, sourceKind: intake.source.sourceKind, sha256: intake.source.sha256, extractionEngine: intake.extraction.engine });
        return publicQuickProductionIntake(intake);
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async createVisualComposition(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertCreativeStudioAccess(user, this.creativeStudioEnabled);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "CREATE_VISUAL_COMPOSITION", () => {
        const uploaded = payload.sourceFile && typeof payload.sourceFile === "object" ? payload.sourceFile : null;
        let uploadedSource = null;
        if (uploaded) {
          const filename = requiredText(uploaded.filename, "Bestandsnaam", 180);
          const mimeType = allowedValue(uploaded.mimeType, ["image/png", "image/jpeg", "image/webp"], "Beeldtype");
          const bytes = Buffer.from(requiredText(uploaded.dataBase64, "Beeldbron", 12 * 1024 * 1024), "base64");
          if (!bytes.length || bytes.length > 8 * 1024 * 1024) throw Object.assign(new Error("Gebruik een PNG, JPEG of WebP tot 8 MB."), { statusCode: 413, code: "VISUAL_SOURCE_SIZE" });
          const intent = allowedValue(payload.sourceIntent, ["PRESERVE_SOURCE", "PRODUCT_ONLY", "PRODUCT_WITH_BRAND", "CAMPAIGN_BRIEF", "CHANNEL_TRANSLATION"], "Bronintentie");
          uploadedSource = { filename, mimeType, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), intent, dataBase64: bytes.toString("base64") };
        }
        const requestedArticle = state.articles.find(({ id }) => id === String(payload.articleId ?? ""));
        const article = requestedArticle ?? (uploadedSource ? matchingCreativeArticle(state.articles.filter(({ active }) => active), uploadedSource.filename) : null);
        const requestedAssetIds = [...new Set(Array.isArray(payload.assetIds) ? payload.assetIds.map(String) : [])];
        const assets = requestedAssetIds.map((id) => state.productionElements.find((asset) => asset.id === id && asset.lifecycleStatus === "PRODUCTION_READY")).filter(Boolean);
        if (assets.length !== requestedAssetIds.length) throw Object.assign(new Error("Een gekozen Bibliotheekbron is niet productieklaar."), { statusCode: 409, code: "VISUAL_ASSET_NOT_READY" });
        const composition = createVisualStudioComposition({ id: `visual-${randomBytes(8).toString("hex")}`, now: iso(), user, concept: payload.concept, title: payload.title, artDirection: payload.artDirection, article, uploadedSource, assets, sources: state.productionAssetSources ?? [] });
        if (uploadedSource) composition.sourceDataBase64 = uploadedSource.dataBase64;
        state.visualCompositions.unshift(composition);
        audit(state, user.id, "Visual Studio-compositie aangemaakt", composition.id, { articleId: composition.sourceRef?.matchedArticleId ?? composition.productRef.articleId, sourceKind: composition.sourceRef?.kind ?? "CATALOG_ARTICLE", sourceSha256: composition.sourceRef?.sha256 ?? null, sourceIntent: composition.sourceRef?.intent ?? null, assetIds: composition.assetRefs.map(({ assetId }) => assetId), compositionHash: composition.compositionHash, publicPublishingPerformed: false });
        return publicVisualComposition(composition);
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async visualCompositionSource(token, compositionId) {
    const { user } = await this.authenticate(token);
    assertCreativeStudioAccess(user, this.creativeStudioEnabled);
    const state = await this.store.read();
    const composition = state.visualCompositions.find(({ id }) => id === compositionId);
    if (!composition?.sourceRef || !composition.sourceDataBase64) throw Object.assign(new Error("Directe beeldbron niet gevonden."), { statusCode: 404, code: "VISUAL_SOURCE_NOT_FOUND" });
    const bytes = Buffer.from(composition.sourceDataBase64, "base64");
    if (createHash("sha256").update(bytes).digest("hex") !== composition.sourceRef.sha256) throw Object.assign(new Error("De immutable beeldbron wijkt af van de vastgelegde hash."), { statusCode: 409, code: "VISUAL_SOURCE_HASH_MISMATCH" });
    return { mimeType: composition.sourceRef.mimeType, bytes, filename: composition.sourceRef.filename, sha256: composition.sourceRef.sha256, cacheControl: "private, no-store" };
  }

  async updateVisualComposition(token, csrfToken, compositionId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertCreativeStudioAccess(user, this.creativeStudioEnabled);
    const result = await this.store.mutate(async (state) => {
      const index = state.visualCompositions.findIndex(({ id }) => id === compositionId);
      if (index < 0) throw Object.assign(new Error("Visual Studio-compositie niet gevonden."), { statusCode: 404, code: "VISUAL_COMPOSITION_NOT_FOUND" });
      const updated = updateVisualStudioComposition(state.visualCompositions[index], payload, user, iso());
      state.visualCompositions[index] = updated;
      audit(state, user.id, "Visual Studio automatisch opgeslagen", updated.id, { revision: updated.revision, compositionHash: updated.compositionHash, publicPublishingPerformed: false });
      return { state, value: publicVisualComposition(updated) };
    });
    return result.value;
  }

  async submitVisualCompositionReview(token, csrfToken, compositionId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertCreativeStudioAccess(user, this.creativeStudioEnabled);
    const result = await this.store.mutate(async (state) => {
      const index = state.visualCompositions.findIndex(({ id }) => id === compositionId);
      if (index < 0) throw Object.assign(new Error("Visual Studio-compositie niet gevonden."), { statusCode: 404, code: "VISUAL_COMPOSITION_NOT_FOUND" });
      const updated = submitVisualStudioReview(state.visualCompositions[index], payload.expectedRevision, user, iso());
      state.visualCompositions[index] = updated;
      audit(state, user.id, "Visual Studio-varianten klaar voor Human Review", updated.id, { revision: updated.revision, compositionHash: updated.compositionHash, channelHashes: updated.channels.map(({ channel, renderHash }) => ({ channel, renderHash })), publicPublishingPerformed: false });
      return { state, value: publicVisualComposition(updated) };
    });
    return result.value;
  }

  async createCreativeVectorDraft(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertCreativeStudioAccess(user, this.creativeStudioEnabled);
    if (!this.productionAssetUploadsEnabled) throw Object.assign(new Error("Bronuploads zijn uitgeschakeld."), { statusCode: 403, code: "CREATIVE_VECTOR_UPLOADS_DISABLED" });
    const bytes = Buffer.from(requiredText(payload.dataBase64, "Beeldbron", 12 * 1024 * 1024), "base64");
    const filename = requiredText(payload.filename, "Bestandsnaam", 180);
    const mimeType = allowedValue(payload.mimeType, ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"], "Bestandstype");
    const candidate = await createCreativeVectorCandidate({ bytes, filename, mimeType, officialVectorAvailable: payload.officialVectorAvailable === true });
    const result = await this.store.mutate(async (state) => {
      state.creativeVectorDrafts ??= [];
      const outcome = idempotent(state, idempotencyKey, user.id, "CREATE_CREATIVE_VECTOR_DRAFT", () => {
        const duplicate = state.creativeVectorDrafts.find(({ source }) => source.sha256 === candidate.preflight.source.sha256);
        if (duplicate) return publicCreativeVectorDraft(duplicate);
        const draft = {
          id: candidate.id,
          status: candidate.status,
          engine: candidate.engine,
          sourceClass: candidate.preflight.sourceClass,
          source: { ...candidate.preflight.source, dataBase64: bytes.toString("base64") },
          derivative: { ...candidate.derivative },
          evidence: candidate.evidence,
          createdAt: iso(),
          createdBy: { userId: user.id, name: user.name },
        };
        state.creativeVectorDrafts.unshift(draft);
        audit(state, user.id, "Creative Studio-vectorvoorstel gemaakt", draft.id, { sourceSha256: draft.source.sha256, derivativeSha256: draft.derivative.sha256, engine: draft.engine, sourceClass: draft.sourceClass, canonicalPromotionPerformed: false });
        return publicCreativeVectorDraft(draft);
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async creativeVectorDraftFile(token, draftId, kind) {
    const { user } = await this.authenticate(token);
    assertCreativeStudioAccess(user, this.creativeStudioEnabled);
    const state = await this.store.read();
    const draft = state.creativeVectorDrafts?.find(({ id }) => id === draftId);
    if (!draft) throw Object.assign(new Error("Vectorvoorstel niet gevonden."), { statusCode: 404, code: "CREATIVE_VECTOR_DRAFT_NOT_FOUND" });
    if (kind === "source") return { mimeType: draft.source.mimeType, bytes: Buffer.from(draft.source.dataBase64, "base64"), filename: draft.source.filename, sha256: draft.source.sha256, cacheControl: "private, no-store" };
    return { mimeType: "image/svg+xml", bytes: Buffer.from(draft.derivative.svg), filename: `${path.parse(draft.source.filename).name}-voorstel.svg`, sha256: draft.derivative.sha256, cacheControl: "private, no-store", allowSameOriginFrame: true };
  }

  async mailboxRoutingConnectorView() {
    const state = await this.store.read();
    return { mailboxes: [{ ...state.mailboxRouting.mailbox, checkpoint: state.mailboxRouting.mailbox.checkpoint ? structuredClone(state.mailboxRouting.mailbox.checkpoint) : null }] };
  }

  async ingestSportpaleisMailboxSnapshot(snapshot) {
    const attemptedAt = iso();
    if (snapshot.mailboxId !== SPORTPALEIS_MAILBOX_ID) throw Object.assign(new Error("Mailboxsnapshot valt buiten de Sportpaleis-boundary."), { code: "SPORTPALEIS_MAILBOX_BOUNDARY" });
    if (snapshot.status === "FAILED") return this.store.mutate(async (state) => {
      const mailbox = state.mailboxRouting.mailbox;
      mailbox.lastAttemptAt = attemptedAt;
      mailbox.connectionState = mailbox.credentialStatus === "PROVISIONED" ? "UNAVAILABLE" : "NOT_CONNECTED";
      mailbox.inboundStatus = "ATTENTION";
      mailbox.lastFailureCode = String(snapshot.failureCode ?? "IMAP_FETCH_FAILED");
      audit(state, "system:sportpaleis-mailbox", "Sportpaleis mailbox ophalen mislukt", mailbox.id, { failureCode: mailbox.lastFailureCode });
      return { state, value: { mailbox: structuredClone(mailbox), ingested: 0, duplicates: 0, malformed: 0, routes: [] } };
    }).then(({ value }) => value);

    const current = await this.store.read();
    const workingMessages = [...current.mailboxRouting.messages];
    const prepared = [];
    let malformed = 0;
    for (const source of snapshot.messages ?? []) {
      try {
        const messageWithBytes = prepareSportpaleisMailboxMessage({ ...source, mailboxId: snapshot.mailboxId }, { existingMessages: workingMessages, orders: current.orders, fetchedAt: new Date() });
        const assessments = await assessMailboxPdfAttachments(messageWithBytes);
        const classification = classifySportpaleisMailboxMessage(messageWithBytes, { existingMessages: workingMessages, pdfAssessments: assessments.map(({ inspected: _inspected, parsed: _parsed, ...assessment }) => assessment) });
        const persisted = await persistMailboxMessageEvidence(this.runtimeArtifactRoot, messageWithBytes);
        const message = { ...persisted, classification, status: classification.route === "UNKNOWN" ? "ATTENTION" : "ROUTED", attentionId: null, routeResult: null, storedAt: iso() };
        prepared.push({ message, assessments });
        workingMessages.push(message);
      } catch {
        malformed += 1;
      }
    }

    const result = await this.store.mutate(async (state) => {
      const mailbox = state.mailboxRouting.mailbox;
      mailbox.lastAttemptAt = attemptedAt;
      let ingested = 0;
      let duplicates = 0;
      const routes = [];
      for (const record of prepared) {
        const message = record.message;
        const duplicate = state.mailboxRouting.messages.find((candidate) => candidate.sourceKey === message.sourceKey || candidate.id === message.id || (message.messageId && candidate.messageId && String(candidate.messageId).toLocaleLowerCase("en-US") === String(message.messageId).toLocaleLowerCase("en-US")));
        if (duplicate) {
          if (duplicate.rawEvidence.sha256 !== message.rawEvidence.sha256 || duplicate.contentHash !== message.contentHash) throw Object.assign(new Error("Mailboxberichtidentiteit verwijst naar afwijkende immutable bytes."), { code: "SPORTPALEIS_MAIL_IDENTITY_CONFLICT" });
          duplicates += 1; routes.push({ messageId: duplicate.id, route: duplicate.classification.route, duplicate: true }); continue;
        }
        if (message.classification.route === "WEBSHOP_ORDER_PDF") {
          const assessment = record.assessments.find(({ attachmentId }) => message.classification.pdfAttachmentIds.includes(attachmentId) && record.assessments.length >= 1);
          if (!assessment?.valid) throw Object.assign(new Error("Geclassificeerde Webshopmail mist een gevalideerde PDF."), { code: "SPORTPALEIS_MAIL_PDF_ROUTE_INVALID" });
          const routed = ingestWebshopDocumentIntoState(state, { sourceMessageId: message.messageId ?? message.sourceKey, receivedAt: message.receivedAt, inspected: assessment.inspected, parsed: assessment.parsed, actorId: "system:sportpaleis-mailbox" });
          message.routeResult = { sourceId: routed.source.id, matchIds: routed.matches.map(({ id }) => id), externalReferences: routed.matches.map(({ externalReference }) => externalReference), automaticOrderMutation: false, automaticProductionMutation: false, externalMailSent: false };
        } else {
          const attentionId = `mail-attention-${randomBytes(8).toString("hex")}`;
          const reason = message.classification.route === "CUSTOMER_REPLY" && message.classification.productionImpact.detected
            ? `Klantreactie kan productie beïnvloeden: ${message.classification.productionImpact.signals.join(", ")}`
            : message.classification.route === "UNKNOWN" ? `Menselijke classificatie nodig: ${message.classification.reasons.join(", ")}` : null;
          if (reason) {
            message.attentionId = attentionId;
            state.mailboxRouting.attentions.unshift({ id: attentionId, messageId: message.id, threadId: message.threadId, orderIds: message.classification.orderIds, reason, status: "OPEN", createdAt: iso(), resolvedAt: null, resolvedBy: null, automaticOrderMutation: false });
          }
          message.routeResult = { threadId: message.threadId, orderIds: message.classification.orderIds, automaticOrderMutation: false, automaticProductionMutation: false, externalMailSent: false };
        }
        state.mailboxRouting.messages.unshift(message);
        state.mailboxRouting.classificationHistory.unshift({ id: `mail-classification-${randomBytes(8).toString("hex")}`, messageId: message.id, route: message.classification.route, confidence: message.classification.confidence, reasons: message.classification.reasons, at: iso(), byUserId: "system:sportpaleis-mailbox", source: "DETERMINISTIC" });
        audit(state, "system:sportpaleis-mailbox", "Inbound mail geclassificeerd", message.id, { route: message.classification.route, confidence: message.classification.confidence, productionImpact: message.classification.productionImpact.detected, automaticOrderMutation: false, externalMailSent: false });
        ingested += 1;
        routes.push({ messageId: message.id, route: message.classification.route, duplicate: false });
      }
      mailbox.credentialStatus = "PROVISIONED";
      mailbox.connectionState = "HEALTHY";
      mailbox.inboundStatus = malformed > 0 || state.mailboxRouting.attentions.some(({ status }) => status === "OPEN") ? "ATTENTION" : "READY";
      mailbox.lastSuccessfulSyncAt = attemptedAt;
      mailbox.lastFailureCode = malformed > 0 ? "MALFORMED_MESSAGES_FAIL_CLOSED" : null;
      mailbox.checkpoint = { uidValidity: requiredText(snapshot.uidValidity, "UIDVALIDITY", 64), highestUid: Math.max(Number(snapshot.highestUid ?? 0), ...prepared.map(({ message }) => message.uid), 0), syncedAt: attemptedAt };
      audit(state, "system:sportpaleis-mailbox", "Sportpaleis mailbox veilig ververst", mailbox.id, { ingested, duplicates, malformed, checkpoint: mailbox.checkpoint, destructiveMailboxActions: false });
      return { state, value: { mailbox: structuredClone(mailbox), ingested, duplicates, malformed, routes } };
    });
    return result.value;
  }

  async manuallyClassifySportpaleisMailboxMessage(token, csrfToken, messageId, payload, idempotencyKey) {
    const { state: initialState, user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const route = requiredText(payload.route, "Route", 40);
    if (!["WEBSHOP_ORDER_PDF", "CUSTOMER_REPLY", "UNKNOWN"].includes(route)) throw Object.assign(new Error("Ongeldige mailboxroute."), { statusCode: 400, code: "SPORTPALEIS_MAIL_ROUTE_INVALID" });
    const initial = initialState.mailboxRouting.messages.find(({ id }) => id === messageId);
    if (!initial) throw Object.assign(new Error("Mailboxbericht niet gevonden."), { statusCode: 404, code: "SPORTPALEIS_MAIL_MESSAGE_NOT_FOUND" });
    let assessments = [];
    if (route === "WEBSHOP_ORDER_PDF") {
      const attachmentBytes = new Map();
      for (const attachment of initial.attachments.filter(({ contentType, filename }) => contentType === "application/pdf" || /\.pdf$/iu.test(filename))) attachmentBytes.set(attachment.id, await readMailboxAttachment(this.runtimeArtifactRoot, attachment));
      assessments = await assessMailboxPdfAttachments(initial, attachmentBytes);
      if (assessments.filter(({ valid, productionOrderCount }) => valid && productionOrderCount > 0).length !== 1) throw Object.assign(new Error("Menselijke Webshopclassificatie vereist exact één gevalideerde order-PDF."), { statusCode: 409, code: "SPORTPALEIS_MAIL_WEBSHOP_PDF_NOT_EXACT" });
    }
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `CLASSIFY_MAILBOX_MESSAGE:${messageId}`, () => {
        const message = state.mailboxRouting.messages.find(({ id }) => id === messageId);
        if (!message) throw Object.assign(new Error("Mailboxbericht niet gevonden."), { statusCode: 404, code: "SPORTPALEIS_MAIL_MESSAGE_NOT_FOUND" });
        const previousRoute = message.classification.route;
        const selectedOrderId = String(payload.orderId ?? "").trim();
        if (selectedOrderId && !state.orders.some(({ id }) => id === selectedOrderId)) throw Object.assign(new Error("De gekozen ordercontext bestaat niet."), { statusCode: 409, code: "SPORTPALEIS_MAIL_ORDER_CONTEXT_INVALID" });
        if (message.attentionId) {
          const previousAttention = state.mailboxRouting.attentions.find(({ id }) => id === message.attentionId);
          if (previousAttention?.status === "OPEN") { previousAttention.status = "RESOLVED"; previousAttention.resolvedAt = iso(); previousAttention.resolvedBy = user.id; }
          message.attentionId = null;
        }
        const productionImpact = message.classification.productionImpact;
        message.classification = { ...message.classification, route, confidence: "HUMAN_CONFIRMED", reasons: [requiredText(payload.reason, "Reden", 500)], orderIds: selectedOrderId ? [selectedOrderId] : message.classification.orderIds };
        message.status = route === "UNKNOWN" ? "ATTENTION" : "ROUTED";
        if (route === "WEBSHOP_ORDER_PDF") {
          const assessment = assessments.find(({ valid, productionOrderCount }) => valid && productionOrderCount > 0);
          const routed = ingestWebshopDocumentIntoState(state, { sourceMessageId: message.messageId ?? message.sourceKey, receivedAt: message.receivedAt, inspected: assessment.inspected, parsed: assessment.parsed, actorId: user.id });
          message.routeResult = { sourceId: routed.source.id, matchIds: routed.matches.map(({ id }) => id), externalReferences: routed.matches.map(({ externalReference }) => externalReference), automaticOrderMutation: false, automaticProductionMutation: false, externalMailSent: false };
        } else {
          message.routeResult = { threadId: message.threadId, orderIds: message.classification.orderIds, automaticOrderMutation: false, automaticProductionMutation: false, externalMailSent: false };
          if (route === "UNKNOWN" || route === "CUSTOMER_REPLY" && productionImpact.detected) {
            const attentionId = `mail-attention-${randomBytes(8).toString("hex")}`;
            message.attentionId = attentionId;
            state.mailboxRouting.attentions.unshift({ id: attentionId, messageId: message.id, threadId: message.threadId, orderIds: message.classification.orderIds, reason: route === "UNKNOWN" ? "Menselijke classificatie nodig." : `Klantreactie kan productie beïnvloeden: ${productionImpact.signals.join(", ")}`, status: "OPEN", createdAt: iso(), resolvedAt: null, resolvedBy: null, automaticOrderMutation: false });
          }
        }
        state.mailboxRouting.classificationHistory.unshift({ id: `mail-classification-${randomBytes(8).toString("hex")}`, messageId: message.id, route, confidence: "HUMAN_CONFIRMED", reasons: message.classification.reasons, at: iso(), byUserId: user.id, source: "HUMAN_REVIEW", previousRoute });
        state.mailboxRouting.mailbox.inboundStatus = state.mailboxRouting.attentions.some(({ status }) => status === "OPEN") ? "ATTENTION" : "READY";
        audit(state, user.id, "Mailboxbericht handmatig geclassificeerd", message.id, { previousRoute, route, evidencePreserved: true, automaticOrderMutation: false, externalMailSent: false });
        return structuredClone(message);
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async ingestWebshopMailDocument(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const sourceMessageId = requiredText(payload.sourceMessageId, "Bronbericht-ID", 180);
    const receivedAt = validDate(payload.receivedAt);
    const inspected = await inspectQuickProductionSource({ filename: payload.filename, mimeType: payload.mimeType, dataBase64: payload.dataBase64 });
    if (inspected.source.sourceKind !== "PDF") throw Object.assign(new Error("De gecontroleerde Webshopadapter accepteert uitsluitend de relevante PDF-bijlage uit het mailbericht."), { statusCode: 400, code: "WEBSHOP_PDF_REQUIRED" });
    const parsed = parseSportpaleisDividePdfText({ pages: inspected.extraction.textPages?.length ? inspected.extraction.textPages : [inspected.extraction.extractedText], layoutPages: inspected.extraction.layoutPages, sourceDocumentId: inspected.source.sha256, sourceHash: inspected.source.sha256, detectedAt: receivedAt });
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `INGEST_WEBSHOP_MAIL_DOCUMENT:${sourceMessageId}`, () => ingestWebshopDocumentIntoState(state, { sourceMessageId, receivedAt, inspected, parsed, actorId: user.id }));
      return { state, value: outcome };
    });
    const value = result.value.value;
    return { duplicate: result.value.duplicate, value: { ...value, source: (({ dataBase64: _dataBase64, ...source }) => source)(value.source) } };
  }

  async webshopDocumentSource(token, sourceId) {
    const { state, user } = await this.authenticate(token);
    assertRole(user, ["admin", "operator"]);
    const source = state.webshopIntake.sources.find(({ id }) => id === sourceId);
    if (!source) throw Object.assign(new Error("Webshopbron niet gevonden."), { statusCode: 404, code: "WEBSHOP_SOURCE_NOT_FOUND" });
    return { bytes: Buffer.from(source.dataBase64, "base64"), mimeType: source.mimeType, filename: source.filename, sha256: source.sha256, disposition: "inline", allowSameOriginFrame: true };
  }

  async acceptWebshopMatch(token, csrfToken, matchId, payload) {
    const { state, user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const match = state.webshopIntake.matches.find(({ id }) => id === matchId);
    if (!match) throw Object.assign(new Error("Webshopcontrolevoorstel niet gevonden."), { statusCode: 404, code: "WEBSHOP_MATCH_NOT_FOUND" });
    if (match.status === "ACCEPTED") {
      const order = state.orders.find(({ id }) => id === match.orderId);
      if (!order) throw Object.assign(new Error("De eerder gekoppelde webshoporder ontbreekt."), { statusCode: 409, code: "WEBSHOP_ORDER_LINK_MISSING" });
      return { duplicate: true, value: order };
    }
    if (payload.explicitAgreement !== true) throw Object.assign(new Error("Expliciet medewerkerakkoord is vereist."), { statusCode: 409, code: "WEBSHOP_AGREEMENT_REQUIRED" });
    const source = state.webshopIntake.sources.find(({ id }) => id === match.sourceId);
    if (!source) throw Object.assign(new Error("De immutable webshopbron ontbreekt."), { statusCode: 409, code: "WEBSHOP_SOURCE_NOT_FOUND" });
    const existing = state.orders.find(({ sourceContext }) => sourceContext?.source === "WEBSHOP_XPRT" && sourceContext.externalReference === match.externalReference);
    if (existing && existing.sourceContext?.webshopDocument?.contentHash !== match.contentHash && !String(existing.sourceContext?.provenance ?? "").includes(source.sha256)) throw Object.assign(new Error("Dit webshopordernummer bestaat al uit een andere bron/revisie; dubbele materialisatie is geblokkeerd."), { statusCode: 409, code: "WEBSHOP_ORDER_DUPLICATE" });
    const association = requiredText(payload.association || match.association, "Vereniging", 160);
    const customer = requiredText(payload.customer || match.customer, "Klant", 120);
    const backNumberSizeClass = payload.backNumberSizeClass
      ? allowedValue(payload.backNumberSizeClass, ["JUNIOR", "SENIOR"], "Rugnummermaat")
      : "";
    const productionArticles = match.articles.filter(({ personalization }) => personalization.length > 0);
    if (!productionArticles.length) throw Object.assign(new Error("Deze webshopbestelling bevat geen expliciete bedrukking voor productie."), { statusCode: 409, code: "WEBSHOP_PRODUCTION_INTAKE_EMPTY" });
    const items = productionArticles.map((sourceArticle) => {
      const assessment = assessWebshopProductionArticle(state, association, sourceArticle);
      if (assessment.issues.length) throw Object.assign(new Error(assessment.issues[0].reason), { statusCode: 409, code: assessment.issues[0].code });
      const article = assessment.article;
      const overrides = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", shortsNumber: "", backNumberSizeClass: "" };
      for (const { personalization, field } of assessment.resolutions) if (field) overrides[field] = personalization.value;
      const expectedDecorations = sourceArticle.personalization.filter(({ kind }) => kind !== "STOCK_LOGO").length;
      const mappedDecorations = assessment.resolutions.filter(({ field }) => field).length;
      if (mappedDecorations !== expectedDecorations) throw Object.assign(new Error(`${sourceArticle.articleNumber}: niet alle bronopdrukken zijn exact aan een productieveld gekoppeld.`), { statusCode: 409, code: "WEBSHOP_DECORATION_CARDINALITY_REVIEW_REQUIRED" });
      if (overrides.backNumber && !backNumberSizeClass) throw Object.assign(new Error(`Kies Junior of Senior voor het rugnummer op ${article.name}.`), { statusCode: 409, code: "WEBSHOP_BACK_NUMBER_SIZE_CLASS_REVIEW_REQUIRED" });
      if (overrides.backNumber) overrides.backNumberSizeClass = backNumberSizeClass;
      return { articleId: article.id, size: requiredText(sourceArticle.size, `${sourceArticle.articleNumber} maat`, 40), quantity: sourceArticle.quantity, deviation: true, overrides };
    });
    const created = existing
      ? { duplicate: true, value: existing }
      : await this.createOrder(token, csrfToken, { orderKind: "INDIVIDUAL", customer, customerEmail: optional(payload.customerEmail || match.customerEmail, 160), customerPhone: optional(payload.customerPhone || match.customerPhone, 40), association, standardPersonalization: {}, items, source: "WEBSHOP_XPRT", externalReference: match.externalReference, provenance: `Mail ${source.sourceMessageId} · ${source.filename} · SHA-256 ${source.sha256}` }, `webshop-match:${match.id}`);
    const linked = await this.store.mutate(async (next) => {
      const current = next.webshopIntake.matches.find(({ id }) => id === match.id);
      const order = next.orders.find(({ id }) => id === created.value.id);
      const storedSource = next.webshopIntake.sources.find(({ id }) => id === match.sourceId);
      if (!current || !order || !storedSource) throw Object.assign(new Error("Webshopbron en order konden niet atomair worden gekoppeld."), { statusCode: 409, code: "WEBSHOP_ORDER_LINK_FAILED" });
      if (current.status === "HUMAN_CHECK") {
        current.status = "ACCEPTED"; current.orderId = order.id; current.acceptedAt = iso(); current.acceptedBy = user.id;
        const stockLogoQuantity = current.articles.reduce((total, article) => total + (article.personalization.some(({ kind }) => kind === "STOCK_LOGO") ? article.quantity : 0), 0);
        if (stockLogoQuantity > 0) {
          if (normalizedSourceValue(association).replaceAll(" ", "") !== "vva/spartaan") throw Object.assign(new Error("Voorraadlogo-automatisering is uitsluitend toegestaan voor VVA / Spartaan Webshoporders."), { statusCode: 409, code: "WEBSHOP_STOCK_LOGO_SCOPE_MISMATCH" });
          order.stockApplications = [{ id: `stock-application-${randomBytes(8).toString("hex")}`, kind: "STOCK_LOGO", association: "VVA / Spartaan", quantity: stockLogoQuantity, status: "PENDING", appliedAt: null, appliedBy: null, source: "WEBSHOP_XPRT" }];
        }
        order.sourceContext.webshopDocument = { sourceId: storedSource.id, sourceMessageId: storedSource.sourceMessageId, filename: storedSource.filename, sha256: storedSource.sha256, contentHash: current.contentHash, sourceLineage: current.articles.flatMap(({ sourceLineId, articleNumber, quantity, personalization }) => personalization.map(({ decorationIdentity, kind, sourceValue }) => ({ sourceLineId, decorationIdentity, articleNumber, quantity, kind, sourceValue }))) };
        order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "WEBSHOP_DOCUMENT_ACCEPTED", at: current.acceptedAt, userId: user.id, userName: user.name, source: "explicit-human-agreement", details: { matchId: current.id, sourceId: storedSource.id, sourceSha256: storedSource.sha256, externalReference: current.externalReference } });
        order.revision += 1; order.updatedAt = current.acceptedAt;
        audit(next, user.id, "Webshop-PDF gecontroleerd en als canonieke order geaccepteerd", current.id, { orderId: order.id, externalReference: current.externalReference, sourceSha256: storedSource.sha256 });
      }
      return { state: next, value: order };
    });
    return { duplicate: created.duplicate, value: linked.value };
  }

  async applyWebshopStockLogo(token, csrfToken, orderId, payload, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `APPLY_WEBSHOP_STOCK_LOGO:${orderId}`, () => {
        const order = state.orders.find(({ id }) => id === orderId);
        if (!order || order.sourceContext?.source !== "WEBSHOP_XPRT") throw Object.assign(new Error("Webshoporder niet gevonden."), { statusCode: 404, code: "WEBSHOP_ORDER_NOT_FOUND" });
        if (order.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("De webshoporder is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
        const pending = (order.stockApplications ?? []).filter(({ association, status }) => association === "VVA / Spartaan" && status === "PENDING");
        if (!pending.length) throw Object.assign(new Error("Er staat geen nog toe te passen VVA / Spartaan-voorraadlogo open."), { statusCode: 409, code: "WEBSHOP_STOCK_LOGO_NOT_PENDING" });
        const quantity = pending.reduce((sum, item) => sum + item.quantity, 0);
        const stock = state.webshopIntake.stockLogo;
        if (stock.currentStock < quantity) throw Object.assign(new Error(`Onvoldoende voorraadlogo's: ${stock.currentStock} beschikbaar, ${quantity} nodig.`), { statusCode: 409, code: "WEBSHOP_STOCK_LOGO_INSUFFICIENT" });
        const at = iso(); const previousStock = stock.currentStock; stock.currentStock -= quantity;
        for (const application of pending) { application.status = "APPLIED"; application.appliedAt = at; application.appliedBy = user.id; }
        stock.mutations.unshift({ id: `stock-mutation-${randomBytes(8).toString("hex")}`, orderId: order.id, quantity: -quantity, previousStock, nextStock: stock.currentStock, at, byUserId: user.id, idempotencyKey });
        order.stage = "PRINT"; order.revision += 1; order.updatedAt = at; order.eventHistory ??= [];
        order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "WEBSHOP_STOCK_LOGO_APPLIED", at, userId: user.id, userName: user.name, source: "physical-stock-application", details: { quantity, previousStock, nextStock: stock.currentStock, plotJobCreated: false } });
        audit(state, user.id, "Webshop voorraadlogo fysiek toegepast", order.id, { association: "VVA / Spartaan", quantity, previousStock, nextStock: stock.currentStock, plotJobCreated: false });
        return order;
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async recordWebshopOrderPrint(token, csrfToken, orderId, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `PRINT_WEBSHOP_ORDER:${orderId}`, () => {
        const order = state.orders.find(({ id }) => id === orderId);
        if (!order || order.sourceContext?.source !== "WEBSHOP_XPRT") throw Object.assign(new Error("Webshoporder niet gevonden."), { statusCode: 404, code: "WEBSHOP_ORDER_NOT_FOUND" });
        const previous = state.webshopIntake.printEvents.filter(({ orderId: id }) => id === order.id).length;
        const event = { id: `webshop-print-${randomBytes(8).toString("hex")}`, orderId: order.id, at: iso(), byUserId: user.id, kind: previous ? "REPRINT" : "PRINT" };
        state.webshopIntake.printEvents.unshift(event);
        order.eventHistory ??= []; order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: event.kind === "REPRINT" ? "WEBSHOP_ORDER_REPRINTED" : "WEBSHOP_ORDER_PRINTED", at: event.at, userId: user.id, userName: user.name, source: "explicit-print", details: { printEventId: event.id } });
        audit(state, user.id, event.kind === "REPRINT" ? "Webshoporder opnieuw geprint" : "Webshoporder geprint", order.id, { printEventId: event.id });
        return event;
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async quickProductionIntakeSource(token, intakeId) {
    const { state, user } = await this.authenticate(token);
    assertRole(user, ["admin", "operator"]);
    const intake = state.quickProductionIntakes.find(({ id }) => id === intakeId);
    if (!intake) throw Object.assign(new Error("Quick Production Intake niet gevonden."), { statusCode: 404, code: "QUICK_INTAKE_NOT_FOUND" });
    return { bytes: Buffer.from(intake.source.dataBase64, "base64"), mimeType: intake.source.mimeType, filename: intake.source.filename, sha256: intake.source.sha256, disposition: "inline", allowSameOriginFrame: true };
  }

  async acceptQuickProductionIntake(token, csrfToken, intakeId, payload) {
    const { state, user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const intake = state.quickProductionIntakes.find(({ id }) => id === intakeId);
    if (!intake) throw Object.assign(new Error("Quick Production Intake niet gevonden."), { statusCode: 404, code: "QUICK_INTAKE_NOT_FOUND" });
    if (intake.status === "ACCEPTED") {
      const order = state.orders.find(({ id }) => id === intake.orderId);
      if (!order) throw Object.assign(new Error("De gekoppelde order ontbreekt; automatische correctie is geblokkeerd."), { statusCode: 409, code: "QUICK_INTAKE_ORDER_MISSING" });
      return { duplicate: true, value: { intake: publicQuickProductionIntake(intake), order: { ...order, ...productionStatusForOrder(state, order) } } };
    }
    const prepared = quickIntakeOrderPayload(intake, payload, state);
    const created = await this.createOrder(token, csrfToken, prepared.payload, `quick-intake-order:${intake.id}`);
    const result = await this.store.mutate(async (next) => {
      const current = next.quickProductionIntakes.find(({ id }) => id === intake.id);
      const order = next.orders.find(({ id }) => id === created.value.id);
      if (!current || !order) throw Object.assign(new Error("Intake of canonieke order ontbreekt."), { statusCode: 409, code: "QUICK_INTAKE_LINK_FAILED" });
      if (current.status === "HUMAN_CHECK") {
        current.status = "ACCEPTED";
        current.revision += 1;
        current.humanCorrections = prepared.corrections;
        current.acceptedAt = iso();
        current.acceptedBy = { userId: user.id, name: user.name };
        current.orderId = order.id;
        order.sourceContext.quickIntake = { id: current.id, sourceKind: current.source.sourceKind, filename: current.source.filename, sha256: current.source.sha256, version: current.version };
        order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "QUICK_INTAKE_ACCEPTED", at: current.acceptedAt, userId: user.id, userName: user.name, source: "explicit-human-agreement", details: { intakeId: current.id, sourceSha256: current.source.sha256, corrections: prepared.corrections } });
        order.revision += 1;
        order.updatedAt = current.acceptedAt;
        audit(next, user.id, "Quick Production Intake akkoord", current.id, { orderId: order.id, sourceSha256: current.source.sha256, corrections: prepared.corrections.length });
      }
      return { state: next, value: { intake: publicQuickProductionIntake(current), order: { ...order, ...productionStatusForOrder(next, order) } } };
    });
    return { duplicate: created.duplicate || result.value.intake.status !== "ACCEPTED", value: result.value };
  }

  async advanceOrder(token, csrfToken, orderId, expectedRevision, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `ADVANCE_ORDER:${orderId}`, () => {
        const order = state.orders.find(({ id }) => id === orderId);
        if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
        if (order.deletion?.status === "DELETED") throw Object.assign(new Error("Een verwijderde order kan niet worden gewijzigd."), { statusCode: 409, code: "ORDER_DELETED" });
        if (order.revision !== expectedRevision) {
          throw Object.assign(new Error("Order is intussen door iemand anders gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
        }
        if (order.stage === "ORDER" && order.customerEmail && order.communication?.requiredForIndividualOrder && !validOrderCommunicationEvidence(state, order, "receipt")) {
          throw Object.assign(new Error("De verplichte ontvangstbevestiging moet eerst veilig zijn vastgelegd."), { statusCode: 409, code: "RECEIPT_CONFIRMATION_REQUIRED" });
        }
        if (order.stage === "CONTROL" && order.foilStates?.length && order.foilStates.every(({ status }) => status === "HOLD")) {
          throw Object.assign(new Error("Deze order wacht volledig op de juiste foliekleur."), { statusCode: 409, code: "COLOR_HOLD" });
        }
        const productionBlocker = order.stage === "CONTROL" ? productionProposalBlockReason(order, state) : null;
        if (productionBlocker) {
          throw Object.assign(new Error(`Productiedata ontbreekt: ${productionBlocker}. De order blijft zichtbaar bij Productie met een concrete herstelactie.`), { statusCode: 409, code: "PRODUCTION_DATA_INCOMPLETE" });
        }
        if (order.stage === "PRINT") throw Object.assign(new Error("Meld een volledig geproduceerde order vanuit Productie expliciet Gereed."), { statusCode: 409, code: "USE_PRODUCTION_READY_ACTION" });
        const previous = order.stage;
        order.stage = STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, STAGE_ORDER.indexOf(order.stage) + 1)];
        order.revision += 1;
        order.updatedAt = iso();
        order.eventHistory ??= [];
        order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: order.stage === "CONTROL" ? "CONTROL_STARTED" : order.stage === "PRINT" ? "PRODUCTION_STARTED" : order.stage === "DONE" ? "READY" : "STATUS_CHANGED", at: order.updatedAt, userId: user.id, userName: user.name, source: "button" });
        audit(state, user.id, "Orderstatus gewijzigd", order.id, { from: previous, to: order.stage, revision: order.revision });
        return order;
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async bulkAdvanceOrders(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const selections = Array.isArray(payload.orders) ? payload.orders : [];
    if (selections.length < 1 || selections.length > 40) throw Object.assign(new Error("Selecteer 1 tot 40 orders."), { statusCode: 400, code: "VALIDATION_ERROR" });
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "BULK_ADVANCE", () => {
        const uniqueIds = new Set(selections.map(({ id }) => String(id)));
        if (uniqueIds.size !== selections.length) throw Object.assign(new Error("Dubbele orderselectie."), { statusCode: 400, code: "VALIDATION_ERROR" });
        const orders = selections.map((selection) => {
          const order = state.orders.find(({ id }) => id === selection.id);
          if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
          if (order.deletion?.status === "DELETED") throw Object.assign(new Error(`${order.id} is verwijderd.`), { statusCode: 409, code: "ORDER_DELETED" });
          if (order.revision !== Number(selection.expectedRevision)) throw Object.assign(new Error("Een geselecteerde order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
          return order;
        });
        for (const order of orders) {
          if (order.stage === "ORDER" && order.customerEmail && order.communication?.requiredForIndividualOrder && !validOrderCommunicationEvidence(state, order, "receipt")) {
            throw Object.assign(new Error(`${order.id} mist de verplichte ontvangstbevestiging.`), { statusCode: 409, code: "RECEIPT_CONFIRMATION_REQUIRED" });
          }
          if (order.stage === "CONTROL" && order.foilStates?.length && order.foilStates.every(({ status }) => status === "HOLD")) {
            throw Object.assign(new Error(`${order.id} wacht volledig op de juiste foliekleur.`), { statusCode: 409, code: "COLOR_HOLD" });
          }
          const productionBlocker = order.stage === "CONTROL" ? productionProposalBlockReason(order, state) : null;
          if (productionBlocker) {
            throw Object.assign(new Error(`${order.id} mist gevalideerde productiedata: ${productionBlocker}.`), { statusCode: 409, code: "PRODUCTION_DATA_INCOMPLETE" });
          }
          if (order.stage === "PRINT") throw Object.assign(new Error(`${order.id}: meld volledig geproduceerd werk vanuit Productie expliciet Gereed.`), { statusCode: 409, code: "USE_PRODUCTION_READY_ACTION" });
          const previous = order.stage;
          order.stage = STAGE_ORDER[Math.min(STAGE_ORDER.length - 1, STAGE_ORDER.indexOf(order.stage) + 1)];
          order.revision += 1;
          order.updatedAt = iso();
          order.eventHistory ??= [];
          order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: order.stage === "CONTROL" ? "CONTROL_STARTED" : order.stage === "PRINT" ? "PRODUCTION_STARTED" : order.stage === "DONE" ? "READY" : "STATUS_CHANGED", at: order.updatedAt, userId: user.id, userName: user.name, source: "bulk" });
          audit(state, user.id, "Orderstatus in bulk gewijzigd", order.id, { from: previous, to: order.stage, revision: order.revision });
        }
        return orders;
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async completeProductionOrders(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const selections = Array.isArray(payload.orders) ? payload.orders : [];
    if (selections.length < 1 || selections.length > 40) throw Object.assign(new Error("Selecteer 1 tot 40 orders."), { statusCode: 400, code: "VALIDATION_ERROR" });
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "COMPLETE_PRODUCTION_ORDERS", () => {
        const uniqueIds = new Set(selections.map(({ id }) => String(id)));
        if (uniqueIds.size !== selections.length) throw Object.assign(new Error("Dubbele orderselectie."), { statusCode: 400, code: "VALIDATION_ERROR" });
        const orders = selections.map((selection) => {
          const order = state.orders.find(({ id }) => id === selection.id);
          if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
          if (order.deletion?.status === "DELETED") throw Object.assign(new Error(`${order.id} is verwijderd.`), { statusCode: 409, code: "ORDER_DELETED" });
          if (order.revision !== Number(selection.expectedRevision)) throw Object.assign(new Error("Een geselecteerde order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
          return order;
        });
        const completed = [];
        const skipped = [];
        for (const order of orders) {
          if (order.stage !== "PRINT") {
            skipped.push({ id: order.id, code: "ORDER_NOT_IN_PRODUCTION", reason: "Order is niet In productie." });
            continue;
          }
          const progress = productionProgressForOrder(state, order);
          const productionLines = productionLinesForOrder(state, order);
          const stockApplications = order.stockApplications ?? [];
          const stockComplete = stockApplications.length > 0 && stockApplications.every(({ status }) => status === "APPLIED");
          const plottedComplete = productionLines.length === 0 ? true : Boolean(progress?.trackedComplete && progress.complete);
          if (!plottedComplete || stockApplications.some(({ status }) => status !== "APPLIED")) {
            skipped.push({ id: order.id, code: "PRODUCTION_LINES_PENDING", reason: "Nog niet alle vereiste productieregels per foliekleur zijn bedrukt." });
            continue;
          }
          if (!productionLines.length && !stockComplete) {
            skipped.push({ id: order.id, code: "PRODUCTION_LINES_PENDING", reason: "Er is geen aantoonbaar uitgevoerde fysieke productiestap." });
            continue;
          }
          const previous = order.stage;
          const completedJobs = (progress?.entries ?? []).filter(({ status }) => status === "PRODUCED").map(({ productionJobId }) => state.productionJobs.find(({ id }) => id === productionJobId)).filter(Boolean);
          const stockEvidence = canonicalStockCompletionEvidence(state, order);
          const completionMode = productionLines.length && stockEvidence.applications.length ? "MIXED" : productionLines.length ? "PLOT" : "STOCK";
          const confirmedAt = iso();
          const confirmedBy = { userId: user.id, userName: user.name, role: user.role };
          const completionBody = {
            version: "CANONICAL_PRODUCTION_COMPLETION_V4",
            completionMode,
            productionExecutionHash: order.productionExecutionSnapshot?.executionHash ?? null,
            productionLineHash: sha256(JSON.stringify(productionLines)),
            requiredLineIds: [...new Set(productionLines.map(({ id }) => id))].sort(),
            productionJobs: completedJobs.map(({ id, jobNumber, snapshotHash, snapshot }) => ({ id, jobNumber, snapshotHash, artifactSha256: snapshot?.artifact?.sha256 ?? null })).sort((left, right) => left.id.localeCompare(right.id)),
            stockApplicationIds: stockEvidence.applications.map(({ id }) => id),
            stockEvidence,
            explicitHumanAction: "AFRONDEN",
            confirmedAt,
            confirmedBy,
          };
          const evidenceHash = sha256(JSON.stringify(completionBody));
          const completionAttestationHash = sha256(JSON.stringify({ evidenceHash, confirmedAt, confirmedBy }));
          // Keep the write shape readable by the deployed rollback target: the
          // actor/time fields remain inside the immutable evidence body. The
          // event adds a second, explicit attestation binding without changing
          // the predecessor-readable hash contract.
          order.productionCompletionEvidence = { ...completionBody, evidenceHash };
          order.stage = "DONE";
          order.revision += 1;
          order.updatedAt = confirmedAt;
          order.eventHistory ??= [];
          const pickupReady = order.fulfillment?.mode !== "DELIVERY";
          order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_READY", at: order.updatedAt, userId: user.id, userName: user.name, source: selections.length === 1 ? "production-ready" : "bulk-production-ready", details: { customerMailSent: false, fulfillmentStatus: pickupReady ? "READY_FOR_PICKUP" : order.fulfillment?.status ?? "PENDING", explicitHumanAction: "AFRONDEN", completionEvidenceHash: order.productionCompletionEvidence.evidenceHash, completionAttestationHash, completionMode } });
          if (pickupReady) {
            order.fulfillment ??= { mode: "PICKUP", status: "PENDING", updatedAt: null, updatedBy: null };
            assertFulfillmentTransition(state, order, "READY_FOR_PICKUP");
            order.fulfillment.status = "READY_FOR_PICKUP";
            order.fulfillment.updatedAt = order.updatedAt;
            order.fulfillment.updatedBy = user.id;
            order.operationalFacts ??= {};
            order.operationalFacts.READY_FOR_PICKUP = { at: order.updatedAt, userId: user.id, userName: user.name, source: "MANUAL_WORKSPACE" };
          }
          audit(state, user.id, selections.length === 1 ? "Volledig geproduceerde order afgerond" : "Volledig geproduceerde orders in bulk afgerond", order.id, { from: previous, to: order.stage, revision: order.revision, fulfillmentStatus: order.fulfillment?.status ?? null, customerMailSent: false, completionEvidenceHash: order.productionCompletionEvidence.evidenceHash });
          completed.push(order);
        }
        return { completed, skipped };
      }, payload);
      return { state, value: outcome };
    });
    return result.value;
  }

  async confirmExistingOrderProductionReconciliation(token, csrfToken, orderId, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `CONFIRM_EXISTING_ORDER_PRODUCTION_RECONCILIATION:${orderId}`, () => {
        const order = state.orders.find(({ id }) => id === orderId);
        if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
        if (order.deletion?.status === "DELETED") throw Object.assign(new Error("Een verwijderde order kan niet worden gereconcilieerd."), { statusCode: 409, code: "ORDER_DELETED" });
        assertExistingOrderReconciliationWriteAllowed(state, order);
        if (order.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("De order is intussen gewijzigd; controleer het voorstel opnieuw."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
        const reconciliation = reconcileExistingOrderProductionTruth(state, order);
        if (reconciliation.historicalSourceHash !== String(payload.historicalSourceHash ?? "") || reconciliation.projectionHash !== String(payload.projectionHash ?? "")) throw Object.assign(new Error("De historische bron of voorbereide productieprojectie is gewijzigd; controleer opnieuw."), { statusCode: 409, code: "RECONCILIATION_PROJECTION_STALE" });
        if (reconciliation.status !== "RESOLVABLE" || !reconciliation.productionLines.length || reconciliation.productionLines.some(({ validation }) => validation.status !== "VALID")) throw Object.assign(new Error("Alleen een eenduidige, volledig valide voorbereide projectie kan worden bevestigd."), { statusCode: 409, code: "RECONCILIATION_NOT_CONFIRMABLE" });
        if (payload.confirm !== true) throw Object.assign(new Error("Expliciete bevestiging is vereist."), { statusCode: 400, code: "RECONCILIATION_CONFIRMATION_REQUIRED" });
        const reason = requiredText(payload.reason, "Reden", 400);
        const at = iso();
        const previous = { productionLines: [], historicalSourceHash: reconciliation.historicalSourceHash };
        order.productionLines = structuredClone(reconciliation.productionLines);
        order.productionReconciliation = {
          ...structuredClone(reconciliation),
          status: "PROVEN",
          sourceKind: "STORED_CANONICAL",
          findings: [],
          confirmed: { at, byUserId: user.id, byUserName: user.name, reason, historicalSourceHash: reconciliation.historicalSourceHash, projectionHash: reconciliation.projectionHash },
        };
        const finalValidation = validateFinalProductionTruth(state, order, order.productionLines);
        if (finalValidation.status !== "VALID") throw Object.assign(new Error(finalValidation.findings[0]?.reason ?? "Finale productiewaarheid is geblokkeerd."), { statusCode: 409, code: finalValidation.findings[0]?.code ?? "FINAL_PRODUCTION_VALIDATION_FAILED", findings: finalValidation.findings });
        const snapshotBody = { ...productionExecutionSnapshotBody(state, order, order.productionLines, finalValidation, user, at), reason: "EXPLICIT_EXISTING_ORDER_RECONCILIATION" };
        order.productionExecutionSnapshot = { ...snapshotBody, executionHash: sha256(JSON.stringify(snapshotBody)) };
        order.revision += 1;
        order.updatedAt = at;
        order.eventHistory ??= [];
        order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "EXISTING_ORDER_PRODUCTION_RECONCILED", at, userId: user.id, userName: user.name, source: "explicit-human-confirmation", details: { previous, next: { productionLineIds: order.productionLines.map(({ id }) => id), projectionHash: reconciliation.projectionHash }, reason, evidence: reconciliation.evidence, historicalSourcePreserved: true } });
        audit(state, user.id, "Bestaande order naar canonical productiewaarheid gereconcilieerd", order.id, { previous, next: { productionLineIds: order.productionLines.map(({ id }) => id), projectionHash: reconciliation.projectionHash }, reason, evidence: reconciliation.evidence, historicalSourcePreserved: true });
        return publicOrderWithProductionTruth(state, order);
      }, payload);
      return { state, value: outcome };
    });
    return result.value;
  }

  async resolveExistingOrderProductionReconciliationFinding(token, csrfToken, orderId, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `RESOLVE_EXISTING_ORDER_PRODUCTION_FINDING:${orderId}`, () => {
        const order = state.orders.find(({ id }) => id === orderId);
        if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
        if (order.deletion?.status === "DELETED") throw Object.assign(new Error("Een verwijderde order kan niet worden gereconcilieerd."), { statusCode: 409, code: "ORDER_DELETED" });
        assertExistingOrderReconciliationWriteAllowed(state, order);
        if (order.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("De order is intussen gewijzigd; controleer de ontbrekende waarheid opnieuw."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
        const reconciliation = reconcileExistingOrderProductionTruth(state, order);
        if (reconciliation.historicalSourceHash !== String(payload.historicalSourceHash ?? "")) throw Object.assign(new Error("De historische bron is gewijzigd; controleer opnieuw."), { statusCode: 409, code: "RECONCILIATION_SOURCE_STALE" });
        const requestedFindingId = String(payload.findingId ?? "");
        const previousDecisions = existingOrderReconciliationDecisions(order);
        const storedDecision = previousDecisions.find(({ findingId }) => findingId === requestedFindingId);
        const storedAction = storedDecision?.action ?? (storedDecision?.missingField === "SIZE_CLASS" ? { kind: "CHOOSE_SIZE_CLASS", options: ["JUNIOR", "SENIOR"] } : storedDecision?.missingField === "FOIL_COLOR" ? { kind: "CHOOSE_FOIL_COLOR", options: [...new Set(state.foilRolls.filter(({ active }) => active !== false).map(({ color }) => color))] } : null);
        const finding = reconciliation.findings.find(({ id }) => id === requestedFindingId) ?? (storedDecision && storedAction ? { id: storedDecision.findingId, missingField: storedDecision.missingField, itemId: storedDecision.itemId, decoration: storedDecision.decoration, evidence: storedDecision.evidence, action: storedAction } : null);
        if (!finding) throw Object.assign(new Error("De ontbrekende productiewaarheid is niet meer actueel."), { statusCode: 409, code: "RECONCILIATION_FINDING_STALE" });
        if (!["CHOOSE_SIZE_CLASS", "CHOOSE_DECORATION_TYPE", "CHOOSE_FOIL_COLOR", "CHOOSE_PHYSICAL_HEIGHT_MM", "CHOOSE_ARTICLE_CONTEXT"].includes(finding.action.kind)) throw Object.assign(new Error("Deze herstelactie moet via de aangewezen bron- of artikelcontext worden uitgevoerd."), { statusCode: 409, code: "RECONCILIATION_ACTION_NOT_INLINE" });
        const reason = requiredText(payload.reason, "Reden", 400);
        const at = iso();
        const cancel = payload.cancel === true;
        const value = cancel ? null : requiredText(payload.value, "Keuze", 80);
        if (!cancel && !finding.action.options?.includes(value)) throw Object.assign(new Error("Kies één van de actuele veilige opties."), { statusCode: 400, code: "RECONCILIATION_DECISION_INVALID" });
        if (!cancel && finding.action.kind === "CHOOSE_FOIL_COLOR" && !managedFoilColor(state, value)) throw Object.assign(new Error("De gekozen foliekleur is niet actief beheerd."), { statusCode: 409, code: "PRODUCTION_FOIL_COLOR_UNMANAGED" });
        const decision = cancel ? null : { findingId: finding.id, missingField: finding.missingField, itemId: finding.itemId, decoration: finding.decoration, value, at, byUserId: user.id, byUserName: user.name, reason, evidence: finding.evidence, action: structuredClone(finding.action) };
        const decisions = [...previousDecisions.filter(({ findingId }) => findingId !== finding.id), ...(decision ? [decision] : [])];
        order.productionReconciliation = { ...structuredClone(reconciliation), decisions };
        const updated = reconcileExistingOrderProductionTruth(state, order);
        order.productionReconciliation = { ...structuredClone(updated), decisions };
        order.revision += 1;
        order.updatedAt = at;
        order.eventHistory ??= [];
        order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: cancel ? "EXISTING_ORDER_PRODUCTION_DECISION_REVOKED" : "EXISTING_ORDER_PRODUCTION_DECISION_RECORDED", at, userId: user.id, userName: user.name, source: "explicit-human-decision", details: { findingId: finding.id, missingField: finding.missingField, previous: previousDecisions.find(({ findingId }) => findingId === finding.id) ?? null, next: decision, reason, historicalSourcePreserved: true } });
        audit(state, user.id, cancel ? "Beslissing over bestaande-orderwaarheid ingetrokken" : "Ontbrekende bestaande-orderwaarheid beslist", order.id, { findingId: finding.id, missingField: finding.missingField, previous: previousDecisions.find(({ findingId }) => findingId === finding.id) ?? null, next: decision, reason, historicalSourcePreserved: true });
        return publicOrderWithProductionTruth(state, order);
      }, payload);
      return { state, value: outcome };
    });
    return result.value;
  }

  async updateOrder(token, csrfToken, orderId, payload, expectedRevision) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === orderId);
      if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.deletion?.status === "DELETED") throw Object.assign(new Error("Een verwijderde order kan niet worden gewijzigd."), { statusCode: 409, code: "ORDER_DELETED" });
      if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      if (user.role === "store" && order.stage !== "ORDER") throw Object.assign(new Error("Deze order is in productie en is voor winkelmedewerkers vergrendeld."), { statusCode: 409, code: "ORDER_LOCKED_FOR_STORE" });
      if (order.stage !== "ORDER" && user.role !== "store" && !String(payload.correctionReason ?? "").trim()) throw Object.assign(new Error("Een productiecorrectie vereist een reden."), { statusCode: 400, code: "CORRECTION_REASON_REQUIRED" });
      const contentChanged = payload.standardPersonalization !== undefined || payload.items !== undefined;
      const preservedLegacyItemIds = [...new Set(Array.isArray(payload.preservedLegacyItemIds) ? payload.preservedLegacyItemIds.map(String) : [])];
      const preservedLegacyItems = preservedLegacyItemIds.map((id) => order.items.find((item) => item.id === id)).filter(Boolean);
      if (preservedLegacyItems.length !== preservedLegacyItemIds.length) throw Object.assign(new Error("Een te behouden historisch artikel is niet meer exact aanwezig."), { statusCode: 409, code: "LEGACY_ORDER_ITEM_IDENTITY_MISMATCH" });
      if (preservedLegacyItems.some((item) => item.articleId && state.articles.some(({ id }) => id === item.articleId))) throw Object.assign(new Error("Alleen niet-mapbare historische artikelen mogen via de behoudroute onveranderd blijven."), { statusCode: 400, code: "LEGACY_ORDER_ITEM_PRESERVE_INVALID" });
      const previous = {
        customer: order.customer,
        customerEmail: order.customerEmail ?? "",
        customerPhone: order.customerPhone ?? "",
        deliveryMode: order.fulfillment?.mode ?? "PICKUP",
        deliveryAddress: order.fulfillment?.address ?? null,
        itemSummary: order.items.map(({ product, quantity, size, personalization }) => ({ product, quantity, size: size ?? "", personalization })),
      };
      if (contentChanged && order.stage !== "ORDER") throw Object.assign(new Error("Artikel- en bedrukinhoud is vanaf controle vergrendeld."), { statusCode: 409, code: "ORDER_CONTENT_LOCKED" });
      if (contentChanged && (payload.standardPersonalization === undefined || payload.items === undefined)) throw Object.assign(new Error("Stuur standaardbedrukking en artikelen samen voor een veilige correctie."), { statusCode: 400, code: "ORDER_CONTENT_INCOMPLETE" });
      const terminalFulfillment = ["PICKED_UP", "DELIVERED"].includes(order.fulfillment?.status);
      if (terminalFulfillment && payload.deliveryMode !== undefined && String(payload.deliveryMode) !== String(order.fulfillment?.mode)) throw Object.assign(new Error("Een afgehaalde of bezorgde order kan niet via de normale workflow naar een andere terminale afhandeling worden omgezet."), { statusCode: 409, code: "FULFILLMENT_TERMINAL_IMMUTABLE" });
      if (contentChanged) invalidateOpenProductionTruth(state, order, user, requiredText(payload.correctionReason ?? "Orderinhoud gecorrigeerd vóór fysieke uitvoering", "Correctiereden", 400));
      if (payload.customer !== undefined) order.customer = requiredText(payload.customer, "Klant", 120);
      if (payload.customerEmail !== undefined) {
        const previousEmail = String(order.customerEmail ?? "").trim().toLocaleLowerCase("nl-NL");
        const nextEmail = optionalEmail(payload.customerEmail);
        order.customerEmail = nextEmail;
        if (previousEmail !== nextEmail.toLocaleLowerCase("nl-NL")) {
          order.communication ??= { requiredForIndividualOrder: order.orderKind === "INDIVIDUAL", receipt: { status: "NOT_SENT" }, production: { status: "NOT_SENT" }, ready: { status: "NOT_SENT" } };
          order.communication.history ??= [];
          const invalidatedAt = iso();
          for (const channel of ["receipt", "production", "ready"]) {
            const prior = order.communication[channel] ?? { status: "NOT_SENT" };
            if (prior.status !== "NOT_SENT") order.communication.history.push({ channel, ...structuredClone(prior), invalidatedAt, invalidatedReason: "RECIPIENT_CHANGED", priorRecipientHash: previousEmail ? sha256(previousEmail) : null });
            order.communication[channel] = { status: "NOT_SENT", updatedAt: invalidatedAt, invalidatedReason: "RECIPIENT_CHANGED", recipientHash: nextEmail ? sha256(nextEmail.toLocaleLowerCase("nl-NL")) : null };
          }
          order.eventHistory ??= [];
          order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "COMMUNICATION_EVIDENCE_INVALIDATED", at: invalidatedAt, userId: user.id, userName: user.name, source: "recipient-correction", details: { reason: "RECIPIENT_CHANGED", previousRecipientHash: previousEmail ? sha256(previousEmail) : null, nextRecipientHash: nextEmail ? sha256(nextEmail.toLocaleLowerCase("nl-NL")) : null } });
          audit(state, user.id, "Communicatiebewijs ongeldig gemaakt na ontvangerwijziging", order.id, { previousRecipientHash: previousEmail ? sha256(previousEmail) : null, nextRecipientHash: nextEmail ? sha256(nextEmail.toLocaleLowerCase("nl-NL")) : null });
        }
      }
      if (payload.customerPhone !== undefined) order.customerPhone = String(payload.customerPhone ?? "").trim().slice(0, 40);
      if (payload.deliveryMode !== undefined) {
        if (order.sourceContext?.transactionalAuthority === "ACA_XPRT") throw Object.assign(new Error("Wijzig de bezorgwijze van deze webshoporder in ACA XPRT."), { statusCode: 409, code: "XPRT_TRANSACTIONAL_AUTHORITY" });
        const mode = allowedValue(payload.deliveryMode, ["PICKUP", "DELIVERY"], "Bezorgwijze");
        const address = mode === "DELIVERY" ? validDeliveryAddress(payload.deliveryAddress ?? order.fulfillment?.address, mode) : null;
        if (!terminalFulfillment) order.fulfillment = { mode, status: "PENDING", updatedAt: iso(), updatedBy: user.id, feeEur: mode === "DELIVERY" ? state.settings.deliveryFeeEur : 0, address };
      }
      if (contentChanged) {
        const strictPilotContract = order.orderKind === "INDIVIDUAL" || order.communication?.requiredForIndividualOrder === true;
        const standardPersonalization = validatePersonalization(payload.standardPersonalization, { requireBackNumberSizeClass: strictPilotContract });
        const submittedItems = validateItems(payload.items, state, standardPersonalization, { requireBackNumberSizeClass: strictPilotContract });
        const preservedProductionLines = (order.productionLines ?? []).filter(({ itemId }) => preservedLegacyItemIds.includes(itemId));
        const items = [...submittedItems, ...structuredClone(preservedLegacyItems)];
        order.productionLines = order.orderKind === "INDIVIDUAL" ? [...deriveCatalogProductionLines(state, order.id, submittedItems), ...structuredClone(preservedProductionLines)] : order.productionLines;
        applyProductionReadiness(submittedItems, order.productionLines);
        const associations = [...new Set(items.map(({ association }) => association).filter(Boolean))];
        order.standardPersonalization = standardPersonalization;
        order.items = items;
        order.commercialPriceTruth = catalogCommercialPriceTruth(state, items);
        assertOrderProductionDecorationCardinality(state, order);
        order.associations = associations;
        order.association = associations.length === 1 ? associations[0] : associations.length > 1 ? "Meerdere verenigingen" : "Geen vereniging";
        order.totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
        order.foilStates = canonicalOrderFoilColors({ items, productionLines: order.productionLines }).map((color) => ({ color, status: color.toLowerCase() === "rood" ? "HOLD" : "READY" }));
        const manualAttention = order.priority ? `Prioriteitsuitzondering: ${order.priority.reasonLabel ?? order.priority.reason}` : [...(order.notes ?? [])].reverse().find(({ kind }) => kind === "attention")?.text;
        const recalculatedAttention = manualAttention || productionAttentionText(items);
        if (recalculatedAttention) order.attention = recalculatedAttention;
        else delete order.attention;
      }
      const next = {
        customer: order.customer,
        customerEmail: order.customerEmail ?? "",
        customerPhone: order.customerPhone ?? "",
        deliveryMode: order.fulfillment?.mode ?? "PICKUP",
        deliveryAddress: order.fulfillment?.address ?? null,
        itemSummary: order.items.map(({ product, quantity, size, personalization }) => ({ product, quantity, size: size ?? "", personalization })),
      };
      const changes = Object.keys(previous).filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field])).map((field) => ({ field, from: previous[field], to: next[field] }));
      invalidateStaleOrderCommunicationEvidence(state, order, user, "ORDER_TRUTH_CHANGED");
      order.revision += 1; order.updatedAt = iso(); order.eventHistory ??= [];
      const correctionReason = payload.correctionReason ? requiredText(payload.correctionReason, "Correctiereden", 400) : null;
      const productionImpact = contentChanged || changes.some(({ field }) => field === "deliveryMode");
      order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_UPDATED", at: order.updatedAt, userId: user.id, userName: user.name, source: "button", details: { contentChanged, productionImpact, changes, ...(correctionReason ? { correctionReason } : {}) } });
      audit(state, user.id, "Order gewijzigd", order.id, { revision: order.revision, contentChanged, productionImpact, changes, correctionReason });
      return { state, value: structuredClone(order) };
    });
    return result.value;
  }

  async deleteOrder(token, csrfToken, orderId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === orderId);
      if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      if (order.deletion?.status === "DELETED") return { state, value: order };
      const consequentialHistory = state.productionJobs.some((job) => job.snapshot.orderIds.includes(order.id));
      const at = iso();
      order.deletion = { status: "DELETED", at, byUserId: user.id, byUserName: user.name, reason: optional(payload.reason, 300) || null, restorable: !consequentialHistory };
      order.revision += 1;
      order.updatedAt = at;
      order.eventHistory ??= [];
      order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_DELETED", at, userId: user.id, userName: user.name, source: "button", details: { reason: order.deletion.reason, restorable: order.deletion.restorable, productionHistoryPreserved: consequentialHistory } });
      audit(state, user.id, "Order verwijderd", order.id, { reason: order.deletion.reason, restorable: order.deletion.restorable, productionHistoryPreserved: consequentialHistory });
      return { state, value: order };
    });
    return result.value;
  }

  async restoreOrder(token, csrfToken, orderId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === orderId);
      if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      if (!order.deletion) return { state, value: order };
      if (!order.deletion.restorable || state.productionJobs.some((job) => job.snapshot.orderIds.includes(order.id))) throw Object.assign(new Error("Deze order heeft onveranderlijke productiehistorie en kan niet worden hersteld."), { statusCode: 409, code: "ORDER_RESTORE_NOT_ALLOWED" });
      const at = iso();
      const priorDeletion = structuredClone(order.deletion);
      delete order.deletion;
      order.revision += 1;
      order.updatedAt = at;
      order.eventHistory ??= [];
      order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_RESTORED", at, userId: user.id, userName: user.name, source: "button", details: { deletedAt: priorDeletion.at } });
      audit(state, user.id, "Order hersteld", order.id, { deletedAt: priorDeletion.at, revision: order.revision });
      return { state, value: order };
    });
    return result.value;
  }

  async archiveProductionWork(token, csrfToken, orderId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === orderId);
      if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      if (order.productionArchive?.status === "ARCHIVED") return { state, value: order };
      const jobs = state.productionJobs.filter((job) => job.snapshot.orderIds.includes(order.id));
      if (jobs.some(({ status }) => status === "AWAITING_HUMAN_CHECK")) throw Object.assign(new Error("Rond de actieve fysieke productiestap eerst af; archiveren is nu geblokkeerd."), { statusCode: 409, code: "PRODUCTION_WORK_ACTIVE" });
      const sharedOpenGroup = (state.productionProposals ?? []).flatMap(({ groups }) => groups ?? []).find((group) => group.status === "OPEN" && group.orders.some(({ id }) => id === order.id) && group.orders.some(({ id }) => id !== order.id && !state.orders.find((candidate) => candidate.id === id)?.productionArchive));
      if (sharedOpenGroup) throw Object.assign(new Error("Deze order deelt een open productiebatch met andere orders. Splits of rond die batch eerst af."), { statusCode: 409, code: "PRODUCTION_WORK_SHARED_GROUP" });
      const at = iso();
      order.productionArchive = { status: "ARCHIVED", at, byUserId: user.id, byUserName: user.name, reason: optional(payload.reason, 300) || null, preservedProductionJobIds: jobs.map(({ id }) => id) };
      order.revision += 1; order.updatedAt = at; order.eventHistory ??= [];
      order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_WORK_ARCHIVED", at, userId: user.id, userName: user.name, source: "button", details: { reason: order.productionArchive.reason, preservedProductionJobIds: order.productionArchive.preservedProductionJobIds } });
      audit(state, user.id, "Productie uit werkvoorraad gehaald", order.id, { reason: order.productionArchive.reason, productionHistoryPreserved: true, preservedProductionJobIds: order.productionArchive.preservedProductionJobIds });
      return { state, value: order };
    });
    return result.value;
  }

  async preliveCleanupPlan(token) {
    const { user, state } = await this.authenticate(token); assertRole(user, ["admin"]);
    const inventory = preliveCleanupInventory(state);
    const evidence = cleanupEvidenceManifest(state, inventory, { releaseId: this.releaseId, actor: user.id });
    return { inventory, evidence: { sha256: evidence.sha256, recordCounts: { orders: evidence.orders.length, proposals: evidence.productionProposals.length, productionJobs: evidence.productionJobs.length, audit: evidence.audit.length }, exclusions: evidence.exclusions }, deletionExecuted: false, cleanupGoRequired: true };
  }

  async restoreProductionWork(token, csrfToken, orderId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === orderId);
      if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      if (!order.productionArchive) return { state, value: order };
      const archived = structuredClone(order.productionArchive); const at = iso(); delete order.productionArchive;
      order.revision += 1; order.updatedAt = at; order.eventHistory ??= [];
      order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_WORK_RESTORED", at, userId: user.id, userName: user.name, source: "button", details: { archivedAt: archived.at, preservedProductionJobIds: archived.preservedProductionJobIds } });
      audit(state, user.id, "Productie teruggezet naar werkvoorraad", order.id, { archivedAt: archived.at, productionHistoryPreserved: true });
      return { state, value: order };
    });
    return result.value;
  }

  async addOrderNote(token, csrfToken, orderId, payload, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `ADD_NOTE:${orderId}`, () => {
        const order = state.orders.find(({ id }) => id === orderId); if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
        const note = { id: `note-${randomBytes(6).toString("hex")}`, scope: allowedValue(payload.scope ?? "order", ["order", "customer"], "Notitietype"), kind: allowedValue(payload.kind ?? "internal", ["internal", "attention"], "Notitiesoort"), text: requiredText(payload.text, "Opmerking", 600), authorId: user.id, authorName: user.name, createdAt: iso() };
        order.notes ??= []; order.notes.push(note); order.revision += 1; order.updatedAt = iso(); if (note.kind === "attention") order.attention = note.text;
        order.eventHistory ??= []; order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "NOTE_ADDED", at: order.updatedAt, userId: user.id, userName: user.name, source: "button", details: { noteId: note.id, kind: note.kind, scope: note.scope } });
        audit(state, user.id, "Orderopmerking toegevoegd", order.id, { noteId: note.id, kind: note.kind }); return note;
      }); return { state, value: outcome };
    }); return result.value;
  }

  async resolveBarcode(token, payload) {
    const { user, state } = await this.authenticate(token); assertRole(user, ["admin", "operator", "store"]);
    if (!this.demoMode || payload.emulate !== true) throw Object.assign(new Error("Barcode is nog niet geactiveerd."), { statusCode: 409, code: "BARCODE_DISABLED" });
    const value = requiredText(payload.value, "Barcode", 120); const order = state.orders.find(({ barcode, id }) => barcode?.value === value || id === value.replace(/^SPW:/, ""));
    if (!order) throw Object.assign(new Error("Geen order voor deze barcode."), { statusCode: 404, code: "BARCODE_NOT_FOUND" });
    return { order: structuredClone(order), emulated: true, hardwareValidated: false };
  }

  async confirmPickup(token, csrfToken, orderId, payload, expectedRevision) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === orderId); if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.deletion?.status === "DELETED") throw Object.assign(new Error("Een verwijderde order kan niet worden afgehaald."), { statusCode: 409, code: "ORDER_DELETED" });
      if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      const at = iso(); applyCanonicalFulfillmentTransition(state, order, "PICKED_UP", user, at, { exception: String(payload.exception ?? "").trim() || null }); order.revision += 1; order.updatedAt = at;
      order.eventHistory ??= []; order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PICKED_UP", at, userId: user.id, userName: user.name, source: payload.source === "barcode-emulation" ? "barcode-emulation" : "button" });
      audit(state, user.id, "Order afgehaald", order.id); return { state, value: structuredClone(order) };
    }); return result.value;
  }

  async recordOperationalEvent(token, csrfToken, orderId, payload, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    const action = allowedValue(payload.action, ["PRINTED", "REGISTER_PROCESSED", "PAID", "CUSTOMER_INFORMED", "READY_FOR_PICKUP", "PICKED_UP", "DELIVERED"], "Operationele actie");
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `OPERATIONAL_EVENT:${orderId}:${action}`, () => {
        const order = state.orders.find(({ id }) => id === orderId); if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
        if (order.deletion?.status === "DELETED") throw Object.assign(new Error("Een verwijderde order kan niet operationeel worden verwerkt."), { statusCode: 409, code: "ORDER_DELETED" });
        if (order.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("De order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
        if (action === "PRINTED") {
          if (order.stage !== "PRINT") throw Object.assign(new Error("Bedrukt kan alleen tijdens de fysieke productiestap worden vastgelegd."), { statusCode: 409, code: "PRINT_ACTION_NOT_AVAILABLE" });
          const progress = productionProgressForOrder(state, order);
          if (progress && (!progress.trackedComplete || !progress.complete)) throw Object.assign(new Error("Bevestig eerst iedere kleurproductie afzonderlijk vanuit de bijbehorende productiejob."), { statusCode: 409, code: "PRODUCTION_LINES_PENDING" });
        }
        if (action === "REGISTER_PROCESSED" && order.stage !== "DONE") throw Object.assign(new Error("Kassaverwerking kan alleen bij een fysiek afgeronde order worden vastgelegd."), { statusCode: 409, code: "REGISTER_ACTION_NOT_AVAILABLE" });
        if (action === "CUSTOMER_INFORMED" && (order.stage !== "DONE" || order.fulfillment?.status !== "READY_FOR_PICKUP")) throw Object.assign(new Error("Klant geïnformeerd kan alleen worden vastgelegd wanneer de order aantoonbaar klaarstaat om op te halen."), { statusCode: 409, code: "CUSTOMER_INFORMED_ACTION_NOT_AVAILABLE" });
        if (action === "PAID" && (order.orderKind !== "TEAM" || order.stage !== "DONE" || order.fulfillment?.mode === "DELIVERY")) throw Object.assign(new Error("Betaling wordt in Workspace alleen bij een gereed teamorder voor afhalen vastgelegd."), { statusCode: 409, code: "PAYMENT_ACTION_NOT_AVAILABLE" });
        const at = iso();
        if (FULFILLMENT_TRANSITION_ACTIONS.has(action)) applyCanonicalFulfillmentTransition(state, order, action, user, at);
        else { order.operationalFacts ??= {}; order.operationalFacts[action] = { at, userId: user.id, userName: user.name, source: "MANUAL_WORKSPACE" }; }
        if (action === "REGISTER_PROCESSED") order.payment = { status: "REGISTER_PROCESSED", updatedAt: at, updatedBy: user.id, source: "MANUAL_WORKSPACE" };
        if (action === "PAID") order.payment = { status: "PAID", updatedAt: at, updatedBy: user.id, source: "MANUAL_WORKSPACE" };
        if (action === "DELIVERED") order.fulfillment.feeEur ??= state.settings.deliveryFeeEur;
        order.revision += 1; order.updatedAt = at; order.eventHistory ??= [];
        order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: action, at, userId: user.id, userName: user.name, source: "manual-workspace" });
        audit(state, user.id, `Operationele status: ${action}`, order.id, { action });
        return structuredClone(order);
      }, { orderId, ...payload, action });
      return { state, value: outcome };
    });
    return result.value;
  }

  async importMailbatch(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "IMPORT_MAILBATCH", () => {
        const sourceMessageId = requiredText(payload.sourceMessageId, "Bronbericht-ID", 180);
        const existing = state.mailbatches.find((batch) => batch.sourceMessageId === sourceMessageId);
        if (existing) return structuredClone(existing);
        const source = allowedValue(payload.source, ["WEBSHOP_XPRT", "TEAM_MAIL"], "Mailbatchbron");
        const scheduledWindow = allowedValue(payload.scheduledWindow, ["08:30", "12:00", "14:00", "16:00"], "Verwerkingsmoment");
        const parsedExport = payload.rawExportText ? parseSportpaleisMailbatchExport(payload.rawExportText, payload.filename) : null;
        const inputRecords = parsedExport?.records ?? payload.records;
        if (!Array.isArray(inputRecords) || !inputRecords.length || inputRecords.length > 500) throw Object.assign(new Error("Een mailbatch bevat 1 tot 500 gestructureerde records."), { statusCode: 400, code: "MAILBATCH_RECORDS_INVALID" });
        const seen = new Set();
        const records = inputRecords.map((record) => {
          const externalId = requiredText(record.externalId, "Extern record-ID", 180);
          if (seen.has(externalId)) throw Object.assign(new Error("Dubbel extern record-ID in mailbatch."), { statusCode: 409, code: "MAILBATCH_RECORD_DUPLICATE" });
          seen.add(externalId);
          return { externalId, externalReference: requiredText(record.externalReference, "Externe referentie", 180), customer: requiredText(record.customer, "Klant", 120), association: String(record.association ?? "").trim() || null, changes: normalizedTextList(record.changes ?? [], "Wijzigingen", 20, 200), productionConcept: source === "TEAM_MAIL" || record.productionConcept === true, transactionalAuthority: source === "WEBSHOP_XPRT" ? "ACA_XPRT" : "EXTERNAL" };
        });
        const importedAt = iso();
        const batch = { id: `mailbatch-${randomBytes(8).toString("hex")}`, sourceMessageId, source, scheduledWindow, importedAt, importedBy: user.id, status: source === "TEAM_MAIL" ? "REVIEW_REQUIRED" : "IMPORTED", provenance: requiredText(payload.provenance, "Provenance", 500), ...(parsedExport ? { input: parsedExport.input } : { input: { filename: "gestructureerde-api-payload", format: "STRUCTURED", sha256: sha256(JSON.stringify(records)), rowCount: records.length, sourceStatus: "MANUAL_STRUCTURED" } }), records };
        state.mailbatches.unshift(batch); audit(state, user.id, "Mailbatch geÃ¯mporteerd", batch.id, { source, records: records.length, sourceMessageId });
        return structuredClone(batch);
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async runWebsiteSync(token, csrfToken) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const current = await this.store.read();
    const knownProductionArticleIds = new Set((current.articles ?? []).filter(({ profileId, productionReadiness }) => profileId && profileId !== "profile-none" && productionReadiness?.status !== "NOT_RELEVANT").map((article) => currentArticleSourceIdentifier(article)).filter(Boolean));
    let snapshot;
    try {
      snapshot = await this.websiteSource.snapshot(new Date(), { knownProductionArticleIds, relevanceIndex: current.websiteSync?.sourceRelevanceIndex ?? {} });
    } catch (error) {
      await this.store.mutate(async (state) => ({ state, value: failSportpaleisWebsiteSync(state, error, { actorId: user.id }) }));
      throw Object.assign(new Error("De websitecontrole kon niet volledig worden uitgevoerd. Bestaande Workspace-data is niet gewijzigd."), { statusCode: 502, code: String(error?.code ?? "WEBSITE_SYNC_FAILED") });
    }
    if (current.websiteSync?.sourceFingerprint === snapshot.fingerprint) return publicSportpaleisWebsiteSync(current);
    const result = await this.store.mutate(async (state) => ({
      state,
      value: stageSportpaleisWebsiteSync(state, snapshot, { actorId: user.id, trigger: "manual" }),
    }));
    return publicSportpaleisWebsiteSync({ websiteSync: result.value });
  }

  async reviewWebsiteSyncChange(token, csrfToken, changeId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const action = allowedValue(payload.action, ["ACCEPT_SOURCE", "KEEP_WORKSPACE"], "Beoordeling");
    const result = await this.store.mutate(async (state) => {
      const change = state.websiteSync?.changes?.find(({ id }) => id === changeId);
      if (!change || change.status !== "PENDING_REVIEW") throw Object.assign(new Error("Deze websitewijziging is niet meer open."), { statusCode: 409, code: "WEBSITE_SYNC_CHANGE_NOT_OPEN" });
      const before = change.workspaceValue ?? null;
      if (action === "ACCEPT_SOURCE") {
        if (change.kind === "NEW_ASSOCIATION") {
          if (!state.associations.some(({ name }) => normalizedSourceValue(name) === normalizedSourceValue(change.label))) state.associations.push(createStagedAssociationFromWebsite(change, user.id));
        } else if (change.kind === "NEW_ARTICLE") {
          if (!state.associations.some(({ name }) => normalizedSourceValue(name) === normalizedSourceValue(change.association))) throw Object.assign(new Error("Neem eerst de bijbehorende vereniging over."), { statusCode: 409, code: "WEBSITE_SYNC_ASSOCIATION_REQUIRED" });
          if (!state.articles.some((article) => currentArticleSourceIdentifier(article) === change.sourceIdentifier)) state.articles.push(createStagedArticleFromWebsite(state, change, user.id));
        } else if (["SOURCE_ARTICLE_CHANGED", "WORKSPACE_SOURCE_DIFFERENCE"].includes(change.kind)) {
          const article = state.articles.find((candidate) => currentArticleSourceIdentifier(candidate) === change.sourceIdentifier);
          if (!article) throw Object.assign(new Error("Het Workspace-artikel bestaat niet meer."), { statusCode: 409, code: "WEBSITE_SYNC_WORKSPACE_ARTICLE_MISSING" });
          article.name = requiredText(change.sourceValue?.name, "Artikelnaam", 120);
          article.catalogProvenance = { ...(article.catalogProvenance ?? {}), source: "SPORTPALEIS_LIVE_STOREFRONT", url: change.sourceValue.url, sourceIdentifier: change.sourceIdentifier, fingerprint: change.sourceFingerprint, acceptedAt: iso(), acceptedBy: user.id };
          article.revision = Number(article.revision ?? 1) + 1;
        } else if (change.kind === "SOURCE_RELEVANCE_AMBIGUOUS") {
          throw Object.assign(new Error("Bedrukrelevantie is nog ambigu. Kies Behouden en beoordeel het artikel handmatig in Artikelbeheer."), { statusCode: 409, code: "WEBSITE_SYNC_RELEVANCE_AMBIGUOUS" });
        }
      }
      state.websiteSync.reviewDecisions ??= {};
      state.websiteSync.reviewDecisions[change.id] = { action, sourceFingerprint: change.sourceFingerprint ?? null, at: iso(), userId: user.id };
      state.websiteSync.changes = state.websiteSync.changes.filter(({ id }) => id !== change.id);
      state.websiteSync.counts.attention = state.websiteSync.changes.length;
      state.websiteSync.status = state.websiteSync.changes.length ? "ATTENTION" : "OK";
      audit(state, user.id, action === "ACCEPT_SOURCE" ? "Websitewijziging overgenomen" : "Workspacewaarde behouden", change.label, { changeId, kind: change.kind, sourceIdentifier: change.sourceIdentifier, before, sourceFingerprint: change.sourceFingerprint ?? null, productionConfigurationChanged: false });
      return { state, value: publicSportpaleisWebsiteSync(state) };
    });
    return result.value;
  }

  async createProductionAssetSource(token, csrfToken, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    if (!this.productionAssetUploadsEnabled) throw Object.assign(new Error("Productiebronuploads zijn uitgeschakeld."), { statusCode: 403, code: "PRODUCTION_ASSET_UPLOADS_DISABLED" });
    const bytes = Buffer.from(requiredText(payload.dataBase64, "Bronbestand", 12 * 1024 * 1024), "base64");
    const filename = requiredText(payload.filename, "Bestandsnaam", 180);
    const mimeType = allowedValue(payload.mimeType, ["image/svg+xml", "application/pdf", "application/illustrator", "application/octet-stream"], "Bestandstype");
    const intakeKind = allowedValue(payload.intakeKind ?? "ARTWORK", ["ARTWORK", "NUMBER_SET"], "Bronsoort");
    const inspected = await inspectProductionAssetSource({ bytes, filename, mimeType, intakeKind });
    const result = await this.store.mutate(async (state) => {
      state.productionAssetSources ??= [];
      const existing = state.productionAssetSources.find(({ original }) => original.sha256 === inspected.source.sha256);
      if (existing) {
        if (existing.inspection?.engine === inspected.inspection.engine && existing.inspection?.engineVersion !== inspected.inspection.engineVersion) {
          const previousCandidates = new Map(existing.candidates.map((candidate) => [candidate.id, candidate]));
          const candidateIdByHash = new Map(inspected.candidates.map((candidate) => [candidate.geometryHash, candidate.id]));
          if (existing.reviewDraft) {
            const remap = (id) => candidateIdByHash.get(previousCandidates.get(id)?.geometryHash) ?? null;
            existing.reviewDraft.selectedCandidateIds = existing.reviewDraft.selectedCandidateIds.map(remap).filter(Boolean);
            existing.reviewDraft.glyphAssignments = Object.fromEntries(Object.entries(existing.reviewDraft.glyphAssignments).map(([id, value]) => [remap(id), value]).filter(([id]) => id));
            existing.reviewDraft.candidateArtwork = Object.fromEntries(Object.entries(existing.reviewDraft.candidateArtwork ?? {}).map(([id, value]) => [remap(id), value]).filter(([id]) => id));
            existing.reviewDraft.revision += 1;
            existing.reviewDraft.updatedAt = iso();
            existing.reviewDraft.updatedBy = { userId: user.id, name: user.name };
          }
          existing.inspection = inspected.inspection;
          existing.documentPreviewSvg = inspected.documentPreviewSvg;
          existing.candidates = inspected.candidates;
          existing.revision = Number(existing.revision ?? 1) + 1;
          audit(state, user.id, "Productiebron opnieuw visueel ingedeeld", existing.id, { sourceSha256: existing.original.sha256, engineVersion: inspected.inspection.engineVersion, candidateCount: inspected.candidates.length, originalUnchanged: true });
          return { state, value: publicProductionAssetSource(existing) };
        }
        return { state, value: publicProductionAssetSource(existing), changed: false };
      }
      const derivedFromSourceId = optional(payload.derivedFromSourceId, 180) || null;
      const canonicalSvg = inspected.source.format === "SVG";
      const conversionMethod = allowedValue(payload.conversionMethod ?? (canonicalSvg ? "HUMAN_VERIFIED_SVG" : "ORIGINAL_PDF_INTERPRETATION"), ["HUMAN_VERIFIED_SVG", "ORIGINAL_PDF_INTERPRETATION", "ILLUSTRATOR_MANUAL_VECTOR_PDF_EXPORT"], "Conversiemethode");
      const referenceSource = derivedFromSourceId ? state.productionAssetSources.find(({ id }) => id === derivedFromSourceId) : null;
      if (derivedFromSourceId && !referenceSource) throw Object.assign(new Error("De oorspronkelijke productiebron voor deze export bestaat niet."), { statusCode: 404, code: "PRODUCTION_ASSET_REFERENCE_SOURCE_NOT_FOUND" });
      if (Boolean(derivedFromSourceId) !== (conversionMethod === "ILLUSTRATOR_MANUAL_VECTOR_PDF_EXPORT")) throw Object.assign(new Error("Een Illustrator-export moet expliciet aan de immutable oorspronkelijke bron gekoppeld zijn."), { statusCode: 400, code: "PRODUCTION_ASSET_CONVERSION_LINK_INVALID" });
      if (canonicalSvg !== (conversionMethod === "HUMAN_VERIFIED_SVG")) throw Object.assign(new Error("Alleen een veilig gevalideerde SVG mag de canonical SVG-productieroute gebruiken."), { statusCode: 400, code: "PRODUCTION_ASSET_CONVERSION_METHOD_INVALID" });
      const source = {
        id: `production-source-${inspected.source.sha256.slice(0, 16).toLowerCase()}`,
        version: `1-${inspected.source.sha256.slice(0, 12)}`,
        revision: 1,
        intakeKind,
        original: { ...inspected.source, dataBase64: bytes.toString("base64") },
        conversion: { method: conversionMethod, methodVersion: "1", derivedFromSourceId, derivedFromSha256: referenceSource?.original.sha256 ?? null },
        fidelity: canonicalSvg
          ? { status: "MATCHED", comparisonMethod: "CANONICAL_SVG_PREVIEW", referenceSha256: inspected.source.sha256, checkedAt: iso(), checkedBy: { userId: user.id, name: user.name }, note: "Preview en productie gebruiken dezelfde gevalideerde SVG-geometrie." }
          : { status: "REFERENCE_REQUIRED", comparisonMethod: "HUMAN_SIDE_BY_SIDE", referenceSha256: referenceSource?.original.sha256 ?? inspected.source.sha256, checkedAt: null, checkedBy: null, note: null },
        provenance: optional(payload.provenance, 500) || `Toegevoegd via Sportpaleis Workspace door ${user.name}`,
        uploadedAt: iso(),
        uploadedBy: { userId: user.id, name: user.name },
        inspection: inspected.inspection,
        documentPreviewSvg: inspected.documentPreviewSvg,
        candidates: inspected.candidates,
      };
      state.productionAssetSources.push(source);
      audit(state, user.id, canonicalSvg ? "SVG-productiebron veilig gevalideerd" : "Vectorbron diagnostisch geïnspecteerd", source.id, { version: source.version, sha256: source.original.sha256, candidates: source.candidates.length, filename: source.original.filename, conversionMethod, derivedFromSourceId, intakeKind });
      return { state, value: publicProductionAssetSource(source) };
    });
    return result.value;
  }

  async productionAssetOriginal(token, sourceId) {
    const { user } = await this.authenticate(token); assertRole(user, ["admin", "operator"]);
    const state = await this.store.read();
    const source = state.productionAssetSources?.find(({ id }) => id === sourceId);
    if (!source?.original?.dataBase64) throw Object.assign(new Error("Oorspronkelijke productiebron niet gevonden."), { statusCode: 404, code: "PRODUCTION_ASSET_SOURCE_NOT_FOUND" });
    return { mimeType: source.original.mimeType, bytes: Buffer.from(source.original.dataBase64, "base64"), filename: source.original.filename, sha256: source.original.sha256, cacheControl: "private, no-store", allowSameOriginFrame: source.original.format === "PDF" };
  }

  async reviewProductionAssetSourceFidelity(token, csrfToken, sourceId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin"]);
    if (payload.proofAuthority !== "HUMAN_SOURCE_COMPARISON") throw Object.assign(new Error("Bronfidelity vereist een menselijke vergelijking met de bewezen bronweergave."), { statusCode: 403, code: "PRODUCTION_ASSET_FIDELITY_AUTHORITY_REQUIRED" });
    const status = allowedValue(payload.status, ["MATCHED", "MISMATCH"], "Bronvergelijking");
    const result = await this.store.mutate(async (state) => {
      const source = state.productionAssetSources?.find(({ id }) => id === sourceId);
      if (!source) throw Object.assign(new Error("Vectorbron niet gevonden."), { statusCode: 404, code: "PRODUCTION_ASSET_SOURCE_NOT_FOUND" });
      if (source.original?.format === "SVG") throw Object.assign(new Error("Deze SVG-preview is de gevalideerde productiegeometrie zelf; de productievrijgave gebeurt via Human GO."), { statusCode: 409, code: "PRODUCTION_ASSET_SVG_FIDELITY_CANONICAL" });
      if (Number(payload.expectedRevision) !== Number(source.revision ?? 1)) throw Object.assign(new Error("De bronreview is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: Number(source.revision ?? 1) });
      const note = optional(payload.note, 500) || null;
      if (status === "MISMATCH" && !note) throw Object.assign(new Error("Beschrijf kort welke zichtbare afwijking is gevonden."), { statusCode: 400, code: "PRODUCTION_ASSET_FIDELITY_NOTE_REQUIRED" });
      source.fidelity = { status, comparisonMethod: "HUMAN_SIDE_BY_SIDE", referenceSha256: source.fidelity?.referenceSha256 ?? source.original.sha256, checkedAt: iso(), checkedBy: { userId: user.id, name: user.name }, note };
      source.revision = Number(source.revision ?? 1) + 1;
      audit(state, user.id, status === "MATCHED" ? "Productiebron fidelity bevestigd" : "Productiebron fidelity afgekeurd", source.id, { status, sourceSha256: source.original.sha256, referenceSha256: source.fidelity.referenceSha256, conversionMethod: source.conversion?.method ?? "ORIGINAL_PDF_INTERPRETATION", note });
      return { state, value: publicProductionAssetSource(source) };
    });
    return result.value;
  }

  async saveProductionAssetReviewDraft(token, csrfToken, sourceId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const source = state.productionAssetSources?.find(({ id }) => id === sourceId);
      if (!source) throw Object.assign(new Error("Productiebron niet gevonden."), { statusCode: 404, code: "PRODUCTION_ASSET_SOURCE_NOT_FOUND" });
      const currentRevision = Number(source.reviewDraft?.revision ?? 0);
      if (Number(payload.revision ?? 0) !== currentRevision) throw Object.assign(new Error("De controle is intussen op een andere werkplek gewijzigd. De nieuwste keuzes blijven bewaard."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision });
      const selectedCandidateIds = [...new Set((Array.isArray(payload.selectedCandidateIds) ? payload.selectedCandidateIds : []).map(String))];
      if (selectedCandidateIds.some((id) => !source.candidates.some((candidate) => candidate.id === id))) throw Object.assign(new Error("Een gekozen voorbeeld hoort niet bij deze bron."), { statusCode: 400, code: "PRODUCTION_ASSET_SELECTION_INVALID" });
      const glyphAssignments = Object.fromEntries(Object.entries(payload.glyphAssignments ?? {}).filter(([candidateId, value]) => source.candidates.some(({ id }) => id === candidateId) && (value === "" || value === "NOT_USED" || /^\d$/u.test(String(value)))).map(([candidateId, value]) => [candidateId, String(value)]));
      const text = (value, max = 160) => String(value ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ").slice(0, max);
      const candidateArtwork = Object.fromEntries(Object.entries(payload.candidateArtwork ?? {}).filter(([candidateId]) => source.candidates.some(({ id }) => id === candidateId)).map(([candidateId, value]) => [candidateId, {
        name: text(value?.name),
        kind: allowedValue(value?.kind ?? "LOGO", ["LOGO", "SPONSOR", "ARTWORK"], "Type opdruk"),
      }]));
      source.reviewDraft = {
        revision: currentRevision + 1,
        updatedAt: iso(),
        updatedBy: { userId: user.id, name: user.name },
        selectedCandidateIds,
        glyphAssignments,
        candidateArtwork,
        name: text(payload.name),
        primaryContextKey: text(payload.primaryContextKey, 260),
        additionalContextKeys: [...new Set((Array.isArray(payload.additionalContextKeys) ? payload.additionalContextKeys : []).map((value) => text(value, 260)).filter(Boolean))].slice(0, 20),
        applicationKind: allowedValue(payload.applicationKind ?? "ARTWORK", ["LOGO", "SPONSOR", "NUMBER_SET", "ARTWORK"], "Gebruik"),
        productionMethod: allowedValue(payload.productionMethod ?? "SELF_PRODUCED", ["SELF_PRODUCED", "PHYSICAL_TRANSFER"], "Productiewijze"),
        widthMm: text(payload.widthMm, 20),
        heightMm: text(payload.heightMm, 20),
        sizePolicyMode: allowedValue(payload.sizePolicyMode ?? "FIXED", ["FIXED", "DEFAULT_WITH_LIMITS", "PROPORTIONAL_FREE"], "Maatbeleid"),
        minWidthMm: text(payload.minWidthMm, 20),
        maxWidthMm: text(payload.maxWidthMm, 20),
        defaultFoilColor: text(payload.defaultFoilColor, 40),
        strokeReviewAccepted: payload.strokeReviewAccepted === true,
      };
      return { state, value: publicProductionAssetSource(source) };
    });
    return result.value;
  }

  async productionAssetCandidatePreview(token, sourceId, candidateId) {
    const { user } = await this.authenticate(token); assertRole(user, ["admin", "operator"]);
    const state = await this.store.read();
    const source = state.productionAssetSources?.find(({ id }) => id === sourceId);
    const candidate = source?.candidates.find(({ id }) => id === candidateId);
    if (!candidate?.previewSvg) throw Object.assign(new Error("Vectorvoorbeeld niet gevonden."), { statusCode: 404, code: "PRODUCTION_ASSET_PREVIEW_NOT_FOUND" });
    return { mimeType: "image/svg+xml; charset=utf-8", bytes: Buffer.from(candidate.previewSvg, "utf8"), filename: `${candidate.id}.svg`, sha256: candidate.geometryHash, cacheControl: "private, max-age=300" };
  }

  async productionAssetDocumentPreview(token, sourceId) {
    const { user } = await this.authenticate(token); assertRole(user, ["admin", "operator"]);
    const state = await this.store.read();
    const source = state.productionAssetSources?.find(({ id }) => id === sourceId);
    if (!source?.documentPreviewSvg) throw Object.assign(new Error("Documentvoorbeeld niet gevonden."), { statusCode: 404, code: "PRODUCTION_ASSET_PREVIEW_NOT_FOUND" });
    return { mimeType: "image/svg+xml; charset=utf-8", bytes: Buffer.from(source.documentPreviewSvg, "utf8"), filename: `${source.id}.svg`, sha256: source.original.sha256, cacheControl: "private, max-age=300" };
  }

  async productionAssetPreview(token, elementId) {
    const { user } = await this.authenticate(token); assertRole(user, ["admin", "operator", "store"]);
    const state = await this.store.read();
    const asset = state.productionElements.find(({ id, sourceId }) => id === elementId && sourceId);
    if (!asset) throw Object.assign(new Error("Productieassetvoorbeeld niet gevonden."), { statusCode: 404, code: "PRODUCTION_ASSET_PREVIEW_NOT_FOUND" });
    const svg = productionAssetPreviewSvg(asset);
    return { mimeType: "image/svg+xml; charset=utf-8", bytes: Buffer.from(svg, "utf8"), filename: `${asset.id}.svg`, sha256: asset.controlledVector.geometryHash, cacheControl: "private, max-age=300" };
  }

  async productionAssetNumberPreview(token, elementId, value) {
    const { user } = await this.authenticate(token); assertRole(user, ["admin", "operator", "store"]);
    const state = await this.store.read();
    const asset = state.productionElements.find(({ id, sourceId, applications }) => id === elementId && sourceId && applications?.some(({ kind }) => kind === "NUMBER_SET"));
    const digits = String(value ?? "");
    if (!asset || !/^\d{1,4}$/u.test(digits)) throw Object.assign(new Error("Nummervoorbeeld niet gevonden."), { statusCode: 404, code: "PRODUCTION_ASSET_PREVIEW_NOT_FOUND" });
    const variant = asset.variants.find(({ heightMm }) => Number(heightMm) > 0);
    // Archivering blocks new selection and physical production, but must not
    // erase the immutable historical preview. Reuse the exact stored geometry
    // under a preview-only readiness projection; no persisted lifecycle state
    // or production eligibility is changed.
    const previewAsset = asset.lifecycleStatus === "ARCHIVED" ? { ...asset, lifecycleStatus: "PRODUCTION_READY" } : asset;
    const piece = productionAssetPiece({ asset: previewAsset, variant, line: { id: "number-preview", content: digits, widthMm: Number(variant?.widthMm), heightMm: Number(variant?.heightMm), preview: { label: `Nummer ${digits}` } }, order: { id: "PREVIEW", association: asset.ownerName, items: [] }, foilColor: asset.defaultFoilColor ?? "Preview" });
    const svg = productionAssetPreviewSvg({ controlledVector: { contours: piece.contours } });
    return { mimeType: "image/svg+xml; charset=utf-8", bytes: Buffer.from(svg, "utf8"), filename: `${asset.id}-${digits}.svg`, sha256: sha256(svg).toUpperCase(), cacheControl: "private, max-age=300" };
  }

  async promoteProductionAsset(token, csrfToken, sourceId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin"]);
    if (payload.proofAuthority !== "HUMAN_ACCEPTANCE") throw Object.assign(new Error("Productievrijgave vereist expliciete Human Acceptance."), { statusCode: 403, code: "PRODUCTION_PROOF_AUTHORITY_REQUIRED" });
    const result = await this.store.mutate(async (state) => {
      const source = state.productionAssetSources?.find(({ id }) => id === sourceId);
      if (!source) throw Object.assign(new Error("Vectorbron niet gevonden."), { statusCode: 404, code: "PRODUCTION_ASSET_SOURCE_NOT_FOUND" });
      if (source.original?.format !== "SVG" || source.conversion?.method !== "HUMAN_VERIFIED_SVG") throw Object.assign(new Error("Deze AI/PDF-bron is uitsluitend provenance/diagnostiek. Voeg de menselijke SVG-export toe voor productie."), { statusCode: 409, code: "PRODUCTION_ASSET_CANONICAL_SVG_REQUIRED" });
      const candidateIds = [...new Set(Array.isArray(payload.candidateIds) ? payload.candidateIds.map(String) : [])];
      const candidates = candidateIds.map((id) => source.candidates.find((candidate) => candidate.id === id));
      if (!candidateIds.length || candidates.some((candidate) => !candidate)) throw Object.assign(new Error("Kies één of meer geldige vectorvormen."), { statusCode: 400, code: "PRODUCTION_ASSET_SELECTION_INVALID" });
      if (candidates.some(({ warnings }) => warnings.includes("STROKE_REQUIRES_REVIEW")) && payload.strokeReviewAccepted !== true) throw Object.assign(new Error("Deze bron bevat lijncontouren. Bevestig eerst dat de gecontroleerde vorm productierijp is."), { statusCode: 409, code: "PRODUCTION_ASSET_STROKE_REVIEW_REQUIRED" });
      const absoluteContours = candidates.flatMap((candidate) => candidate.controlledVector.contours.map((contour) => ({ ...contour, points: contour.points.map(({ x, y }) => ({ x: x + Number(candidate.controlledVector.sourceOriginMm?.x ?? 0), y: y + Number(candidate.controlledVector.sourceOriginMm?.y ?? 0) })) })));
      const allPoints = absoluteContours.flatMap(({ points }) => points);
      const minX = Math.min(...allPoints.map(({ x }) => x)); const minY = Math.min(...allPoints.map(({ y }) => y));
      const contours = absoluteContours.map((contour, index) => ({ id: `contour-${index + 1}`, closed: true, points: contour.points.map(({ x, y }) => ({ x: Math.round((x - minX) * 100000) / 100000, y: Math.round((y - minY) * 100000) / 100000 })) }));
      const geometryHash = sha256(JSON.stringify(contours)).toUpperCase();
      let widthMm = Number(payload.widthMm); let heightMm = Number(payload.heightMm);
      const applications = Array.isArray(payload.applications) ? payload.applications.slice(0, 20).map((application) => ({ kind: allowedValue(application.kind, ["LOGO", "SPONSOR", "NUMBER_SET", "ARTWORK"], "Toepassing"), placement: optional(application.placement, 160) || null })) : [{ kind: "ARTWORK", placement: null }];
      const productionMethod = allowedValue(payload.productionMethod, ["SELF_PRODUCED", "PHYSICAL_TRANSFER"], "Productiemethode");
      const requiresArtworkFidelity = productionMethod === "SELF_PRODUCED" && applications.some(({ kind }) => ["LOGO", "SPONSOR", "ARTWORK"].includes(kind));
      if (requiresArtworkFidelity && source.fidelity?.status !== "MATCHED") throw Object.assign(new Error(source.fidelity?.status === "MISMATCH" ? "De Workspace-preview wijkt af van de bewezen bron. Gebruik eerst een gecontroleerde vector-export en vergelijk opnieuw." : "Vergelijk bron en Workspace-productiepreview eerst visueel naast elkaar."), { statusCode: 409, code: "PRODUCTION_ASSET_SOURCE_FIDELITY_REQUIRED", fidelityStatus: source.fidelity?.status ?? "REFERENCE_REQUIRED" });
      const selectedWidth = Math.max(...contours.flatMap(({ points }) => points.map(({ x }) => x)));
      const selectedHeight = Math.max(...contours.flatMap(({ points }) => points.map(({ y }) => y)));
      if (!(selectedWidth > 0) || !(selectedHeight > 0)) throw Object.assign(new Error("De geselecteerde vector heeft geen geldige fysieke begrenzing."), { statusCode: 400, code: "PRODUCTION_ASSET_SIZE_MISSING" });
      const isNumberSet = applications.some(({ kind }) => kind === "NUMBER_SET");
      let hasProductionSize = widthMm > 0 || heightMm > 0;
      if (isNumberSet) {
        if (!(heightMm > 0)) throw Object.assign(new Error("Leg voor een nummerbron de exacte fysieke cijferhoogte vast."), { statusCode: 400, code: "PRODUCTION_ASSET_SIZE_MISSING" });
        // A glyph sheet's source spread is not a physical output width: the width
        // changes per composed number. Keep one bounded nominal width beside the
        // authoritative glyph height so a saved set can be reused by later orders.
        widthMm = heightMm;
        hasProductionSize = true;
      } else if (hasProductionSize) {
        if (!(widthMm > 0)) widthMm = heightMm * selectedWidth / selectedHeight;
        if (!(heightMm > 0)) heightMm = widthMm * selectedHeight / selectedWidth;
        if (Math.abs((widthMm / heightMm) - (selectedWidth / selectedHeight)) > 0.002) {
          throw Object.assign(new Error("De fysieke maat moet de vaste verhouding van de geselecteerde vector behouden."), { statusCode: 400, code: "PRODUCTION_ASSET_ASPECT_RATIO_MISMATCH" });
        }
      } else {
        widthMm = null; heightMm = null;
      }
      const requestedSizePolicy = isNumberSet
        ? "FIXED"
        : hasProductionSize ? allowedValue(payload.sizePolicyMode ?? "FIXED", ["FIXED", "DEFAULT_WITH_LIMITS", "PROPORTIONAL_FREE"], "Maatbeleid") : null;
      let minWidthMm = payload.minWidthMm === "" || payload.minWidthMm === undefined ? null : Number(payload.minWidthMm);
      let maxWidthMm = payload.maxWidthMm === "" || payload.maxWidthMm === undefined ? null : Number(payload.maxWidthMm);
      if (requestedSizePolicy === "FIXED") { minWidthMm = widthMm; maxWidthMm = widthMm; }
      if (requestedSizePolicy === "DEFAULT_WITH_LIMITS" && (!(minWidthMm > 0) || !(maxWidthMm >= minWidthMm) || widthMm < minWidthMm || widthMm > maxWidthMm)) {
        throw Object.assign(new Error("Leg voor schaalbaar artwork een veilige minimum- en maximumbreedte rond de standaardmaat vast."), { statusCode: 400, code: "PRODUCTION_ASSET_SIZE_POLICY_INVALID" });
      }
      if (requestedSizePolicy === "PROPORTIONAL_FREE") { minWidthMm = null; maxWidthMm = null; }
      let numberGlyphs;
      if (isNumberSet) {
        const glyphEntries = Object.entries(payload.glyphMap ?? {}).filter(([, candidateId]) => String(candidateId).trim());
        if (glyphEntries.length !== 10 || new Set(glyphEntries.map(([digit]) => digit)).size !== 10 || glyphEntries.some(([digit]) => !/^\d$/u.test(digit))) throw Object.assign(new Error("Koppel voor een nummerbron exact de cijfers 0 tot en met 9."), { statusCode: 400, code: "PRODUCTION_ASSET_GLYPH_MAP_INCOMPLETE" });
        numberGlyphs = Object.fromEntries(glyphEntries.map(([digit, candidateId]) => {
          const candidate = source.candidates.find(({ id }) => id === candidateId && candidateIds.includes(id));
          if (!candidate) throw Object.assign(new Error(`De vectorvorm voor cijfer ${digit} is niet geselecteerd.`), { statusCode: 400, code: "PRODUCTION_ASSET_GLYPH_MAP_INVALID" });
          return [digit, { candidateId: candidate.id, geometryHash: candidate.geometryHash, widthUnits: candidate.boundsMm.width, heightUnits: candidate.boundsMm.height, contours: structuredClone(candidate.controlledVector.contours) }];
        }));
      }
      const contexts = Array.isArray(payload.contexts) ? payload.contexts.slice(0, 100).map((context) => ({ type: allowedValue(context.type, ["ASSOCIATION", "SPONSOR", "ORGANIZATION", "TEAM", "ARTICLE", "ORDER", "GENERIC"], "Contexttype"), id: requiredText(context.id, "Context-ID", 160), label: requiredText(context.label, "Context", 160) })) : [];
      for (const context of contexts.filter(({ type }) => type === "ASSOCIATION")) {
        const association = state.associations.find(({ id, name }) => id === context.id || name === context.label);
        if (!association || association.name !== context.label) throw Object.assign(new Error("Kies een bestaande vereniging uit Workspace."), { statusCode: 400, code: "PRODUCTION_ASSET_ASSOCIATION_CONTEXT_INVALID" });
      }
      const productionProfileId = optional(payload.productionProfileId, 180) || null;
      const linkedProfile = productionProfileId ? state.productionProfiles?.find(({ id }) => id === productionProfileId) : null;
      let linkedProfileField = null;
      if (productionProfileId && !linkedProfile) throw Object.assign(new Error("Het gekozen productieprofiel bestaat niet meer."), { statusCode: 409, code: "PRODUCTION_ASSET_PROFILE_NOT_FOUND" });
      if (linkedProfile) {
        if (!isNumberSet) throw Object.assign(new Error("Alleen een gecontroleerde SVG-nummerset kan aan een nummerprofiel worden gekoppeld."), { statusCode: 400, code: "PRODUCTION_ASSET_PROFILE_APPLICATION_INVALID" });
        const associationContext = contexts.find(({ type }) => type === "ASSOCIATION");
        const profileBelongsToContext = associationContext && state.articles.some(({ association, profileId, active }) => active !== false && association === associationContext.label && profileId === linkedProfile.id);
        if (!profileBelongsToContext) throw Object.assign(new Error("Kies een productieprofiel dat bij de geselecteerde vereniging en haar artikelen hoort."), { statusCode: 400, code: "PRODUCTION_ASSET_PROFILE_CONTEXT_MISMATCH" });
        const requestedPlacement = applications.find(({ kind }) => kind === "NUMBER_SET")?.placement ?? "";
        const placementFields = [
          /rug/iu.test(requestedPlacement) ? "backNumber" : null,
          /borst/iu.test(requestedPlacement) ? "chestNumber" : null,
          /short|rok/iu.test(requestedPlacement) ? "shortsNumber" : null,
        ].filter(Boolean);
        linkedProfileField = placementFields.find((field) => linkedProfile.supports?.includes(field)) ?? null;
        if (!linkedProfileField) throw Object.assign(new Error("De gekozen toepassing hoort niet bij dit productieprofiel. Kies het profiel voor Rug, Borst of Short/rok dat deze bedrukking ondersteunt."), { statusCode: 400, code: "PRODUCTION_ASSET_PROFILE_PLACEMENT_MISMATCH" });
        if (!["backNumber", "chestNumber", "shortsNumber"].includes(linkedProfileField)) throw Object.assign(new Error("Een SVG-nummerset kan uitsluitend aan een expliciete nummer-toepassing worden gekoppeld."), { statusCode: 409, code: "PRODUCTION_ASSET_SOURCE_TYPE_MISMATCH", expectedSourceType: "MANAGED_FONT", applicationField: linkedProfileField });
        const existingSourceRegistrations = state.productionElements.filter(({ sourceId }) => sourceId === source.id);
        const targetAssociationIdentities = associationContext ? [associationContext.id, associationContext.label] : [];
        if (existingSourceRegistrations.length && !existingSourceRegistrations.some((asset) => productionAssetReuseDecision({ asset, targetAssociationIdentities, applicationField: linkedProfileField }).allowed)) {
          throw Object.assign(new Error("Deze bestaande immutable bron is niet voor deze exacte vereniging en nummer-toepassing bevestigd."), { statusCode: 409, code: "PRODUCTION_ASSET_SOURCE_REUSE_MISMATCH", applicationField: linkedProfileField });
        }
      }
      const registrationBody = {
        sourceSha256: source.original.sha256,
        sourceVersion: source.version,
        geometryHash,
        productionMethod,
        contexts: [...contexts].sort((left, right) => `${left.type}:${left.id}`.localeCompare(`${right.type}:${right.id}`)).map(({ type, id }) => ({ type, id })),
        applications: [...applications].sort((left, right) => `${left.kind}:${left.placement ?? ""}`.localeCompare(`${right.kind}:${right.placement ?? ""}`)),
        sizePolicy: { mode: requestedSizePolicy, widthMm, heightMm, minWidthMm, maxWidthMm },
        defaultFoilColor: optional(payload.defaultFoilColor, 40) || null,
      };
      const registrationId = `source-registration-${sha256(JSON.stringify(registrationBody)).slice(0, 32).toLowerCase()}`;
      const existingRegistration = state.productionElements.find((candidate) => candidate.registrationId === registrationId);
      if (existingRegistration) {
        const linkedAssociation = contexts.find(({ type }) => type === "ASSOCIATION");
        const assignmentHeightMm = linkedProfile && linkedProfileField
          ? profileFieldPhysicalHeightMm(state.associations.find(({ id, name }) => linkedAssociation?.id === id || linkedAssociation?.label === name || linkedProfile.associationId === id || linkedProfile.association === name), linkedProfile, linkedProfileField) || heightMm
          : heightMm;
        const assignmentChanged = Boolean(linkedProfile && linkedProfileField && assignedProductionNumberAssetId(state, linkedProfile, linkedProfileField, assignmentHeightMm) !== existingRegistration.id);
        if (linkedProfile && (!linkedProfile.productionNumberAssetIds?.includes(existingRegistration.id) || assignmentChanged)) {
          const previous = structuredClone(linkedProfile);
          linkedProfile.productionNumberAssetIds = [...new Set([...(linkedProfile.productionNumberAssetIds ?? []), existingRegistration.id])];
          if (linkedProfileField) assignProductionNumberAsset(linkedProfile, linkedProfileField, assignmentHeightMm, existingRegistration, heightMm);
          linkedProfile.revision = Number(linkedProfile.revision ?? 1) + 1;
          linkedProfile.validationHistory ??= [];
          linkedProfile.validationHistory.unshift({ at: iso(), userId: user.id, previous, next: structuredClone(linkedProfile), source: `${source.original.filename} · ${source.original.sha256} · bestaande registratie gekoppeld via Guided Source Setup` });
          audit(state, user.id, "Bestaande productiebron aan profiel gekoppeld", linkedProfile.id, { productionAssetId: existingRegistration.id, decorationField: linkedProfileField, registrationId, sourceId: source.id, sourceSha256: source.original.sha256, profileRevision: linkedProfile.revision });
        }
        audit(state, user.id, "Bestaande productiebronregistratie hergebruikt", existingRegistration.id, { registrationId, sourceId: source.id, sourceSha256: source.original.sha256, productionProfileId });
        return { state, value: publicProductionElement(existingRegistration) };
      }
      const element = {
        id: `production-asset-${registrationId.slice(-16)}`,
        registrationId,
        name: requiredText(payload.name, "Naam", 160),
        ownerType: allowedValue(payload.ownerType, ["ASSOCIATION", "CUSTOMER", "SPONSOR", "OWN_BRAND"], "Eigenaartype"),
        ownerName: requiredText(payload.ownerName, "Vereniging/klant/sponsor", 160),
        sourceAsset: `${source.original.filename} · ${source.original.sha256}`,
        sourceStatus: "AVAILABLE",
        sourceId: source.id,
        version: `1-${geometryHash.slice(0, 12)}`,
        lifecycleStatus: hasProductionSize ? "PRODUCTION_READY" : "REVIEW",
        productionMethod,
        contexts,
        applications,
        admission: {
          lifecycle: "AUTHORITATIVE",
          sourceType: isNumberSet ? "SVG_VECTOR_NUMBERSET" : "LOGO_ARTWORK",
          stages: ["STORED", "IDENTIFIED", "VALIDATED", "APPLICATION_COMPATIBLE", "PRODUCTION_EXECUTABLE", "PREVIEWED", "HUMAN_CONFIRMED", "AUTHORITATIVE"],
          applicationBindings: structuredClone(applications),
          sourceSha256: source.original.sha256,
          geometrySha256: geometryHash,
          confirmedAt: iso(),
          confirmedBy: { userId: user.id, name: user.name },
        },
        sourceSelection: { candidateIds, selectionRef: candidates.flatMap(({ equivalentSelectionRefs, selectionRef }) => equivalentSelectionRefs?.length ? equivalentSelectionRefs : [selectionRef]).join("+"), geometryHash },
        controlledVector: { format: "WBD_CONTOURS_V1", geometryHash, contourCount: contours.length, pointCount: contours.reduce((sum, contour) => sum + contour.points.length, 0), contours },
        ...(hasProductionSize ? { sizePolicy: { mode: requestedSizePolicy, aspectRatioLocked: true, defaultWidthMm: widthMm, defaultHeightMm: heightMm, minWidthMm, maxWidthMm } } : {}),
        defaultFoilColor: optional(payload.defaultFoilColor, 40) || null,
        ...(productionMethod === "PHYSICAL_TRANSFER" ? { physicalTransfer: { supplier: null, location: null, stock: null, reserved: null } } : {}),
        ...(numberGlyphs ? { numberGlyphs, numberComposition: { freeContourSpacingMm: NUMBER_GLYPH_SPACING_MM, measurement: "CONTOUR_TO_CONTOUR" } } : {}),
        sourceLayers: { visualSource: null, vectorSource: { filename: source.original.filename, mimeType: source.original.mimeType, sha256: source.original.sha256 }, validatedCutContour: { sourceId: source.id, version: source.version, sha256: geometryHash, fidelityStatus: source.fidelity?.status ?? "REFERENCE_REQUIRED", conversionMethod: source.conversion?.method ?? "ORIGINAL_PDF_INTERPRETATION" }, physicallyProvenContour: null },
        revision: 1,
        variants: [{ id: `variant-${registrationId.slice(-12)}`, label: requiredText(payload.variantLabel ?? "Standaard", "Variant", 120), widthMm, heightMm, productionMode: productionMethod === "SELF_PRODUCED" ? "INTERNAL_PLOT" : "EXTERNAL", currentStock: null, minimumStock: null, targetStock: null }],
      };
      state.productionElements.push(element);
      if (linkedProfile) {
        const previous = structuredClone(linkedProfile);
        linkedProfile.productionNumberAssetIds = [...new Set([...(linkedProfile.productionNumberAssetIds ?? []), element.id])];
        const linkedAssociation = contexts.find(({ type }) => type === "ASSOCIATION");
        const assignmentHeightMm = linkedProfileField
          ? profileFieldPhysicalHeightMm(state.associations.find(({ id, name }) => linkedAssociation?.id === id || linkedAssociation?.label === name || linkedProfile.associationId === id || linkedProfile.association === name), linkedProfile, linkedProfileField) || heightMm
          : heightMm;
        if (linkedProfileField) assignProductionNumberAsset(linkedProfile, linkedProfileField, assignmentHeightMm, element, heightMm);
        linkedProfile.revision = Number(linkedProfile.revision ?? 1) + 1;
        linkedProfile.validationHistory ??= [];
        linkedProfile.validationHistory.unshift({ at: iso(), userId: user.id, previous, next: structuredClone(linkedProfile), source: `${source.original.filename} · ${source.original.sha256} · expliciet gekoppeld via Guided Source Setup` });
        audit(state, user.id, "Gecontroleerde productiebron aan profiel gekoppeld", linkedProfile.id, { productionAssetId: element.id, decorationField: linkedProfileField, sourceId: source.id, sourceSha256: source.original.sha256, profileRevision: linkedProfile.revision });
      }
      if (source.reviewDraft) {
        const promotedIds = new Set(candidateIds);
        source.reviewDraft.selectedCandidateIds = source.reviewDraft.selectedCandidateIds.filter((id) => !promotedIds.has(id));
        source.reviewDraft.glyphAssignments = Object.fromEntries(Object.entries(source.reviewDraft.glyphAssignments ?? {}).filter(([id]) => !promotedIds.has(id)));
        source.reviewDraft.candidateArtwork = Object.fromEntries(Object.entries(source.reviewDraft.candidateArtwork ?? {}).filter(([id]) => !promotedIds.has(id)));
        if (source.reviewDraft.selectedCandidateIds.length) {
          source.reviewDraft.revision += 1;
          source.reviewDraft.updatedAt = iso();
          source.reviewDraft.updatedBy = { userId: user.id, name: user.name };
        } else delete source.reviewDraft;
      }
      audit(state, user.id, hasProductionSize ? "Productieasset vrijgegeven" : "Productieasset veilig bewaard", element.id, { registrationId, sourceId: source.id, sourceVersion: source.version, sourceSha256: source.original.sha256, candidateIds, geometryHash, lifecycleStatus: element.lifecycleStatus, productionMethod: element.productionMethod, sizePolicy: requestedSizePolicy, productionProfileId, admissionLifecycle: element.admission.lifecycle, applicationBindings: element.admission.applicationBindings, rawToken: undefined });
      return { state, value: publicProductionElement(element) };
    });
    return result.value;
  }

  async setProductionAssetLifecycle(token, csrfToken, elementId, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin"]);
    const status = allowedValue(payload.lifecycleStatus, ["PRODUCTION_READY", "ARCHIVED"], "Assetstatus");
    const result = await this.store.mutate(async (state) => {
      const element = state.productionElements.find(({ id, sourceId }) => id === elementId && sourceId);
      if (!element) throw Object.assign(new Error("Managed productieasset niet gevonden."), { statusCode: 404, code: "PRODUCTION_ASSET_NOT_FOUND" });
      if (Number(payload.expectedRevision) !== element.revision) throw Object.assign(new Error("De productieasset is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: element.revision });
      if (status === "ARCHIVED") {
        const activeReference = state.orders.find(({ stage, productionLines }) => stage !== "DONE" && productionLines?.some(({ source }) => source?.kind === "PRODUCTION_ELEMENT" && source.id === element.id));
        if (activeReference) throw Object.assign(new Error(`Deze asset wordt nog gebruikt door open order ${activeReference.id}. Rond die eerst af.`), { statusCode: 409, code: "PRODUCTION_ASSET_IN_ACTIVE_USE" });
      }
      if (status === "PRODUCTION_READY" && element.lifecycleStatus === "REVIEW") {
        const widthMm = Number(payload.widthMm);
        if (!(widthMm > 0) || widthMm > 1000) throw Object.assign(new Error("Leg eerst een betrouwbare fysieke breedte vast."), { statusCode: 400, code: "PRODUCTION_ASSET_SIZE_MISSING" });
        const points = element.controlledVector?.contours?.flatMap(({ points }) => points) ?? [];
        const minX = Math.min(...points.map(({ x }) => x)); const maxX = Math.max(...points.map(({ x }) => x));
        const minY = Math.min(...points.map(({ y }) => y)); const maxY = Math.max(...points.map(({ y }) => y));
        const sourceWidth = maxX - minX; const sourceHeight = maxY - minY;
        if (!(sourceWidth > 0) || !(sourceHeight > 0)) throw Object.assign(new Error("De bewaarde vector heeft geen geldige fysieke begrenzing."), { statusCode: 409, code: "PRODUCTION_ASSET_SIZE_MISSING" });
        const heightMm = Math.round((widthMm * sourceHeight / sourceWidth) * 1000) / 1000;
        element.sizePolicy = { mode: "FIXED", aspectRatioLocked: true, defaultWidthMm: widthMm, defaultHeightMm: heightMm, minWidthMm: widthMm, maxWidthMm: widthMm };
        element.variants[0].widthMm = widthMm;
        element.variants[0].heightMm = heightMm;
      }
      element.lifecycleStatus = status;
      element.revision += 1;
      audit(state, user.id, status === "ARCHIVED" ? "Productieasset gearchiveerd" : "Productieasset productieklaar gemaakt", element.id, { lifecycleStatus: status, sourceId: element.sourceId, version: element.version, physicalSize: element.sizePolicy ? { widthMm: element.sizePolicy.defaultWidthMm, heightMm: element.sizePolicy.defaultHeightMm } : null });
      return { state, value: publicProductionElement(element) };
    });
    return result.value;
  }

  async upsertProductionElement(token, csrfToken, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const existing = payload.id ? state.productionElements.find(({ id }) => id === payload.id) : null;
      if (existing && Number(payload.expectedRevision) !== existing.revision) throw Object.assign(new Error("Het productie-element is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: existing.revision });
      const variants = Array.isArray(payload.variants) ? payload.variants : [];
      if (!variants.length || variants.length > 20) throw Object.assign(new Error("Een productie-element heeft 1 tot 20 varianten."), { statusCode: 400, code: "PRODUCTION_ELEMENT_VARIANTS_INVALID" });
      const numberOrNull = (value, label, { integer = false } = {}) => {
        if (value === null || value === "" || value === undefined) return null;
        const numeric = Number(value); if (!(numeric >= 0) || (integer && !Number.isInteger(numeric))) throw Object.assign(new Error(`Ongeldige ${label.toLowerCase()}.`), { statusCode: 400, code: "VALIDATION_ERROR" }); return numeric;
      };
      const normalizedVariants = variants.map((variant, index) => ({
        id: String(variant.id ?? "").trim() || `${existing?.id ?? "element"}-variant-${index + 1}-${randomBytes(3).toString("hex")}`,
        label: requiredText(variant.label, "Variant", 120),
        widthMm: numberOrNull(variant.widthMm, "Breedte"), heightMm: numberOrNull(variant.heightMm, "Hoogte"),
        productionMode: allowedValue(variant.productionMode, ["INTERNAL_PLOT", "EXTERNAL"], "Productiewijze"),
        currentStock: numberOrNull(variant.currentStock, "Voorraad", { integer: true }), minimumStock: numberOrNull(variant.minimumStock, "Minimum", { integer: true }), targetStock: numberOrNull(variant.targetStock, "Aanvulniveau", { integer: true }),
      }));
      if (new Set(normalizedVariants.map(({ id }) => id)).size !== normalizedVariants.length) throw Object.assign(new Error("Dubbele variant-ID."), { statusCode: 400, code: "VALIDATION_ERROR" });
      for (const variant of normalizedVariants) if (variant.minimumStock !== null && variant.targetStock !== null && variant.targetStock < variant.minimumStock) throw Object.assign(new Error("Aanvulniveau mag niet lager zijn dan het minimum."), { statusCode: 400, code: "PRODUCTION_STOCK_TARGET_INVALID" });
      const asset = (input, allowedMimeTypes, label) => {
        if (!input?.dataBase64) return input?.sha256 ? { filename: requiredText(input.filename, `${label}bestandsnaam`, 180), mimeType: allowedValue(input.mimeType, allowedMimeTypes, label), sha256: requiredText(input.sha256, `${label}hash`, 128) } : null;
        if (!this.uploadsEnabled) throw Object.assign(new Error("Bronuploads zijn uitgeschakeld."), { statusCode: 403, code: "UPLOADS_DISABLED" });
        const bytes = Buffer.from(input.dataBase64, "base64"); if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw Object.assign(new Error(`${label} moet 1 byte tot 5 MB zijn.`), { statusCode: 400, code: "PRODUCTION_ASSET_INVALID" });
        return { filename: requiredText(input.filename, `${label}bestandsnaam`, 180), mimeType: allowedValue(input.mimeType, allowedMimeTypes, label), sha256: sha256(bytes).toUpperCase(), dataBase64: bytes.toString("base64") };
      };
      const requestedLayers = payload.sourceLayers ?? {}; const previousLayers = existing?.sourceLayers ?? {};
      if ((requestedLayers.validatedCutContour || requestedLayers.physicallyProvenContour) && (user.role !== "admin" || payload.proofAuthority !== "HUMAN_ACCEPTANCE")) throw Object.assign(new Error("Een gevalideerde of fysiek bewezen contour vereist expliciete Human Acceptance door beheer."), { statusCode: 403, code: "PRODUCTION_PROOF_AUTHORITY_REQUIRED" });
      const proofLayer = (input, label) => input ? { sourceId: requiredText(input.sourceId, `${label} bron-ID`, 180), version: requiredText(input.version, `${label} versie`, 180), sha256: requiredText(input.sha256, `${label} hash`, 128) } : null;
      const sourceLayers = {
        visualSource: requestedLayers.visualSource ? asset(requestedLayers.visualSource, ["image/png", "image/jpeg", "image/webp", "image/svg+xml"], "Visuele bron") : previousLayers.visualSource ?? null,
        vectorSource: requestedLayers.vectorSource ? asset(requestedLayers.vectorSource, ["image/svg+xml", "application/pdf", "application/postscript", "application/illustrator"], "Vectorbron") : previousLayers.vectorSource ?? null,
        validatedCutContour: requestedLayers.validatedCutContour ? proofLayer(requestedLayers.validatedCutContour, "Snijcontour") : previousLayers.validatedCutContour ?? null,
        physicallyProvenContour: requestedLayers.physicallyProvenContour ? proofLayer(requestedLayers.physicallyProvenContour, "Fysieke contour") : previousLayers.physicallyProvenContour ?? null,
      };
      const element = { id: existing?.id ?? `production-element-${randomBytes(8).toString("hex")}`, name: requiredText(payload.name, "Naam", 160), ownerType: allowedValue(payload.ownerType, ["ASSOCIATION", "CUSTOMER", "SPONSOR", "OWN_BRAND"], "Eigenaartype"), ownerName: requiredText(payload.ownerName, "Vereniging/klant/sponsor", 160), sourceAsset: requiredText(payload.sourceAsset, "Bronasset/provenance", 500), sourceStatus: allowedValue(payload.sourceStatus, ["AVAILABLE", "REFERENCE_ONLY", "DATA_GAP"], "Bronstatus"), sourceLayers, revision: (existing?.revision ?? 0) + 1, variants: normalizedVariants };
      if (existing) Object.assign(existing, element); else state.productionElements.push(element);
      audit(state, user.id, existing ? "Productie-element gewijzigd" : "Productie-element toegevoegd", element.id, { revision: element.revision, variants: element.variants.length });
      const publicElement = { ...element, sourceLayers: Object.fromEntries(Object.entries(element.sourceLayers).map(([key, value]) => [key, value ? (({ dataBase64: _dataBase64, ...metadata }) => metadata)(value) : null])) };
      return { state, value: structuredClone(publicElement) };
    });
    return result.value;
  }

  async setProductionElementRequirement(token, csrfToken, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === payload.orderId); if (!order || order.stage === "DONE") throw Object.assign(new Error("Kies een open order."), { statusCode: 404, code: "OPEN_ORDER_NOT_FOUND" });
      const variantExists = state.productionElements.some(({ variants }) => variants.some(({ id }) => id === payload.variantId)); if (!variantExists) throw Object.assign(new Error("Productievariant niet gevonden."), { statusCode: 404, code: "PRODUCTION_VARIANT_NOT_FOUND" });
      const quantity = Number(payload.quantity); if (!Number.isInteger(quantity) || quantity < 0 || quantity > 10_000) throw Object.assign(new Error("Aantal moet een geheel getal tussen 0 en 10.000 zijn."), { statusCode: 400, code: "VALIDATION_ERROR" });
      const existing = state.productionElementRequirements.find(({ orderId, variantId }) => orderId === order.id && variantId === payload.variantId);
      if (!quantity && existing) state.productionElementRequirements.splice(state.productionElementRequirements.indexOf(existing), 1);
      else if (quantity && existing) Object.assign(existing, { quantity, recordedAt: iso(), recordedBy: user.id });
      else if (quantity) state.productionElementRequirements.push({ id: `element-need-${randomBytes(8).toString("hex")}`, orderId: order.id, variantId: payload.variantId, quantity, recordedAt: iso(), recordedBy: user.id });
      audit(state, user.id, "Productiebehoefte gewijzigd", order.id, { variantId: payload.variantId, quantity });
      return { state, value: sportpaleisProductionInventoryView(state) };
    });
    return result.value;
  }

  async recordCommunicationStatus(token, csrfToken, orderId, payload, expectedRevision) {
    const { user, state } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const channel = allowedValue(payload.channel, ["receipt", "production", "ready"], "Communicatiekanaal");
    const status = allowedValue(payload.status, ["NOT_SENT", "SENT", "DELIVERED", "BOUNCED", "FAILED"], "Communicatiestatus");
    const providerReference = String(payload.providerReference ?? "").trim() || null;
    let verifiedDeliveryEvidence = null;
    if (["SENT", "DELIVERED"].includes(status)) {
      const attemptId = String(payload.deliveryEvidence?.attemptId ?? "").trim();
      const history = attemptId ? await this.#mail().history({ organizationId: "sportpaleis", contextType: "order", contextId: orderId }, { id: user.id, name: user.name, role: user.role }) : [];
      const attempt = history.find(({ id }) => id === attemptId);
      const expectedTransportStatus = status === "SENT" ? "SMTP_ACCEPTED" : "DELIVERED";
      const templatesByChannel = { receipt: ["ORDER_RECEIVED"], production: ["ORDER_IN_PRODUCTION"], ready: ["ORDER_READY"] };
      const expectedRecipient = String(state.orders.find(({ id }) => id === orderId)?.customerEmail ?? "").trim().toLocaleLowerCase("nl-NL");
      const attemptedRecipient = String(attempt?.recipient ?? "").trim().toLocaleLowerCase("nl-NL");
      const currentContextHash = orderCommunicationContextHash(state, state.orders.find(({ id }) => id === orderId), channel);
      const valid = attempt && attempt.status === expectedTransportStatus && attempt.referenceId && attempt.referenceId === providerReference && templatesByChannel[channel].includes(attempt.templateKey) && attemptedRecipient === expectedRecipient && attempt.contextHash === currentContextHash && !Number.isNaN(Date.parse(attempt.completedAt));
      if (!valid) throw Object.assign(new Error("Verzonden of bezorgd vereist een server-side bewezen poging uit de gecontracteerde mailroute; clientmetadata of een vrije providerreferentie is onvoldoende."), { statusCode: 409, code: "COMMUNICATION_DELIVERY_EVIDENCE_REQUIRED" });
      const evidenceBody = { attemptId: attempt.id, provider: attempt.transport, providerReference: attempt.referenceId, status, acceptedAt: attempt.completedAt, channel, templateKey: attempt.templateKey, recipientHash: sha256(expectedRecipient), contextHash: attempt.contextHash, attemptPayloadHash: attempt.payloadHash };
      verifiedDeliveryEvidence = { ...evidenceBody, evidenceHash: sha256(JSON.stringify(evidenceBody)) };
    }
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === orderId); if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      const at = iso(); order.communication ??= { receipt: { status: "NOT_SENT", updatedAt: at }, production: { status: "NOT_SENT", updatedAt: at }, ready: { status: "NOT_SENT", updatedAt: at } };
      order.communication[channel] = { status, updatedAt: at, providerReference, recipientHash: order.customerEmail ? sha256(order.customerEmail.trim().toLocaleLowerCase("nl-NL")) : null, contextHash: orderCommunicationContextHash(state, order, channel), ...(verifiedDeliveryEvidence ? { deliveryEvidence: verifiedDeliveryEvidence } : {}) };
      if (status === "BOUNCED") order.attention = "E-mail niet bezorgd — klant bellen";
      if (status === "FAILED") order.attention = "E-mailverzending mislukt — handmatig opvolgen";
      order.revision += 1; order.updatedAt = at; order.eventHistory ??= [];
      order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: `COMMUNICATION_${status}`, at, userId: user.id, userName: user.name, source: "communication-status", details: { channel } });
      audit(state, user.id, "Communicatiestatus gewijzigd", order.id, { channel, status }); return { state, value: structuredClone(order) };
    }); return result.value;
  }

  async previewOrderMail(token, orderId, payload) {
    const { state, user } = await this.authenticate(token);
    const request = this.#orderMailRequest(state, user, orderId, payload);
    return this.#mail().preview(request, { id: user.id, name: user.name, role: user.role });
  }

  async captureOrderMail(token, csrfToken, orderId, payload, idempotencyKey) {
    const { state, user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    const orderMailRequest = this.#orderMailRequest(state, user, orderId, payload);
    const currentOrder = state.orders.find(({ id }) => id === orderId);
    const communicationChannelByTemplate = { ORDER_RECEIVED: "receipt", ORDER_IN_PRODUCTION: "production", ORDER_READY: "ready" };
    const communicationChannel = communicationChannelByTemplate[payload.templateKey];
    if (communicationChannel && currentOrder?.communication?.[communicationChannel]?.status === "UNKNOWN") {
      throw Object.assign(new Error("De vorige verzenduitkomst is onbekend. Menselijke controle is vereist voordat opnieuw verzonden mag worden."), { statusCode: 409, code: "UNKNOWN_SEND_REQUIRES_HUMAN_REVIEW" });
    }
    const sourceRevision = Number(currentOrder?.revision);
    const sourceRecipientHash = sha256(String(currentOrder?.customerEmail ?? "").trim().toLocaleLowerCase("nl-NL"));
    const sourceContextHash = sha256(JSON.stringify(orderMailRequest.context));
    const priorChannelEvidence = communicationChannel ? currentOrder?.communication?.[communicationChannel] : null;
    const retryGeneration = priorChannelEvidence?.status === "FAILED" ? priorChannelEvidence.providerReference ?? "failed" : "primary";
    const canonicalAttemptKey = `order-mail:${sha256(JSON.stringify({ orderId, templateKey: payload.templateKey, sourceRecipientHash, sourceContextHash, retryGeneration }))}`;
    const request = { ...orderMailRequest, idempotencyKey: canonicalAttemptKey };
    const result = await this.#mail().capture(request, { id: user.id, name: user.name, role: user.role }, { simulation: payload.simulation ?? "success" });
    await this.store.mutate(async (next) => {
      const order = next.orders.find(({ id }) => id === orderId);
      if (order) {
        const at = iso();
        order.communication ??= { requiredForIndividualOrder: true, receipt: { status: "NOT_SENT", updatedAt: at }, production: { status: "NOT_SENT", updatedAt: at }, ready: { status: "NOT_SENT", updatedAt: at } };
        const currentRecipientHash = sha256(String(order.customerEmail ?? "").trim().toLocaleLowerCase("nl-NL"));
        let currentContextHash = null;
        try { currentContextHash = sha256(JSON.stringify(this.#orderMailRequest(next, user, orderId, payload).context)); } catch { /* Gewijzigde of ongeldige context is stale evidence. */ }
        if (currentRecipientHash !== sourceRecipientHash || currentContextHash !== sourceContextHash) {
          order.communication.history ??= [];
          order.communication.history.push({ channel: communicationChannel ?? "question", status: "STALE", updatedAt: at, providerReference: result.id, recipientHash: sourceRecipientHash, contextHash: sourceContextHash, invalidatedReason: "ORDER_OR_RECIPIENT_CHANGED_DURING_SEND", sourceRevision, currentRevision: order.revision });
          order.eventHistory ??= [];
          order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "MAIL_RESULT_STALE", at, userId: user.id, userName: user.name, source: "capture-transport", details: { templateKey: payload.templateKey, mailAttemptId: result.id, sourceRevision, currentRevision: order.revision, sourceRecipientHash, currentRecipientHash, sourceContextHash, currentContextHash } });
          audit(next, user.id, "Mailresultaat niet geprojecteerd wegens gewijzigde materiële waarheid", order.id, { templateKey: payload.templateKey, mailAttemptId: result.id, sourceRevision, currentRevision: order.revision, sourceRecipientHash, currentRecipientHash, sourceContextHash, currentContextHash });
          return { state: next, value: undefined };
        }
        const capturedStatus = result.status === "CAPTURED" ? "CAPTURED" : result.status === "SMTP_ACCEPTED" ? "SMTP_ACCEPTED" : result.status === "UNKNOWN_PARTIAL_SEND" ? "UNKNOWN" : "FAILED";
        const priorAttemptApplied = order.eventHistory?.some(({ type, details }) => type === `MAIL_${result.status}` && details?.mailAttemptId === result.id);
        if (payload.templateKey === "ORDER_RECEIVED") {
          const receiptStatus = capturedStatus;
          order.communication.receipt = { status: receiptStatus, updatedAt: at, providerReference: result.id, recipientHash: sourceRecipientHash, contextHash: sourceContextHash, sourceRevision };
          if (receiptStatus === "UNKNOWN") order.attention = "Ontvangstbevestiging heeft een onbekende verzenduitkomst — menselijke controle vereist; niet automatisch opnieuw verzenden.";
          else if (receiptStatus === "FAILED") order.attention = "Ontvangstbevestiging is aantoonbaar niet verzonden — gecontroleerd opnieuw proberen is mogelijk.";
          else if (order.attention?.startsWith("Ontvangstbevestiging")) delete order.attention;
        }
        if (payload.templateKey === "ORDER_IN_PRODUCTION") order.communication.production = { status: capturedStatus, updatedAt: at, providerReference: result.id, recipientHash: sourceRecipientHash, contextHash: sourceContextHash, sourceRevision };
        if (payload.templateKey === "ORDER_READY") order.communication.ready = { status: capturedStatus, updatedAt: at, providerReference: result.id, recipientHash: sourceRecipientHash, contextHash: sourceContextHash, sourceRevision };
        if (!priorAttemptApplied) {
          order.revision += 1;
          order.updatedAt = at;
          order.eventHistory ??= [];
          order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: `MAIL_${result.status}`, at, userId: user.id, userName: user.name, source: "capture-transport", details: { templateKey: payload.templateKey, mailAttemptId: result.id, duplicateRecovery: Boolean(result.duplicate), sourceRevision, recipientHash: sourceRecipientHash, canonicalAttemptKey } });
          audit(next, user.id, result.duplicate ? "Mail capture-projectie hersteld" : "Mail capture uitgevoerd", order.id, { templateKey: payload.templateKey, status: result.status, mailAttemptId: result.id, sourceRevision, recipientHash: sourceRecipientHash, canonicalAttemptKey, requestedIdempotencyKey: idempotencyKey });
        }
      }
      return { state: next, value: undefined };
    });
    return result;
  }

  async orderMailHistory(token, orderId) {
    const { state, user } = await this.authenticate(token);
    if (!state.orders.some(({ id }) => id === orderId)) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
    return this.#mail().history({ organizationId: "sportpaleis", contextType: "order", contextId: orderId }, { id: user.id, name: user.name, role: user.role });
  }

  async previewTeamkitProposalMail(token, proposalId, payload) {
    const { state, user } = await this.authenticate(token);
    return this.#mail().preview(this.#teamkitProposalMailRequest(state, user, proposalId, payload), { id: user.id, name: user.name, role: user.role });
  }

  async captureTeamkitProposalMail(token, csrfToken, proposalId, payload, idempotencyKey) {
    const { state, user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken);
    const sourceProposal = state.teamkitProposals?.find(({ id }) => id === proposalId);
    if (!sourceProposal) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
    const mailRequest = this.#teamkitProposalMailRequest(state, user, proposalId, payload);
    const sourceRevision = sourceProposal.currentRevision;
    const sourceRecipientHash = sha256(String(mailRequest.recipient).trim().toLocaleLowerCase("nl-NL"));
    const sourceContextHash = sha256(JSON.stringify(mailRequest.context));
    const canonicalAttemptKey = `teamkit-${sha256(`${proposalId}:${mailRequest.templateKey}:v${sourceRevision}:${sourceRecipientHash}:${sourceContextHash}`)}`;
    const request = { ...mailRequest, idempotencyKey: canonicalAttemptKey };
    const result = await this.#mail().capture(request, { id: user.id, name: user.name, role: user.role });
    await this.store.mutate(async (next) => {
      const proposal = next.teamkitProposals?.find(({ id }) => id === proposalId); if (!proposal) return { state: next, value: undefined };
      let currentRequest = null;
      try { currentRequest = this.#teamkitProposalMailRequest(next, user, proposalId, payload); } catch { /* Een gewijzigd/verlopen request is zelf stale evidence. */ }
      const currentRecipientHash = currentRequest ? sha256(String(currentRequest.recipient).trim().toLocaleLowerCase("nl-NL")) : null;
      const currentContextHash = currentRequest ? sha256(JSON.stringify(currentRequest.context)) : null;
      if (proposal.currentRevision !== sourceRevision || currentRecipientHash !== sourceRecipientHash || currentContextHash !== sourceContextHash) {
        proposal.deliveryEvidence ??= [];
        if (!proposal.deliveryEvidence.some(({ id }) => id === result.id)) proposal.deliveryEvidence.push({ id: result.id, templateKey: payload.templateKey, status: "STALE", capturedAt: iso(), revision: sourceRevision, delivered: false, recipientHash: sourceRecipientHash, contextHash: sourceContextHash, invalidatedReason: "PROPOSAL_OR_RECIPIENT_CHANGED_DURING_SEND" });
        audit(next, user.id, "Voorstelmailresultaat verouderd — niet toegepast", proposal.id, { templateKey: payload.templateKey, mailAttemptId: result.id, sourceRevision, currentRevision: proposal.currentRevision, sourceRecipientHash, currentRecipientHash, sourceContextHash, currentContextHash, canonicalAttemptKey, requestedIdempotencyKey: idempotencyKey });
        return { state: next, value: undefined };
      }
      const delivered = ["SMTP_ACCEPTED", "SENT", "DELIVERED"].includes(result.status);
      const evidence = { id: result.id, templateKey: payload.templateKey, status: result.status, capturedAt: iso(), revision: sourceRevision, delivered, recipientHash: sourceRecipientHash, contextHash: sourceContextHash };
      proposal.deliveryEvidence ??= [];
      const alreadyProjected = proposal.deliveryEvidence.some(({ id }) => id === result.id);
      if (!alreadyProjected) proposal.deliveryEvidence.push(evidence);
      if (payload.templateKey === "PROPOSAL_REVIEW_REQUEST" && delivered && proposal.status === "READY_FOR_REVIEW") proposal.status = "SENT_TO_CUSTOMER";
      if (!alreadyProjected) {
        proposal.aggregateRevision += 1; proposal.updatedAt = iso(); proposal.updatedBy = { id: user.id, name: user.name, role: user.role };
        audit(next, user.id, delivered ? "Voorstelmail delivery bewezen" : "Voorstelmail voorbereid — niet verstuurd", proposal.id, { templateKey: payload.templateKey, status: result.status, mailAttemptId: result.id, revision: sourceRevision, recipientHash: sourceRecipientHash, contextHash: sourceContextHash, externalMailSent: delivered, duplicateRecovery: Boolean(result.duplicate), canonicalAttemptKey, requestedIdempotencyKey: idempotencyKey });
      }
      return { state: next, value: undefined };
    });
    return result;
  }

  #mail() {
    if (this.mailMode !== "capture") throw Object.assign(new Error("Externe mail is in deze pilotomgeving uitgeschakeld."), { statusCode: 503, code: "MAIL_TRANSPORT_DISABLED" });
    if (!this.mailFoundation) throw Object.assign(new Error("Mail Foundation is lokaal niet ingericht."), { statusCode: 503, code: "MAIL_FOUNDATION_UNAVAILABLE" });
    return this.mailFoundation;
  }

  #orderMailRequest(state, user, orderId, payload) {
    const order = state.orders.find(({ id }) => id === orderId);
    if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
    const templateKey = String(payload.templateKey ?? "");
    const sourceChannel = order.sourceContext?.source ?? "STORE";
    if (sourceChannel === "WEBSHOP_XPRT" && templateKey.startsWith("ORDER_") && !NON_WINKEL_ORDER_MAIL_TEMPLATES.has(templateKey)) {
      throw Object.assign(new Error("Webshoporders gebruiken geen automatische Winkel-statusberichten."), { statusCode: 409, code: "WEBSHOP_WINKEL_MAIL_BLOCKED" });
    }
    const question = templateKey === "ORDER_QUESTION" ? requiredText(payload.question, "Vraag", 1_000) : "Niet van toepassing";
    return {
      organizationId: "sportpaleis",
      contextType: "order",
      contextId: order.id,
      templateKey,
      recipient: order.customerEmail,
      context: orderMailContext(state, order, question),
      attachments: [],
      requestedByRole: user.role,
    };
  }

  async saveFeedback(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    if (!this.uploadsEnabled && Array.isArray(payload.attachments) && payload.attachments.length > 0) {
      throw Object.assign(new Error("Uploads zijn in deze pilotomgeving uitgeschakeld."), { statusCode: 409, code: "UPLOADS_DISABLED" });
    }
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "FEEDBACK", () => {
        const attachments = (Array.isArray(payload.attachments) ? payload.attachments : []).map((attachment) => {
          const mimeType = allowedValue(attachment.mimeType, ["image/png", "image/jpeg", "image/webp"], "Bestandstype");
          const filename = requiredText(attachment.filename, "Bestandsnaam", 160).replace(/[\\/]/g, "-");
          const dataBase64 = requiredText(attachment.dataBase64, "Bestandsinhoud", 7_000_000).replace(/^data:[^;]+;base64,/, "");
          if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64)) throw Object.assign(new Error("Ongeldige afbeeldingsinhoud."), { statusCode: 400, code: "INVALID_ATTACHMENT" });
          const sizeBytes = Buffer.from(dataBase64, "base64").length;
          if (sizeBytes < 1 || sizeBytes > 5 * 1024 * 1024) throw Object.assign(new Error("Afbeelding moet kleiner zijn dan 5 MB."), { statusCode: 400, code: "ATTACHMENT_TOO_LARGE" });
          return { id: `attachment-${randomBytes(8).toString("hex")}`, filename, mimeType, sizeBytes, dataBase64 };
        });
        if (attachments.length > 3) throw Object.assign(new Error("Voeg maximaal 3 afbeeldingen toe."), { statusCode: 400, code: "TOO_MANY_ATTACHMENTS" });
        const item = {
          id: `feedback-${randomBytes(8).toString("hex")}`,
          page: requiredText(payload.page, "Pagina", 180),
          module: requiredText(payload.module, "Module", 80),
          userId: user.id,
          createdAt: iso(),
          userRole: user.role,
          category: allowedValue(payload.category, ["Vraag", "Verbetering", "Probleem", "Operationele blokkade"], "Categorie"),
          description: requiredText(payload.description, "Beschrijving", 2_000),
          releaseId: requiredText(payload.releaseId ?? this.releaseId, "Release", 120),
          orderId: payload.orderId ? requiredText(payload.orderId, "Order", 80) : null,
          associationContext: payload.associationContext ? requiredText(payload.associationContext, "Verenigingscontext", 120) : null,
          attachments,
        };
        state.feedback.unshift(item);
        audit(state, user.id, "Feedback vastgelegd", item.module, { feedbackId: item.id });
        return item;
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async feedbackAttachment(token, feedbackId, attachmentId) {
    const { user, state } = await this.authenticate(token);
    const item = state.feedback.find(({ id }) => id === feedbackId);
    if (!item || (user.role !== "admin" && item.userId !== user.id)) throw Object.assign(new Error("Bijlage niet gevonden."), { statusCode: 404, code: "ATTACHMENT_NOT_FOUND" });
    const attachment = (item.attachments ?? []).find(({ id }) => id === attachmentId);
    if (!attachment) throw Object.assign(new Error("Bijlage niet gevonden."), { statusCode: 404, code: "ATTACHMENT_NOT_FOUND" });
    return structuredClone(attachment);
  }

  async savePreferences(token, csrfToken, preference) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    const validated = validatePreference(preference);
    await this.store.mutate(async (state) => {
      state.preferences[user.id] = validated;
      audit(state, user.id, "Voorkeuren opgeslagen", user.name);
      return { state, value: undefined };
    });
    return validated;
  }

  async requestUsers(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const prices = { 1: 7.5, 2: 12.5, 3: 17.5 };
    const quantity = Number(payload.quantity);
    if (!prices[quantity]) throw Object.assign(new Error("Ongeldig aantal gebruikers."), { statusCode: 400, code: "INVALID_QUANTITY" });
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "REQUEST_USERS", () => {
        const request = { id: `request-${randomBytes(8).toString("hex")}`, requestedBy: user.id, requestedAt: iso(), quantity, monthlyPriceEur: prices[quantity], status: "Aangevraagd" };
        state.extraUserRequests.unshift(request);
        audit(state, user.id, "Extra gebruikers aangevraagd", `${quantity} gebruiker(s)`, { monthlyPriceEur: prices[quantity] });
        return request;
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async createInvitedUser(token, csrfToken, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const email = validEmail(payload.email).toLowerCase();
    const name = requiredText(payload.name, "Naam", 120);
    const role = allowedValue(payload.role, ["admin", "operator", "store"], "Rol");
    const rawToken = randomBytes(32).toString("base64url");
    const createdAt = iso();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const result = await this.store.mutate(async (state) => {
      if (state.users.some((candidate) => normalizedEmail(candidate.email) === email)) throw Object.assign(new Error("Dit e-mailadres bestaat al."), { statusCode: 409, code: "EMAIL_EXISTS" });
      const contexts = workContextsForRole(role);
      const target = { id: `user-${randomBytes(8).toString("hex")}`, name, initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role, email, status: "Uitgenodigd", seatType: "customer", personType: "HUMAN", workContexts: contexts, defaultContext: contexts[0], password: null };
      state.users.push(target);
      state.preferences[target.id] = defaultPreference();
      state.activationInvites = (state.activationInvites ?? []).filter((invite) => invite.userId !== target.id && !invite.usedAt);
      state.activationInvites.push({ id: `invite-${randomBytes(8).toString("hex")}`, userId: target.id, tokenHash: sha256(rawToken), createdAt, expiresAt, usedAt: null, createdBy: user.id });
      audit(state, user.id, "Gebruiker uitgenodigd", target.id, { role, expiresAt });
      return { state, value: publicUser(target) };
    });
    return { user: result.value, activationPath: `/workspace/sportpaleis/activeren#token=${rawToken}`, expiresAt, delivery: "LOCAL_HANDOFF_ONLY" };
  }

  async cancelInvitedUser(token, csrfToken, targetUserId) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const target = state.users.find(({ id }) => id === targetUserId && id !== "donovan-support");
      if (!target) throw Object.assign(new Error("Uitnodiging niet gevonden."), { statusCode: 404, code: "USER_NOT_FOUND" });
      if (target.status !== "Uitgenodigd") throw Object.assign(new Error("Alleen een openstaande uitnodiging kan worden ingetrokken."), { statusCode: 409, code: "INVITATION_NOT_PENDING" });
      if (state.employees.some(({ userId }) => userId === target.id)) throw Object.assign(new Error("Deze uitnodiging is aan een werknemersrecord gekoppeld en kan niet stil worden verwijderd."), { statusCode: 409, code: "INVITATION_HAS_LINKED_DATA" });
      const sameEmailAccounts = state.users.filter((candidate) => candidate.id !== target.id
        && candidate.status !== "Uitgenodigd"
        && normalizedEmail(candidate.email) === normalizedEmail(target.email));
      if (sameEmailAccounts.length > 1) throw Object.assign(new Error("Meerdere bestaande accounts gebruiken dit e-mailadres. Beoordeel eerst handmatig welk account leidend is."), { statusCode: 409, code: "INVITATION_IDENTITY_AMBIGUOUS" });
      const email = target.email;
      state.activationInvites = (state.activationInvites ?? []).filter((invite) => invite.userId !== target.id);
      state.sessions = state.sessions.filter((session) => session.userId !== target.id);
      state.users = state.users.filter(({ id }) => id !== target.id);
      delete state.preferences[target.id];
      audit(state, user.id, "Uitnodiging ingetrokken", target.id, { email, previousStatus: target.status, preservedAccountId: sameEmailAccounts[0]?.id ?? null });
      return { state, value: { revoked: true, userId: target.id, email } };
    });
    return result.value;
  }

  async reissueInvitedUser(token, csrfToken, targetUserId) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    let rawToken = "";
    let expiresAt = "";
    const result = await this.store.mutate(async (state) => {
      const target = state.users.find(({ id }) => id === targetUserId && id !== "donovan-support");
      if (!target) throw Object.assign(new Error("Uitnodiging niet gevonden."), { statusCode: 404, code: "USER_NOT_FOUND" });
      if (target.status !== "Uitgenodigd") throw Object.assign(new Error("Alleen een nog niet geactiveerde uitnodiging kan een nieuwe activatielink krijgen."), { statusCode: 409, code: "INVITATION_NOT_PENDING" });
      const sameEmailUsers = state.users.filter((candidate) => candidate.id !== target.id && normalizedEmail(candidate.email) === normalizedEmail(target.email));
      if (sameEmailUsers.length) throw Object.assign(new Error("Voor dit e-mailadres bestaat al een andere toegang. Trek alleen de overbodige uitnodiging in of beoordeel de situatie handmatig."), { statusCode: 409, code: "INVITATION_IDENTITY_CONFLICT" });
      const pendingInvites = (state.activationInvites ?? []).filter((invite) => invite.userId === target.id && !invite.usedAt);
      if (pendingInvites.length > 1) throw Object.assign(new Error("Voor deze gebruiker bestaan meerdere openstaande links. Handmatige beoordeling is nodig."), { statusCode: 409, code: "INVITATION_STATE_AMBIGUOUS" });
      rawToken = randomBytes(32).toString("base64url");
      const createdAt = iso();
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      state.activationInvites = (state.activationInvites ?? []).filter((invite) => invite.userId !== target.id || invite.usedAt);
      state.activationInvites.push({ id: `invite-${randomBytes(8).toString("hex")}`, userId: target.id, tokenHash: sha256(rawToken), createdAt, expiresAt, usedAt: null, createdBy: user.id });
      audit(state, user.id, "Activatielink vernieuwd", target.id, { expiresAt });
      return { state, value: publicUser(target) };
    });
    return { user: result.value, activationPath: `/workspace/sportpaleis/activeren#token=${rawToken}`, expiresAt, delivery: "LOCAL_HANDOFF_ONLY" };
  }

  async activateInvitedUser(payload) {
    const rawToken = requiredText(payload.token, "Activatiecode", 200);
    const password = await passwordRecord(String(payload.password ?? ""));
    const now = new Date();
    const result = await this.store.mutate(async (state) => {
      const invite = (state.activationInvites ?? []).find((candidate) => !candidate.usedAt && safeEqualHex(candidate.tokenHash, sha256(rawToken)));
      if (!invite || new Date(invite.expiresAt).getTime() <= now.getTime()) throw Object.assign(new Error("Deze activatielink is ongeldig of verlopen."), { statusCode: 400, code: "ACTIVATION_INVALID" });
      const target = state.users.find(({ id }) => id === invite.userId && id !== "donovan-support");
      if (!target || target.status !== "Uitgenodigd") throw Object.assign(new Error("Deze gebruiker kan niet worden geactiveerd."), { statusCode: 409, code: "ACTIVATION_STATE_INVALID" });
      if (state.users.some((candidate) => candidate.id !== target.id && normalizedEmail(candidate.email) === normalizedEmail(target.email))) throw Object.assign(new Error("Voor dit e-mailadres bestaat al een andere toegang. Laat een beheerder de overbodige uitnodiging beoordelen."), { statusCode: 409, code: "ACTIVATION_IDENTITY_CONFLICT" });
      target.password = password;
      target.status = "Actief";
      invite.usedAt = iso(now);
      audit(state, target.id, "Account geactiveerd", target.id);
      return { state, value: publicUser(target) };
    });
    return { user: result.value, activated: true };
  }

  async updateUser(token, csrfToken, targetUserId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    if (targetUserId === user.id && payload.status === "Inactief") throw Object.assign(new Error("Een beheerder kan zichzelf niet deactiveren."), { statusCode: 400, code: "SELF_DEACTIVATION_BLOCKED" });
    const result = await this.store.mutate(async (state) => {
      const target = state.users.find(({ id }) => id === targetUserId && id !== "donovan-support");
      if (!target) throw Object.assign(new Error("Gebruiker niet gevonden."), { statusCode: 404, code: "USER_NOT_FOUND" });
      const previous = { role: target.role, status: target.status, salesNumber: target.salesNumber ?? null, workContexts: structuredClone(target.workContexts ?? workContextsForRole(target.role)), defaultContext: target.defaultContext ?? workContextsForRole(target.role)[0] };
      if (payload.role !== undefined) {
        target.role = allowedValue(payload.role, ["admin", "operator", "store"], "Rol");
        if (payload.workContexts === undefined) target.workContexts = workContextsForRole(target.role);
      }
      if (payload.status !== undefined) {
        if (target.status === "Uitgenodigd") throw Object.assign(new Error("Een uitnodiging wordt geactiveerd via de activatielink, niet via accountstatus."), { statusCode: 409, code: "INVITATION_STATUS_CHANGE_FORBIDDEN" });
        target.status = allowedValue(payload.status, ["Actief", "Inactief"], "Status");
      }
      if (payload.salesNumber !== undefined) {
        const salesNumber = payload.salesNumber === null || String(payload.salesNumber).trim() === "" ? null : String(payload.salesNumber).trim();
        if (salesNumber !== null && !/^\d{1,8}$/.test(salesNumber)) throw Object.assign(new Error("Verkoopnummer moet uit 1 tot 8 cijfers bestaan."), { statusCode: 400, code: "VALIDATION_ERROR" });
        if (salesNumber && state.users.some((candidate) => candidate.id !== target.id && candidate.salesNumber === salesNumber)) throw Object.assign(new Error("Dit verkoopnummer is al gekoppeld."), { statusCode: 409, code: "SALES_NUMBER_EXISTS" });
        const linkedEmployee = state.employees.find(({ userId }) => userId === target.id);
        const employeeConflict = salesNumber ? state.employees.find((employee) => employee.salesNumber === salesNumber && employee.id !== linkedEmployee?.id) : null;
        if (employeeConflict) throw Object.assign(new Error("Dit verkoopnummer hoort al bij een andere werknemer."), { statusCode: 409, code: "EMPLOYEE_SALES_NUMBER_EXISTS" });
        if (salesNumber && linkedEmployee) { linkedEmployee.salesNumber = salesNumber; linkedEmployee.name = target.name; linkedEmployee.active = target.status !== "Inactief"; linkedEmployee.revision += 1; }
        else if (salesNumber) state.employees.push({ id: `employee-${target.id}`, name: target.name, salesNumber, active: target.status !== "Inactief", userId: target.id, revision: 1 });
        else if (linkedEmployee) { linkedEmployee.active = false; linkedEmployee.userId = null; linkedEmployee.revision += 1; }
        target.salesNumber = salesNumber;
      }
      if (payload.workContexts !== undefined) {
        const allowedContexts = workContextsForRole(target.role);
        const workContexts = normalizedTextList(payload.workContexts, "Werkcontexten", allowedContexts.length, 20);
        if (!workContexts.length || workContexts.some((context) => !allowedContexts.includes(context))) throw Object.assign(new Error("Een werkcontext past niet bij de serverrol."), { statusCode: 400, code: "WORK_CONTEXT_FORBIDDEN" });
        target.workContexts = workContexts;
      }
      if (payload.defaultContext !== undefined) {
        const defaultContext = allowedValue(payload.defaultContext, target.workContexts ?? workContextsForRole(target.role), "Standaardcontext");
        target.defaultContext = defaultContext;
      } else if (!(target.workContexts ?? []).includes(target.defaultContext)) target.defaultContext = target.workContexts[0];
      if (target.status === "Inactief") state.sessions = state.sessions.filter((session) => session.userId !== target.id);
      if (!state.users.some((candidate) => candidate.role === "admin" && candidate.status === "Actief")) {
        throw Object.assign(new Error("Minimaal één actieve beheerder is verplicht."), { statusCode: 400, code: "LAST_ADMIN_REQUIRED" });
      }
      audit(state, user.id, "Gebruikersrechten gewijzigd", target.id, { previous, next: { role: target.role, status: target.status, salesNumber: target.salesNumber ?? null, workContexts: target.workContexts, defaultContext: target.defaultContext } });
      return { state, value: publicUser(target) };
    });
    return result.value;
  }

  async upsertEmployee(token, csrfToken, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const salesNumber = requiredText(payload.salesNumber, "Verkoopnummer", 8);
      if (!/^\d{1,8}$/u.test(salesNumber)) throw Object.assign(new Error("Verkoopnummer bestaat uit 1 tot 8 cijfers."), { statusCode: 400, code: "EMPLOYEE_SALES_NUMBER_INVALID" });
      const name = requiredText(payload.name, "Naam werknemer", 120);
      const userId = payload.userId ? requiredText(payload.userId, "Workspace-gebruiker", 120) : null;
      if (userId && !state.users.some(({ id }) => id === userId)) throw Object.assign(new Error("De gekozen Workspace-gebruiker bestaat niet."), { statusCode: 400, code: "EMPLOYEE_USER_NOT_FOUND" });
      const duplicate = state.employees.find((employee) => employee.salesNumber === salesNumber && employee.id !== payload.id);
      if (duplicate) throw Object.assign(new Error("Dit verkoopnummer hoort al bij een andere werknemer."), { statusCode: 409, code: "EMPLOYEE_SALES_NUMBER_EXISTS" });
      let employee = payload.id ? state.employees.find(({ id }) => id === payload.id) : null;
      const previous = employee ? structuredClone(employee) : null;
      if (employee) {
        if (employee.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("Deze werknemer is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: employee.revision });
        employee.name = name; employee.salesNumber = salesNumber; employee.active = payload.active === true; employee.userId = userId; employee.revision += 1;
      } else {
        employee = { id: `employee-${randomBytes(8).toString("hex")}`, name, salesNumber, active: payload.active === true, userId, revision: 1 };
        state.employees.push(employee);
      }
      audit(state, user.id, previous ? "Werknemer gewijzigd" : "Werknemer toegevoegd", employee.id, { previous, next: structuredClone(employee) });
      return { state, value: structuredClone(employee) };
    });
    return result.value;
  }

  async deleteEmployee(token, csrfToken, employeeId) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const employee = state.employees.find(({ id }) => id === employeeId);
      if (!employee) throw Object.assign(new Error("Werknemer niet gevonden."), { statusCode: 404, code: "EMPLOYEE_NOT_FOUND" });
      const dependencies = {
        orders: state.orders.filter(({ salesAttribution }) => salesAttribution?.employeeId === employee.id).length,
        login: employee.userId ? 1 : 0,
        audit: state.audit.filter(({ subject, details }) => subject === employee.id || details?.employeeId === employee.id).length,
      };
      if (Object.values(dependencies).some(Boolean)) throw Object.assign(new Error("Deze medewerker heeft historie of een login. Deactiveer de medewerker; historische orderattributie blijft dan intact."), { statusCode: 409, code: "EMPLOYEE_HAS_HISTORY", dependencies });
      state.employees = state.employees.filter(({ id }) => id !== employee.id);
      audit(state, user.id, "Werknemer definitief verwijderd", employee.id, { salesNumber: employee.salesNumber, dependencies });
      return { state, value: { deleted: true, id: employee.id } };
    });
    return result.value;
  }

  async createAssociation(token, csrfToken, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const name = requiredText(payload.name, "Verenigingsnaam", 120);
      if (state.associations.some((association) => association.name.toLocaleLowerCase("nl-NL") === name.toLocaleLowerCase("nl-NL"))) throw Object.assign(new Error("Deze vereniging bestaat al."), { statusCode: 409, code: "ASSOCIATION_EXISTS" });
      const provenance = requiredText(payload.provenance, "Bronnotitie", 1_000);
      const defaultFoilColor = String(payload.defaultFoilColor ?? "").trim() ? requiredText(payload.defaultFoilColor, "Standaard bedrukkingskleur", 40) : "Onbekend";
      const createdAt = iso();
      const association = {
        id: `association-${randomBytes(8).toString("hex")}`,
        name,
        sourceName: requiredText(payload.sourceName || name, "Bronnaam", 120),
        active: true,
        source: { file: "Workspace handmatige invoer", sheet: "DATA_GAP", range: provenance.slice(0, 240) },
        fontProfile: "DATA_GAP",
        foilColors: [defaultFoilColor],
        defaultFoilColor,
        dimensionsCm: { initialsShirt: null, backNumberJuniorSourceValue: null, backNumberSenior: null, chestNumber: null, shortsNumber: null, nameHeight: null },
        juniorValidationStatus: "DATA_GAP",
        juniorPhysicalHeightMm: null,
        juniorGarmentSizes: [],
        juniorValidationNote: provenance,
        notes: provenance,
        articleCatalogStatus: "DATA_GAP · nog geen bevestigde artikelen",
        revision: 1,
        updatedAt: createdAt,
        validationHistory: [{ at: createdAt, userId: user.id, field: "association", previous: null, next: { name, sourceName: payload.sourceName || name, status: "DATA_GAP" }, source: provenance }],
      };
      state.associations.push(association);
      audit(state, user.id, "Vereniging aangemaakt", association.name, { revision: 1, status: "DATA_GAP", provenance });
      return { state, value: structuredClone(association) };
    });
    return result.value;
  }

  async createArticle(token, csrfToken, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const articleNumber = requiredText(payload.articleNumber, "Artikelnummer", 80);
      const association = requiredText(payload.association, "Vereniging", 120);
      const associationRecord = state.associations.find(({ name }) => name === association);
      if (!associationRecord) throw Object.assign(new Error("Kies een bestaande vereniging uit Beheer."), { statusCode: 400, code: "ASSOCIATION_UNKNOWN" });
      if (state.articles.some((article) => article.association === association && article.articleNumber.toLocaleLowerCase("nl-NL") === articleNumber.toLocaleLowerCase("nl-NL"))) throw Object.assign(new Error("Dit artikelnummer bestaat al binnen deze vereniging."), { statusCode: 409, code: "ARTICLE_EXISTS" });
      const requestedFoilOverride = String(payload.foilColorOverride ?? "").trim();
      const foilColorOverride = requestedFoilOverride ? managedFoilColor(state, requestedFoilOverride) : null;
      if (requestedFoilOverride && !foilColorOverride) throw Object.assign(new Error("Kies een bestaande beheerde foliekleur uit Folie en rollen."), { statusCode: 400, code: "ARTICLE_FOIL_COLOR_UNKNOWN" });
      const profile = state.productionProfiles.find(({ id }) => id === payload.profileId);
      if (!profile) throw Object.assign(new Error("Productieprofiel niet gevonden."), { statusCode: 400, code: "PROFILE_MISSING" });
      const imageKey = requiredText(payload.imageKey, "Afbeelding", 120);
      if (!ARTICLE_IMAGE_KEYS.has(imageKey)) throw Object.assign(new Error("Kies een bestaande lokale artikelafbeelding."), { statusCode: 400, code: "IMAGE_ASSET_UNKNOWN" });
      const source = requiredText(payload.source, "Bron / bevestiging", 1_000);
      const createdAt = iso();
      const teamwearInput = payload.teamwearCatalog;
      const teamwearCatalog = teamwearInput ? {
        status: allowedValue(teamwearInput.status ?? "REVIEW_REQUIRED", ["REVIEW_REQUIRED", "HIDDEN"], "Teamwear-status"),
        brand: requiredText(teamwearInput.brand, "Teamwear-merk", 80), model: requiredText(teamwearInput.model || payload.name, "Teamwear-model", 120), category: requiredText(teamwearInput.category, "Teamwear-categorie", 80),
        audiences: normalizedTextList(teamwearInput.audiences, "Teamwear-doelgroepen", 5, 20).map((value) => allowedValue(value, ["JUNIOR", "SENIOR", "MEN", "WOMEN", "UNISEX"], "Teamwear-doelgroep")),
        colorLabel: requiredText(teamwearInput.colorLabel, "Teamwear-kleur", 80), collection: optional(teamwearInput.collection, 120) || null,
        sourceLabel: requiredText(teamwearInput.sourceLabel || source, "Teamwear-bron", 500), sourceUrl: optional(teamwearInput.sourceUrl, 500) || null, reviewedAt: null, reviewedBy: null,
      } : undefined;
      const article = {
        id: `article-${randomBytes(8).toString("hex")}`,
        articleNumber,
        name: requiredText(payload.name, "Artikelnaam", 120),
        imageKey,
        category: "DATA_GAP",
        association,
        profileId: profile.id,
        supports: [],
        active: false,
        revision: 1,
        variantLabels: [],
        availableSizes: [],
        personalizationPolicy: { mode: "none", fields: {} },
        foilColorOverride,
        productionDataGaps: ["Maten, varianten en bedrukregels moeten nog worden bevestigd"],
        validation: { status: "DATA_GAP", source, name: "DATA_GAP", sku: "DATA_GAP", image: "DATA_GAP", variants: "DATA_GAP", sizes: "DATA_GAP", personalization: "DATA_GAP" },
        validationHistory: [{ at: createdAt, userId: user.id, previous: null, next: { articleNumber, association, profileId: profile.id, status: "DATA_GAP", active: false }, source }],
        ...(teamwearCatalog ? { teamwearCatalog } : {}),
      };
      state.articles.push(article);
      audit(state, user.id, "Artikel aangemaakt", article.id, { revision: 1, association, profileId: profile.id, status: "DATA_GAP", active: false, teamwearStatus: article.teamwearCatalog?.status ?? null, teamwearSource: article.teamwearCatalog?.sourceLabel ?? null });
      return { state, value: structuredClone(article) };
    });
    return result.value;
  }

  async updateArticle(token, csrfToken, articleId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    const reorderOnly = Object.keys(payload).every((key) => ["expectedRevision", "displayOrder"].includes(key));
    assertRole(user, reorderOnly ? ["admin", "operator"] : ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const article = state.articles.find(({ id }) => id === articleId);
      if (!article) throw Object.assign(new Error("Artikel niet gevonden."), { statusCode: 404, code: "ARTICLE_NOT_FOUND" });
      const expectedRevision = Number(payload.expectedRevision);
      if (expectedRevision !== Number(article.revision ?? 1)) throw Object.assign(new Error("Het artikel is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: article.revision ?? 1 });
      const previous = structuredClone(article);
      if (payload.displayOrder !== undefined) {
        const displayOrder = Number(payload.displayOrder);
        if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 9999) throw Object.assign(new Error("Artikelvolgorde moet een geheel getal tussen 0 en 9999 zijn."), { statusCode: 400, code: "VALIDATION_ERROR" });
        article.displayOrder = displayOrder;
      }
      if (payload.active !== undefined) article.active = Boolean(payload.active);
      if (payload.name !== undefined) article.name = requiredText(payload.name, "Artikelnaam", 120);
      if (payload.articleNumber !== undefined) article.articleNumber = requiredText(payload.articleNumber, "Artikelnummer", 80);
      if (payload.imageKey !== undefined) {
        const imageKey = requiredText(payload.imageKey, "Afbeelding", 120);
        if (!ARTICLE_IMAGE_KEYS.has(imageKey)) throw Object.assign(new Error("Kies een bestaande lokale artikelafbeelding."), { statusCode: 400, code: "IMAGE_ASSET_UNKNOWN" });
        article.imageKey = imageKey;
      }
      if (payload.association !== undefined) {
        const association = requiredText(payload.association, "Vereniging", 120);
        if (!state.associations.some(({ name }) => name === association)) throw Object.assign(new Error("Kies een bestaande vereniging uit Beheer."), { statusCode: 400, code: "ASSOCIATION_UNKNOWN" });
        article.association = association;
      }
      if (payload.profileId !== undefined) {
        const profile = state.productionProfiles.find(({ id }) => id === payload.profileId);
        if (!profile) throw Object.assign(new Error("Productieprofiel niet gevonden."), { statusCode: 400, code: "VALIDATION_ERROR" });
        article.profileId = profile.id;
      }
      if (payload.foilColorOverride !== undefined) {
        const requested = String(payload.foilColorOverride ?? "").trim();
        if (!requested) article.foilColorOverride = null;
        else {
          const canonical = managedFoilColor(state, requested);
          if (!canonical) throw Object.assign(new Error("Kies een bestaande beheerde foliekleur uit Folie en rollen."), { statusCode: 400, code: "ARTICLE_FOIL_COLOR_UNKNOWN" });
          article.foilColorOverride = canonical;
        }
      }
      if (payload.variantLabels !== undefined) article.variantLabels = normalizedTextList(payload.variantLabels, "Varianten", 30, 80);
      if (payload.availableSizes !== undefined) article.availableSizes = normalizedTextList(payload.availableSizes, "Maten", 40, 30);
      if (payload.priceConfiguration !== undefined) {
        const price = (value, label) => value === null || value === "" || value === undefined ? null : nullableNumber(value, label, 0, 10000);
        const current = article.priceConfiguration ?? { articleUnitPriceEur: null, personalizationUnitPricesEur: {}, sourceLabel: "DATA_GAP: geen prijsbron vastgelegd" };
        const requestedSizePrices = payload.priceConfiguration.articleUnitPricesBySizeEur;
        article.priceConfiguration = {
          articleUnitPriceEur: price(payload.priceConfiguration.articleUnitPriceEur, "Artikelprijs"),
          articleUnitPricesBySizeEur: Object.fromEntries((article.availableSizes ?? []).map((size) => [size, price(requestedSizePrices === undefined ? current.articleUnitPricesBySizeEur?.[size] : requestedSizePrices?.[size], `Artikelprijs maat ${size}`)])),
          personalizationUnitPricesEur: Object.fromEntries(PERSONALIZATION_FIELDS.map((field) => [field, price(payload.priceConfiguration.personalizationUnitPricesEur?.[field], `Bedrukkingsprijs ${field}`)])),
          ...(current.personalizationValuePricing ? { personalizationValuePricing: structuredClone(current.personalizationValuePricing) } : {}),
          sourceLabel: requiredText(payload.priceConfiguration.sourceLabel ?? current.sourceLabel, "Prijsbron", 500),
        };
      }
      if (payload.supports !== undefined || payload.personalizationPolicy !== undefined) {
        const supports = normalizedPersonalizationFields(payload.supports ?? article.supports);
        const policyInput = payload.personalizationPolicy ?? article.personalizationPolicy ?? { mode: "combination", fields: {} };
        const mode = allowedValue(policyInput.mode, ["none", "required", "optional", "mutually-exclusive", "combination"], "Bedrukkingsbeleid");
        const fields = {};
        for (const field of supports) fields[field] = allowedValue(policyInput.fields?.[field] ?? "optional", ["required", "optional"], "Bedrukkingsregel");
        if (mode === "none" && supports.length) throw Object.assign(new Error("Een artikel zonder bedrukking kan geen bedrukkingstypen toestaan."), { statusCode: 400, code: "PERSONALIZATION_POLICY_INVALID" });
        article.supports = supports;
        article.personalizationPolicy = { mode, fields };
      }
      if (payload.validation !== undefined) {
        const fieldNames = ["name", "sku", "image", "variants", "sizes", "personalization"];
        const nextValidation = { source: requiredText(payload.validation.source, "Validatiebron", 1_000) };
        for (const field of fieldNames) nextValidation[field] = allowedValue(payload.validation[field], ["VALIDATED", "DATA_GAP"], `Validatiestatus ${field}`);
        if (nextValidation.sizes === "VALIDATED" && !(article.availableSizes?.length > 0)) throw Object.assign(new Error("Gevalideerde maten vereisen minimaal één bevestigde kledingmaat."), { statusCode: 400, code: "VALIDATED_SIZES_REQUIRED" });
        if (nextValidation.variants === "VALIDATED" && !(article.variantLabels?.length > 0)) throw Object.assign(new Error("Gevalideerde varianten vereisen minimaal één bevestigde artikelvariant."), { statusCode: 400, code: "VALIDATED_VARIANTS_REQUIRED" });
        nextValidation.status = deriveArticleValidationStatus(nextValidation);
        article.validation = nextValidation;
      }
      if (payload.teamwearCatalog !== undefined) {
        const input = payload.teamwearCatalog; const status = allowedValue(input.status, ["REVIEW_REQUIRED", "SELECTABLE", "HIDDEN"], "Teamwear-status");
        if (status === "SELECTABLE" && ["name", "sku", "image", "variants", "sizes"].some((field) => article.validation?.[field] !== "VALIDATED")) throw Object.assign(new Error("Bevestig eerst naam, artikelnummer, afbeelding, varianten en maten voordat dit artikel in Teamwear selecteerbaar wordt."), { statusCode: 409, code: "TEAMWEAR_PRODUCT_TRUTH_REQUIRED" });
        article.teamwearCatalog = {
          status, brand: requiredText(input.brand, "Teamwear-merk", 80), model: requiredText(input.model || article.name, "Teamwear-model", 120), category: requiredText(input.category || article.category, "Teamwear-categorie", 80),
          audiences: normalizedTextList(input.audiences, "Teamwear-doelgroepen", 5, 20).map((value) => allowedValue(value, ["JUNIOR", "SENIOR", "MEN", "WOMEN", "UNISEX"], "Teamwear-doelgroep")),
          colorLabel: requiredText(input.colorLabel, "Teamwear-kleur", 80), collection: optional(input.collection, 120) || null,
          sourceLabel: requiredText(input.sourceLabel, "Teamwear-bron", 500), sourceUrl: optional(input.sourceUrl, 500) || null,
          reviewedAt: status === "SELECTABLE" ? iso() : null, reviewedBy: status === "SELECTABLE" ? user.id : null,
        };
      }
      if (state.articles.some((candidate) => candidate.id !== article.id && candidate.association === article.association && candidate.articleNumber.toLocaleLowerCase("nl-NL") === article.articleNumber.toLocaleLowerCase("nl-NL"))) throw Object.assign(new Error("Dit artikelnummer bestaat al binnen deze vereniging."), { statusCode: 409, code: "ARTICLE_EXISTS" });
      article.revision = Number(article.revision ?? 1) + 1;
      article.validationHistory ??= [];
      const changedAt = iso();
      article.validationHistory.unshift({ at: changedAt, userId: user.id, previous, next: structuredClone(article), source: article.validation?.source ?? "Adminwijziging in Workspace" });
      audit(state, user.id, reorderOnly ? "Artikelvolgorde gewijzigd" : "Artikelinstelling gewijzigd", article.id, { revision: article.revision, displayOrder: article.displayOrder ?? null, active: article.active, profileId: article.profileId, association: article.association, validationStatus: article.validation?.status ?? "DATA_GAP", teamwearStatus: article.teamwearCatalog?.status ?? null, teamwearSource: article.teamwearCatalog?.sourceLabel ?? null });
      return { state, value: structuredClone(article) };
    });
    return result.value;
  }

  async updateAssociation(token, csrfToken, associationId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const association = state.associations.find(({ id }) => id === associationId);
      if (!association) throw Object.assign(new Error("Vereniging niet gevonden."), { statusCode: 404, code: "ASSOCIATION_NOT_FOUND" });
      const expectedRevision = Number(payload.expectedRevision);
      if (expectedRevision !== Number(association.revision ?? 1)) throw Object.assign(new Error("De vereniging is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: association.revision ?? 1 });
      const previous = { active: association.active, notes: association.notes, fontProfile: association.fontProfile, foilColors: structuredClone(association.foilColors), defaultFoilColor: association.defaultFoilColor ?? association.foilColors[0] ?? "Onbekend", dimensionsCm: structuredClone(association.dimensionsCm), juniorValidationStatus: association.juniorValidationStatus, juniorPhysicalHeightMm: association.juniorPhysicalHeightMm ?? null, juniorGarmentSizes: structuredClone(association.juniorGarmentSizes ?? []), juniorValidationNote: association.juniorValidationNote, workspaceLogoSha256: association.workspaceLogo?.sha256 ?? null };
      if (payload.active !== undefined) association.active = Boolean(payload.active);
      if (payload.notes !== undefined) association.notes = requiredText(payload.notes, "Notitie", 1_000);
      if (payload.fontProfile !== undefined) association.fontProfile = requiredText(payload.fontProfile, "Letterprofiel", 120);
      if (payload.foilColors !== undefined) {
        if (!Array.isArray(payload.foilColors) || payload.foilColors.length < 1 || payload.foilColors.length > 8) throw Object.assign(new Error("Leg minimaal één en maximaal acht foliekleuren vast."), { statusCode: 400, code: "FOIL_COLORS_REQUIRED" });
        association.foilColors = [...new Set(payload.foilColors.map((color) => requiredText(color, "Foliekleur", 40)))];
      }
      if (payload.defaultFoilColor !== undefined) {
        const requested = requiredText(payload.defaultFoilColor, "Standaard bedrukkingskleur", 40);
        const canonical = association.foilColors.find((color) => color.toLocaleLowerCase("nl-NL") === requested.toLocaleLowerCase("nl-NL"));
        if (!canonical) throw Object.assign(new Error("De standaardkleur moet in de bestaande foliekleurenlijst staan."), { statusCode: 400, code: "ASSOCIATION_DEFAULT_FOIL_COLOR_UNKNOWN" });
        association.defaultFoilColor = canonical;
      } else if (payload.foilColors !== undefined) {
        const canonical = association.foilColors.find((color) => color.toLocaleLowerCase("nl-NL") === previous.defaultFoilColor.toLocaleLowerCase("nl-NL"));
        if (!canonical) throw Object.assign(new Error("De bestaande standaardkleur mag niet uit de foliekleurenlijst verdwijnen."), { statusCode: 400, code: "ASSOCIATION_DEFAULT_FOIL_COLOR_REMOVED" });
        association.defaultFoilColor = canonical;
      }
      if (payload.dimensionsCm !== undefined) association.dimensionsCm = {
        initialsShirt: nullableNumber(payload.dimensionsCm.initialsShirt, "Initialen shirt", 0.1, 100),
        backNumberJuniorSourceValue: nullableNumber(payload.dimensionsCm.backNumberJuniorSourceValue, "Junior bronwaarde", 0.1, 100),
        backNumberSenior: nullableNumber(payload.dimensionsCm.backNumberSenior, "Senior rugnummer", 0.1, 100),
        chestNumber: nullableNumber(payload.dimensionsCm.chestNumber, "Borstnummer", 0.1, 100),
        shortsNumber: nullableNumber(payload.dimensionsCm.shortsNumber, "Shortnummer", 0.1, 100),
        nameHeight: nullableNumber(payload.dimensionsCm.nameHeight, "Naamhoogte", 0.1, 100),
      };
      if (payload.juniorValidationStatus !== undefined) association.juniorValidationStatus = allowedValue(payload.juniorValidationStatus, ["DATA_GAP", "VALIDATED"], "Juniorstatus");
      if (payload.juniorValidationNote !== undefined) association.juniorValidationNote = requiredText(payload.juniorValidationNote, "Validatiebron", 1_000);
      if (payload.juniorPhysicalHeightMm !== undefined) association.juniorPhysicalHeightMm = payload.juniorPhysicalHeightMm === null || payload.juniorPhysicalHeightMm === "" ? null : Number(payload.juniorPhysicalHeightMm);
      if (payload.juniorGarmentSizes !== undefined) {
        if (!Array.isArray(payload.juniorGarmentSizes) || payload.juniorGarmentSizes.length > 20) throw Object.assign(new Error("Ongeldige lijst Junior-kledingmaten."), { statusCode: 400, code: "JUNIOR_GARMENT_SIZES_INVALID" });
        association.juniorGarmentSizes = [...new Set(payload.juniorGarmentSizes.map((size) => requiredText(size, "Junior-kledingmaat", 20)))];
      }
      if (payload.workspaceLogo !== undefined) {
        if (payload.workspaceLogo === null) association.workspaceLogo = null;
        else {
          if (!this.uploadsEnabled) throw Object.assign(new Error("Logo-uploads zijn in deze omgeving uitgeschakeld."), { statusCode: 403, code: "UPLOADS_DISABLED" });
          const mimeType = allowedValue(payload.workspaceLogo.mimeType, ["image/png", "image/jpeg", "image/webp"], "Logo-bestandstype");
          const encoded = requiredText(payload.workspaceLogo.dataBase64, "Logo-inhoud", 3_000_000).replace(/^data:[^;]+;base64,/, "");
          if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw Object.assign(new Error("Ongeldige logo-inhoud."), { statusCode: 400, code: "ASSOCIATION_LOGO_INVALID" });
          const bytes = Buffer.from(encoded, "base64");
          if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw Object.assign(new Error("Een verenigingslogo moet 1 byte tot 2 MB zijn."), { statusCode: 400, code: "ASSOCIATION_LOGO_INVALID" });
          const png = bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
          const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
          const webp = bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
          if ((mimeType === "image/png" && !png) || (mimeType === "image/jpeg" && !jpeg) || (mimeType === "image/webp" && !webp)) throw Object.assign(new Error("De bestandsinhoud past niet bij het gekozen logoformaat."), { statusCode: 400, code: "ASSOCIATION_LOGO_SIGNATURE_INVALID" });
          association.workspaceLogo = { filename: requiredText(payload.workspaceLogo.filename, "Logo-bestandsnaam", 180), mimeType, dataBase64: bytes.toString("base64"), sha256: sha256(bytes).toUpperCase(), updatedAt: iso(), updatedBy: user.id };
        }
      }
      if (association.juniorValidationStatus === "VALIDATED") {
        if (!String(association.juniorValidationNote ?? "").trim()) throw Object.assign(new Error("Een gevalideerde Juniorstatus vereist een expliciete bronnotitie."), { statusCode: 400, code: "VALIDATION_SOURCE_REQUIRED" });
        if (!Number.isFinite(association.juniorPhysicalHeightMm) || association.juniorPhysicalHeightMm <= 0 || association.juniorPhysicalHeightMm > 500) throw Object.assign(new Error("Leg voor Junior een fysieke hoogte tussen 1 en 500 mm vast."), { statusCode: 400, code: "JUNIOR_PHYSICAL_MM_REQUIRED" });
      } else {
        association.juniorPhysicalHeightMm = null;
      }
      association.revision = (association.revision ?? 1) + 1;
      association.updatedAt = iso();
      association.validationHistory ??= [];
      const next = { active: association.active, notes: association.notes, fontProfile: association.fontProfile, foilColors: structuredClone(association.foilColors), defaultFoilColor: association.defaultFoilColor ?? association.foilColors[0] ?? "Onbekend", dimensionsCm: structuredClone(association.dimensionsCm), juniorValidationStatus: association.juniorValidationStatus, juniorPhysicalHeightMm: association.juniorPhysicalHeightMm, juniorGarmentSizes: structuredClone(association.juniorGarmentSizes ?? []), juniorValidationNote: association.juniorValidationNote, workspaceLogoSha256: association.workspaceLogo?.sha256 ?? null };
      association.validationHistory.unshift({ at: association.updatedAt, userId: user.id, field: "association", previous, next, source: association.juniorValidationNote || "Admin bevestiging in Workspace" });
      const profileInputsChanged = previous.fontProfile !== next.fontProfile || JSON.stringify(previous.dimensionsCm) !== JSON.stringify(next.dimensionsCm) || previous.juniorValidationStatus !== next.juniorValidationStatus || previous.juniorPhysicalHeightMm !== next.juniorPhysicalHeightMm || JSON.stringify(previous.juniorGarmentSizes) !== JSON.stringify(next.juniorGarmentSizes) || previous.juniorValidationNote !== next.juniorValidationNote;
      const linkedProfileIds = profileInputsChanged ? new Set([
        ...state.articles.filter((article) => article.association === association.name).map(({ profileId }) => profileId),
        ...state.productionProfiles.filter(({ id }) => id.startsWith(`profile-source-${profileSlug(association.name)}-`)).map(({ id }) => id),
      ]) : new Set();
      for (const profile of state.productionProfiles.filter(({ id }) => linkedProfileIds.has(id))) {
        const previousProfile = structuredClone(profile);
        profile.fontProfile = association.fontProfile;
        if (profile.supports?.includes("backNumber")) {
          profile.backNumberSizeClasses ??= {};
          if (Number.isFinite(association.dimensionsCm.backNumberSenior) && association.dimensionsCm.backNumberSenior > 0) {
            profile.backNumberSizeClasses.SENIOR = {
              physicalHeightMm: association.dimensionsCm.backNumberSenior * 10,
              status: "SOURCE_CONFIGURED",
              source: association.juniorValidationNote || "Admin bevestiging in Workspace",
            };
          }
          profile.backNumberSizeClasses.JUNIOR = association.juniorValidationStatus === "VALIDATED"
            ? { physicalHeightMm: association.juniorPhysicalHeightMm, sourceValueMm: association.dimensionsCm.backNumberJuniorSourceValue ? association.dimensionsCm.backNumberJuniorSourceValue * 10 : null, status: "VALIDATED", source: association.juniorValidationNote }
            : { physicalHeightMm: null, sourceValueMm: association.dimensionsCm.backNumberJuniorSourceValue ? association.dimensionsCm.backNumberJuniorSourceValue * 10 : null, status: "DATA_GAP", source: association.juniorValidationNote };
        }
        profile.sizeLabel = associationProfileSizeLabel(association, profile);
        profile.revision = Number(profile.revision ?? 1) + 1;
        profile.validationHistory ??= [];
        profile.validationHistory.unshift({ at: association.updatedAt, userId: user.id, previous: previousProfile, next: structuredClone(profile), source: association.juniorValidationNote });
      }
      audit(state, user.id, "Verenigingsinstelling gewijzigd", association.name, { revision: association.revision });
      return { state, value: structuredClone(association) };
    });
    return result.value;
  }

  async updateProductionProfile(token, csrfToken, profileId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const profile = state.productionProfiles.find(({ id }) => id === profileId);
      if (!profile) throw Object.assign(new Error("Productieprofiel niet gevonden."), { statusCode: 404, code: "PROFILE_NOT_FOUND" });
      const expectedRevision = Number(payload.expectedRevision);
      if (expectedRevision !== Number(profile.revision ?? 1)) throw Object.assign(new Error("Het productieprofiel is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: profile.revision ?? 1 });
      const previous = structuredClone(profile);
      if (payload.placement !== undefined) profile.placement = requiredText(payload.placement, "Positie", 120);
      if (payload.referenceDistanceCm !== undefined) profile.referenceDistanceCm = nullableNumber(payload.referenceDistanceCm, "Referentieafstand", 0, 100);
      if (payload.sizeLabel !== undefined) profile.sizeLabel = requiredText(payload.sizeLabel, "Maatvoering", 120);
      if (payload.fontProfile !== undefined) profile.fontProfile = requiredText(payload.fontProfile, "Letterprofiel", 120);
      if (payload.foilColor !== undefined) profile.foilColor = requiredText(payload.foilColor, "Foliekleur", 80);
      if (payload.rotationDeg !== undefined) profile.rotationDeg = nullableNumber(payload.rotationDeg, "Rotatie", -360, 360);
      if (payload.mirror !== undefined) profile.mirror = payload.mirror === null || payload.mirror === "" ? null : payload.mirror === true || payload.mirror === "true";
      if (payload.instruction !== undefined) profile.instruction = requiredText(payload.instruction, "Instructie", 600);
      if (payload.initialsInfixRule !== undefined) {
        const current = profile.initialsInfixRule ?? { revision: 0 };
        const active = payload.initialsInfixRule.active === true;
        const heightMm = nullableNumber(payload.initialsInfixRule.heightMm, "Grootte tussenvoegsel", 0.1, 100);
        const horizontalSpacingMm = payload.initialsInfixRule.horizontalSpacingMm === undefined ? current.horizontalSpacingMm ?? null : nullableNumber(payload.initialsInfixRule.horizontalSpacingMm, "Horizontale tussenruimte tussenvoegsel", 0, 100);
        const baselineOffsetMm = payload.initialsInfixRule.baselineOffsetMm === undefined ? current.baselineOffsetMm ?? null : nullableNumber(payload.initialsInfixRule.baselineOffsetMm, "Verticale positie tussenvoegsel", -100, 100);
        profile.initialsInfixRule = { active, heightMm, horizontalSpacingMm, baselineOffsetMm, alignment: "CENTER", status: active && heightMm !== null ? "SOURCE_CONFIGURED" : "DATA_GAP", revision: Number(current.revision ?? 0) + 1 };
      }
      if (payload.validation !== undefined) {
        const fields = ["size", "font", "foilColor"];
        const validation = { source: requiredText(payload.validation.source, "Validatiebron", 1_000) };
        for (const field of fields) validation[field] = allowedValue(payload.validation[field], ["VALIDATED", "SOURCE_CONFIGURED", "DATA_GAP"], `Validatiestatus ${field}`);
        for (const field of ["placement", "referenceDistance", "rotation", "mirror", "cutContour", "physicalCutOutput"]) {
          const value = payload.validation[field] ?? profile.validation?.[field];
          if (value !== undefined) validation[field] = allowedValue(value, ["VALIDATED", "SOURCE_CONFIGURED", "DATA_GAP"], `Validatiestatus ${field}`);
        }
        validation.validatedScope = normalizedTextList(payload.validation.validatedScope ?? profile.validation?.validatedScope ?? [], "Bewezen scope", 20, 240);
        assertProfileValidatedValues(profile, validation);
        validation.status = deriveProfileValidationStatus(validation);
        profile.validation = validation;
      }
      profile.revision = Number(profile.revision ?? 1) + 1;
      profile.validationHistory ??= [];
      const changedAt = iso();
      profile.validationHistory.unshift({ at: changedAt, userId: user.id, previous, next: structuredClone(profile), source: profile.validation?.source ?? "Adminwijziging in Workspace" });
      audit(state, user.id, "Productieprofiel gewijzigd", profile.id, { revision: profile.revision, validationStatus: profile.validation?.status ?? "DATA_GAP" });
      return { state, value: structuredClone(profile) };
    });
    return result.value;
  }

  async updateSettings(token, csrfToken, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      if (payload.processingDays !== undefined) {
        const days = Number(payload.processingDays);
        if (!Number.isInteger(days) || days < 1 || days > 10) throw Object.assign(new Error("Doorlooptijd moet 1 tot 10 werkdagen zijn."), { statusCode: 400, code: "VALIDATION_ERROR" });
        state.settings.processingDays = days;
      }
      if (payload.deliveryFeeEur !== undefined) {
        const fee = Number(payload.deliveryFeeEur);
        if (!Number.isFinite(fee) || fee < 0 || fee > 100) throw Object.assign(new Error("Bezorgkosten moeten tussen € 0,00 en € 100,00 liggen."), { statusCode: 400, code: "VALIDATION_ERROR" });
        state.settings.deliveryFeeEur = Math.round(fee * 100) / 100;
      }
      if (payload.receiptMailText !== undefined) state.settings.receiptMailText = requiredText(payload.receiptMailText, "Ontvangsttekst", 2_000);
      if (payload.readyMailText !== undefined) state.settings.readyMailText = requiredText(payload.readyMailText, "Afhaaltekst", 2_000);
      if (payload.productionDefaults !== undefined) {
        const input = payload.productionDefaults;
        const number = (key, minimum, maximum) => {
          const result = Number(input[key]);
          if (!Number.isFinite(result) || result < minimum || result > maximum) throw Object.assign(new Error(`Ongeldige productie-instelling: ${key}.`), { statusCode: 400, code: "VALIDATION_ERROR" });
          return Math.round(result * 1000) / 1000;
        };
        const defaultFontId = requiredText(input.defaultFontId, "Standaard productiefont", 160);
        const defaultFont = state.productionFonts.find(({ id }) => id === defaultFontId);
        if (!productionFontExecutableDecision(defaultFont, "FREE_PRINT").allowed) throw Object.assign(new Error("Kies een werkelijk uitvoerbare, authoritative standaardfontbron."), { statusCode: 400, code: "PRODUCTION_FONT_INVALID" });
        state.settings.productionDefaults = {
          workingWidthMm: number("workingWidthMm", 50, SPORTPALEIS_MACHINE_CONSTRAINTS.maximumSafeTrackWidthMm),
          maxSafeTrackWidthMm: number("maxSafeTrackWidthMm", 50, SPORTPALEIS_MACHINE_CONSTRAINTS.maximumSafeTrackWidthMm),
          minimumGapMm: number("minimumGapMm", 0, 100),
          edgeMarginMm: number("edgeMarginMm", 0, 100),
          defaultWidthMm: number("defaultWidthMm", 1, 430),
          defaultHeightMm: number("defaultHeightMm", 1, 430),
          defaultFontId,
          defaultFoilColor: requiredText(input.defaultFoilColor, "Standaard foliekleur", 80),
        };
        if (state.settings.productionDefaults.workingWidthMm > state.settings.productionDefaults.maxSafeTrackWidthMm) throw Object.assign(new Error("De nominale werkbreedte mag de maximale veilige productiebaan niet overschrijden."), { statusCode: 400, code: "PRODUCTION_WIDTH_INVALID" });
      }
      audit(state, user.id, "Workspace-instellingen gewijzigd", "Bedrukkingsmodule");
      return { state, value: structuredClone(state.settings) };
    });
    return result.value;
  }

  async updateFoilRoll(token, csrfToken, rollId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const roll = state.foilRolls.find(({ id }) => id === rollId);
      if (!roll) throw Object.assign(new Error("Folierol niet gevonden."), { statusCode: 404, code: "FOIL_ROLL_NOT_FOUND" });
      if (payload.supplierType !== undefined) roll.supplierType = String(payload.supplierType ?? "").trim().slice(0, 120) || null;
      for (const [key, label] of [["purchasePriceEur", "Inkoopprijs"], ["originalLengthM", "Rollengte"]]) {
        if (payload[key] === null || payload[key] === "") roll[key] = null;
        else if (payload[key] !== undefined) {
          const numeric = Number(payload[key]);
          if (!Number.isFinite(numeric) || numeric <= 0) throw Object.assign(new Error(`Ongeldige ${label.toLowerCase()}.`), { statusCode: 400, code: "VALIDATION_ERROR" });
          roll[key] = numeric;
        }
      }
      if (payload.widthMm === null || payload.widthMm === "") roll.widthMm = null;
      else if (payload.widthMm !== undefined) {
        const widthMm = Number(payload.widthMm);
        if (!Number.isFinite(widthMm) || widthMm <= 0 || widthMm > 2000) throw Object.assign(new Error("Ongeldige gemeten rolbreedte."), { statusCode: 400, code: "VALIDATION_ERROR" });
        roll.widthMm = widthMm;
      }
      if (payload.active !== undefined) {
        if (typeof payload.active !== "boolean") throw Object.assign(new Error("Ongeldige rolstatus."), { statusCode: 400, code: "VALIDATION_ERROR" });
        if (!payload.active && ["foil-white", "foil-red"].includes(roll.id)) throw Object.assign(new Error("Wit en Rood zijn bestaande beschermde productierollen."), { statusCode: 409, code: "FOIL_ROLL_PROTECTED" });
        if (!payload.active) {
          const normalized = String(roll.color).trim().toLocaleLowerCase("nl-NL");
          const usedByArticle = state.articles.some(({ foilColorOverride }) => String(foilColorOverride ?? "").trim().toLocaleLowerCase("nl-NL") === normalized);
          const usedByAssociation = state.associations.some((association) => associationDefaultFoilColor(association).toLocaleLowerCase("nl-NL") === normalized);
          const usedByProfile = state.productionProfiles.some(({ foilColor }) => String(foilColor ?? "").trim().toLocaleLowerCase("nl-NL") === normalized);
          const usedByDefault = String(state.settings.productionDefaults.defaultFoilColor ?? "").trim().toLocaleLowerCase("nl-NL") === normalized;
          if (usedByArticle || usedByAssociation || usedByProfile || usedByDefault) throw Object.assign(new Error("Deze foliekleur is nog in productieconfiguratie in gebruik."), { statusCode: 409, code: "FOIL_ROLL_IN_USE" });
        }
        roll.active = payload.active;
      }
      roll.revision = Number(roll.revision ?? 1) + 1;
      audit(state, user.id, "Folierol gewijzigd", roll.id);
      return { state, value: structuredClone(roll) };
    });
    return result.value;
  }

  async createFoilRoll(token, csrfToken, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const color = requiredText(payload.color, "Kleur/naam", 40);
      const normalized = color.toLocaleLowerCase("nl-NL");
      if (state.foilRolls.some(({ color: existing }) => String(existing).trim().toLocaleLowerCase("nl-NL") === normalized)) throw Object.assign(new Error("Deze foliekleur bestaat al."), { statusCode: 409, code: "FOIL_ROLL_EXISTS" });
      const optionalPositive = (key, label, maximum = Number.MAX_SAFE_INTEGER) => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === "") return null;
        const value = Number(payload[key]);
        if (!Number.isFinite(value) || value <= 0 || value > maximum) throw Object.assign(new Error(`Ongeldige ${label.toLowerCase()}.`), { statusCode: 400, code: "VALIDATION_ERROR" });
        return value;
      };
      const roll = {
        id: `foil-${normalized.normalize("NFKD").replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "") || "roll"}-${randomBytes(4).toString("hex")}`,
        color,
        supplierType: String(payload.supplierType ?? "").trim().slice(0, 120) || null,
        purchasePriceEur: optionalPositive("purchasePriceEur", "Inkoopprijs"),
        originalLengthM: optionalPositive("originalLengthM", "Oorspronkelijke lengte"),
        widthMm: optionalPositive("widthMm", "Gemeten rolbreedte", 2000),
        usedLengthMm: null,
        active: true,
        revision: 1,
        createdAt: iso(),
      };
      state.foilRolls.push(roll);
      audit(state, user.id, "Folierol toegevoegd", roll.id);
      return { state, value: structuredClone(roll) };
    });
    return result.value;
  }

  async health() {
    const state = await this.store.read();
    const storage = typeof this.store.storageStatus === "function"
      ? await this.store.storageStatus()
      : { engine: "unknown", storageBytes: null };
    return {
      status: "ok",
      releaseId: this.releaseId,
      database: "ok",
      databaseEngine: storage.engine,
      datastoreRevision: state.revision,
      storageBytes: storage.storageBytes,
      backup: await this.store.latestBackupStatus(),
      barcodeEnabled: false,
      barcodeHardwareValidated: false,
      hardwareSendEnabled: false,
    };
  }

  #teamkitProposalMailRequest(state, user, proposalId, payload) {
    const proposal = state.teamkitProposals?.find(({ id }) => id === proposalId); if (!proposal) throw Object.assign(new Error("Voorstel niet gevonden."), { statusCode: 404, code: "PROPOSAL_NOT_FOUND" });
    const templateKey = allowedValue(payload.templateKey, ["PROPOSAL_INTAKE_REQUEST", "PROPOSAL_REVIEW_REQUEST", "PROPOSAL_SUPPLIER_HANDOFF"], "Voorstelbericht");
    let recipient = proposal.customer.email; let context;
    if (templateKey === "PROPOSAL_SUPPLIER_HANDOFF") {
      const task = proposal.fulfillmentTasks.find(({ id }) => id === String(payload.taskId));
      if (!proposal.approval || !task || task.kind !== "EXTERNAL_SUPPLIER") throw Object.assign(new Error("Kies een uitbesteedtaak uit de exact goedgekeurde voorstelversie."), { statusCode: 409, code: "PROPOSAL_SUPPLIER_TASK_REQUIRED" });
      recipient = validEmail(payload.recipient);
      context = { supplier: { name: requiredText(payload.supplierName ?? task.supplierName, "Naam bedrukker", 160) }, proposal: { number: proposal.proposalNumber, version: `V${proposal.approval.revision}`, customer: proposal.association.name ?? proposal.customer.name, specification: task.specification } };
    } else {
      const customerPath = requiredText(payload.customerPath, "Klantlink", 500); const match = customerPath.match(/^\/voorstel\/([A-Za-z0-9_-]{30,})$/u);
      if (!match || findProposalByCustomerToken(state, match[1]).id !== proposal.id) throw Object.assign(new Error("Maak eerst een actuele, veilige klantlink voor dit voorstel."), { statusCode: 409, code: "PROPOSAL_CUSTOMER_LINK_REQUIRED" });
      if (templateKey === "PROPOSAL_REVIEW_REQUEST" && !["READY_FOR_REVIEW", "SENT_TO_CUSTOMER", "READY_FOR_APPROVAL"].includes(proposal.status)) throw Object.assign(new Error("Zet de exacte voorstelversie eerst klaar voor controle."), { statusCode: 409, code: "PROPOSAL_REVIEW_NOT_READY" });
      const publicLink = new URL(customerPath, this.allowedOrigin).href;
      context = { customer: { name: proposal.customer.contactName }, proposal: { number: proposal.proposalNumber, title: proposal.title, version: `V${proposal.currentRevision}`, link: publicLink, expires: new Intl.DateTimeFormat("nl-NL", { dateStyle: "long", timeZone: "Europe/Amsterdam" }).format(new Date(proposal.customerAccess.expiresAt)) } };
    }
    return { organizationId: "sportpaleis", contextType: "teamkit-proposal", contextId: proposal.id, templateKey, recipient, context, attachments: [], requestedByRole: user.role };
  }

  async #assertCsrf(token, csrfToken) {
    const { session } = await this.authenticate(token);
    const presented = String(csrfToken ?? "");
    const bootstrapVerifier = presented.startsWith(BOOTSTRAP_CSRF_PREFIX) ? presented.slice(BOOTSTRAP_CSRF_PREFIX.length) : "";
    const valid = bootstrapVerifier
      ? safeEqualHex(session.csrfHash, bootstrapVerifier)
      : Boolean(presented) && safeEqualHex(session.csrfHash, sha256(presented));
    if (!valid) {
      throw Object.assign(new Error("Ongeldige requestbeveiliging."), { statusCode: 403, code: "CSRF_INVALID" });
    }
  }
}

function proposalIntakeData(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Object.assign(new Error("Het klantformulier bevat geen geldige velden."), { statusCode: 400, code: "PROPOSAL_INTAKE_INVALID" });
  const allowed = new Set(["association", "team", "contactName", "email", "phone", "products", "quantities", "teams", "sizes", "colors", "clubLogo", "sponsors", "initials", "names", "backNumbers", "shortNumbers", "otherPrint", "positions", "notes"]);
  const result = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!allowed.has(key)) continue;
    if (Array.isArray(raw)) result[key] = raw.slice(0, 100).map((item) => String(item ?? "").trim().slice(0, 240));
    else result[key] = String(raw ?? "").trim().slice(0, key === "notes" ? 2_000 : 1_000);
  }

  return result;
}

function requiredText(value, label, maximum) {
  const result = String(value ?? "").trim();
  if (!result || result.length > maximum) throw Object.assign(new Error(`${label} is verplicht en maximaal ${maximum} tekens.`), { statusCode: 400, code: "VALIDATION_ERROR" });
  return result;
}

function optional(value, maximum) {
  return String(value ?? "").trim().slice(0, maximum);
}

function validDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw Object.assign(new Error("Ongeldige datum."), { statusCode: 400, code: "VALIDATION_ERROR" });
  return date.toISOString();
}

function validEmail(value) {
  const email = requiredText(value, "E-mailadres", 180).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(email)) throw Object.assign(new Error("Vul een geldig e-mailadres in."), { statusCode: 400, code: "INVALID_EMAIL" });
  return email;
}

function optionalEmail(value) {
  const candidate = String(value ?? "").trim();
  return candidate ? validEmail(candidate) : "";
}

function validDeliveryAddress(value, mode) {
  if (mode === "PICKUP") return null;
  const postalCode = requiredText(value?.postalCode, "Postcode", 12).toUpperCase().replace(/\s+/gu, "");
  if (!/^[1-9][0-9]{3}[A-Z]{2}$/u.test(postalCode)) throw Object.assign(new Error("Vul een geldige Nederlandse postcode in."), { statusCode: 400, code: "INVALID_POSTAL_CODE" });
  return {
    postalCode: `${postalCode.slice(0, 4)} ${postalCode.slice(4)}`,
    houseNumber: requiredText(value?.houseNumber, "Huisnummer", 10),
    houseNumberSuffix: optional(value?.houseNumberSuffix, 12),
    street: requiredText(value?.street, "Straat", 120),
    city: requiredText(value?.city, "Plaats", 120),
    lookupStatus: allowedValue(value?.lookupStatus ?? "MANUAL_FALLBACK", ["VERIFIED", "MANUAL_FALLBACK"], "Adresstatus"),
  };
}

function allowedValue(value, allowed, label) {
  if (!allowed.includes(value)) throw Object.assign(new Error(`Ongeldige ${label.toLowerCase()}.`), { statusCode: 400, code: "VALIDATION_ERROR" });
  return value;
}

function normalizedTextList(value, label, maximumItems, maximumLength) {
  if (!Array.isArray(value)) throw Object.assign(new Error(`${label} moet een lijst zijn.`), { statusCode: 400, code: "VALIDATION_ERROR" });
  const normalized = [...new Set(value.map((entry) => String(entry ?? "").trim()).filter(Boolean))];
  if (normalized.length > maximumItems || normalized.some((entry) => entry.length > maximumLength)) throw Object.assign(new Error(`${label} bevat te veel of te lange waarden.`), { statusCode: 400, code: "VALIDATION_ERROR" });
  return normalized;
}

function normalizedPersonalizationFields(value) {
  const fields = normalizedTextList(value, "Bedrukkingstypen", PERSONALIZATION_FIELDS.length, 30);
  if (fields.some((field) => !PERSONALIZATION_FIELDS.includes(field))) throw Object.assign(new Error("Onbekend bedrukkingstype."), { statusCode: 400, code: "VALIDATION_ERROR" });
  return fields;
}

function nullableNumber(value, label, minimum, maximum) {
  if (value === null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum || number > maximum) throw Object.assign(new Error(`Ongeldige ${label.toLowerCase()}.`), { statusCode: 400, code: "VALIDATION_ERROR" });
  return number;
}

function deriveArticleValidationStatus(validation) {
  const values = [validation.name, validation.sku, validation.image, validation.variants, validation.sizes, validation.personalization];
  if (values.every((status) => status === "VALIDATED")) return "VALIDATED";
  return values.some((status) => status === "VALIDATED") ? "PARTIAL" : "DATA_GAP";
}

function deriveProfileValidationStatus(validation) {
  const values = [validation.size, validation.font, validation.foilColor].filter(Boolean);
  if (values.some((status) => status === "DATA_GAP")) return "DATA_GAP";
  return values.every((status) => status === "VALIDATED") ? "VALIDATED" : "PARTIAL";
}

function assertProfileValidatedValues(profile, validation) {
  if (profile.id === "profile-none") return;
  const missing = [];
  if (validation.size !== "DATA_GAP" && !String(profile.sizeLabel ?? "").trim()) missing.push("maatvoering");
  if (validation.font !== "DATA_GAP" && !String(profile.fontProfile ?? "").trim()) missing.push("letterprofiel");
  if (validation.foilColor !== "DATA_GAP" && !String(profile.foilColor ?? "").trim()) missing.push("foliekleur");
  if (missing.length) throw Object.assign(new Error(`Bevestigde profielvelden missen een waarde: ${missing.join(", ")}.`), { statusCode: 400, code: "PROFILE_VALIDATED_VALUE_MISSING" });
}

function productionProfileReadiness(profile) {
  if (!profile) return { status: "DATA_GAP", reason: "Productieprofiel ontbreekt" };
  if (profile.id === "profile-none") return { status: "CONFIGURED", reason: null };
  const validation = profile.validation;
  if (!validation) return { status: "DATA_GAP", reason: "Productieprofiel mist validatiestatus" };
  const criticalLabels = { size: "fysieke maatvoering", font: "letterprofiel", foilColor: "foliekleur" };
  const criticalGaps = Object.entries(criticalLabels).filter(([field]) => validation[field] === "DATA_GAP").map(([, label]) => label);
  if (criticalGaps.length) return { status: "DATA_GAP", reason: `Noodzakelijke productiegegevens ontbreken: ${criticalGaps.join(", ")}` };
  return { status: "CONFIGURED", reason: null };
}

function catalogArticleReadiness(article, profile) {
  if (article.validation?.personalization === "DATA_GAP" && profile?.id !== "profile-none" && profile?.id !== "profile-pending") {
    return { status: "DATA_GAP", reason: "De zichtbare bedrukoptie is nog niet eenduidig gekoppeld aan de juiste productie-uitvoer" };
  }
  const profileReadiness = productionProfileReadiness(profile);
  if (profileReadiness.status !== "CONFIGURED") return profileReadiness;
  if (article.validation?.status !== "VALIDATED") return { status: "ATTENTION", reason: `Aanvullende live catalogusdetails zijn nog niet volledig vastgelegd (${article.validation?.status ?? "DATA_GAP"})` };
  return profileReadiness;
}

function validatePersonalization(value, { requireBackNumberSizeClass = false } = {}) {
  const optional = (input, maximum) => {
    const result = String(input ?? "").trim();
    if (result.length > maximum) throw Object.assign(new Error("Bedrukking is te lang."), { statusCode: 400, code: "VALIDATION_ERROR" });
    return result;
  };
  const initials = optional(value.initials, 5);
  const initialsInfix = optional(value.initialsInfix, 8);
  if (initialsInfix && !initials) throw Object.assign(new Error("Vul initialen in wanneer een tussenvoegsel wordt gebruikt."), { statusCode: 400, code: "INITIALS_REQUIRED_FOR_INFIX" });
  if (initialsInfix && Array.from(initials).length !== 2) throw Object.assign(new Error("Een samengesteld tussenvoegsel vereist exact twee initialen."), { statusCode: 400, code: "INITIALS_COMPOSITE_REQUIRES_TWO_INITIALS" });
  const backNumber = optional(value.backNumber, 4);
  const backNumberSizeClass = optional(value.backNumberSizeClass, 10).toUpperCase();
  if (backNumber && requireBackNumberSizeClass && !BACK_NUMBER_SIZE_CLASSES.has(backNumberSizeClass)) throw Object.assign(new Error("Kies Junior of Senior voor het rugnummer."), { statusCode: 400, code: "BACK_NUMBER_SIZE_CLASS_REQUIRED" });
  if (backNumberSizeClass && !BACK_NUMBER_SIZE_CLASSES.has(backNumberSizeClass)) throw Object.assign(new Error("Ongeldige rugnummermaat."), { statusCode: 400, code: "BACK_NUMBER_SIZE_CLASS_INVALID" });
  if (!backNumber && backNumberSizeClass) throw Object.assign(new Error("Junior/Senior is alleen van toepassing bij een rugnummer."), { statusCode: 400, code: "BACK_NUMBER_SIZE_CLASS_NOT_APPLICABLE" });
  return {
    initials,
    initialsInfix,
    initialsSemantic: null,
    name: optional(value.name, 40),
    backNumber,
    chestNumber: optional(value.chestNumber, 4),
    backNumberSizeClass,
    shortsNumber: optional(value.shortsNumber, 4),
  };
}

function normalizeProductionContent(type, input, placementRole = null) {
  const value = String(input ?? "").trim();
  if (placementRole === "INITIALS_INFIX") return value.toLocaleLowerCase("nl-NL");
  if (["TEXT", "INITIALS"].includes(type)) return value.toLocaleUpperCase("nl-NL");
  return value;
}

function validatePriority(value, user, at) {
  if (!value?.enabled) return null;
  const reason = allowedValue(value.reason, ["complaint", "sportpaleis-error", "event", "other"], "Prioriteitsreden");
  const labels = { complaint: "Klacht", "sportpaleis-error": "Fout Sportpaleis", event: "Evenement/wedstrijd", other: "Anders" };
  return { enabled: true, requestedBy: requiredText(value.requestedBy, "Aangevraagd door", 120), alignedWith: requiredText(value.alignedWith, "Afgestemd met", 120), reason, reasonLabel: labels[reason], explanation: String(value.explanation ?? "").trim().slice(0, 600), createdAt: at, createdBy: user.id, createdByName: user.name };
}

function associationProfileSizeLabel(association, profile) {
  const dimensions = association.dimensionsCm;
  const labels = [];
  if (profile.supports?.includes("initials") && dimensions.initialsShirt) labels.push(`Initialen ${dimensions.initialsShirt} cm`);
  if (profile.supports?.includes("name") && dimensions.nameHeight) labels.push(`Naam ${dimensions.nameHeight} cm`);
  if (profile.supports?.includes("backNumber")) {
    const seniorMm = Number(profile.backNumberSizeClasses?.SENIOR?.physicalHeightMm) || Number(dimensions.backNumberSenior) * 10;
    const juniorMm = Number(profile.backNumberSizeClasses?.JUNIOR?.physicalHeightMm) || (association.juniorValidationStatus === "VALIDATED" ? Number(association.juniorPhysicalHeightMm) : 0);
    if (seniorMm > 0) labels.push(`Rug Senior ${seniorMm} mm`);
    if (juniorMm > 0) labels.push(`Rug Junior ${juniorMm} mm${(association.juniorGarmentSizes ?? []).length ? ` (${association.juniorGarmentSizes.join("–")})` : ""}`);
  }
  if (profile.supports?.includes("chestNumber") && dimensions.chestNumber) labels.push(`Borst ${dimensions.chestNumber} cm`);
  if (profile.supports?.includes("shortsNumber") && dimensions.shortsNumber) labels.push(`Short ${dimensions.shortsNumber} cm`);
  return labels.join(" · ") || profile.sizeLabel;
}

function resolveBackNumberProductionContext(association, profile, sizeClass, garmentSize) {
  if (!sizeClass) return null;
  const configured = profile.backNumberSizeClasses?.[sizeClass];
  if (Number(configured?.physicalHeightMm) > 0 && ["SOURCE_CONFIGURED", "VALIDATED"].includes(configured.status)) {
    return { sizeClass, physicalHeightMm: Number(configured.physicalHeightMm), status: configured.status, source: configured.source };
  }
  if (sizeClass === "JUNIOR" && association?.juniorValidationStatus === "VALIDATED") {
    return { sizeClass, physicalHeightMm: association.juniorPhysicalHeightMm, status: "VALIDATED", source: association.juniorValidationNote };
  }
  if (sizeClass === "SENIOR" && configured?.status !== "VALIDATED" && Number(association?.dimensionsCm?.backNumberSenior) > 0) return {
    sizeClass,
    physicalHeightMm: Number(association.dimensionsCm.backNumberSenior) * 10,
    status: "SOURCE_CONFIGURED",
    source: `${association.source.file} · ${association.source.sheet}!${association.source.range}`,
  };
  return {
    sizeClass,
    physicalHeightMm: configured?.physicalHeightMm ?? null,
    status: configured?.status ?? "DATA_GAP",
    source: configured?.source ?? `${sizeClass === "JUNIOR" ? "Junior" : "Senior"} rugnummermaat ontbreekt in productieprofiel ${profile.id}`,
  };
}

function productionElementProof(element) {
  if (element?.lifecycleStatus === "PRODUCTION_READY" && element?.controlledVector?.geometryHash === element?.sourceSelection?.geometryHash) return "GEOMETRY_VALIDATED";
  if (element?.sourceLayers?.physicallyProvenContour) return "PHYSICALLY_VALIDATED";
  if (element?.sourceLayers?.validatedCutContour) return "GEOMETRY_VALIDATED";
  return element?.sourceLayers?.vectorSource ? "CONFIGURED" : "DATA_GAP";
}

function publicProductionAssetSource(source) {
  return structuredClone({
    ...(({ documentPreviewSvg: _documentPreviewSvg, ...metadata }) => metadata)(source),
    original: (({ dataBase64: _dataBase64, ...metadata }) => metadata)(source.original),
    candidates: source.candidates.map((candidate) => (({ previewSvg: _previewSvg, controlledVector: _controlledVector, ...metadata }) => metadata)(candidate)),
  });
}

function publicCreativeVectorDraft(draft) {
  return structuredClone({
    ...draft,
    source: (({ dataBase64: _dataBase64, ...metadata }) => metadata)(draft.source),
    derivative: (({ svg: _svg, ...metadata }) => metadata)(draft.derivative),
  });
}

function publicVisualComposition(composition) {
  return structuredClone((({ sourceDataBase64: _sourceDataBase64, ...metadata }) => metadata)(composition));
}

function matchingCreativeArticle(articles, filename) {
  const normalized = String(filename ?? "").replace(/\.[^.]+$/u, "").normalize("NFKC").toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/gu, " ").trim();
  if (!normalized) return null;
  const compact = normalized.replaceAll(" ", "");
  const matches = articles.filter((article) => {
    const articleNumber = String(article.articleNumber ?? "").toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/gu, "");
    if (articleNumber.length >= 4 && compact.includes(articleNumber)) return true;
    const meaningfulNameTokens = String(article.name ?? "").normalize("NFKC").toLocaleLowerCase("nl-NL").split(/[^a-z0-9]+/gu).filter((token) => token.length >= 4);
    return meaningfulNameTokens.length >= 2 && meaningfulNameTokens.every((token) => normalized.includes(token));
  });
  return matches.length === 1 ? matches[0] : null;
}

function publicProductionElement(element) {
  return structuredClone({
    ...element,
    controlledVector: element.controlledVector ? (({ contours: _contours, ...metadata }) => metadata)(element.controlledVector) : undefined,
    numberGlyphs: element.numberGlyphs ? Object.fromEntries(Object.entries(element.numberGlyphs).map(([glyph, value]) => [glyph, (({ contours: _contours, ...metadata }) => metadata)(value)])) : undefined,
    sourceLayers: element.sourceLayers ? Object.fromEntries(Object.entries(element.sourceLayers).map(([key, value]) => [key, value ? (({ dataBase64: _dataBase64, ...metadata }) => metadata)(value) : null])) : undefined,
  });
}

function canonicalManagedFontResolution(state, profile) {
  const configuredName = String(profile?.fontProfile ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("nl-NL");
  const provenance = {
    profileId: profile?.id ?? null,
    profileRevision: Number(profile?.revision ?? 1),
    configuredName: profile?.fontProfile ?? null,
  };
  if (!configuredName) return { status: "MISSING", font: null, matches: [], provenance };
  const normalized = (value) => String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/gu, "");
  const configuredIdentity = normalized(configuredName);
  const declaredSourceId = String(profile?.canonicalFontSourceId ?? "").trim();
  const registeredCandidates = SPORTPALEIS_AUTHORITATIVE_PRODUCTION_ASSETS.filter((asset) => asset.kind === "MANAGED_FONT" && [asset.name, asset.familyName, asset.postscriptName, ...(asset.aliases ?? [])].some((identity) => normalized(identity) === configuredIdentity));
  const registeredSourceId = registeredCandidates.length === 1 ? registeredCandidates[0].id : null;
  const requiredSourceId = declaredSourceId || registeredSourceId;
  if (!requiredSourceId) return { status: "UNRESOLVED", font: null, matches: [], provenance: { ...provenance, configuredIdentity, reason: "CANONICAL_SOURCE_ID_UNBOUND" } };
  const registeredAsset = authoritativeProductionAssetById(requiredSourceId);
  const matches = state.productionFonts.filter(({ id, status }) => status === "TECHNICALLY_VALID" && id === requiredSourceId);
  if (matches.length === 0) return { status: "UNRESOLVED", font: null, matches: [], provenance: { ...provenance, configuredIdentity } };
  if (matches.length > 1) return { status: "CONFLICTING", font: null, matches: matches.map(({ id, version, sha256: hash }) => ({ id, version, sha256: hash })), provenance: { ...provenance, configuredIdentity } };
  const font = matches[0];
  const authoritativeHash = String(font.sha256 ?? "").toUpperCase();
  const exactAuthoritativeIdentity = font.status === "TECHNICALLY_VALID"
    && Boolean(font.provenance)
    && /^[A-F0-9]{64}$/u.test(authoritativeHash)
    && font.authoritativeIdentity === font.id
    && (!registeredAsset || registeredAsset.kind === "MANAGED_FONT"
      && registeredAsset.sha256 === authoritativeHash
      && registeredAsset.authoritativeIdentity === font.id);
  if (!exactAuthoritativeIdentity) return { status: "CONFLICTING", font: null, matches: [{ id: font.id, version: font.version, sha256: font.sha256 }], provenance: { ...provenance, configuredIdentity, reason: "AUTHORITATIVE_IDENTITY_INVALID" } };
  return { status: "RESOLVED", font, matches: [{ id: font.id, version: font.version, sha256: font.sha256 }], provenance: { ...provenance, configuredIdentity, requiredSourceId, authoritativeIdentity: font.id, authoritativeSha256: authoritativeHash } };
}

function configuredManagedFont(state, profile) {
  const resolution = canonicalManagedFontResolution(state, profile);
  return resolution.status === "RESOLVED" ? resolution.font : null;
}

const PIONEERS_ASSOCIATION = "Almere Pioneers";
const PIONEERS_PROFILE_AUTHORITY_EVENT = "SPW-PIONEERS-NUMBER-AUTHORITY-20260825";
const PIONEERS_UNIFIED_NUMBER_GLYPH_EVENT = "SPW-PIONEERS-UNIFIED-NUMBER-GLYPHS-20260903";
const VERIFIED_NUMBER_SOURCE_EVENT = "SPW-VERIFIED-SVG-NUMBER-SOURCES-20260825";

function reconcileVerifiedProductionNumberSources(state) {
  state.productionAssetSources ??= [];
  state.productionElements ??= [];
  state.audit ??= [];
  const entries = verifiedProductionNumberSources();
  for (const entry of entries) {
    const source = state.productionAssetSources.find(({ original }) => original?.sha256 === entry.source.original.sha256);
    if (!source) state.productionAssetSources.push(entry.source);
    const sourceId = source?.id ?? entry.source.id;
    const existing = state.productionElements.find((element) => element.verifiedSourceKey === entry.definition.key
      || element.sourceId === sourceId && element.applications?.some(({ kind, placement }) => kind === "NUMBER_SET" && placement === entry.definition.placement) && element.variants?.some(({ heightMm }) => Math.abs(Number(heightMm) - entry.definition.heightMm) <= 0.01));
    if (!existing) {
      const element = structuredClone(entry.element);
      element.sourceId = sourceId;
      element.sourceLayers.vectorSource.sha256 = entry.source.normalized?.sha256 ?? entry.source.original.sha256;
      element.sourceLayers.validatedCutContour.sourceId = sourceId;
      state.productionElements.push(element);
      const auditId = `audit-${VERIFIED_NUMBER_SOURCE_EVENT.toLocaleLowerCase("en-US")}-${entry.definition.key}`;
      if (!state.audit.some(({ id }) => id === auditId)) state.audit.unshift({ id: auditId, at: "2026-09-01T00:00:00.000Z", userId: "system:verified-source-import", action: "Gecontroleerde SVG-nummerset opgenomen", subject: element.id, details: { sourceId, sourceSha256: entry.source.original.sha256, sourceFilename: entry.source.original.filename, normalizedSha256: entry.source.normalized?.sha256 ?? entry.source.original.sha256, normalizedFilename: entry.source.normalized?.filename ?? entry.source.original.filename, assetVersion: element.version, physicalHeightMm: entry.definition.heightMm, placement: entry.definition.placement, sourceBytesImmutable: true, geometryAiGenerated: false } });
    }
  }
  const assetsByKey = new Map(state.productionElements.filter(({ verifiedSourceKey }) => Boolean(verifiedSourceKey)).map((element) => [element.verifiedSourceKey, element.id]));
  const pioneersMasterKey = "pioneers-rug-senior-200";
  const pioneersMaster = state.productionElements.find(({ id }) => id === assetsByKey.get(pioneersMasterKey));
  if (pioneersMaster) {
    pioneersMaster.applications ??= [];
    for (const application of [
      { kind: "NUMBER_SET", placement: "Rug Senior", targetHeightMm: 200, sourceHeightMm: 200 },
      { kind: "NUMBER_SET", placement: "Rug Junior", targetHeightMm: 200, sourceHeightMm: 200 },
      { kind: "NUMBER_SET", placement: "Borst", targetHeightMm: 80, sourceHeightMm: 200 },
      { kind: "NUMBER_SET", placement: "Short", targetHeightMm: 80, sourceHeightMm: 200 },
    ]) {
      const existing = pioneersMaster.applications.find(({ kind, placement }) => kind === application.kind && placement === application.placement);
      if (existing) Object.assign(existing, application);
      else pioneersMaster.applications.push(application);
    }
  }
  const links = new Map([
    ["profile-pioneers-shirt", [{ key: pioneersMasterKey, field: "backNumber", targetHeightMm: 200, sourceHeightMm: 200 }]],
    ["profile-source-almere-pioneers-backNumber", [{ key: pioneersMasterKey, field: "backNumber", targetHeightMm: 200, sourceHeightMm: 200 }]],
    ["profile-source-almerer-pioneers-backNumber", [{ key: pioneersMasterKey, field: "backNumber", targetHeightMm: 200, sourceHeightMm: 200 }]],
    ["profile-source-almere-pioneers-chestNumber", [{ key: pioneersMasterKey, field: "chestNumber", targetHeightMm: 80, sourceHeightMm: 200 }]],
    ["profile-source-almerer-pioneers-chestNumber", [{ key: pioneersMasterKey, field: "chestNumber", targetHeightMm: 80, sourceHeightMm: 200 }]],
    ["profile-pioneers-shorts", [{ key: pioneersMasterKey, field: "shortsNumber", targetHeightMm: 80, sourceHeightMm: 200 }]],
    ["profile-source-almere-pioneers-shortsNumber", [{ key: pioneersMasterKey, field: "shortsNumber", targetHeightMm: 80, sourceHeightMm: 200 }]],
    ["profile-source-almerer-pioneers-shortsNumber", [{ key: pioneersMasterKey, field: "shortsNumber", targetHeightMm: 80, sourceHeightMm: 200 }]],
  ]);
  const hockeySourceRules = [
    { field: "backNumber", dimensionKey: "backNumberSenior", expectedCm: 20, sourceKey: "hockey-rug-200" },
    { field: "shortsNumber", dimensionKey: "shortsNumber", expectedCm: 7.5, sourceKey: "hockey-short-75" },
  ];
  const hockeyNumberAssociations = new Set(["MHC Lelystad", "Almeerse Hockeyclub", "Buitenhout MHC"]);
  for (const association of state.associations?.filter(({ name }) => hockeyNumberAssociations.has(name)) ?? []) {
    const associationProfilePrefix = `profile-source-${profileSlug(association.name)}-`;
    for (const rule of hockeySourceRules) {
      if (Math.abs(Number(association.dimensionsCm?.[rule.dimensionKey]) - rule.expectedCm) > 0.001) continue;
      const assetId = assetsByKey.get(rule.sourceKey);
      const element = state.productionElements.find(({ id }) => id === assetId);
      if (element && !element.contexts?.some(({ type, id }) => type === "ASSOCIATION" && id === association.id)) {
        element.contexts ??= [];
        element.contexts.push({ type: "ASSOCIATION", id: association.id, label: association.name });
      }
      for (const profile of state.productionProfiles?.filter(({ id, supports }) => supports?.includes(rule.field) && (id.startsWith(associationProfilePrefix) || association.name === "MHC Lelystad" && ["profile-mhc-shirt-home", "profile-mhc-shirt-away"].includes(id))) ?? []) {
        links.set(profile.id, [{ key: rule.sourceKey, field: rule.field, targetHeightMm: rule.expectedCm * 10, sourceHeightMm: rule.expectedCm * 10 }]);
      }
    }
  }
  for (const [profileId, bindings] of links) {
    const profile = state.productionProfiles?.find(({ id }) => id === profileId);
    if (!profile) continue;
    const keys = [...new Set(bindings.map(({ key }) => key))];
    profile.productionNumberAssetIds = keys.map((key) => assetsByKey.get(key)).filter(Boolean);
    for (const binding of bindings) {
      const asset = state.productionElements.find(({ id }) => id === assetsByKey.get(binding.key));
      if (asset) assignProductionNumberAsset(profile, binding.field, binding.targetHeightMm, asset, binding.sourceHeightMm);
    }
    if (keys.includes("pioneers-rug-senior-200")) {
      profile.backNumberSizeClasses ??= {};
      profile.backNumberSizeClasses.SENIOR = { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: "rug nummers Pioneers senior 20cm.svg · immutable SHA-256 FD6716E5911EB5AB239D291808DC490ECF305FD3F30C49E183AB063097C67143 · normalized SHA-256 5CC303321ADCB7BF9F0722E6BDFE8CCAD6BBABA28139AF77DB08CA3C478BD709" };
      profile.backNumberSizeClasses.JUNIOR = { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE };
    }
    if (bindings.some(({ key, field }) => key === pioneersMasterKey && field === "shortsNumber")) profile.sizeLabel = "Shortnummer 8 cm · proportioneel uit dezelfde authoritative Pioneers-glyphmaster als Rug en Borst";
  }
  const supersededShort = state.productionElements.find(({ verifiedSourceKey }) => verifiedSourceKey === "pioneers-short-80");
  if (supersededShort?.lifecycleStatus === "PRODUCTION_READY") supersededShort.lifecycleStatus = "ARCHIVED";
  if (pioneersMaster && !state.audit.some(({ id }) => id === `audit-${PIONEERS_UNIFIED_NUMBER_GLYPH_EVENT.toLocaleLowerCase("en-US")}`)) state.audit.unshift({
    id: `audit-${PIONEERS_UNIFIED_NUMBER_GLYPH_EVENT.toLocaleLowerCase("en-US")}`,
    at: "2026-09-03T00:00:00.000Z",
    userId: "system:pioneers-source-authority",
    action: "Pioneers nummerglyphs voor Rug, Borst en Short verenigd",
    subject: pioneersMaster.id,
    details: { sourceAssetId: pioneersMaster.id, sourceVersion: pioneersMaster.version, placements: ["backNumber", "chestNumber", "shortsNumber"], targetHeightsMm: { backNumber: 200, chestNumber: 80, shortsNumber: 80 }, supersededAssetId: supersededShort?.id ?? null, productTruth: "Donovan 2026-09-03: Rug, Borst en Short gebruiken dezelfde authoritative glyphs." },
  });
}

function normalizedProductionIdentity(value) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("nl-NL");
}

function pioneersCanonicalFontName(state) {
  const association = state.associations.find(({ name }) => name === PIONEERS_ASSOCIATION);
  const evidence = association?.fontEvidence;
  return evidence?.applied && evidence.confirmationStatus === "MATCH" ? String(evidence.canonicalName ?? "").trim() : "";
}

function applyPioneersProductionAuthority(state) {
  const association = state.associations.find(({ name }) => name === PIONEERS_ASSOCIATION);
  const canonicalName = pioneersCanonicalFontName(state);
  if (!association || !canonicalName) return;
  const update = (record, field = "fontProfile") => {
    if (!record || normalizedProductionIdentity(record[field]) === normalizedProductionIdentity(canonicalName)) return;
    const previous = record[field];
    record[field] = canonicalName;
    record.revision = Number(record.revision ?? 1) + 1;
    record.validationHistory ??= [];
    if (!record.validationHistory.some(({ source }) => source === PIONEERS_PROFILE_AUTHORITY_EVENT)) record.validationHistory.push({ at: "2026-08-25T00:00:00.000Z", userId: "system:pioneers-source-authority", field, previous, next: canonicalName, source: PIONEERS_PROFILE_AUTHORITY_EVENT });
  };
  update(association);
  for (const profile of state.productionProfiles ?? []) if (/^profile-pioneers-|^profile-source-almere-pioneers-(?:backNumber|chestNumber|shortsNumber)$/u.test(profile.id)) update(profile);
}

const SC_BUITENBOYS_ASSOCIATION = "SC Buitenboys";
const SC_BUITENBOYS_SHORT_PROFILE_ID = "profile-source-sc-buitenboys-shortsNumber";
const SC_BUITENBOYS_SHORT_PROFILE_AUTHORITY_EVENT = "SPW-SC-BUITENBOYS-SHORT-SPAIN-20260825";

function applyScBuitenboysShortAuthority(state) {
  const profile = state.productionProfiles?.find(({ id }) => id === SC_BUITENBOYS_SHORT_PROFILE_ID);
  if (!profile || normalizedProductionIdentity(profile.fontProfile) === "spain") return;
  const previous = profile.fontProfile;
  profile.fontProfile = "Spain";
  profile.revision = Number(profile.revision ?? 1) + 1;
  profile.validation ??= {};
  profile.validation.font = "SOURCE_CONFIGURED";
  profile.validation.source = `${String(profile.validation.source ?? "").trim()} Praktijkbevestiging 2026-08-25: SC Buitenboys shortnummer gebruikt uitsluitend het gecontroleerde Spain-profiel.`.trim();
  profile.validationHistory ??= [];
  profile.validationHistory.push({ at: "2026-08-25T00:00:00.000Z", userId: "system:sc-buitenboys-short-authority", field: "fontProfile", previous, next: "Spain", source: SC_BUITENBOYS_SHORT_PROFILE_AUTHORITY_EVENT });
}

function assertScBuitenboysShortSource(state, order, line) {
  const item = order?.items?.find(({ id }) => id === line.itemId);
  if (item?.association !== SC_BUITENBOYS_ASSOCIATION || line.personalizationField !== "shortsNumber") return;
  if (item.productionProfileId !== SC_BUITENBOYS_SHORT_PROFILE_ID) throw Object.assign(new Error("SC Buitenboys shortnummer mist het canonieke Spain-shortprofiel; productie blijft op REVIEW."), { statusCode: 409, code: "SC_BUITENBOYS_SHORT_PROFILE_MISMATCH" });
  if (line.source?.kind === "FONT") {
    const profile = state.productionProfiles.find(({ id }) => id === SC_BUITENBOYS_SHORT_PROFILE_ID);
    const font = configuredManagedFont(state, profile);
    if (font && line.source.id === font.id && line.source.version === font.version && line.source.sha256 === font.sha256) return;
  }
  if (line.source?.kind === "PRODUCTION_ELEMENT") {
    const profile = state.productionProfiles.find(({ id }) => id === SC_BUITENBOYS_SHORT_PROFILE_ID);
    const asset = state.productionElements.find(({ id, version, revision, lifecycleStatus, productionMethod }) => id === line.source.id && (version ?? String(revision)) === line.source.version && lifecycleStatus === "PRODUCTION_READY" && productionMethod === "SELF_PRODUCED");
    const exactProfileLink = profile?.productionNumberAssetIds?.includes(asset?.id);
    const exactAssociation = asset?.contexts?.some(({ type, id, label }) => type === "ASSOCIATION" && (id === item.association || label === item.association));
    const shortApplication = asset?.applications?.some(({ kind, placement }) => kind === "NUMBER_SET" && /short|rok/iu.test(String(placement ?? "")));
    const completeGlyphSet = Object.keys(asset?.numberGlyphs ?? {}).length === 10 && Array.from({ length: 10 }, (_, digit) => String(digit)).every((digit) => asset?.numberGlyphs?.[digit]);
    const exactHeight = asset?.variants?.some(({ heightMm }) => Math.abs(Number(heightMm) - Number(line.heightMm)) <= 0.01);
    if (exactProfileLink && exactAssociation && shortApplication && completeGlyphSet && exactHeight && ["GEOMETRY_VALIDATED", "PHYSICALLY_VALIDATED"].includes(productionElementProof(asset))) return;
  }
  throw Object.assign(new Error("SC Buitenboys shortnummer heeft geen exact aan het Spain-profiel gekoppelde productiebron; productie blijft op REVIEW."), { statusCode: 409, code: "SC_BUITENBOYS_SHORT_SOURCE_REVIEW_REQUIRED" });
}

function naambalkApplicationContext(values, field) {
  if (!SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH.componentFields.includes(field)) return null;
  if (!String(values?.name ?? "").trim() || !String(values?.backNumber ?? "").trim()) return null;
  return {
    kind: SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH.kind,
    semantic: SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH.semantic,
    component: field === "name" ? "NAME" : "RUGNUMBER",
    componentFields: [...SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH.componentFields],
    dimensionAuthority: SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH.dimensionAuthority,
    aggregatePhysicalDimensions: null,
    backNumberSizeClass: String(values.backNumberSizeClass ?? "").trim() || null,
    source: SPORTPALEIS_NAAMBALK_HUMAN_PRODUCT_TRUTH.source,
  };
}

function productionDecorationIdentity(order, line) {
  if (line.decorationIdentity) return line.decorationIdentity;
  const item = order?.items?.find(({ id }) => id === line.itemId);
  if (!item || !line.personalizationField) return null;
  return { orderId: order.id, itemId: item.id, articleNumber: item.articleNumber, decorationType: line.personalizationField, placement: line.personalizationField, value: line.content, foilColor: line.foilColor ?? item.foilColor, productionProfileId: item.productionProfileId };
}

function assertOrderProductionDecorationCardinality(state, order) {
  if (["TEAM", "CUSTOM"].includes(order.orderKind)) {
    const seenLineIds = new Set();
    const actualByPlacement = new Map();
    for (const line of order.productionLines ?? []) {
      if (seenLineIds.has(line.id)) throw Object.assign(new Error("Een directe productieregel komt dubbel voor."), { statusCode: 409, code: "PRODUCTION_DECORATION_CARDINALITY_MISMATCH" });
      seenLineIds.add(line.id);
      const identity = productionDecorationIdentity(order, line);
      const expectedType = line.personalizationField ?? line.decorationIdentity?.decorationType ?? line.type;
      if (!identity || identity.orderId !== order.id || identity.itemId !== line.itemId || identity.decorationType !== expectedType || identity.value !== line.content || !identity.placement || !identity.foilColor || !identity.productionProfileId) throw Object.assign(new Error(`${line.preview?.label ?? line.content}: productie-identiteit is onvolledig.`), { statusCode: 409, code: "PRODUCTION_DECORATION_IDENTITY_MISSING" });
      const placementId = line.teamkitProductionContext?.proposalPlacementId;
      if (placementId) actualByPlacement.set(placementId, Number(actualByPlacement.get(placementId) ?? 0) + Number(line.quantity));
    }
    if (order.orderKind === "CUSTOM" && (order.productionLines ?? []).length) {
      const intendedQuantity = (order.items ?? []).reduce((sum, item) => sum + Number(item.quantity ?? 0), 0);
      const physicalQuantity = (order.productionLines ?? []).reduce((sum, line) => sum + Number(line.quantity ?? 0), 0);
      if (intendedQuantity !== physicalQuantity) throw Object.assign(new Error("Het aantal vrije opdrukken komt niet exact overeen met de fysieke productieregels."), { statusCode: 409, code: "PRODUCTION_DECORATION_CARDINALITY_MISMATCH", expected: intendedQuantity, actual: physicalQuantity });
    }
    if (order.teamkitContext?.kind === "TEAMKIT_APPROVAL") {
      const expectedPlacementIds = new Set((order.teamkitContext.placementRefs ?? []).map(({ placementId }) => placementId));
      if (actualByPlacement.size !== expectedPlacementIds.size || [...actualByPlacement.keys()].some((placementId) => !expectedPlacementIds.has(placementId))) throw Object.assign(new Error("De Teamwear-productieregels komen niet één-op-één overeen met de approved placements."), { statusCode: 409, code: "PRODUCTION_DECORATION_CARDINALITY_MISMATCH" });
      const expectedQuantity = Number(order.items?.[0]?.quantity ?? 0);
      for (const placementId of expectedPlacementIds) if (Number(actualByPlacement.get(placementId) ?? 0) !== expectedQuantity) throw Object.assign(new Error("Een approved Teamwear-placement mist productie-eenheden of komt dubbel voor."), { statusCode: 409, code: "PRODUCTION_DECORATION_CARDINALITY_MISMATCH", placementId, expected: expectedQuantity, actual: Number(actualByPlacement.get(placementId) ?? 0) });
    }
    return;
  }
  if (order.orderKind !== "INDIVIDUAL") return;
  const catalogLines = (order.productionLines ?? []).filter(({ personalizationField }) => PERSONALIZATION_FIELDS.includes(personalizationField));
  const compositionLines = (order.productionLines ?? []).filter(({ placementRule }) => Boolean(placementRule?.compositionId));
  if (!catalogLines.length && !compositionLines.length) return;
  const expected = new Map();
  for (const item of order.items ?? []) for (const variant of item.variants ?? []) for (const field of PERSONALIZATION_FIELDS) {
    const raw = variant.personalizationValues?.[field];
    const type = ["backNumber", "chestNumber", "shortsNumber"].includes(field) ? "NUMBER" : field === "initials" ? "INITIALS" : "TEXT";
    const value = normalizeProductionContent(type, raw);
    if (!value) continue;
    const key = JSON.stringify([item.id, item.articleNumber, field, value]);
    expected.set(key, Number(expected.get(key) ?? 0) + Number(variant.quantity));
  }
  const actual = new Map();
  for (const line of catalogLines) {
    const item = order.items.find(({ id }) => id === line.itemId);
    if (!item) throw Object.assign(new Error("Een productieregel mist de oorspronkelijke orderregel."), { statusCode: 409, code: "PRODUCTION_DECORATION_IDENTITY_MISSING" });
    const key = JSON.stringify([item.id, item.articleNumber, line.personalizationField, line.content]);
    actual.set(key, Number(actual.get(key) ?? 0) + Number(line.quantity));
    const identity = productionDecorationIdentity(order, line);
    if (!identity || identity.orderId !== order.id || identity.itemId !== item.id || identity.articleNumber !== item.articleNumber || identity.decorationType !== line.personalizationField || identity.value !== line.content || identity.foilColor !== item.foilColor || !identity.productionProfileId) throw Object.assign(new Error(`${line.preview?.label ?? line.content}: productie-identiteit is onvolledig.`), { statusCode: 409, code: "PRODUCTION_DECORATION_IDENTITY_MISSING" });
  }
  const compositions = new Map();
  for (const line of compositionLines) compositions.set(line.placementRule.compositionId, [...(compositions.get(line.placementRule.compositionId) ?? []), line]);
  for (const lines of compositions.values()) {
    const ordered = [...lines].sort((left, right) => left.placementRule.segmentIndex - right.placementRule.segmentIndex);
    if (ordered.length !== 3 || ordered[0].placementRole !== "INITIALS_FIRST" || ordered[2].placementRole !== "INITIALS_LAST") throw Object.assign(new Error("Samengestelde initialen missen fysieke segmenten."), { statusCode: 409, code: "PRODUCTION_DECORATION_CARDINALITY_MISMATCH" });
    const item = order.items.find(({ id }) => id === ordered[0].itemId);
    if (!item || ordered.some(({ itemId, quantity }) => itemId !== item.id || quantity !== ordered[0].quantity)) throw Object.assign(new Error("Samengestelde initialen missen een eenduidige bronregel."), { statusCode: 409, code: "PRODUCTION_DECORATION_IDENTITY_MISSING" });
    const value = `${ordered[0].content}${ordered[2].content}`;
    const key = JSON.stringify([item.id, item.articleNumber, "initials", value]);
    actual.set(key, Number(actual.get(key) ?? 0) + Number(ordered[0].quantity));
  }
  const keys = new Set([...expected.keys(), ...actual.keys()]);
  for (const key of keys) if (Number(expected.get(key) ?? 0) !== Number(actual.get(key) ?? 0)) throw Object.assign(new Error("De productie-output komt niet exact één-op-één overeen met de bronvereisten."), { statusCode: 409, code: "PRODUCTION_DECORATION_CARDINALITY_MISMATCH", identity: JSON.parse(key), expected: Number(expected.get(key) ?? 0), actual: Number(actual.get(key) ?? 0) });
}

function assertPioneersNumberSource(state, order, line) {
  const item = order?.items?.find(({ id }) => id === line.itemId);
  if (item?.association !== PIONEERS_ASSOCIATION || line.type !== "NUMBER") return;
  const canonicalName = pioneersCanonicalFontName(state);
  if (!canonicalName) throw Object.assign(new Error("De gecontroleerde digitale Pioneers-nummerbron ontbreekt; productie blijft op REVIEW."), { statusCode: 409, code: "PIONEERS_NUMBER_SOURCE_REVIEW_REQUIRED" });
  if (line.source?.kind === "PRODUCTION_SOURCE") {
    const source = productionSourceByIdentity(line.source.id, line.source.version);
    const seniorBackNumber = line.personalizationField === "backNumber" && Number(line.heightMm) === 200;
    if (source && seniorBackNumber && source.sourceSetId === PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID) return;
  }
  if (line.source?.kind === "PRODUCTION_ELEMENT") {
    const linked = associationNumberSet(state, PIONEERS_ASSOCIATION, { field: line.personalizationField, profileId: line.decorationIdentity?.productionProfileId ?? item.productionProfileId, requestedHeightMm: line.heightMm });
    if (!linked.ambiguous && linked.asset?.id === line.source.id && linked.variant?.id === line.source.variantId && (linked.asset.version ?? String(linked.asset.revision)) === line.source.version) return;
  }
  if (line.source?.kind === "FONT") {
    const font = state.productionFonts.find(({ id, version, sha256: hash, status }) => id === line.source.id && version === line.source.version && hash === line.source.sha256 && status === "TECHNICALLY_VALID");
    const profile = state.productionProfiles.find(({ id }) => id === line.decorationIdentity?.productionProfileId);
    if (font && profile && productionFontAssociationDecision({ fonts: state.productionFonts, profile, application: line.personalizationField || "FREE_PRINT", selectedSourceId: font.id }).allowed) return;
  }
  throw Object.assign(new Error(`${line.preview?.label ?? line.content}: gekoppelde bron wijkt af van de gecontroleerde Pioneers-bron “${canonicalName}”; productie blijft op REVIEW.`), { statusCode: 409, code: "PIONEERS_NUMBER_SOURCE_MISMATCH" });
}

function productionNumberAssignmentKey(heightMm) {
  return Number(heightMm) > 0 ? `HEIGHT_${Number(heightMm).toFixed(2)}` : "DEFAULT";
}

function assignedProductionNumberAssetId(state, profile, field, requestedHeightMm) {
  const heightAssignment = field ? profile?.productionNumberAssetAssignmentsByHeight?.[field]?.[productionNumberAssignmentKey(requestedHeightMm)] ?? null : null;
  if (heightAssignment) return String(heightAssignment);
  const assignment = field ? profile?.productionNumberAssetAssignments?.[field] : null;
  if (!assignment || typeof assignment !== "string") return null;
  if (!(Number(requestedHeightMm) > 0)) return String(assignment);
  const asset = state.productionElements?.find(({ id }) => id === assignment);
  return asset?.variants?.some(({ heightMm }) => Math.abs(Number(heightMm) - Number(requestedHeightMm)) <= 0.01) ? String(assignment) : null;
}

function assignedProductionNumberAssetEvidence(profile, field, requestedHeightMm) {
  return field ? profile?.productionNumberAssetAssignmentEvidenceByHeight?.[field]?.[productionNumberAssignmentKey(requestedHeightMm)] ?? profile?.productionNumberAssetAssignmentEvidence?.[field] ?? null : null;
}

function assignProductionNumberAsset(profile, field, targetHeightMm, asset, sourceHeightMm = targetHeightMm) {
  const assetId = asset.id;
  const key = productionNumberAssignmentKey(targetHeightMm);
  profile.productionNumberAssetAssignmentsByHeight = {
    ...(profile.productionNumberAssetAssignmentsByHeight ?? {}),
    [field]: { ...(profile.productionNumberAssetAssignmentsByHeight?.[field] ?? {}), [key]: assetId },
  };
  profile.productionNumberAssetAssignments = { ...(profile.productionNumberAssetAssignments ?? {}), [field]: assetId };
  const evidenceBody = {
    assetId,
    assetVersion: asset.version ?? String(asset.revision),
    sourceGeometryHash: asset.sourceSelection?.geometryHash ?? null,
    targetHeightMm: Number(targetHeightMm),
    sourceHeightMm: Number(sourceHeightMm),
    authority: "HUMAN_ACCEPTANCE",
  };
  profile.productionNumberAssetAssignmentEvidenceByHeight = {
    ...(profile.productionNumberAssetAssignmentEvidenceByHeight ?? {}),
    [field]: { ...(profile.productionNumberAssetAssignmentEvidenceByHeight?.[field] ?? {}), [key]: { ...evidenceBody, assignmentHash: sha256(JSON.stringify(evidenceBody)) } },
  };
  profile.productionNumberAssetAssignmentEvidence = { ...(profile.productionNumberAssetAssignmentEvidence ?? {}), [field]: { ...evidenceBody, assignmentHash: sha256(JSON.stringify(evidenceBody)) } };
}

function associationNumberSet(state, associationName, { field = null, profileId = null, requestedHeightMm = null } = {}) {
  const association = state.associations.find(({ id, name }) => id === associationName || name === associationName);
  if (!association) return { association: null, asset: null, ambiguous: false };
  const placementMatchesField = (placement) => {
    const normalized = normalizedProductionIdentity(placement);
    if (field === "backNumber") return normalized.includes("rug");
    if (field === "shortsNumber") return normalized.includes("short") || normalized.includes("rok");
    if (field === "chestNumber") return normalized.includes("borst");
    return true;
  };
  const profile = profileId ? state.productionProfiles?.find(({ id }) => id === profileId) : null;
  const linkedAssetIds = new Set(profile?.productionNumberAssetIds ?? []);
  const assignedAssetId = assignedProductionNumberAssetId(state, profile, field, requestedHeightMm);
  const assignedEvidence = assignedProductionNumberAssetEvidence(profile, field, requestedHeightMm);
  const matches = state.productionElements.filter((element) => element.lifecycleStatus === "PRODUCTION_READY"
    && element.productionMethod === "SELF_PRODUCED"
    && element.applications?.some(({ kind, placement }) => kind === "NUMBER_SET" && placementMatchesField(placement))
    && Object.keys(element.numberGlyphs ?? {}).length === 10
    && Array.from({ length: 10 }, (_, digit) => String(digit)).every((digit) => element.numberGlyphs?.[digit])
    && element.contexts?.some(({ type, id, label }) => type === "ASSOCIATION" && (id === association.id || label === association.name)));
  // A managed profile is the authority for number-source applicability. An
  // association-scoped asset that is not linked to that exact profile must not
  // silently outrank the canonical set merely because it exists.
  const profileMatches = profileId ? matches.filter(({ id }) => linkedAssetIds.has(id) || id === assignedAssetId) : matches;
  const assignedMatches = assignedAssetId ? profileMatches.filter(({ id }) => id === assignedAssetId) : [];
  const assignedHasExactHeight = Number(requestedHeightMm) > 0 && assignedMatches.some((element) => element.variants?.some(({ heightMm }) => Math.abs(Number(heightMm) - Number(requestedHeightMm)) <= 0.01));
  const assignedHasExplicitTargetAuthority = Boolean(assignedEvidence
    && assignedEvidence.authority === "HUMAN_ACCEPTANCE"
    && Math.abs(Number(assignedEvidence.targetHeightMm) - Number(requestedHeightMm)) <= 0.01);
  const linkedMatches = assignedHasExactHeight || assignedHasExplicitTargetAuthority ? assignedMatches : profileMatches;
  const exactHeightMatches = Number(requestedHeightMm) > 0
    ? linkedMatches.filter((element) => element.variants?.some(({ heightMm }) => Math.abs(Number(heightMm) - Number(requestedHeightMm)) <= 0.01))
    : linkedMatches;
  // A fixed glyphmaster is only applicable to its proven physical class. One
  // assignment must never silently override Junior/Senior or another height.
  const preferred = Number(requestedHeightMm) > 0
    ? exactHeightMatches.length ? exactHeightMatches : assignedHasExplicitTargetAuthority ? assignedMatches : []
    : linkedMatches.length === 1 ? linkedMatches : [];
  const asset = preferred.length === 1 ? preferred[0] : null;
  const variant = asset?.variants?.find(({ heightMm }) => Number(requestedHeightMm) > 0 && Math.abs(Number(heightMm) - Number(requestedHeightMm)) <= 0.01)
    // A NUMBER_SET intentionally derives its width from the selected glyphs.
    // Therefore widthMm=0 is valid source truth when one explicitly accepted
    // glyphmaster is proportionally assigned to another physical height.
    ?? (assignedHasExplicitTargetAuthority || !(Number(requestedHeightMm) > 0) ? asset?.variants?.find(({ heightMm }) => Number(heightMm) > 0) : null)
    ?? null;
  return { association, asset, variant, ambiguous: preferred.length > 1 || (!exactHeightMatches.length && linkedMatches.length > 1) || Boolean(asset && !variant) };
}

function profileFieldPhysicalHeightMm(association, profile, field, variant = null) {
  if (field === "initialsInfix") return Number(profile?.initialsInfixRule?.heightMm) || 0;
  if (field === "backNumber") {
    const explicit = Number(variant?.backNumberProduction?.physicalHeightMm);
    if (explicit > 0) return explicit;
    const sizeClass = variant?.backNumberProduction?.sizeClass;
    const configured = Number(profile?.backNumberSizeClasses?.[sizeClass]?.physicalHeightMm);
    if (configured > 0) return configured;
  }
  const dimensionKey = field === "initials" ? "initialsShirt" : field === "name" ? "nameHeight" : field === "chestNumber" ? "chestNumber" : field === "shortsNumber" ? "shortsNumber" : null;
  const associationHeight = dimensionKey ? Number(association?.dimensionsCm?.[dimensionKey]) * 10 : 0;
  if (associationHeight > 0) return associationHeight;
  if ((profile?.supports ?? []).length === 1 && profile.supports[0] === field) {
    const singleValue = Number(String(profile?.sizeLabel ?? "").match(/([\d,.]+)\s*cm/iu)?.[1]?.replace(",", ".")) * 10;
    if (singleValue > 0) return singleValue;
  }
  return 0;
}

/**
 * Compatibility assurance needs one real physical Product Truth size without
 * silently choosing a size for an actual order. Runtime order validation keeps
 * using profileFieldPhysicalHeightMm with its exact variant; this helper is
 * only the deterministic representative size for generated source proof.
 */
export function representativeProductionApplicationHeightMm(association, profile, field) {
  if (field === "backNumber") {
    const senior = Number(profile?.backNumberSizeClasses?.SENIOR?.physicalHeightMm)
      || Number(association?.dimensionsCm?.backNumberSenior) * 10;
    if (senior > 0) return senior;
    const validated = Object.values(profile?.backNumberSizeClasses ?? {})
      .filter(({ status }) => status !== "DATA_GAP")
      .map(({ physicalHeightMm }) => Number(physicalHeightMm))
      .filter((height) => height > 0)
      .sort((left, right) => right - left);
    return validated[0] ?? 0;
  }
  return profileFieldPhysicalHeightMm(association, profile, field);
}

function validateProductionLines(value, state, user, orderKind, options = {}) {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) return [];
  if (!Array.isArray(value) || value.length > 100) throw Object.assign(new Error("Gebruik maximaal 100 productieregels."), { statusCode: 400, code: "PRODUCTION_LINES_INVALID" });
  const validated = value.map((line, index) => {
    const type = allowedValue(line.type, [...PRODUCTION_LINE_TYPES], "Productieregeltype");
    const personalizationField = line.personalizationField === undefined ? null : allowedValue(line.personalizationField, PERSONALIZATION_FIELDS, "Bedrukkingstype");
    if (user.role === "store" && orderKind !== "TEAM" && ["LOGO", "PRODUCTION_ELEMENT"].includes(type)) throw Object.assign(new Error("Logo's en beeldmerken zijn alleen beschikbaar in Teamorder/Productie."), { statusCode: 403, code: "STORE_LOGO_FORBIDDEN" });
    const content = normalizeProductionContent(type, requiredText(line.content, "Inhoud", 160), line.placementRole);
    if (type === "NUMBER" && !/^\d{1,4}$/u.test(content)) throw Object.assign(new Error("Een nummerregel bevat alleen 1 tot 4 cijfers."), { statusCode: 400, code: "PRODUCTION_NUMBER_INVALID" });
    if (type === "INITIALS" && content.length > 12) throw Object.assign(new Error("Initialen bevatten maximaal 12 tekens."), { statusCode: 400, code: "PRODUCTION_INITIALS_INVALID" });
    const requestedTeamkitContext = options.allowTeamkitDataGaps === true ? line.teamkitProductionContext : null;
    const teamkitProductionContext = requestedTeamkitContext ? {
      proposalPlacementId: requiredText(requestedTeamkitContext.proposalPlacementId, "Teamkit-placement", 180),
      side: allowedValue(requestedTeamkitContext.side, ["FRONT", "BACK"], "Teamkit-zijde"),
      preset: allowedValue(requestedTeamkitContext.preset, ["BACK_UPPER", "BACK_LOWER", "FRONT_CENTER_LARGE", "CHEST_LEFT", "CHEST_RIGHT", "SLEEVE_LEFT", "SLEEVE_RIGHT", "LEFT", "RIGHT", "FREE_PLACEMENT", "LINKERBORST", "RECHTERBORST", "MIDDENBORST", "RUG_BOVEN", "RUG_MIDDEN", "MOUW_LINKS", "MOUW_RECHTS", "SHORT_LINKS", "SHORT_RECHTS", "BROEK", "TAS"], "Teamkit-positie"),
      articleId: optional(requestedTeamkitContext.articleId, 180) || null,
      associationName: optional(requestedTeamkitContext.associationName, 180) || null,
      profileId: optional(requestedTeamkitContext.profileId, 180) || null,
      profileRevision: Number.isInteger(requestedTeamkitContext.profileRevision) ? requestedTeamkitContext.profileRevision : null,
      fontProfile: optional(requestedTeamkitContext.fontProfile, 180) || null,
      sizeLabel: optional(requestedTeamkitContext.sizeLabel, 180) || null,
      mirror: typeof requestedTeamkitContext.mirror === "boolean" ? requestedTeamkitContext.mirror : null,
      productionGroupId: optional(requestedTeamkitContext.productionGroupId, 180) || null,
      productionSizeClass: optional(requestedTeamkitContext.productionSizeClass, 40) || null,
      materializationGroups: Array.isArray(requestedTeamkitContext.materializationGroups) ? requestedTeamkitContext.materializationGroups.map((value) => requiredText(value, "Teamkit-materialisatiegroep", 180)) : [],
      approvedProductionRuleHash: optional(requestedTeamkitContext.approvedProductionRuleHash, 128) || null,
      approvedProductionIntentHash: optional(requestedTeamkitContext.approvedProductionIntentHash, 128) || null,
      currentProductionRuleHash: optional(requestedTeamkitContext.currentProductionRuleHash, 128) || null,
      currentProductionIntentHash: optional(requestedTeamkitContext.currentProductionIntentHash, 128) || null,
      measurementSource: allowedValue(requestedTeamkitContext.measurementSource, ["PRODUCTION_PROFILE", "PRODUCTION_ASSET", "EXPLICIT_PROPOSAL_OVERRIDE", "DATA_GAP"], "Teamkit-maatbron"),
      measurementEvidence: requiredText(requestedTeamkitContext.measurementEvidence, "Teamkit-maatbewijs", 500),
      explicitOverride: requestedTeamkitContext.explicitOverride ? { widthMm: Number(requestedTeamkitContext.explicitOverride.widthMm), heightMm: Number(requestedTeamkitContext.explicitOverride.heightMm), aspectRatioLocked: true } : null,
    } : undefined;
    const requestedIdentity = line.decorationIdentity;
    const decorationIdentity = requestedIdentity ? {
      orderId: requiredText(requestedIdentity.orderId, "Productie-identiteit order", 180),
      itemId: requiredText(requestedIdentity.itemId, "Productie-identiteit artikel", 180),
      articleNumber: requiredText(requestedIdentity.articleNumber, "Productie-identiteit artikelnummer", 180),
      decorationType: requiredText(requestedIdentity.decorationType, "Productie-identiteit soort", 80),
      placement: requiredText(requestedIdentity.placement, "Productie-identiteit plaatsing", 80),
      value: requiredText(requestedIdentity.value, "Productie-identiteit waarde", 160),
      foilColor: requiredText(requestedIdentity.foilColor, "Productie-identiteit foliekleur", 80),
      productionProfileId: requiredText(requestedIdentity.productionProfileId, "Productie-identiteit profiel", 180),
      assetId: optional(requestedIdentity.assetId, 180) || null,
      assetVersion: optional(requestedIdentity.assetVersion, 180) || null,
      targetGroup: optional(requestedIdentity.targetGroup, 500) || null,
    } : undefined;
    const requestedDataGapFields = Array.isArray(line.dataGap?.fields) ? [...new Set(line.dataGap.fields)] : [];
    if (options.allowTeamkitDataGaps === true && requestedDataGapFields.length) {
      if (requestedDataGapFields.some((field) => !["SOURCE", "DIMENSIONS", "FOIL_COLOR", "APPROVED_RULE", "APPROVED_RULE_DRIFT"].includes(field))) throw Object.assign(new Error("Ongeldige Teamkit DATA_GAP."), { statusCode: 400, code: "TEAMKIT_PRODUCTION_DATA_GAP_INVALID" });
      const widthMm = Number(line.widthMm) || 0; const heightMm = Number(line.heightMm) || 0; const quantity = Number(line.quantity);
      if (widthMm < 0 || heightMm < 0 || widthMm > 1000 || heightMm > 1000 || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw Object.assign(new Error("Ongeldige geblokkeerde Teamkit-productieregel."), { statusCode: 400, code: "TEAMKIT_PRODUCTION_DATA_GAP_INVALID" });
      const reason = requiredText(line.dataGap.reason, "Reden ontbrekende productiegegevens", 500);
      return {
        id: String(line.id ?? "").trim() || `teamkit-data-gap-${index + 1}-${randomBytes(5).toString("hex")}`,
        type,
        content,
        source: { kind: "PROFILE", id: optional(line.sourceId, 180) || "teamkit-production-data-gap", version: optional(line.sourceVersion, 120) || "unresolved", ...(optional(line.sourceSha256, 128) ? { sha256: optional(line.sourceSha256, 128) } : {}) },
        widthMm: Math.round(widthMm * 1000) / 1000,
        heightMm: Math.round(heightMm * 1000) / 1000,
        ...(optional(line.foilColor, 80) ? { foilColor: optional(line.foilColor, 80) } : {}),
        quantity,
        preview: { kind: "PROFILE_REFERENCE", label: optional(line.previewLabel, 160) || content, aspectRatioLocked: ["LOGO", "PRODUCTION_ELEMENT"].includes(type) },
        provenance: requiredText(line.provenance, "Teamkit-herkomst", 500),
        proofStatus: "DATA_GAP",
        validation: { status: "BLOCKED", reason },
        dataGap: { status: "DATA_GAP", fields: requestedDataGapFields, reason },
        ...(personalizationField ? { personalizationField } : {}),
        ...(decorationIdentity ? { decorationIdentity } : {}),
        ...(teamkitProductionContext ? { teamkitProductionContext } : {}),
      };
    }
    const initialsInfix = ["INITIALS_FIRST", "INITIALS_INFIX", "INITIALS_LAST"].includes(line.placementRole);
    const numberAsset = type === "NUMBER" ? state.productionElements.find((asset) => asset.id === line.sourceId && executableProductionAssetDecision(asset).allowed && asset.applications?.some(({ kind }) => kind === "NUMBER_SET")) : null;
    const numberVariant = numberAsset?.variants.find(({ widthMm: variantWidth, heightMm: variantHeight }) => Number(variantHeight) > 0 && (Number(variantWidth) > 0 || numberAsset.sizePolicy?.widthDerived === true));
    if (numberAsset && (!numberVariant || Array.from(content).some((digit) => !numberAsset.numberGlyphs?.[digit]))) throw Object.assign(new Error("De nummerbron bevat niet alle gevraagde cijfers."), { statusCode: 400, code: "PRODUCTION_ASSET_GLYPH_MISSING" });
    const requestedWidthMm = Number(line.widthMm); const heightMm = Number(line.heightMm); const quantity = Number(line.quantity);
    const widthMm = numberAsset?.sizePolicy?.widthDerived === true
      ? Array.from(content).reduce((sum, digit) => { const glyph = numberAsset.numberGlyphs[digit]; return sum + glyph.widthUnits / glyph.heightUnits * heightMm; }, Math.max(0, content.length - 1) * NUMBER_GLYPH_SPACING_MM)
      : requestedWidthMm;
    if ((!initialsInfix && (!(widthMm >= 1 && widthMm <= 1000) || !(heightMm >= 1 && heightMm <= 1000))) || (initialsInfix && (!(widthMm >= 0 && widthMm <= 1000) || !(heightMm >= 0 && heightMm <= 1000))) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw Object.assign(new Error("Afmetingen moeten geldig zijn en aantal 1â€“999."), { statusCode: 400, code: "PRODUCTION_LINE_DIMENSIONS_INVALID" });
    let source; let proofStatus = "CONFIGURED"; let validation = { status: "VALID", reason: null };
    if (["TEXT", "INITIALS", "NUMBER"].includes(type)) {
      if (numberAsset) {
        source = { kind: "PRODUCTION_ELEMENT", id: numberAsset.id, version: numberAsset.version ?? String(numberAsset.revision), variantId: numberVariant.id };
        proofStatus = productionElementProof(numberAsset);
      }
      const font = state.productionFonts.find(({ id }) => id === line.sourceId);
      const profile = state.productionProfiles.find(({ id }) => id === line.sourceId);
      const boundProfile = state.productionProfiles.find(({ id }) => id === line.decorationIdentity?.productionProfileId);
      const fontDecision = boundProfile
        ? productionFontAssociationDecision({ fonts: state.productionFonts, profile: boundProfile, application: line.personalizationField || "FREE_PRINT", selectedSourceId: font?.id ?? line.sourceId })
        : productionFontExecutableDecision(font, line.personalizationField || "FREE_PRINT");
      if (source) { /* Nummerbron is al exact resolveerbaar. */ }
      else if (fontDecision.allowed && font && (user.role !== "store" || font.allowedInStore)) source = { kind: "FONT", id: font.id, version: font.version, sha256: font.sha256 };
      else if (user.role !== "store" && profile) {
        const configuredFont = configuredManagedFont(state, profile);
        source = configuredFont ? { kind: "FONT", id: configuredFont.id, version: configuredFont.version, sha256: configuredFont.sha256 } : { kind: "PROFILE", id: profile.id, version: String(profile.revision ?? 1) };
      }
      else throw Object.assign(new Error("Kies een toegestane, technisch geldige fontbron."), { statusCode: 400, code: "PRODUCTION_FONT_INVALID" });
    } else {
      const element = state.productionElements.find(({ id }) => id === line.sourceId || line.elementId === id);
      if (!element) throw Object.assign(new Error("Kies een bestaand productie-element."), { statusCode: 400, code: "PRODUCTION_ELEMENT_NOT_FOUND" });
      if (element.productionMethod === "SELF_PRODUCED") {
        const admission = executableProductionAssetDecision(element);
        if (!admission.allowed) throw Object.assign(new Error(admission.reason), { statusCode: 409, code: admission.code });
      } else if (element.sourceId && element.lifecycleStatus !== "PRODUCTION_READY") throw Object.assign(new Error("Deze fysieke transferbron is nog niet menselijk goedgekeurd voor gebruik."), { statusCode: 409, code: "PRODUCTION_ELEMENT_NOT_READY" });
      const dimensionalVariant = element.variants.find(({ widthMm: variantWidth, heightMm: variantHeight }) => Number(variantWidth) > 0 && Number(variantHeight) > 0);
      if (dimensionalVariant && !element.applications?.some(({ kind }) => kind === "NUMBER_SET") && Math.abs((widthMm / heightMm) - (dimensionalVariant.widthMm / dimensionalVariant.heightMm)) > 0.002) throw Object.assign(new Error("De verhouding van een logo-/beeldmerkbron blijft vergrendeld."), { statusCode: 400, code: "LOGO_ASPECT_RATIO_INVALID" });
      const sizePolicy = element.sizePolicy;
      if (sizePolicy?.mode === "FIXED" && Math.abs(widthMm - sizePolicy.defaultWidthMm) > 0.01) throw Object.assign(new Error("Deze productiebron heeft een vaste productiemaat."), { statusCode: 400, code: "PRODUCTION_ASSET_SIZE_FIXED" });
      if (sizePolicy?.mode === "DEFAULT_WITH_LIMITS" && (widthMm < Number(sizePolicy.minWidthMm) || widthMm > Number(sizePolicy.maxWidthMm))) throw Object.assign(new Error(`Kies een breedte tussen ${sizePolicy.minWidthMm} en ${sizePolicy.maxWidthMm} mm.`), { statusCode: 400, code: "PRODUCTION_ASSET_SIZE_OUT_OF_RANGE" });
      proofStatus = productionElementProof(element);
      source = { kind: "PRODUCTION_ELEMENT", id: element.id, version: element.version ?? String(element.revision), variantId: dimensionalVariant?.id ?? null };
      if (element.productionMethod === "PHYSICAL_TRANSFER") validation = { status: "BLOCKED", reason: "Dit beeldmerk wordt als fysieke transfer geleverd en hoort niet in een eigen plotbestand." };
      else if (!["GEOMETRY_VALIDATED", "PHYSICALLY_VALIDATED"].includes(proofStatus)) validation = { status: "BLOCKED", reason: "Een visuele of vectorbron is niet automatisch een gevalideerde snijcontour." };
    }
    let placementRule;
    if (initialsInfix) {
      const profile = state.productionProfiles.find(({ id }) => id === line.sourceId);
      const rule = profile?.initialsInfixRule;
      const expectedIndex = line.placementRole === "INITIALS_FIRST" ? 0 : line.placementRole === "INITIALS_INFIX" ? 1 : 2;
      const compositionId = requiredText(line.placementRule?.compositionId, "Samenstelling initialen", 160);
      const rawCompositeText = requiredText(line.placementRule?.compositeText, "Samengestelde initialen", 160);
      const compositeCharacters = Array.from(rawCompositeText);
      const compositeText = compositeCharacters.length >= 2 ? `${compositeCharacters[0].toLocaleUpperCase("nl-NL")}${compositeCharacters.slice(1, -1).join("").toLocaleLowerCase("nl-NL")}${compositeCharacters.at(-1).toLocaleUpperCase("nl-NL")}` : rawCompositeText.toLocaleUpperCase("nl-NL");
      if (Number(line.placementRule?.segmentIndex) !== expectedIndex) throw Object.assign(new Error("Ongeldige volgorde in samengestelde initialen."), { statusCode: 400, code: "INITIALS_COMPOSITION_INVALID" });
      placementRule = { compositionId, compositeText, segmentIndex: expectedIndex, segmentCount: 3, alignment: "CENTER", horizontalSpacingMm: rule?.horizontalSpacingMm ?? null, baselineOffsetMm: rule?.baselineOffsetMm ?? null, profileRevision: profile?.revision ?? 1, ruleRevision: rule?.revision ?? 1 };
      validation = { status: "BLOCKED", reason: "De samengestelde initialenopmaak heeft nog geen gecontroleerde uitvoerbare productiebron." };
    }
    const defaults = state.settings.productionDefaults ?? PILOT_SETTINGS.productionDefaults;
    const maximumObjectWidthMm = defaults.maxSafeTrackWidthMm;
    if (!productionObjectFitsTrack({ widthMm, heightMm, maximumTrackWidthMm: maximumObjectWidthMm, allowedRotations: [0, 90] })) validation = { status: "BLOCKED", reason: `De opdruk past ook na veilige rotatie niet binnen ${defaults.workingWidthMm} mm werkbreedte met ${defaults.edgeMarginMm} mm randafstand.` };
    const requestedFoilColor = String(line.foilColor ?? "").trim();
    const canonicalFoilColor = requestedFoilColor ? managedFoilColor(state, requestedFoilColor) : null;
    if (requestedFoilColor && !canonicalFoilColor) throw Object.assign(new Error("Kies een actieve beheerde foliekleur."), { statusCode: 400, code: "PRODUCTION_LINE_FOIL_COLOR_INVALID" });
    return {
      id: String(line.id ?? "").trim() || `production-line-${index + 1}-${randomBytes(5).toString("hex")}`,
      type,
      content,
      source,
      widthMm: Math.round(widthMm * 1000) / 1000,
      heightMm: Math.round(heightMm * 1000) / 1000,
      quantity,
      ...(canonicalFoilColor ? { foilColor: canonicalFoilColor } : {}),
      ...(personalizationField ? { personalizationField } : {}),
      ...(decorationIdentity ? { decorationIdentity } : {}),
      preview: { kind: source.kind === "FONT" ? "LIVE_FONT" : "ASSET_REFERENCE", label: optional(line.previewLabel, 160) || content, aspectRatioLocked: ["LOGO", "PRODUCTION_ELEMENT"].includes(type) },
      provenance: optional(line.provenance, 500) || `${orderKind} · handmatig vastgelegd in Workspace`,
      proofStatus,
      validation,
      ...(teamkitProductionContext ? { teamkitProductionContext } : {}),
      ...(initialsInfix ? { placementRole: line.placementRole, placementRule } : {}),
    };
  });
  const compositions = new Map();
  for (const line of validated) if (line.placementRule?.compositionId) compositions.set(line.placementRule.compositionId, [...(compositions.get(line.placementRule.compositionId) ?? []), line]);
  for (const [compositionId, lines] of compositions) {
    const ordered = [...lines].sort((a, b) => a.placementRule.segmentIndex - b.placementRule.segmentIndex);
    const roles = ordered.map(({ placementRole }) => placementRole).join(",");
    const rendered = ordered.map(({ content }) => content).join("");
    if (ordered.length !== 3 || roles !== "INITIALS_FIRST,INITIALS_INFIX,INITIALS_LAST" || ordered.some(({ placementRule }) => placementRule.compositionId !== compositionId || placementRule.compositeText !== rendered) || new Set(ordered.map(({ quantity }) => quantity)).size !== 1 || new Set(ordered.map(({ source }) => `${source.kind}:${source.id}:${source.version}`)).size !== 1) throw Object.assign(new Error("Samengestelde initialen moeten als één complete, geordende bedrukking worden opgeslagen."), { statusCode: 400, code: "INITIALS_COMPOSITION_INVALID" });
  }
  return validated;
}

export function resolveCanonicalProductionLines(state, orderId, items) {
  const raw = [];
  for (const item of items) {
    const baseProfile = state.productionProfiles.find(({ id }) => id === item.productionProfileId);
    for (const variant of item.variants ?? []) {
      const values = variant.personalizationValues ?? {};
      const initials = normalizeProductionContent("INITIALS", values.initials);
      const initialsInfix = normalizeProductionContent("TEXT", values.initialsInfix, "INITIALS_INFIX");
      if (initialsInfix) {
        const characters = Array.from(initials);
        if (characters.length !== 2) throw new Error("Samengestelde initialen vereisen exact twee initialen.");
        const rule = baseProfile?.initialsInfixRule;
        const compositeText = `${characters[0]}${initialsInfix}${characters[1]}`;
        const compositionId = `${orderId}:${item.id}:${variant.id}:initials-composite`;
        const ruleComplete = rule?.active && Number(rule.heightMm) > 0 && rule.status !== "DATA_GAP";
        const reason = ruleComplete
          ? `De gecontroleerde uitvoerbare bron voor samengestelde initialen in ${baseProfile?.name ?? "dit profiel"} is nog niet gekoppeld.`
          : "De canonieke 20 mm-maat voor het tussenvoegsel ontbreekt.";
        const placementSnapshot = { compositionId, compositeText, segmentCount: 3, alignment: "CENTER", horizontalSpacingMm: rule?.horizontalSpacingMm ?? null, baselineOffsetMm: rule?.baselineOffsetMm ?? null, profileRevision: baseProfile?.revision ?? 1, ruleRevision: rule?.revision ?? 1 };
        const segments = [
          { role: "INITIALS_FIRST", content: characters[0], type: "INITIALS", segmentIndex: 0, heightMm: 0 },
          { role: "INITIALS_INFIX", content: initialsInfix, type: "TEXT", segmentIndex: 1, heightMm: ruleComplete ? Number(rule.heightMm) : 0 },
          { role: "INITIALS_LAST", content: characters[1], type: "INITIALS", segmentIndex: 2, heightMm: 0 },
        ];
        for (const segment of segments) raw.push({
          id: `catalog-line-${randomBytes(6).toString("hex")}`,
          orderId, itemId: item.id, variantId: variant.id,
          type: segment.type,
          content: segment.content,
          source: { kind: "PROFILE", id: baseProfile?.id ?? "profile-data-gap", version: String(baseProfile?.revision ?? 1) },
          widthMm: 0,
          heightMm: segment.heightMm,
          quantity: variant.quantity,
          preview: { kind: "PROFILE_REFERENCE", label: `Samengestelde initialen ${compositeText} · ${segment.segmentIndex + 1}/3`, aspectRatioLocked: false },
          provenance: `${item.sourceProvenance} · ${baseProfile?.name ?? "profiel ontbreekt"} · exemplaar ${variant.id} · samengestelde initialen`,
          proofStatus: "DATA_GAP",
          validation: { status: "BLOCKED", reason },
          placementRole: segment.role,
          placementRule: { ...placementSnapshot, segmentIndex: segment.segmentIndex },
        });
      }
      for (const field of [...PERSONALIZATION_FIELDS, "initialsInfix"]) {
        const canonicalField = field === "initialsInfix" ? "initials" : field;
        const { productionField: productionProfileField, profile: resolvedProfile } = canonicalProductionProfileForDecoration(state, item, canonicalField);
        const usesInitialsProfileForChestNumber = field === "chestNumber" && productionProfileField === "initials";
        const fieldProfileId = `profile-source-${profileSlug(item.association)}-${productionProfileField}`;
        const profile = resolvedProfile ?? baseProfile;
        if (initialsInfix && (field === "initials" || field === "initialsInfix")) continue;
        const isNumber = field === "backNumber" || field === "chestNumber" || field === "shortsNumber";
        const lineType = isNumber ? "NUMBER" : field === "initials" ? "INITIALS" : "TEXT";
        const content = normalizeProductionContent(lineType, values[field], field === "initialsInfix" ? "INITIALS_INFIX" : null);
        if (!content) continue;
        const infixRule = field === "initialsInfix" ? profile?.initialsInfixRule : null;
        const association = state.associations.find(({ id, name }) => id === item.association || name === item.association);
        const configuredHeight = profileFieldPhysicalHeightMm(association, profile, field, variant);
        const configuredNumberHeightMissing = field === "chestNumber" && !usesInitialsProfileForChestNumber && !(configuredHeight > 0);
        const requestedHeightMm = configuredHeight > 0 ? configuredHeight : field === "initialsInfix" || configuredNumberHeightMissing ? 0 : 30;
        const linkedNumberSet = isNumber && !usesInitialsProfileForChestNumber ? associationNumberSet(state, item.association, { field, profileId: profile?.id, requestedHeightMm }) : { association: null, asset: null, ambiguous: false };
        const applicationSourceSetId = profileSourceSetAppliesToField(profile, field) ? profile.productionSourceSetId : null;
        const versionedSource = linkedNumberSet.asset ? null : resolveProductionSource({
          sourceSetId: applicationSourceSetId,
          outputWriterId: profile?.outputWriterId,
          lineType,
          content,
          physicalHeightMm: requestedHeightMm,
        });
        const managedFont = versionedSource || linkedNumberSet.asset ? null : configuredManagedFont(state, profile);
        const heightMm = versionedSource?.heightMm ?? requestedHeightMm;
        const widthMm = versionedSource?.widthMm ?? (field === "initialsInfix" && !configuredHeight ? 0 : Math.round(Math.max(20, heightMm * Math.max(.5, content.length * .48)) * 1000) / 1000);
        const reason = linkedNumberSet.ambiguous
          ? `Meerdere productierijpe SVG-nummersets zijn aan ${item.association} gekoppeld; kies eerst één authoritative versie.`
          : configuredNumberHeightMissing
          ? `Borstnummer is toegestaan, maar de fysieke borstnummermaat ontbreekt nog in het bestaande profiel voor ${item.association}.`
          : field === "initialsInfix" && (!infixRule?.active || !infixRule.heightMm || infixRule.status === "DATA_GAP")
            ? "De canonieke 20 mm-maat voor het tussenvoegsel ontbreekt."
          : linkedNumberSet.asset || versionedSource || managedFont
          ? null
          : applicationSourceSetId
            ? `In productiebronset ${applicationSourceSetId} bestaat geen gevalideerde ${lineType.toLowerCase()}bron voor “${content}” op ${requestedHeightMm} mm.`
            : `De bevestigde productiebron voor ${profile?.fontProfile ?? "dit profiel"} is niet als lokaal contour/fontbestand gekoppeld.`;
        raw.push({
          id: `catalog-line-${randomBytes(6).toString("hex")}`,
          orderId, itemId: item.id, variantId: variant.id,
          type: lineType,
          personalizationField: field,
          decorationIdentity: { orderId, itemId: item.id, articleNumber: item.articleNumber, decorationType: field, placement: field, value: content, foilColor: item.foilColor, productionProfileId: profile?.id ?? item.productionProfileId, occurrenceId: variant.id, targetGroup: field === "backNumber" ? String(values.backNumberSizeClass ?? variant.backNumberProduction?.sizeClass ?? "").trim().toUpperCase() || null : null },
          content,
          source: linkedNumberSet.asset ? { kind: "PRODUCTION_ELEMENT", id: linkedNumberSet.asset.id, version: linkedNumberSet.asset.version ?? String(linkedNumberSet.asset.revision), variantId: linkedNumberSet.variant?.id ?? null } : versionedSource ? {
            kind: "PRODUCTION_SOURCE",
            id: versionedSource.id,
            version: versionedSource.version,
            sourceSetId: versionedSource.sourceSetId,
            geometryAdapterId: versionedSource.geometryAdapterId,
            geometryAdapterVersion: versionedSource.geometryAdapterVersion,
            outputWriterId: versionedSource.outputWriterId,
            outputWriterVersion: versionedSource.outputWriterVersion,
          } : managedFont ? { kind: "FONT", id: managedFont.id, version: managedFont.version, sha256: managedFont.sha256 } : { kind: "PROFILE", id: profile?.id ?? "profile-data-gap", version: String(profile?.revision ?? 1) },
          widthMm: Math.round(widthMm * 1000) / 1000,
          heightMm: Math.round(heightMm * 1000) / 1000,
          quantity: variant.quantity,
          preview: { kind: linkedNumberSet.asset || versionedSource ? "ASSET_REFERENCE" : managedFont ? "LIVE_FONT" : "PROFILE_REFERENCE", label: `${field === "backNumber" ? "Rugnummer" : field === "chestNumber" ? "Borstnummer" : field === "shortsNumber" ? "Shortnummer" : field === "initials" ? "Initialen" : field === "initialsInfix" ? "Tussenvoegsel" : "Naam"} ${content}`, aspectRatioLocked: Boolean(linkedNumberSet.asset || versionedSource) },
          provenance: `${item.sourceProvenance} · ${profile?.name ?? "profiel ontbreekt"} · exemplaar ${variant.id}${linkedNumberSet.asset ? ` · gekoppelde SVG-nummerset ${linkedNumberSet.asset.id}@${linkedNumberSet.asset.version}` : ""}`,
          proofStatus: linkedNumberSet.asset ? productionElementProof(linkedNumberSet.asset) : versionedSource?.sourceProofStatus ?? (managedFont ? "CONFIGURED" : "DATA_GAP"),
          validation: { status: !linkedNumberSet.ambiguous && !configuredNumberHeightMissing && (linkedNumberSet.asset || versionedSource || managedFont || field === "initialsInfix" && !reason) ? "VALID" : "BLOCKED", reason },
          ...(naambalkApplicationContext(values, field) ? { applicationContext: naambalkApplicationContext(values, field) } : {}),
          ...(field === "initialsInfix" ? { placementRule: { alignment: infixRule?.alignment ?? "CENTER", horizontalSpacingMm: infixRule?.horizontalSpacingMm ?? null, baselineOffsetMm: infixRule?.baselineOffsetMm ?? null, profileRevision: profile?.revision ?? 1, ruleRevision: infixRule?.revision ?? 1 } } : {}),
        });
      }
    }
  }
  const grouped = new Map();
  for (const line of raw) {
    const key = JSON.stringify([line.orderId, line.itemId, line.decorationIdentity?.articleNumber ?? null, line.type, line.personalizationField ?? null, line.decorationIdentity?.placement ?? null, line.content, line.decorationIdentity?.foilColor ?? null, line.decorationIdentity?.productionProfileId ?? null, line.source.id, line.source.version, line.widthMm, line.heightMm, line.proofStatus, line.validation.status, line.placementRole ?? null, line.placementRule?.compositionId ?? null]);
    const existing = grouped.get(key);
    if (existing) { existing.quantity += line.quantity; existing.variantIds.push(line.variantId); }
    else grouped.set(key, { ...line, variantIds: [line.variantId] });
  }
  return [...grouped.values()];
}

const EXISTING_ORDER_RECONCILIATION_VERSION = "EXISTING_ORDER_CANONICAL_RECONCILIATION_V3";
const FINAL_PRODUCTION_VALIDATOR_VERSION = "SPORTPALEIS_FINAL_PRODUCTION_VALIDATOR_V3";
const PRODUCTION_EXECUTION_SNAPSHOT_VERSION = "SPORTPALEIS_IMMUTABLE_PRODUCTION_EXECUTION_V2";
const CANONICAL_BACK_NUMBER_SIZE_CLASSES = new Set(["JUNIOR", "SENIOR"]);

function stableExistingOrderProductionLines(lines) {
  return [...lines]
    .map((line) => {
      const identity = [
        line.orderId ?? "", line.itemId ?? "", line.variantId ?? "", line.personalizationField ?? line.type,
        line.content, line.foilColor ?? line.decorationIdentity?.foilColor ?? "", line.source?.kind ?? "",
        line.source?.id ?? "", line.source?.version ?? "", Number(line.widthMm), Number(line.heightMm),
        Number(line.quantity), line.placementRole ?? "", line.placementRule?.compositionId ?? "",
      ];
      return { ...line, id: `legacy-canonical-${sha256(JSON.stringify(identity)).slice(0, 24).toLowerCase()}` };
    })
    .sort((left, right) => [left.itemId, left.personalizationField, left.content, left.foilColor, left.id].map(String).join("|").localeCompare([right.itemId, right.personalizationField, right.content, right.foilColor, right.id].map(String).join("|"), "nl"));
}

function existingOrderHistoricalSourceHash(order) {
  return sha256(JSON.stringify({
    id: order.id,
    createdAt: order.createdAt,
    sourceContext: order.sourceContext ?? null,
    association: order.association,
    associations: order.associations ?? [],
    standardPersonalization: order.standardPersonalization ?? null,
    items: (order.items ?? []).map((item) => ({
      id: item.id, articleId: item.articleId ?? null, articleNumber: item.articleNumber ?? null,
      product: item.product, association: item.association ?? null, size: item.size ?? null,
      quantity: item.quantity, personalization: item.personalization, personalizationValues: item.personalizationValues ?? null,
      foilColor: item.foilColor, productionProfileId: item.productionProfileId ?? null,
      sourceType: item.sourceType ?? null, sourceProvenance: item.sourceProvenance ?? null,
      backNumberProduction: item.backNumberProduction ?? null, variants: item.variants ?? [],
    })),
  }));
}

function nonEmptyPersonalization(values = {}) {
  return PERSONALIZATION_FIELDS.some((field) => String(values?.[field] ?? "").trim()) || String(values?.initialsInfix ?? "").trim();
}

function legacyPersonalizationFromText(item, profile) {
  const result = { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "" };
  const evidence = [];
  const unresolved = [];
  const inferred = [];
  const duplicates = [];
  const physicalDimensions = [];
  const text = String(item.personalization ?? "").trim();
  if (!text || /^geen bedrukking$/iu.test(text)) return { values: result, evidence, unresolved, inferred, duplicates, physicalDimensions };
  const productText = String(item.product ?? "");
  if (/\bsenior\b/iu.test(`${productText} ${text}`)) result.backNumberSizeClass = "SENIOR";
  else if (/\bjunior\b/iu.test(`${productText} ${text}`)) result.backNumberSizeClass = "JUNIOR";
  // Split only where the next segment is recognisably a new decoration. This
  // keeps names such as "DE VRIES" intact while making historic "+", "&" and
  // comma-separated combinations lossless instead of greedily absorbing them.
  const decorationStart = "(?:initialen?|init\\.?|rug(?:nummer)?|rugnr\\.?|borst(?:nummer)?|borstnr\\.?|short(?:nummer)?|shortnr\\.?|broeknummer|naam|rugnaam)";
  const parts = text
    .split(new RegExp(`\\s*(?:[·|;\\n]|[+&](?=\\s*${decorationStart}\\b)|,(?=\\s*${decorationStart}\\b))\\s*`, "iu"))
    .map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (/^\d+(?:[.,]\d+)?\s*(?:mm|cm)$/iu.test(part)) {
      const isCentimeters = /cm$/iu.test(part);
      const valueMm = Number(part.replace(/(?:mm|cm)/iu, "").replace(",", ".").trim()) * (isCentimeters ? 10 : 1);
      physicalDimensions.push({ valueMm, raw: part });
      evidence.push(`Historische fysieke-maataanduiding: ${part}`);
      continue;
    }
    const patterns = [
      ["initials", /^(?:initialen?|init\.?)[\s:=-]*(.+)$/iu],
      ["backNumber", /^(?:rug(?:nummer)?|rugnr\.?)[\s:=-]*(\S+?)(?:\s*\((?:Junior|Senior)\))?$/iu],
      ["chestNumber", /^(?:borst(?:nummer)?|borstnr\.?)[\s:=-]*(\S+)$/iu],
      ["shortsNumber", /^(?:short(?:nummer)?|shortnr\.?|broeknummer)[\s:=-]*(\S+)$/iu],
      ["name", /^(?:naam|rugnaam)[\s:=-]*(.+)$/iu],
    ];
    const matched = patterns.find(([, pattern]) => pattern.test(part));
    if (matched) {
      const [, pattern] = matched;
      const value = part.match(pattern)?.[1]?.trim() ?? "";
      if (result[matched[0]]) {
        duplicates.push({ field: matched[0], values: [result[matched[0]], value], evidence: part });
        continue;
      }
      result[matched[0]] = value;
      evidence.push(`${part} → ${matched[0]}`);
      continue;
    }
    const supported = [...new Set(profile?.supports ?? [])].filter((field) => PERSONALIZATION_FIELDS.includes(field));
    const productField = /rugnummer/iu.test(productText) ? "backNumber" : /short(?:nummer)?/iu.test(productText) ? "shortsNumber" : /borstnummer/iu.test(productText) ? "chestNumber" : /initial/iu.test(productText) ? "initials" : /naam/iu.test(productText) ? "name" : null;
    const inferredField = productField && supported.includes(productField) ? productField : supported.length === 1 ? supported[0] : null;
    if (inferredField) {
      if (result[inferredField]) {
        duplicates.push({ field: inferredField, values: [result[inferredField], part], evidence: part });
        continue;
      }
      result[inferredField] = part;
      inferred.push({ field: inferredField, value: part, evidence: productField ? `Productomschrijving “${productText}”` : `Profiel ondersteunt uitsluitend ${inferredField}` });
    } else unresolved.push(part);
  }
  return { values: result, evidence, unresolved, inferred, duplicates, physicalDimensions };
}

function orderAssociationCandidates(order) {
  return [...new Set([order.association, ...(order.associations ?? []), ...(order.items ?? []).map(({ association }) => association)].map((value) => String(value ?? "").trim()).filter((value) => value && value !== "Geen vereniging"))];
}

function resolveHistoricalArticleContext(state, order, historicalItem) {
  const itemAssociation = String(historicalItem.association ?? "").trim();
  const orderAssociations = orderAssociationCandidates(order);
  if (historicalItem.articleId) {
    const exact = state.articles.find(({ id }) => id === historicalItem.articleId);
    if (!exact) return { article: null, authority: "ITEM_ARTICLE_ID_MISSING", ambiguous: false, conflict: false, candidates: [] };
    const conflicts = [
      ...(itemAssociation && exact.association !== itemAssociation ? [`Artikel hoort bij ${exact.association}; orderregel noemt ${itemAssociation}.`] : []),
      ...(orderAssociations.length === 1 && exact.association !== orderAssociations[0] ? [`Artikel hoort bij ${exact.association}; ordercontext noemt ${orderAssociations[0]}.`] : []),
      ...(historicalItem.articleNumber && String(historicalItem.articleNumber) !== String(exact.articleNumber) ? [`Artikel-ID hoort bij SKU ${exact.articleNumber}; orderregel noemt ${historicalItem.articleNumber}.`] : []),
    ];
    return { article: exact, authority: "ITEM_ARTICLE_ID", ambiguous: false, conflict: conflicts.length > 0, conflicts, candidates: [exact] };
  }
  const constrain = (candidates) => {
    if (itemAssociation) return candidates.filter(({ association }) => association === itemAssociation);
    if (orderAssociations.length === 1) return candidates.filter(({ association }) => association === orderAssociations[0]);
    return candidates;
  };
  if (historicalItem.articleNumber) {
    const candidates = constrain(state.articles.filter(({ articleNumber }) => String(articleNumber) === String(historicalItem.articleNumber)));
    return { article: candidates.length === 1 ? candidates[0] : null, authority: itemAssociation ? "SKU_AND_ITEM_ASSOCIATION" : orderAssociations.length === 1 ? "SKU_AND_UNIQUE_ORDER_ASSOCIATION" : "SKU", ambiguous: candidates.length > 1, conflict: false, candidates };
  }
  if (historicalItem.product) {
    const candidates = constrain(state.articles.filter(({ name }) => normalizedProductionIdentity(name) === normalizedProductionIdentity(historicalItem.product)));
    return { article: candidates.length === 1 ? candidates[0] : null, authority: "PRODUCT_NAME_CONTEXT", ambiguous: candidates.length > 1, conflict: false, candidates };
  }
  return { article: null, authority: "NO_ARTICLE_EVIDENCE", ambiguous: false, conflict: false, candidates: [] };
}

function structuredVariantCardinalityFinding(order, item, itemIndex, variants) {
  if (!variants.length) return null;
  const invalid = variants.some(({ quantity }) => !Number.isInteger(Number(quantity)) || Number(quantity) < 1);
  const total = variants.reduce((sum, { quantity }) => sum + Number(quantity || 0), 0);
  const duplicateIds = new Set(variants.map(({ id }) => id)).size !== variants.length;
  if (!invalid && !duplicateIds && total === Number(item.quantity)) return null;
  return existingOrderFinding(order, item, itemIndex, "CARDINALITY", item.personalization || item.product,
    `De historische persoons-/variantregels tellen niet exact op tot artikel-aantal ${item.quantity}.`,
    `Varianttotaal ${total}; ${variants.length} regels; unieke identities: ${!duplicateIds}`,
    { kind: "OPEN_ORDER_CONTENT", label: "Aantallen per persoon controleren", target: `orders/nieuw?edit=${encodeURIComponent(order.id)}#artikelen` });
}

function existingOrderFinding(order, item, index, missingField, decoration, reason, evidence, action) {
  return {
    id: `reconciliation-${sha256(JSON.stringify([order.id, item.id, missingField, decoration, index])).slice(0, 18).toLowerCase()}`,
    itemId: item.id,
    articleNumber: item.articleNumber ?? null,
    decoration,
    missingField,
    reason,
    evidence,
    action,
  };
}

function existingOrderReconciliationDecisions(order) {
  return Array.isArray(order.productionReconciliation?.decisions) ? structuredClone(order.productionReconciliation.decisions) : [];
}

function existingOrderDecision(decisions, finding) {
  return decisions.find(({ findingId }) => findingId === finding.id) ?? null;
}

function assertExistingOrderReconciliationWriteAllowed(state, order) {
  const hasPhysicalExecution = ["PRINT", "DONE"].includes(order.stage)
    || state.productionJobs?.some((job) => job.orders?.some(({ id }) => id === order.id) || job.snapshot?.orders?.some(({ id }) => id === order.id));
  if (hasPhysicalExecution) throw Object.assign(new Error("Productiewaarheid is na fysieke uitvoering immutable; maak een auditable reprint/correctie-execution."), { statusCode: 409, code: "HISTORICAL_PRODUCTION_TRUTH_IMMUTABLE" });
  if (!["ORDER", "CONTROL"].includes(order.stage)) throw Object.assign(new Error("Deze lifecyclefase staat geen reconciliatiemutatie toe."), { statusCode: 409, code: "RECONCILIATION_STAGE_LOCKED" });
}

/**
 * Reconciles immutable historical order intent into a current canonical
 * production projection. It never writes to the order. A RESOLVABLE
 * projection requires an explicit audited confirmation before materializing.
 */
export function reconcileExistingOrderProductionTruth(state, order) {
  const historicalSourceHash = existingOrderHistoricalSourceHash(order);
  const decisions = existingOrderReconciliationDecisions(order);
  const immutableSnapshotLines = order.productionExecutionSnapshot?.productionLines;
  if (immutableSnapshotLines?.length || order.productionLines?.length) {
    const productionLines = structuredClone(immutableSnapshotLines?.length ? immutableSnapshotLines : order.productionLines);
    const baseValidation = validateFinalProductionTruth(state, { ...order, productionLines }, productionLines, { allowHistoricalSourceSnapshot: Boolean(immutableSnapshotLines) || ["PRINT", "DONE"].includes(order.stage) });
    const snapshotIntegrity = immutableSnapshotLines?.length ? verifyProductionExecutionSnapshot(order) : { valid: true };
    const validationFindings = snapshotIntegrity.valid ? baseValidation.findings : [...baseValidation.findings, finalProductionFinding("EXECUTION_SNAPSHOT", snapshotIntegrity.reason, { code: snapshotIntegrity.code ?? "PRODUCTION_EXECUTION_SNAPSHOT_HASH_MISMATCH", evidence: JSON.stringify(snapshotIntegrity) })];
    const validationBody = { ...baseValidation, findings: validationFindings, status: validationFindings.length ? "BLOCKED" : "VALID" };
    const validation = { ...validationBody, validationHash: sha256(JSON.stringify({ ...validationBody, validationHash: undefined })) };
    return {
      version: EXISTING_ORDER_RECONCILIATION_VERSION,
      status: validation.status === "VALID" ? "PROVEN" : "HUMAN_DECISION_REQUIRED",
      sourceKind: immutableSnapshotLines?.length ? "IMMUTABLE_EXECUTION_SNAPSHOT" : "STORED_CANONICAL",
      historicalSourceHash,
      projectionHash: sha256(JSON.stringify(productionLines)),
      productionLines,
      findings: validation.status === "VALID" ? [] : validation.findings.map((finding, index) => existingOrderFinding(order, order.items?.find(({ id }) => id === finding.itemId) ?? order.items?.[0] ?? { id: "unknown" }, index, finding.field, finding.decoration ?? "Productieregel", finding.reason, finding.evidence, { kind: "OPEN_PRODUCTION_SOURCE", label: "Productiewaarheid controleren", target: `orders/${order.id}#productieherstel` })),
      evidence: [immutableSnapshotLines?.length ? "Immutable execution snapshot is exact geverifieerd." : "Opgeslagen canonical productieregels zijn door de finale validator gecontroleerd.", `Validator ${validation.version} · ${validation.validationHash}`],
      finalValidation: validation,
      ...(decisions.length ? { decisions } : {}),
      ...(order.productionReconciliation?.confirmed ? { confirmed: structuredClone(order.productionReconciliation.confirmed) } : {}),
    };
  }

  if (["PRINT", "DONE"].includes(order.stage)) {
    const item = order.items?.[0] ?? { id: "unknown", product: order.id };
    const finding = existingOrderFinding(order, item, 0, "EXECUTION_SNAPSHOT", item.personalization || item.product, "De historische productie-uitvoering mist een immutable execution snapshot en wordt niet uit actuele configuratie herberekend.", order.sourceContext?.provenance ?? `Historische order ${order.id}`, { kind: "OPEN_HISTORY", label: "Historische uitvoering controleren", target: `productie/historie?query=${encodeURIComponent(order.id)}` });
    return { version: EXISTING_ORDER_RECONCILIATION_VERSION, status: "HUMAN_DECISION_REQUIRED", sourceKind: "HISTORICAL_EXECUTION_WITHOUT_SNAPSHOT", historicalSourceHash, projectionHash: null, productionLines: [], findings: [finding], evidence: ["Fail-closed: actieve configuratie mag historische fysieke uitvoering niet herschrijven."], ...(decisions.length ? { decisions } : {}) };
  }

  const findings = [];
  const evidence = [];
  const projectedItems = [];
  let requiresConfirmation = decisions.length > 0;
  for (const [itemIndex, historicalItem] of (order.items ?? []).entries()) {
    const hasDecorationIntent = nonEmptyPersonalization(historicalItem.personalizationValues) || (historicalItem.variants ?? []).some((variant) => nonEmptyPersonalization(variant.personalizationValues)) || !/^geen bedrukking$/iu.test(String(historicalItem.personalization ?? "").trim());
    if (!hasDecorationIntent) continue;
    const context = resolveHistoricalArticleContext(state, order, historicalItem);
    let article = context.article;
    if (context.ambiguous) {
      const finding = existingOrderFinding(order, historicalItem, itemIndex, "ARTICLE_CONTEXT", historicalItem.personalization || historicalItem.product, `Artikelnummer ${historicalItem.articleNumber ?? "onbekend"} komt in meerdere contexten voor; Workspace kiest nooit stil de eerste match.`, context.candidates.map(({ id, association }) => `${id} · ${association}`).join(" | "), { kind: "CHOOSE_ARTICLE_CONTEXT", label: "Artikelcontext kiezen", target: `orders/${order.id}#productieherstel`, options: context.candidates.map(({ id }) => id), optionLabels: Object.fromEntries(context.candidates.map((candidate) => [candidate.id, `${candidate.articleNumber ?? candidate.id} · ${candidate.product ?? candidate.name ?? "Artikel"} · ${candidate.color ?? candidate.variant ?? "variant onbekend"} · ${candidate.association}`])) });
      const decision = existingOrderDecision(decisions, finding);
      const selected = decision && finding.action.options.includes(decision.value) ? state.articles.find(({ id }) => id === decision.value) : null;
      if (selected) { article = selected; requiresConfirmation = true; evidence.push(`${historicalItem.id}: ${decision.byUserName} koppelde de historische regel expliciet aan ${selected.articleNumber} · ${selected.association}.`); }
      else findings.push(finding);
    }
    else if (context.conflict) findings.push(existingOrderFinding(order, historicalItem, itemIndex, "ARTICLE_CONTEXT", historicalItem.personalization || historicalItem.product, "Artikel-, SKU- en verenigingscontext spreken elkaar tegen; Workspace kiest nooit stil een clubprofiel.", context.conflicts.join(" · "), { kind: "OPEN_ORDER_CONTENT", label: "Artikelcontext corrigeren", target: `orders/nieuw?edit=${encodeURIComponent(order.id)}#artikelen` }));
    else if (article && context.authority === "PRODUCT_NAME_CONTEXT") { requiresConfirmation = true; evidence.push(`${historicalItem.id}: artikel exact op productnaam en context gevonden (${article.articleNumber}).`); }
    const profileId = historicalItem.productionProfileId || article?.profileId;
    const profile = state.productionProfiles.find(({ id }) => id === profileId);
    if (!historicalItem.articleNumber && !article?.articleNumber) findings.push(existingOrderFinding(order, historicalItem, itemIndex, "ARTICLE", historicalItem.personalization || historicalItem.product, "Het historische artikel heeft geen eenduidige artikelidentiteit.", historicalItem.sourceProvenance ?? order.sourceContext?.provenance ?? "Historische order", { kind: "OPEN_ORDER_CONTENT", label: "Artikel en bedrukking controleren", target: `orders/nieuw?edit=${encodeURIComponent(order.id)}#artikelen` }));
    if (!profile || profileId === "profile-none") findings.push(existingOrderFinding(order, historicalItem, itemIndex, "PRODUCTION_PROFILE", historicalItem.personalization || historicalItem.product, profileId === "profile-none" ? "De historische regel bevat bedrukintentie maar is tegenstrijdig als ‘geen productieprofiel’ opgeslagen." : "Er is geen historisch of exact artikelgebonden productieprofiel gevonden.", historicalItem.productionProfileId ? `Opgeslagen profiel ${historicalItem.productionProfileId}` : "Geen profielreferentie opgeslagen", { kind: "OPEN_PRODUCTION_SOURCE", label: "Productieprofiel controleren", target: `beheer/productieprofielen` }));

    let variants = (historicalItem.variants ?? []).filter((variant) => nonEmptyPersonalization(variant.personalizationValues)).map((variant) => structuredClone(variant));
    let historicalPhysicalDimensions = [];
    const cardinalityFinding = structuredVariantCardinalityFinding(order, historicalItem, itemIndex, variants);
    if (cardinalityFinding) findings.push(cardinalityFinding);
    if (!variants.length && nonEmptyPersonalization(historicalItem.personalizationValues)) variants = [{
      id: `legacy-variant-${sha256(JSON.stringify([order.id, historicalItem.id, historicalItem.personalizationValues])).slice(0, 16).toLowerCase()}`,
      quantity: historicalItem.quantity,
      size: historicalItem.size ?? "",
      personalization: historicalItem.personalization,
      personalizationValues: structuredClone(historicalItem.personalizationValues),
      backNumberProduction: historicalItem.backNumberProduction ?? null,
    }];
    if (!variants.length && profile) {
      const parsed = legacyPersonalizationFromText(historicalItem, profile);
      historicalPhysicalDimensions = parsed.physicalDimensions;
      evidence.push(...parsed.evidence.map((entry) => `${historicalItem.id}: ${entry}`));
      for (const inference of parsed.inferred) {
        requiresConfirmation = true;
        evidence.push(`${historicalItem.id}: ${inference.evidence}; voorstel ${inference.field} = “${inference.value}”.`);
      }
      for (const duplicate of parsed.duplicates) findings.push(existingOrderFinding(order, historicalItem, itemIndex, "DECORATION_CARDINALITY", duplicate.values.join(" / "), `Meerdere waarden voor ${duplicate.field} mogen niet stil tot één decoration worden samengevoegd.`, duplicate.evidence, { kind: "OPEN_ORDER_CONTENT", label: "Decorations en aantallen controleren", target: `orders/nieuw?edit=${encodeURIComponent(order.id)}#artikelen` }));
      for (const [unresolvedIndex, value] of parsed.unresolved.entries()) {
        const finding = existingOrderFinding(order, historicalItem, itemIndex + unresolvedIndex, "DECORATION_TYPE", value, `“${value}” kan niet betrouwbaar aan één bedrukkingstype worden gekoppeld.`, historicalItem.personalization, { kind: "CHOOSE_DECORATION_TYPE", label: "Bedrukkingstype kiezen", target: `orders/${order.id}#productieherstel`, options: [...new Set(profile.supports ?? [])] });
        const decision = existingOrderDecision(decisions, finding);
        if (decision && finding.action.options.includes(decision.value)) {
          parsed.values[decision.value] = value;
          requiresConfirmation = true;
          evidence.push(`${historicalItem.id}: ${decision.byUserName} koppelde “${value}” expliciet aan ${decision.value}.`);
        } else findings.push(finding);
      }
      if (nonEmptyPersonalization(parsed.values)) variants = [{
        id: `legacy-variant-${sha256(JSON.stringify([order.id, historicalItem.id, parsed.values])).slice(0, 16).toLowerCase()}`,
        quantity: historicalItem.quantity,
        size: historicalItem.size ?? "",
        personalization: historicalItem.personalization,
        personalizationValues: parsed.values,
        backNumberProduction: historicalItem.backNumberProduction ?? (parsed.values.backNumber && parsed.values.backNumberSizeClass ? resolveBackNumberProductionContext(state.associations.find(({ id, name }) => id === historicalItem.association || name === historicalItem.association), profile, parsed.values.backNumberSizeClass, historicalItem.size) : null),
      }];
    }
    for (const variant of variants) {
      const values = variant.personalizationValues ?? {};
      const effectiveSizeClass = String(values.backNumberSizeClass ?? variant.backNumberProduction?.sizeClass ?? historicalItem.backNumberProduction?.sizeClass ?? "").trim().toUpperCase();
      if (String(values.backNumber ?? "").trim() && !CANONICAL_BACK_NUMBER_SIZE_CLASSES.has(effectiveSizeClass)) {
        const finding = existingOrderFinding(order, historicalItem, itemIndex, "SIZE_CLASS", `Rugnummer ${values.backNumber}`, "Junior/Senior is niet historisch vastgelegd en wordt nooit uit de kledingmaat gegokt.", variant.personalization || historicalItem.personalization, { kind: "CHOOSE_SIZE_CLASS", label: "Junior of Senior kiezen", target: `orders/${order.id}#productieherstel`, options: ["JUNIOR", "SENIOR"] });
        const decision = existingOrderDecision(decisions, finding);
        if (decision && finding.action.options.includes(decision.value)) {
          values.backNumberSizeClass = decision.value;
          variant.backNumberProduction = resolveBackNumberProductionContext(state.associations.find(({ id, name }) => id === historicalItem.association || name === historicalItem.association), profile, decision.value, variant.size ?? historicalItem.size);
          requiresConfirmation = true;
          evidence.push(`${historicalItem.id}: ${decision.byUserName} bevestigde ${decision.value} voor rugnummer ${values.backNumber}.`);
        } else findings.push(finding);
      }
    }
    if (!variants.length && !findings.some(({ itemId }) => itemId === historicalItem.id)) findings.push(existingOrderFinding(order, historicalItem, itemIndex, "VALUE", historicalItem.product, "De historische orderregel bevat geen eenduidige bedrukwaarde.", historicalItem.personalization || "Geen bedrukkingstekst opgeslagen", { kind: "CHOOSE_DECORATION_TYPE", label: "Bedrukking vastleggen", target: `orders/${order.id}#productieherstel`, options: [...new Set(profile?.supports ?? [])] }));
    let effectiveFoilColor = historicalItem.foilColor;
    if (!String(effectiveFoilColor ?? "").trim() || /^onbekend$/iu.test(effectiveFoilColor)) {
      const finding = existingOrderFinding(order, historicalItem, itemIndex, "FOIL_COLOR", historicalItem.personalization || historicalItem.product, "De fysieke foliekleur ontbreekt in de historische orderwaarheid.", historicalItem.sourceProvenance ?? "Historische order", { kind: "CHOOSE_FOIL_COLOR", label: "Foliekleur kiezen", target: `orders/${order.id}#productieherstel`, options: [...new Set(state.foilRolls.filter(({ active }) => active !== false).map(({ color }) => color))] });
      const decision = existingOrderDecision(decisions, finding);
      if (decision && finding.action.options.includes(decision.value)) {
        effectiveFoilColor = decision.value;
        requiresConfirmation = true;
        evidence.push(`${historicalItem.id}: ${decision.byUserName} bevestigde foliekleur ${decision.value}.`);
      } else findings.push(finding);
    }
    projectedItems.push({
      ...structuredClone(historicalItem),
      articleId: historicalItem.articleId ?? article?.id,
      articleNumber: historicalItem.articleNumber ?? article?.articleNumber,
      association: historicalItem.association ?? article?.association ?? order.association,
      productionProfileId: profileId,
      foilColor: effectiveFoilColor,
      sourceType: "LEGACY",
      sourceProvenance: historicalItem.sourceProvenance ?? order.sourceContext?.provenance ?? `Historische order ${order.id}`,
      ...(historicalPhysicalDimensions.length ? { historicalPhysicalDimensions } : {}),
      variants,
    });
  }
  let productionLines = findings.some(({ missingField }) => ["ARTICLE", "ARTICLE_CONTEXT", "DECORATION_TYPE", "DECORATION_CARDINALITY", "CARDINALITY", "VALUE", "FOIL_COLOR", "PRODUCTION_PROFILE", "SIZE_CLASS"].includes(missingField)) ? [] : stableExistingOrderProductionLines(resolveCanonicalProductionLines(state, order.id, projectedItems));
  for (const item of projectedItems.filter(({ historicalPhysicalDimensions }) => historicalPhysicalDimensions?.length)) {
    const itemLines = productionLines.filter(({ itemId }) => itemId === item.id);
    if (item.historicalPhysicalDimensions.length !== 1 || itemLines.length !== 1) {
      findings.push(existingOrderFinding(order, item, 0, "DIMENSIONS", item.personalization || item.product, "De historische fysieke maataanduiding kan niet eenduidig aan precies één decoration worden gekoppeld.", item.historicalPhysicalDimensions.map(({ raw }) => raw).join(" · "), { kind: "OPEN_ORDER_CONTENT", label: "Fysieke maat per decoration vastleggen", target: `orders/nieuw?edit=${encodeURIComponent(order.id)}#artikelen` }));
      productionLines = [];
      continue;
    }
    const line = itemLines[0];
    const dimension = item.historicalPhysicalDimensions[0];
    if (Math.abs(Number(line.heightMm) - dimension.valueMm) < .001) {
      line.physicalTruth = { authority: "HISTORICAL_EXPLICIT", valueMm: dimension.valueMm, evidence: dimension.raw };
      evidence.push(`${item.id}: expliciete historische fysieke hoogte ${dimension.raw} komt exact overeen met de canonieke projectie.`);
      continue;
    }
    const finding = existingOrderFinding(order, item, 0, "DIMENSIONS", line.preview?.label ?? line.content, `Historische fysieke hoogte ${dimension.raw} wijkt af van profielhoogte ${line.heightMm} mm; Workspace overschrijft geen van beide stil.`, `${dimension.raw} · profiel ${line.decorationIdentity?.productionProfileId ?? item.productionProfileId}`, { kind: "CHOOSE_PHYSICAL_HEIGHT_MM", label: "Fysieke hoogte kiezen", target: `orders/${order.id}#productieherstel`, options: [String(dimension.valueMm), String(line.heightMm)], optionLabels: { [String(dimension.valueMm)]: `${dimension.valueMm} mm · expliciet in historische orderbron`, [String(line.heightMm)]: `${line.heightMm} mm · huidig canoniek productieprofiel` } });
    const decision = existingOrderDecision(decisions, finding);
    if (decision && finding.action.options.includes(decision.value)) {
      const selectedHeight = Number(decision.value);
      const ratio = Number(line.widthMm) / Number(line.heightMm);
      line.heightMm = selectedHeight;
      line.widthMm = Math.round(selectedHeight * ratio * 1000) / 1000;
      line.physicalTruth = { authority: "HUMAN_CONFIRMED_HISTORICAL_RECONCILIATION", valueMm: selectedHeight, evidence: dimension.raw, confirmedAt: decision.at, confirmedBy: decision.byUserId, reason: decision.reason };
      requiresConfirmation = true;
    } else {
      findings.push(finding);
      productionLines = [];
    }
  }
  for (const [lineIndex, line] of productionLines.entries()) if (line.validation?.status !== "VALID") {
    const item = projectedItems.find(({ id }) => id === line.itemId) ?? order.items?.[0] ?? { id: "unknown", product: "Onbekende bedrukking" };
    const missingField = /maat|mm|afmeting/iu.test(line.validation.reason ?? "") ? "DIMENSIONS" : "PRODUCTION_SOURCE";
    findings.push(existingOrderFinding(order, item, lineIndex, missingField, line.preview?.label ?? line.content, line.validation.reason ?? "De canonieke productieregel is niet uitvoerbaar.", line.provenance, { kind: "OPEN_PRODUCTION_SOURCE", label: missingField === "DIMENSIONS" ? "Fysieke maat controleren" : "Productiebron openen", target: `beheer/productieprofielen#profiel-${encodeURIComponent(item.productionProfileId ?? "")}` }));
  }
  if (productionLines.length && !findings.length) {
    const validation = validateFinalProductionTruth(state, { ...order, items: projectedItems, productionLines }, productionLines);
    if (validation.status !== "VALID") for (const [index, finding] of validation.findings.entries()) {
      const item = projectedItems.find(({ id }) => id === finding.itemId) ?? projectedItems[0] ?? order.items?.[0] ?? { id: "unknown" };
      findings.push(existingOrderFinding(order, item, index, finding.field, finding.decoration ?? item.personalization ?? item.product, finding.reason, finding.evidence, { kind: "OPEN_PRODUCTION_SOURCE", label: "Productiewaarheid controleren", target: `orders/${order.id}#productieherstel` }));
    }
  }
  const projectionHash = productionLines.length ? sha256(JSON.stringify(productionLines)) : null;
  const status = findings.length ? "HUMAN_DECISION_REQUIRED" : requiresConfirmation ? "RESOLVABLE" : "PROVEN";
  if (status === "RESOLVABLE") findings.push(existingOrderFinding(order, projectedItems[0] ?? order.items[0], 0, "CONFLICT", "Historische bedrukking", "Workspace heeft precies één evidence-backed canonical projection voorbereid; bevestiging voorkomt een stille historische herschrijving.", evidence.join(" · ") || "Historische order + exact profiel", { kind: "CONFIRM_PROJECTION", label: "Productievoorstel bevestigen", target: `orders/${order.id}#productieherstel` }));
  return { version: EXISTING_ORDER_RECONCILIATION_VERSION, status, sourceKind: "HISTORICAL_ORDER_PROJECTION", historicalSourceHash, projectionHash, productionLines, findings, evidence, ...(decisions.length ? { decisions } : {}) };
}

function productionLinesForOrder(state, order) {
  if (order.productionExecutionSnapshot?.productionLines?.length) return verifyProductionExecutionSnapshot(order).valid ? order.productionExecutionSnapshot.productionLines : [];
  if (order.productionLines?.length) return order.productionLines;
  if (["PRINT", "DONE"].includes(order.stage)) return [];
  const reconciliation = reconcileExistingOrderProductionTruth(state, order);
  return reconciliation.status === "PROVEN" ? reconciliation.productionLines : [];
}

function publicOrderWithProductionTruth(state, order, { includeReconciliation = true } = {}) {
  const productionReconciliation = includeReconciliation ? reconcileExistingOrderProductionTruth(state, order) : null;
  const productionLines = order.productionExecutionSnapshot?.productionLines?.length ? order.productionExecutionSnapshot.productionLines : order.productionLines?.length ? order.productionLines : includeReconciliation ? productionLinesForOrder(state, order) : [];
  const projected = { ...order, ...(productionLines.length ? { productionLines } : {}), ...(includeReconciliation ? { productionReconciliation } : {}) };
  return { ...projected, ...productionStatusForOrder(state, projected) };
}

const deriveCatalogProductionLines = resolveCanonicalProductionLines;

function lineFromOrderItem(state, order, item, index) {
  const value = String(item.personalization ?? item.product).trim();
  const numeric = value.match(/(?:Rug|Short|Nummer)?\s*(\d{1,4})/iu)?.[1];
  const profile = state.productionProfiles.find(({ id }) => id === item.productionProfileId);
  const association = state.associations.find(({ id, name }) => id === item.association || name === item.association);
  const supportedField = (profile?.supports ?? []).length === 1 ? profile.supports[0] : null;
  const configuredHeight = profileFieldPhysicalHeightMm(association, profile, supportedField, item) || 30;
  const content = numeric ?? value.slice(0, 160);
  return { id: `legacy-line-${order.id}-${index + 1}`, type: numeric ? "NUMBER" : "TEXT", content, source: { kind: "PROFILE", id: profile?.id ?? "profile-data-gap", version: String(profile?.revision ?? 1) }, widthMm: Math.round(Math.max(20, configuredHeight * Math.max(0.5, content.length * 0.48)) * 1000) / 1000, heightMm: Math.round(configuredHeight * 1000) / 1000, quantity: item.quantity, preview: { kind: "PROFILE_REFERENCE", label: value, aspectRatioLocked: false }, provenance: item.sourceProvenance ?? `Order ${order.id}`, proofStatus: "CONFIGURED", validation: { status: item.productionReadiness?.status === "DATA_GAP" ? "BLOCKED" : "VALID", reason: item.productionReadiness?.reason ?? null } };
}

function rectangleNesting(lines, productionDefaults = PILOT_SETTINGS.productionDefaults) {
  const margin = productionDefaults.edgeMarginMm; const gap = productionDefaults.minimumGapMm; const workingWidth = productionDefaults.workingWidthMm;
  const objects = lines.flatMap((line) => Array.from({ length: line.quantity }, (_, copy) => ({ lineId: line.id, copy: copy + 1, widthMm: line.widthMm, heightMm: line.heightMm })));
  const arrange = (ordered) => {
    const shelves = []; const placements = [];
    for (const object of ordered) {
      let shelf = shelves.filter((candidate) => candidate.x + object.widthMm <= workingWidth - margin + 0.000001).sort((left, right) => (left.y + left.height) - (right.y + right.height) || left.x - right.x)[0];
      if (!shelf) { const y = shelves.length ? Math.max(...shelves.map((candidate) => candidate.y + candidate.height)) + gap : margin; shelf = { y, x: margin, height: object.heightMm }; shelves.push(shelf); }
      placements.push({ lineId: object.lineId, copy: object.copy, xMm: Math.round(shelf.x * 1000) / 1000, yMm: Math.round(shelf.y * 1000) / 1000, widthMm: object.widthMm, heightMm: object.heightMm });
      shelf.x += object.widthMm + gap; shelf.height = Math.max(shelf.height, object.heightMm);
    }
    const usedWidthMm = Math.round((Math.max(margin, ...placements.map(({ xMm, widthMm }) => xMm + widthMm)) + margin) * 1000) / 1000;
    const usedLengthMm = Math.round((Math.max(margin, ...placements.map(({ yMm, heightMm }) => yMm + heightMm)) + margin) * 1000) / 1000;
    return { placements, usedWidthMm, usedLengthMm };
  };
  const orders = [
    [...objects].sort((a, b) => b.heightMm - a.heightMm || b.widthMm - a.widthMm || a.lineId.localeCompare(b.lineId)),
    [...objects].sort((a, b) => b.widthMm - a.widthMm || b.heightMm - a.heightMm || a.lineId.localeCompare(b.lineId)),
  ];
  return orders.map(arrange).sort((a, b) => a.usedLengthMm - b.usedLengthMm || a.usedWidthMm - b.usedWidthMm)[0];
}

function managedFontBytes(font, artifactRoot, installedProductionAssetRoot = INSTALLED_PRODUCTION_ASSET_ROOT) {
  if (font?.sourceDataBase64) return Buffer.from(font.sourceDataBase64, "base64");
  const sourceUrl = String(font?.sourceUrl ?? "");
  if (!sourceUrl.startsWith("/assets/") || sourceUrl.includes("..")) return null;
  const relative = sourceUrl.replace(/^\/+/, "").split("/");
  const candidates = [
    ...(installedProductionAssetRoot ? [path.resolve(installedProductionAssetRoot, ...relative)] : []),
    path.resolve(artifactRoot, "website", "public", ...relative),
    path.resolve(artifactRoot, "website", "dist-workspace", ...relative),
    path.resolve(artifactRoot, "public", ...relative),
    path.resolve(artifactRoot, "dist-workspace", ...relative),
    path.resolve(artifactRoot, "app", "dist-workspace", ...relative),
  ];
  for (const candidate of candidates) {
    try {
      const bytes = readFileSync(candidate);
      if (sha256(bytes).toUpperCase() === font.sha256) return bytes;
    } catch { /* Een ontbrekende kandidaat is geen toegestane fallback. */ }
  }
  return null;
}

function syncOpenProposalOrderRevisions(state, order) {
  for (const proposal of state.productionProposals ?? []) {
    if (proposal.status !== "OPEN") continue;
    for (const group of proposal.groups ?? []) {
      if (group.status !== "OPEN") continue;
      const selection = group.orders.find(({ id }) => id === order.id);
      if (selection) selection.expectedRevision = order.revision;
    }
  }
}

function normalizedProductionFoilColor(value) {
  return String(value ?? "").trim().toLocaleLowerCase("nl-NL");
}

function operationalProductionGroup(state, group) {
  return (group?.productionLineRefs ?? []).some(({ orderId, lineId }) => {
    const order = state.orders.find(({ id }) => id === orderId);
    return Boolean(order
      && !order.deletion
      && order.productionArchive?.status !== "ARCHIVED"
      && order.stage !== "DONE"
      && (order.productionLines ?? []).some(({ id }) => id === lineId));
  });
}

function activePhysicalProductionGroups(state) {
  return (state.productionProposals ?? []).flatMap((proposal) => (proposal.groups ?? []).filter((group) => {
    if (!group.productionJobId || !operationalProductionGroup(state, group)) return false;
    return state.productionJobs.find(({ id }) => id === group.productionJobId)?.status === "AWAITING_HUMAN_CHECK";
  }).map((group) => ({ proposal, group })));
}

function productionGroupCompatibilityKey(group) {
  return [
    String(group?.sourceChannel ?? "STORE"),
    normalizedProductionFoilColor(group?.foilColor),
    String(group?.outputWriter?.id ?? ""),
    String(group?.outputWriter?.version ?? ""),
  ].join("|");
}

function catalogCommercialPriceTruth(state, items, source = "CATALOG_AT_ORDER_WRITE") {
  const lines = [];
  for (const item of items) {
    const article = state.articles.find(({ id }) => id === item.articleId);
    if (!article) continue;
    for (const variant of item.variants ?? []) {
      for (const field of PERSONALIZATION_FIELDS) {
        const resolved = resolveCatalogPersonalizationPrice(article, field, variant.personalizationValues?.[field]);
        if (resolved.status !== "PRICED") continue;
        const totalPriceEur = Math.round(resolved.unitPriceEur * variant.quantity * 100) / 100;
        lines.push({
          identity: `${item.id}:${variant.id}:${field}`,
          articleId: article.id,
          articleNumber: article.articleNumber,
          itemId: item.id,
          occurrenceId: variant.id,
          field,
          value: resolved.normalizedValue,
          quantity: variant.quantity,
          unitPriceEur: resolved.unitPriceEur,
          totalPriceEur,
          sourceLabel: article.priceConfiguration?.sourceLabel ?? "DATA_GAP: prijsbron ontbreekt",
        });
      }
    }
  }
  return {
    version: "SPORTPALEIS_ORDER_COMMERCIAL_PRICE_TRUTH_V1",
    source,
    lines,
    totalPersonalizationEur: Math.round(lines.reduce((sum, line) => sum + line.totalPriceEur, 0) * 100) / 100,
  };
}

function openProductionGroupRevisionsCurrent(state, group) {
  return (group?.orders ?? []).length > 0 && group.orders.every(({ id, expectedRevision }) => {
    const order = state.orders.find((candidate) => candidate.id === id);
    return Boolean(order
      && order.deletion?.status !== "DELETED"
      && order.productionArchive?.status !== "ARCHIVED"
      && order.revision === Number(expectedRevision));
  });
}

function mergeOpenProductionGroup(target, source) {
  const orderIds = new Set(target.orders.map(({ id }) => id));
  for (const selection of source.orders) if (!orderIds.has(selection.id)) {
    target.orders.push(structuredClone(selection));
    orderIds.add(selection.id);
  }
  const lineKeys = new Set(target.productionLineRefs.map(({ orderId, lineId }) => `${orderId}|${lineId}`));
  for (const ref of source.productionLineRefs) if (!lineKeys.has(`${ref.orderId}|${ref.lineId}`)) {
    target.productionLineRefs.push(structuredClone(ref));
    lineKeys.add(`${ref.orderId}|${ref.lineId}`);
  }
  target.label = `${target.foilColor}${target.sourceChannel === "STORE" ? "" : ` · ${productionSourceLabel(target.sourceChannel)}`} — ${target.orders.length} ${target.orders.length === 1 ? "order" : "orders"}`;
  return target;
}

function productionGroupSequenceState(state, proposal, groupId) {
  const groups = proposal?.groups ?? [];
  const group = groups.find(({ id }) => id === groupId);
  if (!group) return "UNKNOWN";
  const jobStatus = (candidate) => candidate.productionJobId ? state.productionJobs.find(({ id }) => id === candidate.productionJobId)?.status : null;
  if (jobStatus(group) === "COMPLETED") return "COMPLETED";
  const dependencies = Array.isArray(group.dependsOnGroupIds) ? group.dependsOnGroupIds : [];
  if (dependencies.some((dependencyId) => jobStatus(groups.find(({ id }) => id === dependencyId) ?? {}) !== "COMPLETED")) return "LATER";
  const activeGroups = activePhysicalProductionGroups(state);
  if (activeGroups.length) {
    if (jobStatus(group) === "AWAITING_HUMAN_CHECK") return "CURRENT";
    const activeColors = new Set(activeGroups.map(({ group: activeGroup }) => normalizedProductionFoilColor(activeGroup.foilColor)));
    return activeColors.size === 1 && activeColors.has(normalizedProductionFoilColor(group.foilColor)) ? "CURRENT" : "LATER";
  }
  return group.status === "OPEN" ? "CURRENT" : "UNKNOWN";
}

function productionProgressForOrder(state, order) {
  const groups = (state.productionProposals ?? []).flatMap((proposal) => (proposal.groups ?? []).filter((group) => group.productionLineRefs.some(({ orderId }) => orderId === order.id)));
  if (!groups.length) return null;
  const entries = groups.map((group) => {
    const job = group.productionJobId ? state.productionJobs.find(({ id }) => id === group.productionJobId) : null;
    const lineRefs = group.productionLineRefs.filter(({ orderId }) => orderId === order.id);
    return { foilColor: group.foilColor, status: job?.status === "COMPLETED" ? "PRODUCED" : "OPEN", productionJobId: job?.id ?? null, lineRefs };
  });
  const requiredLineIds = new Set(productionLinesForOrder(state, order).map(({ id }) => id));
  const trackedLineIds = new Set(entries.flatMap(({ lineRefs }) => lineRefs.map(({ lineId }) => lineId)));
  const producedLineIds = new Set(entries.filter(({ status }) => status === "PRODUCED").flatMap(({ lineRefs }) => lineRefs.map(({ lineId }) => lineId)));
  const trackedCounts = entries.flatMap(({ lineRefs }) => lineRefs.map(({ lineId }) => lineId)).reduce((counts, lineId) => counts.set(lineId, Number(counts.get(lineId) ?? 0) + 1), new Map());
  const duplicateTrackedLineIds = [...trackedCounts].filter(([, count]) => count > 1).map(([lineId]) => lineId);
  return {
    entries,
    requiredCount: requiredLineIds.size,
    producedCount: [...requiredLineIds].filter((lineId) => producedLineIds.has(lineId)).length,
    duplicateTrackedLineIds,
    complete: requiredLineIds.size > 0 && duplicateTrackedLineIds.length === 0 && [...requiredLineIds].every((lineId) => producedLineIds.has(lineId)),
    trackedComplete: requiredLineIds.size > 0 && duplicateTrackedLineIds.length === 0 && [...requiredLineIds].every((lineId) => trackedLineIds.has(lineId)),
  };
}

function productionLineTypeRank(line) {
  const label = String(line.preview?.label ?? "").trim().toLocaleLowerCase("nl-NL");
  if (line.type === "INITIALS" || String(line.placementRole ?? "").startsWith("INITIALS_") || label.startsWith("initialen") || label.startsWith("tussenvoegsel")) return 0;
  if (line.type === "BACK_NUMBER" || label.startsWith("rugnummer")) return 1;
  if (label.startsWith("shortnummer")) return 2;
  if (line.type === "NAME" || label.startsWith("naam")) return 3;
  return 4;
}

function stableProductionTypeSort(entries) {
  return entries.map((entry, index) => ({ entry, index })).sort((left, right) => productionLineTypeRank(left.entry.line) - productionLineTypeRank(right.entry.line) || left.index - right.index).map(({ entry }) => entry);
}

function productionLineFoilColor(state, order, line) {
  if (String(line.decorationIdentity?.foilColor ?? "").trim()) return String(line.decorationIdentity.foilColor).trim();
  if (String(line.foilColor ?? "").trim()) return String(line.foilColor).trim();
  const item = order.items.find(({ id }) => id === line.itemId)
    ?? order.items.find(({ personalizationValues }) => personalizationValues && Object.values(personalizationValues).includes(line.content))
    ?? (order.items.length === 1 ? order.items[0] : null);
  return String(item?.foilColor ?? state.settings.productionDefaults?.defaultFoilColor ?? "Onbekend").trim() || "Onbekend";
}

function productionSourceLabel(sourceChannel) {
  return ({ STORE: "Winkel", WEBSHOP_XPRT: "Webshop", TEAM_MAIL: "Teamorder", INVOICE: "Factuur", MANUAL: "Handmatig" })[sourceChannel] ?? "Andere bron";
}

function orderMailContext(state, order, question = "Niet van toepassing") {
  const itemLines = (order.items ?? []).map((item) => `${item.quantity}× ${item.product}${item.association ? ` · ${item.association}` : ""} · ${item.personalization}`).join("\n");
  return {
    customer: { name: order.customer },
    order: {
      number: order.id,
      items: itemLines,
      processingDays: Number(order.communication?.processingDaysSnapshot ?? state.settings.processingDays),
      pickupInformation: `Neem de orderreferentie ${order.id} mee bij het ophalen bij Sport 2000 Sportpaleis.`,
    },
    message: { question },
  };
}

function orderCommunicationContextHash(state, order, channel) {
  if (!order) return null;
  const templateByChannel = { receipt: "ORDER_RECEIVED", production: "ORDER_IN_PRODUCTION", ready: "ORDER_READY" };
  if (!templateByChannel[channel]) return null;
  return sha256(JSON.stringify(orderMailContext(state, order)));
}

function invalidateStaleOrderCommunicationEvidence(state, order, user, reason) {
  if (!order.communication) return;
  const at = iso();
  for (const channel of ["receipt", "production", "ready"]) {
    const evidence = order.communication[channel];
    if (!evidence || evidence.status === "NOT_SENT") continue;
    const currentContextHash = orderCommunicationContextHash(state, order, channel);
    if (evidence.contextHash && evidence.contextHash === currentContextHash) continue;
    order.communication.history ??= [];
    order.communication.history.push({ channel, ...structuredClone(evidence), invalidatedAt: at, invalidatedReason: reason, currentContextHash });
    order.communication[channel] = { status: "NOT_SENT", updatedAt: at, invalidatedReason: reason, recipientHash: order.customerEmail ? sha256(order.customerEmail.trim().toLocaleLowerCase("nl-NL")) : null, contextHash: currentContextHash };
    order.eventHistory ??= [];
    order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "COMMUNICATION_EVIDENCE_INVALIDATED", at, userId: user.id, userName: user.name, source: "order-truth-correction", details: { channel, reason, previousContextHash: evidence.contextHash ?? null, currentContextHash } });
    audit(state, user.id, "Communicatiebewijs ongeldig gemaakt na gewijzigde orderwaarheid", order.id, { channel, reason, previousContextHash: evidence.contextHash ?? null, currentContextHash });
  }
}

function validOrderCommunicationEvidence(state, order, channel) {
  const evidence = order.communication?.[channel];
  const recipient = String(order.customerEmail ?? "").trim().toLocaleLowerCase("nl-NL");
  if (!evidence || !recipient || !["CAPTURED", "SMTP_ACCEPTED", "SENT", "DELIVERED"].includes(evidence.status)) return false;
  return Boolean(evidence.providerReference && evidence.recipientHash === sha256(recipient) && evidence.contextHash && evidence.contextHash === orderCommunicationContextHash(state, order, channel));
}

function canonicalStockCompletionEvidence(state, order) {
  const applications = (order.stockApplications ?? []).filter(({ status }) => status === "APPLIED").map(({ id, association, quantity, status, appliedAt, appliedBy }) => ({ id, association, quantity: Number(quantity), status, appliedAt, appliedBy })).sort((left, right) => left.id.localeCompare(right.id));
  const mutations = (state.webshopIntake?.stockLogo?.mutations ?? []).filter(({ orderId }) => orderId === order.id).map(({ id, orderId, quantity, previousStock, nextStock, at, byUserId }) => ({ id, orderId, quantity: Number(quantity), previousStock: Number(previousStock), nextStock: Number(nextStock), at, byUserId })).sort((left, right) => left.id.localeCompare(right.id));
  return { applications, mutations };
}

function validStockCompletionLedger(state, order, evidence) {
  const applications = evidence?.applications ?? [];
  const mutations = evidence?.mutations ?? [];
  if (!applications.length || !mutations.length) return false;
  if (applications.some(({ quantity }) => !Number.isInteger(Number(quantity)) || Number(quantity) < 1)) return false;
  if (mutations.some(({ quantity, previousStock, nextStock }) => !Number.isInteger(Number(quantity)) || Number(quantity) >= 0 || !Number.isInteger(Number(previousStock)) || !Number.isInteger(Number(nextStock)) || Number(nextStock) !== Number(previousStock) + Number(quantity))) return false;
  const applied = applications.reduce((sum, item) => sum + Number(item.quantity), 0);
  const removed = -mutations.reduce((sum, item) => sum + Number(item.quantity), 0);
  if (!applied || applied !== removed) return false;
  const completeLedger = state.webshopIntake?.stockLogo?.mutations ?? [];
  return mutations.every(({ id, orderId }) => orderId === order.id && completeLedger.some((mutation) => mutation.id === id && mutation.orderId === order.id));
}

function productionClosureForOrder(state, order) {
  const productionLines = productionLinesForOrder(state, order);
  if (order.stage === "DONE") {
    const evidence = order.productionCompletionEvidence;
    const readyEvent = order.eventHistory?.find(({ type, details }) => type === "PRODUCTION_READY" && details?.explicitHumanAction === "AFRONDEN");
    if (!evidence || !readyEvent) return { status: "REVIEW_REQUIRED", reason: "Gereed-status mist immutable Afronden-bewijs." };
    const { evidenceHash, confirmedAt, confirmedBy, ...completionBody } = evidence;
    const confirmedAtValue = String(confirmedAt ?? "");
    const completionAttestationHash = readyEvent.details?.completionAttestationHash;
    const validAttestation = evidence.version === "CANONICAL_PRODUCTION_COMPLETION_V4"
      && !Number.isNaN(Date.parse(confirmedAtValue))
      && String(confirmedBy?.userId ?? "").trim()
      && String(confirmedBy?.userName ?? "").trim()
      && ["admin", "operator"].includes(String(confirmedBy?.role ?? ""))
      && readyEvent.at === confirmedAtValue
      && readyEvent.userId === confirmedBy.userId
      && readyEvent.userName === confirmedBy.userName
      && completionAttestationHash === sha256(JSON.stringify({ evidenceHash, confirmedAt: confirmedAtValue, confirmedBy }));
    if (!validAttestation) return { status: "REVIEW_REQUIRED", reason: "Gereed-bewijs mist een geldige, aan event en actor gebonden menselijke Afronden-attestatie." };
    const predecessorReadableBody = { ...completionBody, confirmedAt, confirmedBy };
    const predecessorReadableHash = sha256(JSON.stringify(predecessorReadableBody));
    const r216BodyHash = sha256(JSON.stringify(completionBody));
    if (![predecessorReadableHash, r216BodyHash].includes(evidenceHash) || readyEvent.details?.completionEvidenceHash !== evidenceHash) return { status: "REVIEW_REQUIRED", reason: "Gereed-bewijs heeft geen geldige immutable hash-/eventbinding." };
    const hasPlot = (evidence.requiredLineIds ?? []).length > 0;
    const hasStock = (evidence.stockEvidence?.applications ?? []).length > 0;
    const expectedMode = hasPlot && hasStock ? "MIXED" : hasPlot ? "PLOT" : hasStock ? "STOCK" : "NONE";
    if (evidence.completionMode !== expectedMode || expectedMode === "NONE") return { status: "REVIEW_REQUIRED", reason: "Gereed-bewijs bevat geen eenduidige fysieke completion-modus." };
    if (hasPlot) {
      const snapshotIntegrity = verifyProductionExecutionSnapshot(order);
      if (!snapshotIntegrity.valid || evidence.productionExecutionHash !== order.productionExecutionSnapshot?.executionHash) return { status: "REVIEW_REQUIRED", reason: "Gereed-bewijs wijkt af van de immutable productie-uitvoering." };
    } else if (evidence.productionExecutionHash !== null || evidence.productionJobs?.length) return { status: "REVIEW_REQUIRED", reason: "Voorraad-only completion bevat onverwachte plot-/executionreferenties." };
    if (evidence.productionLineHash !== sha256(JSON.stringify(productionLines))) return { status: "REVIEW_REQUIRED", reason: "Gereed-bewijs wijkt af van de uitgevoerde productieregels." };
    const requiredLineIds = [...new Set(productionLines.map(({ id }) => id))].sort();
    if (JSON.stringify(requiredLineIds) !== JSON.stringify([...(evidence.requiredLineIds ?? [])].sort())) return { status: "REVIEW_REQUIRED", reason: "Gereed-bewijs wijkt af van de canonical productieregels." };
    for (const reference of evidence.productionJobs ?? []) {
      const job = state.productionJobs.find(({ id }) => id === reference.id);
      if (!job || job.status !== "COMPLETED" || job.humanAcceptance?.status !== "PASS" || job.jobNumber !== reference.jobNumber || job.snapshotHash !== reference.snapshotHash || (job.snapshot?.artifact?.sha256 ?? null) !== (reference.artifactSha256 ?? null)) return { status: "REVIEW_REQUIRED", reason: "Gereed-bewijs verwijst niet exact naar een afgeronde en menselijk bevestigde immutable productiejob." };
    }
    if (hasStock) {
      const actualStockEvidence = canonicalStockCompletionEvidence(state, order);
      if (sha256(JSON.stringify(actualStockEvidence)) !== sha256(JSON.stringify(evidence.stockEvidence))) return { status: "REVIEW_REQUIRED", reason: "Gereed-bewijs wijkt af van de immutable voorraadtoepassing of voorraadmutatie." };
      if (!validStockCompletionLedger(state, order, actualStockEvidence)) return { status: "REVIEW_REQUIRED", reason: "Voorraadtoepassing en fysieke voorraadmutatie vormen geen geldige, sluitende ledger." };
    }
    return { status: "CONFIRMED", reason: null };
  }
  if (order.stage !== "PRINT") return { status: "NOT_ELIGIBLE", reason: "De order is nog niet volledig fysiek geproduceerd." };
  const progress = productionProgressForOrder(state, order);
  const stockApplications = order.stockApplications ?? [];
  if (stockApplications.some(({ status }) => status !== "APPLIED")) return { status: "NOT_ELIGIBLE", reason: "Het voorraadlogo is nog niet fysiek toegepast." };
  if (productionLines.length > 0 && !progress?.trackedComplete) return { status: "NOT_ELIGIBLE", reason: "Niet alle vereiste productieregels zijn aan een fysieke productiegroep gekoppeld." };
  if (productionLines.length > 0 && !progress?.complete) return { status: "NOT_ELIGIBLE", reason: "Nog niet alle vereiste productiegroepen zijn Bedrukt." };
  if (!productionLines.length && !stockApplications.length) return { status: "NOT_ELIGIBLE", reason: "Er is geen aantoonbaar uitgevoerde fysieke productiestap." };
  return { status: "ELIGIBLE", reason: null };
}

function productionLineNestingSection(line) {
  const rank = productionLineTypeRank(line);
  return { key: ["initials", "back-numbers", "short-numbers", "names", "other"][rank], label: ["Initialen", "Rugnummers", "Shortnummers", "Namen / naambalken", "Overige opdrukken"][rank], rank };
}

function normalizedSourceValue(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/gu, "").trim().replace(/\s+/gu, " ").toLocaleLowerCase("nl-NL");
}

function currentArticleSourceIdentifier(article) {
  const articleNumber = String(article?.articleNumber ?? "").trim();
  return articleNumber || String(article?.id ?? "").match(/^sp-live-(.+)$/u)?.[1] || null;
}

function createStagedAssociationFromWebsite(change, userId) {
  const at = iso();
  return {
    id: `association-${randomBytes(8).toString("hex")}`, name: requiredText(change.label, "Verenigingsnaam", 120), sourceName: requiredText(change.label, "Bronnaam", 120), active: false,
    source: { file: "Sportpaleis live storefront", sheet: "Stage-only website-sync", range: String(change.sourceIdentifier).slice(0, 240) }, fontProfile: "DATA_GAP", foilColors: ["Onbekend"], defaultFoilColor: "Onbekend",
    dimensionsCm: { initialsShirt: null, backNumberJuniorSourceValue: null, backNumberSenior: null, chestNumber: null, shortsNumber: null, nameHeight: null }, juniorValidationStatus: "DATA_GAP", juniorPhysicalHeightMm: null, juniorGarmentSizes: [],
    juniorValidationNote: "Broncatalogus overgenomen; productie-instellingen zijn niet aangenomen.", notes: "Publieke clubstore overgenomen na menselijke review.", articleCatalogStatus: "DATA_GAP · productie-inrichting nog te beoordelen", revision: 1, updatedAt: at,
    catalogProvenance: { source: "SPORTPALEIS_LIVE_STOREFRONT", url: change.sourceIdentifier, sourceIdentifier: change.sourceIdentifier, fingerprint: change.sourceFingerprint ?? null, acceptedAt: at, acceptedBy: userId },
    validationHistory: [{ at, userId, field: "association", previous: null, next: { name: change.label, status: "DATA_GAP", active: false }, source: "Sportpaleis live storefront" }],
  };
}

function createStagedArticleFromWebsite(state, change, userId) {
  const source = change.sourceValue ?? {};
  const at = iso();
  return {
    id: `article-${randomBytes(8).toString("hex")}`, articleNumber: requiredText(change.sourceIdentifier, "Artikelnummer", 80), name: requiredText(source.name ?? change.label, "Artikelnaam", 120),
    imageKey: [...ARTICLE_IMAGE_KEYS][0], category: "Website · te beoordelen", association: requiredText(change.association, "Vereniging", 120), profileId: "profile-none", supports: [], active: false, revision: 1,
    variantLabels: [], availableSizes: [], personalizationPolicy: { mode: "none", fields: {} }, foilColorOverride: null, productionDataGaps: ["Productieprofiel, maatvoering en bedrukregels moeten menselijk worden bevestigd"],
    printRelevance: { status: "SOURCE_VISIBLE_PERSONALIZATION", source: source.productionRelevance?.evidence ?? "Sportpaleis live storefront", fields: source.productionRelevance?.fields ?? [] },
    catalogProvenance: { source: "SPORTPALEIS_LIVE_STOREFRONT", url: source.url, sourceIdentifier: change.sourceIdentifier, fingerprint: change.sourceFingerprint ?? null, acceptedAt: at, acceptedBy: userId },
    validation: { status: "DATA_GAP", source: "Sportpaleis live storefront · menselijke review", name: "SOURCE_CONFIRMED", sku: "SOURCE_CONFIRMED", image: "SOURCE_REFERENCE", variants: "DATA_GAP", sizes: "DATA_GAP", personalization: "SOURCE_VISIBLE_PERSONALIZATION" },
    validationHistory: [{ at, userId, previous: null, next: { articleNumber: change.sourceIdentifier, association: change.association, profileId: "profile-none", status: "DATA_GAP", active: false }, source: "Sportpaleis live storefront" }],
  };
}

function managedFontPhysicalOrientation() {
  // Productiegeometrie blijft in de bronoriëntatie. De nesting-engine vergelijkt
  // uitsluitend toegestane rigide 0°/90°-varianten en kiest de kortste baan.
  return "SOURCE";
}

function managedFontProductionPieces({ font, bytes, line, order, item, foilColor, copy }) {
  const digits = line.type === "NUMBER" && /^\d{2,4}$/u.test(line.content) ? Array.from(line.content) : null;
  const sourceOrderId = line.productionSupplement?.customerOrderLine === false ? `SUPPLEMENT:${line.id}` : order.id;
  const baseId = `${sourceOrderId}-${line.itemId ?? "unbound"}-${line.id}-${line.content}-${copy}`;
  const piece = (content, id = baseId) => createManagedFontProductionPiece({
    fontRecord: font,
    bytes,
    content,
    widthMm: line.widthMm,
    heightMm: line.heightMm,
    id,
    sourceOrderId,
    product: line.productionSupplement?.customerOrderLine === false ? "Interne folie-opvulling" : item?.product ?? "Productiefont",
    association: item?.association ?? order.association,
    foilColor,
    requestedHeightAxis: managedFontPhysicalOrientation(line),
  });
  if (!digits || digits.length < 2) return [piece(line.content)];

  const semanticId = `${order.id}:${line.id}:number:${line.content}:copy-${copy}`;
  return digits.map((digit, digitIndex) => ({
    ...piece(digit, `${baseId}-digit-${digitIndex + 1}-${digit}`),
    label: `${line.preview?.label ?? `Rugnummer ${line.content}`} · cijfer ${digit} (${digitIndex + 1}/${digits.length}) · exemplaar ${copy}/${line.quantity}`,
    printType: "Beheerde vectornummerbron · afzonderlijk cijfer",
    semanticGroup: {
      id: semanticId,
      kind: "MULTI_DIGIT_NUMBER",
      sourceLineId: line.id,
      ...(line.itemId ? { itemId: line.itemId } : {}),
      ...(item?.productionProfileId ? { productionProfileId: item.productionProfileId } : {}),
      value: line.content,
      digit,
      digitIndex,
      digitCount: digits.length,
      copyIndex: copy,
      copyCount: line.quantity,
      garmentCompositionSpacingMm: NUMBER_GLYPH_SPACING_MM,
    },
    assetIdentity: {
      assetId: font.id,
      assetVersion: font.version,
      geometryHash: font.sha256,
      sourceKind: "MANAGED_FONT",
    },
  }));
}

function productionLineWriterIdentity(state, line) {
  if (line.source?.kind === "FONT") {
    const font = state.productionFonts.find(({ id, version, sha256: hash, status }) => id === line.source.id && version === line.source.version && hash === line.source.sha256 && status === "TECHNICALLY_VALID");
    const admission = productionFontExecutableDecision(font, line.personalizationField || "FREE_PRINT");
    if (!font || !admission.allowed) throw Object.assign(new Error(admission.reason ?? `Fontbron ${line.source.id}@${line.source.version} is niet meer identiek resolveerbaar.`), { statusCode: 409, code: admission.code ?? "PRODUCTION_FONT_IDENTITY_MISMATCH" });
    return { id: CUTJOB_SVG_WRITER.id, version: CUTJOB_SVG_WRITER.version };
  }
  if (line.source?.kind === "PRODUCTION_SOURCE") {
    const source = productionSourceByIdentity(line.source.id, line.source.version);
    if (!source || source.content !== line.content || source.lineType !== line.type || source.sourceSetId !== line.source.sourceSetId || source.outputWriterId !== line.source.outputWriterId || source.outputWriterVersion !== line.source.outputWriterVersion) throw Object.assign(new Error(`Productiebron ${line.source.id}@${line.source.version} is niet meer identiek resolveerbaar.`), { statusCode: 409, code: "PRODUCTION_SOURCE_IDENTITY_MISMATCH" });
    return { id: source.outputWriterId, version: source.outputWriterVersion };
  }
  if (line.source?.kind === "PRODUCTION_ELEMENT") {
    const asset = state.productionElements.find(({ id, version, revision, lifecycleStatus, productionMethod }) => id === line.source.id && (version ?? String(revision)) === line.source.version && lifecycleStatus === "PRODUCTION_READY" && productionMethod === "SELF_PRODUCED");
    const variant = asset?.variants?.find(({ id }) => id === line.source.variantId);
    const admission = executableProductionAssetDecision(asset);
    if (!asset || !variant || !admission.allowed || !["GEOMETRY_VALIDATED", "PHYSICALLY_VALIDATED"].includes(productionElementProof(asset))) throw Object.assign(new Error(admission.reason ?? `Productieasset ${line.source.id}@${line.source.version} en variant ${line.source.variantId ?? "ontbreekt"} zijn niet meer exact uitvoerbaar.`), { statusCode: 409, code: admission.code ?? "PRODUCTION_ASSET_IDENTITY_MISMATCH" });
    return { id: CUTJOB_SVG_WRITER.id, version: CUTJOB_SVG_WRITER.version };
  }
  throw Object.assign(new Error("Een productieregel heeft nog geen exact uitvoerbare bron."), { statusCode: 409, code: "PRODUCTION_VECTOR_ARTIFACT_UNAVAILABLE" });
}

function finalProductionFinding(field, reason, { line = null, item = null, evidence = null, code = null } = {}) {
  return {
    field,
    reason,
    evidence: evidence ?? code ?? "Final Production Validator",
    ...(code ? { code } : {}),
    ...(line?.id ? { lineId: line.id } : {}),
    ...(line?.itemId ?? item?.id ? { itemId: line?.itemId ?? item?.id } : {}),
    ...(line ? { decoration: line.preview?.label ?? line.content ?? line.id } : {}),
  };
}

function profileSourceSetAppliesToField(profile, field) {
  return Boolean(profile?.productionSourceSetId && Array.isArray(profile.productionSourceSetFields) && profile.productionSourceSetFields.includes(field));
}

function canonicalLineSourceRequirement(state, association, profile, field, expectedHeightMm = 0) {
  if (profileSourceSetAppliesToField(profile, field)) return { kind: "VERIFIED_PRODUCTION_SOURCE_SET", sourceSetId: profile.productionSourceSetId, field, placement: field, provenance: profile.validation?.source ?? association?.fontEvidence?.provenance ?? null };
  const assignedAssetId = assignedProductionNumberAssetId(state, profile, field, expectedHeightMm);
  const assignmentEvidence = assignedProductionNumberAssetEvidence(profile, field, expectedHeightMm);
  if (assignedAssetId && assignmentEvidence?.authority === "HUMAN_ACCEPTANCE") return { kind: "VECTOR_GLYPH_SET", field, placement: field, assignedAssetId, assignedAssetVersion: assignmentEvidence.assetVersion, geometryHash: assignmentEvidence.sourceGeometryHash, provenance: `Human Acceptance · ${assignmentEvidence.assignmentHash}` };
  const referenceFields = Array.isArray(association?.fontEvidence?.referenceFields) ? association.fontEvidence.referenceFields : [];
  const vectorReference = referenceFields.includes(field) && association?.fontEvidence?.referenceKind === "VECTOR_CONTOUR_REFERENCE" ? association.fontEvidence.vectorReferenceAsset : null;
  if (vectorReference?.sha256) {
    return { kind: "VECTOR_GLYPH_SET", field, placement: field, filename: vectorReference.filename, sha256: vectorReference.sha256, provenance: association.fontEvidence.provenance };
  }
  return { kind: "MANAGED_FONT", field, placement: field, canonicalName: profile?.fontProfile ?? association?.fontEvidence?.canonicalName ?? null, provenance: association?.fontEvidence?.provenance ?? null };
}

function associationProfileApplications(state) {
  const rows = [];
  const seen = new Set();
  const add = (association, profile, field) => {
    const key = `${association.id}|${profile.id}|${field}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ key, association, profile, field });
  };
  for (const association of (state.associations ?? []).filter(({ active }) => active !== false)) {
    const prefix = `profile-source-${profileSlug(association.name)}-`;
    for (const profile of (state.productionProfiles ?? []).filter(({ id }) => id.startsWith(prefix))) {
      for (const field of profile.supports ?? []) add(association, profile, field);
    }
  }
  for (const article of (state.articles ?? []).filter(({ active }) => active !== false)) {
    const association = state.associations.find(({ id, name }) => id === article.association || name === article.association);
    if (!association || association.active === false) continue;
    for (const declaredField of article.supports ?? []) {
      const field = String(article.articleNumber) === "140298" && declaredField === "chestNumber" ? "initials" : declaredField;
      const profile = state.productionProfiles.find(({ id, supports }) => id === article.profileId && supports?.includes(field))
        ?? state.productionProfiles.find(({ id, supports }) => id === `profile-source-${profileSlug(association.name)}-${field}` && supports?.includes(field));
      if (!profile) continue;
      add(association, profile, field);
    }
  }
  return rows.sort((left, right) => left.key.localeCompare(right.key));
}

/**
 * Evaluate one real association/application binding. Candidate overrides are
 * used by the generated negative matrix; production callers normally omit it
 * and receive the exact canonical source selected by Product Truth.
 */
export function productionSourceAssociationDecision(state, { associationId, profileId, applicationField, candidate = null }) {
  const row = associationProfileApplications(state).find(({ association, profile, field }) => association.id === associationId && profile.id === profileId && field === applicationField);
  if (!row) return { allowed: false, code: "PRODUCTION_ASSOCIATION_CONTEXT_MISMATCH", reason: "Deze vereniging, toepassing en dit productieprofiel vormen geen bestaande authoritative association." };
  const { association, profile, field } = row;
  const requirement = canonicalLineSourceRequirement(state, association, profile, field);
  if (requirement.kind === "MANAGED_FONT") {
    if (candidate && candidate.kind !== "FONT") return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_TYPE_MISMATCH", reason: "Voor deze toepassing is een fontbron vereist." };
    const resolution = canonicalManagedFontResolution(state, profile);
    if (resolution.status !== "RESOLVED") return { allowed: false, code: `PRODUCTION_FONT_${resolution.status}`, reason: "De canonieke fontmaster is niet exact resolveerbaar.", requirement };
    const decision = productionFontAssociationDecision({ fonts: state.productionFonts, profile, application: field, selectedSourceId: candidate?.id ?? resolution.font.id });
    if (!decision.allowed) return { ...decision, requirement };
    if (candidate && !candidate.version) return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_VERSION_MISSING", reason: "De gekozen fontbron mist een immutable versie.", requirement };
    if (candidate?.version && candidate.version !== resolution.font.version) return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_VERSION_MISMATCH", reason: "De gekozen fontversie hoort niet bij de canonieke association.", requirement };
    if (candidate?.sha256 && String(candidate.sha256).toUpperCase() !== String(resolution.font.sha256).toUpperCase()) return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_HASH_MISMATCH", reason: "De gekozen bronbytes horen niet bij de canonieke association.", requirement };
    return { allowed: true, code: "PRODUCTION_ASSOCIATION_VALID", reason: null, requirement, source: { kind: "FONT", id: resolution.font.id, version: resolution.font.version, sha256: resolution.font.sha256 } };
  }
  if (requirement.kind === "VERIFIED_PRODUCTION_SOURCE_SET") {
    if (candidate && candidate.kind !== "VERIFIED_PRODUCTION_SOURCE_SET") return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_TYPE_MISMATCH", reason: "Voor deze toepassing is de geverifieerde production source set vereist.", requirement };
    if (candidate?.id && candidate.id !== requirement.sourceSetId) return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_ID_MISMATCH", reason: "De gekozen production source set hoort niet bij deze association.", requirement };
    const sources = availableProductionSourceIdentities().filter(({ sourceSetId, outputWriterId }) => sourceSetId === requirement.sourceSetId && (!profile.outputWriterId || outputWriterId === profile.outputWriterId));
    if (candidate && !candidate.version) return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_VERSION_MISSING", reason: "De gekozen production source set mist een immutable versie.", requirement };
    if (candidate?.version && !sources.some(({ version }) => version === candidate.version)) return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_VERSION_MISMATCH", reason: "De gekozen production-source-setversie hoort niet bij deze association.", requirement };
    return sources.length
      ? { allowed: true, code: "PRODUCTION_ASSOCIATION_VALID", reason: null, requirement, source: { kind: "VERIFIED_PRODUCTION_SOURCE_SET", id: requirement.sourceSetId, versions: [...new Set(sources.map(({ version }) => version))] } }
      : { allowed: false, code: "PRODUCTION_SOURCE_SET_UNRESOLVED", reason: "De geverifieerde production source set is niet uitvoerbaar aanwezig.", requirement };
  }
  if (candidate && candidate.kind !== "PRODUCTION_ELEMENT") return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_TYPE_MISMATCH", reason: "Voor deze toepassing is een SVG/vector-nummerset vereist.", requirement };
  const linked = associationNumberSet(state, association.name, { field, profileId: profile.id });
  const asset = candidate?.id ? state.productionElements.find(({ id }) => id === candidate.id) : linked.asset;
  if (!asset) return { allowed: false, code: linked.ambiguous ? "PRODUCTION_VECTOR_SOURCE_CONFLICT" : "PRODUCTION_VECTOR_SOURCE_MISSING", reason: "De authoritative SVG/vector-nummerset is niet exact beschikbaar.", requirement };
  const reuse = productionAssetReuseDecision({ asset, targetAssociationIdentities: [association.id, association.name], applicationField: field });
  if (!reuse.allowed) return { ...reuse, requirement };
  if (candidate && !candidate.version) return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_VERSION_MISSING", reason: "De gekozen vectorasset mist een immutable versie.", requirement };
  if (candidate?.version && candidate.version !== (asset.version ?? String(asset.revision))) return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_VERSION_MISMATCH", reason: "De gekozen vectorassetversie hoort niet bij deze association.", requirement };
  if (requirement.assignedAssetId && asset.id !== requirement.assignedAssetId) return { allowed: false, code: "PRODUCTION_ASSOCIATION_SOURCE_ID_MISMATCH", reason: "De SVG/vectorbron hoort niet bij dit productieprofiel.", requirement };
  return { allowed: true, code: "PRODUCTION_ASSOCIATION_VALID", reason: null, requirement, source: { kind: "PRODUCTION_ELEMENT", id: asset.id, version: asset.version ?? String(asset.revision) } };
}

/** Generate the complete current article/profile/application compatibility set. */
export function productionSourceCompatibilityMatrix(state) {
  const applicationRows = associationProfileApplications(state).map(({ key, association, profile, field }) => {
    const decision = productionSourceAssociationDecision(state, { associationId: association.id, profileId: profile.id, applicationField: field });
    const physicalHeightMm = representativeProductionApplicationHeightMm(association, profile, field);
    const physicalTruthProven = physicalHeightMm > 0;
    return {
      key,
      associationId: association.id,
      association: association.name,
      profileId: profile.id,
      application: field,
      representativeValue: field === "initials" ? "MW" : field === "name" ? "VAN DER MEER" : "34",
      physicalHeightMm: physicalTruthProven ? physicalHeightMm : null,
      expectedSourceType: decision.requirement?.kind ?? null,
      requirement: decision.requirement ?? null,
      source: decision.source ?? null,
      readiness: decision.allowed && physicalTruthProven ? "VALID" : "BLOCKED",
      code: decision.allowed && !physicalTruthProven ? "PRODUCTION_PHYSICAL_SIZE_UNPROVEN" : decision.code,
      reason: decision.allowed && !physicalTruthProven ? "De association mist een exacte fysieke Product Truth-maat voor deze toepassing." : decision.reason,
    };
  });
  const assetRows = [];
  for (const asset of (state.productionElements ?? []).filter(({ lifecycleStatus }) => lifecycleStatus === "PRODUCTION_READY")) {
    for (const application of asset.applications ?? []) {
      for (const context of (asset.contexts ?? []).filter(({ type }) => type === "ASSOCIATION")) {
        const association = state.associations.find(({ id, name }) => id === context.id || name === context.label);
        const executable = executableProductionAssetDecision(asset);
        const contextual = executable.allowed && association
          ? productionAssetContextDecision({ asset, orderKind: "ASSOCIATION", associationIdentities: [association.id, association.name] })
          : executable;
        const key = `${association?.id ?? context.id}|asset:${asset.id}|${application.kind}:${application.placement}`;
        const variant = asset.variants?.find(({ widthMm, heightMm }) => Number(widthMm) > 0 && Number(heightMm) > 0);
        const applicationField = application.kind !== "NUMBER_SET" ? null
          : /short|rok/iu.test(application.placement) ? "shortsNumber"
            : /borst|chest/iu.test(application.placement) ? "chestNumber"
              : "backNumber";
        const physicalHeightMm = Number(application.targetHeightMm ?? variant?.heightMm ?? asset.sizePolicy?.defaultHeightMm) || null;
        const canonicalAssociationSource = !applicationField || applicationRows.some((row) => row.associationId === association?.id
          && row.application === applicationField
          && row.readiness === "VALID"
          && row.source?.id === asset.id
          && Number(row.physicalHeightMm) === physicalHeightMm);
        const associationReady = contextual.allowed && canonicalAssociationSource;
        assetRows.push({ key, associationId: association?.id ?? context.id, association: association?.name ?? context.label, profileId: null, application: `${application.kind}:${application.placement}`, representativeValue: application.kind === "NUMBER_SET" ? "34" : asset.name, physicalHeightMm, expectedSourceType: application.kind === "NUMBER_SET" ? "VECTOR_GLYPH_SET" : "LOGO_ARTWORK", source: { kind: "PRODUCTION_ELEMENT", id: asset.id, version: asset.version ?? String(asset.revision), sha256: asset.sourceLayers?.vectorSource?.sha256 ?? null, geometrySha256: asset.controlledVector?.geometryHash ?? null }, softwareReadiness: executable.allowed ? "EXECUTABLE" : "BLOCKED", readiness: associationReady ? "VALID" : "BLOCKED", code: contextual.allowed && !canonicalAssociationSource ? "PRODUCTION_ASSET_NOT_CANONICAL_ASSOCIATION_SOURCE" : contextual.code, reason: contextual.allowed && !canonicalAssociationSource ? "De bronfile is technisch uitvoerbaar, maar is niet de actuele canonieke bron en fysieke variant van dit verenigingsprofiel." : contextual.reason });
      }
    }
  }
  return [...applicationRows, ...assetRows].sort((left, right) => left.key.localeCompare(right.key));
}

function canonicalLineSemantics(state, order, item, line, snapshot = null) {
  const field = line.personalizationField ?? line.decorationIdentity?.decorationType ?? null;
  const allowedTypes = field === "initials" ? ["INITIALS"] : field === "name" ? ["TEXT"] : ["backNumber", "chestNumber"].includes(field) ? ["NUMBER"] : field === "shortsNumber" ? (/^\d{1,4}$/u.test(String(line.content)) ? ["NUMBER"] : ["TEXT"]) : null;
  const profileId = line.decorationIdentity?.productionProfileId ?? item?.productionProfileId;
  const profiles = snapshot?.productionProfiles ?? state.productionProfiles;
  const profile = profiles.find(({ id }) => id === profileId);
  const associations = snapshot?.associationTruth ?? state.associations;
  const association = associations.find(({ id, name }) => id === item?.association || name === item?.association);
  const variant = (item?.variants ?? []).find(({ id }) => id === line.variantId)
    ?? (item?.variants ?? []).find(({ id }) => (line.variantIds ?? []).includes(id) && String((item.variants ?? []).find((candidate) => candidate.id === id)?.personalizationValues?.[field] ?? "").trim() === String(line.content ?? "").trim())
    ?? (item?.variants ?? []).find(({ personalizationValues }) => String(personalizationValues?.[field] ?? "").trim() === String(line.content ?? "").trim())
    ?? null;
  const expectedHeightMm = field ? profileFieldPhysicalHeightMm(association, profile, field, variant) : 0;
  return { field, allowedTypes, profileId, profile, association, expectedHeightMm, sourceRequirement: canonicalLineSourceRequirement(state, association, profile, field, expectedHeightMm) };
}

function approvedTeamkitRuleMatchesCurrentLine(line) {
  if (!line.teamkitProductionContext) return false;
  const current = teamkitPlacementRuleFromLine(line);
  const approvedHash = line.teamkitProductionContext.approvedProductionRuleHash;
  const recordedCurrentHash = line.teamkitProductionContext.currentProductionRuleHash;
  const exact = approvedHash && approvedHash === recordedCurrentHash && approvedHash === current.ruleHash;
    const intentExact = line.teamkitProductionContext.approvedProductionIntentHash
      && line.teamkitProductionContext.approvedProductionIntentHash === line.teamkitProductionContext.currentProductionIntentHash
      && line.teamkitProductionContext.currentProductionIntentHash === current.intentRuleHash
      && current.status === "RESOLVED";
  return Boolean(exact || intentExact);
}

function productionElementApplicationsForLine(line) {
  const field = line.personalizationField ?? line.decorationIdentity?.decorationType ?? null;
  if (["backNumber", "chestNumber", "shortsNumber"].includes(field)) return ["NUMBER_SET"];
  const explicitDecoration = line.decorationIdentity?.decorationType;
  const decoration = normalizedProductionIdentity(explicitDecoration ?? line.type);
  if (decoration.includes("sponsor")) return ["SPONSOR"];
  if (decoration.includes("logo")) return ["LOGO"];
  if (decoration.includes("artwork")) return ["ARTWORK"];
  // Legacy production lines used LOGO/PRODUCTION_ELEMENT as a visual transport
  // type before an exact decorationIdentity existed. Preserve those approved
  // lines, but never use this compatibility set when semantic identity exists.
  if (!explicitDecoration && ["LOGO", "PRODUCTION_ELEMENT"].includes(line.type)) return ["LOGO", "SPONSOR", "ARTWORK"];
  return [];
}

function productionElementPlacementMatchesField(application, field) {
  if (application.kind !== "NUMBER_SET") return true;
  const placement = normalizedProductionIdentity(application.placement);
  if (field === "backNumber") return placement.includes("rug");
  if (field === "shortsNumber") return placement.includes("short") || placement.includes("rok");
  if (field === "chestNumber") return placement.includes("borst");
  return false;
}

function explicitlyBoundFreeProductionLine(order, line, semantics) {
  const item = order?.items?.find(({ id }) => id === line.itemId);
  const identity = line.decorationIdentity;
  return Boolean(order?.orderKind === "CUSTOM"
    && item?.sourceType === "CUSTOM"
    && item.productionProfileId == null
    && !line.personalizationField
    && !semantics.association
    && !semantics.profile
    && identity?.orderId === order.id
    && identity.itemId === item.id
    && identity.value === line.content
    && identity.productionProfileId === line.source?.id);
}

function productionSourceRoleMatchesLine(state, order, line, semantics) {
  const kind = line.source?.kind;
  const freeProduction = explicitlyBoundFreeProductionLine(order, line, semantics);
  if (kind === "FONT") {
    if (!freeProduction && semantics.sourceRequirement?.kind !== "MANAGED_FONT") return false;
    if (!["TEXT", "INITIALS", "NUMBER"].includes(line.type)) return false;
    const selectedFont = state.productionFonts.find(({ id }) => id === line.source?.id);
    const profileResolution = semantics.profile ? canonicalManagedFontResolution(state, semantics.profile) : null;
    // A production profile is an authoritative source requirement, not a hint.
    // An unresolved, missing or conflicting canonical master can never be
    // substituted by another technically valid managed font.
    if (profileResolution && profileResolution.status !== "RESOLVED") return false;
    const requiredFont = profileResolution?.font ?? selectedFont;
    if (!requiredFont || requiredFont.status !== "TECHNICALLY_VALID" || !requiredFont.provenance || !/^[A-F0-9]{64}$/u.test(String(requiredFont.sha256 ?? "").toUpperCase())) return false;
    if (!productionFontExecutableDecision(requiredFont, freeProduction ? "FREE_PRINT" : semantics.field || "FREE_PRINT").allowed) return false;
    const exactIdentity = line.source.id === requiredFont.id
      && line.source.version === requiredFont.version
      && String(line.source.sha256 ?? "").toUpperCase() === String(requiredFont.sha256).toUpperCase();
    if (!exactIdentity) return false;
    if (requiredFont.authoritativeIdentity && requiredFont.authoritativeIdentity !== requiredFont.id) return false;
    if (normalizedProductionIdentity(requiredFont.name) === normalizedProductionIdentity(OWNER_SUPPLIED_FONT_EVIDENCE.spain.familyName)) {
      return requiredFont.sha256 === OWNER_SUPPLIED_FONT_EVIDENCE.spain.sha256
        && requiredFont.familyName === OWNER_SUPPLIED_FONT_EVIDENCE.spain.familyName
        && requiredFont.postscriptName === OWNER_SUPPLIED_FONT_EVIDENCE.spain.postscriptName;
    }
    return true;
  }
  if (kind === "PRODUCTION_SOURCE") {
    if (semantics.sourceRequirement?.kind !== "VERIFIED_PRODUCTION_SOURCE_SET") return false;
    if (!["TEXT", "INITIALS", "NUMBER"].includes(line.type) || !semantics.profile?.productionSourceSetId) return false;
    const source = productionSourceByIdentity(line.source.id, line.source.version);
    return Boolean(source
      && source.sourceSetId === semantics.profile.productionSourceSetId
      && line.source.sourceSetId === semantics.profile.productionSourceSetId
      && (!semantics.profile.outputWriterId || source.outputWriterId === semantics.profile.outputWriterId)
      && source.outputWriterId === line.source.outputWriterId
      && source.outputWriterVersion === line.source.outputWriterVersion);
  }
  if (kind === "PRODUCTION_ELEMENT") {
    const asset = state.productionElements.find(({ id, version, revision }) => id === line.source.id && (version ?? String(revision)) === line.source.version);
    const variant = asset?.variants?.find(({ id }) => id === line.source.variantId);
    if (!asset || !variant) return false;
    if (!executableProductionAssetDecision(asset).allowed) return false;
    if (!freeProduction && semantics.sourceRequirement?.kind === "VECTOR_GLYPH_SET") {
      const sourceRecord = state.productionAssetSources?.find(({ id }) => id === asset.sourceId);
      const exactReferencedSource = String(sourceRecord?.original?.sha256 ?? "").toUpperCase() === String(semantics.sourceRequirement.sha256).toUpperCase();
      const assignmentEvidence = assignedProductionNumberAssetEvidence(semantics.profile, semantics.field, semantics.expectedHeightMm);
      const assignmentEvidenceBody = assignmentEvidence ? {
        assetId: assignmentEvidence.assetId,
        assetVersion: assignmentEvidence.assetVersion,
        sourceGeometryHash: assignmentEvidence.sourceGeometryHash ?? null,
        targetHeightMm: Number(assignmentEvidence.targetHeightMm),
        sourceHeightMm: Number(assignmentEvidence.sourceHeightMm),
        authority: assignmentEvidence.authority,
      } : null;
      const exactHumanAcceptedReplacement = sourceRecord?.conversion?.method === "HUMAN_VERIFIED_SVG"
        && sourceRecord?.fidelity?.status === "MATCHED"
        && assignmentEvidence?.authority === "HUMAN_ACCEPTANCE"
        && assignmentEvidence.assetId === asset.id
        && assignmentEvidence.assetVersion === (asset.version ?? String(asset.revision))
        && assignmentEvidence.sourceGeometryHash === asset.sourceSelection?.geometryHash
        && assignmentEvidence.assignmentHash === sha256(JSON.stringify(assignmentEvidenceBody));
      const exactAssignedSource = semantics.sourceRequirement.assignedAssetId === asset.id
        && semantics.sourceRequirement.assignedAssetVersion === (asset.version ?? String(asset.revision))
        && semantics.sourceRequirement.geometryHash === asset.sourceSelection?.geometryHash
        && sourceRecord?.fidelity?.status === "MATCHED";
      if (!exactReferencedSource && !exactHumanAcceptedReplacement && !exactAssignedSource) return false;
    }
    const identity = line.decorationIdentity;
    if (identity?.assetId && (identity.assetId !== asset.id || identity.assetVersion !== (asset.version ?? String(asset.revision)))) return false;
    const requiredApplications = freeProduction && line.type === "NUMBER" ? ["NUMBER_SET"] : productionElementApplicationsForLine(line);
    const applications = asset.applications ?? [];
    const application = requiredApplications.includes("NUMBER_SET")
      ? applications.find(({ kind: applicationKind, placement }) => String(applicationKind).toUpperCase() === "NUMBER_SET" && (freeProduction || productionElementPlacementMatchesField({ kind: "NUMBER_SET", placement }, semantics.field)))
      : applications.find(({ kind: applicationKind }) => requiredApplications.includes(String(applicationKind).toUpperCase()));
    if (!requiredApplications.length || !application) return false;
    if (requiredApplications.includes("NUMBER_SET")) {
      const content = String(line.content ?? "");
      if (line.type !== "NUMBER") return false;
      if (!/^\d{1,4}$/u.test(content)) return false;
      if (asset.numberGlyphs && [...content].some((digit) => !asset.numberGlyphs[digit])) return false;
      const assignmentEvidence = assignedProductionNumberAssetEvidence(semantics.profile, semantics.field, semantics.expectedHeightMm);
      const assignmentEvidenceBody = assignmentEvidence ? {
        assetId: assignmentEvidence.assetId,
        assetVersion: assignmentEvidence.assetVersion,
        sourceGeometryHash: assignmentEvidence.sourceGeometryHash ?? null,
        targetHeightMm: Number(assignmentEvidence.targetHeightMm),
        sourceHeightMm: Number(assignmentEvidence.sourceHeightMm),
        authority: assignmentEvidence.authority,
      } : null;
      const explicitlyAuthorizedTarget = assignmentEvidence?.authority === "HUMAN_ACCEPTANCE"
        && assignmentEvidence.assetId === asset.id
        && assignmentEvidence.assetVersion === (asset.version ?? String(asset.revision))
        && assignmentEvidence.sourceGeometryHash === (asset.sourceSelection?.geometryHash ?? null)
        && assignmentEvidence.assignmentHash === sha256(JSON.stringify(assignmentEvidenceBody))
        && Math.abs(Number(assignmentEvidence.targetHeightMm) - Number(semantics.expectedHeightMm)) <= 0.01
        && Math.abs(Number(assignmentEvidence.sourceHeightMm) - Number(variant.heightMm)) <= 0.01;
      if (Number(semantics.expectedHeightMm) > 0 && Math.abs(Number(variant.heightMm) - Number(semantics.expectedHeightMm)) > 0.01 && !explicitlyAuthorizedTarget) return false;
      if (asset.sizePolicy?.mode === "FIXED" && Number(line.heightMm) > 0 && Math.abs(Number(variant.heightMm) - Number(line.heightMm)) > 0.01 && !explicitlyAuthorizedTarget) return false;
      if (order?.orderKind !== "CUSTOM") {
        const assignedAssetId = assignedProductionNumberAssetId(state, semantics.profile, semantics.field, semantics.expectedHeightMm);
        if (assignedAssetId ? assignedAssetId !== asset.id : !semantics.profile?.productionNumberAssetIds?.includes(asset.id)) return false;
      }
    }
    const item = order?.items?.find(({ id }) => id === line.itemId);
    const association = item ? state.associations.find(({ id, name }) => id === item.association || name === item.association) : null;
    const contextDecision = productionAssetContextDecision({
      asset,
      orderKind: order?.orderKind,
      associationIdentities: [item?.association, association?.id, association?.name].filter(Boolean),
      articleIdentities: [item?.id, item?.articleId, item?.articleNumber].filter(Boolean),
      orderId: order?.id,
    });
    if (!contextDecision.allowed) return false;
    if (!requiredApplications.includes("NUMBER_SET")) {
      const policy = asset.sizePolicy;
      const widthMm = Number(line.widthMm);
      const heightMm = Number(line.heightMm);
      const defaultWidthMm = Number(policy?.defaultWidthMm ?? variant.widthMm);
      const defaultHeightMm = Number(policy?.defaultHeightMm ?? variant.heightMm);
      if (policy?.mode === "FIXED" && (Math.abs(widthMm - defaultWidthMm) > 0.01 || Math.abs(heightMm - defaultHeightMm) > 0.01)) return false;
      if (policy?.mode === "DEFAULT_WITH_LIMITS" && (widthMm < Number(policy.minWidthMm) || widthMm > Number(policy.maxWidthMm))) return false;
      if (defaultWidthMm > 0 && defaultHeightMm > 0 && Math.abs((widthMm / heightMm) - (defaultWidthMm / defaultHeightMm)) > 0.002) return false;
    }
    return requiredApplications.includes("NUMBER_SET") || ["LOGO", "PRODUCTION_ELEMENT"].includes(line.type);
  }
  return false;
}

/**
 * Single consequential gate used before a projection is called PROVEN and
 * before any physical proposal/job is materialised. UI routes may collect
 * intent differently; they cannot bypass this production contract.
 */
export function validateFinalProductionTruth(state, order, lines = productionLinesForOrder(state, order), { allowHistoricalSourceSnapshot = false } = {}) {
  const productionLines = structuredClone(lines ?? []);
  const snapshot = allowHistoricalSourceSnapshot ? order.productionExecutionSnapshot : null;
  const validationOrder = snapshot ? {
    ...order,
    sourceContext: structuredClone(snapshot.sourceContext ?? order.sourceContext),
    association: snapshot.association ?? order.association,
    associations: structuredClone(snapshot.associations ?? order.associations ?? []),
    items: structuredClone(snapshot.items ?? order.items ?? []),
    productionLines,
  } : order;
  const findings = [];
  if (!productionLines.length) findings.push(finalProductionFinding("PRODUCTION_LINES", "Er zijn geen canonieke productieregels om uit te voeren.", { code: "PRODUCTION_VECTOR_ARTIFACT_UNAVAILABLE" }));
  const lineIds = productionLines.map(({ id }) => String(id ?? "").trim());
  if (lineIds.some((id) => !id) || new Set(lineIds).size !== lineIds.length) findings.push(finalProductionFinding("DECORATION_CARDINALITY", "Iedere fysieke productieregel moet exact één unieke identity hebben.", { code: "PRODUCTION_DECORATION_CARDINALITY_MISMATCH" }));

  for (const item of validationOrder.items ?? []) {
    const variants = (item.variants ?? []).filter((variant) => nonEmptyPersonalization(variant.personalizationValues));
    const cardinalityFinding = structuredVariantCardinalityFinding(order, item, 0, variants);
    if (cardinalityFinding) findings.push(finalProductionFinding("CARDINALITY", cardinalityFinding.reason, { item, evidence: cardinalityFinding.evidence, code: "PRODUCTION_DECORATION_CARDINALITY_MISMATCH" }));
    for (const variant of variants) if (String(variant.personalizationValues?.backNumber ?? "").trim()) {
      const sizeClass = String(variant.personalizationValues?.backNumberSizeClass ?? variant.backNumberProduction?.sizeClass ?? "").trim().toUpperCase();
      if (!CANONICAL_BACK_NUMBER_SIZE_CLASSES.has(sizeClass)) findings.push(finalProductionFinding("SIZE_CLASS", `Rugnummer ${variant.personalizationValues.backNumber} heeft geen canonieke JUNIOR/SENIOR-productieklasse.`, { item, evidence: `Ontvangen klasse: ${sizeClass || "ontbreekt"}`, code: "PRODUCTION_SIZE_CLASS_INVALID" }));
    }
  }

  for (const line of productionLines) {
    const item = validationOrder.items?.find(({ id }) => id === line.itemId);
    const identity = productionDecorationIdentity(validationOrder, line);
    if (!item) findings.push(finalProductionFinding("ITEM_IDENTITY", "De productieregel mist de oorspronkelijke orderregel.", { line, code: "PRODUCTION_DECORATION_IDENTITY_MISSING" }));
    const canonicalArticleIdentity = item ? item.articleNumber || item.articleId || item.id : null;
    if (!identity || identity.orderId !== order.id || identity.itemId !== line.itemId || identity.articleNumber !== canonicalArticleIdentity || identity.value !== line.content || !identity.decorationType || !identity.placement || !identity.foilColor || !identity.productionProfileId) findings.push(finalProductionFinding("DECORATION_IDENTITY", "De canonieke decoration identity is onvolledig of wijkt af van de orderbron.", { line, code: "PRODUCTION_DECORATION_IDENTITY_MISSING" }));
    if (!(Number(line.widthMm) > 0) || !(Number(line.heightMm) > 0)) findings.push(finalProductionFinding("DIMENSIONS", "De fysieke productiegeometrie moet positief en expliciet zijn.", { line, code: "PRODUCTION_DIMENSIONS_INVALID" }));
    if (!Number.isInteger(Number(line.quantity)) || Number(line.quantity) < 1) findings.push(finalProductionFinding("QUANTITY", "Het fysieke aantal moet een positief geheel getal zijn.", { line, code: "PRODUCTION_QUANTITY_INVALID" }));
    if (line.validation?.status !== "VALID") findings.push(finalProductionFinding("LINE_VALIDATION", line.validation?.reason || "De productieregel is niet gevalideerd.", { line, code: "PRODUCTION_LINE_BLOCKED" }));
    const semantics = canonicalLineSemantics(state, validationOrder, item, line, snapshot);
    if (["FONT", "PROFILE"].includes(line.source?.kind) && ["TEXT", "INITIALS", "NUMBER"].includes(line.type) && semantics.profile && semantics.sourceRequirement?.kind === "MANAGED_FONT") {
      const canonicalFont = canonicalManagedFontResolution(state, semantics.profile);
      if (canonicalFont.status !== "RESOLVED") findings.push(finalProductionFinding("CANONICAL_FONT_SOURCE", `De canonieke fontmaster ${semantics.profile.fontProfile || "ontbreekt"} is ${canonicalFont.status.toLocaleLowerCase("nl-NL")} en blokkeert fysieke productie.`, { line, evidence: JSON.stringify(canonicalFont.provenance), code: `PRODUCTION_CANONICAL_FONT_${canonicalFont.status}` }));
    }
    if (semantics.sourceRequirement?.kind === "VECTOR_GLYPH_SET") {
      const exactSourceAvailable = state.productionElements.some((asset) => {
        if (semantics.sourceRequirement.assignedAssetId) return asset.id === semantics.sourceRequirement.assignedAssetId
          && (asset.version ?? String(asset.revision)) === semantics.sourceRequirement.assignedAssetVersion
          && asset.sourceSelection?.geometryHash === semantics.sourceRequirement.geometryHash
          && executableProductionAssetDecision(asset).allowed;
        const sourceRecord = state.productionAssetSources?.find(({ id }) => id === asset.sourceId);
        if (String(sourceRecord?.original?.sha256 ?? "").toUpperCase() === String(semantics.sourceRequirement.sha256).toUpperCase()) return true;
        const evidence = assignedProductionNumberAssetEvidence(semantics.profile, semantics.field, semantics.expectedHeightMm);
        const evidenceBody = evidence ? { assetId: evidence.assetId, assetVersion: evidence.assetVersion, sourceGeometryHash: evidence.sourceGeometryHash ?? null, targetHeightMm: Number(evidence.targetHeightMm), sourceHeightMm: Number(evidence.sourceHeightMm), authority: evidence.authority } : null;
        return sourceRecord?.conversion?.method === "HUMAN_VERIFIED_SVG" && sourceRecord?.fidelity?.status === "MATCHED" && evidence?.authority === "HUMAN_ACCEPTANCE" && evidence.assetId === asset.id && evidence.assetVersion === (asset.version ?? String(asset.revision)) && evidence.sourceGeometryHash === asset.sourceSelection?.geometryHash && evidence.assignmentHash === sha256(JSON.stringify(evidenceBody));
      });
      if (!exactSourceAvailable) findings.push(finalProductionFinding("CANONICAL_VECTOR_SOURCE", `De gecontroleerde nummerbron ${semantics.sourceRequirement.filename} is nog niet als uitvoerbare productiebron gekoppeld.`, { line, evidence: JSON.stringify({ filename: semantics.sourceRequirement.filename, sha256: semantics.sourceRequirement.sha256, association: semantics.association?.name }), code: "PRODUCTION_CANONICAL_VECTOR_SOURCE_UNRESOLVED" }));
    }
    if (semantics.allowedTypes && !semantics.allowedTypes.includes(line.type)) findings.push(finalProductionFinding("DECORATION_TYPE", `${semantics.field} kan niet als fysieke regeltype ${line.type} worden uitgevoerd.`, { line, evidence: `Toegestaan: ${semantics.allowedTypes.join(", ")}`, code: "PRODUCTION_DECORATION_SEMANTICS_MISMATCH" }));
    const approvedTeamkitRule = approvedTeamkitRuleMatchesCurrentLine(line);
    if (line.personalizationField && identity?.placement !== line.personalizationField && !approvedTeamkitRule) findings.push(finalProductionFinding("PLACEMENT", "De fysieke placement wijkt af van de canonieke decoration-betekenis of approved Teamwear-regel.", { line, evidence: `${line.personalizationField} ≠ ${identity?.placement}`, code: "PRODUCTION_PLACEMENT_MISMATCH" }));
    if (line.teamkitProductionContext && !approvedTeamkitRule) findings.push(finalProductionFinding("TEAMWEAR_RULE", "De Teamwear-regel is niet exact aan de approved en opnieuw berekende productiewaarheid gebonden.", { line, code: "TEAMWEAR_APPROVED_RULE_MISMATCH" }));
    if (!productionSourceRoleMatchesLine(state, validationOrder, line, semantics)) findings.push(finalProductionFinding("SOURCE_ROLE", `Bronrol ${line.source?.kind ?? "ontbreekt"} is niet exact toepasbaar op vereniging, profiel, decoration, fysieke maat en variant.`, { line, code: "PRODUCTION_SOURCE_ROLE_MISMATCH" }));
    if (semantics.expectedHeightMm > 0 && !approvedTeamkitRule && Math.abs(Number(line.heightMm) - semantics.expectedHeightMm) > .001) {
      const explicit = line.physicalTruth?.authority === "HUMAN_CONFIRMED_HISTORICAL_RECONCILIATION" && Number(line.physicalTruth?.valueMm) === Number(line.heightMm) && line.physicalTruth?.confirmedAt && line.physicalTruth?.confirmedBy;
      if (!explicit) findings.push(finalProductionFinding("DIMENSIONS", "De fysieke hoogte wijkt zonder expliciet bevestigd historisch bewijs af van de canonieke profielregel.", { line, evidence: `regel ${line.heightMm} mm · profiel ${semantics.expectedHeightMm} mm`, code: "PRODUCTION_DIMENSIONS_TRUTH_MISMATCH" }));
    }
    if (!allowHistoricalSourceSnapshot) {
      if (!managedFoilColor(state, productionLineFoilColor(state, order, line))) findings.push(finalProductionFinding("FOIL_COLOR", "De fysieke foliekleur is niet actief beheerd.", { line, code: "PRODUCTION_FOIL_COLOR_UNMANAGED" }));
      try { productionLineWriterIdentity(state, line); } catch (error) { findings.push(finalProductionFinding("PRODUCTION_SOURCE", error.message, { line, code: error.code ?? "PRODUCTION_VECTOR_ARTIFACT_UNAVAILABLE" })); }
      try { assertPioneersNumberSource(state, validationOrder, line); } catch (error) { findings.push(finalProductionFinding("PRODUCTION_SOURCE", error.message, { line, code: error.code })); }
      try { assertScBuitenboysShortSource(state, validationOrder, line); } catch (error) { findings.push(finalProductionFinding("PRODUCTION_SOURCE", error.message, { line, code: error.code })); }
    }
  }
  if (productionLines.length) {
    const effectiveOrder = { ...validationOrder, productionLines };
    const hasStructuredCardinalitySource = (validationOrder.items ?? []).some((item) => (item.variants ?? []).some((variant) => nonEmptyPersonalization(variant.personalizationValues)) || nonEmptyPersonalization(item.personalizationValues));
    if (!allowHistoricalSourceSnapshot || hasStructuredCardinalitySource) try { assertOrderProductionDecorationCardinality(state, effectiveOrder); } catch (error) { findings.push(finalProductionFinding("DECORATION_CARDINALITY", error.message, { evidence: JSON.stringify({ code: error.code, identity: error.identity, expected: error.expected, actual: error.actual }), code: error.code })); }
    if (!allowHistoricalSourceSnapshot) try { assertProductionAssetContexts(state, productionLines, validationOrder); } catch (error) { findings.push(finalProductionFinding("SOURCE_CONTEXT", error.message, { code: error.code })); }
  }
  const normalized = findings.map((finding) => ({ ...finding })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  const validationBody = { version: FINAL_PRODUCTION_VALIDATOR_VERSION, orderId: order.id, orderRevision: order.revision, lineHash: sha256(JSON.stringify(productionLines)), findings: normalized };
  return { ...validationBody, status: normalized.length ? "BLOCKED" : "VALID", validationHash: sha256(JSON.stringify(validationBody)) };
}

function productionEligibilityForOrder(state, order) {
  const productionLines = productionLinesForOrder(state, order);
  if (!productionLines.length) return { productionLines, eligibleLines: [], blockedLines: [], findings: [finalProductionFinding("PRODUCTION_LINES", "Er zijn geen canonieke productieregels om uit te voeren.", { code: "PRODUCTION_VECTOR_ARTIFACT_UNAVAILABLE" })] };
  const validation = validateFinalProductionTruth(state, { ...order, productionLines }, productionLines, { allowHistoricalSourceSnapshot: Boolean(order.productionExecutionSnapshot) });
  const globalFindings = validation.findings.filter(({ lineId }) => !lineId);
  const blockedLineIds = new Set(validation.findings.map(({ lineId }) => lineId).filter(Boolean));
  const eligibleLines = globalFindings.length ? [] : productionLines.filter((line) => line.validation?.status === "VALID" && !blockedLineIds.has(line.id));
  const eligibleLineIds = new Set(eligibleLines.map(({ id }) => id));
  return {
    productionLines,
    eligibleLines,
    blockedLines: productionLines.filter(({ id }) => !eligibleLineIds.has(id)),
    findings: validation.findings,
    validation,
  };
}

function productionExecutionSnapshotBody(state, order, productionLines, validation, actor, at) {
  const profileIds = [...new Set(productionLines.map(({ decorationIdentity }) => decorationIdentity?.productionProfileId).filter(Boolean))];
  return {
    version: PRODUCTION_EXECUTION_SNAPSHOT_VERSION,
    orderId: order.id,
    orderRevision: order.revision,
    sourceTruthHash: existingOrderHistoricalSourceHash(order),
    sourceContext: structuredClone(order.sourceContext ?? null),
    association: order.association,
    associations: structuredClone(order.associations ?? []),
    items: structuredClone(order.items ?? []),
    associationTruth: structuredClone(state.associations.filter(({ id, name }) => (order.items ?? []).some((item) => item.association === id || item.association === name))),
    productionLines: structuredClone(productionLines),
    productionProfiles: profileIds.map((id) => structuredClone(state.productionProfiles.find((profile) => profile.id === id))).filter(Boolean),
    finalValidation: structuredClone(validation),
    capturedAt: at,
    capturedBy: { userId: actor.id, userName: actor.name, role: actor.role },
  };
}

function materializeProductionExecutionSnapshot(state, order, actor, { reason = "CONSEQUENTIAL_PRODUCTION_GATE", eligibleLineRefs = null } = {}) {
  if (order.productionExecutionSnapshot?.executionHash) {
    const integrity = verifyProductionExecutionSnapshot(order);
    if (!integrity.valid) throw Object.assign(new Error(integrity.reason), { statusCode: 409, code: "PRODUCTION_EXECUTION_SNAPSHOT_INVALID", integrity });
    return order.productionExecutionSnapshot;
  }
  const productionLines = structuredClone(order.productionLines?.length ? order.productionLines : reconcileExistingOrderProductionTruth(state, order).productionLines);
  const validation = validateFinalProductionTruth(state, { ...order, productionLines }, productionLines);
  if (validation.status !== "VALID") {
    const selectedIds = eligibleLineRefs ? new Set(eligibleLineRefs.filter(({ orderId }) => orderId === order.id).map(({ lineId }) => lineId)) : null;
    const eligibility = productionEligibilityForOrder(state, { ...order, productionLines });
    const eligibleIds = new Set(eligibility.eligibleLines.map(({ id }) => id));
    const exactEligibleSubset = selectedIds?.size && [...selectedIds].every((id) => eligibleIds.has(id));
    if (!exactEligibleSubset) throw Object.assign(new Error(validation.findings[0]?.reason ?? "De finale productiewaarheid is niet valide."), { statusCode: 409, code: validation.findings[0]?.code ?? "FINAL_PRODUCTION_VALIDATION_FAILED", findings: validation.findings });
  }
  const at = iso();
  const body = { ...productionExecutionSnapshotBody(state, order, productionLines, validation, actor, at), reason };
  order.productionExecutionSnapshot = { ...body, executionHash: sha256(JSON.stringify(body)) };
  order.productionLines = structuredClone(productionLines);
  order.eventHistory ??= [];
  order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_EXECUTION_TRUTH_FROZEN", at, userId: actor.id, userName: actor.name, source: reason, details: { executionHash: order.productionExecutionSnapshot.executionHash, validatorVersion: validation.version, validationHash: validation.validationHash, productionLineIds: productionLines.map(({ id }) => id) } });
  audit(state, actor.id, "Immutable productie-uitvoering vastgelegd", order.id, { reason, executionHash: order.productionExecutionSnapshot.executionHash, validatorVersion: validation.version, validationHash: validation.validationHash, productionLineIds: productionLines.map(({ id }) => id) });
  return order.productionExecutionSnapshot;
}

function verifyProductionExecutionSnapshot(order) {
  const snapshot = order.productionExecutionSnapshot;
  if (!snapshot?.executionHash) return { valid: false, reason: "Immutable execution snapshot ontbreekt." };
  const { executionHash, ...body } = snapshot;
  const actual = sha256(JSON.stringify(body));
  if (actual !== executionHash) return { valid: false, reason: "Immutable execution snapshot-hash wijkt af.", code: "PRODUCTION_EXECUTION_SNAPSHOT_HASH_MISMATCH", expected: executionHash, actual };
  const currentSourceTruthHash = existingOrderHistoricalSourceHash(order);
  if (snapshot.sourceTruthHash && snapshot.sourceTruthHash !== currentSourceTruthHash) return { valid: false, reason: "De orderbron is gewijzigd nadat de productie-uitvoering werd vastgelegd.", code: "PRODUCTION_EXECUTION_SNAPSHOT_STALE", expected: snapshot.sourceTruthHash, actual: currentSourceTruthHash, executionHash };
  return { valid: true, executionHash, sourceTruthHash: snapshot.sourceTruthHash ?? null };
}

function correctionLineIdentity(line) {
  return JSON.stringify([
    line.itemId ?? null,
    line.variantId ?? line.decorationIdentity?.occurrenceId ?? null,
    line.personalizationField ?? null,
    line.placementRole ?? null,
    line.decorationIdentity?.placement ?? null,
    line.content,
    Number(line.quantity),
    Number(line.heightMm),
  ]);
}

function reprojectRejectedProductionExecution(state, order, actor, rejectedJob, reason) {
  const integrity = verifyProductionExecutionSnapshot(order);
  if (!integrity.valid) throw Object.assign(new Error(integrity.reason), { statusCode: 409, code: integrity.code ?? "PRODUCTION_EXECUTION_SNAPSHOT_INVALID", integrity });
  const previous = structuredClone(order.productionExecutionSnapshot);
  const priorByIdentity = new Map();
  for (const line of previous.productionLines) {
    const key = correctionLineIdentity(line);
    const matches = priorByIdentity.get(key) ?? [];
    matches.push(line);
    priorByIdentity.set(key, matches);
  }
  const projected = resolveCanonicalProductionLines(state, order.id, order.items ?? []);
  const nextLines = projected.map((line) => {
    const key = correctionLineIdentity(line);
    const matches = priorByIdentity.get(key) ?? [];
    if (matches.length !== 1) throw Object.assign(new Error("De afgekeurde uitvoering kan niet één-op-één naar actuele Product Truth worden geprojecteerd."), { statusCode: 409, code: "PRODUCTION_REJECTION_REPROJECTION_MISMATCH", orderId: order.id, identity: JSON.parse(key), matchCount: matches.length });
    priorByIdentity.delete(key);
    return { ...line, id: matches[0].id };
  });
  if (priorByIdentity.size || nextLines.length !== previous.productionLines.length) throw Object.assign(new Error("De actuele Product Truth wijzigt meer dan alleen de afgekeurde productiebron."), { statusCode: 409, code: "PRODUCTION_REJECTION_REPROJECTION_SCOPE_MISMATCH", orderId: order.id });
  const validation = validateFinalProductionTruth(state, { ...order, productionLines: nextLines }, nextLines);
  if (validation.status !== "VALID") throw Object.assign(new Error(validation.findings[0]?.reason ?? "De gecorrigeerde productiewaarheid is niet uitvoerbaar."), { statusCode: 409, code: validation.findings[0]?.code ?? "FINAL_PRODUCTION_VALIDATION_FAILED", findings: validation.findings });
  const at = iso();
  order.productionExecutionHistory ??= [];
  order.productionExecutionHistory.push({ ...previous, invalidatedAt: at, invalidatedBy: actor.id, invalidationReason: reason, rejectedProductionJobId: rejectedJob.id, rejectedProductionJobNumber: rejectedJob.jobNumber, immutableArtifactSha256: rejectedJob.snapshot.artifact.sha256 });
  const body = { ...productionExecutionSnapshotBody(state, order, nextLines, validation, actor, at), reason: "HUMAN_REJECTED_SOURCE_CORRECTION" };
  order.productionExecutionSnapshot = { ...body, executionHash: sha256(JSON.stringify(body)) };
  order.productionLines = structuredClone(nextLines);
  return { previousExecutionHash: previous.executionHash, executionHash: order.productionExecutionSnapshot.executionHash, productionLines: nextLines };
}

function invalidateOpenProductionTruth(state, order, actor, reason) {
  const hasConsequentialJob = (state.productionJobs ?? []).some((job) => job.orders?.some(({ id }) => id === order.id) || job.snapshot?.orderIds?.includes(order.id) || job.snapshot?.orders?.some(({ id }) => id === order.id));
  if (hasConsequentialJob) throw Object.assign(new Error("De order heeft al een fysieke productie-uitvoering; wijzig de bronwaarheid alleen via een nieuwe auditable correctie-execution."), { statusCode: 409, code: "PRODUCTION_EXECUTION_IMMUTABLE" });
  const at = iso();
  const priorSnapshot = order.productionExecutionSnapshot ? structuredClone(order.productionExecutionSnapshot) : null;
  const invalidatedProposalIds = [];
  for (const proposal of state.productionProposals ?? []) {
    if (proposal.status !== "OPEN" || !(proposal.orders ?? []).some(({ id }) => id === order.id)) continue;
    proposal.status = "INVALIDATED";
    proposal.invalidatedAt = at;
    proposal.invalidatedBy = actor.id;
    proposal.invalidationReason = reason;
    for (const group of proposal.groups ?? []) if (group.status === "OPEN") group.status = "INVALIDATED";
    invalidatedProposalIds.push(proposal.id);
  }
  if (priorSnapshot) {
    order.productionExecutionHistory ??= [];
    order.productionExecutionHistory.push({ ...priorSnapshot, invalidatedAt: at, invalidatedBy: actor.id, invalidationReason: reason });
    delete order.productionExecutionSnapshot;
  }
  if (priorSnapshot || invalidatedProposalIds.length) {
    order.eventHistory ??= [];
    order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_EXECUTION_TRUTH_INVALIDATED", at, userId: actor.id, userName: actor.name, source: "material-order-correction", details: { reason, priorExecutionHash: priorSnapshot?.executionHash ?? null, invalidatedProposalIds } });
    audit(state, actor.id, "Productie-uitvoering ongeldig gemaakt na bronwijziging", order.id, { reason, priorExecutionHash: priorSnapshot?.executionHash ?? null, invalidatedProposalIds });
  }
}

function canonicalProductionProposalIntentKey(orders) {
  return sha256(JSON.stringify(orders.map(({ id, productionExecutionSnapshot, revision }) => ({ id, revision, executionHash: productionExecutionSnapshot?.executionHash ?? null })).sort((left, right) => left.id.localeCompare(right.id))));
}

function openProductionProposalOverlap(state, orderIds) {
  const selected = new Set(orderIds);
  return (state.productionProposals ?? []).find(({ status, orders }) => status === "OPEN" && (orders ?? []).some(({ id }) => selected.has(id))) ?? null;
}

function buildProductionProposalGroups(state, orders) {
  const grouped = new Map();
  for (const order of orders) {
    const eligibility = productionEligibilityForOrder(state, order);
    const productionLines = eligibility.eligibleLines;
    const effectiveOrder = { ...order, productionLines: eligibility.productionLines };
    if (!productionLines.length) throw Object.assign(new Error(`${order.id}: geen gevalideerde productieregels voor een productievoorstel.`), { statusCode: 409, code: "PRODUCTION_VECTOR_ARTIFACT_UNAVAILABLE", findings: eligibility.findings });
    for (const line of productionLines) {
      assertPioneersNumberSource(state, effectiveOrder, line);
      assertScBuitenboysShortSource(state, effectiveOrder, line);
      const writer = productionLineWriterIdentity(state, line);
      const foilColor = productionLineFoilColor(state, effectiveOrder, line);
      const sourceChannel = order.sourceContext?.source ?? "STORE";
      const key = `${sourceChannel}|${foilColor.toLocaleLowerCase("nl-NL")}|${writer.id}@${writer.version}`;
      const group = grouped.get(key) ?? { sourceChannel, foilColor, outputWriter: writer, entries: [] };
      group.entries.push({ order, line });
      grouped.set(key, group);
    }
  }
  return [...grouped.values()].map(({ sourceChannel, foilColor, outputWriter, entries: unsortedEntries }) => {
    const entries = stableProductionTypeSort(unsortedEntries);
    const groupOrders = [...new Map(entries.map(({ order }) => [order.id, order])).values()];
    return {
      id: `production-group-${randomBytes(10).toString("hex")}`,
      label: `${foilColor}${sourceChannel === "STORE" ? "" : ` · ${productionSourceLabel(sourceChannel)}`} — ${groupOrders.length} ${groupOrders.length === 1 ? "order" : "orders"}`,
      foilColor,
      sourceChannel,
      outputWriter,
      orders: groupOrders.map(({ id, revision }) => ({ id, expectedRevision: revision })),
      productionLineRefs: entries.map(({ order, line }) => ({ orderId: order.id, lineId: line.id })),
      status: "OPEN",
      productionJobId: null,
    };
  });
}

function productionEfficiencySupplement(state, user, payload, foilColor) {
  const type = allowedValue(payload?.type, ["TEXT", "INITIALS", "NUMBER"], "Opvullingstype");
  const content = normalizeProductionContent(type, requiredText(payload?.content, "Inhoud", 160));
  const heightMm = Number(payload?.heightMm);
  const quantity = Number(payload?.quantity);
  const sourceId = requiredText(payload?.sourceId, "Lettertype", 180);
  const identity = sha256(JSON.stringify({ type, content, heightMm, quantity, sourceId, foilColor })).slice(0, 24).toLowerCase();
  const [line] = validateProductionLines([{
    id: `production-supplement-${identity}`,
    type,
    content,
    sourceId,
    // Managed font geometry is height-led and derives its true contour width.
    // This legacy width value is only a validation envelope, never a stretch.
    widthMm: Math.min(430, Math.max(heightMm, heightMm * Math.max(1, Array.from(content).length * 0.7))),
    heightMm,
    foilColor,
    quantity,
    previewLabel: content,
    provenance: "Productie · geometrisch bewezen folie-opvulling · geen klantorderregel",
  }], state, user, "CUSTOM");
  if (line.validation.status !== "VALID") throw Object.assign(new Error(line.validation.reason || "De extra opdruk is niet veilig uitvoerbaar."), { statusCode: 409, code: "PRODUCTION_SUPPLEMENT_NOT_READY" });
  if (String(line.foilColor).toLocaleLowerCase("nl-NL") !== String(foilColor).toLocaleLowerCase("nl-NL")) throw Object.assign(new Error("De extra opdruk moet exact dezelfde foliekleur gebruiken."), { statusCode: 409, code: "PRODUCTION_SUPPLEMENT_COLOR_MISMATCH" });
  return {
    ...line,
    sourceId,
    orderId: `production-supplement:${identity}`,
    productionSupplement: { reason: "GEOMETRY_PROVEN_REST_CAPACITY", customerOrderLine: false },
  };
}

function productionLayoutOccupiedArea(snapshot) {
  return (snapshot.layout.placements ?? []).reduce((sum, placement) => sum + Number(placement.widthMm) * Number(placement.heightMm), 0);
}

function analyzeProductionEfficiency(state, user, orders, group, payload) {
  const supplement = productionEfficiencySupplement(state, user, payload, group.foilColor);
  const checkAt = "2026-08-28T00:00:00.000Z";
  const baseGroup = { ...group, supplements: [] };
  const augmentedGroup = { ...group, supplements: [supplement], efficiencyEvidence: { analysisHash: "PENDING" } };
  const base = buildProductionJobSnapshot(state, orders, "EFFICIENCY-PREFLIGHT", checkAt, DEFAULT_ARTIFACT_ROOT, DEFAULT_ARTIFACT_ROOT, baseGroup, { persistArtifacts: false });
  const augmented = buildProductionJobSnapshot(state, orders, "EFFICIENCY-PREFLIGHT", checkAt, DEFAULT_ARTIFACT_ROOT, DEFAULT_ARTIFACT_ROOT, augmentedGroup, { persistArtifacts: false });
  const baseArea = productionLayoutOccupiedArea(base);
  const augmentedArea = productionLayoutOccupiedArea(augmented);
  const rollArea = Math.max(1, Number(base.layout.configuredWidthMm ?? base.productionGroup.workingWidthMm) * Number(base.layout.usedLengthMm));
  const fits = Number(augmented.layout.usedLengthMm) <= Number(base.layout.usedLengthMm) + 0.001
    && Number(augmented.layout.objectCount) > Number(base.layout.objectCount);
  const historyMatches = (state.productionJobs ?? []).filter(({ status }) => status === "COMPLETED").flatMap(({ snapshot }) => snapshot.productionLines ?? []).filter((line) => line.type === supplement.type && line.content === supplement.content && String(line.foilColor ?? "").toLocaleLowerCase("nl-NL") === String(group.foilColor).toLocaleLowerCase("nl-NL")).reduce((sum, line) => sum + Number(line.quantity), 0);
  const evidence = {
    baseUsedWidthMm: base.layout.usedWidthMm,
    baseUsedLengthMm: base.layout.usedLengthMm,
    augmentedUsedWidthMm: augmented.layout.usedWidthMm,
    augmentedUsedLengthMm: augmented.layout.usedLengthMm,
    utilizationBeforePercent: Math.round((baseArea / rollArea) * 10_000) / 100,
    utilizationAfterPercent: Math.round((augmentedArea / rollArea) * 10_000) / 100,
    customerOrderLinesCreated: false,
  };
  const analysisHash = sha256(JSON.stringify({
    orderRevisions: orders.map(({ id, revision }) => ({ id, revision })),
    group: { foilColor: group.foilColor, lineRefs: group.productionLineRefs },
    supplement,
    evidence,
    fits,
  })).toUpperCase();
  return { status: fits ? "FIT" : "NO_SAFE_REST_CAPACITY", analysisHash, supplement, evidence: { ...evidence, analysisHash }, historyEvidence: { matchingCompletedObjects: historyMatches, source: "IMMUTABLE_COMPLETED_PRODUCTION_JOBS" } };
}

export function assertSportpaleisProductionInstanceIntegrity(pieces, cutJob, svg) {
  const expectedIds = pieces.map(({ id }) => String(id));
  const actualIds = cutJob?.productionGeometry?.groups?.map(({ sourcePieceId }) => String(sourcePieceId)) ?? [];
  const expected = expectedIds.length;
  const actual = actualIds.length;
  const exactIds = new Set(expectedIds).size === expected
    && new Set(actualIds).size === actual
    && expectedIds.every((id) => actualIds.includes(id))
    && actualIds.every((id) => expectedIds.includes(id));
  const contours = cutJob?.productionGeometry?.groups?.flatMap((group) => group.contours ?? []) ?? [];
  const artifactContourIds = [...String(svg ?? "").matchAll(/data-contour-id="([^"]+)"/gu)].map((match) => match[1]);
  const escapedContourId = (id) => String(id).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
  const expectedContourIds = contours.map(({ id }) => escapedContourId(id)).sort();
  const sortedArtifactContourIds = [...artifactContourIds].sort();
  const remainingArtifactContours = new Map();
  for (const id of artifactContourIds) remainingArtifactContours.set(id, Number(remainingArtifactContours.get(id) ?? 0) + 1);
  const actualArtifactInstances = (cutJob?.productionGeometry?.groups ?? []).reduce((count, group) => {
    const required = new Map();
    for (const { id } of group.contours ?? []) { const escaped = escapedContourId(id); required.set(escaped, Number(required.get(escaped) ?? 0) + 1); }
    const complete = required.size > 0 && [...required].every(([id, quantity]) => Number(remainingArtifactContours.get(id) ?? 0) >= quantity);
    if (complete) for (const [id, quantity] of required) remainingArtifactContours.set(id, Number(remainingArtifactContours.get(id)) - quantity);
    return count + Number(complete);
  }, 0);
  const exactContours = contours.length > 0
    && cutJob.productionGeometry.groups.every(({ contours: groupContours }) => groupContours.length > 0)
    && artifactContourIds.length === contours.length
    && expectedContourIds.every((id, index) => sortedArtifactContourIds[index] === id);
  if (expected < 1 || expected !== actual || !exactIds || !exactContours) {
    const placed = Math.min(actual, actualArtifactInstances);
    throw Object.assign(new Error(`Productie geblokkeerd: ${expected} opdrukken verwacht, ${placed} geplaatst.`), { statusCode: 409, code: "PRODUCTION_INSTANCE_QUANTITY_MISMATCH", expectedInstances: expected, actualInstances: placed, failedChecks: { exactIds, exactContours, expectedContourCount: contours.length, artifactContourCount: artifactContourIds.length } });
  }
  return { expectedInstances: expected, actualInstances: actual };
}

export function reserveImmutableProductionArtifact({ runtimeArtifactRoot, jobNumber, bytes, persist = true }) {
  if (!/^PLOT-\d{4}-\d{4,}$/u.test(String(jobNumber ?? ""))) throw Object.assign(new Error("Ongeldig productiebestandnummer."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_IDENTITY_INVALID" });
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) throw Object.assign(new Error("Lege productiebestandbytes kunnen niet immutable worden gereserveerd."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_BYTES_INVALID" });
  const artifactHash = sha256(bytes).toUpperCase();
  const artifactIdentity = `${jobNumber}:${artifactHash}`;
  const hashDirectory = artifactHash.toLocaleLowerCase("en-US");
  const filename = `${jobNumber}-production.svg`;
  const relativeDirectory = path.join("outputs", "sportpaleis-plotjobs", jobNumber, hashDirectory);
  const relativePath = path.join(relativeDirectory, filename).replaceAll(path.sep, "/");
  const absoluteDirectory = path.resolve(runtimeArtifactRoot, relativeDirectory);
  const absolutePath = path.resolve(runtimeArtifactRoot, relativePath);
  if (!absolutePath.startsWith(`${absoluteDirectory}${path.sep}`)) throw Object.assign(new Error("Ongeldige productiebestandlocatie."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_PATH_INVALID" });
  if (!persist) return { artifactHash, artifactIdentity, filename, relativePath, reused: false };

  mkdirSync(absoluteDirectory, { recursive: true });
  const verifyExisting = () => {
    const existing = readFileSync(absolutePath);
    const existingHash = sha256(existing).toUpperCase();
    if (existingHash !== artifactHash || existing.length !== bytes.length) {
      throw Object.assign(new Error("Bestaande immutable artifactidentiteit bevat andere bytes en blijft onaangeroerd."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_IDENTITY_COLLISION", artifactIdentity, expectedSha256: artifactHash, actualSha256: existingHash });
    }
    return { artifactHash, artifactIdentity, filename, relativePath, reused: true };
  };
  try { return verifyExisting(); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }

  const pendingPath = path.join(absoluteDirectory, `.${filename}.pending-${process.pid}-${randomBytes(10).toString("hex")}`);
  let pendingHandle;
  try {
    pendingHandle = openSync(pendingPath, "wx", 0o640);
    writeFileSync(pendingHandle, bytes);
    fsyncSync(pendingHandle);
    closeSync(pendingHandle);
    pendingHandle = undefined;
    try {
      linkSync(pendingPath, absolutePath);
      return { artifactHash, artifactIdentity, filename, relativePath, reused: false };
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
      return verifyExisting();
    }
  } finally {
    if (pendingHandle !== undefined) try { closeSync(pendingHandle); } catch {}
    rmSync(pendingPath, { force: true });
  }
}

function buildVersionedProductionArtifact(state, orders, productionLines, jobNumber, createdAt, artifactRoot, runtimeArtifactRoot, options = {}) {
  const generationStartedAt = performance.now();
  const millisecondsSince = (startedAt) => Math.round((performance.now() - startedAt) * 10) / 10;
  if (!productionLines.length || productionLines.some((line) => !["PRODUCTION_SOURCE", "FONT", "PRODUCTION_ELEMENT"].includes(line.source?.kind) || line.validation?.status !== "VALID")) return null;
  for (const line of productionLines) {
    const order = orders.find(({ id }) => id === line.orderId)
      ?? orders.find(({ items }) => items.some(({ id }) => id === line.itemId))
      ?? orders[0];
    if (order && !line.productionSupplement) assertPioneersNumberSource(state, order, line);
    if (order && !line.productionSupplement) assertScBuitenboysShortSource(state, order, line);
  }
  const sourceResolutionStartedAt = performance.now();
  const resolved = productionLines.map((line) => {
    if (line.source.kind === "PRODUCTION_SOURCE") {
      const source = productionSourceByIdentity(line.source.id, line.source.version);
      if (!source || source.content !== line.content || source.lineType !== line.type || source.sourceSetId !== line.source.sourceSetId) throw Object.assign(new Error(`Productiebron ${line.source.id}@${line.source.version} is niet meer identiek resolveerbaar.`), { statusCode: 409, code: "PRODUCTION_SOURCE_IDENTITY_MISMATCH" });
      if (source.outputWriterId !== line.source.outputWriterId || source.outputWriterVersion !== line.source.outputWriterVersion) throw Object.assign(new Error(`Outputwriter voor ${line.source.id}@${line.source.version} wijkt af van de ordersnapshot.`), { statusCode: 409, code: "PRODUCTION_SOURCE_IDENTITY_MISMATCH" });
      return {
        line,
        source,
        piece(copy) {
          return productionPieceFromSource(source, {
            id: `${line.orderId ?? orders[0].id}-${line.itemId ?? line.id}-${line.content}-${copy}`,
            sourceOrderId: line.orderId ?? orders[0].id,
            label: `${line.preview?.label ?? line.type} · ${line.content}`,
            product: orders.flatMap(({ items }) => items).find(({ id }) => id === line.itemId)?.product,
          });
        },
      };
    }
    if (line.source.kind === "PRODUCTION_ELEMENT") {
      const asset = state.productionElements.find(({ id, version, revision }) => id === line.source.id && (version ?? String(revision)) === line.source.version);
      const variant = asset?.variants.find(({ id }) => id === line.source.variantId);
      const admission = executableProductionAssetDecision(asset);
      if (!asset || !variant || !admission.allowed) throw Object.assign(new Error(admission.reason ?? `Productieasset ${line.source.id}@${line.source.version} is niet meer identiek resolveerbaar.`), { statusCode: 409, code: admission.code ?? "PRODUCTION_ASSET_IDENTITY_MISMATCH" });
      const source = { id: asset.id, version: asset.version, sourceProofStatus: productionElementProof(asset), outputWriterId: CUTJOB_SVG_WRITER.id, outputWriterVersion: CUTJOB_SVG_WRITER.version };
      return {
        line,
        source,
        pieces(copy) {
          const order = orders.find(({ id }) => id === line.orderId) ?? orders[0];
          return productionAssetPieces({ asset, variant, line, order, foilColor: productionLineFoilColor(state, order, line) })
            .map((piece) => ({
              ...piece,
              id: `${piece.id}-copy-${copy}`,
              ...(piece.semanticGroup ? { semanticGroup: { ...piece.semanticGroup, id: `${piece.semanticGroup.id}:copy-${copy}`, copyIndex: copy, copyCount: line.quantity } } : {}),
              ...(piece.assetIdentity ? { assetIdentity: { ...piece.assetIdentity, sourceKind: "PRODUCTION_ASSET" } } : {}),
            }));
        },
      };
    }
    const font = state.productionFonts.find(({ id, version, sha256: hash, status }) => id === line.source.id && version === line.source.version && hash === line.source.sha256 && status === "TECHNICALLY_VALID");
    const admission = productionFontExecutableDecision(font, line.personalizationField || "FREE_PRINT");
    if (!font || !admission.allowed) throw Object.assign(new Error(admission.reason ?? `Fontbron ${line.source.id}@${line.source.version} is niet meer identiek resolveerbaar.`), { statusCode: 409, code: admission.code ?? "PRODUCTION_FONT_IDENTITY_MISMATCH" });
    const bytes = managedFontBytes(font, artifactRoot, options.installedProductionAssetRoot);
    if (!bytes) throw Object.assign(new Error(`De exacte bytes van fontbron ${font.id}@${font.version} ontbreken.`), { statusCode: 409, code: "PRODUCTION_FONT_SOURCE_MISSING" });
    const source = { id: font.id, version: font.version, sourceProofStatus: "CONFIGURED", outputWriterId: CUTJOB_SVG_WRITER.id, outputWriterVersion: CUTJOB_SVG_WRITER.version };
    return {
      line,
      source,
      pieces(copy) {
        const order = orders.find(({ id }) => id === line.orderId) ?? orders[0];
        const item = order.items.find(({ id }) => id === line.itemId) ?? order.items[0];
        return managedFontProductionPieces({ font, bytes, line, order, item, foilColor: productionLineFoilColor(state, order, line), copy });
      },
    };
  });
  const sourceResolutionMs = millisecondsSince(sourceResolutionStartedAt);
  const writerIdentities = new Set(resolved.map(({ source }) => `${source.outputWriterId}@${source.outputWriterVersion}`));
  if (writerIdentities.size !== 1) throw Object.assign(new Error("Eén productiegroep kan alleen productiebronnen voor dezelfde versioned outputwriter bevatten."), { statusCode: 409, code: "PRODUCTION_GROUP_NOT_COMPATIBLE" });
  const [first] = resolved;
  if (!first || first.source.outputWriterId !== CUTJOB_SVG_WRITER.id || first.source.outputWriterVersion !== CUTJOB_SVG_WRITER.version) throw Object.assign(new Error(`Outputwriter ${[...writerIdentities][0] ?? "onbekend"} is niet geïnstalleerd.`), { statusCode: 409, code: "PRODUCTION_GROUP_NOT_COMPATIBLE" });
  const geometryStartedAt = performance.now();
  const useDecorationSections = new Set(resolved.map(({ line }) => productionLineTypeRank(line))).size > 1;
  const rawPieces = resolved.flatMap(({ line, piece, pieces: resolvePieces }) => Array.from({ length: line.quantity }, (_, copy) =>
    (resolvePieces ? resolvePieces(copy + 1) : [piece(copy + 1)]).map((resolvedPiece) => ({ ...resolvedPiece, ...(useDecorationSections ? { nestingSection: productionLineNestingSection(line) } : {}) }))).flat());
  const geometryMs = millisecondsSince(geometryStartedAt);
  const semanticGroupingStartedAt = performance.now();
  const pieces = groupSemanticNumberObjects(rawPieces, state.settings.productionDefaults.minimumGapMm);
  const semanticGroupingMs = millisecondsSince(semanticGroupingStartedAt);
  const nestingStartedAt = performance.now();
  const cutJobBatch = createCutJobBatch({
    organizationId: state.organizationId,
    orderId: orders.map(({ id }) => id).join("+"),
    revision: 1,
    attemptIdPrefix: jobNumber.toLowerCase(),
    createdAt,
    pieces,
    nesting: { absoluteMaxWidthMm: state.settings.productionDefaults.maxSafeTrackWidthMm, preferredWorkingWidthMm: state.settings.productionDefaults.workingWidthMm, minimumCutGapMm: state.settings.productionDefaults.minimumGapMm, edgeMarginMm: state.settings.productionDefaults.edgeMarginMm },
  });
  const nestingMs = millisecondsSince(nestingStartedAt);
  if (cutJobBatch.jobs.length !== 1 || !cutJobBatch.jobs[0].readyForPrinting) throw Object.assign(new Error("De productiegroep past niet in één geldige productiejob."), { statusCode: 409, code: "PRODUCTION_GROUP_NOT_COMPATIBLE" });
  const cutJob = cutJobBatch.jobs[0];
  const svgStartedAt = performance.now();
  const preview = createProductionPreview(cutJob);
  assertSportpaleisProductionInstanceIntegrity(pieces, cutJob, preview.svg);
  const productionDataHash = sha256(JSON.stringify(productionLines)).toUpperCase();
  const svg = preview.svg.replace("<svg ", `<svg data-production-data-sha256="${productionDataHash}" data-cutjob-sha256="${cutJob.contentHash.toUpperCase()}" `);
  const bytes = Buffer.from(svg, "utf8");
  const artifactHash = sha256(bytes).toUpperCase();
  const svgAndIntegrityMs = millisecondsSince(svgStartedAt);
  const persistenceStartedAt = performance.now();
  const reservation = reserveImmutableProductionArtifact({ runtimeArtifactRoot, jobNumber, bytes, persist: options.persist !== false });
  const persistenceMs = options.persist === false ? 0 : millisecondsSince(persistenceStartedAt);
  return {
    cutJob,
    preview,
    productionDataHash,
    sources: resolved.map(({ source }) => source),
    outputWriter: { ...CUTJOB_SVG_WRITER },
    generationMetrics: { sourceResolutionMs, geometryMs, semanticGroupingMs, nestingMs, svgAndIntegrityMs, persistenceMs, totalMs: millisecondsSince(generationStartedAt), inputLineCount: productionLines.length, physicalPieceCount: rawPieces.length, nestedObjectCount: pieces.length },
    artifact: { filename: reservation.filename, format: "SVG", version: `${CUTJOB_SVG_WRITER.id}@${CUTJOB_SVG_WRITER.version}`, sha256: artifactHash, path: reservation.relativePath, identity: reservation.artifactIdentity, reservation: { strategy: "JOB_NUMBER_PLUS_CONTENT_SHA256_CREATE_ONLY_V1", reused: reservation.reused }, productionDataHash },
  };
}

function buildProductionJobSnapshot(state, orders, jobNumber, createdAt = iso(), artifactRoot = DEFAULT_ARTIFACT_ROOT, runtimeArtifactRoot = artifactRoot, productionGroup = undefined, options = {}) {
  const snapshotStartedAt = performance.now();
  const allProductionLines = orders.flatMap((order) => {
    const effectiveLines = productionLinesForOrder(state, order);
    return effectiveLines.length
      ? effectiveLines.map((line) => ({ ...line, orderId: line.orderId ?? order.id, ...(productionDecorationIdentity(order, line) ? { decorationIdentity: productionDecorationIdentity(order, line) } : {}) }))
      : order.items.map((item, index) => ({ ...lineFromOrderItem(state, order, item, index), orderId: order.id }));
  });
  const selectedLineKeys = productionGroup?.lineRefs ? new Set(productionGroup.lineRefs.map(({ orderId, lineId }) => `${orderId}|${lineId}`)) : null;
  const selectedLineOrder = productionGroup?.lineRefs ? new Map(productionGroup.lineRefs.map(({ orderId, lineId }, index) => [`${orderId}|${lineId}`, index])) : null;
  const orderProductionLines = selectedLineKeys
    ? allProductionLines.filter(({ orderId, id }) => selectedLineKeys.has(`${orderId}|${id}`)).sort((left, right) => selectedLineOrder.get(`${left.orderId}|${left.id}`) - selectedLineOrder.get(`${right.orderId}|${right.id}`))
    : allProductionLines;
  if (selectedLineKeys && (orderProductionLines.length !== selectedLineKeys.size || orderProductionLines.length === 0)) throw Object.assign(new Error("De opgeslagen productiegroep verwijst niet meer exact naar dezelfde productieregels."), { statusCode: 409, code: "PRODUCTION_GROUP_STALE" });
  const productionLines = [...orderProductionLines, ...structuredClone(productionGroup?.supplements ?? [])];
  const defaults = state.settings.productionDefaults ?? PILOT_SETTINGS.productionDefaults;
  const layout = rectangleNesting(productionLines, defaults);
  const fontIds = new Set(productionLines.filter(({ source }) => source.kind === "FONT").map(({ source }) => source.id));
  const elementIds = new Set(productionLines.filter(({ source }) => source.kind === "PRODUCTION_ELEMENT").map(({ source }) => source.id));
  const fontSources = state.productionFonts.filter(({ id }) => fontIds.has(id)).map(({ id, name, version, sha256: hash, originalFilename }) => ({ id, name, version, sha256: hash, originalFilename }));
  const logoSources = state.productionElements.filter(({ id }) => elementIds.has(id)).map(({ id, version, revision, sourceId, sourceSelection, sourceLayers }) => ({ id, version: version ?? String(revision), revision, sourceId: sourceId ?? null, sourceSelection: structuredClone(sourceSelection ?? null), sourceLayers: structuredClone(sourceLayers ?? { visualSource: null, vectorSource: null, validatedCutContour: null, physicallyProvenContour: null }) }));
  const sourceContours = logoSources.flatMap(({ id, sourceLayers }) => {
    const source = sourceLayers.physicallyProvenContour ?? sourceLayers.validatedCutContour; if (!source) return [];
    return [{ id: source.sourceId || id, version: source.version, proofStatus: sourceLayers.physicallyProvenContour ? "PHYSICALLY_VALIDATED" : "GEOMETRY_VALIDATED", immutable: true }];
  });
  const productionArtifact = buildVersionedProductionArtifact(state, orders, productionLines, jobNumber, createdAt, artifactRoot, runtimeArtifactRoot, { persist: options.persistArtifacts !== false, installedProductionAssetRoot: options.installedProductionAssetRoot ?? productionGroup?.installedProductionAssetRoot });
  if (productionArtifact) sourceContours.push(...productionArtifact.sources.map(({ id, version, sourceProofStatus }) => ({ id, version, proofStatus: sourceProofStatus, immutable: true })));
  const firstProfile = orders.flatMap(({ items }) => items).map(({ productionProfileId }) => state.productionProfiles.find(({ id }) => id === productionProfileId)).find(Boolean);
  const abMirrorAccepted = state.productionJobs.some(({ snapshot, humanAcceptance }) => snapshot?.artifact?.version?.includes("AUTO-MIRROR-AB") && humanAcceptance?.status === "PASS");
  const manifest = { jobNumber, orderIds: orders.map(({ id }) => id), productionLines, fontSources, logoSources, layout, orientation: { preMirrored: abMirrorAccepted, manualHorizontalFlipInWinPlot: !abMirrorAccepted }, scale: 1 };
  const manifestHash = sha256(JSON.stringify(manifest)).toUpperCase();
  return {
    organizationId: state.organizationId,
    association: [...new Set(orders.map(({ association }) => association))].join(" · "),
    orderIds: orders.map(({ id }) => id),
    elements: productionLines.map(({ type, content, quantity, widthMm, heightMm }) => ({ type, value: content, quantity, widthMm, heightMm })),
    productionLines: structuredClone(productionLines),
    ...(productionGroup?.supplements?.length ? { productionSupplements: productionGroup.supplements.map((line) => ({ id: line.id, type: line.type, value: line.content, quantity: line.quantity, foilColor: line.foilColor, sourceId: line.source.id, sourceVersion: line.source.version, reason: "GEOMETRY_PROVEN_REST_CAPACITY", customerOrderLine: false, analysisHash: productionGroup.efficiencyEvidence.analysisHash })) } : {}),
    fontSources, logoSources,
    productionProfile: { id: firstProfile?.id ?? "generic-production-line-core", revision: firstProfile?.revision ?? 1, name: firstProfile?.name ?? "Generiek productieregelmodel" },
    sourceContours,
    ...(productionArtifact ? { outputWriter: { id: productionArtifact.outputWriter.id, version: productionArtifact.outputWriter.version, format: productionArtifact.outputWriter.format, proofStatus: productionArtifact.outputWriter.proofStatus, physicalRouteStatus: productionArtifact.outputWriter.physicalRouteStatus } } : {}),
    generationMetrics: productionArtifact ? { ...productionArtifact.generationMetrics, snapshotTotalMs: Math.round((performance.now() - snapshotStartedAt) * 10) / 10 } : null,
    productionGroup: { ...(productionGroup?.groupId ? { id: productionGroup.groupId, label: productionGroup.groupLabel } : {}), ...(productionGroup?.sourceChannel ? { sourceChannel: productionGroup.sourceChannel } : {}), foilColor: productionGroup?.foilColor ?? ([...new Set(orders.flatMap(({ items }) => items.map(({ foilColor }) => foilColor)))].join(" + ") || defaults.defaultFoilColor), material: "Folie · menselijke controle", workingWidthMm: defaults.workingWidthMm, maxSafeTrackWidthMm: defaults.maxSafeTrackWidthMm },
    layout: productionArtifact ? { strategy: productionArtifact.cutJob.nesting.strategy, objectCount: productionArtifact.cutJob.productionGeometry.groups.length, closedContourCount: productionArtifact.cutJob.productionGeometry.contours.length, anchorCount: productionArtifact.cutJob.productionGeometry.contours.reduce((sum, contour) => sum + contour.points.length, 0), configuredWidthMm: productionArtifact.cutJob.nesting.configuredWidthMm, baselineUsedLengthMm: productionArtifact.cutJob.nesting.baselineUsedLengthMm, savedLengthVsBaselineMm: productionArtifact.cutJob.nesting.savedLengthVsBaselineMm, usedWidthMm: productionArtifact.cutJob.nesting.usedWidthMm, usedLengthMm: productionArtifact.cutJob.nesting.usedLengthMm, edgeMarginMm: defaults.edgeMarginMm, minimumGapMm: defaults.minimumGapMm, placements: productionArtifact.cutJob.productionGeometry.groups.map(({ sourcePieceId, placementMm, sourceBoundsMm, boundsMm, mirrorApplied, baseRotationApplied, nestingRotationApplied, rotationApplied, provenance, physicalMembers }) => ({ lineId: sourcePieceId, xMm: placementMm.x, yMm: placementMm.y, widthMm: boundsMm.width, heightMm: boundsMm.height, sourceWidthMm: sourceBoundsMm.width, sourceHeightMm: sourceBoundsMm.height, mirrorApplied, baseRotationApplied, nestingRotationApplied, rotationApplied, vectorProfile: provenance.vectorProfile ?? null, nestingSection: structuredClone(provenance.nestingSection ?? null), sourceOrderId: provenance.sourceOrderId, semanticGroup: structuredClone(provenance.semanticGroup ?? null), physicalMembers: structuredClone(physicalMembers ?? []), assetIdentity: structuredClone(provenance.assetIdentity ?? null) })), productionGeometry: structuredClone(productionArtifact.cutJob.productionGeometry) } : { strategy: "MINIMUM_SAFE_ROLL_LENGTH_FIRST_RECTANGLE_PREVIEW", objectCount: layout.placements.length, usedWidthMm: layout.usedWidthMm, usedLengthMm: layout.usedLengthMm, edgeMarginMm: defaults.edgeMarginMm, minimumGapMm: defaults.minimumGapMm, placements: layout.placements },
    orientation: manifest.orientation,
    scale: 1,
    artifact: productionArtifact?.artifact ?? { filename: `${jobNumber}-production-manifest.json`, format: "MANIFEST", version: PILOT_RELEASE_ID, sha256: manifestHash, path: `immutable://sportpaleis/plotjobs/${jobNumber}/production-manifest.json`, manifest },
    humanControlRequiredBeforeHardware: true,
    hardwareSendPerformedByWorkspace: false,
  };
}

function productionProposalBlockReason(order, state = undefined) {
  if (order.deletion?.status === "DELETED") return "order is verwijderd";
  if (!["ORDER", "CONTROL"].includes(order.stage)) return "status is niet Klaar voor productie";
  if (order.productionExecutionSnapshot?.executionHash && !verifyProductionExecutionSnapshot(order).valid) return "immutable productie-uitvoering heeft een ongeldige integriteitshash";
  const reconciliation = state ? reconcileExistingOrderProductionTruth(state, order) : null;
  const productionLines = state ? productionLinesForOrder(state, order) : order.productionLines ?? [];
  if (!productionLines.length) {
    const finding = reconciliation?.findings?.[0];
    return finding ? `${finding.decoration}: ${finding.reason}` : "geen gevalideerde productieregels beschikbaar";
  }
  if (state) {
    const eligibility = productionEligibilityForOrder(state, { ...order, productionLines });
    if (eligibility.eligibleLines.length) return null;
    if (eligibility.findings.length) return eligibility.findings[0]?.reason ?? "finale productiewaarheid is geblokkeerd";
  }
  if (state && productionLines.some((line) => !managedFoilColor(state, productionLineFoilColor(state, order, line)))) return "een actieve beheerde foliekleur ontbreekt";
  const blockedLine = productionLines.find(({ validation }) => validation.status !== "VALID");
  if (blockedLine) return blockedLine.validation.reason || "een productieregel is geblokkeerd";
  const reconciledLegacyTruth = reconciliation?.sourceKind === "HISTORICAL_ORDER_PROJECTION" && reconciliation.status === "PROVEN" || Boolean(order.productionReconciliation?.confirmed);
  const blockedItem = reconciledLegacyTruth ? null : order.items.find((item) => item.productionReadiness?.status === "DATA_GAP" || item.backNumberProduction?.status === "DATA_GAP" || item.variants?.some((variant) => variant.backNumberProduction?.status === "DATA_GAP"));
  if (blockedItem) return blockedItem.productionReadiness?.reason || blockedItem.backNumberProduction?.source || "noodzakelijke productiegegevens ontbreken";
  if (order.foilStates?.length && order.foilStates.every(({ status }) => status === "HOLD")) return "alle foliekleuren staan op wachten";
  return null;
}

function productionStatusForOrder(state, order) {
  if (order.stage === "DONE") return { productionStatus: "DONE", productionStatusReason: null, productionClosure: productionClosureForOrder(state, order) };
  if (order.stage === "PRINT") {
    const progress = productionProgressForOrder(state, order);
    const closure = productionClosureForOrder(state, order);
    if (closure.status === "ELIGIBLE") return { productionStatus: "FULLY_PRODUCED", productionStatusReason: null, productionClosure: closure };
    if (progress?.producedCount > 0) return { productionStatus: "PARTIALLY_PRODUCED", productionStatusReason: closure.reason, productionClosure: closure };
    return { productionStatus: "IN_PRODUCTION", productionStatusReason: closure.reason, productionClosure: closure };
  }
  if (order.stage === "ORDER") {
    const contentBlocker = productionProposalBlockReason({ ...order, stage: "CONTROL" }, state);
    if (contentBlocker) return { productionStatus: "ATTENTION", productionStatusReason: contentBlocker, productionClosure: productionClosureForOrder(state, order), productionReadyLineIds: [], productionBlockedLineIds: productionLinesForOrder(state, order).map(({ id }) => id) };
    const eligibility = productionEligibilityForOrder(state, { ...order, stage: "CONTROL" });
    const partial = eligibility.blockedLines.length > 0;
    return { productionStatus: "READY", productionStatusReason: partial ? eligibility.findings[0]?.reason ?? "Een afzonderlijke bedrukking vraagt nog productiecontrole." : null, productionClosure: productionClosureForOrder(state, order), productionReadyLineIds: eligibility.eligibleLines.map(({ id }) => id), productionBlockedLineIds: eligibility.blockedLines.map(({ id }) => id) };
  }
  const blocker = productionProposalBlockReason(order, state);
  if (blocker) return { productionStatus: "ATTENTION", productionStatusReason: blocker, productionClosure: productionClosureForOrder(state, order), productionReadyLineIds: [], productionBlockedLineIds: productionLinesForOrder(state, order).map(({ id }) => id) };
  const eligibility = productionEligibilityForOrder(state, order);
  const partial = eligibility.blockedLines.length > 0;
  return { productionStatus: "READY", productionStatusReason: partial ? eligibility.findings[0]?.reason ?? "Een afzonderlijke bedrukking vraagt nog productiecontrole." : null, productionClosure: productionClosureForOrder(state, order), productionReadyLineIds: eligibility.eligibleLines.map(({ id }) => id), productionBlockedLineIds: eligibility.blockedLines.map(({ id }) => id) };
}

function applyProductionReadiness(items, productionLines) {
  for (const item of items) {
    if (item.productionProfileId === "profile-none" && (item.variants ?? []).every(({ personalization }) => personalization === "Geen bedrukking")) {
      item.productionReadiness = { status: "CONFIGURED", reason: null };
      continue;
    }
    if (!productionLines?.length) continue;
    const itemLines = productionLines.filter(({ itemId }) => !itemId || itemId === item.id);
    if (!itemLines.length && (item.variants ?? []).every(({ personalization }) => personalization === "Geen bedrukking")) {
      item.productionReadiness = { status: "CONFIGURED", reason: null };
      continue;
    }
    const blocked = itemLines.find(({ validation }) => validation.status === "BLOCKED");
    item.productionReadiness = blocked
      ? { status: item.productionReadiness?.status === "DATA_GAP" ? "DATA_GAP" : "ATTENTION", reason: blocked.validation.reason ?? "Voor dit bedrukte artikel ontbreekt een uitvoerbare productieregel." }
      : itemLines.length
        ? { status: "CONFIGURED", reason: null }
        : item.productionReadiness;
  }
  return items;
}

function productionAttentionText(items) {
  const attention = items.filter((item) => item.productionReadiness?.status !== "CONFIGURED" || item.backNumberProduction?.status === "DATA_GAP" || item.variants?.some((variant) => variant.backNumberProduction?.status === "DATA_GAP"));
  if (!attention.length) return undefined;
  const blocking = attention.some((item) => item.productionReadiness?.status === "DATA_GAP" || item.backNumberProduction?.status === "DATA_GAP" || item.variants?.some((variant) => variant.backNumberProduction?.status === "DATA_GAP"));
  const reasons = [...new Set(attention.flatMap((item) => [item.productionReadiness?.reason, item.backNumberProduction?.source, ...(item.variants ?? []).map((variant) => variant.backNumberProduction?.source)]).filter(Boolean))];
  return `${blocking ? "Kritieke productiedata ontbreekt" : "Pilot-aandachtspunt"}: ${reasons.join(" · ") || "Productiecontrole nodig"}`;
}

function associationDefaultFoilColor(association) {
  return String(association?.defaultFoilColor ?? association?.foilColors?.[0] ?? "Onbekend").trim() || "Onbekend";
}

function managedFoilColor(state, requested) {
  const normalized = String(requested ?? "").trim().toLocaleLowerCase("nl-NL");
  return state.foilRolls?.find(({ color, active }) => active !== false && String(color).trim().toLocaleLowerCase("nl-NL") === normalized)?.color ?? null;
}

function managedFoilColorFromStudioValue(state, requested) {
  const normalized = String(requested ?? "").trim().toLocaleLowerCase("nl-NL");
  if (!normalized) return null;
  const canonicalStudioColors = {
    "#ffffff": "Wit", "#fff": "Wit",
    "#101419": "Zwart", "#151515": "Zwart", "#111111": "Zwart", "#111": "Zwart",
    "#d3172f": "Rood", "#d71920": "Rood",
    "#175ec7": "Blauw",
    "#21884a": "Groen",
    "#f1d21b": "Geel",
  };
  return managedFoilColor(state, canonicalStudioColors[normalized] ?? requested);
}

function effectiveCatalogFoilColor(article, association, profile) {
  const associationDefault = associationDefaultFoilColor(association);
  if (Object.hasOwn(article, "foilColorOverride")) return String(article.foilColorOverride ?? "").trim() || associationDefault;
  // Existing live records predate article overrides. Preserve only a genuinely
  // different, already configured profile color while the association itself
  // also still has legacy semantics. Once an explicit default is saved, every
  // article without an override inherits it without any article bulk update.
  const legacyProfileColor = String(profile?.foilColor ?? "").trim();
  return !Object.hasOwn(association ?? {}, "defaultFoilColor") && legacyProfileColor && legacyProfileColor.toLocaleLowerCase("nl-NL") !== associationDefault.toLocaleLowerCase("nl-NL") ? legacyProfileColor : associationDefault;
}

function inferBackNumberSizeClass(association, article, garmentSize) {
  const size = String(garmentSize ?? "").trim().toLocaleLowerCase("nl-NL");
  if (!size) return "";
  const juniorSizes = new Set((association?.juniorGarmentSizes ?? []).map((value) => String(value).trim().toLocaleLowerCase("nl-NL")).filter(Boolean));
  if (juniorSizes.has(size)) return "JUNIOR";
  const validatedArticleSizes = article?.validation?.sizes === "VALIDATED"
    ? new Set((article.availableSizes ?? []).map((value) => String(value).trim().toLocaleLowerCase("nl-NL")).filter(Boolean))
    : new Set();
  return juniorSizes.size > 0 && validatedArticleSizes.has(size) ? "SENIOR" : "";
}

function validateItems(value, state, standardPersonalization, options = {}) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) throw Object.assign(new Error("Een order vereist 1 tot 50 artikelen."), { statusCode: 400, code: "VALIDATION_ERROR" });
  const maximumQuantity = Number.isInteger(options.maximumQuantity) ? options.maximumQuantity : 99;
  return value.map((item) => {
    const requestedVariants = Array.isArray(item.variants) && item.variants.length ? item.variants : [{ quantity: item.quantity, size: item.size, deviation: item.deviation, overrides: item.overrides, participantName: item.participantName }];
    const quantity = requestedVariants.reduce((sum, variant) => sum + Number(variant.quantity), 0);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > maximumQuantity) throw Object.assign(new Error("Ongeldig aantal."), { statusCode: 400, code: "VALIDATION_ERROR" });
    if (item.articleId) {
      const article = state.articles.find(({ id }) => id === item.articleId);
      if (!article?.active) throw Object.assign(new Error("Artikel is niet beschikbaar."), { statusCode: 400, code: "ARTICLE_UNAVAILABLE" });
      if (options.requireBackNumberSizeClass === true && article.printRelevance?.status !== "CONFIRMED_VISIBLE_PERSONALIZATION") throw Object.assign(new Error("Dit artikel behoort niet tot de actuele gevalideerde Bedrukken-catalogus."), { statusCode: 400, code: "ARTICLE_NOT_IN_PRINT_CATALOG" });
      const association = state.associations.find(({ name }) => name === article.association);
      if (!association?.active) throw Object.assign(new Error("De vereniging van dit artikel is niet beschikbaar."), { statusCode: 400, code: "ARTICLE_ASSOCIATION_UNAVAILABLE" });
      if (item.association && item.association !== article.association) throw Object.assign(new Error("Het artikel hoort niet bij de gekozen vereniging."), { statusCode: 400, code: "ARTICLE_ASSOCIATION_MISMATCH" });
      const profile = state.productionProfiles.find(({ id }) => id === article.profileId);
      if (!profile) throw Object.assign(new Error("Artikel mist een productieprofiel."), { statusCode: 400, code: "PROFILE_MISSING" });
      const labels = { initials: "Initialen", name: "Naam", backNumber: "Rug", chestNumber: "Borst", shortsNumber: "Short" };
      let productType = "OTHER";
      try { productType = canonicalTeamkitArticleSurfaceTruth(article).productType; } catch { /* Unresolved surface truth can never grant an extra field. */ }
      const allowedPersonalizationFields = canonicalArticlePersonalizationFields({ article, association, productionProfiles: state.productionProfiles, productType });
      const variants = requestedVariants.map((variant) => {
        const variantQuantity = Number(variant.quantity);
        if (!Number.isInteger(variantQuantity) || variantQuantity < 1 || variantQuantity > maximumQuantity) throw Object.assign(new Error("Ongeldig aantal in artikelvariant."), { statusCode: 400, code: "VALIDATION_ERROR" });
        const enteredSize = String(variant.size ?? "").trim().slice(0, 20);
        const size = enteredSize || "Niet opgegeven";
        if (enteredSize && article.validation?.sizes === "VALIDATED" && article.availableSizes?.length && !article.availableSizes.includes(enteredSize)) throw Object.assign(new Error(`${enteredSize} is geen bevestigde maat voor ${article.name}.`), { statusCode: 400, code: "ARTICLE_SIZE_UNAVAILABLE" });
        const deviation = Boolean(variant.deviation);
        const overrideInput = variant.overrides ?? {};
        const overrides = deviation ? validatePersonalization(overrideInput, { ...options, requireBackNumberSizeClass: false }) : { initials: "", initialsInfix: "", name: "", backNumber: "", chestNumber: "", backNumberSizeClass: "", shortsNumber: "", initialsSemantic: null };
        const forbiddenOverrides = PERSONALIZATION_FIELDS.filter((field) => !allowedPersonalizationFields.includes(field) && Boolean(overrides[field]));
        if (forbiddenOverrides.length) throw Object.assign(new Error(`${article.name} staat deze bedrukking niet toe.`), { statusCode: 400, code: "ARTICLE_PERSONALIZATION_NOT_ALLOWED" });
        const hasExplicitOverride = (key) => deviation && (
          String(overrideInput[key] ?? "").trim() !== ""
          || key === "initialsInfix" && Object.hasOwn(overrideInput, key) && String(overrideInput.initials ?? "").trim() !== ""
        );
        const appliedFields = Object.fromEntries(allowedPersonalizationFields.map((key) => [key, hasExplicitOverride(key) ? overrides[key] : standardPersonalization[key] ?? ""]));
        if (allowedPersonalizationFields.includes("initials")) appliedFields.initialsInfix = hasExplicitOverride("initialsInfix") ? overrides.initialsInfix : standardPersonalization.initialsInfix ?? "";
        const selectedBackNumberSizeClass = hasExplicitOverride("backNumberSizeClass") ? overrides.backNumberSizeClass : standardPersonalization.backNumberSizeClass;
        const appliedBackNumberSizeClass = appliedFields.backNumber ? selectedBackNumberSizeClass || inferBackNumberSizeClass(association, article, enteredSize) : "";
        if (appliedFields.backNumber && options.requireBackNumberSizeClass === true && !BACK_NUMBER_SIZE_CLASSES.has(appliedBackNumberSizeClass)) throw Object.assign(new Error(`Kies Junior of Senior voor het rugnummer op ${article.name}.`), { statusCode: 400, code: "BACK_NUMBER_SIZE_CLASS_REQUIRED" });
        const applied = { ...appliedFields, backNumberSizeClass: appliedBackNumberSizeClass };
        const policy = { mode: article.personalizationPolicy?.mode ?? "combination", fields: Object.fromEntries(allowedPersonalizationFields.map((key) => [key, article.personalizationPolicy?.fields?.[key] ?? "optional"])) };
        for (const field of allowedPersonalizationFields) {
          if (!article.priceConfiguration?.personalizationValuePricing?.[field] || !applied[field]) continue;
          const resolvedPrice = resolveCatalogPersonalizationPrice(article, field, applied[field]);
          if (resolvedPrice.status !== "PRICED") throw Object.assign(new Error(resolvedPrice.reason ?? `${labels[field]} heeft geen geldige prijsregel.`), { statusCode: 400, code: "ARTICLE_PERSONALIZATION_PRICE_INVALID", articleId: article.id, field });
          applied[field] = resolvedPrice.normalizedValue;
          appliedFields[field] = resolvedPrice.normalizedValue;
        }
        const populated = Object.entries(appliedFields).filter(([key, entry]) => key !== "initialsInfix" && entry);
        if (policy.mode === "mutually-exclusive" && populated.length > 1) throw Object.assign(new Error(`${article.name} staat slechts één bedrukkingstype tegelijk toe.`), { statusCode: 400, code: "PERSONALIZATION_MUTUALLY_EXCLUSIVE" });
        for (const [key, requirement] of Object.entries(policy.fields ?? {})) if (requirement === "required" && !applied[key]) throw Object.assign(new Error(`${article.name} vereist ${labels[key].toLowerCase()}.`), { statusCode: 400, code: "PERSONALIZATION_REQUIRED" });
        const personalization = `${populated.map(([key, entry]) => `${labels[key]} ${entry}${key === "backNumber" && appliedBackNumberSizeClass ? ` (${appliedBackNumberSizeClass === "JUNIOR" ? "Junior" : "Senior"})` : ""}`).join(" · ")}${appliedFields.initialsInfix ? `${populated.length ? " · " : ""}Tussenvoegsel ${appliedFields.initialsInfix}` : ""}` || "Geen bedrukking";
        return { id: `variant-${randomBytes(5).toString("hex")}`, participantName: optional(variant.participantName, 120), quantity: variantQuantity, size, personalization, personalizationValues: applied, initialsSemantic: applied.initials ? (deviation && overrides.initialsSemantic ? overrides.initialsSemantic : standardPersonalization.initialsSemantic) : null, backNumberProduction: resolveBackNumberProductionContext(association, profile, appliedBackNumberSizeClass, size), deviation };
      });
      const distinctSizes = new Set(variants.map(({ size }) => size));
      const distinctPrinting = new Set(variants.map(({ personalization }) => personalization));
      const applied = variants[0].personalizationValues;
      const personalization = distinctPrinting.size > 1 ? "Verschillende bedrukking" : variants[0].personalization;
      let productionReadiness = catalogArticleReadiness(article, profile);
      const unresolvedBackNumber = variants.find(({ backNumberProduction }) => backNumberProduction?.status === "DATA_GAP");
      if (productionReadiness.status === "CONFIGURED" && unresolvedBackNumber) productionReadiness = { status: "DATA_GAP", reason: `${unresolvedBackNumber.backNumberProduction.sizeClass === "JUNIOR" ? "Junior" : "Senior"} rugnummer mist gevalideerde fysieke maatvoering` };
      return {
        id: `item-${randomBytes(6).toString("hex")}`,
        sourceType: "CATALOG",
        sourceProvenance: article.validation?.source ?? "DATA_GAP: artikelherkomst ontbreekt",
        productionReadiness,
        articleId: article.id,
        articleNumber: article.articleNumber,
        imageKey: article.imageKey,
        product: article.name,
        association: article.association,
        size: distinctSizes.size > 1 ? "Meerdere maten" : variants[0].size,
        quantity,
        personalization,
        personalizationValues: applied,
        variants,
        deviation: variants.length > 1 || variants.some(({ deviation }) => deviation),
        foilColor: effectiveCatalogFoilColor(article, association, profile),
        productionProfileId: profile.id,
        productionInstruction: profile.instruction,
        backNumberProduction: variants.length === 1 ? variants[0].backNumberProduction : null,
      };
    }
    const requestedAssociation = String(item.association ?? options.defaultAssociation ?? "").trim();
    const association = options.freeProduction ? "Vrije bedrukking" : options.optionalAssociation && !requestedAssociation ? "Geen vereniging" : requiredText(requestedAssociation, "Vereniging", 120);
    const legacyTrusted = options.requireBackNumberSizeClass !== true && Boolean(options.defaultAssociation) && !item.association;
    if (!options.freeProduction && association !== "Geen vereniging" && !state.associations.some(({ name }) => name === association)) throw Object.assign(new Error("Kies een bekende Sportpaleis-vereniging."), { statusCode: 400, code: "ASSOCIATION_UNKNOWN" });
    const profile = item.productionProfileId ? state.productionProfiles.find(({ id }) => id === item.productionProfileId) : null;
    if (item.productionProfileId && !profile) throw Object.assign(new Error("Het gekozen productieprofiel bestaat niet."), { statusCode: 400, code: "PROFILE_MISSING" });
    const variants = requestedVariants.map((variant) => ({
      id: `variant-${randomBytes(5).toString("hex")}`,
      participantName: optional(variant.participantName, 120),
      quantity: Number(variant.quantity),
      size: String(variant.size ?? "Niet opgegeven").trim().slice(0, 20) || "Niet opgegeven",
      personalization: optional(variant.personalization, 240) || optional(item.personalization, 240) || "Nog te bepalen",
      deviation: Boolean(variant.deviation),
    }));
    return {
      id: `item-${randomBytes(6).toString("hex")}`,
      sourceType: legacyTrusted ? "LEGACY" : "CUSTOM",
      sourceProvenance: legacyTrusted ? "Bestaande Foundation 006-invoer" : "Handmatig aan deze order toegevoegd; geen nieuw catalogusartikel aangemaakt",
      articleNumber: optional(item.articleNumber, 120) || null,
      product: options.freeProduction ? (optional(item.product, 120) || "Vrije opdruk") : requiredText(item.product, "Product", 120),
      association,
      size: variants.length > 1 ? "Meerdere maten" : variants[0].size,
      quantity,
      personalization: optional(item.personalization, 240) || "Nog te bepalen",
      variants,
      foilColor: profile?.foilColor ?? (optional(item.foilColor, 40) || "Onbekend"),
      productionProfileId: profile?.id ?? null,
      productionInstruction: profile?.instruction ?? "Productieprofiel ontbreekt; Beheer moet dit vóór productie aanvullen.",
      productionReadiness: legacyTrusted ? { status: "CONFIGURED", reason: "Historische order; bestaande productieroute blijft leidend" } : productionProfileReadiness(profile),
    };
  });
}

function validatePreference(value) {
  const panelOrder = Array.isArray(value.panelOrder) ? value.panelOrder : [];
  const expected = ["attention", "production", "recent", "shortcuts"];
  if (panelOrder.length !== expected.length || expected.some((item) => !panelOrder.includes(item))) {
    throw Object.assign(new Error("Ongeldige paneelvolgorde."), { statusCode: 400, code: "VALIDATION_ERROR" });
  }
  if (panelOrder.indexOf("attention") > 1 || panelOrder.indexOf("production") > 1) {
    throw Object.assign(new Error("Verplichte panelen blijven vooraan staan."), { statusCode: 400, code: "MANDATORY_PANELS" });
  }
  const allowedColumns = ["customer", "articles", "foilColors", "promisedAt", "owner", "status"];
  const orderColumns = Array.isArray(value.orderColumns) ? [...new Set(value.orderColumns)] : allowedColumns;
  if (orderColumns.some((column) => !allowedColumns.includes(column)) || !orderColumns.includes("customer") || !orderColumns.includes("status")) {
    throw Object.assign(new Error("Klant en status blijven vaste orderkolommen."), { statusCode: 400, code: "MANDATORY_COLUMNS" });
  }
  const allowedProductionPanels = ["batch", "guidance", "fallback"];
  const productionPanels = Array.isArray(value.productionPanels) ? [...new Set(value.productionPanels)] : allowedProductionPanels;
  if (productionPanels.some((panel) => !allowedProductionPanels.includes(panel)) || !productionPanels.includes("batch")) {
    throw Object.assign(new Error("Batchinformatie blijft altijd zichtbaar."), { statusCode: 400, code: "MANDATORY_PANELS" });
  }
  return {
    view: allowedValue(value.view, ["focus", "compact"], "Weergave"),
    density: allowedValue(value.density, ["comfortable", "compact"], "Dichtheid"),
    optionalPanels: { recent: Boolean(value.optionalPanels?.recent), shortcuts: Boolean(value.optionalPanels?.shortcuts) },
    panelOrder: [...panelOrder],
    orderColumns,
    orderDensity: allowedValue(value.orderDensity ?? "compact", ["compact", "comfortable"], "Orderdichtheid"),
    productionPanels,
  };
}

function parseCookies(request) {
  return Object.fromEntries(String(request.headers.cookie ?? "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) throw Object.assign(new Error("Request is te groot."), { statusCode: 413, code: "PAYLOAD_TOO_LARGE" });
    chunks.push(chunk);
  }
  if (bytes === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Ongeldige JSON."), { statusCode: 400, code: "INVALID_JSON" });
  }
}

function securityHeaders(response) {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  response.setHeader("Referrer-Policy", "same-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
}

function json(response, statusCode, payload) {
  const body = `${JSON.stringify(payload)}\n`;
  response.statusCode = statusCode;
  securityHeaders(response);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.end(body);
}

function binary(response, statusCode, payload) {
  securityHeaders(response); if (payload.allowSameOriginFrame === true) { response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'self'"); response.setHeader("X-Frame-Options", "SAMEORIGIN"); } response.statusCode = statusCode; response.setHeader("Content-Type", payload.mimeType); response.setHeader("Content-Length", payload.bytes.length); response.setHeader("Content-Disposition", `${payload.disposition === "attachment" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(payload.filename)}`); response.setHeader("ETag", `\"${payload.sha256}\"`); if (payload.cacheControl) response.setHeader("Cache-Control", payload.cacheControl); response.end(payload.bytes);
}

function cookieHeader(token, secure, clear = false, maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000)) {
  const value = clear ? "" : encodeURIComponent(token);
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : maxAgeSeconds}${secure ? "; Secure" : ""}`;
}

export function createSportpaleisPilotRequestHandler(service, { onError } = {}) {
  const publicProposalBuckets = new Map();
  return async function handle(request, response) {
    const requestUrl = new URL(request.url ?? "/", "http://sportpaleis.local");
    const route = requestUrl.pathname;
    if (!route.startsWith("/api/sportpaleis/v1/") && route !== "/health/sportpaleis" && route !== "/ready/sportpaleis") return false;
    try {
      if (request.headers.origin && request.headers.origin !== service.allowedOrigin) {
        throw Object.assign(new Error("Origin niet toegestaan."), { statusCode: 403, code: "ORIGIN_FORBIDDEN" });
      }
      const token = parseCookies(request)[SESSION_COOKIE];
      const csrf = request.headers["x-csrf-token"];
      const method = request.method ?? "GET";
      if (route.startsWith("/api/sportpaleis/v1/public/proposals/")) {
        const bucketKey = sha256(`${request.socket.remoteAddress ?? "unknown"}:${route.split("/")[6] ?? "unknown"}`); const now = Date.now();
        const recent = (publicProposalBuckets.get(bucketKey) ?? []).filter((stamp) => now - stamp < 15 * 60 * 1_000);
        if (recent.length >= 90) throw Object.assign(new Error("Te veel verzoeken voor deze klantlink. Probeer later opnieuw."), { statusCode: 429, code: "PROPOSAL_RATE_LIMITED" });
        recent.push(now); publicProposalBuckets.set(bucketKey, recent);
      }
      if (route === "/health/sportpaleis" && method === "GET") return json(response, 200, await service.health()) ?? true;
      if (route === "/ready/sportpaleis" && method === "GET") return json(response, 200, { status: "ready", releaseId: service.releaseId }) ?? true;
      const publicProposalMatch = route.match(/^\/api\/sportpaleis\/v1\/public\/proposals\/([^/]+)$/);
      if (publicProposalMatch && method === "GET") { json(response, 200, await service.publicTeamkitProposal(decodeURIComponent(publicProposalMatch[1]))); return true; }
      const publicProposalDraftMatch = route.match(/^\/api\/sportpaleis\/v1\/public\/proposals\/([^/]+)\/(draft|submit)$/);
      if (publicProposalDraftMatch && method === "POST") { json(response, 200, await service.savePublicTeamkitIntake(decodeURIComponent(publicProposalDraftMatch[1]), await readJson(request), { submit: publicProposalDraftMatch[2] === "submit" })); return true; }
      const publicProposalFeedbackMatch = route.match(/^\/api\/sportpaleis\/v1\/public\/proposals\/([^/]+)\/feedback$/);
      if (publicProposalFeedbackMatch && method === "POST") { json(response, 201, await service.savePublicTeamkitFeedback(decodeURIComponent(publicProposalFeedbackMatch[1]), await readJson(request))); return true; }
      const publicProposalApprovalMatch = route.match(/^\/api\/sportpaleis\/v1\/public\/proposals\/([^/]+)\/approve$/);
      if (publicProposalApprovalMatch && method === "POST") { json(response, 200, await service.approvePublicTeamkitProposal(decodeURIComponent(publicProposalApprovalMatch[1]), await readJson(request))); return true; }
      const publicProposalSourceMatch = route.match(/^\/api\/sportpaleis\/v1\/public\/proposals\/([^/]+)\/sources\/([^/]+)$/);
      if (publicProposalSourceMatch && method === "GET") { binary(response, 200, await service.publicTeamkitProposalSource(decodeURIComponent(publicProposalSourceMatch[1]), decodeURIComponent(publicProposalSourceMatch[2]))); return true; }
      const publicProposalPdfMatch = route.match(/^\/api\/sportpaleis\/v1\/public\/proposals\/([^/]+)\/final\.pdf$/);
      if (publicProposalPdfMatch && method === "GET") { binary(response, 200, await service.publicTeamkitProposalPdf(decodeURIComponent(publicProposalPdfMatch[1]))); return true; }
      if (route === "/api/sportpaleis/v1/auth/activate" && method === "POST") {
        json(response, 200, await service.activateInvitedUser(await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/recovery/request" && method === "POST") {
        json(response, 202, await service.requestPasswordReset({ ...(await readJson(request)), remoteAddress: request.socket.remoteAddress }));
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/recovery/complete" && method === "POST") {
        json(response, 200, await service.completePasswordReset(await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/review-access/activate" && method === "POST") {
        const result = await service.activateReviewDeveloperGrant(await readJson(request));
        response.setHeader("Set-Cookie", cookieHeader(result.sessionToken, service.secureCookies, false, result.cookieMaxAgeSeconds));
        json(response, 200, { user: publicUser(result.principal), csrfToken: result.csrfToken, expiresAt: result.expiresAt, grant: result.grant, releaseId: service.releaseId });
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/login" && method === "POST") {
        const result = await service.loginWithPersistedCsrf({ ...(await readJson(request)), remoteAddress: request.socket.remoteAddress });
        response.setHeader("Set-Cookie", cookieHeader(result.token, service.secureCookies, false, result.cookieMaxAgeSeconds));
        json(response, 200, { user: result.user, csrfToken: result.csrfToken, expiresAt: result.expiresAt, releaseId: service.releaseId });
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/demo-options" && method === "GET") {
        json(response, 200, { enabled: service.demoMode === true });
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/demo" && method === "POST") {
        const result = await service.demoLogin((await readJson(request)).view);
        response.setHeader("Set-Cookie", cookieHeader(result.token, service.secureCookies, false, result.cookieMaxAgeSeconds));
        json(response, 200, { user: result.user, csrfToken: result.csrfToken, expiresAt: result.expiresAt, demo: true, releaseId: service.releaseId });
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/session" && method === "GET") {
        json(response, 200, await service.issueSessionView(token));
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/logout" && method === "POST") {
        const { user } = await service.authenticate(token);
        await service.logout(token, user, csrf);
        response.setHeader("Set-Cookie", cookieHeader("", service.secureCookies, true));
        json(response, 200, { ok: true });
        return true;
      }
      if (route === "/api/sportpaleis/v1/admin/review-access/grants" && method === "POST") {
        json(response, 201, await service.issueReviewDeveloperGrant(token, csrf, await readJson(request)));
        return true;
      }
      const reviewGrantRevokeMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/review-access\/grants\/([^/]+)\/revoke$/);
      if (reviewGrantRevokeMatch && method === "POST") {
        json(response, 200, await service.revokeReviewDeveloperGrant(token, csrf, decodeURIComponent(reviewGrantRevokeMatch[1])));
        return true;
      }
      if (typeof service.assertTemporaryReviewRequest === "function") await service.assertTemporaryReviewRequest(token, { method, route });
      if (route === "/api/sportpaleis/v1/auth/switch" && method === "POST") {
        const result = await service.fastSwitch(token, csrf, { ...(await readJson(request)), remoteAddress: request.socket.remoteAddress });
        response.setHeader("Set-Cookie", cookieHeader(result.token, service.secureCookies, false, result.cookieMaxAgeSeconds));
        json(response, 200, { user: result.user, csrfToken: result.csrfToken, expiresAt: result.expiresAt, deviceMode: result.deviceMode, releaseId: service.releaseId });
        return true;
      }
      if (route === "/api/sportpaleis/v1/bootstrap" && method === "GET") {
        json(response, 200, await service.bootstrap(token));
        return true;
      }
      if (route === "/api/sportpaleis/v1/reviews" && method === "GET") {
        json(response, 200, await service.reviewManifest(token));
        return true;
      }
      if (route.startsWith("/api/sportpaleis/v1/reviews")) {
        await service.reviewManifest(token);
        throw Object.assign(new Error("Candidate mag productie of externe systemen niet wijzigen."), { statusCode: 403, code: "REVIEW_SIDE_EFFECT_FORBIDDEN" });
      }
      if (route === "/api/sportpaleis/v1/state-revision" && method === "GET") {
        json(response, 200, await service.currentRevision(token));
        return true;
      }
      if (route === "/api/sportpaleis/v1/teamwear/catalog" && method === "GET") {
        json(response, 200, await service.searchTeamwearCatalog(token, Object.fromEntries(requestUrl.searchParams.entries())));
        return true;
      }
      // One server-side boundary protects every authenticated Teamwear endpoint.
      // Public customer links remain separately scoped by their unguessable proposal token.
      if (route === "/api/sportpaleis/v1/teamkit-proposals" || route.startsWith("/api/sportpaleis/v1/teamkit-proposals/")) {
        await service.assertTeamwearPilotAccess(token);
      }
      if (route === "/api/sportpaleis/v1/teamkit-proposals" && method === "POST") { json(response, 201, await service.createTeamkitProposal(token, csrf, await readJson(request), request.headers["idempotency-key"])); return true; }
      const teamkitProposalMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)$/);
      if (teamkitProposalMatch && method === "PATCH") { json(response, 200, await service.updateTeamkitProposal(token, csrf, decodeURIComponent(teamkitProposalMatch[1]), await readJson(request))); return true; }
      const teamkitCustomerLinkMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/customer-link$/);
      if (teamkitCustomerLinkMatch && method === "POST") { json(response, 200, await service.issueTeamkitCustomerLink(token, csrf, decodeURIComponent(teamkitCustomerLinkMatch[1]))); return true; }
      const teamkitStatusMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/status$/);
      if (teamkitStatusMatch && method === "POST") { json(response, 200, await service.setTeamkitProposalStatus(token, csrf, decodeURIComponent(teamkitStatusMatch[1]), await readJson(request))); return true; }
      const teamkitCopyMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/copy$/);
      if (teamkitCopyMatch && method === "POST") { json(response, 201, await service.copyTeamkitProposal(token, csrf, decodeURIComponent(teamkitCopyMatch[1]), await readJson(request))); return true; }
      const teamkitSourceCreateMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/sources$/);
      if (teamkitSourceCreateMatch && method === "POST") { json(response, 201, await service.addTeamkitProposalSource(token, csrf, decodeURIComponent(teamkitSourceCreateMatch[1]), await readJson(request))); return true; }
      const teamkitSourceMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/sources\/([^/]+)$/);
      if (teamkitSourceMatch && method === "GET") { binary(response, 200, await service.teamkitProposalSource(token, decodeURIComponent(teamkitSourceMatch[1]), decodeURIComponent(teamkitSourceMatch[2]))); return true; }
      const teamkitSourceLinkMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/sources\/([^/]+)\/production-asset$/);
      if (teamkitSourceLinkMatch && method === "POST") { json(response, 200, await service.linkTeamkitProposalSource(token, csrf, decodeURIComponent(teamkitSourceLinkMatch[1]), decodeURIComponent(teamkitSourceLinkMatch[2]), await readJson(request))); return true; }
      const teamkitPdfMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/pdf$/);
      if (teamkitPdfMatch && method === "GET") { binary(response, 200, await service.teamkitProposalPdf(token, decodeURIComponent(teamkitPdfMatch[1]), requestUrl.searchParams.get("revision"))); return true; }
      const teamkitTaskMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/fulfillment\/([^/]+)$/);
      if (teamkitTaskMatch && method === "PATCH") { json(response, 200, await service.updateTeamkitFulfillmentTask(token, csrf, decodeURIComponent(teamkitTaskMatch[1]), decodeURIComponent(teamkitTaskMatch[2]), await readJson(request))); return true; }
      const teamkitSizingMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/production-sizing$/);
      if (teamkitSizingMatch && method === "POST") { json(response, 200, await service.updateTeamkitProductionSizing(token, csrf, decodeURIComponent(teamkitSizingMatch[1]), await readJson(request))); return true; }
      const teamkitInternalProductionMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/internal-production$/);
      if (teamkitInternalProductionMatch && method === "POST") { json(response, 201, await service.prepareTeamkitInternalProduction(token, csrf, decodeURIComponent(teamkitInternalProductionMatch[1]), await readJson(request))); return true; }
      const teamkitMailPreviewMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/mail\/preview$/);
      if (teamkitMailPreviewMatch && method === "POST") { json(response, 200, await service.previewTeamkitProposalMail(token, decodeURIComponent(teamkitMailPreviewMatch[1]), await readJson(request))); return true; }
      const teamkitMailCaptureMatch = route.match(/^\/api\/sportpaleis\/v1\/teamkit-proposals\/([^/]+)\/mail\/capture$/);
      if (teamkitMailCaptureMatch && method === "POST") { json(response, 200, await service.captureTeamkitProposalMail(token, csrf, decodeURIComponent(teamkitMailCaptureMatch[1]), await readJson(request), request.headers["idempotency-key"])); return true; }
      if (route === "/api/sportpaleis/v1/orders" && method === "POST") {
        json(response, 201, await service.createOrder(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/quick-production-intakes" && method === "POST") {
        json(response, 201, await service.createQuickProductionIntake(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/visual-compositions" && method === "POST") {
        json(response, 201, await service.createVisualComposition(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const visualCompositionSourceMatch = route.match(/^\/api\/sportpaleis\/v1\/visual-compositions\/([^/]+)\/source$/);
      if (visualCompositionSourceMatch && method === "GET") {
        binary(response, 200, await service.visualCompositionSource(token, decodeURIComponent(visualCompositionSourceMatch[1])));
        return true;
      }
      const visualCompositionMatch = route.match(/^\/api\/sportpaleis\/v1\/visual-compositions\/([^/]+)$/);
      if (visualCompositionMatch && method === "PATCH") {
        json(response, 200, await service.updateVisualComposition(token, csrf, decodeURIComponent(visualCompositionMatch[1]), await readJson(request)));
        return true;
      }
      const visualCompositionReviewMatch = route.match(/^\/api\/sportpaleis\/v1\/visual-compositions\/([^/]+)\/review$/);
      if (visualCompositionReviewMatch && method === "POST") {
        json(response, 200, await service.submitVisualCompositionReview(token, csrf, decodeURIComponent(visualCompositionReviewMatch[1]), await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/creative-vector-drafts" && method === "POST") {
        json(response, 201, await service.createCreativeVectorDraft(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const creativeVectorFileMatch = route.match(/^\/api\/sportpaleis\/v1\/creative-vector-drafts\/([^/]+)\/(source|derivative)$/);
      if (creativeVectorFileMatch && method === "GET") {
        binary(response, 200, await service.creativeVectorDraftFile(token, decodeURIComponent(creativeVectorFileMatch[1]), creativeVectorFileMatch[2]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/webshop-intakes/mail-document" && method === "POST") {
        json(response, 201, await service.ingestWebshopMailDocument(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const mailboxClassificationMatch = route.match(/^\/api\/sportpaleis\/v1\/mailbox\/messages\/([^/]+)\/classify$/);
      if (mailboxClassificationMatch && method === "POST") {
        json(response, 200, await service.manuallyClassifySportpaleisMailboxMessage(token, csrf, decodeURIComponent(mailboxClassificationMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const webshopSourceMatch = route.match(/^\/api\/sportpaleis\/v1\/webshop-intakes\/sources\/([^/]+)$/);
      if (webshopSourceMatch && method === "GET") {
        binary(response, 200, await service.webshopDocumentSource(token, decodeURIComponent(webshopSourceMatch[1])));
        return true;
      }
      const webshopAcceptMatch = route.match(/^\/api\/sportpaleis\/v1\/webshop-intakes\/matches\/([^/]+)\/accept$/);
      if (webshopAcceptMatch && method === "POST") {
        json(response, 201, await service.acceptWebshopMatch(token, csrf, decodeURIComponent(webshopAcceptMatch[1]), await readJson(request)));
        return true;
      }
      const webshopPrintMatch = route.match(/^\/api\/sportpaleis\/v1\/webshop-orders\/([^/]+)\/print$/);
      if (webshopPrintMatch && method === "POST") {
        json(response, 201, await service.recordWebshopOrderPrint(token, csrf, decodeURIComponent(webshopPrintMatch[1]), request.headers["idempotency-key"]));
        return true;
      }
      const webshopStockLogoMatch = route.match(/^\/api\/sportpaleis\/v1\/webshop-orders\/([^/]+)\/stock-logo\/apply$/);
      if (webshopStockLogoMatch && method === "POST") {
        json(response, 200, await service.applyWebshopStockLogo(token, csrf, decodeURIComponent(webshopStockLogoMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const quickIntakeSourceMatch = route.match(/^\/api\/sportpaleis\/v1\/quick-production-intakes\/([^/]+)\/source$/);
      if (quickIntakeSourceMatch && method === "GET") {
        binary(response, 200, await service.quickProductionIntakeSource(token, decodeURIComponent(quickIntakeSourceMatch[1])));
        return true;
      }
      const quickIntakeAcceptMatch = route.match(/^\/api\/sportpaleis\/v1\/quick-production-intakes\/([^/]+)\/accept$/);
      if (quickIntakeAcceptMatch && method === "POST") {
        json(response, 201, await service.acceptQuickProductionIntake(token, csrf, decodeURIComponent(quickIntakeAcceptMatch[1]), await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/orders/bulk-advance" && method === "POST") {
        json(response, 200, await service.bulkAdvanceOrders(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/orders/bulk-complete-production" && method === "POST") {
        json(response, 200, await service.completeProductionOrders(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/barcode/resolve" && method === "POST") {
        json(response, 200, await service.resolveBarcode(token, await readJson(request)));
        return true;
      }
      const accountRecoveryIssueMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/users\/([^/]+)\/account-recovery$/);
      if (accountRecoveryIssueMatch && method === "POST") {
        json(response, 200, await service.issuePasswordReset(token, csrf, decodeURIComponent(accountRecoveryIssueMatch[1])));
        return true;
      }
      if (route === "/api/sportpaleis/v1/orders" && method === "GET") {
        json(response, 200, await service.orderHistory(token, Object.fromEntries(requestUrl.searchParams)));
        return true;
      }
      const orderReconciliationDecisionMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/production-reconciliation\/decision$/);
      if (orderReconciliationDecisionMatch && method === "POST") {
        json(response, 200, await service.resolveExistingOrderProductionReconciliationFinding(token, csrf, decodeURIComponent(orderReconciliationDecisionMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const orderReconciliationMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/production-reconciliation$/);
      if (orderReconciliationMatch && method === "POST") {
        json(response, 200, await service.confirmExistingOrderProductionReconciliation(token, csrf, decodeURIComponent(orderReconciliationMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const orderUpdateMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)$/);
      if (orderUpdateMatch && method === "GET") {
        json(response, 200, await service.order(token, decodeURIComponent(orderUpdateMatch[1])));
        return true;
      }
      if (orderUpdateMatch && method === "PATCH") {
        const payload = await readJson(request);
        json(response, 200, await service.updateOrder(token, csrf, decodeURIComponent(orderUpdateMatch[1]), payload, Number(payload.expectedRevision)));
        return true;
      }
      const orderDeletionMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/(delete|restore)$/);
      if (orderDeletionMatch && method === "POST") {
        const payload = await readJson(request);
        const value = orderDeletionMatch[2] === "delete"
          ? await service.deleteOrder(token, csrf, decodeURIComponent(orderDeletionMatch[1]), payload)
          : await service.restoreOrder(token, csrf, decodeURIComponent(orderDeletionMatch[1]), payload);
        json(response, 200, value);
        return true;
      }
      if (route === "/api/sportpaleis/v1/admin/prelive-cleanup-plan" && method === "GET") {
        json(response, 200, await service.preliveCleanupPlan(token)); return true;
      }
      const productionArchiveMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/production-work\/(archive|restore)$/);
      if (productionArchiveMatch && method === "POST") {
        const payload = await readJson(request);
        const value = productionArchiveMatch[2] === "archive"
          ? await service.archiveProductionWork(token, csrf, decodeURIComponent(productionArchiveMatch[1]), payload)
          : await service.restoreProductionWork(token, csrf, decodeURIComponent(productionArchiveMatch[1]), payload);
        json(response, 200, value); return true;
      }
      const orderNotesMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/notes$/);
      if (orderNotesMatch && method === "POST") {
        json(response, 201, await service.addOrderNote(token, csrf, decodeURIComponent(orderNotesMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const pickupMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/pickup$/);
      if (pickupMatch && method === "POST") {
        const payload = await readJson(request);
        json(response, 200, await service.confirmPickup(token, csrf, decodeURIComponent(pickupMatch[1]), payload, Number(payload.expectedRevision)));
        return true;
      }
      const communicationMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/communication-status$/);
      if (communicationMatch && method === "POST") {
        const payload = await readJson(request);
        json(response, 200, await service.recordCommunicationStatus(token, csrf, decodeURIComponent(communicationMatch[1]), payload, Number(payload.expectedRevision)));
        return true;
      }
      const operationalMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/operational-event$/);
      if (operationalMatch && method === "POST") {
        json(response, 200, await service.recordOperationalEvent(token, csrf, decodeURIComponent(operationalMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/mailbatches/import" && method === "POST") {
        json(response, 201, await service.importMailbatch(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/admin/website-sync/run" && method === "POST") {
        json(response, 200, await service.runWebsiteSync(token, csrf));
        return true;
      }
      const websiteSyncChangeMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/website-sync\/changes\/([^/]+)$/);
      if (websiteSyncChangeMatch && method === "POST") {
        json(response, 200, await service.reviewWebsiteSyncChange(token, csrf, decodeURIComponent(websiteSyncChangeMatch[1]), await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-elements" && method === "POST") {
        json(response, 201, await service.upsertProductionElement(token, csrf, await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-asset-sources" && method === "POST") {
        json(response, 201, await service.createProductionAssetSource(token, csrf, await readJson(request)));
        return true;
      }
      const productionAssetOriginalMatch = route.match(/^\/api\/sportpaleis\/v1\/production-asset-sources\/([^/]+)\/original\.pdf$/);
      if (productionAssetOriginalMatch && method === "GET") {
        binary(response, 200, await service.productionAssetOriginal(token, decodeURIComponent(productionAssetOriginalMatch[1])));
        return true;
      }
      const productionAssetFidelityMatch = route.match(/^\/api\/sportpaleis\/v1\/production-asset-sources\/([^/]+)\/fidelity$/);
      if (productionAssetFidelityMatch && method === "POST") {
        json(response, 200, await service.reviewProductionAssetSourceFidelity(token, csrf, decodeURIComponent(productionAssetFidelityMatch[1]), await readJson(request)));
        return true;
      }
      const productionAssetReviewDraftMatch = route.match(/^\/api\/sportpaleis\/v1\/production-asset-sources\/([^/]+)\/review-draft$/);
      if (productionAssetReviewDraftMatch && method === "POST") {
        json(response, 200, await service.saveProductionAssetReviewDraft(token, csrf, decodeURIComponent(productionAssetReviewDraftMatch[1]), await readJson(request)));
        return true;
      }
      const productionAssetPromoteMatch = route.match(/^\/api\/sportpaleis\/v1\/production-asset-sources\/([^/]+)\/promote$/);
      if (productionAssetPromoteMatch && method === "POST") {
        json(response, 201, await service.promoteProductionAsset(token, csrf, decodeURIComponent(productionAssetPromoteMatch[1]), await readJson(request)));
        return true;
      }
      const productionAssetPreviewMatch = route.match(/^\/api\/sportpaleis\/v1\/production-asset-sources\/([^/]+)\/candidates\/([^/]+)\/preview\.svg$/);
      if (productionAssetPreviewMatch && method === "GET") {
        binary(response, 200, await service.productionAssetCandidatePreview(token, decodeURIComponent(productionAssetPreviewMatch[1]), decodeURIComponent(productionAssetPreviewMatch[2])));
        return true;
      }
      const productionAssetDocumentPreviewMatch = route.match(/^\/api\/sportpaleis\/v1\/production-asset-sources\/([^/]+)\/preview\.svg$/);
      if (productionAssetDocumentPreviewMatch && method === "GET") {
        binary(response, 200, await service.productionAssetDocumentPreview(token, decodeURIComponent(productionAssetDocumentPreviewMatch[1])));
        return true;
      }
      const productionAssetManagedPreviewMatch = route.match(/^\/api\/sportpaleis\/v1\/production-assets\/([^/]+)\/preview\.svg$/);
      if (productionAssetManagedPreviewMatch && method === "GET") {
        binary(response, 200, await service.productionAssetPreview(token, decodeURIComponent(productionAssetManagedPreviewMatch[1])));
        return true;
      }
      const productionAssetNumberPreviewMatch = route.match(/^\/api\/sportpaleis\/v1\/production-assets\/([^/]+)\/numbers\/(\d{1,4})\.svg$/);
      if (productionAssetNumberPreviewMatch && method === "GET") {
        binary(response, 200, await service.productionAssetNumberPreview(token, decodeURIComponent(productionAssetNumberPreviewMatch[1]), productionAssetNumberPreviewMatch[2]));
        return true;
      }
      const productionAssetLifecycleMatch = route.match(/^\/api\/sportpaleis\/v1\/production-assets\/([^/]+)\/lifecycle$/);
      if (productionAssetLifecycleMatch && method === "POST") {
        json(response, 200, await service.setProductionAssetLifecycle(token, csrf, decodeURIComponent(productionAssetLifecycleMatch[1]), await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-fonts/inspect" && method === "POST") {
        json(response, 200, await service.inspectProductionFont(token, csrf, await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-fonts" && method === "POST") {
        json(response, 201, await service.addProductionFont(token, csrf, await readJson(request)));
        return true;
      }
      const productionFontSourceMatch = route.match(/^\/api\/sportpaleis\/v1\/production-fonts\/([^/]+)\/source$/);
      if (productionFontSourceMatch && method === "GET") {
        const source = await service.productionFontSource(token, decodeURIComponent(productionFontSourceMatch[1]));
        if (source.redirect) { securityHeaders(response); response.statusCode = 302; response.setHeader("Location", source.redirect); response.end(); }
        else binary(response, 200, source);
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-element-requirements" && method === "POST") {
        json(response, 200, await service.setProductionElementRequirement(token, csrf, await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-jobs" && method === "GET") {
        json(response, 200, await service.productionJobHistory(token, { query: requestUrl.searchParams.get("q") ?? "", cursor: requestUrl.searchParams.get("cursor") ?? "", limit: requestUrl.searchParams.get("limit") ?? "" }));
        return true;
      }
      const productionJobDetailMatch = route.match(/^\/api\/sportpaleis\/v1\/production-jobs\/([^/]+)$/);
      if (productionJobDetailMatch && method === "GET") {
        json(response, 200, await service.productionJob(token, decodeURIComponent(productionJobDetailMatch[1])));
        return true;
      }
      const productionJobReplotMatch = route.match(/^\/api\/sportpaleis\/v1\/production-jobs\/([^/]+)\/replot$/);
      if (productionJobReplotMatch && method === "POST") {
        json(response, 201, await service.replotProductionJob(token, csrf, decodeURIComponent(productionJobReplotMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const productionJobRejectedRetryMatch = route.match(/^\/api\/sportpaleis\/v1\/production-jobs\/([^/]+)\/retry-after-rejection$/);
      if (productionJobRejectedRetryMatch && method === "POST") {
        json(response, 201, await service.retryRejectedProductionJob(token, csrf, decodeURIComponent(productionJobRejectedRetryMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const productionJobCompleteMatch = route.match(/^\/api\/sportpaleis\/v1\/production-jobs\/([^/]+)\/complete$/);
      if (productionJobCompleteMatch && method === "POST") {
        json(response, 200, await service.completeProductionJob(token, csrf, decodeURIComponent(productionJobCompleteMatch[1]), request.headers["idempotency-key"]));
        return true;
      }
      const productionJobArtifactMatch = route.match(/^\/api\/sportpaleis\/v1\/production-jobs\/([^/]+)\/artifact$/);
      if (productionJobArtifactMatch && method === "GET") {
        binary(response, 200, await service.productionJobArtifact(token, decodeURIComponent(productionJobArtifactMatch[1])));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-jobs" && method === "POST") {
        json(response, 201, await service.createProductionJob(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-proposals" && method === "POST") {
        json(response, 201, await service.createProductionProposal(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-proposals/efficiency-check" && method === "POST") {
        json(response, 200, await service.analyzeProductionEfficiency(token, csrf, await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-proposals/current-job" && method === "POST") {
        json(response, 201, await service.prepareCurrentProductionGroup(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const mailPreviewMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/mail\/preview$/);
      if (mailPreviewMatch && method === "POST") {
        json(response, 200, await service.previewOrderMail(token, decodeURIComponent(mailPreviewMatch[1]), await readJson(request)));
        return true;
      }
      const mailCaptureMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/mail\/capture$/);
      if (mailCaptureMatch && method === "POST") {
        json(response, 200, await service.captureOrderMail(token, csrf, decodeURIComponent(mailCaptureMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const mailHistoryMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/mail\/history$/);
      if (mailHistoryMatch && method === "GET") {
        json(response, 200, { history: await service.orderMailHistory(token, decodeURIComponent(mailHistoryMatch[1])) });
        return true;
      }
      const orderMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/advance$/);
      if (orderMatch && method === "POST") {
        const payload = await readJson(request);
        json(response, 200, await service.advanceOrder(token, csrf, decodeURIComponent(orderMatch[1]), Number(payload.expectedRevision), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/feedback" && method === "POST") {
        json(response, 201, await service.saveFeedback(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      const feedbackAttachmentMatch = route.match(/^\/api\/sportpaleis\/v1\/feedback\/([^/]+)\/attachments\/([^/]+)$/);
      if (feedbackAttachmentMatch && method === "GET") {
        const attachment = await service.feedbackAttachment(token, decodeURIComponent(feedbackAttachmentMatch[1]), decodeURIComponent(feedbackAttachmentMatch[2]));
        const body = Buffer.from(attachment.dataBase64, "base64");
        response.statusCode = 200;
        securityHeaders(response);
        response.setHeader("Content-Type", attachment.mimeType);
        response.setHeader("Content-Disposition", `inline; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`);
        response.setHeader("Content-Length", body.length);
        response.end(body);
        return true;
      }
      if (route === "/api/sportpaleis/v1/preferences" && method === "PUT") {
        json(response, 200, await service.savePreferences(token, csrf, await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/admin/extra-users" && method === "POST") {
        json(response, 201, await service.requestUsers(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/admin/users" && method === "POST") {
        json(response, 201, await service.createInvitedUser(token, csrf, await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/admin/employees" && method === "POST") {
        json(response, 200, await service.upsertEmployee(token, csrf, await readJson(request)));
        return true;
      }
      const employeeMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/employees\/([^/]+)$/);
      if (employeeMatch && method === "DELETE") {
        json(response, 200, await service.deleteEmployee(token, csrf, decodeURIComponent(employeeMatch[1])));
        return true;
      }
      const userMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/users\/([^/]+)$/);
      if (userMatch && method === "PATCH") {
        json(response, 200, await service.updateUser(token, csrf, decodeURIComponent(userMatch[1]), await readJson(request)));
        return true;
      }
      const userInvitationMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/users\/([^/]+)\/invitation$/);
      if (userInvitationMatch && method === "POST") {
        json(response, 200, await service.reissueInvitedUser(token, csrf, decodeURIComponent(userInvitationMatch[1])));
        return true;
      }
      if (userInvitationMatch && method === "DELETE") {
        json(response, 200, await service.cancelInvitedUser(token, csrf, decodeURIComponent(userInvitationMatch[1])));
        return true;
      }
      const userPinMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/users\/([^/]+)\/quick-pin$/);
      if (userPinMatch && method === "POST") {
        json(response, 200, await service.setQuickPin(token, csrf, decodeURIComponent(userPinMatch[1]), await readJson(request)));
        return true;
      }
      const articleMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/articles\/([^/]+)$/);
      if (route === "/api/sportpaleis/v1/admin/articles" && method === "POST") {
        json(response, 201, await service.createArticle(token, csrf, await readJson(request)));
        return true;
      }
      if (articleMatch && method === "PATCH") {
        json(response, 200, await service.updateArticle(token, csrf, decodeURIComponent(articleMatch[1]), await readJson(request)));
        return true;
      }
      const associationMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/associations\/([^/]+)$/);
      if (route === "/api/sportpaleis/v1/admin/associations" && method === "POST") {
        json(response, 201, await service.createAssociation(token, csrf, await readJson(request)));
        return true;
      }
      if (associationMatch && method === "PATCH") {
        json(response, 200, await service.updateAssociation(token, csrf, decodeURIComponent(associationMatch[1]), await readJson(request)));
        return true;
      }
      const profileMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/production-profiles\/([^/]+)$/);
      if (profileMatch && method === "PATCH") {
        json(response, 200, await service.updateProductionProfile(token, csrf, decodeURIComponent(profileMatch[1]), await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/admin/settings" && method === "PATCH") {
        json(response, 200, await service.updateSettings(token, csrf, await readJson(request)));
        return true;
      }
      const rollMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/foil-rolls\/([^/]+)$/);
      if (route === "/api/sportpaleis/v1/admin/foil-rolls" && method === "POST") {
        json(response, 201, await service.createFoilRoll(token, csrf, await readJson(request)));
        return true;
      }
      if (rollMatch && method === "PATCH") {
        json(response, 200, await service.updateFoilRoll(token, csrf, decodeURIComponent(rollMatch[1]), await readJson(request)));
        return true;
      }
      json(response, 404, { error: "NOT_FOUND", message: "API-route niet gevonden." });
      return true;
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
      try { onError?.({ error, method: request.method ?? "GET", route, statusCode }); } catch {}
      json(response, statusCode, {
        error: error?.code ?? "INTERNAL_ERROR",
        message: statusCode >= 500 ? "De Workspace-service is tijdelijk niet beschikbaar." : error.message,
        ...(error?.currentRevision ? { currentRevision: error.currentRevision } : {}),
      });
      return true;
    }
  };
}

export function seedPasswordsFromEnvironment(environment = process.env) {
  return {
    kevin: environment.SPORTPALEIS_KEVIN_PASSWORD,
    patrick: environment.SPORTPALEIS_PATRICK_PASSWORD,
    collega: environment.SPORTPALEIS_COLLEAGUE_PASSWORD,
    "donovan-support": environment.SPORTPALEIS_SUPPORT_PASSWORD,
  };
}
