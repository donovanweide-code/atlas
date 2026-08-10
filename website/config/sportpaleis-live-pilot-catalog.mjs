export const SPORTPALEIS_LIVE_CATALOG_CHECKED_AT = "2026-08-10";
export const SPORTPALEIS_LIVE_CATALOG_SOURCE = "https://www.sportpaleis.nl/verenigingen/a-s-c-waterwijk/";

const BASE_URL = "https://www.sportpaleis.nl";
const WATERWIJK_ASSOCIATION = "A.S.C. Waterwijk";

function source(path, imagePath) {
  return {
    authority: "SPORTPALEIS_LIVE",
    url: `${BASE_URL}${path}`,
    imageUrl: `${BASE_URL}${imagePath}`,
    checkedAt: SPORTPALEIS_LIVE_CATALOG_CHECKED_AT,
  };
}

function liveArticle({ association = WATERWIJK_ASSOCIATION, sku, supplierArticleNumber, name, path, imagePath, sizes, category, profileId, options }) {
  const canonicalOptions = options.filter(({ field }) => field);
  const unresolvedOptions = options.filter(({ field }) => !field);
  const supports = [...new Set(canonicalOptions.map(({ field }) => field))];
  const provenance = source(path, imagePath);
  return {
    id: `sp-live-${sku}`,
    articleNumber: sku,
    supplierArticleNumber,
    name,
    imageKey: `sp-live-${sku}`,
    category,
    association,
    profileId,
    supports,
    active: true,
    revision: 1,
    variantLabels: [],
    availableSizes: sizes,
    commercialPrintOptions: options.map(({ label, field, priceEur }) => ({
      sourceLabel: label,
      canonicalField: field ?? null,
      priceEur,
      status: field ? "VALIDATED" : "DATA_GAP",
    })),
    catalogProvenance: provenance,
    productionDataGaps: [
      ...(unresolvedOptions.length ? [`Betekenis van live optie ${unresolvedOptions.map(({ label }) => `“${label}”`).join(" / ")} is niet bevestigd als rug-, borst- of shortnummer.`] : []),
      "Exacte positie ontbreekt (niet-blokkerend pilot-aandachtspunt).",
      "Referentieafstand ontbreekt (niet-blokkerend pilot-aandachtspunt).",
      "Rotatie en spiegeling worden in de bestaande handmatige productiewerkwijze bepaald.",
    ],
    personalizationPolicy: {
      mode: supports.length > 1 ? "combination" : supports.length === 1 ? "optional" : "none",
      fields: Object.fromEntries(supports.map((field) => [field, "optional"])),
    },
    validation: {
      status: unresolvedOptions.length ? "PARTIAL" : "VALIDATED",
      source: `Sportpaleis.nl live · ${provenance.url} · gecontroleerd ${SPORTPALEIS_LIVE_CATALOG_CHECKED_AT}. Technische productievelden volgen uitsluitend info bedrukkingen 2026.xlsx; positie/afstand/rotatie/spiegeling zijn volgens human pilotbeleid niet-blokkerende aandachtspunten.`,
      name: "VALIDATED",
      sku: "VALIDATED",
      image: "VALIDATED",
      variants: "VALIDATED",
      sizes: "VALIDATED",
      personalization: unresolvedOptions.length ? "DATA_GAP" : "VALIDATED",
    },
    validationHistory: [],
  };
}

const JR_TO_XXL = ["128", "140", "152", "164", "S", "M", "L", "XL", "XXL"];
const FULL_TO_XXL = ["116", "128", "140", "152", "164", "S", "M", "L", "XL", "XXL"];

