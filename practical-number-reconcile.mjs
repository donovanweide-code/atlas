import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const root = realpathSync('/srv/wbd/current');
const manifest = JSON.parse(readFileSync(`${root}/RELEASE-MANIFEST.json`));
const moduleAt = (p) => import(pathToFileURL(`${root}/website/${p}`));
const { verifiedProductionNumberSources } = await moduleAt('src/sportpaleis/verified-production-number-sources.mjs');
const { productionAssetPieces } = await moduleAt('src/sportpaleis/production-assets.mjs');
const { boundsForContours } = await moduleAt('src/sportpaleis/direct-print/geometry.ts');
const sources = verifiedProductionNumberSources().filter(({element}) => element.lifecycleStatus === 'PRODUCTION_READY').map(({definition, element: asset}) => {
  const proofs = ['11','14','44'].map(content => {
    const piece = productionAssetPieces({asset, variant:asset.variants[0], line:{id:'read-only-proof',content,heightMm:asset.variants[0].heightMm},order:{id:'READ-ONLY-NO-ORDER',items:[],association:asset.ownerName},foilColor:'Wit'})[0];
    const members = piece.semanticGroup.physicalMembers;
    return {content, heightMm:boundsForContours(piece.contours).height, gapMm:members[1].relativePlacementMm.x-members[0].sourceBoundsMm.width, mirror:piece.productionRule.mirror};
  });
  return {key:definition.key,sourceSha256:definition.sha256,numberComposition:asset.numberComposition,glyphMetricFields:Object.keys(asset.numberGlyphs['1']),proofs};
});
const paths = ['src/sportpaleis/production-assets.mjs','src/sportpaleis/verified-production-number-sources.mjs','src/sportpaleis/direct-print/semantic-groups.ts','src/sportpaleis/managed-font-production.mjs','scripts/sportpaleis-pilot-foundation.mjs'];
const hashes=Object.fromEntries(paths.map(p=>[p,createHash('sha256').update(readFileSync(`${root}/website/${p}`)).digest('hex')]));
console.log(JSON.stringify({observedAt:new Date().toISOString(),root,releaseId:manifest.releaseId,commit:manifest.commit,hashes,sources},null,2));
