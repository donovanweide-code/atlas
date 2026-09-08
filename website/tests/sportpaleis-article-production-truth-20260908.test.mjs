import assert from 'node:assert/strict';
import test from 'node:test';
import {mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createSportpaleisProductionBootstrap,resolveCanonicalProductionLines,validateFinalProductionTruth,buildProductionJobSnapshot,SportpaleisFileStore,SportpaleisPilotService} from '../scripts/sportpaleis-pilot-foundation.mjs';
import {createTestMailFoundation} from './helpers/sportpaleis-delivery-evidence.mjs';

const date=new Date('2026-09-08T00:00:00Z');
function fixture(articleNumber,field,value='8',quantity=1){
 const state=createSportpaleisProductionBootstrap(date);
 const article=state.articles.find(a=>a.articleNumber===articleNumber);assert.ok(article);
 const profileId=article.association==='A.S.C. Waterwijk'?`profile-source-a-s-c-waterwijk-${field}`:article.profileId;
 const profile=state.productionProfiles.find(p=>p.id===profileId);assert.ok(profile);
 const item={id:'article-'+articleNumber,articleId:article.id,articleNumber,product:article.name,association:article.association,productionProfileId:profileId,foilColor:'Wit',quantity,sourceProvenance:'Human Product Truth Donovan 2026-09-08',variants:[{id:'variant-'+articleNumber,size:'L',quantity,...(field==='backNumber'?{backNumberProduction:{sizeClass:'SENIOR',physicalHeightMm:profile.backNumberSizeClasses.SENIOR.physicalHeightMm}}:{}),personalizationValues:{[field]:value,...(field==='backNumber'?{backNumberSizeClass:'SENIOR'}:{})}}]};
 const order={id:'ARTICLE-'+articleNumber,orderKind:'INDIVIDUAL',stage:'CONTROL',revision:1,association:article.association,items:[item]};
 order.productionLines=resolveCanonicalProductionLines(state,order.id,order.items);
 return{state,order,profile};
}
async function proof(name,data,svg){if(!process.env.SPW_ARTICLE_EVIDENCE_DIR)return;await mkdir(process.env.SPW_ARTICLE_EVIDENCE_DIR,{recursive:true});await writeFile(path.join(process.env.SPW_ARTICLE_EVIDENCE_DIR,name+'.json'),JSON.stringify(data,null,2));if(svg)await writeFile(path.join(process.env.SPW_ARTICLE_EVIDENCE_DIR,name+'.svg'),svg);}

for(const [articleNumber,field] of [['137294','backNumber'],['137295','backNumber'],['134826','shortsNumber']])test(`${articleNumber}: artikelregel SPAIN wint van generiek Schluber in projectie, validator en SVG`,async()=>{
 const{state,order,profile}=fixture(articleNumber,field,'11');assert.equal(profile.fontProfile,'Schluber');
 const [line]=order.productionLines;assert.equal(order.productionLines.length,1);assert.equal(line.source.id,'font-5d083befacdf98ae');assert.equal(line.quantity,1);
 assert.equal(line.heightMm,field==='shortsNumber'?75:profile.backNumberSizeClasses.SENIOR.physicalHeightMm,'bestaande generieke maat blijft ongewijzigd');
 const truth=validateFinalProductionTruth(state,order);assert.equal(truth.status,'VALID',JSON.stringify(truth.findings));
 const wrong=structuredClone(line);const schluber=state.productionFonts.find(f=>f.name==='Schluber');wrong.source={kind:'FONT',id:schluber.id,version:schluber.version,sha256:schluber.sha256};
 const rejected=validateFinalProductionTruth(state,order,[wrong]);assert.equal(rejected.status,'BLOCKED');assert.ok(rejected.findings.some(f=>/SOURCE|FONT/.test(f.code??'')));
 const snapshot=buildProductionJobSnapshot(state,[order],'PLOT-0000-0000',date.toISOString(),path.resolve(import.meta.dirname,'..'),undefined,undefined,{persistArtifacts:false,returnArtifactPayload:true});assert.equal(snapshot.layout.objectCount,1);assert.equal(snapshot.artifact.format,'SVG');assert.equal(snapshot.scale,1);
 await proof(articleNumber,{line,validation:truth.status,rejected:rejected.findings,objectCount:snapshot.layout.objectCount},snapshot.artifactPayload);
});

