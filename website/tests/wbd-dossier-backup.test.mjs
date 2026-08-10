import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  backupToDossierData,
  createWbdBackup,
  parseWbdBackupFile,
  restoreWbdBackup,
  validateWbdBackup,
  WBD_BACKUP_FORMAT,
  WBD_BACKUP_SCHEMA_VERSION,
  WbdBackupError,
} from "../src/wbd-dossier-backup.ts";
import {
  initialOrganizations,
  planDossierMerge,
} from "../src/wbd-dossier-store.ts";

function sampleData() {
  const organizationId = "sportpaleis";
  return {
    organizations: initialOrganizations.map((organization) => ({ ...organization })),
    documents: [
      {
        id: "document-a",
        organizationId,
        title: "Offerte browseracceptatie",
        description: "Eerste bestand",
        documentType: "offerte",
        createdAt: "2026-08-02T19:30:00.000Z",
        originalFileName: "offerte test.txt",
        sizeBytes: 15,
        mimeType: "text/plain",
        file: new Blob(["eerste document"], { type: "text/plain" }),
      },
      {
        id: "document-b",
        organizationId,
        title: "Huisstijl browseracceptatie",
        documentType: "huisstijl",
        createdAt: "2026-08-02T19:31:00.000Z",
        originalFileName: "huisstijl.json",
        sizeBytes: 16,
        mimeType: "application/json",
        file: new Blob(['{"kleur":"goud"}'], { type: "application/json" }),
      },
    ],
    contactNotes: [
      {
        id: "note-a",
        organizationId,
        type: "telefoon",
        title: "Telefonisch akkoord",
        content: "Back-up en restore gecontroleerd.",
        occurredAt: "2026-08-02T19:32:00.000Z",
        contactPerson: "Testpersoon",
        createdAt: "2026-08-02T19:32:00.000Z",
      },
    ],
    timelineEvents: [
      { id: "event-a", organizationId, type: "document_added", occurredAt: "2026-08-02T19:30:00.000Z", description: "Document toegevoegd: Offerte browseracceptatie", source: "handmatig", documentId: "document-a" },
      { id: "event-b", organizationId, type: "document_added", occurredAt: "2026-08-02T19:31:00.000Z", description: "Document toegevoegd: Huisstijl browseracceptatie", source: "handmatig", documentId: "document-b" },
      { id: "event-c", organizationId, type: "contact_note_added", occurredAt: "2026-08-02T19:32:00.000Z", description: "Telefonisch contact geregistreerd: Telefonisch akkoord", source: "handmatig", contactNoteId: "note-a" },
    ],
  };
}

test("genereert een volledig manifest en neemt daadwerkelijke Blob-bestanden mee", async () => {
  const artifact = await createWbdBackup(sampleData(), new Date("2026-08-02T19:30:00.000Z"));
  assert.equal(artifact.backup.manifest.backupFormat, WBD_BACKUP_FORMAT);
  assert.equal(artifact.backup.manifest.schemaVersion, WBD_BACKUP_SCHEMA_VERSION);
  assert.equal(artifact.backup.manifest.exportedAt, "2026-08-02T19:30:00.000Z");
  assert.deepEqual(artifact.backup.manifest.counts, {
    organizations: 4,
    documents: 2,
    contactNotes: 1,
    timelineEvents: 3,
    files: 2,
  });
  assert.match(artifact.fileName, /^wbd-workspace-backup-20260802-1930\.wbd-backup\.json$/);
  assert.equal(artifact.backup.files.length, 2);
  assert.deepEqual(
    artifact.backup.files.map((file) => atob(file.base64)),
    ["eerste document", '{"kleur":"goud"}'],
  );
  assert.ok(artifact.backup.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)));
});

test("weigert export wanneer een verwacht Blob-bestand ontbreekt", async () => {
  const data = sampleData();
  data.documents[0].file = undefined;
  await assert.rejects(
    createWbdBackup(data),
    (error) => error instanceof WbdBackupError && /geen lokaal bestand/.test(error.message),
  );
});

test("controleert schemaversie en verplichte datasets", async () => {
  const artifact = await createWbdBackup(sampleData());
  const wrongVersion = structuredClone(artifact.backup);
  wrongVersion.manifest.schemaVersion = 99;
  const versionValidation = await validateWbdBackup(wrongVersion);
  assert.equal(versionValidation.valid, false);
  assert.match(versionValidation.issues.join(" "), /Schemaversie 99/);

  const missingDataset = structuredClone(artifact.backup);
  delete missingDataset.contactNotes;
  const datasetValidation = await validateWbdBackup(missingDataset);
  assert.equal(datasetValidation.valid, false);
  assert.match(datasetValidation.issues.join(" "), /contactNotes/);
});

