import { copyFile, mkdir, open, readFile, rename } from "node:fs/promises";
import { constants } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, createAuditEvent, verifyAuditChain } from "./release-engine-core.mjs";

const safePart = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const shaPattern = /^[a-f0-9]{64}$/u;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

function eventHash(event) {
  const { eventHash: _ignored, ...unsigned } = event;
  return sha256(canonicalJson(unsigned));
}

function legacyUndefinedHash(event) {
  const { eventHash: _ignored, ...unsigned } = structuredClone(event);
  unsigned.details ??= {};
  unsigned.details.activeRelease = undefined;
  unsigned.details.metadata ??= {};
  unsigned.details.metadata.errno = undefined;
  unsigned.details.metadata.sqlState = undefined;
  return sha256(canonicalJson(unsigned));
}

export async function recoverLegacyUndefinedAuditChain({ stateRoot, tenant, application, releaseId, expectedFileSha256, at = new Date().toISOString() }) {
  for (const value of [tenant, application, releaseId]) if (!safePart.test(value)) throw new Error("Ongeldige audit recovery identity.");
  if (!shaPattern.test(expectedFileSha256)) throw new Error("Ongeldige audit recovery checksum.");
  const root = path.resolve(stateRoot);
  const name = `${tenant}--${application}--${releaseId}.jsonl`;
  const file = path.join(root, "events", name);
  if (!file.startsWith(`${root}${path.sep}`)) throw new Error("Audit recovery pad verlaat state root.");
  const original = await readFile(file);
  const events = original.toString("utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
  const backupDirectory = path.join(root, "audit-recovery");
  const backup = path.join(backupDirectory, `${name}.${expectedFileSha256}.original`);
  if (sha256(original) !== expectedFileSha256) {
    verifyAuditChain(events);
    const recovery = [...events].reverse().find((event) => event.type === "audit_chain_recovered" && event.details?.originalFileSha256 === expectedFileSha256);
    const preserved = await readFile(backup).catch(() => null);
    if (recovery?.type !== "audit_chain_recovered" || recovery.details?.originalFileSha256 !== expectedFileSha256 || !preserved || sha256(preserved) !== expectedFileSha256) throw new Error("Audit recovery source checksum wijkt af.");
    return { status: "PASS", releaseId, originalFileSha256: expectedFileSha256, repairedEvents: recovery.details.repairedEvents, recoveryEventHash: recovery.eventHash, backup: path.basename(backup), idempotent: true };
  }
  let previous = null;
  let repairedEvents = 0;
  for (const event of events) {
    if (event.sequence !== Number(previous?.sequence ?? 0) + 1 || event.previousHash !== (previous?.eventHash ?? null)) throw new Error("Audit recovery weigert sequence/link drift.");
    if (eventHash(event) !== event.eventHash) {
      if (legacyUndefinedHash(event) !== event.eventHash) throw new Error("Audit recovery oorzaak wijkt af van bewezen legacy undefined-serialisatie.");
      repairedEvents += 1;
    }
    previous = event;
  }
  if (!repairedEvents) throw new Error("Audit recovery bron bevat geen bewezen legacy mismatch.");
  const repaired = [];
  for (const event of events) {
    const normalized = { ...event, previousHash: repaired.at(-1)?.eventHash ?? null };
    delete normalized.eventHash;
    repaired.push({ ...normalized, eventHash: sha256(canonicalJson(normalized)) });
  }
  await mkdir(backupDirectory, { recursive: true, mode: 0o750 });
  await copyFile(file, backup, constants.COPYFILE_EXCL);
  const recovery = createAuditEvent({
    previous: repaired.at(-1), state: repaired.at(-1).state, type: "audit_chain_recovered",
    releaseId, tenant, application, actor: "wbd-release-recovery",
    idempotencyKey: `audit-recovery-${expectedFileSha256.slice(0, 24)}`, at,
    details: { cause: "LEGACY_UNDEFINED_JSON_SERIALIZATION", originalFileSha256: expectedFileSha256, repairedEvents, preservedBackup: path.basename(backup) },
  });
  repaired.push(recovery);
  verifyAuditChain(repaired);
  const temporary = `${file}.${process.pid}.recovery`;
  const handle = await open(temporary, "wx", 0o640);
  try {
    await handle.writeFile(`${repaired.map((event) => JSON.stringify(event)).join("\n")}\n`, "utf8");
    await handle.sync();
  } finally { await handle.close(); }
  await rename(temporary, file);
  return { status: "PASS", releaseId, originalFileSha256: expectedFileSha256, repairedEvents, recoveryEventHash: recovery.eventHash, backup: path.basename(backup) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [stateRoot, tenant, application, releaseId, expectedFileSha256] = process.argv.slice(2);
  recoverLegacyUndefinedAuditChain({ stateRoot, tenant, application, releaseId, expectedFileSha256 })
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => { process.stderr.write(`${JSON.stringify({ status: "BLOCKED", code: "AUDIT_RECOVERY_FAILED", message: String(error?.message ?? error).slice(0, 1000) })}\n`); process.exitCode = 1; });
}
