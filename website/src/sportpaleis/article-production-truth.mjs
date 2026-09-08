// Explicit article authority, supplied by Donovan on 2026-09-08.
// These rules precede generic club/profile defaults without changing dimensions.
export const ARTICLE_PRODUCTION_TRUTH = Object.freeze({
  '116386': Object.freeze({ id: 'ARTICLE-116386-NUMBER-COPIES-20260908', field: 'backNumber', outputCopiesPerItem: 2 }),
  '137294': Object.freeze({ id: 'ARTICLE-137294-NUMBER-SPAIN-20260908', field: 'backNumber', fontProfile: 'Spain' }),
  '137295': Object.freeze({ id: 'ARTICLE-137295-NUMBER-SPAIN-20260908', field: 'backNumber', fontProfile: 'Spain' }),
  '134826': Object.freeze({ id: 'ARTICLE-134826-NUMBER-SPAIN-20260908', field: 'shortsNumber', fontProfile: 'Spain' }),
});

export function articleProductionTruth(articleNumber, field) {
  const rule = ARTICLE_PRODUCTION_TRUTH[String(articleNumber ?? '').trim()];
  return rule?.field === field ? rule : null;
}

export function articleProductionProfile(profile, articleNumber, field) {
  const rule = articleProductionTruth(articleNumber, field);
  return profile && rule?.fontProfile ? {
    ...profile,
    fontProfile: rule.fontProfile,
    canonicalFontSourceId: null,
    productionSourceSetId: null,
    productionSourceSetFields: [],
    productionNumberAssetIds: [],
    productionNumberAssetAssignments: {},
    productionNumberAssetAssignmentsByHeight: {},
    productionNumberAssetAssignmentEvidence: {},
    productionNumberAssetAssignmentEvidenceByHeight: {},
  } : profile;
}
