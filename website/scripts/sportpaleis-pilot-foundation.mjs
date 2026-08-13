import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { mkdir, open, readFile, rename, stat, unlink, writeFile, readdir } from "node:fs/promises";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  SPORTPALEIS_ASSOCIATIONS,
  SPORTPALEIS_CONFIGURATION_VERSION,
  SPORTPALEIS_FONT_CONFIRMATION,
  SPORTPALEIS_JUNIOR_RULE_SOURCE,
} from "../config/sportpaleis-bedrukking-configuration.mjs";
import { SPORTPALEIS_LIVE_PILOT_ARTICLES } from "../config/sportpaleis-live-pilot-catalog.mjs";
import { createCutJobBatch, createProductionPreview } from "../src/sportpaleis/direct-print/index.ts";
import {
  CUTJOB_SVG_WRITER,
  PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID,
  productionPieceFromSource,
  productionSourceByIdentity,
  resolveProductionSource,
} from "../src/sportpaleis/production-sources.ts";

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = "sportpaleis_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const PERSONAL_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 6;
const ROLE = new Set(["admin", "operator", "store", "support"]);
const STAGE_ORDER = ["ORDER", "CONTROL", "PRINT", "DONE"];
const MAX_BODY_BYTES = 8 * 1024 * 1024;
const PILOT_SCHEMA_VERSION = 12;
const PILOT_RELEASE_ID = "SPW-FUNCTIONAL-PILOT-FREEZE-READY-001-20260811";
const DEFAULT_ARTIFACT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BACK_NUMBER_SIZE_CLASSES = new Set(["JUNIOR", "SENIOR"]);
const PERSONALIZATION_FIELDS = ["initials", "name", "backNumber", "shortsNumber"];
const PRODUCTION_PROOF_STATUSES = new Set(["CONFIGURED", "GEOMETRY_VALIDATED", "WINPLOT_VALIDATED", "PHYSICALLY_VALIDATED", "DATA_GAP"]);
const PRODUCTION_LINE_TYPES = new Set(["TEXT", "INITIALS", "NUMBER", "LOGO", "PRODUCTION_ELEMENT"]);
const FONT_SIGNATURES = new Map([
  ["00010000", { mimeType: "font/ttf", extension: ".ttf" }],
  ["4f54544f", { mimeType: "font/otf", extension: ".otf" }],
  ["774f4646", { mimeType: "font/woff", extension: ".woff" }],
  ["774f4632", { mimeType: "font/woff2", extension: ".woff2" }],
]);
const PILOT_FONT = Object.freeze({
  id: "font-liberation-sans-regular-f8ace1f8",
  name: "Liberation Sans Regular",
  originalFilename: "LiberationSans-Regular.ttf",
  version: "F8ACE1F892B2",
  sha256: "F8ACE1F892B2BD9DC1792BA7F097FA7588F84FED48321480E04DE5390828221F",
  mimeType: "font/ttf",
  sizeBytes: 139512,
  addedAt: "2026-08-11T00:00:00.000Z",
  uploadedBy: { userId: "system", name: "WBD pilot foundation" },
  provenance: "Open fontbron uit pdfjs-dist; LICENSE_LIBERATION.txt is lokaal bij de bron bewaard.",
  status: "TECHNICALLY_VALID",
  allowedInStore: true,
  sourceUrl: "/assets/organizations/sportpaleis/fonts/LiberationSans-Regular.ttf",
});

const ARTICLE_CATALOG = structuredClone(SPORTPALEIS_LIVE_PILOT_ARTICLES);
const ARTICLE_IMAGE_KEYS = new Set(ARTICLE_CATALOG.map(({ imageKey }) => imageKey));

