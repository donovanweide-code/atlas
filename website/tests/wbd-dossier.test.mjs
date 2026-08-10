import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  initialOrganizations,
  newestFirst,
} from "../src/wbd-dossier-store.ts";
import { getWbdNavigationItem } from "../src/workspace-config.ts";

test("levert vier vaste lokale organisaties met stabiele dossier-id's", () => {
  assert.deepEqual(
    initialOrganizations.map(({ id, name }) => [id, name]),
    [
      ["we-build-and-design", "We Build And Design"],
      ["sportpaleis", "Sport 2000 Sportpaleis B.V."],
      ["bij-cees", "Bij Cees"],
      ["aquaflask", "AquaFlask"],
    ],
  );
  assert.equal(new Set(initialOrganizations.map(({ id }) => id)).size, 4);
  assert.equal(initialOrganizations.find(({ id }) => id === "sportpaleis").type, "ontwikkelpartner");
  for (const organization of initialOrganizations) {
    assert.ok(organization.type);
    assert.ok(organization.description);
    assert.ok(Date.parse(organization.createdAt));
    assert.ok(Date.parse(organization.updatedAt));
  }
});

test("sorteert tijdlijngebeurtenissen nieuwste bovenaan zonder invoer te muteren", () => {
  const events = [
    { id: "oud", occurredAt: "2026-08-02T08:00:00.000Z" },
    { id: "nieuw", occurredAt: "2026-08-02T10:00:00.000Z" },
  ];
  const sorted = newestFirst(events);
  assert.deepEqual(sorted.map(({ id }) => id), ["nieuw", "oud"]);
  assert.deepEqual(events.map(({ id }) => id), ["oud", "nieuw"]);
});

test("houdt de organisaties-navigatie actief op een detailroute", () => {
  assert.equal(
    getWbdNavigationItem("/workspace/wbd/organisaties/sportpaleis").id,
    "organisaties",
  );
});

test("dossieropslag en interface bevatten de afgesproken lokale grenzen", async () => {
  const [storeSource, workspaceSource, internalSource, publicSource] = await Promise.all([
    readFile(new URL("../src/wbd-dossier-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/internal-main.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/main.ts", import.meta.url), "utf8"),
  ]);

  for (const storeName of ["organizations", "documents", "contactNotes", "timelineEvents"]) {
    assert.match(storeSource, new RegExp(`${storeName}: "${storeName}"`));
  }
  assert.match(storeSource, /indexedDB\.open\(databaseName, databaseVersion\)/);
  assert.match(storeSource, /file: Blob/);
  assert.match(storeSource, /source: "handmatig"/);
  assert.match(storeSource, /type: "document_removed"/);
  assert.match(workspaceSource, /<dialog class="wbd-confirmation"/);
  assert.match(workspaceSource, /data-action="confirm-delete"/);
  assert.match(workspaceSource, /Open of download/);
  assert.match(internalSource, /import\("\.\/wbd-workspace"\)/);
  assert.doesNotMatch(publicSource, /wbd-workspace|wbd-dossier-store|workspace\/wbd/);
});