const SPORTPALEIS_LIVE_DETAILED_ARTICLES = [
  liveArticle({ association: "A.S.C. Waterwijk", sku: "137294", supplierArticleNumber: "SELECTIE", name: "ASC Waterwijk WEDSTRIJD SHIRT SELECTIE", path: "/asc-waterwijk-wedstrijd-shirt-selectie_91825.html", imagePath: "/img/asc-waterwijk-wedstrijd-shirt-selectie_1500x1500_178354.webp", sizes: JR_TO_XXL, category: "Wedstrijd", profileId: "profile-shirt-home", options: [{ label: "Rugnummer", field: "backNumber", priceEur: 6.5 }] }),
  liveArticle({ sku: "137295", supplierArticleNumber: "BREEDTE", name: "ASC Waterwijk WEDSTRIJD SHIRT BREEDTE", path: "/asc-waterwijk-wedstrijd-shirt-breedte_91823.html", imagePath: "/img/asc-waterwijk-wedstrijd-shirt-breedte_1500x1500_178356.webp", sizes: JR_TO_XXL, category: "Wedstrijd", profileId: "profile-shirt-home", options: [{ label: "Rugnummer", field: "backNumber", priceEur: 6.5 }] }),
  liveArticle({ sku: "134826", supplierArticleNumber: "420002", name: "ASC Waterwijk WEDSTRIJD SHORT", path: "/asc-waterwijk-wedstrijd-short_89364.html", imagePath: "/img/asc-waterwijk-wedstrijd-short_1500x1500_172744.webp", sizes: FULL_TO_XXL, category: "Wedstrijd", profileId: "profile-shorts-home", options: [{ label: "Shortnummer", field: "shortsNumber", priceEur: 4 }] }),
  liveArticle({ sku: "140218", supplierArticleNumber: "410001", name: "ASC Waterwijk RESERVE SHIRT", path: "/asc-waterwijk-reserve-shirt_94743.html", imagePath: "/img/asc-waterwijk-reserve-shirt_1500x1500_187330.webp", sizes: JR_TO_XXL, category: "Wedstrijd", profileId: "profile-shirt-standard", options: [{ label: "Rugnummer", field: "backNumber", priceEur: 6.5 }] }),
  liveArticle({ sku: "140219", supplierArticleNumber: "420000", name: "ASC Waterwijk RESERVE SHORT", path: "/asc-waterwijk-reserve-short_94742.html", imagePath: "/img/asc-waterwijk-reserve-short_1500x1500_187332.webp", sizes: JR_TO_XXL, category: "Wedstrijd", profileId: "profile-shorts-standard", options: [{ label: "Shortnummer", field: "shortsNumber", priceEur: 4 }] }),
  liveArticle({ sku: "140221", supplierArticleNumber: "410015", name: "ASC Waterwijk TRAINING SHIRT", path: "/asc-waterwijk-training-shirt_94741.html", imagePath: "/img/asc-waterwijk-training-shirt_1500x1500_187335.webp", sizes: JR_TO_XXL, category: "Training", profileId: "profile-initials-shirt", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "109097", supplierArticleNumber: "420002", name: "ASC Waterwijk Trainingsshort", path: "/asc-waterwijk-trainingsshort_63853.html", imagePath: "/img/asc-waterwijk-trainingsshort_1500x1500_84388.webp", sizes: ["116", "116-128", "128", "140", "140-152", "152", "164", "164/S", "S", "M", "L", "XL", "XXL"], category: "Training", profileId: "profile-unmapped-number", options: [{ label: "Nummer", field: null, priceEur: 4 }] }),
  liveArticle({ sku: "140224", supplierArticleNumber: "408039", name: "ASC Waterwijk FULL ZIP JACK", path: "/asc-waterwijk-full-zip-jack_94745.html", imagePath: "/img/asc-waterwijk-full-zip-jack_1500x1500_187337.webp", sizes: JR_TO_XXL, category: "Training", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "140228", supplierArticleNumber: "408040", name: "ASC Waterwijk ZIP TOP", path: "/asc-waterwijk-zip-top_94765.html", imagePath: "/img/asc-waterwijk-zip-top_1500x1500_187341.webp", sizes: JR_TO_XXL, category: "Training", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "140304", supplierArticleNumber: "432013", name: "ASC Waterwijk Stadio Pants", path: "/asc-waterwijk-stadio-pants_94845.html", imagePath: "/img/asc-waterwijk-stadio-pants_1500x1500_186392.webp", sizes: [...FULL_TO_XXL, "3XL"], category: "Training", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "140226", supplierArticleNumber: "463003", name: "ASC Waterwijk PRESENTATIE POLO", path: "/asc-waterwijk-presentatie-polo_94754.html", imagePath: "/img/asc-waterwijk-presentatie-polo_1500x1500_187339.webp", sizes: JR_TO_XXL, category: "Presentatie", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "137293", supplierArticleNumber: "415009", name: "ASC Waterwijk KEEPERS SET BREEDTE", path: "/asc-waterwijk-keepers-set-breedte_91824.html", imagePath: "/img/asc-waterwijk-keepers-set-breedte_1500x1500_177736.webp", sizes: ["128", "140", "152", "164", "S", "M", "L", "XL"], category: "Keeper", profileId: "profile-keeper", options: [{ label: "Rugnummer", field: "backNumber", priceEur: 6.5 }] }),
  liveArticle({ sku: "136241", supplierArticleNumber: "415009", name: "ASC Waterwijk KEEPERS SET SELECTIE", path: "/asc-waterwijk-keepers-set-selectie_90774.html", imagePath: "/img/asc-waterwijk-keepers-set-selectie_1500x1500_175884.webp", sizes: JR_TO_XXL, category: "Keeper", profileId: "profile-keeper", options: [{ label: "Rugnummer", field: "backNumber", priceEur: 6.5 }] }),
  liveArticle({ sku: "109104", supplierArticleNumber: "454002", name: "ASC Waterwijk Regenjack", path: "/asc-waterwijk-regenjack_63860.html", imagePath: "/img/asc-waterwijk-regenjack_1500x1500_84402.webp", sizes: FULL_TO_XXL, category: "Training", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "111793", supplierArticleNumber: "457006", name: "ASC Waterwijk WINTERJAS", path: "/asc-waterwijk-winterjas_66513.html", imagePath: "/img/asc-waterwijk-winterjas_1500x1500_88360.webp", sizes: ["128", "152", "164", "S", "M", "L", "XL", "XXL", "3XL"], category: "Training", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "139145", supplierArticleNumber: "484807", name: "ASC Waterwijk RUGTAS", path: "/asc-waterwijk-rugtas_93674.html", imagePath: "/img/asc-waterwijk-rugtas_1500x1500_182868.webp", sizes: ["One Size"], category: "Tas", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "109099", supplierArticleNumber: "484835", name: "ASC Waterwijk Voetbaltas", path: "/asc-waterwijk-voetbaltas_63855.html", imagePath: "/img/asc-waterwijk-voetbaltas_1500x1500_84392.webp", sizes: ["One Size"], category: "Tas", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "109098", supplierArticleNumber: "484838", name: "ASC Waterwijk Voetbal Rugtas", path: "/asc-waterwijk-voetbal-rugtas_63854.html", imagePath: "/img/asc-waterwijk-voetbal-rugtas_1500x1500_84390.webp", sizes: ["One Size"], category: "Tas", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "124663", supplierArticleNumber: "410008", name: "ASC Waterwijk Presentatie Shirt", path: "/asc-waterwijk-presentatie-shirt_79244.html", imagePath: "/img/asc-waterwijk-presentatie-shirt_1500x1500_148446.webp", sizes: JR_TO_XXL, category: "Presentatie", profileId: "profile-initials-shirt", options: [{ label: "Initialen", field: "initials", priceEur: 4 }, { label: "Nummer", field: null, priceEur: 6.5 }] }),
  liveArticle({ sku: "123689", supplierArticleNumber: "408024", name: "ASC Waterwijk Hoodie", path: "/asc-waterwijk-hoodie_78275.html", imagePath: "/img/asc-waterwijk-hoodie_1500x1500_145711.webp", sizes: FULL_TO_XXL, category: "Training", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "123692", supplierArticleNumber: "408027", name: "ASC Waterwijk Trainingstop", path: "/asc-waterwijk-trainingstop_78273.html", imagePath: "/img/asc-waterwijk-trainingstop_1500x1500_145714.webp", sizes: JR_TO_XXL, category: "Training", profileId: "profile-initials-other", options: [{ label: "Initialen", field: "initials", priceEur: 4 }] }),
  liveArticle({ sku: "123691", supplierArticleNumber: "410008", name: "ASC Waterwijk TRAINING/UIT SHIRT", path: "/asc-waterwijk-training-uit-shirt_78260.html", imagePath: "/img/asc-waterwijk-training-uit-shirt_1500x1500_145713.webp", sizes: FULL_TO_XXL, category: "Training", profileId: "profile-unmapped-number", options: [{ label: "Nummer", field: null, priceEur: 6.5 }] }),
  liveArticle({ association: "FC Almere", sku: "116597", supplierArticleNumber: "695904", name: "FC Almere Wedstrijdshirt", path: "/fc-almere-wedstrijdshirt_71242.html", imagePath: "/img/fc-almere-wedstrijdshirt_1500x1500_190298.webp", sizes: ["128", "140", "152", "164", "S", "M", "L", "XL", "XXL", "3XL", "3XL/S"], category: "Wedstrijd", profileId: "profile-fc-shirt-home", options: [{ label: "Rugnummer", field: "backNumber", priceEur: 6.5 }] }),
  liveArticle({ association: "FC Almere", sku: "141521", supplierArticleNumber: "420004", name: "FC Almere FC Almere Wedtrijd/training short", path: "/fc-almere-fc-almere-wedtrijd-training-short_96036.html", imagePath: "/img/fc-almere-fc-almere-wedtrijd-training-short_1500x1500_188306.webp", sizes: JR_TO_XXL, category: "Wedstrijd", profileId: "profile-fc-unmapped-number", options: [{ label: "Nummer", field: null, priceEur: 4 }] }),
  liveArticle({ association: "Almerer Pioneers", sku: "116386", supplierArticleNumber: "DM0Q3S25980", name: "Almere Pioneers Wedstrijdshirt Omkeerbaar", path: "/almere-pioneers-wedstrijdshirt-omkeerbaar_71030.html", imagePath: "/img/almere-pioneers-wedstrijdshirt-omkeerbaar_1500x1500_124014.webp", sizes: ["140", "152", "164", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"], category: "Wedstrijd", profileId: "profile-pioneers-shirt", options: [{ label: "Rug / Borst / Short nummer", field: "backNumber", priceEur: null }, { label: "Naam", field: "name", priceEur: 8.5 }] }),
  liveArticle({ association: "Almerer Pioneers", sku: "116388", supplierArticleNumber: "FM703C25980", name: "Almere Pioneers Shooting Shirt", path: "/almere-pioneers-shooting-shirt_71032.html", imagePath: "/img/almere-pioneers-shooting-shirt_1500x1500_124016.webp", sizes: ["140", "152", "164", "S", "M", "L", "XL", "XXL", "4XL", "10"], category: "Training", profileId: "profile-pioneers-shirt", options: [{ label: "Rug / Borst / Short nummer", field: "backNumber", priceEur: null }, { label: "Naam", field: "name", priceEur: 8.5 }] }),
  liveArticle({ association: "Almerer Pioneers", sku: "116387", supplierArticleNumber: "FP713Z08260", name: "Almere Pioneers Wedstrijdshort", path: "/almere-pioneers-wedstrijdshort_71031.html", imagePath: "/img/almere-pioneers-wedstrijdshort_1500x1500_124015.webp", sizes: ["140", "152", "164", "S", "M", "L", "XL", "XXL", "3XL", "4XL"], category: "Wedstrijd", profileId: "profile-pioneers-shorts", options: [{ label: "Rug / Borst / Short nummer", field: "shortsNumber", priceEur: null }, { label: "Naam", field: "name", priceEur: 8.5 }] }),
];

const ADDITIONAL_LIVE_ARTICLE_SOURCE = [
  ["134827", "440123", "ASC Waterwijk WEDSTRIJD KOUS", "/asc-waterwijk-wedstrijd-kous_89366.html"],
  ["129910", "444004", "Stanno Move Footless Sokken", "/stanno-move-footless-sokken_84477.html"],
  ["140220", "440001", "ASC Waterwijk RESERVE KOUS", "/asc-waterwijk-reserve-kous_94744.html"],
  ["105070", "440001", "Stanno Uni II Sock Voetbalkousen", "/stanno-uni-ii-sock-voetbalkousen_59860.html"],
  ["136292", "440123", "ASC Waterwijk KEEPERS KOUS", "/asc-waterwijk-keepers-kous_90825.html"],
  ["136242", "440123", "ASC Waterwijk KEEPERS KOUS", "/asc-waterwijk-keepers-kous_90773.html"],
  ["125096", "446101", "Stanno Core Baselayer Thermoshirt", "/stanno-core-baselayer-thermoshirt_79666.html"],
  ["125095", "446101", "Stanno Core Baselayer Thermoshirt", "/stanno-core-baselayer-thermoshirt_79665.html"],
  ["106171", "446001", "Stanno Thermo Pants", "/stanno-thermo-pants_60961.html"],
  ["127739", "286959", "Derbystar Classic S-Light II Voetbal", "/derbystar-classic-s-light-ii-voetbal_82350.html"],
  ["127737", "286958", "Derbystar Classic Light II Voetbal", "/derbystar-classic-light-ii-voetbal_82349.html"],
  ["127738", "286965", "Derbystar Classic Light II 320 gram Voetbal", "/derbystar-classic-light-ii-320-gram-voetbal_82352.html"],
  ["127736", "286957", "Derbystar Classic TT II Voetbal", "/derbystar-classic-tt-ii-voetbal_82348.html"],
  ["127735", "286957", "Derbystar Classic TT II Voetbal", "/derbystar-classic-tt-ii-voetbal_82347.html"],
  ["131498", "438008", "Stanno Core Baselayer Shorts", "/stanno-core-baselayer-shorts_86042.html"],
  ["109105", "408012", "ASC Waterwijk Trainingstop", "/asc-waterwijk-trainingstop_63861.html"],
  ["109103", "408003", "ASC Waterwijk Trainingsshirt", "/asc-waterwijk-trainingsshirt_63859.html"],
  ["109102", "460000", "ASC Waterwijk Trainingsshirt", "/asc-waterwijk-trainingsshirt_63858.html"],
  ["109101", "405000", "ASC Waterwijk Trainingspak", "/asc-waterwijk-trainingspak_63857.html"],
];

export const SPORTPALEIS_LIVE_ADDITIONAL_ARTICLES = ADDITIONAL_LIVE_ARTICLE_SOURCE.map(([sku, supplierArticleNumber, name, path]) => ({
  id: `sp-live-${sku}`,
  articleNumber: sku,
  supplierArticleNumber,
  name,
  imageKey: "sp-live-placeholder",
  category: "Live catalogus",
  association: WATERWIJK_ASSOCIATION,
  profileId: "profile-pending",
  supports: [],
  active: true,
  revision: 1,
  variantLabels: [],
  availableSizes: [],
  commercialPrintOptions: [],
  catalogProvenance: {
    authority: "SPORTPALEIS_LIVE",
    url: `${BASE_URL}${path}`,
    imageUrl: null,
    checkedAt: SPORTPALEIS_LIVE_CATALOG_CHECKED_AT,
  },
  productionDataGaps: [
    "Beschikbare maten/varianten moeten opnieuw uit de live productpagina worden ingelezen.",
    "Er was geen zichtbare commerciële bedrukoptie vastgelegd; productie bepaalt tijdens de pilot of en hoe dit artikel wordt bedrukt.",
    "Exacte positie ontbreekt (niet-blokkerend pilot-aandachtspunt).",
    "Referentieafstand ontbreekt (niet-blokkerend pilot-aandachtspunt).",
    "Rotatie en spiegeling worden in de bestaande handmatige productiewerkwijze bepaald.",
  ],
  personalizationPolicy: { mode: "none", fields: {} },
  validation: {
    status: "PARTIAL",
    source: `Sportpaleis.nl live · ${BASE_URL}${path} · gecontroleerd ${SPORTPALEIS_LIVE_CATALOG_CHECKED_AT}. Human pilotbesluit 2026-08-10: live artikelen blijven selecteerbaar; ontbrekende productie-inrichting wordt tijdens de pilot aangevuld.`,
    name: "VALIDATED",
    sku: "VALIDATED",
    image: "DATA_GAP",
    variants: "DATA_GAP",
    sizes: "DATA_GAP",
    personalization: "DATA_GAP",
  },
  validationHistory: [],
}));

export const SPORTPALEIS_LIVE_PILOT_ARTICLES = [
  ...SPORTPALEIS_LIVE_DETAILED_ARTICLES,
  ...SPORTPALEIS_LIVE_ADDITIONAL_ARTICLES,
];

// Historische exportnaam blijft tijdelijk bestaan voor compatibiliteit. Het human
// pilotbesluit van 2026-08-10 maakt deze artikelen niet langer operationeel uitgesloten.
export const SPORTPALEIS_LIVE_EXCLUDED_ARTICLES = [];

export const SPORTPALEIS_LIVE_ASSOCIATION_CATALOGS = [
  ["A.S.C. Waterwijk", 41, "LIVE"], ["Echtnaton", 6, "LIVE"], ["Almerer Pioneers", 10, "LIVE"], ["Almere'81", 20, "LIVE"],
  ["Almere City Jeugd", 15, "LIVE"], ["AS'80", 53, "LIVE"], ["Brouwer Sports", 8, "LIVE"], ["Buitenhout MHC", 22, "LIVE"],
  ["DCG", 28, "LIVE"], ["DCG Selectie", 0, "SITE_ERROR_500"], ["EKVA", 17, "LIVE"], ["FC Almere", 31, "LIVE"],
  ["FC Almere Selectie", 21, "LIVE"], ["Hasselbaink Voetbal Academy", 6, "LIVE"], ["HBSA", 11, "LIVE"], ["Het Nieuwe Land", 19, "LIVE"],
  ["Koriander", 14, "LIVE"], ["Najaden", 3, "LIVE"], ["MHC Lelystad", 19, "LIVE"], ["SC Buitenboys", 35, "LIVE"],
  ["Sloeproeien Almere", 5, "LIVE"], ["s.v. Huizen", 20, "LIVE"], ["s.v. Huizen trainers", 27, "LIVE"], ["Sporting Almere", 26, "LIVE"],
  ["SV Geinburgia", 23, "LIVE"], ["United Dance Almere", 14, "LIVE"], ["VVA/Spartaan", 29, "LIVE"], ["Wooter Academy", 18, "LIVE"],
].map(([association, productCount, status]) => ({
  association,
  productCount,
  status,
  checkedAt: SPORTPALEIS_LIVE_CATALOG_CHECKED_AT,
  sourceUrl: status === "SITE_ERROR_500" ? "https://www.sportpaleis.nl/verenigingen/dcg-selectie/" : null,
}));
