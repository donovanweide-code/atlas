import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
function mail({ uid, messageId, subject, text, inReplyTo = null, references = [], attachments = [] }) {
  const raw = Buffer.from([`Message-ID: ${messageId}`, `Subject: ${subject}`, "From: klant@example.nl", "To: bedrukking@sportpaleis.nl", "", text].join("\r\n"));
  return {
    folder: "INBOX", uidValidity: "20260903", uid, messageId, inReplyTo, references,
    from: { name: "Klant", address: "klant@example.nl" }, to: [{ name: "Sportpaleis", address: "bedrukking@sportpaleis.nl" }], cc: [], replyTo: null,
    subject, receivedAt: `2026-09-03T0${uid}:00:00.000Z`, text, html: `<p>${text}</p><img src="https://tracker.example/pixel">`,
    attachments: attachments.map((attachment, index) => ({ id: `attachment-${uid}-${index}`, filename: attachment.filename, contentType: attachment.contentType, size: attachment.bytes.length, contentHash: sha256(attachment.bytes), dataBase64: attachment.bytes.toString("base64"), disposition: "attachment" })),
    size: raw.length, rawSha256: sha256(raw), rawDataBase64: raw.toString("base64"),
  };
}

function snapshot(messages) {
  return { status: "SUCCEEDED", mailboxId: "sportpaleis-bedrukking", folder: "INBOX", uidValidity: "20260903", highestUid: Math.max(...messages.map(({ uid }) => uid)), messages };
}


