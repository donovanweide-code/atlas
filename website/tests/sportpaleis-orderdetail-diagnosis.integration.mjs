import assert from 'node:assert/strict';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWebshopBatchReview} from '../scripts/webshop-batch-review-server.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE);
const dir=await mkdtemp(join(tmpdir(),'spw-detail-diagnosis-'));
const server=await createWebshopBatchReview({sourcePath:process.env.SPORTPALEIS_BATCH_PDF,statePath:join(dir,'state.sqlite')});
let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.addInitScript(()=>{
  const original=window.fetch;
  window.fetch=async(...args)=>{
   const detail=String(args[0]).endsWith('/api/order'), start=performance.now();
   if(detail) {window.__render=null;window.__decodedAt=null;}
   const response=await original(...args);
   if(detail) {
    const decode=response.json.bind(response);
    response.json=async()=>{
     const decoded=await decode();window.__fetchDuration=performance.now()-start;window.__decodedAt=performance.now();return decoded;
    };
   }
   return response;
  };
  addEventListener('DOMContentLoaded',()=>new MutationObserver(()=>{
   if(window.__decodedAt && document.querySelector('#order-content .detail-summary')) {
    window.__render=performance.now()-window.__decodedAt;window.__decodedAt=null;
   }
  }).observe(document.querySelector('#order-content'),{childList:true,subtree:true}));
 });
 await page.goto(server.url);
 const loading=page.waitForResponse(r=>r.url().endsWith('/api/load'));
 await page.getByRole('button',{name:'Laad batch',exact:true}).click();
 const batch=await (await loading).json();
 assert.equal(batch.itemCount,18);
 const samples=[];
 for(const number of ['2635358683','2635358543','2635358614','2635358648','2635358566','2635358683']) {
  await page.locator('#search').fill(number);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/order'));
  await page.getByRole('button',{name:`Open bestelling ${number}`,exact:true}).click();
  const res=await response,data=await res.json();assert.equal(res.status(),200);
  await page.waitForFunction(()=>window.__render!==null);
  const ui=await page.evaluate(()=>({browserRenderMs:window.__render,fetchAndDecodeMs:window.__fetchDuration,browserOpenMs:window.batchInteractionMetrics.orderOpenMs}));
  const headers=await res.allHeaders();
  samples.push({orderNumber:number,...data.metrics,...ui,serverTiming:headers['server-timing'],images:data.items.filter(r=>r.catalog?.thumbnail).length,items:data.itemCount});
  if(number==='2635358683') {assert.equal(data.itemCount,5);assert.equal(data.items.filter(r=>r.catalog?.thumbnail).length,3);}
  await page.locator('#order-dialog [data-close]').click();
 }
 const cold=samples.filter(r=>!r.cached), sorted=cold.map(r=>r.browserOpenMs).sort((a,b)=>a-b);
 const result={sourceCommit:'855071b',label:process.env.DIAGNOSIS_LABEL??'before',samples,coldBrowserP50Ms:sorted[2],coldBrowserP95Ms:sorted[4],parseShare: cold.reduce((s,r)=>s+r.parseMs,0)/cold.reduce((s,r)=>s+r.openMs,0),storage:{pdf:0,fullText:0,fullOrderArchive:0}};
 await writeFile(process.env.DIAGNOSIS_OUTPUT,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally {await browser?.close();await server.close();}
