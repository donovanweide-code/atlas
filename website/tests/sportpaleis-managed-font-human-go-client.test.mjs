import assert from "node:assert/strict";
import test from "node:test";

import { exactManagedFontForLine, managedFontIdentity } from "../src/sportpaleis/managed-font-client-gate.ts";

const hash = "A".repeat(64);
const font = {
  id: "font-managed-a",
  name: "Schluber",
  originalFilename: "Schluber.ttf",
  version: "AAAAAAAAAAAA",
  sha256: hash,
  mimeType: "font/ttf",
  sizeBytes: 1024,
  addedAt: "2026-08-13T00:00:00.000Z",
  uploadedBy: { userId: "admin", name: "Beheer" },
  provenance: "Technisch beheerde testbron",
  status: "TECHNICALLY_VALID",
  allowedInStore: true,
  sourceUrl: "/api/sportpaleis/v1/production-fonts/font-managed-a/source",
};
const line = {
  source: { kind: "FONT", id: font.id, version: font.version, sha256: font.sha256 },
  validation: { status: "VALID", reason: null },
};

test("managed FONT clientgate accepteert uitsluitend exacte technisch geldige identiteit", () => {
  assert.equal(exactManagedFontForLine([font], line), font);
  assert.equal(managedFontIdentity(font), `font-managed-a@AAAAAAAAAAAA#${hash}`);
  assert.equal(exactManagedFontForLine([{ ...font, name: "Spain Euro 2016" }], line)?.id, font.id);
  assert.equal(exactManagedFontForLine([{ ...font, name: "Liberation Sans" }], line)?.id, font.id);
});

test("managed FONT clientgate blijft fail-closed bij onbekend, ongeldig of afwijkend font", () => {
  assert.equal(exactManagedFontForLine([], line), null);
  assert.equal(exactManagedFontForLine([{ ...font, status: "INACTIVE" }], line), null);
  assert.equal(exactManagedFontForLine([font], { ...line, source: { ...line.source, version: "ANDERS" } }), null);
  assert.equal(exactManagedFontForLine([font], { ...line, source: { ...line.source, sha256: "B".repeat(64) } }), null);
  assert.equal(exactManagedFontForLine([font], { ...line, source: { ...line.source, sha256: "ongeldig" } }), null);
  assert.equal(exactManagedFontForLine([font], { ...line, validation: { status: "BLOCKED", reason: "ongeldig" } }), null);
  assert.equal(exactManagedFontForLine([font], { ...line, source: { kind: "PROFILE", id: "profile", version: "1" } }), null);
});
