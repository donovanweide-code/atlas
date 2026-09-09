import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {verifyDomainAuthorityReference} from '../scripts/sportpaleis-domain-authority.mjs';
import {sha256CanonicalJson as hash} from '../scripts/workspace-domain-state.mjs';

function fixture() {
  const legacy={organizationId:'sport-2000-sportpaleis-bv',revision:9657,orders:[{id:'old'}]};
  const state={organizationId:legacy.organizationId,revision:9769,orders:[{id:'old'},{id:'new'}],domainAuthorityCutover:{
    version:1,id:'reviewed',authority:'DOMAIN',tenantId:legacy.organizationId,appliedRevision:9769,
    unresolvedConflicts:0,planHash:'a'.repeat(64),legacyReference:{revision:legacy.revision,sha256:hash(legacy)}}};
  return {legacy,state,metadata:{global_revision:9769,contract_version:1,cutover_mode:'DOMAIN_READS'}};
}
test('post-cutover admission verifies domain authority without importing old legacy records',()=>{
  const f=fixture(), before=structuredClone(f);
  const result=verifyDomainAuthorityReference(f.state,f.legacy,f.metadata);
  assert.equal(result.status,'DOMAIN_AUTHORITY_VERIFIED');assert.equal(result.legacyImported,false);
  assert.equal(result.domainSha256,hash(f.state));assert.deepEqual(f,before);
});
test('normal newer domain writes remain admissible without rewriting the reference',()=>{
  const f=fixture();f.state.revision++;f.metadata.global_revision++;f.state.orders.push({id:'later'});
  assert.equal(verifyDomainAuthorityReference(f.state,f.legacy,f.metadata).globalRevision,9770);
});
for(const [name,change] of [
  ['missing receipt',f=>{delete f.state.domainAuthorityCutover;}],
  ['unresolved conflict',f=>{f.state.domainAuthorityCutover.unresolvedConflicts=1;}],
  ['regressed revision',f=>{f.state.revision=9768;f.metadata.global_revision=9768;}],
  ['metadata race',f=>{f.metadata.global_revision++;}],
  ['foreign tenant',f=>{f.legacy.organizationId='other';}],
  ['legacy revision drift',f=>{f.legacy.revision++;}],
  ['same-revision legacy content drift',f=>{f.legacy.orders.push({id:'unreviewed'});}],
  ['authority downgrade',f=>{f.metadata.cutover_mode='SHADOW';}],
])test(name+' fails closed',()=>{const f=fixture();change(f);assert.throws(()=>verifyDomainAuthorityReference(f.state,f.legacy,f.metadata));});
test('the only scheduled sync entrypoint selects domain storage, not legacy',async()=>{
  const source=await readFile(new URL('../scripts/sportpaleis-website-sync-job.mjs',import.meta.url),'utf8');
  assert.match(source,/new SportpaleisDomainMariaDbStore\(/);assert.doesNotMatch(source,/new SportpaleisMariaDbStore\(/);
  assert.match(source,/stageSportpaleisWebsiteSync/);assert.match(source,/sourceFingerprint === snapshot.fingerprint/);
});