test("weigert een back-up met een ontbrekend of beschadigd documentbestand", async () => {
  const artifact = await createWbdBackup(sampleData());
  const missing = structuredClone(artifact.backup);
  missing.files.splice(0, 1);
  missing.manifest.counts.files = 1;
  const missingValidation = await validateWbdBackup(missing);
  assert.equal(missingValidation.valid, false);
  assert.match(missingValidation.issues.join(" "), /daadwerkelijke bestand/);

  const damaged = structuredClone(artifact.backup);
  damaged.files[0].base64 = btoa("beschadigd");
  const damagedValidation = await validateWbdBackup(damaged);
  assert.equal(damagedValidation.valid, false);
  assert.match(damagedValidation.issues.join(" "), /Bestandsgrootte|Bestandscontrole/);
});

test("parseert een geldige import terug naar metadata en Blob-inhoud", async () => {
  const artifact = await createWbdBackup(sampleData());
  const parsed = await parseWbdBackupFile(artifact.blob);
  const restored = backupToDossierData(parsed);
  assert.equal(restored.documents.length, 2);
  assert.equal(await restored.documents[0].file.text(), "eerste document");
  assert.equal(await restored.documents[1].file.text(), '{"kleur":"goud"}');
  assert.equal(restored.contactNotes[0].title, "Telefonisch akkoord");
});

test("plant samenvoegen op stabiele identifiers zonder duplicaten", async () => {
  const data = sampleData();
  const plan = await planDossierMerge(data, structuredClone(data));
  assert.equal(plan.additions.organizations.length, 0);
  assert.equal(plan.additions.documents.length, 0);
  assert.equal(plan.additions.contactNotes.length, 0);
  assert.equal(plan.additions.timelineEvents.length, 0);
  assert.equal(plan.skipped.total, 10);
  assert.equal(plan.conflicts.total, 0);
});

test("meldt conflicten en overschrijft bestaande records niet stilletjes", async () => {
  const existing = sampleData();
  const incoming = sampleData();
  incoming.contactNotes[0].content = "Andere lokale inhoud";
  const plan = await planDossierMerge(existing, incoming);
  assert.equal(plan.conflicts.contactNotes, 1);
  assert.equal(plan.additions.contactNotes.length, 0);
  assert.equal(existing.contactNotes[0].content, "Back-up en restore gecontroleerd.");
});

test("valideert volledig vóór restore zodat een ongeldige import bestaande data behoudt", async () => {
  const artifact = await createWbdBackup(sampleData());
  const invalid = structuredClone(artifact.backup);
  invalid.manifest.schemaVersion = 99;
  const stateBefore = sampleData();
  let restoreCalls = 0;
  const fakeRepository = {
    restoreData: async () => { restoreCalls += 1; throw new Error("mag niet worden aangeroepen"); },
  };
  await assert.rejects(
    restoreWbdBackup(fakeRepository, invalid, "replace"),
    (error) => error instanceof WbdBackupError,
  );
  assert.equal(restoreCalls, 0);
  assert.equal(stateBefore.documents.length, 2);
  assert.equal(await stateBefore.documents[0].file.text(), "eerste document");
});

test("borgt expliciete vervangbevestiging, transactionele restore en public-only routing", async () => {
  const [workspaceSource, storeSource, internalSource, publicSource, viteSource] = await Promise.all([
    readFile(new URL("../src/wbd-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/wbd-dossier-store.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/internal-main.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/main.ts", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
  ]);
  assert.match(workspaceSource, /data-testid="replace-confirmation"/);
  assert.match(workspaceSource, /data-action="confirm-replace"/);
  assert.match(workspaceSource, /restoreWbdBackup\(wbdDossierRepository, backup, mode\)/);
  assert.match(storeSource, /databaseVersion = 2/);
  assert.match(storeSource, /restoreHistory: "restoreHistory"/);
  assert.match(storeSource, /database\.transaction\(Object\.values\(stores\), "readwrite"\)/);
  assert.match(storeSource, /transaction\.objectStore\(storeName\)\.clear\(\)/);
  assert.match(internalSource, /import\("\.\/wbd-workspace"\)/);
  assert.match(viteSource, /pathname\.startsWith\("\/workspace\/wbd\/"\)/);
  assert.doesNotMatch(publicSource, /wbd-dossier-backup|wbd-workspace|workspace\/wbd/);
});
