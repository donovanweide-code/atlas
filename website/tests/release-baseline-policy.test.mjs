import test from 'node:test';
import assert from 'node:assert/strict';
import policy from '../scripts/release-baseline-policy.cjs';
const {evaluateBaselinePolicy:evaluate,baselineEvidenceDigest:digest}=policy;
const now=Date.parse('2026-09-15T12:00:00Z');
const currentManifest={releaseId:'LIVE',commit:'a'.repeat(40),files:[{path:'app/runtime.mjs',sha256:'4'.repeat(64)}]};
const candidateManifest={releaseId:'CANDIDATE',commit:'b'.repeat(40),files:[{path:'app/runtime.mjs',sha256:'5'.repeat(64)}]};
candidateManifest.baselineAssuranceProbes={baselineCommit:currentManifest.commit,compatible:true,files:[{path:'app/runtime.mjs',baselineSha256:'5'.repeat(64),candidateSha256:'5'.repeat(64)}]};
const contract={limits:{eventLoopP95Ms:75,eventLoopMaxMs:750},requiredInvariants:['authenticatedRoutes','idempotency']};
const baseMetric=(value,role)=>({status:value>75?'FAIL':'PASS',identity:{candidateCommit:(role==='baseline'?'a':'b').repeat(40),candidateArtifactSha256:'c'.repeat(64),assuranceEntrypointSha256:'d'.repeat(64),assuranceContractSha256:'e'.repeat(64),restoreBackupSha256:'f'.repeat(64)},baselineEligibility:{nonEventLoopThresholdsPassed:true},metrics:{eventLoopP95Ms:value,eventLoopMaxMs:120,httpErrors:0,serverErrors:0},invariants:{authenticatedRoutes:true,idempotency:true}});
function fixture(baseline=90,candidate=80){
 const evidence=baseMetric(candidate,'candidate');
 evidence.baselineComparison={schemaVersion:1,scope:'owner',toleranceMs:0,liveManifestSha256:digest(currentManifest),liveReleaseId:'LIVE',liveCommit:currentManifest.commit,methodSha256:'1'.repeat(64),inputSha256:'2'.repeat(64),host:'isolated-host',nodeVersion:'v22.23.2',runs:['baseline','candidate','candidate','baseline'].map((role,i)=>{
  const row=baseMetric(role==='baseline'?baseline:candidate,role);
  return {role,runId:'independent-run-'+i,startedAt:new Date(now-100000+i*10000).toISOString(),finishedAt:new Date(now-95000+i*10000).toISOString(),methodSha256:'1'.repeat(64),inputSha256:'2'.repeat(64),host:'isolated-host',nodeVersion:'v22.23.2',runtimeTreeSha256:digest((role==='baseline'?currentManifest:candidateManifest).files),evidenceSha256:digest(row),evidence:row};
 })};return {evidence,contract,scope:'owner',currentManifest,candidateManifest,now};
}
test('A: both within absolute norm passes without comparison',()=>{const f=fixture(60,65);delete f.evidence.baselineComparison;assert.equal(evaluate(f).status,'ABSOLUTE_PASS');});
test('B: existing debt better or equal passes and remains OPEN',()=>{for(const value of [80,90]){const r=evaluate(fixture(90,value));assert.equal(r.status,'BASELINE_DEBT');assert.equal(r.debt[0].absoluteLimit,75);assert.equal(r.debt[0].remediation,'OPEN');}});
test('C: any worsening beyond baseline fails with zero tolerance',()=>assert.throws(()=>evaluate(fixture(90,90.01)),/regression/));
test('D: previously green baseline cannot authorize new overshoot',()=>assert.throws(()=>evaluate(fixture(70,80)),/regression/));
test('E: missing, stale, tampered or mismatched baseline fails closed',()=>{
 for(const alter of [f=>delete f.evidence.baselineComparison,f=>f.evidence.baselineComparison.liveCommit='x',f=>f.evidence.baselineComparison.runs[0].inputSha256='x',f=>f.evidence.baselineComparison.runs[0].evidence.metrics.eventLoopP95Ms=1000,f=>f.evidence.baselineComparison.runs[0].startedAt='2025-01-01',f=>f.evidence.baselineComparison.runs.pop(),f=>f.evidence.baselineComparison.toleranceMs=1,f=>f.evidence.metrics.eventLoopP95Ms=null]){const f=fixture();alter(f);assert.throws(()=>evaluate(f),/BASELINE_POLICY/);}
});
test('F: functional, HTTP and non-event-loop failures cannot be overridden',()=>{
 for(const alter of [f=>f.evidence.invariants.idempotency=false,f=>f.evidence.metrics.httpErrors=1,f=>f.evidence.baselineEligibility.nonEventLoopThresholdsPassed=false]){const f=fixture();alter(f);assert.throws(()=>evaluate(f));}
});
test('candidate repeat and exact primary evidence binding prevent cherry-picking',()=>{
 const f=fixture();f.evidence.metrics.eventLoopMaxMs=121;assert.throws(()=>evaluate(f),/primary measurement/);
 const g=fixture();const run=g.evidence.baselineComparison.runs[2];run.evidence.metrics.eventLoopP95Ms=91;run.evidenceSha256=digest(run.evidence);assert.throws(()=>evaluate(g),/regression/);
 const h=fixture(70,60);const second=h.evidence.baselineComparison.runs[2];second.evidence.metrics.eventLoopP95Ms=80;second.evidenceSha256=digest(second.evidence);assert.throws(()=>evaluate(h),/regression/);
});
test('wrong runtime tree, host, source manifest and overlapping runs fail closed',()=>{
 for(const alter of [f=>f.evidence.baselineComparison.runs[0].runtimeTreeSha256='0'.repeat(64),f=>f.evidence.baselineComparison.runs[1].host='different-host',f=>f.currentManifest={...f.currentManifest,commit:'f'.repeat(40)},f=>f.evidence.baselineComparison.runs[1].startedAt=f.evidence.baselineComparison.runs[0].startedAt]){const f=fixture();alter(f);assert.throws(()=>evaluate(f));}
});
test('shared measurement infrastructure cannot hide changed Owner code',()=>{const f=fixture();f.candidateManifest=structuredClone(candidateManifest);f.candidateManifest.baselineAssuranceProbes.compatible=false;assert.throws(()=>evaluate(f),/shared Owner/);});
test('Sportpaleis soak exception only covers latency, never missing workload/errors',()=>{
 const f=fixture(1200,1100);f.scope='sportpaleis';f.contract={limits:{eventLoopP95Ms:100,eventLoopMaxMs:1000},minimumLoad:{soakCycles:1,soakRevisionPollsPerCycle:1,soakLibraryPreviewsPerCycle:1,soakBootstrapsPerCycle:1},requiredInvariants:['idempotency','multiCycleSoakCompleted']};
 const convert=row=>{const max=row.metrics.eventLoopP95Ms;row.runtime={eventLoopP95Ms:20,eventLoopMaxMs:max,soakCycles:[{cycle:1,count:3,httpErrors:0,serverErrors:0,eventLoopMaxMs:max}]};row.load={httpErrors:0,serverErrors:0};delete row.metrics;row.invariants.multiCycleSoakCompleted=false;};
 convert(f.evidence);f.evidence.baselineComparison.scope=f.scope;for(const run of f.evidence.baselineComparison.runs){convert(run.evidence);run.evidenceSha256=digest(run.evidence);}
 assert.equal(evaluate(f).status,'BASELINE_DEBT');f.evidence.runtime.soakCycles[0].count=2;assert.throws(()=>evaluate(f),/soak/);
});