const PRODUCTION_PROFILES = [
  { id: "profile-shirt", name: "A.S.C. wedstrijdshirt · rug", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Senior rugnummer 22 cm", fontProfile: "Schluber (Spain voor thuiswedstrijdshirt)", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials", "name", "backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A5:J5" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
  { id: "profile-keeper", name: "A.S.C. keeperstrui · rug", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Senior rugnummer 22 cm", fontProfile: "Schluber", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["initials", "name", "backNumber"], instruction: "PILOT-AANDACHT: positie, referentieafstand, rotatie en spiegeling worden in de handmatige pilot door Productie bepaald en blokkeren niet op zichzelf.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A5:J5" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 200, status: "DATA_GAP", source: "Bronwaarde 20 cm aanwezig; fysieke Junior-hoogte blijft geblokkeerd tot praktijkbevestiging" } } },
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
  { id: "profile-pioneers-shirt", name: "Almerer Pioneers shirt · nummer/naam", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Rug Junior bronwaarde 16 cm · Rug Senior fysiek 20 cm · Borst 8 cm · Naam 2 cm/max. 9 cm breed", fontProfile: "FFF englisch", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["backNumber", "name"], productionSourceSetId: PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID, outputWriterId: CUTJOB_SVG_WRITER.id, instruction: "Snijtest 001 valideert de fysieke snijlijnen voor Pioneers-rugnummers 2, 34 en 77 op 200 mm. Positie, referentieafstand, spiegeling en rotatie zijn niet-blokkerende pilot-aandachtspunten en worden door Productie bepaald.", backNumberSizeClasses: { SENIOR: { physicalHeightMm: 200, status: "VALIDATED", source: "Snijtest 001 · bestaande projectdocumentatie plus human confirmation 2026-08-10: fysieke productietest en snijlijnen correct" }, JUNIOR: { physicalHeightMm: null, sourceValueMm: 160, status: "DATA_GAP", source: "info bedrukkingen 2026.xlsx bevat 16 cm; fysieke Junior-output is niet getest" } } },
  { id: "profile-pioneers-shorts", name: "Almerer Pioneers short · shortnummer/naam", placement: "Onbevestigd", referenceDistanceCm: null, sizeLabel: "Shortnummer bronwaarde 8 cm · Naam 2 cm/max. 9 cm breed", fontProfile: "FFF englisch", foilColor: "Wit", mirror: null, rotationDeg: null, supports: ["shortsNumber", "name"], instruction: "DATA_GAP: de fysieke Snijtest 001 betrof Senior-rugnummers op 200 mm en bewijst geen shortplaatsing of shortoutput op 80 mm." },
);
const profileSlug = (value) => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sourceProfileFields = [
  ["initials", "Initialen", "initialsShirt"],
  ["name", "Naam", "nameHeight"],
  ["backNumber", "Rugnummer", "backNumberSenior"],
  ["shortsNumber", "Shortnummer", "shortsNumber"],
];
for (const association of SPORTPALEIS_ASSOCIATIONS) {
  for (const [field, label, dimensionKey] of sourceProfileFields) {
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
      instruction: `Bronconfiguratie ${association.source.file} · ${association.source.sheet}!${association.source.range}. Positie, afstand, contour-/fontoutput, rotatie en spiegeling blijven fail-closed totdat de specifieke route is gevalideerd.`,
      ...(field === "backNumber" ? {
        backNumberSizeClasses: {
          SENIOR: dimensionCm == null
            ? { physicalHeightMm: null, status: "DATA_GAP", source: `${association.source.file} · ${association.source.sheet}!${association.source.range}` }
            : { physicalHeightMm: dimensionCm * 10, status: "SOURCE_CONFIGURED", source: `${association.source.file} · ${association.source.sheet}!${association.source.range}` },
          JUNIOR: { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE },
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
  instruction: "Bronconfiguratie: thuis wit; nummer outline; naam met hoofdletter. Positie, afstand, contour-/fontoutput, rotatie en spiegeling blijven fail-closed.",
  backNumberSizeClasses: { SENIOR: { physicalHeightMm: 220, status: "SOURCE_CONFIGURED", source: "info bedrukkingen 2026.xlsx · Blad1!A13:J13" }, JUNIOR: { physicalHeightMm: 200, status: "SOURCE_CONFIGURED", source: SPORTPALEIS_JUNIOR_RULE_SOURCE } },
});
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
  productionDefaults: { workingWidthMm: 440, minimumGapMm: 6.4, edgeMarginMm: 5, defaultWidthMm: 180, defaultHeightMm: 30, defaultFontId: PILOT_FONT.id, defaultFoilColor: "Wit" },
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
    association: "Almerer Pioneers",
    productionProfile: { id: "profile-pioneers-shirt", revision: 1, name: "Almerer Pioneers shirt · Senior rugnummer 200 mm" },
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
  if (typeof password !== "string" || password.length < 12) {
    throw new Error("Pilotwachtwoorden moeten minimaal 12 tekens bevatten.");
  }
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { algorithm: "scrypt", salt, hash: Buffer.from(derived).toString("hex"), N: 16_384, r: 8, p: 1 };
}

export async function createSportpaleisPinRecord(pin) {
  if (!/^\d{4,8}$/u.test(String(pin ?? ""))) throw new Error("Een snelle PIN bestaat uit 4 tot 8 cijfers.");
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(String(pin), salt, 64, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return { algorithm: "scrypt-pin-v1", salt, hash: Buffer.from(derived).toString("hex"), N: 16_384, r: 8, p: 1, enrolledAt: iso() };
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

async function verifyPin(pin, record) {
  if (!record || record.algorithm !== "scrypt-pin-v1" || !/^\d{4,8}$/u.test(String(pin ?? ""))) return false;
  const derived = await scrypt(String(pin), record.salt, 64, { N: record.N, r: record.r, p: record.p, maxmem: 64 * 1024 * 1024 });
  return safeEqualHex(Buffer.from(derived).toString("hex"), record.hash);
}

function publicUser(user) {
  const workContexts = user.workContexts ?? workContextsForRole(user.role);
  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    role: user.role,
    email: user.email,
    status: user.status,
    seatType: user.seatType,
    salesNumber: user.salesNumber ?? null,
    personType: user.personType ?? "HUMAN",
    workContexts,
    defaultContext: workContexts.includes(user.defaultContext) ? user.defaultContext : workContexts[0],
    quickAuth: user.quickPin?.hash ? { mode: "PIN", pinEnrolled: true } : { mode: "PASSWORD", pinEnrolled: false },
  };
}

function workContextsForRole(role) {
  if (role === "admin") return ["ORGANISATION", "STORE", "WEBSHOP", "PRODUCTION", "ALL"];
  if (role === "operator") return ["PRODUCTION", "STORE", "ALL"];
  if (role === "store") return ["STORE", "ALL"];
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
    nextProductionJobSequence: 5,
    users: [],
    employees: structuredClone(CONFIRMED_EMPLOYEES),
    sessions: [],
    loginAttempts: {},
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
    productionElements: [],
    productionFonts: [structuredClone(PILOT_FONT)],
    productionElementRequirements: [],
    productionJobs: createGoldenProductionJobs(iso(now)),
    productionProposals: [],
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
  if (!state || ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, PILOT_SCHEMA_VERSION].includes(state.schemaVersion) || state.organizationId !== "sport-2000-sportpaleis-bv") return state;
  const previousSchemaVersion = state.schemaVersion;
  const previousConfigurationVersion = state.configurationVersion;
  const previousFontConfirmationVersion = state.fontConfirmationVersion;
  state.migrationWarnings ??= [];
  for (const user of state.users ?? []) {
    if (user.salesNumber === undefined) user.salesNumber = null;
    user.personType ??= "HUMAN";
    user.workContexts ??= workContextsForRole(user.role);
    user.defaultContext = user.workContexts.includes(user.defaultContext) ? user.defaultContext : user.workContexts[0];
    delete user.quickAuth;
  }
  state.employees = Array.isArray(state.employees) ? state.employees : [];
  for (const sourceEmployee of CONFIRMED_EMPLOYEES) {
    if (!state.employees.some(({ id, salesNumber }) => id === sourceEmployee.id || salesNumber === sourceEmployee.salesNumber)) state.employees.push(structuredClone(sourceEmployee));
  }
  for (const profile of state.productionProfiles ?? []) if (profile.supports?.includes("initials")) {
      const existing = profile.initialsInfixRule;
      profile.initialsInfixRule = {
        active: existing?.active !== false,
        heightMm: existing?.heightMm ?? null,
        horizontalSpacingMm: existing?.horizontalSpacingMm ?? null,
        baselineOffsetMm: existing?.baselineOffsetMm ?? null,
        alignment: "CENTER",
        status: existing?.heightMm != null && existing?.horizontalSpacingMm != null && existing?.baselineOffsetMm != null ? "SOURCE_CONFIGURED" : "DATA_GAP",
        revision: Number(existing?.revision ?? 1),
      };
  }
  for (const order of state.orders ?? []) {
    order.standardPersonalization ??= { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "", initialsSemantic: null };
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
      const existingValidatedJunior = existing.juniorValidationStatus === "VALIDATED" && Number(existing.juniorPhysicalHeightMm) > 0;
      return {
        ...structuredClone(sourceAssociation),
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
    }
    const warning = "Final pre-live catalogus 006: 183 actuele artikelen met zichtbare bestelbare personalisatie canoniek ingericht; overige actuele clubartikelen blijven buiten Bedrukken; historische ordersnapshots blijven ongewijzigd.";
    if (!state.migrationWarnings.includes(warning)) state.migrationWarnings.push(warning);
  }
  state.configurationVersion = SPORTPALEIS_CONFIGURATION_VERSION;
  state.activationInvites ??= [];
  state.mailbatches ??= [];
  state.productionElements ??= [];
  state.productionFonts ??= [];
  if (!state.productionFonts.some(({ id, sha256: hash }) => id === PILOT_FONT.id || hash === PILOT_FONT.sha256)) state.productionFonts.push(structuredClone(PILOT_FONT));
  state.productionElementRequirements ??= [];
  state.productionJobs ??= [];
  state.productionProposals ??= [];
  const goldenJobs = createGoldenProductionJobs();
  for (const goldenJob of goldenJobs) if (!state.productionJobs.some(({ id }) => id === goldenJob.id)) state.productionJobs.push(goldenJob);
  const highestJobSequence = state.productionJobs.reduce((highest, { jobNumber }) => Math.max(highest, Number(String(jobNumber ?? "").match(/(\d+)$/u)?.[1] ?? 0)), 0);
  state.nextProductionJobSequence = Math.max(Number(state.nextProductionJobSequence ?? 1), highestJobSequence + 1, 5);
  if (previousSchemaVersion < 3 || previousConfigurationVersion !== SPORTPALEIS_CONFIGURATION_VERSION) {
    state.productionProfiles ??= [];
    for (const profile of PRODUCTION_PROFILES) {
      const index = state.productionProfiles.findIndex(({ id }) => id === profile.id);
      if (index < 0) state.productionProfiles.push(structuredClone(profile));
      else if (Number(state.productionProfiles[index].revision ?? 1) <= 1) state.productionProfiles[index] = structuredClone(profile);
    }
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
        return !existing || Number(existing.revision ?? 1) <= 1 ? structuredClone(sourceProfile) : existing;
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
  state.mailbatches ??= [];
  state.productionElements ??= [];
  state.productionFonts ??= [];
  if (!state.productionFonts.some(({ id, sha256: hash }) => id === PILOT_FONT.id || hash === PILOT_FONT.sha256)) state.productionFonts.push(structuredClone(PILOT_FONT));
  state.productionElementRequirements ??= [];
  state.productionJobs ??= [];
  state.productionProposals ??= [];
  state.nextProductionJobSequence ??= 1;
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
    }
  }
  state.productionProfiles ??= structuredClone(PRODUCTION_PROFILES);
  for (const profile of PRODUCTION_PROFILES) {
    const existing = state.productionProfiles.find(({ id }) => id === profile.id);
    if (!existing) state.productionProfiles.push(structuredClone(profile));
    else {
      if (profile.productionSourceSetId) existing.productionSourceSetId = profile.productionSourceSetId;
      if (profile.outputWriterId) existing.outputWriterId = profile.outputWriterId;
    }
  }
  state.settings ??= structuredClone(PILOT_SETTINGS);
  state.settings.deliveryFeeEur ??= PILOT_SETTINGS.deliveryFeeEur;
  state.settings.productionDefaults = { ...structuredClone(PILOT_SETTINGS.productionDefaults), ...(state.settings.productionDefaults ?? {}) };
  state.foilRolls ??= structuredClone(FOIL_ROLLS);
  state.preferences ??= {};
  for (const user of state.users) {
    state.preferences[user.id] = { ...defaultPreference(), ...(state.preferences[user.id] ?? {}) };
  }
  if (new Set(state.users.map(({ id }) => id)).size !== state.users.length) throw new Error("Dubbele gebruiker-ID.");
  if (new Set(state.employees.map(({ id }) => id)).size !== state.employees.length || new Set(state.employees.map(({ salesNumber }) => salesNumber)).size !== state.employees.length) throw new Error("Dubbele werknemer of dubbel verkoopnummer.");
  for (const employee of state.employees) {
    if (!employee.name || !/^\d{1,8}$/u.test(employee.salesNumber) || typeof employee.active !== "boolean" || !Number.isInteger(employee.revision) || employee.revision < 1) throw new Error("Ongeldige werknemer in datastore.");
    if (employee.userId && !state.users.some(({ id }) => id === employee.userId)) throw new Error("Werknemer verwijst naar een ontbrekende Workspace-gebruiker.");
  }
  if (new Set(state.orders.map(({ id }) => id)).size !== state.orders.length) throw new Error("Dubbel ordernummer.");
  if (new Set(state.productionFonts.map(({ id }) => id)).size !== state.productionFonts.length || new Set(state.productionFonts.map(({ sha256: hash }) => hash)).size !== state.productionFonts.length) throw new Error("Dubbele productiefontbron.");
  if (new Set(state.productionJobs.map(({ id }) => id)).size !== state.productionJobs.length || new Set(state.productionJobs.map(({ jobNumber }) => jobNumber)).size !== state.productionJobs.length) throw new Error("Dubbele productiejob.");
  if (new Set(state.productionProposals.map(({ id }) => id)).size !== state.productionProposals.length || new Set(state.productionProposals.map(({ proposalNumber }) => proposalNumber)).size !== state.productionProposals.length) throw new Error("Dubbel productievoorstel.");
  for (const user of state.users) {
    if (!ROLE.has(user.role) || (user.status !== "Uitgenodigd" && !user.password?.hash)) throw new Error("Ongeldige gebruiker in datastore.");
  }
  for (const order of state.orders) {
    if (!Number.isInteger(order.revision) || order.revision < 1 || !STAGE_ORDER.includes(order.stage)) {
      throw new Error("Ongeldige order in datastore.");
    }
    for (const line of order.productionLines ?? []) {
      const incompleteCompositeSegment = ["INITIALS_FIRST", "INITIALS_INFIX", "INITIALS_LAST"].includes(line.placementRole) && line.validation?.status === "BLOCKED" && line.widthMm >= 0 && line.heightMm >= 0;
      if (!PRODUCTION_LINE_TYPES.has(line.type) || !PRODUCTION_PROOF_STATUSES.has(line.proofStatus) || (!incompleteCompositeSegment && (!(line.widthMm > 0) || !(line.heightMm > 0))) || !Number.isInteger(line.quantity)) throw new Error("Ongeldige productieregel in datastore.");
      if (line.source?.kind === "FONT" && !state.productionFonts.some(({ id, version, sha256: hash }) => id === line.source.id && version === line.source.version && hash === line.source.sha256)) throw new Error("Productieregel verwijst naar een ontbrekende fontversie.");
    }
  }
  for (const job of state.productionJobs) {
    if (!job.snapshot || job.snapshotHash !== sha256(JSON.stringify(job.snapshot))) throw new Error("Productiejob-snapshot is gewijzigd of beschadigd.");
    if (!PRODUCTION_PROOF_STATUSES.has(job.proofStatus)) throw new Error("Ongeldige bewijsstatus voor productiejob.");
    if (!['ORIGINAL', 'REPLOT'].includes(job.kind) || !['AWAITING_HUMAN_CHECK', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) throw new Error("Ongeldige productiejobstatus.");
    if (job.kind === "REPLOT" && (!job.originJobId || !state.productionJobs.some(({ id }) => id === job.originJobId))) throw new Error("Herplot mist de oorspronkelijke productiejob.");
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
  if (!allowed.includes(user.role)) {
    throw Object.assign(new Error("Onvoldoende rechten."), { statusCode: 403, code: "FORBIDDEN" });
  }
}

export class SportpaleisPilotService {
  constructor({ store, mailFoundation, releaseId = PILOT_RELEASE_ID, secureCookies = false, allowedOrigin = "http://127.0.0.1:5173", sessionTtlMs = SESSION_TTL_MS, demoMode = false, uploadsEnabled = true, fontUploadsEnabled = uploadsEnabled, mailMode = "capture", artifactRoot = DEFAULT_ARTIFACT_ROOT }) {
    this.store = store;
    this.mailFoundation = mailFoundation;
    this.releaseId = releaseId;
    this.secureCookies = secureCookies;
    this.allowedOrigin = allowedOrigin;
    this.sessionTtlMs = sessionTtlMs;
    this.demoMode = demoMode === true;
    this.uploadsEnabled = uploadsEnabled === true;
    this.fontUploadsEnabled = fontUploadsEnabled === true;
    this.mailMode = mailMode;
    this.artifactRoot = path.resolve(artifactRoot);
  }

  async initialize() {
    await this.store.initialize();
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
    return { user: sessionUser, csrfToken, expiresAt: session.expiresAt, deviceMode: session.deviceMode ?? "SHARED", authMethod: session.authMethod ?? "PASSWORD", demo: Boolean(session.demo) };
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

  async fastSwitch(token, csrfToken, payload, now = new Date()) {
    const { user: currentUser, session } = await this.authenticate(token, now);
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
    const admin = user.role === "admin";
    const sessionUser = session.demo ? { ...publicUser(user), name: user.role === "admin" ? "Kevin Demo" : user.role === "operator" ? "Patrick Demo" : "Winkelmedewerker Demo" } : publicUser(user);
    return {
      schemaVersion: PILOT_SCHEMA_VERSION,
      revision: state.revision,
      currentUserId: user.id,
      currentUser: sessionUser,
      users: admin ? state.users.filter(({ seatType }) => seatType === "customer").map(publicUser) : [publicUser(user)],
      employees: admin || user.role === "store" ? structuredClone(state.employees) : [],
      switchableUsers: state.users.filter(({ seatType, status }) => seatType === "customer" && status === "Actief").map(publicUser),
      orders: structuredClone(state.orders.map((order) => ({ ...order, ...productionStatusForOrder(order) }))),
      feedback: state.feedback.filter((item) => admin || item.userId === user.id).map((item) => ({ ...item, attachments: (item.attachments ?? []).map(({ dataBase64: _dataBase64, ...attachment }) => attachment) })),
      extraUserRequests: admin ? structuredClone(state.extraUserRequests) : [],
      mailbatches: structuredClone(state.mailbatches),
      productionElements: ["admin", "operator"].includes(user.role) ? structuredClone(state.productionElements.map((element) => ({ ...element, sourceLayers: element.sourceLayers ? Object.fromEntries(Object.entries(element.sourceLayers).map(([key, value]) => [key, value ? (({ dataBase64: _dataBase64, ...metadata }) => metadata)(value) : null])) : undefined }))) : [],
      productionFonts: structuredClone(state.productionFonts.map(({ sourceDataBase64: _sourceDataBase64, ...font }) => font)),
      productionElementRequirements: ["admin", "operator"].includes(user.role) ? structuredClone(state.productionElementRequirements) : [],
      productionInventory: ["admin", "operator"].includes(user.role) ? sportpaleisProductionInventoryView(state) : [],
      productionJobs: ["admin", "operator"].includes(user.role) ? structuredClone(state.productionJobs).sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.jobNumber.localeCompare(left.jobNumber)) : [],
      productionProposals: ["admin", "operator"].includes(user.role) ? structuredClone(state.productionProposals).sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.proposalNumber.localeCompare(left.proposalNumber)) : [],
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
      capabilities: { admin, operator: user.role === "operator", store: user.role === "store", support: user.role === "support", workContexts: publicUser(user).workContexts, deviceMode: session.deviceMode ?? "SHARED", authMethod: session.authMethod ?? "PASSWORD", quickPinEnabled: state.users.some(({ quickPin }) => Boolean(quickPin?.hash)), demo: Boolean(session.demo), demoEnabled: this.demoMode, uploadsEnabled: this.uploadsEnabled, fontUploadsEnabled: admin && this.fontUploadsEnabled, mailMode: this.mailMode, barcodeEnabled: false, barcodeHardwareValidated: false, hardwareSendEnabled: false },
      releaseId: this.releaseId,
    };
  }

  async currentRevision(token) {
    const { state } = await this.authenticate(token);
    return { revision: state.revision };
  }

  async addProductionFont(token, csrfToken, payload) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin"]);
    if (!this.fontUploadsEnabled) throw Object.assign(new Error("Fontuploads zijn in deze omgeving uitgeschakeld."), { statusCode: 403, code: "UPLOADS_DISABLED" });
    const result = await this.store.mutate(async (state) => {
      const filename = requiredText(payload.filename, "Bestandsnaam", 180);
      const dataBase64 = requiredText(payload.dataBase64, "Fontbron", 7_500_000);
      let bytes; try { bytes = Buffer.from(dataBase64, "base64"); } catch { bytes = Buffer.alloc(0); }
      if (bytes.length < 12 || bytes.length > 5 * 1024 * 1024) throw Object.assign(new Error("Een fontbestand moet technisch leesbaar en maximaal 5 MB zijn."), { statusCode: 400, code: "FONT_FILE_INVALID" });
      const signature = bytes.subarray(0, 4).toString("hex"); const format = FONT_SIGNATURES.get(signature);
      if (!format || !filename.toLowerCase().endsWith(format.extension)) throw Object.assign(new Error("Gebruik een geldig TTF-, OTF-, WOFF- of WOFF2-bestand met overeenkomende bestandsextensie."), { statusCode: 400, code: "FONT_SIGNATURE_INVALID" });
      const hash = sha256(bytes).toUpperCase(); const existing = state.productionFonts.find(({ sha256: candidate }) => candidate === hash);
      if (existing) { const { sourceDataBase64: _sourceDataBase64, ...publicFont } = existing; return { state, value: structuredClone(publicFont) }; }
      const addedAt = iso(); const id = `font-${hash.slice(0, 16).toLowerCase()}`;
      const font = { id, name: requiredText(payload.name, "Fontnaam", 120), originalFilename: filename, version: hash.slice(0, 12), sha256: hash, mimeType: format.mimeType, sizeBytes: bytes.length, addedAt, uploadedBy: { userId: user.id, name: user.name }, provenance: requiredText(payload.provenance, "Herkomst/licentie", 500), status: "TECHNICALLY_VALID", allowedInStore: payload.allowedInStore !== false, sourceUrl: `/api/sportpaleis/v1/production-fonts/${id}/source`, sourceDataBase64: bytes.toString("base64") };
      state.productionFonts.push(font); audit(state, user.id, "Productiefont toegevoegd", id, { sha256: hash, filename, allowedInStore: font.allowedInStore });
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
    const candidate = path.resolve(this.artifactRoot, artifact.path);
    const allowedRoots = [path.resolve(this.artifactRoot, "output"), path.resolve(this.artifactRoot, "outputs")];
    if (!allowedRoots.some((root) => candidate.startsWith(`${root}${path.sep}`))) throw Object.assign(new Error("Het productieartefact valt buiten de immutable artefactgrens."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_PATH_INVALID" });
    let bytes; try { bytes = await readFile(candidate); } catch { throw Object.assign(new Error("Het vastgelegde productieartefact ontbreekt."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_MISSING" }); }
    const hash = sha256(bytes).toUpperCase();
    if (hash !== artifact.sha256) throw Object.assign(new Error("Het vastgelegde productieartefact wijkt af van de immutable hash."), { statusCode: 409, code: "PRODUCTION_ARTIFACT_HASH_MISMATCH" });
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
          const blocker = productionProposalBlockReason(order);
          if (blocker) throw Object.assign(new Error(`${order.id}: ${blocker}`), { statusCode: 409, code: "ORDER_NOT_READY" });
          return order;
        });
        const createdAt = iso();
        const highest = state.productionProposals.reduce((value, proposal) => Math.max(value, Number(String(proposal.proposalNumber).match(/(\d+)$/u)?.[1] ?? 0)), 0);
        const proposal = {
          id: `production-proposal-${randomBytes(10).toString("hex")}`,
          proposalNumber: `PV-${new Date(createdAt).getUTCFullYear()}-${String(highest + 1).padStart(4, "0")}`,
          createdAt,
          initiatedBy: { userId: user.id, name: user.name, role: user.role },
          orders: orders.map(({ id, revision }) => ({ id, expectedRevision: revision })),
          status: "OPEN",
          productionJobId: null,
        };
        state.productionProposals.unshift(proposal);
        audit(state, user.id, "Productievoorstel aangemaakt", proposal.proposalNumber, { orderIds: proposal.orders.map(({ id }) => id), hardwareSendPerformed: false });
        return proposal;
      });
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
        const proposal = payload.proposalId ? state.productionProposals.find(({ id }) => id === payload.proposalId) : null;
        if (payload.proposalId && (!proposal || proposal.status !== "OPEN")) throw Object.assign(new Error("Het productievoorstel is niet meer open."), { statusCode: 409, code: "PRODUCTION_PROPOSAL_NOT_OPEN" });
        const orders = selections.map(({ id, expectedRevision }) => {
          const order = state.orders.find((candidate) => candidate.id === id);
          if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
          if (order.revision !== Number(expectedRevision)) throw Object.assign(new Error("Een order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
          if (order.stage !== "CONTROL") throw Object.assign(new Error("Alle orders moeten klaar voor productie zijn."), { statusCode: 409, code: "ORDER_NOT_READY" });
          if (order.productionLines?.some(({ validation }) => validation.status !== "VALID")) throw Object.assign(new Error("Een productieregel is nog geblokkeerd."), { statusCode: 409, code: "PRODUCTION_LINE_BLOCKED" });
          return order;
        });
        const createdAt = iso(); const sequence = state.nextProductionJobSequence; state.nextProductionJobSequence += 1;
        const jobNumber = `PLOT-${new Date(createdAt).getUTCFullYear()}-${String(sequence).padStart(4, "0")}`;
        const snapshot = buildProductionJobSnapshot(state, orders, jobNumber, createdAt, this.artifactRoot);
        if (snapshot.artifact.format === "MANIFEST") throw Object.assign(new Error("Voor deze regels kan nog geen werkelijk vector-productiebestand worden gemaakt. Koppel eerst de juiste gevalideerde contour- of fontbron."), { statusCode: 409, code: "PRODUCTION_VECTOR_ARTIFACT_UNAVAILABLE" });
        const job = immutableProductionJob({ id: `production-job-${randomBytes(10).toString("hex")}`, jobNumber, createdAt, initiatedBy: { userId: user.id, name: user.name, role: user.role }, kind: "ORIGINAL", originJobId: null, reason: null, snapshot, status: "AWAITING_HUMAN_CHECK", proofStatus: "GEOMETRY_VALIDATED", humanAcceptance: { status: "PENDING", note: "Het immutable vectorbestand is geometrisch gevalideerd. Een nieuwe fysieke Human Acceptance blijft vereist; Workspace stuurt niets naar Illustrator, WinPlot, Summa of hardware." } });
        state.productionJobs.unshift(job);
        if (proposal) { proposal.status = "CONVERTED"; proposal.productionJobId = job.id; }
        for (const order of orders) { order.stage = "PRINT"; order.revision += 1; order.updatedAt = createdAt; order.eventHistory ??= []; order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PRODUCTION_JOB_CREATED", at: createdAt, userId: user.id, userName: user.name, source: "human-go", details: { productionJobId: job.id, jobNumber } }); }
        audit(state, user.id, "Human GO · PlotJob vastgelegd", jobNumber, { orderIds: orders.map(({ id }) => id), snapshotHash: job.snapshotHash, hardwareSendPerformed: false });
        return job;
      });
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
      const outcome = idempotent(state, idempotencyKey, user.id, "CREATE_ORDER", () => {
        const sequence = state.nextOrderSequence;
        state.nextOrderSequence += 1;
        const id = `SP-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`;
        const legacy006Payload = payload.customerEmail === undefined && payload.association && payload.items?.every((item) => !item.articleId);
        const orderKind = ["INDIVIDUAL", "TEAM", "CUSTOM"].includes(payload.orderKind) ? payload.orderKind : "LEGACY";
        const strictPilotContract = ["INDIVIDUAL", "TEAM"].includes(orderKind);
        let productionLines = validateProductionLines(payload.productionLines ?? [], state, user, orderKind);
        const standardPersonalization = validatePersonalization(payload.standardPersonalization ?? {}, { requireBackNumberSizeClass: strictPilotContract });
        const items = validateItems(payload.items, state, standardPersonalization, { requireBackNumberSizeClass: strictPilotContract, defaultAssociation: payload.association, freeProduction: orderKind === "CUSTOM" && productionLines.length > 0 });
        if (orderKind === "TEAM") items.forEach((item, index) => {
          if (!String(payload.items?.[index]?.size ?? "").trim()) item.size = "";
          item.variants?.forEach((variant, variantIndex) => { if (!String(payload.items?.[index]?.variants?.[variantIndex]?.size ?? "").trim()) variant.size = ""; });
        });
        if (orderKind === "INDIVIDUAL" && !productionLines.length) productionLines = deriveCatalogProductionLines(state, id, items);
        for (const item of items) if (item.productionProfileId === "profile-none" && (item.variants ?? []).every(({ personalization }) => personalization === "Geen bedrukking")) item.productionReadiness = { status: "CONFIGURED", reason: null };
        if (productionLines.length) for (const item of items) {
          const itemLines = productionLines.filter(({ itemId }) => !itemId || itemId === item.id);
          if (!itemLines.length && (item.variants ?? []).every(({ personalization }) => personalization === "Geen bedrukking")) continue;
          const allValid = itemLines.length && itemLines.every(({ validation }) => validation.status === "VALID");
          item.productionReadiness = { status: allValid ? "CONFIGURED" : item.productionReadiness?.status === "DATA_GAP" ? "DATA_GAP" : "ATTENTION", reason: itemLines.find(({ validation }) => validation.status === "BLOCKED")?.validation.reason ?? "Voor dit bedrukte artikel ontbreekt een uitvoerbare productieregel." };
        }
        const productionAttention = items.filter((item) => item.productionReadiness?.status !== "CONFIGURED");
        const blockingProductionGaps = productionAttention.filter((item) => item.productionReadiness?.status === "DATA_GAP");
        const associations = [...new Set(items.map(({ association }) => association).filter(Boolean))];
        if (orderKind === "TEAM" && associations.length === 0) throw Object.assign(new Error("Kies een vereniging voor de teamorder."), { statusCode: 400, code: "TEAM_ASSOCIATION_REQUIRED" });
        const teamCustomerFallback = associations.length === 1 ? `Teamorder · ${associations[0]}` : "Teamorder";
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
        const order = {
          id,
          revision: 1,
          customer: orderKind === "TEAM" ? String(payload.customer ?? "").trim().slice(0, 120) || teamCustomerFallback : orderKind === "CUSTOM" ? String(payload.customer ?? "").trim().slice(0, 120) || "Vrije productieopdracht" : requiredText(payload.customer, "Klant", 120),
          customerEmail: ["TEAM", "CUSTOM"].includes(orderKind) && !String(payload.customerEmail ?? "").trim() ? "" : validEmail(legacy006Payload ? "legacy-order@sportpaleis.invalid" : payload.customerEmail),
          customerPhone: ["TEAM", "CUSTOM"].includes(orderKind) ? String(payload.customerPhone ?? "").trim().slice(0, 40) : requiredText(legacy006Payload ? "Niet vastgelegd (006)" : payload.customerPhone, "Telefoonnummer", 40),
          association: associations.length === 1 ? associations[0] : associations.length > 1 ? "Meerdere verenigingen" : "Geen vereniging",
          associations,
          standardPersonalization,
          createdAt,
          updatedAt: createdAt,
          promisedAt: payload.promisedAt ? validDate(payload.promisedAt) : null,
          stage: "ORDER",
          owner: user.name,
          acceptedBy: { userId: user.id, name: user.name, salesNumber: user.salesNumber ?? null, at: createdAt },
          salesAttribution: { employeeId: salesEmployee?.id ?? null, salesNumber: requestedSalesNumber, label: salesEmployee?.name ?? "Niet gekoppeld", accountType: salesEmployee ? "HUMAN" : "UNASSIGNED", selectedByUserId: user.id, selectedAt: createdAt },
          sourceContext,
          orderKind,
          communication: { requiredForIndividualOrder: orderKind === "INDIVIDUAL", receipt: { status: "NOT_SENT", updatedAt: createdAt }, production: { status: "NOT_SENT", updatedAt: createdAt }, ready: { status: "NOT_SENT", updatedAt: createdAt } },
          notes: note ? [{ id: `note-${randomBytes(6).toString("hex")}`, scope: "order", kind: payload.noteKind === "attention" || payload.noteAttention ? "attention" : "internal", text: requiredText(note, "Opmerking", 600), authorId: user.id, authorName: user.name, createdAt }] : [],
          priority,
          attention: priority ? `Prioriteitsuitzondering: ${priority.reasonLabel}` : (payload.noteKind === "attention" || payload.noteAttention) && note ? note : productionAttention.length ? `${blockingProductionGaps.length ? "Kritieke productiedata ontbreekt" : "Pilot-aandachtspunt"}: ${[...new Set(productionAttention.map(({ productionReadiness }) => productionReadiness.reason).filter(Boolean))].join(" · ")}` : undefined,
          barcode: { value: `SPW:${id}`, featureEnabled: false, hardwareValidated: false },
          pickup: { status: "NOT_PICKED_UP", pickedUpAt: null, pickedUpBy: null },
          payment: { status: "UNKNOWN", updatedAt: null, updatedBy: null, source: source === "WEBSHOP_XPRT" ? "ACA_XPRT" : "UNKNOWN" },
          fulfillment: { mode: fulfillmentMode, status: "PENDING", updatedAt: null, updatedBy: null, feeEur: fulfillmentMode === "DELIVERY" ? state.settings.deliveryFeeEur : 0, address: deliveryAddress },
          operationalFacts: {},
          eventHistory: [{ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_CREATED", at: createdAt, userId: user.id, userName: user.name, source: "button" }],
          totalPieces: items.reduce((sum, item) => sum + item.quantity, 0),
          foilStates: [...new Set(items.map(({ foilColor }) => foilColor))].map((color) => ({ color, status: color.toLowerCase() === "rood" ? "HOLD" : "READY" })),
          items,
          productionLines,
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
        if (order.stage === "CONTROL" && order.items.some((item) => item.productionReadiness?.status === "DATA_GAP" || item.backNumberProduction?.status === "DATA_GAP" || item.variants?.some((variant) => variant.backNumberProduction?.status === "DATA_GAP"))) {
          throw Object.assign(new Error("Productiedata ontbreekt. De order blijft zichtbaar bij Productie, maar kan nog niet naar fysieke productie."), { statusCode: 409, code: "PRODUCTION_DATA_INCOMPLETE" });
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
          if (order.stage === "CONTROL" && order.items.some((item) => item.productionReadiness?.status === "DATA_GAP" || item.backNumberProduction?.status === "DATA_GAP" || item.variants?.some((variant) => variant.backNumberProduction?.status === "DATA_GAP"))) {
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
      if (payload.customer !== undefined) order.customer = requiredText(payload.customer, "Klant", 120);
      if (payload.customerEmail !== undefined) order.customerEmail = validEmail(payload.customerEmail);
      if (payload.customerPhone !== undefined) order.customerPhone = requiredText(payload.customerPhone, "Telefoonnummer", 40);
      if (payload.deliveryMode !== undefined) {
        if (order.sourceContext?.transactionalAuthority === "ACA_XPRT") throw Object.assign(new Error("Wijzig de bezorgwijze van deze webshoporder in ACA XPRT."), { statusCode: 409, code: "XPRT_TRANSACTIONAL_AUTHORITY" });
        const mode = allowedValue(payload.deliveryMode, ["PICKUP", "DELIVERY"], "Bezorgwijze");
        const address = mode === "DELIVERY" ? validDeliveryAddress(payload.deliveryAddress ?? order.fulfillment?.address, mode) : null;
        order.fulfillment = { mode, status: "PENDING", updatedAt: iso(), updatedBy: user.id, feeEur: mode === "DELIVERY" ? state.settings.deliveryFeeEur : 0, address };
      }
      if (contentChanged) {
        const strictPilotContract = order.orderKind === "INDIVIDUAL" || order.communication?.requiredForIndividualOrder === true;
        const standardPersonalization = validatePersonalization(payload.standardPersonalization, { requireBackNumberSizeClass: strictPilotContract });
        const items = validateItems(payload.items, state, standardPersonalization, { requireBackNumberSizeClass: strictPilotContract });
        for (const item of items) if (item.productionProfileId === "profile-none" && (item.variants ?? []).every(({ personalization }) => personalization === "Geen bedrukking")) item.productionReadiness = { status: "CONFIGURED", reason: null };
        order.productionLines = order.orderKind === "INDIVIDUAL" ? deriveCatalogProductionLines(state, order.id, items) : order.productionLines;
        if (order.productionLines?.length) for (const item of items) {
          const itemLines = order.productionLines.filter(({ itemId }) => !itemId || itemId === item.id);
          if (!itemLines.length && (item.variants ?? []).every(({ personalization }) => personalization === "Geen bedrukking")) continue;
          const allValid = itemLines.length && itemLines.every(({ validation }) => validation.status === "VALID");
          item.productionReadiness = { status: allValid ? "CONFIGURED" : item.productionReadiness?.status === "DATA_GAP" ? "DATA_GAP" : "ATTENTION", reason: itemLines.find(({ validation }) => validation.status === "BLOCKED")?.validation.reason ?? "Voor dit bedrukte artikel ontbreekt een uitvoerbare productieregel." };
        }
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
      const next = {
        customer: order.customer,
        customerEmail: order.customerEmail ?? "",
        customerPhone: order.customerPhone ?? "",
        deliveryMode: order.fulfillment?.mode ?? "PICKUP",
        deliveryAddress: order.fulfillment?.address ?? null,
        itemSummary: order.items.map(({ product, quantity, size, personalization }) => ({ product, quantity, size: size ?? "", personalization })),
      };
      const changes = Object.keys(previous).filter((field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field])).map((field) => ({ field, from: previous[field], to: next[field] }));
      order.revision += 1; order.updatedAt = iso(); order.eventHistory ??= [];
      const correctionReason = payload.correctionReason ? requiredText(payload.correctionReason, "Correctiereden", 400) : null;
      const productionImpact = contentChanged || changes.some(({ field }) => field === "deliveryMode");
      order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "ORDER_UPDATED", at: order.updatedAt, userId: user.id, userName: user.name, source: "button", details: { contentChanged, productionImpact, changes, ...(correctionReason ? { correctionReason } : {}) } });
      audit(state, user.id, "Order gewijzigd", order.id, { revision: order.revision, contentChanged, productionImpact, changes, correctionReason });
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
      const at = iso(); order.pickup = { status: "PICKED_UP", pickedUpAt: at, pickedUpBy: user.id, exception: String(payload.exception ?? "").trim() || null }; order.fulfillment = { mode: "PICKUP", status: "PICKED_UP", updatedAt: at, updatedBy: user.id, feeEur: 0, address: null }; order.operationalFacts ??= {}; order.operationalFacts.PICKED_UP = { at, userId: user.id, userName: user.name, source: "MANUAL_WORKSPACE" }; order.revision += 1; order.updatedAt = at;
      order.eventHistory ??= []; order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: "PICKED_UP", at, userId: user.id, userName: user.name, source: payload.source === "barcode-emulation" ? "barcode-emulation" : "button" });
      audit(state, user.id, "Order afgehaald", order.id); return { state, value: structuredClone(order) };
    }); return result.value;
  }

  async recordOperationalEvent(token, csrfToken, orderId, payload, idempotencyKey) {
    const { user } = await this.authenticate(token); await this.#assertCsrf(token, csrfToken); assertRole(user, ["admin", "operator", "store"]);
    const action = allowedValue(payload.action, ["PRINTED", "REGISTER_PROCESSED", "PAID", "CUSTOMER_INFORMED", "PICKED_UP", "DELIVERED"], "Operationele actie");
    const result = await this.store.mutate(async (state) => {
      const outcome = idempotent(state, idempotencyKey, user.id, `OPERATIONAL_EVENT:${orderId}:${action}`, () => {
        const order = state.orders.find(({ id }) => id === orderId); if (!order) throw Object.assign(new Error("Order niet gevonden."), { statusCode: 404, code: "ORDER_NOT_FOUND" });
        if (order.revision !== Number(payload.expectedRevision)) throw Object.assign(new Error("De order is intussen gewijzigd."), { statusCode: 409, code: "REVISION_CONFLICT", currentRevision: order.revision });
        if (["PICKED_UP", "DELIVERED"].includes(action) && order.stage !== "DONE") throw Object.assign(new Error("Uitleveren kan pas nadat de order gereed is."), { statusCode: 409, code: "ORDER_NOT_READY" });
        if (action === "PAID" && (order.orderKind !== "TEAM" || order.stage !== "DONE" || order.fulfillment?.mode === "DELIVERY")) throw Object.assign(new Error("Betaling wordt in Workspace alleen bij een gereed teamorder voor afhalen vastgelegd."), { statusCode: 409, code: "PAYMENT_ACTION_NOT_AVAILABLE" });
        if (action === "PICKED_UP" && order.fulfillment?.mode === "DELIVERY") throw Object.assign(new Error("Deze order staat op bezorgen."), { statusCode: 409, code: "FULFILLMENT_MODE_CONFLICT" });
        if (action === "DELIVERED" && order.fulfillment?.mode !== "DELIVERY") throw Object.assign(new Error("Deze order staat op afhalen."), { statusCode: 409, code: "FULFILLMENT_MODE_CONFLICT" });
        const at = iso(); order.operationalFacts ??= {}; order.operationalFacts[action] = { at, userId: user.id, userName: user.name, source: "MANUAL_WORKSPACE" };
        if (action === "REGISTER_PROCESSED") order.payment = { status: "REGISTER_PROCESSED", updatedAt: at, updatedBy: user.id, source: "MANUAL_WORKSPACE" };
        if (action === "PAID") order.payment = { status: "PAID", updatedAt: at, updatedBy: user.id, source: "MANUAL_WORKSPACE" };
        if (action === "PICKED_UP") { order.pickup = { status: "PICKED_UP", pickedUpAt: at, pickedUpBy: user.id }; order.fulfillment = { mode: "PICKUP", status: "PICKED_UP", updatedAt: at, updatedBy: user.id, feeEur: 0, address: null }; }
        if (action === "DELIVERED") order.fulfillment = { ...(order.fulfillment ?? {}), mode: "DELIVERY", status: "DELIVERED", updatedAt: at, updatedBy: user.id, feeEur: order.fulfillment?.feeEur ?? state.settings.deliveryFeeEur };
        order.revision += 1; order.updatedAt = at; order.eventHistory ??= [];
        order.eventHistory.push({ id: `event-${randomBytes(6).toString("hex")}`, type: action, at, userId: user.id, userName: user.name, source: "manual-workspace" });
        audit(state, user.id, `Operationele status: ${action}`, order.id, { action });
        return structuredClone(order);
      });
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
      if (state.users.some((candidate) => candidate.email.toLowerCase() === email)) throw Object.assign(new Error("Dit e-mailadres bestaat al."), { statusCode: 409, code: "EMAIL_EXISTS" });
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
      const previous = { role: target.role, status: target.status, salesNumber: target.salesNumber ?? null, workContexts: structuredClone(target.workContexts ?? workContextsForRole(target.role)), defaultContext: target.defaultContext ?? workContextsForRole(target.role)[0] };
      if (payload.role !== undefined) {
        target.role = allowedValue(payload.role, ["admin", "operator", "store"], "Rol");
        if (payload.workContexts === undefined) target.workContexts = workContextsForRole(target.role);
      }
      if (payload.status !== undefined) target.status = allowedValue(payload.status, ["Actief", "Inactief", "Uitgenodigd"], "Status");
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

  async createAssociation(token, csrfToken, payload) {
    const { user } = await this.authenticate(token);
    await this.#assertCsrf(token, csrfToken);
    assertRole(user, ["admin"]);
    const result = await this.store.mutate(async (state) => {
      const name = requiredText(payload.name, "Verenigingsnaam", 120);
      if (state.associations.some((association) => association.name.toLocaleLowerCase("nl-NL") === name.toLocaleLowerCase("nl-NL"))) throw Object.assign(new Error("Deze vereniging bestaat al."), { statusCode: 409, code: "ASSOCIATION_EXISTS" });
      const provenance = requiredText(payload.provenance, "Bronnotitie", 1_000);
      const createdAt = iso();
      const association = {
        id: `association-${randomBytes(8).toString("hex")}`,
        name,
        sourceName: requiredText(payload.sourceName || name, "Bronnaam", 120),
        active: true,
        source: { file: "Workspace handmatige invoer", sheet: "DATA_GAP", range: provenance.slice(0, 240) },
        fontProfile: "DATA_GAP",
        foilColors: ["Onbekend"],
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
      if (state.articles.some((article) => article.articleNumber.toLocaleLowerCase("nl-NL") === articleNumber.toLocaleLowerCase("nl-NL"))) throw Object.assign(new Error("Dit artikelnummer bestaat al."), { statusCode: 409, code: "ARTICLE_EXISTS" });
      const association = requiredText(payload.association, "Vereniging", 120);
      if (!state.associations.some(({ name }) => name === association)) throw Object.assign(new Error("Kies een bestaande vereniging uit Beheer."), { statusCode: 400, code: "ASSOCIATION_UNKNOWN" });
      const profile = state.productionProfiles.find(({ id }) => id === payload.profileId);
      if (!profile) throw Object.assign(new Error("Productieprofiel niet gevonden."), { statusCode: 400, code: "PROFILE_MISSING" });
      const imageKey = requiredText(payload.imageKey, "Afbeelding", 120);
      if (!ARTICLE_IMAGE_KEYS.has(imageKey)) throw Object.assign(new Error("Kies een bestaande lokale artikelafbeelding."), { statusCode: 400, code: "IMAGE_ASSET_UNKNOWN" });
      const source = requiredText(payload.source, "Bron / bevestiging", 1_000);
      const createdAt = iso();
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
        productionDataGaps: ["Maten, varianten en bedrukregels moeten nog worden bevestigd"],
        validation: { status: "DATA_GAP", source, name: "DATA_GAP", sku: "DATA_GAP", image: "DATA_GAP", variants: "DATA_GAP", sizes: "DATA_GAP", personalization: "DATA_GAP" },
        validationHistory: [{ at: createdAt, userId: user.id, previous: null, next: { articleNumber, association, profileId: profile.id, status: "DATA_GAP", active: false }, source }],
      };
      state.articles.push(article);
      audit(state, user.id, "Artikel aangemaakt", article.id, { revision: 1, association, profileId: profile.id, status: "DATA_GAP", active: false });
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
      article.revision = Number(article.revision ?? 1) + 1;
      article.validationHistory ??= [];
      const changedAt = iso();
      article.validationHistory.unshift({ at: changedAt, userId: user.id, previous, next: structuredClone(article), source: article.validation?.source ?? "Adminwijziging in Workspace" });
      audit(state, user.id, reorderOnly ? "Artikelvolgorde gewijzigd" : "Artikelinstelling gewijzigd", article.id, { revision: article.revision, displayOrder: article.displayOrder ?? null, active: article.active, profileId: article.profileId, association: article.association, validationStatus: article.validation?.status ?? "DATA_GAP" });
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
      const previous = { active: association.active, notes: association.notes, fontProfile: association.fontProfile, foilColors: structuredClone(association.foilColors), dimensionsCm: structuredClone(association.dimensionsCm), juniorValidationStatus: association.juniorValidationStatus, juniorPhysicalHeightMm: association.juniorPhysicalHeightMm ?? null, juniorGarmentSizes: structuredClone(association.juniorGarmentSizes ?? []), juniorValidationNote: association.juniorValidationNote, workspaceLogoSha256: association.workspaceLogo?.sha256 ?? null };
      if (payload.active !== undefined) association.active = Boolean(payload.active);
      if (payload.notes !== undefined) association.notes = requiredText(payload.notes, "Notitie", 1_000);
      if (payload.fontProfile !== undefined) association.fontProfile = requiredText(payload.fontProfile, "Letterprofiel", 120);
      if (payload.foilColors !== undefined) {
        if (!Array.isArray(payload.foilColors) || payload.foilColors.length < 1 || payload.foilColors.length > 8) throw Object.assign(new Error("Leg minimaal één en maximaal acht foliekleuren vast."), { statusCode: 400, code: "FOIL_COLORS_REQUIRED" });
        association.foilColors = [...new Set(payload.foilColors.map((color) => requiredText(color, "Foliekleur", 40)))];
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
      const next = { active: association.active, notes: association.notes, fontProfile: association.fontProfile, foilColors: structuredClone(association.foilColors), dimensionsCm: structuredClone(association.dimensionsCm), juniorValidationStatus: association.juniorValidationStatus, juniorPhysicalHeightMm: association.juniorPhysicalHeightMm, juniorGarmentSizes: structuredClone(association.juniorGarmentSizes ?? []), juniorValidationNote: association.juniorValidationNote, workspaceLogoSha256: association.workspaceLogo?.sha256 ?? null };
      association.validationHistory.unshift({ at: association.updatedAt, userId: user.id, field: "association", previous, next, source: association.juniorValidationNote || "Admin bevestiging in Workspace" });
      const linkedProfileIds = new Set(state.articles.filter((article) => article.association === association.name).map(({ profileId }) => profileId));
      for (const profile of state.productionProfiles.filter(({ id }) => linkedProfileIds.has(id))) {
        const previousProfile = structuredClone(profile);
        profile.fontProfile = association.fontProfile;
        if (!association.foilColors.some((color) => color.toLocaleLowerCase("nl-NL") === profile.foilColor.toLocaleLowerCase("nl-NL"))) profile.foilColor = association.foilColors[0] ?? profile.foilColor;
        profile.sizeLabel = associationProfileSizeLabel(association, profile);
        if (profile.supports?.includes("backNumber")) {
          profile.backNumberSizeClasses ??= {};
          profile.backNumberSizeClasses.JUNIOR = association.juniorValidationStatus === "VALIDATED"
            ? { physicalHeightMm: association.juniorPhysicalHeightMm, sourceValueMm: association.dimensionsCm.backNumberJuniorSourceValue ? association.dimensionsCm.backNumberJuniorSourceValue * 10 : null, status: "VALIDATED", source: association.juniorValidationNote }
            : { physicalHeightMm: null, sourceValueMm: association.dimensionsCm.backNumberJuniorSourceValue ? association.dimensionsCm.backNumberJuniorSourceValue * 10 : null, status: "DATA_GAP", source: association.juniorValidationNote };
        }
        profile.revision = Number(profile.revision ?? 1) + 1;
        profile.validationHistory ??= [];
        profile.validationHistory.unshift({ at: association.updatedAt, userId: user.id, previous: previousProfile, next: structuredClone(profile), source: association.juniorValidationNote });
      }
      for (const order of state.orders.filter(({ stage }) => stage !== "DONE")) for (const item of order.items.filter(({ association: itemAssociation }) => itemAssociation === association.name)) {
        const profile = state.productionProfiles.find(({ id }) => id === item.productionProfileId);
        if (profile) item.foilColor = profile.foilColor;
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
        const horizontalSpacingMm = nullableNumber(payload.initialsInfixRule.horizontalSpacingMm, "Horizontale tussenruimte tussenvoegsel", 0, 100);
        const baselineOffsetMm = nullableNumber(payload.initialsInfixRule.baselineOffsetMm, "Verticale positie tussenvoegsel", -100, 100);
        profile.initialsInfixRule = { active, heightMm, horizontalSpacingMm, baselineOffsetMm, alignment: "CENTER", status: active && heightMm !== null && horizontalSpacingMm !== null && baselineOffsetMm !== null ? "SOURCE_CONFIGURED" : "DATA_GAP", revision: Number(current.revision ?? 0) + 1 };
      }
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
        if (!state.productionFonts.some(({ id, status }) => id === defaultFontId && status === "TECHNICALLY_VALID")) throw Object.assign(new Error("Kies een technisch geldige standaardfontbron."), { statusCode: 400, code: "PRODUCTION_FONT_INVALID" });
        state.settings.productionDefaults = {
          workingWidthMm: number("workingWidthMm", 50, 450),
          minimumGapMm: number("minimumGapMm", 0, 100),
          edgeMarginMm: number("edgeMarginMm", 0, 100),
          defaultWidthMm: number("defaultWidthMm", 1, 430),
          defaultHeightMm: number("defaultHeightMm", 1, 430),
          defaultFontId,
          defaultFoilColor: requiredText(input.defaultFoilColor, "Standaard foliekleur", 80),
        };
        if (state.settings.productionDefaults.workingWidthMm + (2 * state.settings.productionDefaults.edgeMarginMm) > 450) throw Object.assign(new Error("Werkbreedte plus randafstanden past niet binnen 450 mm absolute materiaalbreedte."), { statusCode: 400, code: "PRODUCTION_WIDTH_INVALID" });
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
    if (dimensions.backNumberSenior) labels.push(`Rug Senior ${dimensions.backNumberSenior} cm`);
    if (association.juniorValidationStatus === "VALIDATED") labels.push(`Rug Junior ${association.juniorPhysicalHeightMm} mm (${(association.juniorGarmentSizes ?? []).join("–")})`);
  }
  if (profile.supports?.includes("shortsNumber") && dimensions.shortsNumber) labels.push(`Short ${dimensions.shortsNumber} cm`);
  return labels.join(" · ") || profile.sizeLabel;
}

function resolveBackNumberProductionContext(association, profile, sizeClass, garmentSize) {
  if (!sizeClass) return null;
  if (sizeClass === "JUNIOR" && association?.juniorValidationStatus === "VALIDATED") {
    const configuredSizes = association.juniorGarmentSizes ?? [];
    if (configuredSizes.length && !configuredSizes.includes(garmentSize)) return {
      sizeClass,
      physicalHeightMm: null,
      status: "DATA_GAP",
      source: `De bevestigde Juniorregel geldt alleen voor kledingmaten ${configuredSizes.join(", ")}; maat ${garmentSize} vereist controle.`,
    };
    return { sizeClass, physicalHeightMm: association.juniorPhysicalHeightMm, status: "VALIDATED", source: association.juniorValidationNote };
  }
  const configured = profile.backNumberSizeClasses?.[sizeClass];
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
  if (element?.sourceLayers?.physicallyProvenContour) return "PHYSICALLY_VALIDATED";
  if (element?.sourceLayers?.validatedCutContour) return "GEOMETRY_VALIDATED";
  return element?.sourceLayers?.vectorSource ? "CONFIGURED" : "DATA_GAP";
}

function validateProductionLines(value, state, user, orderKind) {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) return [];
  if (!Array.isArray(value) || value.length > 100) throw Object.assign(new Error("Gebruik maximaal 100 productieregels."), { statusCode: 400, code: "PRODUCTION_LINES_INVALID" });
  const validated = value.map((line, index) => {
    const type = allowedValue(line.type, [...PRODUCTION_LINE_TYPES], "Productieregeltype");
    if (user.role === "store" && ["LOGO", "PRODUCTION_ELEMENT"].includes(type)) throw Object.assign(new Error("Logo's en beeldmerken zijn alleen beschikbaar in Teamorder/Productie."), { statusCode: 403, code: "STORE_LOGO_FORBIDDEN" });
    const content = normalizeProductionContent(type, requiredText(line.content, "Inhoud", 160), line.placementRole);
    if (type === "NUMBER" && !/^\d{1,4}$/u.test(content)) throw Object.assign(new Error("Een nummerregel bevat alleen 1 tot 4 cijfers."), { statusCode: 400, code: "PRODUCTION_NUMBER_INVALID" });
    if (type === "INITIALS" && content.length > 12) throw Object.assign(new Error("Initialen bevatten maximaal 12 tekens."), { statusCode: 400, code: "PRODUCTION_INITIALS_INVALID" });
    const initialsInfix = ["INITIALS_FIRST", "INITIALS_INFIX", "INITIALS_LAST"].includes(line.placementRole);
    const widthMm = Number(line.widthMm); const heightMm = Number(line.heightMm); const quantity = Number(line.quantity);
    if ((!initialsInfix && (!(widthMm >= 1 && widthMm <= 1000) || !(heightMm >= 1 && heightMm <= 1000))) || (initialsInfix && (!(widthMm >= 0 && widthMm <= 1000) || !(heightMm >= 0 && heightMm <= 1000))) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) throw Object.assign(new Error("Afmetingen moeten geldig zijn en aantal 1â€“999."), { statusCode: 400, code: "PRODUCTION_LINE_DIMENSIONS_INVALID" });
    let source; let proofStatus = "CONFIGURED"; let validation = { status: "VALID", reason: null };
    if (["TEXT", "INITIALS", "NUMBER"].includes(type)) {
      const font = state.productionFonts.find(({ id }) => id === line.sourceId);
      const profile = state.productionProfiles.find(({ id }) => id === line.sourceId);
      if (font?.status === "TECHNICALLY_VALID" && (user.role !== "store" || font.allowedInStore)) source = { kind: "FONT", id: font.id, version: font.version, sha256: font.sha256 };
      else if (user.role !== "store" && profile) source = { kind: "PROFILE", id: profile.id, version: String(profile.revision ?? 1) };
      else throw Object.assign(new Error("Kies een toegestane, technisch geldige fontbron."), { statusCode: 400, code: "PRODUCTION_FONT_INVALID" });
    } else {
      const element = state.productionElements.find(({ id }) => id === line.sourceId || line.elementId === id);
      if (!element) throw Object.assign(new Error("Kies een bestaand productie-element."), { statusCode: 400, code: "PRODUCTION_ELEMENT_NOT_FOUND" });
      const dimensionalVariant = element.variants.find(({ widthMm: variantWidth, heightMm: variantHeight }) => Number(variantWidth) > 0 && Number(variantHeight) > 0);
      if (dimensionalVariant && Math.abs((widthMm / heightMm) - (dimensionalVariant.widthMm / dimensionalVariant.heightMm)) > 0.002) throw Object.assign(new Error("De verhouding van een logo-/beeldmerkbron blijft vergrendeld."), { statusCode: 400, code: "LOGO_ASPECT_RATIO_INVALID" });
      proofStatus = productionElementProof(element);
      source = { kind: "PRODUCTION_ELEMENT", id: element.id, version: String(element.revision) };
      if (!["GEOMETRY_VALIDATED", "PHYSICALLY_VALIDATED"].includes(proofStatus)) validation = { status: "BLOCKED", reason: "Een visuele of vectorbron is niet automatisch een gevalideerde snijcontour." };
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
      if (!rule?.active || !rule.heightMm || rule.horizontalSpacingMm === null || rule.baselineOffsetMm === null || rule.status === "DATA_GAP") validation = { status: "BLOCKED", reason: "De kleinere maat, horizontale tussenruimte en verticale positie van het tussenvoegsel zijn nog niet bevestigd." };
    }
    const defaults = state.settings.productionDefaults ?? PILOT_SETTINGS.productionDefaults;
    const maximumObjectWidthMm = defaults.workingWidthMm - (2 * defaults.edgeMarginMm);
    if (widthMm > maximumObjectWidthMm) validation = { status: "BLOCKED", reason: `De gevraagde breedte past niet binnen ${defaults.workingWidthMm} mm veilige werkbreedte met ${defaults.edgeMarginMm} mm randafstand.` };
    return {
      id: String(line.id ?? "").trim() || `production-line-${index + 1}-${randomBytes(5).toString("hex")}`,
      type,
      content,
      source,
      widthMm: Math.round(widthMm * 1000) / 1000,
      heightMm: Math.round(heightMm * 1000) / 1000,
      quantity,
      preview: { kind: source.kind === "FONT" ? "LIVE_FONT" : "ASSET_REFERENCE", label: optional(line.previewLabel, 160) || content, aspectRatioLocked: ["LOGO", "PRODUCTION_ELEMENT"].includes(type) },
      provenance: optional(line.provenance, 500) || `${orderKind} · handmatig vastgelegd in Workspace`,
      proofStatus,
      validation,
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

function deriveCatalogProductionLines(state, orderId, items) {
  const raw = [];
  for (const item of items) {
    const profile = state.productionProfiles.find(({ id }) => id === item.productionProfileId);
    for (const variant of item.variants ?? []) {
      const values = variant.personalizationValues ?? {};
      const initials = normalizeProductionContent("INITIALS", values.initials);
      const initialsInfix = normalizeProductionContent("TEXT", values.initialsInfix, "INITIALS_INFIX");
      if (initialsInfix) {
        const characters = Array.from(initials);
        if (characters.length !== 2) throw new Error("Samengestelde initialen vereisen exact twee initialen.");
        const rule = profile?.initialsInfixRule;
        const compositeText = `${characters[0]}${initialsInfix}${characters[1]}`;
        const compositionId = `${orderId}:${item.id}:${variant.id}:initials-composite`;
        const ruleComplete = rule?.active && Number(rule.heightMm) > 0 && rule.horizontalSpacingMm !== null && rule.baselineOffsetMm !== null && rule.status !== "DATA_GAP";
        const reason = ruleComplete
          ? `De bevestigde contour- of fontbron voor samengestelde initialen in ${profile?.name ?? "dit profiel"} is nog niet gekoppeld.`
          : "De kleinere maat, horizontale tussenruimte en verticale positie van het tussenvoegsel zijn nog niet bevestigd.";
        const placementSnapshot = { compositionId, compositeText, segmentCount: 3, alignment: "CENTER", horizontalSpacingMm: rule?.horizontalSpacingMm ?? null, baselineOffsetMm: rule?.baselineOffsetMm ?? null, profileRevision: profile?.revision ?? 1, ruleRevision: rule?.revision ?? 1 };
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
          source: { kind: "PROFILE", id: profile?.id ?? "profile-data-gap", version: String(profile?.revision ?? 1) },
          widthMm: 0,
          heightMm: segment.heightMm,
          quantity: variant.quantity,
          preview: { kind: "PROFILE_REFERENCE", label: `Samengestelde initialen ${compositeText} · ${segment.segmentIndex + 1}/3`, aspectRatioLocked: false },
          provenance: `${item.sourceProvenance} · ${profile?.name ?? "profiel ontbreekt"} · exemplaar ${variant.id} · samengestelde initialen`,
          proofStatus: "DATA_GAP",
          validation: { status: "BLOCKED", reason },
          placementRole: segment.role,
          placementRule: { ...placementSnapshot, segmentIndex: segment.segmentIndex },
        });
      }
      for (const field of [...PERSONALIZATION_FIELDS, "initialsInfix"]) {
        if (initialsInfix && (field === "initials" || field === "initialsInfix")) continue;
        const isNumber = field === "backNumber" || field === "shortsNumber";
        const lineType = isNumber ? "NUMBER" : field === "initials" ? "INITIALS" : "TEXT";
        const content = normalizeProductionContent(lineType, values[field], field === "initialsInfix" ? "INITIALS_INFIX" : null);
        if (!content) continue;
        const infixRule = field === "initialsInfix" ? profile?.initialsInfixRule : null;
        const configuredHeight = field === "initialsInfix"
          ? Number(infixRule?.heightMm)
          : field === "backNumber"
          ? Number(variant.backNumberProduction?.physicalHeightMm)
          : Number(String(profile?.sizeLabel ?? "").match(/([\d,.]+)\s*cm/iu)?.[1]?.replace(",", ".")) * 10;
        const requestedHeightMm = configuredHeight > 0 ? configuredHeight : field === "initialsInfix" ? 0 : 30;
        const versionedSource = resolveProductionSource({
          sourceSetId: profile?.productionSourceSetId,
          outputWriterId: profile?.outputWriterId,
          lineType,
          content,
          physicalHeightMm: requestedHeightMm,
        });
        const heightMm = versionedSource?.heightMm ?? requestedHeightMm;
        const widthMm = versionedSource?.widthMm ?? (field === "initialsInfix" && !configuredHeight ? 0 : Math.round(Math.max(20, heightMm * Math.max(.5, content.length * .48)) * 1000) / 1000);
        const reason = field === "initialsInfix" && (!infixRule?.active || !infixRule.heightMm || infixRule.verticalOffsetMm === null || infixRule.status === "DATA_GAP")
          ? "De fysieke grootte en onderste positie van het tussenvoegsel zijn nog niet bevestigd."
          : versionedSource
          ? null
          : profile?.productionSourceSetId
            ? `In productiebronset ${profile.productionSourceSetId} bestaat geen gevalideerde ${lineType.toLowerCase()}bron voor “${content}” op ${requestedHeightMm} mm.`
            : `De bevestigde productiebron voor ${profile?.fontProfile ?? "dit profiel"} is niet als lokaal contour/fontbestand gekoppeld.`;
        raw.push({
          id: `catalog-line-${randomBytes(6).toString("hex")}`,
          orderId, itemId: item.id, variantId: variant.id,
          type: lineType,
          content,
          source: versionedSource ? {
            kind: "PRODUCTION_SOURCE",
            id: versionedSource.id,
            version: versionedSource.version,
            sourceSetId: versionedSource.sourceSetId,
            geometryAdapterId: versionedSource.geometryAdapterId,
            geometryAdapterVersion: versionedSource.geometryAdapterVersion,
            outputWriterId: versionedSource.outputWriterId,
            outputWriterVersion: versionedSource.outputWriterVersion,
          } : { kind: "PROFILE", id: profile?.id ?? "profile-data-gap", version: String(profile?.revision ?? 1) },
          widthMm: Math.round(widthMm * 1000) / 1000,
          heightMm: Math.round(heightMm * 1000) / 1000,
          quantity: variant.quantity,
          preview: { kind: versionedSource ? "ASSET_REFERENCE" : "PROFILE_REFERENCE", label: `${field === "backNumber" ? "Rugnummer" : field === "shortsNumber" ? "Shortnummer" : field === "initials" ? "Initialen" : field === "initialsInfix" ? "Tussenvoegsel" : "Naam"} ${content}`, aspectRatioLocked: Boolean(versionedSource) },
          provenance: `${item.sourceProvenance} · ${profile?.name ?? "profiel ontbreekt"} · exemplaar ${variant.id}`,
          proofStatus: versionedSource?.sourceProofStatus ?? "DATA_GAP",
          validation: { status: versionedSource || field === "initialsInfix" && !reason ? "VALID" : "BLOCKED", reason },
          ...(field === "initialsInfix" ? { placementRule: { alignment: infixRule?.alignment ?? "BOTTOM", verticalOffsetMm: infixRule?.verticalOffsetMm ?? null, profileRevision: profile?.revision ?? 1, ruleRevision: infixRule?.revision ?? 1 } } : {}),
        });
      }
    }
  }
  const grouped = new Map();
  for (const line of raw) {
    const key = JSON.stringify([line.orderId, line.itemId, line.type, line.content, line.source.id, line.source.version, line.widthMm, line.heightMm, line.proofStatus, line.validation.status, line.placementRole ?? null, line.placementRule?.compositionId ?? null]);
    const existing = grouped.get(key);
    if (existing) { existing.quantity += line.quantity; existing.variantIds.push(line.variantId); }
    else grouped.set(key, { ...line, variantIds: [line.variantId] });
  }
  return [...grouped.values()];
}

function lineFromOrderItem(state, order, item, index) {
  const value = String(item.personalization ?? item.product).trim();
  const numeric = value.match(/(?:Rug|Short|Nummer)?\s*(\d{1,4})/iu)?.[1];
  const profile = state.productionProfiles.find(({ id }) => id === item.productionProfileId);
  const configuredHeight = Number(item.backNumberProduction?.physicalHeightMm) || Number(String(profile?.sizeLabel ?? "").match(/([\d,.]+)\s*cm/iu)?.[1]?.replace(",", ".")) * 10 || 30;
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

function buildVersionedProductionArtifact(state, orders, productionLines, jobNumber, createdAt, artifactRoot) {
  if (!productionLines.length || productionLines.some((line) => line.source?.kind !== "PRODUCTION_SOURCE" || line.validation?.status !== "VALID")) return null;
  const resolved = productionLines.map((line) => {
    const source = productionSourceByIdentity(line.source.id, line.source.version);
    if (!source || source.content !== line.content || source.lineType !== line.type || source.sourceSetId !== line.source.sourceSetId) throw new Error(`Productiebron ${line.source.id}@${line.source.version} is niet meer identiek resolveerbaar.`);
    if (source.outputWriterId !== line.source.outputWriterId || source.outputWriterVersion !== line.source.outputWriterVersion) throw new Error(`Outputwriter voor ${line.source.id}@${line.source.version} wijkt af van de ordersnapshot.`);
    return { line, source };
  });
  const writerIdentities = new Set(resolved.map(({ source }) => `${source.outputWriterId}@${source.outputWriterVersion}`));
  if (writerIdentities.size !== 1) throw new Error("Eén PlotJob kan alleen productiebronnen voor dezelfde versioned outputwriter bevatten.");
  const [first] = resolved;
  if (!first || first.source.outputWriterId !== CUTJOB_SVG_WRITER.id || first.source.outputWriterVersion !== CUTJOB_SVG_WRITER.version) throw new Error(`Outputwriter ${[...writerIdentities][0] ?? "onbekend"} is niet geïnstalleerd.`);
  const pieces = resolved.flatMap(({ line, source }) => Array.from({ length: line.quantity }, (_, copy) => productionPieceFromSource(source, {
    id: `${line.orderId ?? orders[0].id}-${line.itemId ?? line.id}-${line.content}-${copy + 1}`,
    sourceOrderId: line.orderId ?? orders[0].id,
    label: `${line.preview?.label ?? line.type} · ${line.content}`,
    product: orders.flatMap(({ items }) => items).find(({ id }) => id === line.itemId)?.product,
  })));
  const cutJobBatch = createCutJobBatch({
    organizationId: state.organizationId,
    orderId: orders.map(({ id }) => id).join("+"),
    revision: 1,
    attemptIdPrefix: jobNumber.toLowerCase(),
    createdAt,
    pieces,
    nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: state.settings.productionDefaults.workingWidthMm, minimumCutGapMm: state.settings.productionDefaults.minimumGapMm, edgeMarginMm: state.settings.productionDefaults.edgeMarginMm },
  });
  if (cutJobBatch.jobs.length !== 1 || !cutJobBatch.jobs[0].readyForPrinting) throw new Error("De versioned productiebronnen konden niet tot één geldige productieplaat worden genest.");
  const cutJob = cutJobBatch.jobs[0];
  const preview = createProductionPreview(cutJob);
  const productionDataHash = sha256(JSON.stringify(productionLines)).toUpperCase();
  const svg = preview.svg.replace("<svg ", `<svg data-production-data-sha256="${productionDataHash}" data-cutjob-sha256="${cutJob.contentHash.toUpperCase()}" `);
  const bytes = Buffer.from(svg, "utf8");
  const artifactHash = sha256(bytes).toUpperCase();
  const relativeDirectory = path.join("outputs", "sportpaleis-plotjobs", jobNumber);
  const relativePath = path.join(relativeDirectory, `${jobNumber}-production.svg`).replaceAll(path.sep, "/");
  const absoluteDirectory = path.resolve(artifactRoot, relativeDirectory);
  const absolutePath = path.resolve(artifactRoot, relativePath);
  mkdirSync(absoluteDirectory, { recursive: true });
  if (path.resolve(absolutePath).startsWith(`${absoluteDirectory}${path.sep}`) === false) throw new Error("Ongeldige productiebestandlocatie.");
  try { writeFileSync(absolutePath, bytes, { flag: "wx" }); }
  catch (error) {
    if (error?.code !== "EEXIST" || sha256(readFileSync(absolutePath)).toUpperCase() !== artifactHash) throw error;
  }
  return {
    cutJob,
    preview,
    productionDataHash,
    sources: resolved.map(({ source }) => source),
    outputWriter: { ...CUTJOB_SVG_WRITER },
    artifact: { filename: `${jobNumber}-production.svg`, format: "SVG", version: `${CUTJOB_SVG_WRITER.id}@${CUTJOB_SVG_WRITER.version}`, sha256: artifactHash, path: relativePath, productionDataHash },
  };
}

function buildProductionJobSnapshot(state, orders, jobNumber, createdAt = iso(), artifactRoot = DEFAULT_ARTIFACT_ROOT) {
  const productionLines = orders.flatMap((order) => order.productionLines?.length ? order.productionLines : order.items.map((item, index) => lineFromOrderItem(state, order, item, index)));
  const defaults = state.settings.productionDefaults ?? PILOT_SETTINGS.productionDefaults;
  const layout = rectangleNesting(productionLines, defaults);
  const fontIds = new Set(productionLines.filter(({ source }) => source.kind === "FONT").map(({ source }) => source.id));
  const elementIds = new Set(productionLines.filter(({ source }) => source.kind === "PRODUCTION_ELEMENT").map(({ source }) => source.id));
  const fontSources = state.productionFonts.filter(({ id }) => fontIds.has(id)).map(({ id, name, version, sha256: hash, originalFilename }) => ({ id, name, version, sha256: hash, originalFilename }));
  const logoSources = state.productionElements.filter(({ id }) => elementIds.has(id)).map(({ id, revision, sourceLayers }) => ({ id, revision, sourceLayers: structuredClone(sourceLayers ?? { visualSource: null, vectorSource: null, validatedCutContour: null, physicallyProvenContour: null }) }));
  const sourceContours = logoSources.flatMap(({ id, sourceLayers }) => {
    const source = sourceLayers.physicallyProvenContour ?? sourceLayers.validatedCutContour; if (!source) return [];
    return [{ id: source.sourceId || id, version: source.version, proofStatus: sourceLayers.physicallyProvenContour ? "PHYSICALLY_VALIDATED" : "GEOMETRY_VALIDATED", immutable: true }];
  });
  const productionArtifact = buildVersionedProductionArtifact(state, orders, productionLines, jobNumber, createdAt, artifactRoot);
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
    productionLines: structuredClone(productionLines), fontSources, logoSources,
    productionProfile: { id: firstProfile?.id ?? "generic-production-line-core", revision: firstProfile?.revision ?? 1, name: firstProfile?.name ?? "Generiek productieregelmodel" },
    sourceContours,
    ...(productionArtifact ? { outputWriter: { id: productionArtifact.outputWriter.id, version: productionArtifact.outputWriter.version, format: productionArtifact.outputWriter.format, proofStatus: productionArtifact.outputWriter.proofStatus, physicalRouteStatus: productionArtifact.outputWriter.physicalRouteStatus } } : {}),
    productionGroup: { foilColor: [...new Set(orders.flatMap(({ items }) => items.map(({ foilColor }) => foilColor)))].join(" + ") || defaults.defaultFoilColor, material: "Folie · menselijke controle", workingWidthMm: defaults.workingWidthMm },
    layout: productionArtifact ? { strategy: productionArtifact.cutJob.nesting.strategy, objectCount: productionArtifact.cutJob.productionGeometry.groups.length, closedContourCount: productionArtifact.cutJob.productionGeometry.contours.length, anchorCount: productionArtifact.cutJob.productionGeometry.contours.reduce((sum, contour) => sum + contour.points.length, 0), usedWidthMm: productionArtifact.cutJob.nesting.usedWidthMm, usedLengthMm: productionArtifact.cutJob.nesting.usedLengthMm, edgeMarginMm: defaults.edgeMarginMm, minimumGapMm: defaults.minimumGapMm, placements: productionArtifact.cutJob.productionGeometry.groups.map(({ sourcePieceId, placementMm, boundsMm }) => ({ lineId: sourcePieceId, xMm: placementMm.x, yMm: placementMm.y, widthMm: boundsMm.width, heightMm: boundsMm.height })) } : { strategy: "MINIMUM_SAFE_ROLL_LENGTH_FIRST_RECTANGLE_PREVIEW", objectCount: layout.placements.length, usedWidthMm: layout.usedWidthMm, usedLengthMm: layout.usedLengthMm, edgeMarginMm: defaults.edgeMarginMm, minimumGapMm: defaults.minimumGapMm, placements: layout.placements },
    orientation: manifest.orientation,
    scale: 1,
    artifact: productionArtifact?.artifact ?? { filename: `${jobNumber}-production-manifest.json`, format: "MANIFEST", version: PILOT_RELEASE_ID, sha256: manifestHash, path: `immutable://sportpaleis/plotjobs/${jobNumber}/production-manifest.json`, manifest },
    humanControlRequiredBeforeHardware: true,
    hardwareSendPerformedByWorkspace: false,
  };
}

function productionProposalBlockReason(order) {
  if (order.stage !== "CONTROL") return "status is niet Klaar voor productie";
  const blockedLine = order.productionLines?.find(({ validation }) => validation.status !== "VALID");
  if (blockedLine) return blockedLine.validation.reason || "een productieregel is geblokkeerd";
  const blockedItem = order.items.find((item) => item.productionReadiness?.status === "DATA_GAP" || item.backNumberProduction?.status === "DATA_GAP" || item.variants?.some((variant) => variant.backNumberProduction?.status === "DATA_GAP"));
  if (blockedItem) return blockedItem.productionReadiness?.reason || blockedItem.backNumberProduction?.source || "noodzakelijke productiegegevens ontbreken";
  if (order.foilStates?.length && order.foilStates.every(({ status }) => status === "HOLD")) return "alle foliekleuren staan op wachten";
  return null;
}

function productionStatusForOrder(order) {
  if (order.stage === "DONE") return { productionStatus: "DONE", productionStatusReason: null };
  if (order.stage === "PRINT") return { productionStatus: "IN_PRODUCTION", productionStatusReason: null };
  if (order.stage === "ORDER") {
    const contentBlocker = productionProposalBlockReason({ ...order, stage: "CONTROL" });
    return { productionStatus: "ATTENTION", productionStatusReason: contentBlocker ?? "order moet nog worden gecontroleerd" };
  }
  const blocker = productionProposalBlockReason(order);
  if (blocker) return { productionStatus: "ATTENTION", productionStatusReason: blocker };
  return { productionStatus: "READY", productionStatusReason: null };
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
      if (options.requireBackNumberSizeClass === true && article.printRelevance?.status !== "CONFIRMED_VISIBLE_PERSONALIZATION") throw Object.assign(new Error("Dit artikel behoort niet tot de actuele gevalideerde Bedrukken-catalogus."), { statusCode: 400, code: "ARTICLE_NOT_IN_PRINT_CATALOG" });
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
        const overrides = deviation ? validatePersonalization(variant.overrides ?? {}, options) : { initials: "", initialsInfix: "", name: "", backNumber: "", backNumberSizeClass: "", shortsNumber: "", initialsSemantic: null };
        const forbiddenOverrides = PERSONALIZATION_FIELDS.filter((field) => !article.supports.includes(field) && Boolean(overrides[field]));
        if (forbiddenOverrides.length) throw Object.assign(new Error(`${article.name} staat deze bedrukking niet toe.`), { statusCode: 400, code: "ARTICLE_PERSONALIZATION_NOT_ALLOWED" });
        const appliedFields = Object.fromEntries(article.supports.map((key) => [key, deviation && Object.hasOwn(overrides, key) ? overrides[key] : standardPersonalization[key] ?? ""]));
        if (article.supports.includes("initials")) appliedFields.initialsInfix = deviation ? overrides.initialsInfix : standardPersonalization.initialsInfix ?? "";
        const appliedBackNumberSizeClass = appliedFields.backNumber ? (deviation ? overrides.backNumberSizeClass : standardPersonalization.backNumberSizeClass) : "";
        const applied = { ...appliedFields, backNumberSizeClass: appliedBackNumberSizeClass };
        const policy = article.personalizationPolicy ?? { mode: "combination", fields: Object.fromEntries(article.supports.map((key) => [key, "optional"])) };
        const populated = Object.entries(appliedFields).filter(([key, entry]) => key !== "initialsInfix" && entry);
        if (policy.mode === "mutually-exclusive" && populated.length > 1) throw Object.assign(new Error(`${article.name} staat slechts één bedrukkingstype tegelijk toe.`), { statusCode: 400, code: "PERSONALIZATION_MUTUALLY_EXCLUSIVE" });
        for (const [key, requirement] of Object.entries(policy.fields ?? {})) if (requirement === "required" && !applied[key]) throw Object.assign(new Error(`${article.name} vereist ${labels[key].toLowerCase()}.`), { statusCode: 400, code: "PERSONALIZATION_REQUIRED" });
        const personalization = `${populated.map(([key, entry]) => `${labels[key]} ${entry}${key === "backNumber" && appliedBackNumberSizeClass ? ` (${appliedBackNumberSizeClass === "JUNIOR" ? "Junior" : "Senior"})` : ""}`).join(" · ")}${appliedFields.initialsInfix ? `${populated.length ? " · " : ""}Tussenvoegsel ${appliedFields.initialsInfix}` : ""}` || "Geen bedrukking";
        const enteredSize = String(variant.size ?? "").trim().slice(0, 20);
        const size = enteredSize || "Niet opgegeven";
        if (enteredSize && article.validation?.sizes === "VALIDATED" && article.availableSizes?.length && !article.availableSizes.includes(enteredSize)) throw Object.assign(new Error(`${enteredSize} is geen bevestigde maat voor ${article.name}.`), { statusCode: 400, code: "ARTICLE_SIZE_UNAVAILABLE" });
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
        foilColor: profile.foilColor,
        productionProfileId: profile.id,
        productionInstruction: profile.instruction,
        backNumberProduction: variants.length === 1 ? variants[0].backNumberProduction : null,
      };
    }
    const association = options.freeProduction ? "Vrije bedrukking" : requiredText(item.association ?? options.defaultAssociation, "Vereniging", 120);
    const legacyTrusted = options.requireBackNumberSizeClass !== true && Boolean(options.defaultAssociation) && !item.association;
    if (!options.freeProduction && !state.associations.some(({ name }) => name === association)) throw Object.assign(new Error("Kies een bekende Sportpaleis-vereniging."), { statusCode: 400, code: "ASSOCIATION_UNKNOWN" });
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

function binary(response, statusCode, payload) {
  securityHeaders(response); response.statusCode = statusCode; response.setHeader("Content-Type", payload.mimeType); response.setHeader("Content-Length", payload.bytes.length); response.setHeader("Content-Disposition", `${payload.disposition === "attachment" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(payload.filename)}`); response.setHeader("ETag", `\"${payload.sha256}\"`); response.end(payload.bytes);
}

function cookieHeader(token, secure, clear = false, maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000)) {
  const value = clear ? "" : encodeURIComponent(token);
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : maxAgeSeconds}${secure ? "; Secure" : ""}`;
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
      if (route === "/api/sportpaleis/v1/state-revision" && method === "GET") {
        json(response, 200, await service.currentRevision(token));
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
      const operationalMatch = route.match(/^\/api\/sportpaleis\/v1\/orders\/([^/]+)\/operational-event$/);
      if (operationalMatch && method === "POST") {
        json(response, 200, await service.recordOperationalEvent(token, csrf, decodeURIComponent(operationalMatch[1]), await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/mailbatches/import" && method === "POST") {
        json(response, 201, await service.importMailbatch(token, csrf, await readJson(request), request.headers["idempotency-key"]));
        return true;
      }
      if (route === "/api/sportpaleis/v1/production-elements" && method === "POST") {
        json(response, 201, await service.upsertProductionElement(token, csrf, await readJson(request)));
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
      const productionJobReplotMatch = route.match(/^\/api\/sportpaleis\/v1\/production-jobs\/([^/]+)\/replot$/);
      if (productionJobReplotMatch && method === "POST") {
        json(response, 201, await service.replotProductionJob(token, csrf, decodeURIComponent(productionJobReplotMatch[1]), await readJson(request), request.headers["idempotency-key"]));
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
      const userMatch = route.match(/^\/api\/sportpaleis\/v1\/admin\/users\/([^/]+)$/);
      if (userMatch && method === "PATCH") {
        json(response, 200, await service.updateUser(token, csrf, decodeURIComponent(userMatch[1]), await readJson(request)));
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
