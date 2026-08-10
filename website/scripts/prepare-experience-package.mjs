import { cp, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = fileURLToPath(new URL("..", import.meta.url));
const dist = path.join(websiteRoot, "dist-experience");

await rename(path.join(dist, "experience.html"), path.join(dist, "index.html"));
await writeFile(path.join(dist, "first-visit-v2.html"), [
  "<!doctype html>",
  '<html lang="nl">',
  "  <head>",
  '    <meta charset="UTF-8">',
  '    <meta name="viewport" content="width=device-width, initial-scale=1.0">',
  '    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">',
  '    <meta name="theme-color" content="#071216">',
  '    <link rel="icon" type="image/svg+xml" href="/favicon.svg">',
  '    <link rel="shortcut icon" href="/favicon.ico">',
  '    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
  '    <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#071216">',
  '    <meta http-equiv="refresh" content="0;url=/ervaar">',
  '    <link rel="canonical" href="https://experience.webuildanddesign.nl/ervaar/">',
  "    <title>Experience — We Build And Design</title>",
  "  </head>",
  '  <body><p>De Experience is verhuisd naar <a href="/ervaar">/ervaar</a>.</p></body>',
  "</html>",
  "",
].join("\n"), "utf8");
await mkdir(path.join(dist, "api"), { recursive: true });
await cp(path.join(websiteRoot, "experience-server", "api"), path.join(dist, "api"), { recursive: true });
await cp(path.join(websiteRoot, "experience-server", "private", "atlas-runtime.php"), path.join(dist, "api", "atlas-runtime.php"));
await cp(path.join(websiteRoot, "experience-server", "private", "first-visit.php"), path.join(dist, "api", "first-visit.php"));
await cp(path.join(websiteRoot, "context-first-sources", "webuildanddesign.nl.snapshot.json"), path.join(dist, "api", "first-visit-snapshot.json"));

const indexPath = path.join(dist, "index.html");
const html = await readFile(indexPath, "utf8");
if (!html.includes("noindex, nofollow, noarchive") || !html.includes("assets/experience-")) {
  throw new Error("Experience-build mist de afgeschermde entrypoint- of noindexgrens.");
}
await writeFile(path.join(dist, "BUILD-BOUNDARY.txt"), [
  "Experience Validation Environment v1",
  "Afzonderlijke build; niet voor de publieke WBD-documentroot.",
  "Serverconfiguratie en geheimen horen buiten deze documentroot.",
  "",
].join("\n"), "utf8");

console.log("Afgeschermd Experience-pakket voorbereid in dist-experience.");
