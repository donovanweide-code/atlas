import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [configSource, shellSource, baseCss, visualCss, workspaceSource, foundationSource] = await Promise.all([
  readFile(new URL("../src/workspace-config.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/workspace-shell.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/styles/workspace-base.css", import.meta.url), "utf8"),
  readFile(new URL("../src/styles/workspace-visual-foundation.css", import.meta.url), "utf8"),
  readFile(new URL("../src/wbd-workspace.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/wbd-foundation.ts", import.meta.url), "utf8"),
]);

test("de mobiele shell heeft vijf zichtbare configureerbare hoofdbestemmingen", () => {
  const mobileConfig = configSource.slice(
    configSource.indexOf("mobileNavigation:", configSource.indexOf("export const wbdWorkspace")),
    configSource.indexOf("mobileMoreNavigation:", configSource.indexOf("export const wbdWorkspace")),
  );
  assert.deepEqual(
    [...mobileConfig.matchAll(/label: "([^"]+)"/g)].map((match) => match[1]),
    ["Home", "Organisaties", "Projecten", "Financiën"],
  );
  assert.match(shellSource, /<span>Meer<\/span>/);
  assert.match(shellSource, /aria-label="Primaire mobiele navigatie"/);
  assert.match(shellSource, /showModal\(\)/);
});

test("de shell gebruikt herbruikbare iconen en een toegankelijke inhoudssprong", () => {
  assert.match(shellSource, /renderWorkspaceIcon\(item\.id/);
  assert.match(shellSource, /workspace-skip-link/);
  assert.match(shellSource, /workspace-mobile-topbar__back/);
  assert.match(workspaceSource, /id="workspace-main-content" tabindex="-1"/);
  assert.doesNotMatch(shellSource, /hardcoded notificatie|unread-count/i);
});

test("Experience toont de Workspace-identiteit zonder een misleidende merklink", () => {
  assert.match(configSource, /export const experienceWorkspace[\s\S]*brandIsInteractive: false/);
  assert.match(shellSource, /data-brand-interactive="false"/);
});

test("de normatieve lichte tokens en responsive grenzen zijn vastgelegd", () => {
  for (const token of [
    "--workspace-background: #f3eee4",
    "--workspace-surface-primary: #fbf8f2",
    "--workspace-navigation-background: #0d2d27",
    "--workspace-gold: #c7a166",
    "--workspace-gold-text: #77511f",
    "--workspace-focus-light: #8a5b13",
  ]) assert.match(baseCss, new RegExp(token));
  assert.match(visualCss, /@media \(max-width: 899px\)/);
  assert.match(visualCss, /@media \(max-width: 359px\)/);
  assert.match(visualCss, /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/);
  assert.match(visualCss, /min-height: 4\.25rem/);
  assert.match(visualCss, /@media \(forced-colors: active\)/);
});

test("Home blijft eerlijk en het dossier toont inhoud vóór invoer", () => {
  assert.match(foundationSource, /Lokale, handmatig vastgelegde projectstatus/);
  assert.doesNotMatch(foundationSource, /Atlas knows|persoonlijk voor jou/i);
  const documentList = workspaceSource.indexOf('class="wbd-document-list"');
  const documentForm = workspaceSource.indexOf('data-form="document"');
  const timelineList = workspaceSource.indexOf('class="wbd-timeline"');
  const noteForm = workspaceSource.indexOf('data-form="contact-note"');
  assert.ok(documentList > -1 && documentList < documentForm);
  assert.ok(timelineList > -1 && timelineList < noteForm);
  assert.equal((workspaceSource.match(/class="workspace-action-disclosure"/g) ?? []).length, 2);
  assert.equal((workspaceSource.match(/workspace-action-disclosure__label/g) ?? []).length, 2);
});
