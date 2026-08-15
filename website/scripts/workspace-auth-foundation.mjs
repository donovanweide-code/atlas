import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const SCRYPT_OPTIONS = Object.freeze({ N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

export function safeEqualHex(left, right) {
  if (typeof left !== "string" || typeof right !== "string" || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export async function createWorkspacePasswordRecord(password) {
  if (typeof password !== "string" || password.length < 12) {
    throw new Error("Workspace-wachtwoorden moeten minimaal 12 tekens bevatten.");
  }
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64, SCRYPT_OPTIONS);
  return { algorithm: "scrypt", salt, hash: Buffer.from(derived).toString("hex"), ...SCRYPT_OPTIONS };
}

export function isWorkspacePasswordRecord(record) {
  return Boolean(record
    && record.algorithm === "scrypt"
    && /^[a-f0-9]{32}$/u.test(String(record.salt ?? ""))
    && /^[a-f0-9]{128}$/u.test(String(record.hash ?? ""))
    && record.N === SCRYPT_OPTIONS.N
    && record.r === SCRYPT_OPTIONS.r
    && record.p === SCRYPT_OPTIONS.p);
}

export async function verifyWorkspacePassword(password, record) {
  if (!isWorkspacePasswordRecord(record)) return false;
  const derived = await scrypt(String(password ?? ""), record.salt, 64, {
    N: record.N,
    r: record.r,
    p: record.p,
    maxmem: SCRYPT_OPTIONS.maxmem,
  });
  return safeEqualHex(Buffer.from(derived).toString("hex"), record.hash);
}
