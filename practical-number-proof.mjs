import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = path.resolve(process.env.PROOF_WEBSITE_ROOT || 'website');
const out = path.resolve(process.env.PROOF_OUTPUT || 'website/output/practical-number-hotfix');
await mkdir(out,{recursive:true});
const load = p => import(pathToFileURL(path.join(root,p)));
const {createSportpaleisProductionBootstrap,resolveCanonicalProductionLines,validateFinalProductionTruth,buildProductionJobSnapshot,managedFontProductionPieces,SportpaleisFileStore,SportpaleisPilotService} = await load('scripts/sportpaleis-pilot-foundation.mjs');
const {createManagedFontProductionPiece} = await load('src/sportpaleis/managed-font-production.mjs');
const {productionAssetPieces,productionNumberGlyphSpacingMm,productionNumberSpacingAuthority} = await load('src/sportpaleis/production-assets.mjs');
const {verifiedProductionNumberSources} = await load('src/sportpaleis/verified-production-number-sources.mjs');
const {boundsForContours,groupSemanticNumberObjects,createCutJobBatch} = await load('src/sportpaleis/direct-print/index.ts');
const {articleProductionTruth} = await load('src/sportpaleis/article-production-truth.mjs');
const require = createRequire(path.join(root,'package.json'));
const fontkit = require('fontkit');
const report={at:new Date().toISOString(),root,native:[],svg:[],frontNames:[],identifiers:[],placements:[],waterwijk:[],performance:{}};
const near=(a,b,t=.035)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
const state=createSportpaleisProductionBootstrap();
async function bytesFor(font){for(const dir of ['public','dist-workspace']){try{return await readFile(path.join(root,dir,font.sourceUrl));}catch{}}throw new Error('Missing font '+font.name);}
const points=p=>p.contours.map(c=>c.points);
function svg(piece){const b=boundsForContours(piece.contours);return `<svg xmlns="http://www.w3.org/2000/svg" width="${b.width}mm" height="${b.height}mm" viewBox="${b.minX} ${b.minY} ${b.width} ${b.height}"><path fill="black" fill-rule="evenodd" d="${piece.contours.map(c=>'M'+c.points.map(p=>`${p.x},${p.y}`).join('L')+'Z').join('')}"/></svg>`;}
for(const name of ['Spain Euro 2016','Schluber']){
 const font=state.productionFonts.find(f=>f.name===name),bytes=await bytesFor(font),parsed=fontkit.create(bytes);
 for(const content of ['11','14','18','44','88','10']){
  const args={font,bytes,line:{id:'native-'+content,itemId:'item',type:'NUMBER',content,widthMm:100,heightMm:75,quantity:1},order:{id:'NATIVE',items:[]},item:{id:'item',product:'Fixture',association:'Fixture'},foilColor:'Wit',copy:1};
  const [piece]=managedFontProductionPieces(args),box=boundsForContours(piece.contours);
  assert.equal(piece.semanticGroup.spacingAuthority,'SOURCE_NATIVE_SPACING_AUTHORITY');assert.equal(piece.semanticGroup.garmentCompositionSpacingMm,undefined);
  assert.deepEqual(groupSemanticNumberObjects([piece]),[piece]);near(box.height,75);
  const native=createManagedFontProductionPiece({fontRecord:font,bytes,content,widthMm:100,heightMm:75,id:'reference',foilColor:'Wit'});
  assert.deepEqual(points(piece),points(native),'exact native contour geometry');
  const run=parsed.layout(content);let pen=0;const boxes=run.glyphs.map((g,i)=>{const b=g.path.bbox,p=run.positions[i];const value={minX:pen+p.xOffset+b.minX,maxX:pen+p.xOffset+b.maxX,minY:p.yOffset+b.minY,maxY:p.yOffset+b.maxY};pen+=p.xAdvance;return value;});
  const scale=75/(Math.max(...boxes.map(b=>b.maxY))-Math.min(...boxes.map(b=>b.minY)));
  const expectedGap=(boxes[1].minX-boxes[0].maxX)*scale;
  const m=piece.semanticGroup.physicalMembers;const gap=m[1].relativePlacementMm.x-m[0].relativePlacementMm.x-m[0].sourceBoundsMm.width;near(gap,expectedGap);
  const job=createCutJobBatch({organizationId:'proof',orderId:'NATIVE',revision:1,attemptIdPrefix:'native-'+content,createdAt:'2026-09-10T00:00:00Z',pieces:[piece],nesting:{absoluteMaxWidthMm:450,preferredWorkingWidthMm:440,minimumCutGapMm:6.4,edgeMarginMm:5}}).jobs[0];
  assert.equal(job.productionGeometry.groups.length,1);assert.equal(job.productionGeometry.groups[0].mirrorApplied,true);assert.equal(job.nesting.scaleApplied,1);
  report.native.push({font:name,content,gapMm:gap,fontkitGapMm:expectedGap,heightMm:box.height,widthMm:box.width});
  await writeFile(path.join(out,`${name.replaceAll(' ','-')}-${content}.svg`),svg(piece));
 }
 assert.ok(new Set(report.native.filter(r=>r.font===name).map(r=>r.gapMm.toFixed(2))).size>1,'source determines pair-specific gaps');
 const args={font,bytes,line:{id:'placement',type:'NUMBER',content:'14',widthMm:100,heightMm:75,quantity:1},order:{id:'PLACE'},item:{},foilColor:'Wit',copy:1};
 let baseline;
 for(const field of ['backNumber','shortsNumber','chestNumber']){const [piece]=managedFontProductionPieces({...args,line:{...args.line,personalizationField:field}});if(baseline)assert.deepEqual(points(piece),baseline);else baseline=points(piece);report.placements.push({font:name,field,authority:piece.semanticGroup.spacingAuthority});}
 const oldCompose=()=>groupSemanticNumberObjects([...args.line.content].map((digit,digitIndex)=>({...createManagedFontProductionPiece({fontRecord:font,bytes,content:digit,widthMm:100,heightMm:75,id:'old-'+digitIndex,foilColor:'Wit'}),semanticGroup:{id:'old',kind:'MULTI_DIGIT_NUMBER',sourceLineId:'old',value:'14',digit,digitIndex,digitCount:2,garmentCompositionSpacingMm:18}})));
 oldCompose();managedFontProductionPieces(args);
 const timings=[],oldTimings=[];for(let i=0;i<200;i++){let start=performance.now();oldCompose();oldTimings.push(performance.now()-start);start=performance.now();managedFontProductionPieces(args);timings.push(performance.now()-start);}timings.sort((a,b)=>a-b);oldTimings.sort((a,b)=>a-b);report.performance[name]={warmSamples:200,p50Ms:timings[100],p95Ms:timings[190],oldP50Ms:oldTimings[100],oldP95Ms:oldTimings[190]};assert.ok(timings[190]<Math.max(1,oldTimings[190]*1.5),'no material warm composition regression');
}
for(const{element:asset}of verifiedProductionNumberSources().filter(({element})=>element.lifecycleStatus==='PRODUCTION_READY')){
 for(const content of ['11','14','44']){const [piece]=productionAssetPieces({asset,variant:asset.variants[0],line:{id:'svg',content,heightMm:asset.variants[0].heightMm},order:{id:'SVG',items:[]},foilColor:'Wit'});const m=piece.semanticGroup.physicalMembers;const gap=m[1].relativePlacementMm.x-m[0].sourceBoundsMm.width;const expected=asset.verifiedSourceKey==='pioneers-rug-senior-200'?5:18;near(gap,expected,.00001);assert.equal(piece.semanticGroup.spacingAuthority,expected===5?'PIONEERS_SPACING_AUTHORITY':'FALLBACK_SPACING_AUTHORITY');report.svg.push({source:asset.verifiedSourceKey,content,gapMm:gap,authority:piece.semanticGroup.spacingAuthority});}
}
const specific={numberComposition:{authority:'SOURCE_SPECIFIC_SPACING_AUTHORITY',measurement:'CONTOUR_TO_CONTOUR',freeContourSpacingMm:7}};assert.equal(productionNumberGlyphSpacingMm(specific),7);assert.equal(productionNumberSpacingAuthority(specific),'SOURCE_SPECIFIC_SPACING_AUTHORITY');
function fixture(articleNumber,field,value){const article=state.articles.find(a=>a.articleNumber===articleNumber);assert.ok(article);const item={id:'item-'+articleNumber,articleId:article.id,articleNumber,product:article.name,association:article.association,productionProfileId:article.profileId,foilColor:'Wit',quantity:1,sourceProvenance:'Safe synthetic fixture',variants:[{id:'variant',size:'L',quantity:1,personalizationValues:{[field]:value,...(field==='backNumber'?{backNumberSizeClass:'SENIOR'}:{})}}]};const order={id:'FIX-'+articleNumber,orderKind:'INDIVIDUAL',stage:'CONTROL',revision:1,association:article.association,items:[item]};order.productionLines=resolveCanonicalProductionLines(state,order.id,order.items);return order;}
for(const content of ['14','44','18']){const order=fixture('141705','shortsNumber',content),[line]=order.productionLines;assert.equal(line.type,'NUMBER');const font=state.productionFonts.find(f=>f.id===line.source.id);assert.ok(font);const snap=buildProductionJobSnapshot(state,[order],'PLOT-0000-0000','2026-09-10T00:00:00Z',root,undefined,undefined,{persistArtifacts:false,returnArtifactPayload:true});assert.equal(snap.layout.productionGeometry.groups[0].provenance.semanticGroup.spacingAuthority,'SOURCE_NATIVE_SPACING_AUTHORITY');report.placements.push({article:'141705',field:'shortsNumber',content,font:font.name});}
for(const content of ['JS','JANSEN','VAN DER MEER']){const order=fixture('138505','name',content),[line]=order.productionLines;assert.equal(line.widthMm,90);assert.equal(line.articleProductionRule.placement,'FRONT');const truth=validateFinalProductionTruth(state,order);assert.equal(truth.status,'VALID',JSON.stringify(truth.findings));const snap=buildProductionJobSnapshot(state,[order],'PLOT-0000-0000','2026-09-10T00:00:00Z',root,undefined,undefined,{persistArtifacts:false,returnArtifactPayload:true});const g=snap.layout.productionGeometry.groups[0];near(g.sourceBoundsMm.width,90,.00001);report.frontNames.push({content,widthMm:g.sourceBoundsMm.width,heightMm:g.sourceBoundsMm.height,objects:snap.layout.objectCount});await writeFile(path.join(out,'Pioneers-name-'+content.replaceAll(' ','-')+'.svg'),snap.artifactPayload);}
const fixtureRoot=await mkdtemp(path.join(tmpdir(),'spw-practical-proof-'));
const passwords={kevin:'Synthetic-Practical-2026!',patrick:'Synthetic-Practical-2026!',collega:'Synthetic-Practical-2026!','donovan-support':'Synthetic-Practical-2026!'};
const store=new SportpaleisFileStore({filePath:path.join(fixtureRoot,'state.json'),backupDirectory:path.join(fixtureRoot,'backups'),seedPasswords:passwords});const service=new SportpaleisPilotService({store,artifactRoot:root,runtimeArtifactRoot:path.join(fixtureRoot,'runtime'),releaseId:'PRACTICAL-SAFE-FIXTURE'});await service.initialize();const actor=await service.login({email:'kevin@sportpaleis.nl',password:passwords.kevin});
for(const value of ['AA','JS','14']){const result=(await service.createOrder(actor.token,actor.csrfToken,{orderKind:'INDIVIDUAL',customer:'Synthetic '+value,standardPersonalization:{initials:value},items:[{articleId:'sp-live-141709',size:'L',quantity:1,deviation:false,overrides:{}}]},'identifier-'+value)).value;const s=await store.read();const order=s.orders.find(o=>o.id===result.id);const lines=resolveCanonicalProductionLines(s,order.id,order.items);assert.equal(lines[0].type,'INITIALS');assert.equal(lines[0].personalizationField,'initials');assert.equal(lines[0].content,value);assert.equal(lines.length,1);report.identifiers.push({value,type:lines[0].type,field:lines[0].personalizationField});}
await assert.rejects(()=>service.createOrder(actor.token,actor.csrfToken,{orderKind:'INDIVIDUAL',customer:'Synthetic too long',standardPersonalization:{initials:'ABCDEF'},items:[{articleId:'sp-live-141709',size:'L',quantity:1,deviation:false,overrides:{}}]},'identifier-too-long'));
report.identifiers.push({value:'ABCDEF',rejected:true});
for(const sku of ['116386','116388','138505'])assert.equal(articleProductionTruth(sku,'name').fixedWidthMm,90);
assert.equal(articleProductionTruth('142136','name'),null);assert.equal(articleProductionTruth('138505','backNumber'),null);
{
 const order=fixture('138505','name','JS');const legacy=structuredClone(order.productionLines[0]);delete legacy.articleProductionRule;legacy.widthMm=20;order.productionLines=[legacy];
 const before=JSON.stringify(order);const pending=buildProductionJobSnapshot(state,[order],'PLOT-0000-0000','2026-09-10T00:00:00Z',root,undefined,undefined,{persistArtifacts:false});near(pending.layout.productionGeometry.groups[0].sourceBoundsMm.width,90,.00001);
 state.productionJobs=[{id:'frozen-name',kind:'ORIGINAL',status:'COMPLETED',snapshot:{orderIds:[order.id],productionLines:[structuredClone(legacy)]}}];
 const frozen=buildProductionJobSnapshot(state,[order],'PLOT-0000-0000','2026-09-10T00:00:00Z',root,undefined,undefined,{persistArtifacts:false});assert.ok(Math.abs(frozen.layout.productionGeometry.groups[0].sourceBoundsMm.width-90)>1);assert.equal(JSON.stringify(order),before);state.productionJobs=[];report.frontNames.push({historicalPendingWidth90:true,completedSnapshotPreserved:true});
}
for(const [sku,field,name]of [['137294','backNumber','Spain Euro 2016'],['137295','backNumber','Spain Euro 2016'],['134826','shortsNumber','Spain Euro 2016'],['140218','backNumber','Schluber'],['140219','shortsNumber','Schluber']]){
 for(const sizeClass of field==='backNumber'?['SENIOR','JUNIOR']:['SENIOR']){
  const order=fixture(sku,field,'14');const item=order.items[0];item.productionProfileId=`profile-source-a-s-c-waterwijk-${field}`;
  if(field==='backNumber'){const profile=state.productionProfiles.find(p=>p.id===item.productionProfileId);const height=profile.backNumberSizeClasses[sizeClass].physicalHeightMm;assert.equal(height,sizeClass==='SENIOR'?220:200);item.variants[0].personalizationValues.backNumberSizeClass=sizeClass;item.variants[0].backNumberProduction={sizeClass,physicalHeightMm:height};}
  const [line]=resolveCanonicalProductionLines(state,order.id,order.items);assert.equal(state.productionFonts.find(f=>f.id===line.source.id).name,name);if(field==='backNumber')assert.equal(line.heightMm,sizeClass==='SENIOR'?220:200);report.waterwijk.push({sku,field,sizeClass,font:name,heightMm:line.heightMm});
 }
}
await writeFile(path.join(out,'proof.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
