import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { isMobileWorkContextDevice } from "../src/wbd-owner.ts";

const windowsTouchDesktopUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const iphoneSafariUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1";

test("owner bridge is expliciet tijdelijk, lokaal en bereikbaar vanuit beide owner-routes", async () => {
  const source = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  for (const marker of [
    "Capabilities",
    "Bestaande werkcontext",
    "Tijdelijke continuïteitsbrug",
    "http://127.0.0.1:5173/workspace/wbd/overzicht",
    "Niet beschikbaar op iPhone",
    "Terug naar Capabilities",
    "geen eindarchitectuur",
  ]) assert.match(source, new RegExp(marker, "u"));
  assert.match(source, /target="_blank" rel="noopener noreferrer"/u);
  assert.match(source, /aria-current=/u);
});

test("bridge publiceert de legacy workspace niet en raakt browserdata niet", async () => {
  const owner = await readFile(new URL("../src/wbd-owner.ts", import.meta.url), "utf8");
  const entry = await readFile(new URL("../src/wbd-owner-main.ts", import.meta.url), "utf8");
  const buildConfig = await readFile(new URL("../vite.workspace.config.ts", import.meta.url), "utf8");
  assert.doesNotMatch(owner + entry, /workspace-main|wbd-workspace|indexedDB|deleteDatabase|localStorage/u);
  assert.doesNotMatch(buildConfig, /workspace-main|internal-main/u);
});

test("desktop krijgt de lokale actie en mobiel uitsluitend de eerlijke grensmelding", async () => {
  const css = await readFile(new URL("../src/styles/wbd-owner.css", import.meta.url), "utf8");
  assert.match(css, /\.wbd-workcontext__desktop \{ display:grid;/u);
  assert.match(css, /\.wbd-workcontext__mobile \{ display:none;/u);
  assert.match(css, /\[data-mobile-device="true"\] \.wbd-workcontext__desktop \{ display:none; \}/u);
  assert.match(css, /\[data-mobile-device="true"\] \.wbd-workcontext__mobile \{ display:block; \}/u);
  assert.doesNotMatch(css, /hover\s*:|pointer\s*:/iu);
});

test("Windows-touchdesktop blijft desktop, onafhankelijk van touch- of pointercapaciteit", () => {
  assert.equal(isMobileWorkContextDevice({
    userAgent: windowsTouchDesktopUserAgent,
    userAgentData: { mobile: false },
  }), false);
});

test("iPhone Safari blijft mobiel in portrait en landscape", () => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    assert.equal(isMobileWorkContextDevice({ userAgent: iphoneSafariUserAgent }), true, JSON.stringify(viewport));
  }
});

test("onbekende desktop blijft standaard desktop", () => {
  assert.equal(isMobileWorkContextDevice({ userAgent: "Unknown Desktop Browser" }), false);
});

test("userAgentData.mobile heeft voorrang op de beperkte Safari-fallback", () => {
  assert.equal(isMobileWorkContextDevice({ userAgent: "Unknown", userAgentData: { mobile: true } }), true);
  assert.equal(isMobileWorkContextDevice({ userAgent: iphoneSafariUserAgent, userAgentData: { mobile: false } }), false);
});