test("30 webshop PDF orders traverse canonical production and pickup lifecycle", async (t) => {
  const fixtureRoot = path.resolve(import.meta.dirname, "fixtures/sportpaleis/webshop-30");
  const bytes = await readFile(path.join(fixtureRoot, "acceptance.pdf"));
  const expected = JSON.parse(await readFile(path.join(fixtureRoot, "expected.json"), "utf8"));
  const root = await mkdtemp(path.join(tmpdir(), "spw-30-production-"));
  const config = { filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: { kevin: "Acceptance-Admin-2026!", patrick: "Acceptance-Operator-2026!", collega: "Acceptance-Store-2026!", "donovan-support": "Acceptance-Support-2026!" } };
  const store = new SportpaleisFileStore(config);
  const service = new SportpaleisPilotService({ store, artifactRoot: path.resolve(import.meta.dirname, ".."), runtimeArtifactRoot: path.join(root, "runtime"), mailboxConfiguration: { configured: true } });
  await service.initialize();
  const actor = await service.login({ email: "kevin@sportpaleis.nl", password: config.seedPasswords.kevin });
  const source = mail({ uid: 1, messageId: "<30-fixture@example.invalid>", subject: "Webshop acceptance", text: "Software acceptance only", attachments: [{ filename: "acceptance.pdf", contentType: "application/pdf", bytes }] });
  const start = performance.now();
  await service.ingestSportpaleisMailboxSnapshot(snapshot([source]));
  const parseMs = performance.now()-start;
  const staged = (await store.read()).webshopIntake.matches;
  assert.equal(staged.length, 30);
  console.log("staged",JSON.stringify(staged.filter((m)=>m.reviewReasons.length).map((m)=>[m.externalReference,m.reviewReasons])));
  const ids=[];const creationStart=performance.now();
  for (const match of staged) {
    const preview = await service.webshopPdfOrder(actor.token,actor.csrfToken,{matchId:match.id,action:"preview"});
    const result = await service.webshopPdfOrder(actor.token,actor.csrfToken,{matchId:match.id,action:"accept",expectedReviewHash:preview.reviewHash});
    const wanted=expected.find((o)=>o.externalReference===match.externalReference);
    assert.deepEqual(result.value.items.map((i)=>[i.articleNumber,i.size,i.quantity]),wanted.items.map((i)=>[i.sku,i.size,i.quantity]));
    assert.equal(result.value.productionStatus,"READY");
    for(const item of wanted.items) for(const [,value] of item.personalization) assert.ok(result.value.productionLines.some((line)=>line.content===value),`Missing personalization ${value}`);
    for(const item of result.value.items) for(const variant of item.variants) if(variant.personalizationValues.backNumber) assert.equal(variant.personalizationValues.backNumberSizeClass, /^\d+$/u.test(item.size)?"JUNIOR":"SENIOR");
    ids.push(result.value.id);
    if(ids.length%10===0) console.log("created",ids.length);
  }
  const creationMs=performance.now()-creationStart;
  const details=[];
  await Promise.all(Array.from({length:10},async()=>{for(const id of ids){const start=performance.now();await service.order(actor.token,id);details.push(performance.now()-start);}}));
  details.sort((a,b)=>a-b);
  const orders=(await service.bootstrap(actor.token)).orders.filter((o)=>ids.includes(o.id));
  const lineColor=(order,line)=>line.foilColor ?? order.items.find((item)=>item.id===line.itemId)?.foilColor;
  const colors=[...new Set(orders.flatMap((o)=>o.productionLines.map((l)=>lineColor(o,l))))];
  console.log("colors",colors);
  for(const color of colors){
    const current=(await service.bootstrap(actor.token)).orders.filter((o)=>ids.includes(o.id)&&o.productionLines.some((l)=>lineColor(o,l)===color));
    const result=await service.prepareCurrentProductionGroup(actor.token,actor.csrfToken,{orders:current.map((o)=>({id:o.id,expectedRevision:o.revision})),foilColor:color},`30-prepare-${color}`);
    const job=result.value.job;
    assert.ok(job.snapshot.layout.closedContourCount>0);
    assert.equal(job.snapshot.productionGroup.foilColor,color);
    assert.deepEqual([...job.snapshot.orderIds].sort(), current.map((order)=>order.id).sort());
    assert.ok(job.snapshot.orderIds.every((id)=>ids.includes(id)));
    await service.completeProductionJob(actor.token,actor.csrfToken,job.id,`30-complete-${color}`);
    const remainingColors = colors.slice(colors.indexOf(color)+1);
    const afterColor = (await service.bootstrap(actor.token)).orders.filter((order)=>ids.includes(order.id));
    for (const order of afterColor.filter((order)=>order.productionLines.some((line)=>remainingColors.includes(lineColor(order,line))))) {
      assert.notEqual(order.productionClosure.status,"ELIGIBLE", "Completing one color must leave other colors open");
      assert.notEqual(order.fulfillment.status,"READY_FOR_PICKUP");
    }
    const retry=await service.completeProductionJob(actor.token,actor.csrfToken,job.id,`30-complete-${color}`);
    assert.ok(retry);
    console.log("completed",color,job.id);
  }
  const printed=(await service.bootstrap(actor.token)).orders.filter((o)=>ids.includes(o.id));
  const ready=await service.completeProductionOrders(actor.token,actor.csrfToken,{orders:printed.map((o)=>({id:o.id,expectedRevision:o.revision}))},"webshop-30-ready");
  assert.equal(ready.value.completed.length,30,JSON.stringify(ready.value.skipped));
  for(const order of ready.value.completed){
    assert.equal(order.fulfillment.status,"READY_FOR_PICKUP");
    const picked=await service.recordOperationalEvent(actor.token,actor.csrfToken,order.id,{action:"PICKED_UP",expectedRevision:order.revision},`30-picked-${order.id}`);
    assert.equal(picked.value.pickup.status,"PICKED_UP");
  }
  await service.ingestSportpaleisMailboxSnapshot(snapshot([source]));
  const final=await store.read();
  assert.equal(final.orders.filter((o)=>ids.includes(o.id)).length,30);
  assert.equal(final.webshopIntake.matches.length,30);
  const completedOrder=await service.order(actor.token,ids[0]);
  await service.deleteOrder(actor.token,actor.csrfToken,completedOrder.id,{expectedRevision:completedOrder.revision});
  await service.ingestSportpaleisMailboxSnapshot(snapshot([source]));
  const deletedMatch=(await store.read()).webshopIntake.matches.find((match)=>match.orderId===completedOrder.id);
  assert.equal(deletedMatch.status,"DELETED");
  await assert.rejects(service.webshopPdfOrder(actor.token,actor.csrfToken,{matchId:deletedMatch.id,action:"preview"}),{code:"WEBSHOP_ORDER_DELETED"});
  const deletedOrder=await service.order(actor.token,completedOrder.id);
  await assert.rejects(service.restoreOrder(actor.token,actor.csrfToken,deletedOrder.id,{expectedRevision:deletedOrder.revision}),{code:"ORDER_RESTORE_NOT_ALLOWED"});
  const proof={orders:30,items:orders.reduce((n,o)=>n+o.items.length,0),colors,parseMs,creationMs,ordersPerMinute:30/creationMs*60000,detailP50:details[Math.floor(details.length*.5)],detailP95:details[Math.floor(details.length*.95)],ids,storage:{duplicatePdf:0,fullText:0,fullOrderArchive:0},physicalOutput:false,blueRuleAvailable:colors.includes("Blauw"),root};
  await writeFile(process.env.SPORTPALEIS_30_PROOF || path.join(root,"proof.json"),JSON.stringify(proof,null,2));
  console.log(JSON.stringify(proof));
});
