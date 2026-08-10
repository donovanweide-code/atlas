import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  SPORTPALEIS_ASSOCIATIONS,
  SPORTPALEIS_CONFIGURATION_VERSION,
} from "../config/sportpaleis-bedrukking-configuration.mjs";
import { SPORTPALEIS_LIVE_PILOT_ARTICLES } from "../config/sportpaleis-live-pilot-catalog.mjs";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "sportpaleis_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 6;
const ROLE = new Set(["admin", "operator", "store", "support"]);
const STAGE_ORDER = ["ORDER", "CONTROL", "PRINT", "DONE"];
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const PILOT_SCHEMA_VERSION = 8;
const PILOT_RELEASE_ID = "SPW-BEDRUKKING-PILOT-READINESS-007-20260810";
const BACK_NUMBER_SIZE_CLASSES = new Set(["JUNIOR", "SENIOR"]);
const PERSONALIZATION_FIELDS = ["initials", "name", "backNumber", "shortsNumber"];

const ARTICLE_CATALOG = structuredClone(SPORTPALEIS_LIVE_PILOT_ARTICLES);
const ARTICLE_IMAGE_KEYS = new Set(ARTICLE_CATALOG.map(({ imageKey }) => imageKey));

const PRODUCTION_PROFILES = [
  { id: "profile-shirt", name: "A.S.C. wedstrijdshirt · rug", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Senior rugnummer 22 cm", fontProfile: "schluber (Spain voor thuiswedstrijdshirt)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials", "name", "backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A5:J5" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
  { id: "profile-keeper", name: "A.S.C. keeperstrui · rug", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Senior rugnummer 22 cm", fontProfile: "schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials", "name", "backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A5:J5" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
  { id: "profile-shorts", name: "A.S.C. wedstrijdshort · pijp", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Shortnummer 7,5 cm", fontProfile: "schluber (Spain voor thuiswedstrijdshort)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials", "shortsNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-initials", name: "A.S.C. initialen · borst", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Initialen 3 cm", fontProfile: "schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-none", name: "Geen bedrukking", placement: "Niet van toepassing", referenceDistanceCm: null, sizeLabel: "Geen", fontProfile: "Niet van toepassing", foilColor: "Niet van toepassing", mirror: false, rotationDeg: 0, supports: [], instruction: "Dit artikel heeft standaard geen bedrukking." },
  { id: "profile-pending", name: "Live artikel · productie-inrichting volgt", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "DATA_GAP", fontProfile: "Onbekend", foilColor: "Onbekend", mirror: null, rotationDeg: null, supports: [], instruction: "Kritieke productie-inrichting ontbreekt. Het artikel mag worden besteld en naar Productie gaan, maar de uiteindelijke productieactie blijft geblokkeerd tot maat, bedrukoptie, letterprofiel en foliekleur voldoende zijn bevestigd." },
];
PRODUCTION_PROFILES.push(
  { id: "profile-shirt-home", name: "A.S.C. thuiswedstrijdshirt · rugnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Junior bronwaarde 20 cm · Senior 22 cm", fontProfile: "schluber (Spain voor thuiswedstrijdshirt)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A5:J5" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
  { id: "profile-shirt-standard", name: "A.S.C. shirt · rugnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Junior bronwaarde 20 cm · Senior 22 cm", fontProfile: "schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A5:J5" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
  { id: "profile-shorts-home", name: "A.S.C. thuiswedstrijdshort · shortnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Shortnummer 7,5 cm", fontProfile: "schluber (Spain voor thuiswedstrijdshort)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["shortsNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-shorts-standard", name: "A.S.C. short · shortnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Shortnummer 7,5 cm", fontProfile: "schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["shortsNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-initials-shirt", name: "A.S.C. shirt · initialen", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Initialen op shirt 3 cm", fontProfile: "schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf." },
  { id: "profile-initials-other", name: "A.S.C. overig artikel · initialen", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "DATA_GAP · fysieke maat niet artikel-specifiek bevestigd", fontProfile: "schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials"], instruction: "DATA_GAP: de fysieke bedrukkingsmaat ontbreekt en blokkeert productie. Positie, referentieafstand, rotatie en spiegeling zijn niet-blokkerende pilot-aandachtspunten." },
  { id: "profile-unmapped-number", name: "A.S.C. live optie ‘Nummer’ · betekenis onbevestigd", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "DATA_GAP", fontProfile: "schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: [], instruction: "DATA_GAP: live optie ‘Nummer’ is niet bevestigd als rug-, borst- of shortnummer en mag niet naar productie." },
  { id: "profile-fc-shirt-home", name: "FC Almere wedstrijdshirt · rugnummer", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Junior bronwaarde 20 cm · Senior 22 cm", fontProfile: "schluber (Spain voor thuiswedstrijdshirt)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A10:J10" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
  { id: "profile-fc-unmapped-number", name: "FC Almere live optie ‘Nummer’ · betekenis onbevestigd", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "DATA_GAP", fontProfile: "schluber (Spain voor thuiswedstrijdshort)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: [], instruction: "DATA_GAP: live optie ‘Nummer’ is niet bevestigd als rug-, borst- of shortnummer en mag niet naar productie." },
  { id: "profile-pioneers-shirt", name: "Almerer Pioneers shirt · nummer/naam", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Rug Junior bronwaarde 16 cm · Rug Senior fysiek 20 cm · Borst 8 cm · Naam 2 cm/max. 9 cm breed", fontProfile: "FFF englisch · Pioneers cijfercontouren", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["backNumber", "name"], instruction: "Snijtest 001 valideert de fysieke snijlijnen voor Pioneers-rugnummers 2, 34 en 77 op 200 mm. Positie, referentieafstand, spiegeling en rotatie zijn niet-blokkerende pilot-aandachtspunten en worden door Productie bepaald.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 200, status: "VALIDATED", source: "Snijtest 001 · bestaande projectdocumentatie plus human confirmation 2026-08-10: fysieke productietest en snijlijnen correct" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 160, status: "DATA_GAP", source: "info bedrukkingen 2026.xlsx bevat 16 cm; fysieke Junior-output is niet getest" } } },
  { id: "profile-pioneers-shorts", name: "Almerer Pioneers short · shortnummer/naam", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Shortnummer bronwaarde 8 cm · Naam 2 cm/max. 9 cm breed", fontProfile: "FFF englisch · Pioneers cijfercontouren", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["shortsNumber", "name"], instruction: "DATA_GAP: de fysieke Snijtest 001 betrof Senior-rugnummers op 200 mm en bewijst geen shortplaatsing of shortoutput op 80 mm." },
);
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
  if (profile.id.startsWith("profile-fc-")) profile.validation.source = "Maat, letterprofiel en foliekleur: info bedrukkingen 2026.xlsx · Blad1!A10:J10. Positie, afstand, rotatie en spiegeling onbevestigd.";
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
  receiptMailText: "We hebben de kleding ontvangen. Controleer het overzicht van artikelen en afgesproken bedrukking. De verwachte wachttijd is circa 5 dagen. Je ontvangt bericht wanneer de bestelling klaarstaat.",
  readyMailText: "De bestelling ligt klaar. Neem deze e-mail mee bij het ophalen. Was bedrukte kleding binnenstebuiten, gebruik geen droger en volg altijd het waslabel.",
};

const FOIL_ROLLS = [
  { id: "foil-white", color: "Wit", supplierType: "Nog in te vullen", purchasePriceEur: null, originalLengthM: null, widthMm: 500, usedLengthMm: 327.4 },
  { id: "foil-red", color: "Rood", supplierType: "Nog in te vullen", purchasePriceEur: null, originalLengthM: null, widthMm: 500, usedLengthMm: 0 },
];

function iso(now = new Date()) {
  return now.toISOString();
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqualHex(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export async function createSportpaleisPasswordRecord(password) {
  if (typeof password !== "string" || password.length < 12) {
    throw new Error("Pilotwachtwoorden moeten minimaal 12 tekens bevatten.");
  }
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { algorithm: "scrypt", salt, hash: Buffer.from(derived).toString("hex"), N: 16_384, r: 8, p: 1 };
}

const passwordRecord = createSportpaleisPasswordRecord;

async function verifyPassword(password, record) {
  if (!record || record.algorithm !== "scrypt") return false;
  const derived = await scrypt(password, record.salt, 64, {
    N: record.N,
    r: record.r,
    p: record.p,
    maxmem: 64 * 1024 * 1024,
  });
  return safeEqualHex(Buffer.from(derived).toString("hex"), record.hash);
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    role: user.role,
    email: user.email,
    status: user.status,
    seatType: user.seatType,
    salesNumber: user.salesNumber ?? null,
  };
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

export function createSportpaleisProductionBootstrap(now = new Date()) {
  return validateState({
    schemaVersion: PILOT_SCHEMA_VERSION,
    organizationId: "sport-2000-sportpaleis-bv",
    revision: 1,
    nextOrderSequence: 1,
    users: [],
    sessions: [],
    loginAttempts: {},
    orders: [],
    associations: structuredClone(SPORTPALEIS_ASSOCIATIONS),
    configurationVersion: SPORTPALEIS_CONFIGURATION_VERSION,
    articles: structuredClone(ARTICLE_CATALOG),
    productionProfiles: structuredClone(PRODUCTION_PROFILES),
    settings: structuredClone(PILOT_SETTINGS),
    foilRolls: structuredClone(FOIL_ROLLS),
    feedback: [],
    extraUserRequests: [],
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
  if (!state || ![1, 2, 3, 4, 5, 6, 7, PILOT_SCHEMA_VERSION].includes(state.schemaVersion) || state.organizationId !== "sport-2000-sportpaleis-bv") return state;
  const previousSchemaVersion = state.schemaVersion;
  const previousConfigurationVersion = state.configurationVersion;
  state.migrationWarnings ??= [];
  for (const user of state.users ?? []) {
    if (user.salesNumber === undefined) user.salesNumber = user.id === "donovan-support" ? "45" : null;
  }
  for (const order of state.orders ?? []) {
    order.standardPersonalization ??= { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "", initialsSemantic: null };
    order.standardPersonalization.backNumberSizeClass ??= "";
    order.orderKind ??= "LEGACY";
    order.acceptedBy ??= { userId: "unknown", name: order.owner || "Onbekend", salesNumber: null, at: order.createdAt };
    order.communication ??= { receipt: { status: "NOT_SENT", updatedAt: order.updatedAt ?? order.createdAt }, production: { status: "NOT_SENT", updatedAt: order.updatedAt ?? order.createdAt }, ready: { status: "NOT_SENT", updatedAt: order.updatedAt ?? order.createdAt } };
    order.communication.production ??= { status: "NOT_SENT", updatedAt: order.updatedAt ?? order.createdAt };
    order.communication.requiredForIndividualOrder ??= false;
    for (const item of order.items ?? []) {
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
  if (!Array.isArray(state.associations) || !state.associations.length) state.associations = structuredClone(SPORTPALEIS_ASSOCIATIONS);
  else if (previousConfigurationVersion !== SPORTPALEIS_CONFIGURATION_VERSION) {
    state.associations = SPORTPALEIS_ASSOCIATIONS.map((sourceAssociation) => {
      const existing = state.associations.find(({ id, name }) => id === sourceAssociation.id || name === sourceAssociation.name);
      if (!existing) return structuredClone(sourceAssociation);
      const validatedJunior = existing.juniorValidationStatus === "VALIDATED" && Number(existing.juniorPhysicalHeightMm) > 0;
      return {
        ...structuredClone(sourceAssociation),
        active: existing.active,
        notes: existing.notes,
        revision: existing.revision ?? 1,
        updatedAt: existing.updatedAt,
        validationHistory: existing.validationHistory ?? [],
        juniorValidationStatus: validatedJunior ? "VALIDATED" : "DATA_GAP",
        juniorPhysicalHeightMm: validatedJunior ? Number(existing.juniorPhysicalHeightMm) : null,
        juniorValidationNote: validatedJunior ? existing.juniorValidationNote : sourceAssociation.juniorValidationNote,
      };
    });
  }
  for (const association of state.associations) {
    association.revision ??= 1;
    association.validationHistory ??= [];
    association.juniorPhysicalHeightMm ??= null;
    if (association.juniorValidationStatus === "VALIDATED" && !(Number(association.juniorPhysicalHeightMm) > 0)) {
      association.juniorValidationStatus = "DATA_GAP";
      association.juniorValidationNote = "Eerdere status had geen fysieke millimeterwaarde en is veilig teruggezet naar DATA_GAP.";
    }
  }
  state.configurationVersion = SPORTPALEIS_CONFIGURATION_VERSION;
  state.activationInvites ??= [];
  if (previousSchemaVersion < 3 || previousConfigurationVersion !== SPORTPALEIS_CONFIGURATION_VERSION) {
    state.productionProfiles ??= [];
    for (const profile of PRODUCTION_PROFILES) {
      const index = state.productionProfiles.findIndex(({ id }) => id === profile.id);
      if (index >= 0) state.productionProfiles[index] = structuredClone(profile); else state.productionProfiles.push(structuredClone(profile));
    }
    const warning = "Capability 003: verenigingsbron opnieuw toegepast; Junior blijft DATA_GAP en A.S.C. Senior staat op bronwaarde 220 mm";
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
        return !existing || Number(existing.revision ?? 1) <= 1 ? structuredClone(sourceProfile) : existing;
      }),
      ...state.productionProfiles.filter(({ id }) => !knownProfileIds.has(id)),
    ];
    const warning = "Pilot readiness 007: dubbele legacy live-artikel-ID's naar de canonieke sp-live-ID's gemigreerd, ordersnapshots behouden en ongewijzigde profielteksten op human pilotbeleid gebracht";
    if (!state.migrationWarnings.includes(warning)) state.migrationWarnings.push(warning);
  }
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
  for (const article of ARTICLE_CATALOG) {
    const existing = state.articles.find(({ id }) => id === article.id);
    if (!existing) state.articles.push(structuredClone(article));
    else {
      existing.revision ??= article.revision;
      existing.variantLabels ??= structuredClone(article.variantLabels);
      existing.availableSizes ??= structuredClone(article.availableSizes);
      existing.validation ??= structuredClone(article.validation);
      existing.validationHistory ??= [];
    }
  }
  state.productionProfiles ??= structuredClone(PRODUCTION_PROFILES);
  for (const profile of PRODUCTION_PROFILES) {
    if (!state.productionProfiles.some(({ id }) => id === profile.id)) state.productionProfiles.push(structuredClone(profile));
  }
  state.settings ??= structuredClone(PILOT_SETTINGS);
  state.foilRolls ??= structuredClone(FOIL_ROLLS);
  state.preferences ??= {};
  for (const user of state.users) {
    state.preferences[user.id] = { ...defaultPreference(), ...(state.preferences[user.id] ?? {}) };
  }
  if (new Set(state.users.map(({ id }) => id)).size !== state.users.length) throw new Error("Dubbele gebruiker-ID.");
  if (new Set(state.orders.map(({ id }) => id)).size !== state.orders.length) throw new Error("Dubbel ordernummer.");
  for (const user of state.users) {
    if (!ROLE.has(user.role) || (user.status !== "Uitgenodigd" && !user.password?.hash)) throw new Error("Ongeldige gebruiker in datastore.");
  }
  for (const order of state.orders) {
    if (!Number.isInteger(order.revision) || order.revision < 1 || !STAGE_ORDER.includes(order.stage)) {
      throw new Error("Ongeldige order in datastore.");
    }
  }
  return state;
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
  state.audit = state.audit.slice(0, 2_000);
}

function idempotent(state, key, userId, operation, valueFactory) {
  if (!key || key.length < 12 || key.length > 160) throw Object.assign(new Error("Ongeldige idempotency key."), { statusCode: 400, code: "INVALID_IDEMPOTENCY_KEY" });
  const identity = `${userId}:${operation}:${key}`;
  if (state.idempotency[identity]) return { duplicate: true, value: state.idempotency[identity].value };
  const value = valueFactory();
  state.idempotency[identity] = { at: iso(), value };
  return { duplicate: false, value };
}

function assertRole(user, allowed) {
  if (!allowed.includes(user.role)) {
    throw Object.assign(new Error("Onvoldoende rechten."), { statusCode: 403, code: "FORBIDDEN" });
  }
}

export class SportpaleisPilotService {
  constructor({ store, mailFoundation, releaseId = PILOT_RELEASE_ID, secureCookies = false, allowedOrigin = "http://127.0.0.1:5173", sessionTtlMs = SESSION_TTL_MS, demoMode = false, uploadsEnabled = true, mailMode = "capture" }) {
    this.store = store;
    this.mailFoundation = mailFoundation;
    this.releaseId = releaseId;
    this.secureCookies = secureCookies;
    this.allowedOrigin = allowedOrigin;
    this.sessionTtlMs = sessionTtlMs;
    this.demoMode = demoMode === true;
    this.uploadsEnabled = uploadsEnabled === true;
    this.mailMode = mailMode;
  }

  async initialize() {
    await this.store.initialize();
  }

  async login({ email, password, remoteAddress = "unknown", now = new Date() }) {
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
    const session = {
      idHash: sha256(token),
      userId: user.id,
      csrfHash: sha256(csrfToken),
      createdAt: iso(now),
      lastSeenAt: iso(now),
      expiresAt: new Date(now.getTime() + this.sessionTtlMs).toISOString(),
    };
    await this.store.mutate(async (next) => {
      next.sessions = next.sessions.filter(({ expiresAt }) => new Date(expiresAt).getTime() > now.getTime());
      next.sessions.push(session);
      next.loginAttempts[attemptKey] = [];
      audit(next, user.id, "Ingelogd", "Workspace");
      return { state: next, value: undefined };
    });
    return { token, csrfToken, user: publicUser(user), expiresAt: session.expiresAt };
  }

  async demoLogin(view, now = new Date()) {
    if (!this.demoMode) throw Object.assign(new Error("Demo-aanmelding is niet beschikbaar."), { statusCode: 404, code: "DEMO_DISABLED" });
    const targetId = view === "admin" ? "kevin" : view === "operator" ? "patrick" : view === "store" ? "collega" : "";
    const state = await this.store.read();
    const user = state.users.find(({ id }) => id === targetId && id !== "donovan-support");
    if (!user || user.status !== "Actief") throw Object.assign(new Error("Demo-rol is niet beschikbaar."), { statusCode: 404, code: "DEMO_ROLE_UNAVAILABLE" });
    const token = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(24).toString("base64url");
    const session = { idHash: sha256(token), userId: user.id, csrfHash: sha256(csrfToken), createdAt: iso(now), lastSeenAt: iso(now), expiresAt: new Date(now.getTime() + this.sessionTtlMs).toISOString(), demo: true };
    await this.store.mutate(async (next) => {
      next.sessions = next.sessions.filter(({ expiresAt }) => new Date(expiresAt).getTime() > now.getTime());
      next.sessions.push(session);
      audit(next, user.id, "Demo aangemeld", view === "admin" ? "Kevin Demo" : view === "operator" ? "Patrick Demo" : "Winkelmedewerker Demo");
      return { state: next, value: undefined };
    });
    return { token, csrfToken, user: { ...publicUser(user), name: view === "admin" ? "Kevin Demo" : view === "operator" ? "Patrick Demo" : "Winkelmedewerker Demo" }, expiresAt: session.expiresAt, demo: true };
  }

  async authenticate(token, now = new Date()) {
    if (!token) throw Object.assign(new Error("Aanmelding vereist."), { statusCode: 401, code: "UNAUTHENTICATED" });
    const state = await this.store.read();
    const session = state.sessions.find(({ idHash }) => safeEqualHex(idHash, sha256(token)));
    if (!session || new Date(session.expiresAt).getTime() <= now.getTime()) {
      throw Object.assign(new Error("Sessie is verlopen."), { statusCode: 401, code: "SESSION_EXPIRED" });
    }
    const user = state.users.find(({ id }) => id === session.userId);
    if (!user || user.status !== "Actief") throw Object.assign(new Error("Gebruiker is niet actief."), { statusCode: 401, code: "UNAUTHENTICATED" });
    return { state, session, user };
  }

  async issueSessionView(token) {
    const { user, session } = await this.authenticate(token);
    const csrfToken = randomBytes(24).toString("base64url");
    await this.store.mutate(async (state) => {
      const active = state.sessions.find(({ idHash }) => idHash === session.idHash);
      if (!active) throw Object.assign(new Error("Sessie is verlopen."), { statusCode: 401, code: "SESSION_EXPIRED" });
      active.csrfHash = sha256(csrfToken);
      active.lastSeenAt = iso();
      return { state, value: undefined };
    });
    const sessionUser = session.demo ? { ...publicUser(user), name: user.role === "admin" ? "Kevin Demo" : user.role === "operator" ? "Patrick Demo" : "Winkelmedewerker Demo" } : publicUser(user);
    return { user: sessionUser, csrfToken, expiresAt: session.expiresAt, demo: Boolean(session.demo) };
  }

  async loginWithPersistedCsrf(input) {
    return this.login(input);
  }

  async logout(token, user, csrfToken) {
    await this.#assertCsrf(token, csrfToken);
    await this.store.mutate(async (state) => {
      state.sessions = state.sessions.filter(({ idHash }) => idHash !== sha256(token));
      audit(state, user.id, "Uitgelogd", "Workspace");
      return { state, value: undefined };
    });
  }

  async bootstrap(token) {
    const { state, user, session } = await this.authenticate(token);
    const admin = user.role === "admin";
    const sessionUser = session.demo ? { ...publicUser(user), name: user.role === "admin" ? "Kevin Demo" : user.role === "operator" ? "Patrick Demo" : "Winkelmedewerker Demo" } : publicUser(user);
    return {
      schemaVersion: PILOT_SCHEMA_VERSION,
      revision: state.revision,
      currentUserId: user.id,
      currentUser: sessionUser,
      users: admin ? state.users.filter(({ seatType }) => seatType === "customer").map(publicUser) : [publicUser(user)],
      orders: structuredClone(state.orders),
      feedback: state.feedback.filter((item) => admin || item.userId === user.id).map((item) => ({ ...item, attachments: (item.attachments ?? []).map(({ dataBase64: _dataBase64, ...attachment }) => attachment) })),
      extraUserRequests: admin ? structuredClone(state.extraUserRequests) : [],
      preferences: { [user.id]: structuredClone(state.preferences[user.id] ?? defaultPreference()) },
      articles: structuredClone(state.articles.filter(({ active }) => admin || active)),
      associations: structuredClone(state.associations),
      configurationVersion: state.configurationVersion,
      productionProfiles: structuredClone(state.productionProfiles),
      settings: admin ? structuredClone(state.settings) : { processingDays: state.settings.processingDays },
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
      capabilities: { admin, operator: user.role === "operator", store: user.role === "store", support: user.role === "support", demo: Boolean(session.demo), demoEnabled: this.demoMode, uploadsEnabled: this.uploadsEnabled, mailMode: this.mailMode, barcodeEnabled: false, barcodeHardwareValidated: false, hardwareSendEnabled: false },
      releaseId: this.releaseId,
    };
  }

  async createOrder(token, csrfToken, payload, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, "CREATE_ORDER", () => {
        const sequence = state.nextOrderSequence;
        state.nextOrderSequence += 1;
        const id = `SP-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`;
        const legacy006Payload = payload.customerEmail === undefined && payload.association && payload.items?.every((item) => !item.articleId);
        const orderKind = ["INDIVIDUAL", "TEAM", "CUSTOM"].includes(payload.orderKind) ? payload.orderKind : "LEGACY";
        const strictPilotContract = ["INDIVIDUAL", "TEAM"].includes(orderKind);
        const standardPersonalization = validatePersonalization(payload.standardPersonalization ?? {}, { requireBackNumberSizeClass: strictPilotContract });
        const hasPrintableCatalogArticle = orderKind === "INDIVIDUAL" && payload.items?.some(({ articleId }) => state.articles.find(({ id }) => id === articleId)?.supports?.length > 0);
        if (hasPrintableCatalogArticle && ![standardPersonalization.initials, standardPersonalization.name, standardPersonalization.backNumber, standardPersonalization.shortsNumber].some(Boolean)) throw Object.assign(new Error("Kies minimaal één bedrukking voor de artikelen die bedrukt kunnen worden."), { statusCode: 400, code: "PERSONALIZATION_REQUIRED" });
        const items = validateItems(payload.items, state, standardPersonalization, { requireBackNumberSizeClass: strictPilotContract, defaultAssociation: payload.association });
        const productionAttention = items.filter((item) => item.productionReadiness?.status !== "CONFIGURED");
        const blockingProductionGaps = productionAttention.filter((item) => item.productionReadiness?.status === "DATA_GAP");
        const associations = [...new Set(items.map(({ association }) => association).filter(Boolean))];
        const createdAt = iso();
        const note = String(payload.internalNote ?? "").trim();
        const priority = validatePriority(payload.priority, user, createdAt);
        const order = {
          id,
          revision: 1,
          customer: requiredText(payload.customer, "Klant", 120),
          customerEmail: validEmail(legacy006Payload ? "legacy-order@sportpaleis.invalid" : payload.customerEmail),
          customerPhone: requiredText(legacy006Payload ? "Niet vastgelegd (006)" : payload.customerPhone, "Telefoonnummer", 40),
          association: associations.length === 1 ? associations[0] : associations.length > 1 ? "Meerdere verenigingen" : "Geen vereniging",
          associations,
          standardPersonalization,
          createdAt,
          updatedAt: createdAt,
          promisedAt: payload.promisedAt ? validDate(payload.promisedAt) : null,
          stage: "ORDER",
          owner: user.name,
          acceptedBy: { userId: user.id, name: user.name, salesNumber: user.salesNumber ?? null, at: createdAt },
          orderKind,
          communication: { requiredForIndividualOrder: strictPilotContract, receipt: { status: "NOT_SENT", updatedAt: createdAt }, production: { status: "NOT_SENT", updatedAt: createdAt }, ready: { status: "NOT_SENT", updatedAt: createdAt } },
          notes: note ? [{ id: `note-${randomBytes(6).toString("hex")}`, scope: "order", kind: payload.noteKind === "attention" || payload.noteAttention ? "attention" : "internal", text: requiredText(note, "Opmerking", 600), authorId: user.id, authorName: user.name, createdAt }] : [],
          priority,
          attention: priority ? `Prioriteitsuitzondering: ${priority.reasonLabel}` : (payload.noteKind === "attention" || payload.noteAttention) && note ? note : productionAttention.length ? `${blockingProductionGaps.length ? "Kritieke productiedata ontbreekt" : "Pilot-aandachtspunt"}: ${[...new Set(productionAttention.map(({ productionReadiness }) => productionReadiness.reason).filter(Boolean))].join(" · ")}` : undefined,
          barcode: { value: `SPW:${id}`, featureEnabled: false, hardwareValidated: false },
          pickup: { status: "NOT_PICKED_UP", pickedUpAt: null, pickedUpBy: null },
          eventHistory: [{ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_CREATED", at: createdAt, userId: user.id, userName: user.name, source: "button" }],
          totalPieces: items.reduce((sum, item) => sum + item.quantity, 0),
          foilStates: [...new Set(items.map(({ foilColor }) => foilColor))].map((color) => ({ color, status: color.toLowerCase() === "rood" ? "HOLD" : "READY" })),
          items,
        };
        state.orders.unshift(order);
        audit(state, user.id, "Order aangemaakt", id, { revision: 1 });
        return order;
      });
      return { state, value: outcome };
    });
    return result.value;
  }

  async advanceOrder(token, csrfToken, orderId, expectedRevision, idempotencyKey) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `ADVANCE_ORDER:${orderId}`, () => {
        const order = state.orders.find(({ id }) => id === orderId);
        if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
        if (order.revision !== expectedRevision) {
          throw Object.assign(new Error("Order is intussen door iemand anders gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
        }
        if (order.stage === "ORDER" && order.communication?.requiredForIndividualOrder && !["CAPTURED", "SMTP_ACCEPTED", "SENT", "DELIVERED"].includes(order.communication.receipt.status)) {
          throw Object.assign(new Error("De verplichte ontvangstbevestiging moet eerst veilig zijn vastgelegd."), { statusCode: 409, code: "RECEIPT_CONFIRMATION_REQUIRED" });
        }
        if (order.stage === "ORDER" && order.items.some((item) => item.productionReadiness?.status === "DATA_GAP" || item.backNumberProduction?.status === "DATA_GAP" || item.variants?.some((variant) => variant.backNumberProduction?.status === "DATA_GAP"))) {
          throw Object.assign(new Error("Productiedata ontbreekt. Vul het productieprofiel en de fysieke maten eerst aan."), { statusCode: 409, code: "PRODUCTION_DATA_INCOMPLETE" });
        }
        if (order.stage === "CONTROL" && order.foilStates?.length && order.foilStates.every(({ status }) => status === "HOLD")) {
          throw Object.assign(new Error("Deze order wacht volledig op de juiste foliekleur."), { statusCode: 409, code: "COLOR_HOLD" });
        }
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
          if (order.revision !== Number(selection.expectedRevision)) throw Object.assign(new Error("Een geselecteerde order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
          return order;
        });
        for (const order of orders) {
          if (order.stage === "ORDER" && order.communication?.requiredForIndividualOrder && !["CAPTURED", "SMTP_ACCEPTED", "SENT", "DELIVERED"].includes(order.communication.receipt.status)) {
            throw Object.assign(new Error(`${order.id} mist de verplichte ontvangstbevestiging.`), { statusCode: 409, code: "RECEIPT_CONFIRMATION_REQUIRED" });
          }
          if (order.items.some((item) => item.productionReadiness?.status === "DATA_GAP" || item.backNumberProduction?.status === "DATA_GAP" || item.variants?.some((variant) => variant.backNumberProduction?.status === "DATA_GAP"))) {
            throw Object.assign(new Error(`${order.id} mist gevalideerde productiedata.`), { statusCode: 409, code: "PRODUCTION_DATA_INCOMPLETE" });
          }
          if (order.stage === "CONTROL" && order.foilStates?.length && order.foilStates.every(({ status }) => status === "HOLD")) {
            throw Object.assign(new Error(`${order.id} wacht volledig op de juiste foliekleur.`), { statusCode: 409, code: "COLOR_HOLD" });
          }
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

  async updateOrder(token, csrfToken, orderId, payload, expectedRevision) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin", "operator", "store"]);
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === orderId);
      if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      if (user.role === "store" && order.stage !== "ORDER") throw Object.assign(new Error("Deze order is in productie en is voor winkelmedewerkers vergrendeld."), { statusCode: 409, code: "ORDER_LOCKED_FOR_STORE" });
      if (order.stage !== "ORDER" && user.role !== "store" && !String(payload.correctionReason ?? "").trim()) throw Object.assign(new Error("Een productiecorrectie vereist een reden."), { statusCode: 400, code: "CORRECTION_REASON_REQUIRED" });
      const contentChanged = payload.standardPersonalization !== undefined || payload.items !== undefined;
      if (contentChanged && order.stage !== "ORDER") throw Object.assign(new Error("Artikel- en bedrukinhoud is vanaf controle vergrendeld."), { statusCode: 409, code: "ORDER_CONTENT_LOCKED" });
      if (contentChanged && (payload.standardPersonalization === undefined || payload.items === undefined)) throw Object.assign(new Error("Stuur standaardbedrukking en artikelen samen voor een veilige correctie."), { statusCode: 400, code: "ORDER_CONTENT_INCOMPLETE" });
      if (payload.customer !== undefined) order.customer = requiredText(payload.customer, "Klant", 120);
      if (payload.customerEmail !== undefined) order.customerEmail = validEmail(payload.customerEmail);
      if (payload.customerPhone !== undefined) order.customerPhone = requiredText(payload.customerPhone, "Telefoonnummer", 40);
      if (contentChanged) {
        const strictPilotContract = order.orderKind === "INDIVIDUAL" || order.communication?.requiredForIndividualOrder === true;
        const standardPersonalization = validatePersonalization(payload.standardPersonalization, { requireBackNumberSizeClass: strictPilotContract });
        const hasPrintableCatalogArticle = order.orderKind === "INDIVIDUAL" && payload.items.some(({ articleId }) => state.articles.find(({ id }) => id === articleId)?.supports?.length > 0);
        if (hasPrintableCatalogArticle && ![standardPersonalization.initials, standardPersonalization.name, standardPersonalization.backNumber, standardPersonalization.shortsNumber].some(Boolean)) throw Object.assign(new Error("Kies minimaal één bedrukking voor de artikelen die bedrukt kunnen worden."), { statusCode: 400, code: "PERSONALIZATION_REQUIRED" });
        const items = validateItems(payload.items, state, standardPersonalization, { requireBackNumberSizeClass: strictPilotContract });
        const associations = [...new Set(items.map(({ association }) => association).filter(Boolean))];
        order.standardPersonalization = standardPersonalization;
        order.items = items;
        order.associations = associations;
        order.association = associations.length === 1 ? associations[0] : associations.length > 1 ? "Meerdere verenigingen" : "Geen vereniging";
        order.totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
        order.foilStates = [...new Set(items.map(({ foilColor }) => foilColor))].map((color) => ({ color, status: color.toLowerCase() === "rood" ? "HOLD" : "READY" }));
        const hasProductionGap = items.some((item) => item.backNumberProduction?.status === "DATA_GAP" || item.variants?.some((variant) => variant.backNumberProduction?.status === "DATA_GAP"));
        if (hasProductionGap) order.attention = "Productiedata ontbreekt: Junior-rugnummermaat moet door Sportpaleis worden gevalideerd.";
        else if (order.attention?.startsWith("Productiedata ontbreekt:")) delete order.attention;
      }
      order.revision += 1; order.updatedAt = iso(); order.eventHistory ??= [];
      order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_UPDATED", at: order.updatedAt, userId: user.id, userName: user.name, source: "button", details: { contentChanged, ...(payload.correctionReason ? { correctionReason: requiredText(payload.correctionReason, "Correctiereden", 400) } : {}) } });
      audit(state, user.id, "Order gewijzigd", order.id, { revision: order.revision, contentChanged, correctionReason: payload.correctionReason ?? null });
      return { state, value: structuredClone(order) };
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
      if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      if (order.stage !== "DONE") throw Object.assign(new Error("Alleen een gereedgemelde order kan worden afgehaald."), { statusCode: 409, code: "ORDER_NOT_READY" });
      const at = iso(); order.pickup = { status: "PICKED_UP", pickedUpAt: at, pickedUpBy: user.id, exception: String(payload.exception ?? "").trim() || null }; order.revision += 1; order.updatedAt = at;
      order.eventHistory ??= []; order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PICKED_UP", at, userId: user.id, userName: user.name, source: payload.source === "barcode-emulation" ? "barcode-emulation" : "button" });
      audit(state, user.id, "Order afgehaald", order.id); return { state, value: structuredClone(order) };
    }); return result.value;
  }

  async recordCommunicationStatus(token, csrfToken, orderId, payload, expectedRevision) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator"]);
    const result = await this.store.mutate(async (state) => {
      const order = state.orders.find(({ id }) => id === orderId); if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
      if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error("Order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
      const channel = allowedValue(payload.channel, ["receipt", "production", "ready"], "Communicatiekanaal");
      const status = allowedValue(payload.status, ["NOT_SENT", "SENT", "DELIVERED", "BOUNCED", "FAILED"], "Communicatiestatus");
      const at = iso(); order.communication ??= { receipt: { status: "NOT_SENT", updatedAt: at }, production: { status: "NOT_SENT", updatedAt: at }, ready: { status: "NOT_SENT", updatedAt: at } };
      order.communication[channel] = { status, updatedAt: at, providerReference: String(payload.providerReference ?? "").trim() || null };
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
    const currentOrder = state.orders.find(({ id }) => id === orderId);
    if (payload.templateKey === "ORDER_RECEIVED" && currentOrder?.communication?.receipt.status === "UNKNOWN") {
      throw Object.assign(new Error("De vorige verzenduitkomst is onbekend. Menselijke controle is vereist voordat opnieuw verzonden mag worden."), { statusCode: 409, code: "UNKNOWN_SEND_REQUIRES_HUMAN_REVIEW" });
    }
    const request = { ...this.#orderMailRequest(state, user, orderId, payload), idempotencyKey };
    const result = await this.#mail().capture(request, { id: user.id, name: user.name, role: user.role }, { simulation: payload.simulation ?? "success" });
    if (result.duplicate) return result;
    await this.store.mutate(async (next) => {
      const order = next.orders.find(({ id }) => id === orderId);
      if (order) {
        const at = iso();
        order.communication ??= { requiredForIndividualOrder: true, receipt: { status: "NOT_SENT", updatedAt: at }, production: { status: "NOT_SENT", updatedAt: at }, ready: { status: "NOT_SENT", updatedAt: at } };
        const capturedStatus = result.status === "CAPTURED" ? "CAPTURED" : result.status === "SMTP_ACCEPTED" ? "SMTP_ACCEPTED" : result.status === "UNKNOWN_PARTIAL_SEND" ? "UNKNOWN" : "FAILED";
        if (payload.templateKey === "ORDER_RECEIVED") {
          const receiptStatus = capturedStatus;
          order.communication.receipt = { status: receiptStatus, updatedAt: at, providerReference: result.id };
          if (receiptStatus === "UNKNOWN") order.attention = "Ontvangstbevestiging heeft een onbekende verzenduitkomst — menselijke controle vereist; niet automatisch opnieuw verzenden.";
          else if (receiptStatus === "FAILED") order.attention = "Ontvangstbevestiging is aantoonbaar niet verzonden — gecontroleerd opnieuw proberen is mogelijk.";
          else if (order.attention?.startsWith("Ontvangstbevestiging")) delete order.attention;
        }
        if (payload.templateKey === "ORDER_IN_PRODUCTION") order.communication.production = { status: capturedStatus, updatedAt: at, providerReference: result.id };
        if (payload.templateKey === "ORDER_READY") order.communication.ready = { status: capturedStatus, updatedAt: at, providerReference: result.id };
        order.revision += 1;
        order.updatedAt = at;
        order.eventHistory ??= [];
        order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: `MAIL_${result.status}`, at, userId: user.id, userName: user.name, source: "capture-transport", details: { templateKey: payload.templateKey, mailAttemptId: result.id } });
        audit(next, user.id, "Mail capture uitgevoerd", order.id, { templateKey: payload.templateKey, status: result.status, mailAttemptId: result.id });
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

  #mail() {
    if (this.mailMode !== "capture") throw Object.assign(new Error("Externe mail is in deze pilotomgeving uitgeschakeld."), { statusCode: 503, code: "MAIL_TRANSPORT_DISABLED" });
    if (!this.mailFoundation) throw Object.assign(new Error("Mail Foundation is lokaal niet ingericht."), { statusCode: 503, code: "MAIL_FOUNDATION_UNAVAILABLE" });
    return this.mailFoundation;
  }

  #orderMailRequest(state, user, orderId, payload) {
    const order = state.orders.find(({ id }) => id === orderId);
    if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
    const templateKey = String(payload.templateKey ?? "");
    const question = templateKey === "ORDER_QUESTION" ? requiredText(payload.question, "Vraag", 1_000) : "Niet van toepassing";
    const itemLines = order.items.map((item) => `${item.quantity}× ${item.product}${item.association ? ` · ${item.association}` : ""} · ${item.personalization}`).join("\n");
    return {
      organizationId: "sportpaleis",
      contextType: "order",
      contextId: order.id,
      templateKey,
      recipient: order.customerEmail,
      context: {
        customer: { name: order.customer },
        order: {
          number: order.id,
          items: itemLines,
          processingDays: state.settings.processingDays,
          pickupInformation: `Neem de orderreferentie ${order.id} mee bij het ophalen bij Sport 2000 Sportpaleis.`,
        },
        message: { question },
      },
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
          category: allowedValue(payload.category, ["Vraag", "Verbetering", "Probleem"], "Categorie"),
          description: requiredText(payload.description, "Beschrijving", 2_000),
          releaseId: requiredText(payload.releaseId ?? this.releaseId, "Release", 120),
          orderId: payload.orderId ? requiredText(payload.orderId, "Order", 80) : null,
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
      if (state.users.some((candidate) => candidate.email.toLowerCase() === email)) throw Object.assign(new Error("Dit e-mailadres bestaat al."), { statusCode: 409, code: "EMAIL_EXISTS" });
      const target = { id: `user-${randomBytes(8).toString("hex")}`, name, initials: name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), role, email, status: "Uitgenodigd", seatType: "customer", password: null };
      state.users.push(target);
      state.preferences[target.id] = defaultPreference();
      state.activationInvites = (state.activationInvites ?? []).filter((invite) => invite.userId !== target.id && !invite.usedAt);
      state.activationInvites.push({ id: `invite-${randomBytes(8).toString("hex")}`, userId: target.id, tokenHash: sha256(rawToken), createdAt, expiresAt, usedAt: null, createdBy: user.id });
      audit(state, user.id, "Gebruiker uitgenodigd", target.id, { role, expiresAt });
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
      const previous = { role: target.role, status: target.status, salesNumber: target.salesNumber ?? null };
      if (payload.role !== undefined) target.role = allowedValue(payload.role, ["admin", "operator", "store"], "Rol");
      if (payload.status !== undefined) target.status = allowedValue(payload.status, ["Actief", "Inactief", "Uitgenodigd"], "Status");
      if (payload.salesNumber !== undefined) {
        const salesNumber = payload.salesNumber === null || String(payload.salesNumber).trim() === "" ? null : String(payload.salesNumber).trim();
        if (salesNumber !== null && !/^\d{1,8}$/.test(salesNumber)) throw Object.assign(new Error("Verkoopnummer moet uit 1 tot 8 cijfers bestaan."), { statusCode: 400, code: "VALIDATION_ERROR" });
        if (salesNumber && state.users.some((candidate) => candidate.id !== target.id && candidate.salesNumber === salesNumber)) throw Object.assign(new Error("Dit verkoopnummer is al gekoppeld."), { statusCode: 409, code: "SALES_NUMBER_EXISTS" });
        target.salesNumber = salesNumber;
      }
      if (target.status === "Inactief") state.sessions = state.sessions.filter((session) => session.userId !== target.id);
      if (!state.users.some((candidate) => candidate.role === "admin" && candidate.status === "Actief")) {
        throw Object.assign(new Error("Minimaal één actieve beheerder is verplicht."), { statusCode: 400, code: "LAST_ADMIN_REQUIRED" });
      }
      audit(state, user.id, "Gebruikersrechten gewijzigd", target.id, { previous, next: { role: target.role, status: target.status, salesNumber: target.salesNumber ?? null } });
      return { state, value: publicUser(target) };
    });
    return result.value;
  }

  async updateArticle(token, csrfToken, articleId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const article = state.articles.find(({ id }) => id === articleId);
      if (!article) throw Object.assign(new Error("Artikel niet gevonden."), { statusCode: 404, code: "ARTICLE_NOT_FOUND" });
      const expectedRevision = Number(payload.expectedRevision);
      if (expectedRevision !== Number(article.revision ?? 1)) throw Object.assign(new Error("Het artikel is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: article.revision ?? 1 });
      const previous = structuredClone(article);
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
      if (payload.variantLabels !== undefined) article.variantLabels = normalizedTextList(payload.variantLabels, "Varianten", 30, 80);
      if (payload.availableSizes !== undefined) article.availableSizes = normalizedTextList(payload.availableSizes, "Maten", 40, 30);
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
      article.revision = Number(article.revision ?? 1) + 1;
      article.validationHistory ??= [];
      const changedAt = iso();
      article.validationHistory.unshift({ at: changedAt, userId: user.id, previous, next: structuredClone(article), source: article.validation?.source ?? "Adminwijziging in Workspace" });
      audit(state, user.id, "Artikelinstelling gewijzigd", article.id, { revision: article.revision, active: article.active, profileId: article.profileId, association: article.association, validationStatus: article.validation?.status ?? "DATA_GAP" });
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
      const previous = { active: association.active, notes: association.notes, juniorValidationStatus: association.juniorValidationStatus, juniorPhysicalHeightMm: association.juniorPhysicalHeightMm ?? null, juniorValidationNote: association.juniorValidationNote };
      if (payload.active !== undefined) association.active = Boolean(payload.active);
      if (payload.notes !== undefined) association.notes = requiredText(payload.notes, "Notitie", 1_000);
      if (payload.juniorValidationStatus !== undefined) association.juniorValidationStatus = allowedValue(payload.juniorValidationStatus, ["DATA_GAP", "VALIDATED"], "Juniorstatus");
      if (payload.juniorValidationNote !== undefined) association.juniorValidationNote = requiredText(payload.juniorValidationNote, "Validatiebron", 1_000);
      if (payload.juniorPhysicalHeightMm !== undefined) association.juniorPhysicalHeightMm = payload.juniorPhysicalHeightMm === null || payload.juniorPhysicalHeightMm === "" ? null : Number(payload.juniorPhysicalHeightMm);
      if (association.juniorValidationStatus === "VALIDATED") {
        if (!String(association.juniorValidationNote ?? "").trim()) throw Object.assign(new Error("Een gevalideerde Juniorstatus vereist een expliciete bronnotitie."), { statusCode: 400, code: "VALIDATION_SOURCE_REQUIRED" });
        if (!Number.isFinite(association.juniorPhysicalHeightMm) || association.juniorPhysicalHeightMm <= 0 || association.juniorPhysicalHeightMm > 500) throw Object.assign(new Error("Leg voor Junior een fysieke hoogte tussen 1 en 500 mm vast."), { statusCode: 400, code: "JUNIOR_PHYSICAL_MM_REQUIRED" });
      } else {
        association.juniorPhysicalHeightMm = null;
      }
      association.revision = (association.revision ?? 1) + 1;
      association.updatedAt = iso();
      association.validationHistory ??= [];
      const next = { active: association.active, notes: association.notes, juniorValidationStatus: association.juniorValidationStatus, juniorPhysicalHeightMm: association.juniorPhysicalHeightMm, juniorValidationNote: association.juniorValidationNote };
      association.validationHistory.unshift({ at: association.updatedAt, userId: user.id, field: "association", previous, next, source: association.juniorValidationNote || "Admin bevestiging in Workspace" });
      const linkedProfileIds = new Set(state.articles.filter((article) => article.association === association.name && article.supports?.includes("backNumber")).map(({ profileId }) => profileId));
      for (const profile of state.productionProfiles.filter(({ id }) => linkedProfileIds.has(id))) {
        profile.backNumberSizeClasses ??= {};
        const previousJunior = structuredClone(profile.backNumberSizeClasses.JUNIOR ?? null);
        profile.backNumberSizeClasses.JUNIOR = association.juniorValidationStatus === "VALIDATED"
          ? { physicalHeightMm: association.juniorPhysicalHeightMm, sourceValueMm: association.dimensionsCm.backNumberJuniorSourceValue ? association.dimensionsCm.backNumberJuniorSourceValue * 10 : null, status: "VALIDATED", source: association.juniorValidationNote }
          : { physicalHeightMm: null, sourceValueMm: association.dimensionsCm.backNumberJuniorSourceValue ? association.dimensionsCm.backNumberJuniorSourceValue * 10 : null, status: "DATA_GAP", source: association.juniorValidationNote };
        profile.revision = Number(profile.revision ?? 1) + 1;
        profile.validationHistory ??= [];
        profile.validationHistory.unshift({ at: association.updatedAt, userId: user.id, previous: previousJunior, next: structuredClone(profile.backNumberSizeClasses.JUNIOR), source: association.juniorValidationNote });
      }
      audit(state, user.id, "Verenigingsinstelling gewijzigd", association.name, { revision: association.revision });
      return { state, value: structuredClone(association) };
    });
    return result.value;
  }

  async updateProductionProfile(token, csrfToken, profileId, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
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
      if (payload.validation !== undefined) {
        const fields = ["placement", "referenceDistance", "size", "font", "foilColor", "rotation", "mirror"];
        const validation = { source: requiredText(payload.validation.source, "Validatiebron", 1_000) };
        for (const field of fields) validation[field] = allowedValue(payload.validation[field], ["VALIDATED", "SOURCE_CONFIGURED", "DATA_GAP"], `Validatiestatus ${field}`);
        for (const field of ["cutContour", "physicalCutOutput"]) {
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
      if (payload.receiptMailText !== undefined) state.settings.receiptMailText = requiredText(payload.receiptMailText, "Ontvangsttekst", 2_000);
      if (payload.readyMailText !== undefined) state.settings.readyMailText = requiredText(payload.readyMailText, "Afhaaltekst", 2_000);
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
      if (payload.supplierType !== undefined) roll.supplierType = requiredText(payload.supplierType, "Leverancier/type", 120);
      for (const [key, label] of [["purchasePriceEur", "Inkoopprijs"], ["originalLengthM", "Rollengte"]]) {
        if (payload[key] !== undefined && payload[key] !== null && payload[key] !== "") {
          const numeric = Number(payload[key]);
          if (!Number.isFinite(numeric) || numeric <= 0) throw Object.assign(new Error(`Ongeldige ${label.toLowerCase()}.`), { statusCode: 400, code: "VALIDATION_ERROR" });
          roll[key] = numeric;
        }
      }
      audit(state, user.id, "Folierol gewijzigd", roll.id);
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

  async #assertCsrf(token, csrfToken) {
    const { session } = await this.authenticate(token);
    if (!csrfToken || !safeEqualHex(session.csrfHash, sha256(csrfToken))) {
      throw Object.assign(new Error("Ongeldige requestbeveiliging."), { statusCode: 403, code: "CSRF_INVALID" });
    }
  }
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
  const values = [validation.placement, validation.referenceDistance, validation.size, validation.font, validation.foilColor, validation.rotation, validation.mirror, validation.cutContour, validation.physicalCutOutput].filter(Boolean);
  if (values.some((status) => status === "DATA_GAP")) return "DATA_GAP";
  return values.every((status) => status === "VALIDATED") ? "VALIDATED" : "PARTIAL";
}

function assertProfileValidatedValues(profile, validation) {
  if (profile.id === "profile-none") return;
  const missing = [];
  if (validation.placement !== "DATA_GAP" && (!profile.placement || profile.placement === "Onbevestigd")) missing.push("positie");
  if (validation.referenceDistance !== "DATA_GAP" && !Number.isFinite(profile.referenceDistanceCm)) missing.push("referentieafstand");
  if (validation.size !== "DATA_GAP" && !String(profile.sizeLabel ?? "").trim()) missing.push("maatvoering");
  if (validation.font !== "DATA_GAP" && !String(profile.fontProfile ?? "").trim()) missing.push("letterprofiel");
  if (validation.foilColor !== "DATA_GAP" && !String(profile.foilColor ?? "").trim()) missing.push("foliekleur");
  if (validation.rotation !== "DATA_GAP" && !Number.isFinite(profile.rotationDeg)) missing.push("rotatie");
  if (validation.mirror !== "DATA_GAP" && typeof profile.mirror !== "boolean") missing.push("spiegeling");
  if (missing.length) throw Object.assign(new Error(`Bevestigde profielvelden missen een waarde: ${missing.join(", ")}.`), { statusCode: 400, code: "PROFILE_VALIDATED_VALUE_MISSING" });
}

function productionProfileReadiness(profile) {
  if (!profile) return { status: "DATA_GAP", reason: "Productieprofiel ontbreekt" };
  if (profile.id === "profile-none") return { status: "CONFIGURED", reason: null };
  const validation = profile.validation;
  if (!validation) return { status: "DATA_GAP", reason: "Productieprofiel mist validatiestatus" };
  const criticalLabels = { size: "fysieke maatvoering", font: "letterprofiel", foilColor: "foliekleur", cutContour: "snijlijnen", physicalCutOutput: "fysieke snijoutput" };
  const advisoryLabels = { placement: "positie", referenceDistance: "referentieafstand", rotation: "rotatie", mirror: "spiegeling" };
  const criticalGaps = Object.entries(criticalLabels).filter(([field]) => validation[field] === "DATA_GAP").map(([, label]) => label);
  if (criticalGaps.length) return { status: "DATA_GAP", reason: `Noodzakelijke productiegegevens ontbreken: ${criticalGaps.join(", ")}` };
  const advisoryGaps = Object.entries(advisoryLabels).filter(([field]) => validation[field] === "DATA_GAP").map(([, label]) => label);
  if (advisoryGaps.length) return { status: "ATTENTION", reason: `Productie past tijdens de pilot zelf toe: ${advisoryGaps.join(", ")}` };
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
  const initials = optional(value.initials, 8);
  const prefix = optional(value.initialsSemantic?.prefix, 40);
  const infix = optional(value.initialsSemantic?.infix, 20);
  const surname = optional(value.initialsSemantic?.surname, 60);
  const backNumber = optional(value.backNumber, 4);
  const backNumberSizeClass = optional(value.backNumberSizeClass, 10).toUpperCase();
  if (backNumber && requireBackNumberSizeClass && !BACK_NUMBER_SIZE_CLASSES.has(backNumberSizeClass)) throw Object.assign(new Error("Kies Junior of Senior voor het rugnummer."), { statusCode: 400, code: "BACK_NUMBER_SIZE_CLASS_REQUIRED" });
  if (backNumberSizeClass && !BACK_NUMBER_SIZE_CLASSES.has(backNumberSizeClass)) throw Object.assign(new Error("Ongeldige rugnummermaat."), { statusCode: 400, code: "BACK_NUMBER_SIZE_CLASS_INVALID" });
  if (!backNumber && backNumberSizeClass) throw Object.assign(new Error("Junior/Senior is alleen van toepassing bij een rugnummer."), { statusCode: 400, code: "BACK_NUMBER_SIZE_CLASS_NOT_APPLICABLE" });
  return {
    initials,
    initialsSemantic: initials ? { prefix: prefix || initials.slice(0, 1), infix, surname: surname || initials.slice(-1), typographyManagedByProfile: true } : null,
    name: optional(value.name, 40),
    backNumber,
    backNumberSizeClass,
    shortsNumber: optional(value.shortsNumber, 4),
  };
}

function validatePriority(value, user, at) {
  if (!value?.enabled) return null;
  const reason = allowedValue(value.reason, ["complaint", "sportpaleis-error", "event", "other"], "Prioriteitsreden");
  const labels = { complaint: "Klacht", "sportpaleis-error": "Fout Sportpaleis", event: "Evenement/wedstrijd", other: "Anders" };
  return { enabled: true, requestedBy: requiredText(value.requestedBy, "Aangevraagd door", 120), alignedWith: requiredText(value.alignedWith, "Afgestemd met", 120), reason, reasonLabel: labels[reason], explanation: String(value.explanation ?? "").trim().slice(0, 600), createdAt: at, createdBy: user.id, createdByName: user.name };
}

function resolveBackNumberProductionContext(profile, sizeClass) {
  if (!sizeClass) return null;
  const configured = profile.backNumberSizeClasses?.[sizeClass];
  return {
    sizeClass,
    physicalHeightMm: configured?.physicalHeightMm ?? null,
    status: configured?.status ?? "DATA_GAP",
    source: configured?.source ?? `${sizeClass === "JUNIOR" ? "Junior" : "Senior"} rugnummermaat ontbreekt in productieprofiel ${profile.id}`,
  };
}

function validateItems(value, state, standardPersonalization, options = {}) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) throw Object.assign(new Error("Een order vereist 1 tot 50 artikelen."), { statusCode: 400, code: "VALIDATION_ERROR" });
  return value.map((item) => {
    const requestedVariants = Array.isArray(item.variants) && item.variants.length ? item.variants : [{ quantity: item.quantity, size: item.size, deviation: item.deviation, overrides: item.overrides, participantName: item.participantName }];
    const quantity = requestedVariants.reduce((sum, variant) => sum + Number(variant.quantity), 0);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw Object.assign(new Error("Ongeldig aantal."), { statusCode: 400, code: "VALIDATION_ERROR" });
    if (item.articleId) {
      const article = state.articles.find(({ id }) => id === item.articleId);
      if (!article?.active) throw Object.assign(new Error("Artikel is niet beschikbaar."), { statusCode: 400, code: "ARTICLE_UNAVAILABLE" });
      const association = state.associations.find(({ name }) => name === article.association);
      if (!association?.active) throw Object.assign(new Error("De vereniging van dit artikel is niet beschikbaar."), { statusCode: 400, code: "ARTICLE_ASSOCIATION_UNAVAILABLE" });
      if (item.association && item.association !== article.association) throw Object.assign(new Error("Het artikel hoort niet bij de gekozen vereniging."), { statusCode: 400, code: "ARTICLE_ASSOCIATION_MISMATCH" });
      const profile = state.productionProfiles.find(({ id }) => id === article.profileId);
      if (!profile) throw Object.assign(new Error("Artikel mist een productieprofiel."), { statusCode: 400, code: "PROFILE_MISSING" });
      const labels = { initials: "Initialen", name: "Naam", backNumber: "Rug", shortsNumber: "Short" };
      const variants = requestedVariants.map((variant) => {
        const variantQuantity = Number(variant.quantity);
        if (!Number.isInteger(variantQuantity) || variantQuantity < 1 || variantQuantity > 99) throw Object.assign(new Error("Ongeldig aantal in artikelvariant."), { statusCode: 400, code: "VALIDATION_ERROR" });
        const deviation = Boolean(variant.deviation);
        const overrides = deviation ? validatePersonalization(variant.overrides ?? {}, options) : { initials: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "", initialsSemantic: null };
        const forbiddenOverrides = PERSONALIZATION_FIELDS.filter((field) => !article.supports.includes(field) && Boolean(overrides[field]));
        if (forbiddenOverrides.length) throw Object.assign(new Error(`${article.name} staat deze bedrukking niet toe.`), { statusCode: 400, code: "ARTICLE_PERSONALIZATION_NOT_ALLOWED" });
        const appliedFields = Object.fromEntries(article.supports.map((key) => [key, deviation && Object.hasOwn(overrides, key) ? overrides[key] : standardPersonalization[key] ?? ""]));
        const appliedBackNumberSizeClass = appliedFields.backNumber ? (deviation ? overrides.backNumberSizeClass : standardPersonalization.backNumberSizeClass) : "";
        const applied = { ...appliedFields, backNumberSizeClass: appliedBackNumberSizeClass };
        const policy = article.personalizationPolicy ?? { mode: "combination", fields: Object.fromEntries(article.supports.map((key) => [key, "optional"])) };
        const populated = Object.entries(appliedFields).filter(([, entry]) => entry);
        if (policy.mode === "mutually-exclusive" && populated.length > 1) throw Object.assign(new Error(`${article.name} staat slechts één bedrukkingstype tegelijk toe.`), { statusCode: 400, code: "PERSONALIZATION_MUTUALLY_EXCLUSIVE" });
        for (const [key, requirement] of Object.entries(policy.fields ?? {})) if (requirement === "required" && !applied[key]) throw Object.assign(new Error(`${article.name} vereist ${labels[key].toLowerCase()}.`), { statusCode: 400, code: "PERSONALIZATION_REQUIRED" });
        const personalization = populated.map(([key, entry]) => `${labels[key]} ${entry}${key === "backNumber" && appliedBackNumberSizeClass ? ` (${appliedBackNumberSizeClass === "JUNIOR" ? "Junior" : "Senior"})` : ""}`).join(" · ") || "Geen bedrukking";
        const size = String(variant.size ?? "Niet opgegeven").trim().slice(0, 20) || "Niet opgegeven";
        if (article.validation?.sizes === "VALIDATED" && article.availableSizes?.length && !article.availableSizes.includes(size)) throw Object.assign(new Error(`${size} is geen bevestigde maat voor ${article.name}.`), { statusCode: 400, code: "ARTICLE_SIZE_UNAVAILABLE" });
        return { id: `variant-${randomBytes(5).toString("hex")}`, participantName: optional(variant.participantName, 120), quantity: variantQuantity, size, personalization, personalizationValues: applied, initialsSemantic: applied.initials ? (deviation && overrides.initialsSemantic ? overrides.initialsSemantic : standardPersonalization.initialsSemantic) : null, backNumberProduction: resolveBackNumberProductionContext(profile, appliedBackNumberSizeClass), deviation };
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
        foilColor: profile.foilColor,
        productionProfileId: profile.id,
        productionInstruction: profile.instruction,
        backNumberProduction: variants.length === 1 ? variants[0].backNumberProduction : null,
      };
    }
    const association = requiredText(item.association ?? options.defaultAssociation, "Vereniging", 120);
    const legacyTrusted = options.requireBackNumberSizeClass !== true && Boolean(options.defaultAssociation) && !item.association;
    if (!state.associations.some(({ name }) => name === association)) throw Object.assign(new Error("Kies een bekende Sportpaleis-vereniging."), { statusCode: 400, code: "ASSOCIATION_UNKNOWN" });
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
      product: requiredText(item.product, "Product", 120),
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

function cookieHeader(token, secure, clear = false) {
  const value = clear ? "" : encodeURIComponent(token);
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : Math.floor(SESSION_TTL_MS / 1000)}${secure ? "; Secure" : ""}`;
}

export function createSportpaleisPilotRequestHandler(service) {
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
      if (route === "/health/sportpaleis" && method === "GET") return json(response, 200, await service.health()) ?? true;
      if (route === "/ready/sportpaleis" && method === "GET") return json(response, 200, { status: "ready", releaseId: service.releaseId }) ?? true;
      if (route === "/api/sportpaleis/v1/auth/activate" && method === "POST") {
        json(response, 200, await service.activateInvitedUser(await readJson(request)));
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/login" && method === "POST") {
        const result = await service.loginWithPersistedCsrf({ ...(await readJson(request)), remoteAddress: request.socket.remoteAddress });
        response.setHeader("Set-Cookie", cookieHeader(result.token, service.secureCookies));
        json(response, 200, { user: result.user, csrfToken: result.csrfToken, expiresAt: result.expiresAt, releaseId: service.releaseId });
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/demo-options" && method === "GET") {
        json(response, 200, { enabled: service.demoMode === true });
        return true;
      }
      if (route === "/api/sportpaleis/v1/auth/demo" && method === "POST") {
        const result = await service.demoLogin((await readJson(request)).view);
        response.setHeader("Set-Cookie", cookieHeader(result.token, service.secureCookies));
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
      if (route === "/api/sportpaleis/v1/bootstrap" && method === "GET") {
        json(response, 200, await service.bootstrap(token));
        return true;
      }
      if (route === "/api/sportpaleis/v1/orders" && method === "POST") {
        json(response, 201, await service.createOrder(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/orders/bulk-advance" && method === "POST") {
        json(response, 200, await service.bulkAdvanceOrders(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/barcode/resolve" && method === "POST") {
        json(response, 200, await service.resolveBarcode(token, await readJson(request)));
        return true;
      }
      const orderUpdateMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)$/);
      if (orderUpdateMatch && method === "PATCH") {
        const payload = await readJson(request);
        json(response, 200, await service.updateOrder(token, csrf, decodeURIComponent(orderUpdateMatch[1]), payload, Number(payload.expectedRevision)));
        return true;
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
      const userMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/users\/([^/]+)$/);
      if (userMatch && method === "PATCH") {
        json(response, 200, await service.updateUser(token, csrf, decodeURIComponent(userMatch[1]), await readJson(request)));
        return true;
      }
      const articleMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/articles\/([^/]+)$/);
      if (articleMatch && method === "PATCH") {
        json(response, 200, await service.updateArticle(token, csrf, decodeURIComponent(articleMatch[1]), await readJson(request)));
        return true;
      }
      const associationMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/associations\/([^/]+)$/);
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
      if (rollMatch && method === "PATCH") {
        json(response, 200, await service.updateFoilRoll(token, csrf, decodeURIComponent(rollMatch[1]), await readJson(request)));
        return true;
      }
      json(response, 404, { error: "NOT_FOUND", message: "API-route niet gevonden." });
      return true;
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
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
