// Restricted maintenance tool: restore-only paired assurance, never a LIVE load
// test. Configuration identifies one reconciled seed and four new canary DBs.
import {readFile,writeFile,mkdir,symlink,rm,realpath} from 'node:fs/promises';
import {openSync,closeSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import os from 'node:os';
import {pathToFileURL} from 'node:url';
import mariadb from 'mariadb';
import {SportpaleisDomainMariaDbStore} from './sportpaleis-domain-mariadb-store.mjs';
import {WbdOwnerDomainMariaDbStore} from './wbd-owner-domain-mariadb-store.mjs';
import {sha256CanonicalJson} from './workspace-domain-state.mjs';
import policy from './release-baseline-policy.cjs';
const {baselineEvidenceDigest:digest,evaluateBaselinePolicy}=policy;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const check=(ok,reason)=>{if(!ok)throw Error('BASELINE_COLLECTOR: '+reason);};
const config=JSON.parse(await readFile(process.argv[2],'utf8'));
check(process.getuid?.()===0,'root maintenance context required');
const namespace=/^wbd_release_canary_[a-z0-9_]+$/u;
check(namespace.test(config.seedDatabase)&&namespace.test(config.databasePrefix),'isolated namespace required');
check(path.resolve(config.outputRoot).startsWith('/tmp/spw-'),'private temporary output root required');
const candidateRoot=await realpath(config.candidateRoot),liveRoot=await realpath('/srv/wbd/current/website');
check(candidateRoot.startsWith('/tmp/spw-'),'candidate must be isolated');
const candidateManifest=JSON.parse(await readFile(path.join(candidateRoot,'../RELEASE-MANIFEST.json'),'utf8'));
const currentManifest=JSON.parse(await readFile(path.join(liveRoot,'../RELEASE-MANIFEST.json'),'utf8'));
const external=JSON.parse(await readFile(config.externalManifest,'utf8'));
for (const file of [config.backfillEvidence,config.ownerBackfillEvidence]) {
 const proof=JSON.parse(await readFile(file,'utf8'));
 check(['BACKFILLED','ALREADY_BACKFILLED'].includes(proof.status) && /^[a-f0-9]{64}$/u.test(proof.legacySha256??'') && proof.legacySha256===proof.composedSha256,'seed backfill is not independently proven');
}
const livePlan=JSON.parse(await readFile('/srv/wbd/shared/deploy-plans/'+currentManifest.releaseId+'.json','utf8'));
const baselineArtifactSha256=livePlan.artifactSha256;
check(/^[a-f0-9]{64}$/u.test(baselineArtifactSha256??''),'LIVE artifact provenance absent');
check(candidateManifest.commit===external.commit,'candidate manifest mismatch');
for(const [root,manifest] of [[candidateRoot,candidateManifest],[liveRoot,currentManifest]]){
 for(const file of manifest.files.filter(file=>file.path.startsWith('app/'))){
  const target=path.resolve(root,file.path.slice(4));check(target.startsWith(root+'/'),'manifest path escape');
  check(hash(await readFile(target))===file.sha256,'runtime file differs: '+file.path);
 }
}
await mkdir(config.outputRoot,{recursive:false,mode:0o700});
const dumpFile=path.join(config.outputRoot,'seed.sql');
const fd=openSync(dumpFile,'wx',0o600);
const dump=spawnSync('mariadb-dump',['--protocol=socket','--single-transaction','--databases',config.seedDatabase],{stdio:['ignore',fd,'pipe']});closeSync(fd);
check(dump.status===0,'isolated seed dump failed');
const sql=await readFile(dumpFile,'utf8');
const loader=path.join(candidateRoot,'scripts/release-baseline-loader.mjs');
const scopes=['sportpaleis','owner'];const runs={sportpaleis:[],owner:[]};const inputs={};
const contracts={};const methods={};
for(const scope of scopes){
 const entry=scope==='sportpaleis'?'sportpaleis-production-shaped-assurance.mjs':'wbd-owner-domain-assurance.mjs';
 const contractFile=scope==='sportpaleis'?'sportpaleis-production-shaped-assurance-v4.json':'wbd-owner-domain-assurance-v1.json';
 contracts[scope]=JSON.parse(await readFile(path.join(candidateRoot,'config',contractFile),'utf8'));
 methods[scope]=hash(Buffer.concat([await readFile(path.join(candidateRoot,'scripts',entry)),await readFile(loader),await readFile(path.join(candidateRoot,'config',contractFile))]));
}
try{
 for(const [index,role] of ['baseline','candidate','candidate','baseline'].entries()){
  const database=config.databasePrefix+'_'+index;check(namespace.test(database),'invalid clone DB');
  const admin=mariadb.createPool({socketPath:'/run/mysqld/mysqld.sock',user:'root',connectionLimit:1});
  try{const rows=await admin.query('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME=?',[database]);check(rows.length===0,'clone already exists');}finally{await admin.end();}
  const restore=sql.replaceAll('`'+config.seedDatabase+'`','`'+database+'`');
  check(!restore.includes('`'+config.seedDatabase+'`'),'seed reference survived');
  const restored=spawnSync('mariadb',['--protocol=socket'],{input:restore,encoding:'utf8',maxBuffer:1024*1024});check(restored.status===0,'clone restore failed');
  const runRoot=path.join(config.outputRoot,'run-'+index);await mkdir(runRoot,{mode:0o700});
  const runtime=path.join(runRoot,'runtime');await mkdir(runtime,{mode:0o700});
  await symlink(path.join(config.seedRuntime,'installed-assets'),path.join(runtime,'installed-assets'),'dir');
  await symlink(path.join(config.seedRuntime,'public'),path.join(runtime,'public'),'dir');
  for(const scope of scopes){
   check(await realpath('/srv/wbd/current/website')===liveRoot,'LIVE changed during collection');
   check(digest(JSON.parse(await readFile(path.join(liveRoot,'../RELEASE-MANIFEST.json'),'utf8')))===digest(currentManifest),'LIVE manifest changed');
   const pool=mariadb.createPool({socketPath:'/run/mysqld/mysqld.sock',user:'root',database,connectionLimit:2});
   const sp=new SportpaleisDomainMariaDbStore({pool}),owner=new WbdOwnerDomainMariaDbStore({pool});
   let state,spState;
   try{spState=await sp.read();state=scope==='sportpaleis'?spState:await owner.read();inputs[scope]??=sha256CanonicalJson(state);check(inputs[scope]===sha256CanonicalJson(state),'input differs between repeats');}finally{await sp.close();await owner.close();await pool.end().catch(()=>{});}
   const entry=path.join(candidateRoot,'scripts',scope==='sportpaleis'?'sportpaleis-production-shaped-assurance.mjs':'wbd-owner-domain-assurance.mjs');
   const env={...process.env,CANARY_WORKSPACE_DB:database,CANARY_ARTIFACT_ROOT:runtime,CANARY_RELEASE_ID:role==='baseline'?currentManifest.releaseId:external.releaseId,CANARY_CANDIDATE_COMMIT:role==='baseline'?currentManifest.commit:external.commit,CANARY_CANDIDATE_ARTIFACT_SHA256:role==='baseline'?baselineArtifactSha256:external.artifactSha256,CANARY_RESTORE_BACKUP_SHA256:config.backupSha256,CANARY_BACKFILL_EVIDENCE_FILE:config.backfillEvidence,CANARY_BACKFILL_MATCH:'true',SPORTPALEIS_ACTIVE_REVIEW_CANDIDATE_IDS:'webshop-blue-release',WBD_REVIEW_ACCESS_ISSUER_IDS:spState.users.filter(u=>u.role==='admin'&&u.status==='Actief').map(u=>u.id).join(','),WBD_REVIEW_ACCESS_ISSUER_SECRET:randomBytes(48).toString('base64url'),BASELINE_ASSURANCE_ENTRY:entry,BASELINE_RUNTIME_ROOT:role==='baseline'?liveRoot:candidateRoot};
   const startedAt=new Date().toISOString();
   const result=spawnSync(process.execPath,['--experimental-loader',loader,entry],{env,encoding:'utf8',timeout:780000,maxBuffer:8*1024*1024});
   const finishedAt=new Date().toISOString();
   await writeFile(path.join(runRoot,scope+'.stdout'),result.stdout??'');await writeFile(path.join(runRoot,scope+'.stderr'),result.stderr??'');
   check([0,1].includes(result.status),'incomplete assurance process');
   const evidence=JSON.parse(result.stdout);check(['PASS','FAIL'].includes(evidence.status),'incomplete assurance evidence');
   runs[scope].push({role,runId:randomBytes(16).toString('hex'),startedAt,finishedAt,methodSha256:methods[scope],inputSha256:inputs[scope],host:os.hostname(),nodeVersion:process.version,runtimeTreeSha256:digest((role==='baseline'?currentManifest:candidateManifest).files),evidenceSha256:digest(evidence),evidence});
   await writeFile(path.join(config.outputRoot,scope+'-runs.json'),JSON.stringify(runs[scope],null,2));
   console.log(JSON.stringify({index,role,scope,status:evidence.status,metrics:scope==='owner'?evidence.metrics:{eventLoopP95Ms:evidence.runtime?.eventLoopP95Ms,eventLoopMaxMs:evidence.runtime?.eventLoopMaxMs},finishedAt}));
  }
 }
 for(const scope of scopes){
  const evidence=structuredClone(runs[scope][1].evidence);
  evidence.baselineComparison={schemaVersion:1,scope,toleranceMs:0,liveManifestSha256:digest(currentManifest),liveReleaseId:currentManifest.releaseId,liveCommit:currentManifest.commit,methodSha256:methods[scope],inputSha256:inputs[scope],host:os.hostname(),nodeVersion:process.version,runs:runs[scope]};
  await writeFile(path.join(config.outputRoot,scope+'-evidence.json'),JSON.stringify(evidence,null,2));
  let decision;try{decision=evaluateBaselinePolicy({evidence,contract:contracts[scope],scope,currentManifest,candidateManifest});}catch(error){decision={status:'FAIL',releaseAllowed:false,reason:error.message};process.exitCode=1;}
  await writeFile(path.join(config.outputRoot,scope+'-decision.json'),JSON.stringify(decision,null,2));console.log(JSON.stringify({scope,decision}));
 }
}finally{await rm(dumpFile,{force:true});}
