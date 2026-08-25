import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { SportpaleisFileStore, SportpaleisPilotService } from "../scripts/sportpaleis-pilot-foundation.mjs";

const passwords = { kevin: "History-Kevin-2026!", patrick: "History-Patrick-2026!", collega: "History-Store-2026!", "donovan-support": "History-Support-2026!" };

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), "sportpaleis-bounded-history-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const store = new SportpaleisFileStore({ filePath: path.join(root, "state.json"), backupDirectory: path.join(root, "backups"), seedPasswords: passwords });
  const service = new SportpaleisPilotService({ store, artifactRoot: root, runtimeArtifactRoot: path.join(root, "runtime"), allowedOrigin: "https://workspace.sportpaleis.nl" });
  await service.initialize();
  const admin = await service.login({ email: "kevin@sportpaleis.nl", password: passwords.kevin });
  return { store, service, admin };
}

test("dagelijkse bootstrap blijft bounded bij 2.000 historische PlotJobs; historie blijft zoekbaar en paginable", async (context) => {
  const { store, service, admin } = await fixture(context);
  await store.mutate(async (state) => {
    const base = state.productionJobs[0];
    assert.ok(base, "seed bevat een representatieve immutable PlotJob");
    const baseOrder = state.orders.find((order) => order.deletion?.byUserId !== "system:final-clean-start") ?? state.orders[0];
    const orderId = baseOrder.id;
    state.orders.push(...Array.from({ length: 2_000 }, (_, index) => ({
      ...structuredClone(baseOrder),
      id: `SP-HISTORY-${String(index).padStart(5, "0")}`,
      customer: index === 877 ? "Vindbare Historieklant" : `Historieklant ${index}`,
      stage: "DONE",
      fulfillment: { mode: "PICKUP", status: "PICKED_UP", updatedAt: new Date(Date.UTC(2026, 0, 2, 0, index)).toISOString(), updatedBy: "history-fixture", feeEur: 0, address: null },
      pickup: { status: "PICKED_UP", pickedUpAt: new Date(Date.UTC(2026, 0, 2, 0, index)).toISOString(), pickedUpBy: "history-fixture" },
      revision: 1,
      createdAt: new Date(Date.UTC(2026, 0, 2, 0, index)).toISOString(),
      updatedAt: new Date(Date.UTC(2026, 0, 2, 0, index)).toISOString(),
      eventHistory: [],
      deletion: null,
    })));
    state.productionJobs = Array.from({ length: 2_000 }, (_, index) => {
      const snapshot = { ...structuredClone(base.snapshot), orderIds: [orderId], association: index === 777 ? "Vindbare Historieclub" : base.snapshot.association };
      return {
        ...structuredClone(base),
        id: `history-job-${String(index).padStart(4, "0")}`,
        jobNumber: `PLOT-HISTORY-${String(index).padStart(4, "0")}`,
        createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
        updatedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
        status: "COMPLETED",
        snapshot,
        snapshotHash: createHash("sha256").update(JSON.stringify(snapshot)).digest("hex"),
      };
    });
    return { state, value: null };
  });

  const started = performance.now();
  const bootstrap = await service.bootstrap(admin.token);
  const bootstrapMs = performance.now() - started;
  assert.ok(bootstrap.productionHistory.total >= 2_000);
  assert.equal(bootstrap.productionHistory.bounded, true);
  assert.equal(bootstrap.productionJobs.length, 24);
  assert.equal(bootstrap.orderHistory.bounded, true);
  assert.ok(bootstrap.orderHistory.total >= 2_000);
  assert.ok(bootstrap.orders.length <= 140, `orderbootstrap is niet bounded: ${bootstrap.orders.length}`);
  assert.ok(JSON.stringify(bootstrap.productionJobs).length < JSON.stringify((await store.read()).productionJobs).length / 20);
  assert.ok(JSON.stringify(bootstrap.orders).length < JSON.stringify((await store.read()).orders).length / 10);

  const first = await service.productionJobHistory(admin.token, { limit: 40 });
  assert.equal(first.items.length, 40);
  assert.equal(first.total, bootstrap.productionHistory.total);
  assert.ok(first.nextCursor);
  const second = await service.productionJobHistory(admin.token, { cursor: first.nextCursor, limit: 40 });
  assert.equal(second.items.length, 40);
  assert.equal(new Set([...first.items, ...second.items].map(({ id }) => id)).size, 80);
  const search = await service.productionJobHistory(admin.token, { query: "Vindbare Historieclub" });
  assert.equal(search.total, 1);
  assert.equal(search.items[0].id, "history-job-0777");
  assert.equal((await service.productionJob(admin.token, search.items[0].id)).snapshot.association, "Vindbare Historieclub");
  const orderPage = await service.orderHistory(admin.token, { limit: 40 });
  assert.equal(orderPage.items.length, 40);
  assert.ok(orderPage.nextCursor);
  const orderSearch = await service.orderHistory(admin.token, { query: "Vindbare Historieklant" });
  assert.equal(orderSearch.total, 1);
  assert.equal(orderSearch.items[0].id, "SP-HISTORY-00877");
  assert.equal((await service.order(admin.token, orderSearch.items[0].id)).customer, "Vindbare Historieklant");
  assert.ok(bootstrapMs < 2_500, `bounded bootstrap bleef te traag: ${bootstrapMs.toFixed(1)} ms`);
});