test('116386: één nummerinvoer geeft verplicht twee identieke fysieke outputs binnen één semantische toepassing',async()=>{
 for(const [value,quantity] of [['8',1],['11',1],['8',3]]){
  const{state,order}=fixture('116386','backNumber',value,quantity);const[line]=order.productionLines;
  assert.equal(order.productionLines.length,1);assert.equal(line.personalizationField,'backNumber');assert.equal(line.content,value);assert.equal(line.quantity,2*quantity);assert.equal(order.items[0].variants[0].personalizationValues.backNumber,value);
  const truth=validateFinalProductionTruth(state,order);assert.equal(truth.status,'VALID',JSON.stringify(truth.findings));
  const wrong={...line,quantity};assert.equal(validateFinalProductionTruth(state,order,[wrong]).status,'BLOCKED');
  const snapshot=buildProductionJobSnapshot(state,[order],'PLOT-0000-0000',date.toISOString(),path.resolve(import.meta.dirname,'..'),undefined,undefined,{persistArtifacts:false,returnArtifactPayload:true});
  assert.equal(snapshot.layout.objectCount,2*quantity);assert.equal(snapshot.scale,1);assert.equal(snapshot.layout.productionGeometry.groups.length,2*quantity);assert.ok(snapshot.layout.productionGeometry.groups.every(g=>g.mirrorApplied));
  assert.deepEqual(resolveCanonicalProductionLines(state,order.id,order.items).map(l=>({content:l.content,quantity:l.quantity})),[{content:value,quantity:2*quantity}],'herprojectie verdubbelt niet opnieuw');
  await proof(`116386-${value}-${quantity}`,{line,objectCount:snapshot.layout.objectCount,groups:snapshot.layout.productionGeometry.groups},snapshot.artifactPayload);
 }
});

test('Waterwijk overige artikelen behouden Schluber; de uitzonderingen veranderen andere toepassingen niet',()=>{
 for(const[articleNumber,field]of[['140218','backNumber'],['140219','shortsNumber']]){const{state,order}=fixture(articleNumber,field);assert.equal(state.productionFonts.find(f=>f.id===order.productionLines[0].source.id).name,'Schluber');assert.equal(order.productionLines[0].quantity,1);}
});

test('Nog niet voorbereide historische opdrukken krijgen artikelwaarheid; fysieke jobs en oude uitvoeringssnapshot blijven immutable',()=>{
 for(const[articleNumber,field]of[['134826','shortsNumber'],['116386','backNumber']]){
  const{state,order,profile}=fixture(articleNumber,field);
  const legacy=structuredClone(order.productionLines[0]);delete legacy.articleProductionRule;legacy.quantity=1;
  if(articleNumber==='134826'){const font=state.productionFonts.find(f=>f.name==='Schluber');legacy.source={kind:'FONT',id:font.id,version:font.version,sha256:font.sha256};}
  const body={productionLines:[legacy],productionProfiles:[profile],associationTruth:state.associations,items:order.items};
  order.productionExecutionSnapshot={...body,executionHash:createHash('sha256').update(JSON.stringify(body)).digest('hex')};order.productionLines=[legacy];order.stage='PRINT';
  const before=JSON.stringify(order);const originalSource=structuredClone(legacy.source);
  const render=()=>buildProductionJobSnapshot(state,[order],'PLOT-0000-0000',date.toISOString(),path.resolve(import.meta.dirname,'..'),undefined,undefined,{persistArtifacts:false});
  const pending=render();assert.equal(pending.layout.objectCount,articleNumber==='116386'?2:1);
  if(articleNumber==='134826')assert.equal(pending.productionLines[0].source.id,'font-5d083befacdf98ae');
  assert.equal(JSON.stringify(order),before,'projectie herschrijft geen historische order');
  for(const status of ['AWAITING_HUMAN_CHECK','COMPLETED']){
   state.productionJobs=[{id:'immutable-job',kind:'ORIGINAL',status,snapshot:{orderIds:[order.id],productionLines:[structuredClone(legacy)]}}];
   const jobsBefore=JSON.stringify(state.productionJobs);const frozen=render();assert.equal(frozen.layout.objectCount,1);assert.deepEqual(frozen.productionLines[0].source,originalSource);assert.equal(JSON.stringify(state.productionJobs),jobsBefore);assert.equal(JSON.stringify(order),before);
  }
 }
});

