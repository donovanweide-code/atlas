import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {resolve} from '../scripts/release-baseline-loader.mjs';
test('baseline loader changes only direct product imports of the exact assurance entrypoint',async()=>{
 const previous={entry:process.env.BASELINE_ASSURANCE_ENTRY,root:process.env.BASELINE_RUNTIME_ROOT};
 try{
  process.env.BASELINE_ASSURANCE_ENTRY=path.resolve('candidate/scripts/assurance.mjs');process.env.BASELINE_RUNTIME_ROOT=path.resolve('baseline');
  const parentURL=pathToFileURL(process.env.BASELINE_ASSURANCE_ENTRY).href;
  const next=async value=>value;
  assert.equal(await resolve('./product.mjs',{parentURL},next),pathToFileURL(path.resolve('baseline/scripts/product.mjs')).href);
  assert.equal(await resolve('../src/build.mjs',{parentURL},next),pathToFileURL(path.resolve('baseline/src/build.mjs')).href);
  assert.equal(await resolve('node:fs',{parentURL},next),'node:fs');
  assert.equal(await resolve('./product.mjs',{parentURL:pathToFileURL(path.resolve('other.mjs')).href},next),'./product.mjs');
  assert.equal(await resolve('../config/contract.json',{parentURL},next),'../config/contract.json');
  assert.equal(await resolve('./wbd-owner-domain-mariadb-store.mjs',{parentURL},next),'./wbd-owner-domain-mariadb-store.mjs');
  assert.equal(await resolve('./sportpaleis-domain-mariadb-store.mjs',{parentURL},next),pathToFileURL(path.resolve('baseline/scripts/sportpaleis-domain-mariadb-store.mjs')).href);
  assert.equal(await resolve('./wbd-owner-foundation.mjs',{parentURL},next),pathToFileURL(path.resolve('baseline/scripts/wbd-owner-foundation.mjs')).href);
  await assert.rejects(resolve('./../../../escape.mjs',{parentURL},next),/ESCAPE/);
 }finally{for(const [key,value] of [['BASELINE_ASSURANCE_ENTRY',previous.entry],['BASELINE_RUNTIME_ROOT',previous.root]])if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
