import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createWebshopBatchReview } from "../scripts/webshop-batch-review-server.mjs";
const root = await mkdtemp(join(tmpdir(), "spw-concurrency-"));
const service = await createWebshopBatchReview({ sourcePath: process.env.SPORTPALEIS_BATCH_PDF, statePath: join(root, "overrides.sqlite") });
const times = { coldLoad: [], read: [], detail: [], edit: [], excludeRestore: [], handoff: [], search: [], selection: [], browserEdit: [] };
const percentile = (values, p) => [...values].sort((a,b) => a-b)[Math.ceil(values.length*p)-1];
let browser;
try {
  async function client() {
    const home = await fetch(service.url), cookie = home.headers.get("set-cookie").split(";")[0];
    const session = await (await fetch(`${service.url}/api/session`, { headers: { cookie } })).json();
    return { cookie, ...session, async call(path, body, metric) {
      const start = performance.now();
      const response = await fetch(`${service.url}${path}`, { method: body === undefined ? "GET" : "POST", headers: { cookie, Origin: service.url, "X-Batch-CSRF": session.csrf, "Content-Type": "application/json" }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const data = await response.json(); if (metric) times[metric].push(performance.now()-start);
      return { status: response.status, data };
    } };
  }
  const clients = await Promise.all(Array.from({length:10}, client));
  assert.equal(new Set(clients.map((c) => c.cookie)).size, 10);
  assert.equal(new Set(clients.map((c) => c.csrf)).size, 10);
  assert.equal(new Set(clients.map((c) => c.actor)).size, 10);
  const cross = await fetch(`${service.url}/api/load`, {method:"POST", headers:{cookie:clients[0].cookie,Origin:service.url,"X-Batch-CSRF":clients[1].csrf}, body:"{}"});
  assert.equal(cross.status,403);
  const loaded = await Promise.all(clients.map((c) => c.call("/api/load", {}, "coldLoad")));
  loaded.forEach((r) => { assert.equal(r.status,200); assert.equal(r.data.itemCount,18); assert.equal(r.data.metrics.batchParses,1); });
  let batch = loaded[0].data;
  for (let round=0; round<10; round++) {
    const reads = await Promise.all(clients.map((c) => c.call("/api/batch", undefined, "read")));
    assert.ok(reads.every((r) => r.status===200 && r.data.items.length===18));
  }
  const details = await Promise.all(clients.map((c) => c.call("/api/order", {orderNumber:"2635358683"}, "detail")));
  assert.ok(details.every((r) => r.status===200 && r.data.itemCount===5));
  const thumb = batch.items.find((r) => r.values.articleNumber==="116597").catalog.thumbnail;
  const images = await Promise.all(clients.map((c) => fetch(service.url+thumb,{headers:{cookie:c.cookie}})));
  assert.ok(images.every((r) => r.status===200)); await Promise.all(images.map((r) => r.arrayBuffer()));
  let counters = (await clients[0].call("/api/batch")).data.metrics;
  assert.equal(counters.batchParses,1); assert.equal(counters.detailParses,1); assert.equal(counters.thumbnailBuilds,1);

  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
  browser = await chromium.launch({channel:"msedge",headless:true});
  const contexts = await Promise.all(Array.from({length:5}, () => browser.newContext({viewport:{width:1280,height:900}})));
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  await Promise.all(pages.map((p) => p.goto(service.url)));
  await Promise.all(pages.map((p) => p.locator(".item").first().waitFor()));
  const chosen = batch.items.slice(0,5);
  await Promise.all(pages.map(async (p,i) => {
    await p.locator("#search").fill(chosen[i].values.articleNumber);
    await p.locator(`[data-select="${chosen[i].id}"]`).check();
    const own = await p.locator(".item.selected").getAttribute("data-row"); assert.equal(own,chosen[i].id);
    assert.equal(await p.locator(".item.selected").count(),1);
    const metrics = await p.evaluate(() => window.batchInteractionMetrics);
    times.search.push(metrics.searchMs); times.selection.push(metrics.selectionMs);
    await p.locator(`[data-id="${chosen[i].id}"][data-action="edit"]`).click();
    await p.locator('[name="quantity"]').fill(String(i+2));
  }));
  const outcomes = await Promise.all(pages.map(async (p) => {
    const start=performance.now();
    await p.getByRole("button",{name:"Wijziging bewaren"}).click();
    await p.waitForFunction(() => !document.querySelector("#edit-dialog").open || document.querySelector("#edit-error").textContent);
    times.browserEdit.push(performance.now()-start);
    return p.locator("#edit-dialog").isVisible();
  }));
  assert.equal(outcomes.filter(Boolean).length,4,"one winner, four explicit revision conflicts");
  for (let i=0;i<5;i++) if(outcomes[i]) {
    const p=pages[i]; assert.match(await p.locator("#edit-error").innerText(),/gewijzigd/u);
    await p.getByRole("button",{name:"Bekijk laatste wijziging"}).click();
    await p.waitForFunction(() => document.querySelector("#edit-error").textContent.includes("laatste versie"));
    await p.locator('[name="quantity"]').fill(String(i+2));
    await p.getByRole("button",{name:"Wijziging bewaren"}).click();
    await p.locator("#edit-dialog").waitFor({state:"hidden"});
  }
  batch=(await clients[0].call("/api/batch")).data;
  chosen.forEach((r,i) => assert.equal(batch.items.find((v)=>v.id===r.id).values.quantity,i+2));
  assert.equal(new Set(chosen.map((r)=>batch.items.find((v)=>v.id===r.id).override.actor)).size,5);
  for (let i=0;i<5;i++) assert.equal(await pages[i].locator(".item.selected").getAttribute("data-row"),chosen[i].id);
  await Promise.all(contexts.map((c)=>c.close()));

  const row=chosen[0];
  const edits=await Promise.all([2,3].map((quantity,i)=>clients[i].call("/api/override",{id:row.id,action:"edit",revision:batch.revision,values:{quantity}},"edit")));
  assert.deepEqual(edits.map((r)=>r.status).sort(),[200,409]);
  batch=(await clients[0].call("/api/batch")).data;
  const winner=edits.findIndex((r)=>r.status===200);
  assert.equal(batch.items.find((r)=>r.id===row.id).values.quantity,winner+2);
  const actions=["exclude","restore"];
  const changes=await Promise.all(actions.map((action,i)=>clients[i].call("/api/override",{id:row.id,action,revision:batch.revision},"excludeRestore")));
  assert.deepEqual(changes.map((r)=>r.status).sort(),[200,409]);
  batch=(await clients[0].call("/api/batch")).data;
  assert.equal(batch.items.find((r)=>r.id===row.id).excluded,changes[0].status===200);
  const loser=changes.findIndex((r)=>r.status===409);
  const retry=await clients[loser].call("/api/override",{id:row.id,action:actions[loser],revision:batch.revision},"excludeRestore");
  assert.equal(retry.status,200); batch=retry.data;
  assert.equal(batch.items.find((r)=>r.id===row.id).excluded,loser===0);
  const eligible=batch.items.find((r)=>r.values.articleNumber==="116597");
  const previews=await Promise.all(clients.slice(0,2).map((c)=>c.call("/api/preview",{ids:[eligible.id],revision:batch.revision})));
  assert.equal(previews[0].data.id,previews[1].data.id);
  const confirmations=await Promise.all(clients.slice(0,2).map((c,i)=>c.call("/api/confirm",{previewId:previews[i].data.id,revision:batch.revision,confirmed:true},"handoff")));
  assert.ok(confirmations.every((r)=>r.status===200)); assert.equal(confirmations.filter((r)=>!r.data.duplicate).length,1);
  batch=(await clients[0].call("/api/batch")).data;
  assert.equal(batch.items.filter((r)=>r.completed).length,1);
  assert.equal(batch.metrics.batchParses,1); assert.equal(batch.metrics.detailParses,1);
  const isolated=await createWebshopBatchReview({sourcePath:process.env.SPORTPALEIS_BATCH_PDF,statePath:join(root,"isolated.sqlite")});
  const isolatedHome=await fetch(isolated.url), isolatedCookie=isolatedHome.headers.get("set-cookie").split(";")[0];
  assert.equal((await fetch(isolated.url+"/api/batch",{headers:{cookie:isolatedCookie}})).status,409);
  await isolated.close();
  const latency=Object.fromEntries(Object.entries(times).map(([name,values])=>[name,{samples:values.length,p50Ms:percentile(values,.5),p95Ms:percentile(values,.95)}]));
  assert.ok(latency.coldLoad.p95Ms<5000); assert.ok(latency.read.p95Ms<750); assert.ok(latency.browserEdit.p95Ms<1500);
  assert.ok(latency.search.p95Ms<50); assert.ok(latency.selection.p95Ms<50);
  const proof={status:"PASS",readSessions:10,interactiveSessions:5,distinctCookiesAndActors:true,independentSelections:true,editConflict:"200 + 409",excludeRestoreConflict:"200 + 409 then explicit retry",singleHandoffReceipt:true,noModuleGlobalBatchState:true,coldLoadMetrics:loaded[0].data.metrics,batchParses:batch.metrics.batchParses,detailParses:batch.metrics.detailParses,latency,bottleneck:"Batch-wide revision fence intentionally conflicts concurrent writes; explicit refresh required. Cold detail requests share one serial parse."};
  await writeFile(process.env.SPORTPALEIS_CONCURRENCY_PROOF ?? join(root,"proof.json"),JSON.stringify(proof,null,2)); console.log(JSON.stringify(proof));
} finally { await browser?.close(); await service.close(); }
