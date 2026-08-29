import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bindMobileNavigationBackdrop, setMobileNavigation, syncMobileNavigationForViewport, toggleMobileNavigation } from "../src/sportpaleis-mobile-navigation.ts";

function navigationFixture() {
  const classes = new Set();
  const attributes = new Map();
  const bodyClasses = new Set();
  let triggerFocusCount = 0;
  let firstLinkFocusCount = 0;
  const classList = (values) => ({
    contains: (name) => values.has(name),
    remove: (name) => values.delete(name),
    toggle(name, force) {
      const active = force === undefined ? !values.has(name) : force;
      if (active) values.add(name); else values.delete(name);
      return active;
    },
  });
  const sidebar = {
    classList: classList(classes),
    querySelector: () => ({ focus: () => { firstLinkFocusCount += 1; } }),
    setAttribute: (name, value) => attributes.set(`sidebar:${name}`, value),
    removeAttribute: (name) => attributes.delete(`sidebar:${name}`),
  };
  const trigger = {
    setAttribute: (name, value) => attributes.set(`trigger:${name}`, value),
    focus: () => { triggerFocusCount += 1; },
  };
  const backdrop = {
    hidden: true,
    setAttribute: (name, value) => attributes.set(`backdrop:${name}`, value),
  };
  const elements = { sidebar, trigger, backdrop, body: { classList: classList(bodyClasses) } };
  return { elements, classes, attributes, bodyClasses, backdrop, focus: () => ({ triggerFocusCount, firstLinkFocusCount }) };
}

test("mobile menu trigger opens and closes the actual sidebar state", () => {
  const { elements, classes, attributes, bodyClasses, backdrop, focus } = navigationFixture();
  assert.equal(toggleMobileNavigation(elements), true);
  assert.equal(classes.has("is-open"), true);
  assert.equal(attributes.get("trigger:aria-expanded"), "true");
  assert.equal(attributes.get("sidebar:aria-hidden"), "false");
  assert.equal(backdrop.hidden, false);
  assert.equal(bodyClasses.has("sp-mobile-nav-open"), true);
  assert.equal(focus().firstLinkFocusCount, 1);

  assert.equal(toggleMobileNavigation(elements), false);
  assert.equal(classes.has("is-open"), false);
  assert.equal(attributes.get("trigger:aria-expanded"), "false");
  assert.equal(attributes.get("sidebar:aria-hidden"), "true");
  assert.equal(backdrop.hidden, true);
  assert.equal(bodyClasses.has("sp-mobile-nav-open"), false);
  assert.equal(focus().triggerFocusCount, 1);
});

test("backdrop, navigation and Escape share one safe close path", () => {
  const { elements, classes, backdrop, focus } = navigationFixture();
  setMobileNavigation(elements, true);
  assert.equal(setMobileNavigation(elements, false), false, "backdrop/Escape close returns closed state");
  assert.equal(classes.has("is-open"), false);
  assert.equal(backdrop.hidden, true);
  assert.equal(focus().triggerFocusCount, 1, "dismiss restores focus to the menu trigger");

  setMobileNavigation(elements, true);
  setMobileNavigation(elements, false, false);
  assert.equal(focus().triggerFocusCount, 1, "navigation auto-close does not steal focus before route render");
});

test("desktop viewport reset never hides or scroll-locks the persistent sidebar", () => {
  const { elements, classes, attributes, bodyClasses } = navigationFixture();
  setMobileNavigation(elements, true);
  syncMobileNavigationForViewport(elements, false);
  assert.equal(classes.has("is-open"), false);
  assert.equal(attributes.has("sidebar:aria-hidden"), false);
  assert.equal(bodyClasses.has("sp-mobile-nav-open"), false);
});

test("exact Human regression: Menu sluiten consumes the pointer sequence before the underlying Bedrukken route", () => {
  const handlers = new Map();
  let dismissed = 0;
  let removed = 0;
  const backdrop = {
    addEventListener: (type, callback) => { handlers.set(type, callback); },
    removeEventListener: (type, callback) => { assert.equal(callback, handlers.get(type)); removed += 1; },
  };
  const cleanup = bindMobileNavigationBackdrop(backdrop, () => { dismissed += 1; });
  const pointer = { button: 0, prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
  handlers.get("pointerdown")(pointer);
  assert.equal(pointer.prevented, false, "pointerdown mag de afsluitende Chrome-click niet onderdrukken");
  assert.equal(pointer.stopped, true, "hit testing may not move to the underlying route during the Human tap");
  assert.equal(dismissed, 0, "de backdrop blijft tot de echte click bestaan zodat Chrome geen nieuw click-target kiest");
  const click = { prevented: false, stopped: false, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; } };
  handlers.get("click")(click);
  assert.equal(click.prevented, true);
  assert.equal(click.stopped, true, "delegated navigation may not observe the dismissal click");
  assert.equal(dismissed, 1);
  cleanup();
  assert.equal(removed, 2);
});

test("390px premium shell makes the toggled sidebar visible and interactive", async () => {
  const [source, styles] = await Promise.all([
    readFile(new URL("../src/sportpaleis-workspace.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/sportpaleis-workspace.css", import.meta.url), "utf8"),
  ]);

  assert.match(source, /data-action="toggle-nav"/u);
  assert.match(source, /data-action="dismiss-nav"/u);
  assert.match(source, /toggleMobileNavigation\(mobileNavigationElements\(\)\)/u);
  assert.match(source, /link\.closest\("\.sp-sidebar"\)[\s\S]*closeMobileNavigation\(false\)/u);
  assert.match(source, /event\.key === "Escape"[\s\S]*closeMobileNavigation\(\)/u);
  assert.match(styles, /@media\(max-width:760px\)[\s\S]*?\.sp-sidebar\{display:flex;width:min\(84vw,252px\);visibility:hidden;pointer-events:none\}\.sp-sidebar\.is-open\{visibility:visible;pointer-events:auto\}/u);
  assert.match(styles, /\.sp-nav-backdrop:not\(\[hidden\]\)[\s\S]*z-index:35/u);
  assert.match(styles, /body\.sp-mobile-nav-open\{overflow:hidden\}/u);
  assert.match(styles, /body\.sp-mobile-nav-open \.sp-mobile-nav\{pointer-events:none\}/u);
});
