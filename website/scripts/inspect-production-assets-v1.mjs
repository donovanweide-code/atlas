import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

import { inspectProductionAssetSource } from "../src/sportpaleis/production-assets.mjs";

const sources = process.argv.slice(2);
if (!sources.length) {
  console.error("Gebruik: node scripts/inspect-production-assets-v1.mjs <vector-pdf-of-ai> [...]");
  process.exitCode = 2;
} else {
  const report = [];
  const renderedSources = [];
  for (const sourcePath of sources) {
    const filename = path.basename(sourcePath);
    const inspection = await inspectProductionAssetSource({
      bytes: await readFile(sourcePath),
      filename,
      mimeType: filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/illustrator",
    });
    report.push({
      source: inspection.source,
      inspection: inspection.inspection,
      candidates: inspection.candidates.map(({ previewSvg: _previewSvg, controlledVector: _controlledVector, ...candidate }) => candidate),
    });
    renderedSources.push({ filename, sha256: inspection.source.sha256, candidates: inspection.candidates });
  }
  const outputDirectory = path.resolve("output", "production-assets-v1");
  await mkdir(outputDirectory, { recursive: true });
  const outputPath = path.join(outputDirectory, "source-inspection.json");
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const reviewSections = [];
  const numberReviewSections = [];
  for (const source of renderedSources) {
    const slug = source.sha256.slice(0, 12).toLowerCase();
    const cards = [];
    for (const candidate of source.candidates) {
      const svgName = `${slug}-${candidate.id}.svg`;
      await writeFile(path.join(outputDirectory, svgName), candidate.previewSvg, "utf8");
      cards.push(`<article><img src="${svgName}" alt="${candidate.id}"><strong>${candidate.id}</strong><small>${candidate.selectionMode ?? "VISUAL_REGION"} · ${candidate.boundsMm.width.toFixed(2)} × ${candidate.boundsMm.height.toFixed(2)} bron-eenheden · ${candidate.contourCount} contouren</small></article>`);
    }
    reviewSections.push(`<section><h2>${source.filename}</h2><p>SHA-256 ${source.sha256}</p><div class="grid">${cards.join("")}</div></section>`);
    const components = source.candidates.filter(({ selectionMode }) => selectionMode === "VECTOR_COMPONENT");
    const maximumHeight = Math.max(0, ...components.map(({ boundsMm }) => boundsMm.height));
    const glyphCandidates = components.filter(({ boundsMm }) => maximumHeight > 0 && boundsMm.height >= maximumHeight * 0.97 && boundsMm.width <= maximumHeight * 1.5);
    if (glyphCandidates.length >= 10) numberReviewSections.push(`<section><h2>${source.filename}</h2><p>Alleen grote vectorcomponenten op de dominante cijferhoogte. De cijferbetekenis blijft Human Review.</p><div class="grid">${glyphCandidates.map((candidate) => `<article><img src="${slug}-${candidate.id}.svg" alt="${candidate.id}"><strong>${candidate.id}</strong><small>${candidate.boundsMm.width.toFixed(2)} × ${candidate.boundsMm.height.toFixed(2)} bron-eenheden</small></article>`).join("")}</div></section>`);
  }
  const reviewHtml = `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Production Assets V1 · Human Review</title><style>body{font:15px system-ui;margin:32px;color:#15202b;background:#f6f7f8}section{margin:0 0 48px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}article{background:white;border:1px solid #d8dde3;border-radius:12px;padding:12px;display:grid;gap:8px}img{width:100%;height:180px;object-fit:contain;background:#fff}small{color:#536170;overflow-wrap:anywhere}p{overflow-wrap:anywhere}</style>${reviewSections.join("")}</html>`;
  await writeFile(path.join(outputDirectory, "human-review.html"), reviewHtml, "utf8");
  await writeFile(path.join(outputDirectory, "number-glyph-review.html"), `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nummerset · Human Review</title><style>body{font:15px system-ui;margin:32px;color:#15202b;background:#f6f7f8}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}article{background:#fff;border:1px solid #d8dde3;border-radius:10px;padding:10px;display:grid;gap:6px}img{width:100%;height:150px;object-fit:contain}small{color:#536170}</style>${numberReviewSections.join("")}</html>`, "utf8");
  console.log(`PRODUCTION_ASSET_INSPECTION_PASS sources=${report.length} report=${outputPath}`);
  for (const entry of report) console.log(`${entry.source.filename}: candidates=${entry.inspection.candidateCount} sha256=${entry.source.sha256}`);
}