test('Artikelregels blijven exact na orderopslag, immutable snapshot en echte productiejob',async context=>{
 const root=await mkdtemp(path.join(tmpdir(),'article-truth-flow-'));context.after(()=>rm(root,{recursive:true,force:true}));
 const seedPasswords={kevin:'Article-Admin-2026!',patrick:'Article-Operator-2026!',collega:'Article-Store-2026!','donovan-support':'Article-Support-2026!'};
 const store=new SportpaleisFileStore({filePath:path.join(root,'state.json'),backupDirectory:path.join(root,'backups'),seedPasswords});
 const service=new SportpaleisPilotService({store,mailFoundation:createTestMailFoundation(root),artifactRoot:path.resolve(import.meta.dirname,'..'),runtimeArtifactRoot:path.join(root,'runtime'),releaseId:'ARTICLE-TRUTH-TEST'});await service.initialize();
 const actor=await service.login({email:'kevin@sportpaleis.nl',password:seedPasswords.kevin});
 const state=await service.bootstrap(actor.token);const results=[];
 for(const[articleNumber,field]of[['116386','backNumber'],['137294','backNumber'],['137295','backNumber'],['134826','shortsNumber']]){
  const article=state.articles.find(a=>a.articleNumber===articleNumber);
  const values={initials:'',initialsInfix:'',name:'',backNumber:'',chestNumber:'',shortsNumber:'',backNumberSizeClass:field==='backNumber'?'SENIOR':'',[field]:'8'};
  const created=(await service.createOrder(actor.token,actor.csrfToken,{orderKind:'INDIVIDUAL',customer:'Article '+articleNumber,customerEmail:'',customerPhone:'',standardPersonalization:values,items:[{articleId:article.id,size:'L',quantity:1,foilColor:'Wit',deviation:false,overrides:{}}]},'create-article-'+articleNumber)).value;
  const current=(await service.advanceOrder(actor.token,actor.csrfToken,created.id,created.revision,'control-article-'+articleNumber)).value;
  const{job}=(await service.prepareCurrentProductionGroup(actor.token,actor.csrfToken,{orders:[{id:current.id,expectedRevision:current.revision}],foilColor:'Wit'},'prepare-article-'+articleNumber)).value;
  assert.equal(job.snapshot.layout.objectCount,articleNumber==='116386'?2:1);assert.equal(job.snapshot.productionLines.length,1);assert.equal(job.snapshot.productionLines[0].content,'8');
  if(articleNumber!=='116386')assert.equal(job.snapshot.productionLines[0].source.id,'font-5d083befacdf98ae');
  await service.completeProductionJob(actor.token,actor.csrfToken,job.id,'complete-article-'+articleNumber);
  const after=await service.bootstrap(actor.token);assert.equal(after.orders.find(o=>o.id===current.id).productionStatus,'FULLY_PRODUCED');
  results.push({articleNumber,objectCount:job.snapshot.layout.objectCount,source:job.snapshot.productionLines[0].source,artifact:job.snapshot.artifact,semanticLines:1});
 }
 await proof('persisted-production-flow',results);
});
