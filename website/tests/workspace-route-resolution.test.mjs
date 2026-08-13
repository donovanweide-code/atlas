import assert from "node:assert/strict";
import test from "node:test";
import { resolveWorkspaceApplication } from "../src/workspace-route-resolution.ts";

test("de dedicated Sportpaleis-host resolveert root en korte routes naar Sportpaleis", () => {
  assert.equal(resolveWorkspaceApplication({ hostname: "workspace.sportpaleis.nl", pathname: "/" }), "sportpaleis");
  assert.equal(resolveWorkspaceApplication({ hostname: "workspace.sportpaleis.nl", pathname: "/overzicht" }), "sportpaleis");
});

test("de bestaande lange Sportpaleis-route blijft hostonafhankelijk werken", () => {
  assert.equal(resolveWorkspaceApplication({ hostname: "127.0.0.1", pathname: "/workspace/sportpaleis/overzicht" }), "sportpaleis");
});

test("andere hosts en Workspace-routes worden niet stil Sportpaleis", () => {
  assert.equal(resolveWorkspaceApplication({ hostname: "workspace.webuildanddesign.nl", pathname: "/workspace/wbd/overzicht" }), "wbd");
  assert.equal(resolveWorkspaceApplication({ hostname: "127.0.0.1", pathname: "/onbekend" }), "wbd");
});

test("een onbekende route op de dedicated host blijft binnen de Sportpaleis-appgrens voor haar fail-closed 404", () => {
  assert.equal(resolveWorkspaceApplication({ hostname: "workspace.sportpaleis.nl", pathname: "/onbekend" }), "sportpaleis");
});
