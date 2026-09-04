import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

const LOCAL_STATIC_SPECIFIERS = [
  /(?:import|export)\s+(?:type\s+)?(?:[^;"']*?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']/gu,
  /import\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/gu,
  /new\s+URL\s*\(\s*["'](\.{1,2}\/[^"']+\.(?:[cm]?[jt]s|mts|cts))["']\s*,\s*import\.meta\.url\s*\)/gu,
];
const RUNTIME_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".cts", ".json"]);

function within(root, candidate) {
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function localSpecifiers(source) {
  const found = new Set();
  for (const pattern of LOCAL_STATIC_SPECIFIERS) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) found.add(match[1]);
  }
  return [...found].sort();
}

export async function collectRuntimeDependencyGraph({ websiteRoot, entrypoints, allowedRoots }) {
  const canonicalWebsiteRoot = await realpath(websiteRoot);
  const canonicalAllowedRoots = await Promise.all(allowedRoots.map((root) => realpath(root)));
  const queue = [...entrypoints];
  const visited = new Map();

  while (queue.length) {
    const requested = path.resolve(queue.shift());
    const canonical = await realpath(requested).catch(() => {
      throw new Error(`Runtime-import ontbreekt: ${requested}`);
    });
    if (!canonicalAllowedRoots.some((root) => within(root, canonical))) {
      throw new Error(`Runtime-import valt buiten de gecontroleerde releasegrens: ${canonical}`);
    }
    if (!within(canonicalWebsiteRoot, canonical)) {
      throw new Error(`Runtime-import valt buiten websiteRoot: ${canonical}`);
    }
    if (!RUNTIME_EXTENSIONS.has(path.extname(canonical))) {
      throw new Error(`Runtime-import gebruikt een niet-toegestane extensie: ${canonical}`);
    }
    if (visited.has(canonical)) continue;
    const details = await stat(canonical);
    if (!details.isFile()) throw new Error(`Runtime-import is geen bestand: ${canonical}`);
    const source = await readFile(canonical, "utf8");
    const archive = `app/${path.relative(canonicalWebsiteRoot, canonical).split(path.sep).join("/")}`;
    visited.set(canonical, { absolute: canonical, archive });
    for (const specifier of localSpecifiers(source)) queue.push(path.resolve(path.dirname(canonical), specifier));
  }

  return [...visited.values()].sort((left, right) => left.archive.localeCompare(right.archive));
}
