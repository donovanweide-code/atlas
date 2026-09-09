import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import mariadb from 'mariadb';
import {SportpaleisDomainMariaDbStore} from './sportpaleis-domain-mariadb-store.mjs';
import {decodeSportpaleisRuntimeState} from './sportpaleis-mariadb-store.mjs';
import {productionDatabaseCredentialsFromEnvironment} from './workspace-runtime-config.mjs';
import {planDomainAuthorityCutover,applyDomainAuthorityCutover} from './sportpaleis-domain-cutover.mjs';
import {DOMAIN_CUTOVER} from '../config/sportpaleis-domain-cutover.mjs';

const option=name=>{const index=process.argv.indexOf(name);return index<0?undefined:process.argv[index+1];};
const canary=String(process.env.CANARY_WORKSPACE_DB??'');
if(canary && (!/^spw_cutover_test_[a-z0-9_]+$/.test(canary)))throw Error('Invalid isolated canary database');
const pool=canary?mariadb.createPool({socketPath:'/run/mysqld/mysqld.sock',user:'root',database:canary,connectionLimit:2,bigIntAsNumber:true,timezone:'Z'}):null;
const store=new SportpaleisDomainMariaDbStore(pool?{pool}:{database:productionDatabaseCredentialsFromEnvironment(process.env).workspace});
try{
  await store.initialize();
  const rows=await store.pool.query('SELECT revision,state_json FROM sp_runtime_state WHERE organization_id=?',[DOMAIN_CUTOVER.tenantId]);
  if(rows.length!==1)throw Error('Legacy reference missing');
  const legacy=decodeSportpaleisRuntimeState(rows[0].state_json);
  const plan=planDomainAuthorityCutover(await store.read(),legacy);
  if(process.argv.includes('--apply')){
    if(process.env.NODE_ENV!=='production'||process.env.WBD_RELEASEBROKER_LOCK_HELD!=='true')throw Error('Cutover requires explicit release operation and broker lock');
    const manifest=JSON.parse(await readFile(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../RELEASE-MANIFEST.json'),'utf8'));
    if(!option('--release-id')||manifest.releaseId!==option('--release-id'))throw Error('Candidate manifest does not match requested release');
    const outcome=await applyDomainAuthorityCutover(store,legacy,{expectedRevision:Number(option('--expected-revision')),expectedPlanHash:option('--plan-hash')});
    console.log(JSON.stringify({status:'RECONCILED',receipt:outcome.value}));
  }else{
    console.log(JSON.stringify(plan.status==='ALREADY_RECONCILED'?plan:{status:plan.status,id:plan.id,expectedRevision:plan.expectedRevision,planHash:plan.planHash,legacyReference:plan.legacyReference,resolved:plan.resolved,records:plan.patches.map(({collection,id,previousSha256,targetSha256})=>({collection,id,previousSha256,targetSha256}))}));
  }
}finally{await store.close();if(pool)await pool.end();}
