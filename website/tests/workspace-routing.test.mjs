import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  resolveWbdWorkspaceRoute,
  wbdWorkspaceRoutes,
  workspaceDocumentTitle,
  WBD_WORKSPACE_BOUNDARY,
  WBD_WORKSPACE_HOME,
} from "../src/workspace-routes.ts";
import { getWbdNavigationItem } from "../src/workspace-config.ts";
import {
  isKnownWorkspaceRoute,
  isWorkspaceBoundaryPath,
} from "../scripts/workspace-runtime.mjs";

const sampleParams = {
  organizationId: "sportpaleis",
  invoiceId: "factuur-001",
  proposalId: "voorstel-001",
};

function concretePath(template) {
  return template.replace(/:([A-Za-z][A-Za-z0-9]*)/g, (_match, name) => encodeURIComponent(sampleParams[name]));
}

test("iedere canonieke WBD-route resolveert expliciet in browser en Node-runtime", () => {
  for (const definition of wbdWorkspaceRoutes) {
    const path = concretePath(definition.path);
    const resolved = resolveWbdWorkspaceRoute(path);
    assert.equal(resolved.status, "matched", path);
    assert.equal(resolved.definition?.id, definition.id, path);
    assert.equal(resolved.canonicalPath, path, path);
    assert.equal(isKnownWorkspaceRoute(path), true, path);
  }
});

test("aliases canonicaliseren zonder schermidentiteit uit clickstate of storage", () => {
  assert.deepEqual(
    resolveWbdWorkspaceRoute(WBD_WORKSPACE_BOUNDARY),
    {
      status: "matched",
      requestedPath: WBD_WORKSPACE_BOUNDARY,
      canonicalPath: WBD_WORKSPACE_HOME,
      redirectTo: WBD_WORKSPACE_HOME,
      definition: wbdWorkspaceRoutes[0],
      params: {},
    },
  );
  assert.equal(
    resolveWbdWorkspaceRoute("/workspace/wbd/ontwikkeling").redirectTo,
    "/workspace/wbd/ontwikkeling/monitor",
  );
});

test("unknown en malformed routes blijven expliciet fout en renderen niet als Home", () => {
  assert.equal(resolveWbdWorkspaceRoute("/workspace/wbd/onbekend").status, "not-found");
  assert.equal(resolveWbdWorkspaceRoute("/workspace/wbd/communicatie").status, "not-found");
  assert.equal(resolveWbdWorkspaceRoute("/workspace/wbd/organisaties/%E0%A4%A").status, "parse-error");
  assert.equal(getWbdNavigationItem("/workspace/wbd/onbekend"), undefined);
  assert.equal(isWorkspaceBoundaryPath("/workspace/wbd/onbekend"), true);
  assert.equal(isKnownWorkspaceRoute("/workspace/wbd/onbekend"), false);
});

test("de dagelijkse en beheer-Webshoproutes zijn expliciete HTTP 200-routes", () => {
  assert.equal(isKnownWorkspaceRoute("/workspace/sportpaleis/webshop"), true);
  assert.equal(isKnownWorkspaceRoute("/workspace/sportpaleis/beheer/webshop"), true);
});

test("organisatie- en focusroutes dragen stabiele context en actieve Organisaties-state", () => {
  for (const path of [
    "/workspace/wbd/organisaties/sportpaleis",
    "/workspace/wbd/organisaties/sportpaleis/documenten",
    "/workspace/wbd/organisaties/sportpaleis/documenten/nieuw",
    "/workspace/wbd/organisaties/sportpaleis/notities/nieuw",
  ]) {
    const resolved = resolveWbdWorkspaceRoute(path);
    assert.equal(resolved.status, "matched");
    assert.equal(resolved.params.organizationId, "sportpaleis");
    assert.equal(resolved.definition?.organizationContext, true);
    assert.equal(getWbdNavigationItem(path)?.id, "organisaties");
  }
  assert.equal(resolveWbdWorkspaceRoute("/workspace/wbd/organisaties/sportpaleis/documenten/nieuw").definition?.focus, true);
});

test("page titles en browserhistorie hebben één route-driven contract", async () => {
  assert.equal(workspaceDocumentTitle("Sport 2000 Sportpaleis B.V."), "Sport 2000 Sportpaleis B.V. — WBD Workspace");
  const source = await readFile(new URL("../src/wbd-workspace.ts", import.meta.url), "utf8");
  assert.match(source, /window\.addEventListener\("popstate", renderCurrentRoute\)/);
  assert.match(source, /data-route-status="not-found"/);
  assert.match(source, /Annuleren en terug/);
  assert.doesNotMatch(source, /localStorage|sessionStorage/);
});

test("public, Experience, WBD-owner en Sportpaleis entrypoints blijven afzonderlijk", async () => {
  const [workspaceEntry, sportpaleisEntry, publicEntry, experienceEntry, workspaceBuild] = await Promise.all([
    readFile(new URL("../src/wbd-owner-main.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/sportpaleis-main.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/main.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/experience-validation-main.ts", import.meta.url), "utf8"),
    readFile(new URL("../vite.workspace.config.ts", import.meta.url), "utf8"),
  ]);
  assert.match(workspaceEntry, /mountWbdOwnerWorkspace/);
  assert.match(sportpaleisEntry, /mountSportpaleisWorkspaceApplication/);
  assert.doesNotMatch(workspaceEntry, /wbd-workspace|sportpaleis-workspace|experience-validation-main|atlas-workspace/);
  assert.doesNotMatch(sportpaleisEntry, /wbd-owner/);
  assert.doesNotMatch(publicEntry, /wbd-owner-main|sportpaleis-main/);
  assert.doesNotMatch(experienceEntry, /wbd-owner-main|sportpaleis-main/);
  assert.match(workspaceBuild, /publicDir: false/);
  assert.match(workspaceBuild, /dist-workspace/);
});
