import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { toggleMobileNavigation } from "../src/sportpaleis-mobile-navigation.ts";

test("mobile menu trigger opens and closes the actual sidebar state", () => {
  const classes = new Set();
  const attributes = new Map();
  const sidebar = {
    classList: {
      toggle(name) {
        if (classes.has(name)) {
          classes.delete(name);
          return false;
        }
        classes.add(name);
        return true;
      },
    },
  };
  const trigger = { setAttribute: (name, value) => attributes.set(name, value) };

  assert.equal(toggleMobileNavigation(sidebar, trigger), true);
  assert.equal(classes.has("is-open"), true);
  assert.equal(attributes.get("aria-expanded"), "true");

  assert.equal(toggleMobileNavigation(sidebar, trigger), false);
  assert.equal(classes.has("is-open"), false);
  assert.equal(attributes.get("aria-expanded"), "false");
});

test("390px premium shell makes the toggled sidebar visible and interactive", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /data-action="toggle-nav"/u);
  assert.match(source, /toggleMobileNavigation\(app\.querySelector<HTMLElement>\("\.sp-sidebar"\), button\)/u);
  assert.match(styles, /@media\(max-width:760px\)[\s\S]*?\.sp-sidebar\{display:flex;width:min\(84vw,252px\);visibility:hidden;pointer-events:none\}\.sp-sidebar\.is-open\{visibility:visible;pointer-events:auto\}/u);
});
