import assert from 'node:assert/strict';
import test from 'node:test';
import {installSportpaleisCapabilityBoundary,SPORTPALEIS_METHOD_CAPABILITIES} from '../scripts/sportpaleis-capability-boundary.mjs';

test('temporary review guard uses only its authoritative grant projection and still rejects revocation',async()=>{
 const state={organizationId:'fixture',workspacePermissions:null,reviewDeveloperAccess:{grants:[{id:'grant-fixture'}]},audit:[]};
 Object.defineProperty(state,'orders',{enumerable:true,get(){throw Error('Review authentication must not traverse business records');}});
 let revoked=false,checks=0;
 const service={store:{},authenticate:async()=>({state,user:{id:'review-fixture'},session:{id:'session-fixture',authMethod:'TEMPORARY_REVIEW_GRANT'}}),
 reviewDeveloperAccessPolicy:{authenticateSession(projected,input){
   checks++;assert.deepEqual(Object.keys(projected).sort(),['audit','reviewDeveloperAccess']);
   assert.equal(input.sessionToken,'review-token');assert.equal(input.tenantId,'sportpaleis');
   assert.notEqual(projected.reviewDeveloperAccess,state.reviewDeveloperAccess);
   assert.deepEqual(projected.reviewDeveloperAccess.grants,state.reviewDeveloperAccess.grants);
   if(revoked)throw Object.assign(new Error('Revoked'),{statusCode:401});
 }}};
 for(const name of Object.keys(SPORTPALEIS_METHOD_CAPABILITIES))service[name]=async()=>42;
 installSportpaleisCapabilityBoundary(service);
 assert.equal(await service.currentRevision('review-token'),42);assert.equal(checks,1);
 revoked=true;await assert.rejects(service.currentRevision('review-token'),{statusCode:401});assert.equal(checks,2);
});
