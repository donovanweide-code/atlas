import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";

import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

const POINT_TO_MM = 25.4 / 72;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_CONTOURS = 20_000;
const MAX_POINTS = 250_000;
const FLATTEN_TOLERANCE_MM = 0.04;

function assetError(message, code = "PRODUCTION_ASSET_SOURCE_INVALID", statusCode = 400) {
  return Object.assign(new Error(message), { code, statusCode });
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function sourceDocumentMetadata(bytes) {
  const source = Buffer.from(bytes).toString("latin1");
  const value = (pattern) => source.match(pattern)?.[1]?.replace(/\\([()\\])/gu, "$1").trim() || null;
  return {
    pdfVersion: value(/^%PDF-([\d.]+)/u),
    creator: value(/\/Creator\s*\(([^)]*)/u),
    producer: value(/\/Producer\s*\(([^)]*)/u),
    illustratorVersion: value(/\/Creator\s*\(Adobe Illustrator\s+([^)]*)/u),
    embeddedPdfCompatible: true,
  };
}

function multiply(left, right) {
  const [a, b, c, d, e, f] = left;
  const [g, h, i, j, k, l] = right;
  return [a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f];
}

function transformPoint(matrix, point) {
  return {
    x: (matrix[0] * point.x + matrix[2] * point.y + matrix[4]) * POINT_TO_MM,
    y: -(matrix[1] * point.x + matrix[3] * point.y + matrix[5]) * POINT_TO_MM,
  };
}

function distanceToLine(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x) / Math.hypot(dx, dy);
}

function flattenCubic(start, control1, control2, end, output, depth = 0) {
  if (depth >= 14 || Math.max(distanceToLine(control1, start, end), distanceToLine(control2, start, end)) <= FLATTEN_TOLERANCE_MM) {
    output.push(end);
    return;
  }
  const midpoint = (left, right) => ({ x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 });
  const a = midpoint(start, control1);
  const b = midpoint(control1, control2);
  const c = midpoint(control2, end);
  const d = midpoint(a, b);
  const e = midpoint(b, c);
  const f = midpoint(d, e);
  flattenCubic(start, a, d, f, output, depth + 1);
  flattenCubic(f, e, c, end, output, depth + 1);
}

function samePoint(left, right) {
  return Math.abs(left.x - right.x) <= 0.000_01 && Math.abs(left.y - right.y) <= 0.000_01;
}

function bounds(contours) {
  const points = contours.flatMap(({ points: contourPoints }) => contourPoints);
  if (!points.length) return null;
  const xs = points.map(({ x }) => x);
  const ys = points.map(({ y }) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function normalizeContours(contours) {
  const contourBounds = bounds(contours);
  if (!contourBounds || !(contourBounds.width > 0) || !(contourBounds.height > 0)) return [];
  return contours.map((contour, contourIndex) => ({
    id: `contour-${contourIndex + 1}`,
    closed: true,
    points: contour.points.map(({ x, y }) => ({
      x: Math.round((x - contourBounds.minX) * 100_000) / 100_000,
      y: Math.round((y - contourBounds.minY) * 100_000) / 100_000,
    })),
  }));
}

function contoursFromDrawPath(data, matrix) {
  const contours = [];
  let current = [];
  let cursor = null;
  let start = null;
  const finish = (closed) => {
    if (closed && current.length > 2) {
      if (!samePoint(current[0], current.at(-1))) current.push(current[0]);
      contours.push({ closed: true, points: current });
    }
    current = [];
    cursor = null;
    start = null;
  };
  for (let index = 0; index < data.length;) {
    const operation = data[index++];
    if (operation === 0) {
      finish(false);
      cursor = transformPoint(matrix, { x: data[index++], y: data[index++] });
      start = cursor;
      current.push(cursor);
    } else if (operation === 1) {
      cursor = transformPoint(matrix, { x: data[index++], y: data[index++] });
      current.push(cursor);
    } else if (operation === 2) {
      if (!cursor) throw assetError("Een vectorcurve heeft geen geldig startpunt.");
      const control1 = transformPoint(matrix, { x: data[index++], y: data[index++] });
      const control2 = transformPoint(matrix, { x: data[index++], y: data[index++] });
      const end = transformPoint(matrix, { x: data[index++], y: data[index++] });
      flattenCubic(cursor, control1, control2, end, current);
      cursor = end;
    } else if (operation === 3) {
      if (!cursor) throw assetError("Een vectorcurve heeft geen geldig startpunt.");
      const control = transformPoint(matrix, { x: data[index++], y: data[index++] });
      const end = transformPoint(matrix, { x: data[index++], y: data[index++] });
      const control1 = { x: cursor.x + (2 / 3) * (control.x - cursor.x), y: cursor.y + (2 / 3) * (control.y - cursor.y) };
      const control2 = { x: end.x + (2 / 3) * (control.x - end.x), y: end.y + (2 / 3) * (control.y - end.y) };
      flattenCubic(cursor, control1, control2, end, current);
      cursor = end;
    } else if (operation === 4) {
      if (start && current.length > 2) finish(true);
    } else {
      throw assetError("De vectorbron bevat een niet-ondersteunde padopdracht.", "PRODUCTION_ASSET_PATH_UNSUPPORTED");
    }
  }
  return contours;
}

function overlaps(left, right, padding) {
  return !(left.maxX + padding < right.minX || right.maxX + padding < left.minX || left.maxY + padding < right.minY || right.maxY + padding < left.minY);
}

function clusterContours(contours, pageBounds) {
  const entries = contours.map((contour, index) => ({ index, bounds: bounds([contour]) })).filter(({ bounds: value }) => value?.width > 0 && value?.height > 0);
  const padding = Math.max(2, Math.min(pageBounds.width, pageBounds.height) * 0.012);
  const parent = entries.map((_, index) => index);
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const union = (left, right) => { const a = find(left); const b = find(right); if (a !== b) parent[b] = a; };
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) if (overlaps(entries[left].bounds, entries[right].bounds, padding)) union(left, right);
  }
  const grouped = new Map();
  entries.forEach((entry, index) => {
    const root = find(index);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(contours[entry.index]);
  });
  let groups = [...grouped.values()].filter((group) => {
    const groupBounds = bounds(group);
    return groupBounds.width >= 1 && groupBounds.height >= 1;
  });
  // Letterforms in one logo can be disconnected. Merge components that share
  // a visual row and are separated by no more than a conservative word gap.
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let left = 0; left < groups.length; left += 1) {
      const a = bounds(groups[left]);
      for (let right = left + 1; right < groups.length; right += 1) {
        const b = bounds(groups[right]);
        const verticalOverlap = Math.max(0, Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY));
        const minHeight = Math.min(a.height, b.height);
        const horizontalGap = Math.max(0, Math.max(a.minX, b.minX) - Math.min(a.maxX, b.maxX));
        if (verticalOverlap >= minHeight * 0.6 && horizontalGap <= Math.max(a.height, b.height) * 0.75) {
          groups[left] = [...groups[left], ...groups[right]];
          groups.splice(right, 1);
          changed = true;
          break outer;
        }
      }
    }
  }
  return groups.sort((left, right) => {
    const a = bounds(left); const b = bounds(right);
    return a.minY - b.minY || a.minX - b.minX;
  });
}

function selectableVectorComponents(contours, sourceBounds) {
  const entries = contours.map((contour, index) => ({ index, bounds: bounds([contour]) })).filter(({ bounds: value }) => value?.width > 0.25 && value?.height > 0.25);
  const padding = Math.max(0.05, Math.min(sourceBounds.width, sourceBounds.height) * 0.000_05);
  const parent = entries.map((_, index) => index);
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const union = (left, right) => { const a = find(left); const b = find(right); if (a !== b) parent[b] = a; };
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) if (overlaps(entries[left].bounds, entries[right].bounds, padding)) union(left, right);
  }
  const grouped = new Map();
  entries.forEach((entry, index) => {
    const root = find(index);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(contours[entry.index]);
  });
  return [...grouped.values()].filter((group) => {
    const value = bounds(group);
    return value.width >= 0.5 && value.height >= 0.5;
  }).sort((left, right) => {
    const a = bounds(left); const b = bounds(right);
    return a.minY - b.minY || a.minX - b.minX;
  });
}

function visualRegionGroups(contours, pageBounds) {
  const entries = contours.map((contour) => ({ contour, bounds: bounds([contour]) })).filter(({ bounds: value }) => value?.width > 0 && value?.height > 0);
  const verticalTolerance = Math.max(1, pageBounds.height * 0.006);
  const bands = [];
  for (const entry of entries.sort((left, right) => left.bounds.minY - right.bounds.minY)) {
    const matches = bands.filter((band) => !(entry.bounds.minY > band.maxY + verticalTolerance || entry.bounds.maxY < band.minY - verticalTolerance));
    if (!matches.length) bands.push({ minY: entry.bounds.minY, maxY: entry.bounds.maxY, entries: [entry] });
    else {
      const target = matches[0];
      target.entries.push(entry);
      target.minY = Math.min(target.minY, entry.bounds.minY);
      target.maxY = Math.max(target.maxY, entry.bounds.maxY);
      for (const extra of matches.slice(1)) {
        target.entries.push(...extra.entries);
        target.minY = Math.min(target.minY, extra.minY);
        target.maxY = Math.max(target.maxY, extra.maxY);
        bands.splice(bands.indexOf(extra), 1);
      }
    }
  }
  const groups = [];
  for (const band of bands.sort((left, right) => left.minY - right.minY)) {
    const horizontalTolerance = Math.max(2, (band.maxY - band.minY) * 0.75);
    const runs = [];
    for (const entry of band.entries.sort((left, right) => left.bounds.minX - right.bounds.minX)) {
      const run = runs.find((candidate) => entry.bounds.minX <= candidate.maxX + horizontalTolerance);
      if (run) {
        run.entries.push(entry);
        run.maxX = Math.max(run.maxX, entry.bounds.maxX);
      } else runs.push({ minX: entry.bounds.minX, maxX: entry.bounds.maxX, entries: [entry] });
    }
    groups.push(...runs.map(({ entries: runEntries }) => runEntries.map(({ contour }) => contour)));
  }
  return groups.filter((group) => {
    const groupBounds = bounds(group);
    return groupBounds.width >= 1 && groupBounds.height >= 1;
  });
}

function previewSvg(contours) {
  const contourBounds = bounds(contours);
  const padding = Math.max(contourBounds.width, contourBounds.height) * 0.06;
  const path = contours.map(({ points }) => `M ${points.map(({ x, y }) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(" L ")} Z`).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(contourBounds.minX - padding).toFixed(3)} ${(contourBounds.minY - padding).toFixed(3)} ${(contourBounds.width + padding * 2).toFixed(3)} ${(contourBounds.height + padding * 2).toFixed(3)}"><path d="${path}" fill="#101828" fill-rule="evenodd"/></svg>`;
}

export function productionAssetPreviewSvg(asset) {
  const contours = asset?.controlledVector?.contours;
  if (!Array.isArray(contours) || !contours.length) throw assetError("Voor deze productieasset is geen gecontroleerde vectorpreview beschikbaar.", "PRODUCTION_ASSET_PREVIEW_NOT_FOUND", 404);
  return previewSvg(contours);
}

function documentPreviewSvg(candidates) {
  const contours = candidates.filter(({ selectionMode }) => selectionMode === "VISUAL_REGION").flatMap(({ controlledVector }) => controlledVector.contours.map((contour) => ({ ...contour, points: contour.points.map(({ x, y }) => ({ x: x + Number(controlledVector.sourceOriginMm?.x ?? 0), y: y + Number(controlledVector.sourceOriginMm?.y ?? 0) })) })));
  return contours.length ? previewSvg(contours) : null;
}

function sourceCandidate(contours, index, page, warnings = [], selectionMode = "VISUAL_REGION") {
  const rawBounds = bounds(contours);
  const normalized = normalizeContours(contours);
  const candidateBounds = bounds(normalized);
  const pointCount = normalized.reduce((sum, contour) => sum + contour.points.length, 0);
  if (!normalized.length || normalized.length > MAX_CONTOURS || pointCount > MAX_POINTS) return null;
  const geometryHash = sha256(Buffer.from(JSON.stringify(normalized)));
  return {
    id: `candidate-${String(index + 1).padStart(3, "0")}-${geometryHash.slice(0, 10).toLowerCase()}`,
    suggestedName: `${selectionMode === "VECTOR_COMPONENT" ? "Vectoronderdeel" : selectionMode === "OBJECT_GROUP" ? "Objectgroep" : "Vectorvorm"} ${index + 1}`,
    selectionMode,
    page,
    selectionRef: `page:${page};candidate:${index + 1};geometry:${geometryHash}`,
    geometryHash,
    status: "REVIEW",
    boundsMm: { width: candidateBounds.width, height: candidateBounds.height },
    aspectRatio: candidateBounds.width / candidateBounds.height,
    contourCount: normalized.length,
    pointCount,
    warnings,
    controlledVector: { format: "WBD_CONTOURS_V1", sourceOriginMm: { x: rawBounds.minX, y: rawBounds.minY }, contours: normalized },
    previewSvg: previewSvg(normalized),
  };
}

function visuallyEquivalentGeometryHash(candidate) {
  const resolution = 40;
  const candidateBounds = bounds(candidate.controlledVector.contours);
  const inside = (point, polygon) => {
    let result = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
      const a = polygon[current]; const b = polygon[previous];
      if (((a.y > point.y) !== (b.y > point.y)) && point.x < ((b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || Number.EPSILON)) + a.x) result = !result;
    }
    return result;
  };
  const raster = [];
  for (let row = 0; row < resolution; row += 1) {
    for (let column = 0; column < resolution; column += 1) {
      const point = { x: candidateBounds.minX + ((column + .5) / resolution) * candidateBounds.width, y: candidateBounds.minY + ((row + .5) / resolution) * candidateBounds.height };
      const filled = candidate.controlledVector.contours.reduce((value, contour) => inside(point, contour.points) ? !value : value, false);
      raster.push(filled ? "1" : "0");
    }
  }
  const aspectBucket = Math.round(candidate.aspectRatio / .025) * .025;
  return sha256(Buffer.from(`${aspectBucket.toFixed(3)}|${raster.join("")}`));
}

function collapseEquivalentVectorComponents(candidates) {
  const representatives = [];
  const byGeometry = new Map();
  for (const candidate of candidates) {
    if (candidate.selectionMode !== "VECTOR_COMPONENT") {
      representatives.push(candidate);
      continue;
    }
    const visualGeometryHash = visuallyEquivalentGeometryHash(candidate);
    const existing = byGeometry.get(visualGeometryHash);
    if (existing) {
      existing.equivalentSelectionRefs.push(candidate.selectionRef);
      existing.equivalentCandidateIds.push(candidate.id);
      continue;
    }
    candidate.equivalentSelectionRefs = [candidate.selectionRef];
    candidate.equivalentCandidateIds = [candidate.id];
    byGeometry.set(visualGeometryHash, candidate);
    representatives.push(candidate);
  }
  const components = representatives.filter(({ selectionMode }) => selectionMode === "VECTOR_COMPONENT");
  const maximumHeight = Math.max(0, ...components.map(({ boundsMm }) => boundsMm.height));
  const glyphCandidates = representatives.filter(({ boundsMm }) => maximumHeight > 0 && boundsMm.height >= maximumHeight * 0.97 && boundsMm.width <= maximumHeight * 1.5);
  const glyphRepresentatives = [...new Map(glyphCandidates.map((candidate) => [visuallyEquivalentGeometryHash(candidate), candidate])).values()];
  if (glyphRepresentatives.length >= 10) for (const candidate of glyphRepresentatives) candidate.reviewCategory = "NUMBER_GLYPH";
  const normalReviewClusters = new Map();
  for (const candidate of representatives) {
    const key = visuallyEquivalentGeometryHash(candidate); const existing = normalReviewClusters.get(key);
    candidate.normalReviewRepresentative = !existing;
    if (existing) existing.normalReviewAlternativeCount += 1;
    else { candidate.normalReviewAlternativeCount = 1; normalReviewClusters.set(key, candidate); }
  }
  return { candidates: representatives, rawCandidateCount: candidates.length, equivalentComponentCount: candidates.filter(({ selectionMode }) => selectionMode === "VECTOR_COMPONENT").length - components.length, glyphReviewCandidateCount: glyphRepresentatives.length >= 10 ? glyphRepresentatives.length : 0, normalReviewCandidateCount: normalReviewClusters.size };
}

async function inspectPdf(bytes) {
  const loadingTask = getDocument({ data: new Uint8Array(bytes), disableFontFace: true, isEvalSupported: false, useSystemFonts: false });
  const document = await loadingTask.promise;
  const pageCount = document.numPages;
  const candidates = [];
  let pathCount = 0;
  let textCount = 0;
  let rasterCount = 0;
  let strokeCount = 0;
  const pageDimensionsMm = [];
  const paintedPathOperations = new Set([OPS.fill, OPS.eoFill, OPS.stroke, OPS.closeStroke, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const operatorList = await page.getOperatorList();
    const matrixStack = [];
    let matrix = [1, 0, 0, 1, 0, 0];
    const pageContours = [];
    for (let index = 0; index < operatorList.fnArray.length; index += 1) {
      const operation = operatorList.fnArray[index];
      const args = operatorList.argsArray[index];
      if (operation === OPS.save) matrixStack.push([...matrix]);
      else if (operation === OPS.restore) matrix = matrixStack.pop() ?? [1, 0, 0, 1, 0, 0];
      else if (operation === OPS.transform) matrix = multiply(matrix, args);
      else if (operation === OPS.constructPath) {
        if (!paintedPathOperations.has(args[0])) continue;
        pathCount += 1;
        if ([OPS.stroke, OPS.closeStroke].includes(args[0])) strokeCount += 1;
        pageContours.push(...contoursFromDrawPath(args[1][0], matrix));
      } else if ([OPS.showText, OPS.showSpacedText, OPS.nextLineShowText, OPS.nextLineSetSpacingShowText].includes(operation)) textCount += 1;
      else if ([OPS.paintImageXObject, OPS.paintInlineImageXObject, OPS.paintImageMaskXObject].includes(operation)) rasterCount += 1;
    }
    const pageBounds = { width: viewport.width * POINT_TO_MM, height: viewport.height * POINT_TO_MM };
    pageDimensionsMm.push({ page: pageNumber, width: Math.round(pageBounds.width * 1000) / 1000, height: Math.round(pageBounds.height * 1000) / 1000 });
    const groups = visualRegionGroups(pageContours, pageBounds);
    const objectGroups = clusterContours(pageContours, pageBounds);
    const componentGroups = selectableVectorComponents(pageContours, pageBounds);
    const warnings = strokeCount ? ["STROKE_REQUIRES_REVIEW"] : [];
    for (const group of groups) {
      const candidate = sourceCandidate(group, candidates.length, pageNumber, warnings, "VISUAL_REGION");
      if (candidate) candidates.push(candidate);
    }
    const knownGeometry = new Set(candidates.filter(({ page }) => page === pageNumber).map(({ geometryHash }) => geometryHash));
    for (const group of objectGroups) {
      const candidate = sourceCandidate(group, candidates.length, pageNumber, warnings, "OBJECT_GROUP");
      if (candidate && !knownGeometry.has(candidate.geometryHash)) { candidates.push(candidate); knownGeometry.add(candidate.geometryHash); }
    }
    for (const group of componentGroups) {
      const candidate = sourceCandidate(group, candidates.length, pageNumber, warnings, "VECTOR_COMPONENT");
      if (candidate && !knownGeometry.has(candidate.geometryHash)) candidates.push(candidate);
    }
  }
  await loadingTask.destroy();
  return { candidates, evidence: { pageCount, pageDimensionsMm, pathCount, textCount, rasterCount, strokeCount, publicVectorUsable: candidates.length > 0 } };
}

function pdfObjectStream(source, reference) {
  const marker = `${reference} 0 obj`;
  const start = source.indexOf(marker);
  if (start < 0) return null;
  const streamStart = source.indexOf("stream", start);
  const end = source.indexOf("endstream", streamStart);
  if (streamStart < 0 || end < 0) return null;
  let contentStart = streamStart + 6;
  if (source[contentStart] === "\r") contentStart += 1;
  if (source[contentStart] === "\n") contentStart += 1;
  let contentEnd = end;
  if (source[contentEnd - 1] === "\n") contentEnd -= 1;
  if (source[contentEnd - 1] === "\r") contentEnd -= 1;
  return Buffer.from(source.slice(contentStart, contentEnd), "latin1");
}

function illustratorPrivateData(bytes) {
  const source = Buffer.from(bytes).toString("latin1");
  const dictionaryStart = source.indexOf("/AIPrivateData1");
  if (dictionaryStart < 0) return null;
  const dictionaryEnd = source.indexOf(">>", dictionaryStart);
  const dictionary = source.slice(dictionaryStart, dictionaryEnd);
  const references = [...dictionary.matchAll(/\/AIPrivateData(\d+)\s+(\d+)\s+0\s+R/g)]
    .map((match) => ({ index: Number(match[1]), reference: Number(match[2]) }))
    .sort((left, right) => left.index - right.index);
  if (!references.length) return null;
  const compressed = Buffer.concat(references.map(({ reference }) => pdfObjectStream(source, reference)).filter(Boolean));
  const marker = Buffer.from("%AI12_CompressedData");
  const markerIndex = compressed.indexOf(marker);
  if (markerIndex < 0) return null;
  let dataStart = markerIndex + marker.length;
  if (compressed[dataStart] === 13) dataStart += 1;
  if (compressed[dataStart] === 10) dataStart += 1;
  try { return inflateSync(compressed.subarray(dataStart)).toString("utf8"); }
  catch { return null; }
}

function illustratorContours(source) {
  const contours = [];
  let current = [];
  let cursor = null;
  let hasStrokePaint = false;
  const transform = (x, y) => ({ x: Number(x) * POINT_TO_MM, y: -Number(y) * POINT_TO_MM });
  const finish = (paint) => {
    if (["B", "b", "S", "s"].includes(paint)) hasStrokePaint = true;
    if (["f", "F", "B", "b"].includes(paint) && current.length > 2) {
      if (!samePoint(current[0], current.at(-1))) current.push(current[0]);
      contours.push({ closed: true, points: current });
    }
    current = [];
    cursor = null;
  };
  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("%")) continue;
    const tokens = line.split(/\s+/u);
    const operation = tokens.at(-1);
    const numbers = tokens.slice(0, -1).map(Number);
    if (operation === "m" && numbers.length >= 2) {
      finish("");
      cursor = transform(numbers.at(-2), numbers.at(-1));
      current.push(cursor);
    } else if (["l", "L"].includes(operation) && numbers.length >= 2) {
      cursor = transform(numbers.at(-2), numbers.at(-1));
      current.push(cursor);
    } else if (["c", "C"].includes(operation) && numbers.length >= 6 && cursor) {
      const control1 = transform(numbers.at(-6), numbers.at(-5));
      const control2 = transform(numbers.at(-4), numbers.at(-3));
      const end = transform(numbers.at(-2), numbers.at(-1));
      flattenCubic(cursor, control1, control2, end, current);
      cursor = end;
    } else if (["v", "V", "y", "Y"].includes(operation) && numbers.length >= 4 && cursor) {
      const first = transform(numbers.at(-4), numbers.at(-3));
      const end = transform(numbers.at(-2), numbers.at(-1));
      const control1 = ["v", "V"].includes(operation) ? cursor : first;
      const control2 = ["v", "V"].includes(operation) ? first : end;
      flattenCubic(cursor, control1, control2, end, current);
      cursor = end;
    } else if (["f", "F", "B", "b", "S", "s", "n", "N"].includes(operation)) finish(operation);
  }
  finish("");
  return { contours, hasStrokePaint };
}

function sourceKind(filename, mimeType) {
  const extension = String(filename).toLocaleLowerCase("nl-NL").split(".").at(-1);
  if (extension === "ai" || mimeType === "application/illustrator") return "ILLUSTRATOR_PDF";
  if (extension === "pdf" || mimeType === "application/pdf") return "PDF";
  throw assetError("V1 accepteert uitsluitend vector-PDF en PDF-compatible Illustrator-bestanden.", "PRODUCTION_ASSET_FORMAT_UNSUPPORTED");
}

export async function inspectProductionAssetSource({ bytes, filename, mimeType = "application/octet-stream" }) {
  const sourceBytes = Buffer.from(bytes);
  if (!sourceBytes.length || sourceBytes.length > MAX_SOURCE_BYTES) throw assetError("Het bronbestand is leeg of groter dan 8 MB.", "PRODUCTION_ASSET_SOURCE_SIZE_INVALID", 413);
  if (!sourceBytes.subarray(0, 8).toString("latin1").startsWith("%PDF-")) throw assetError("Alleen PDF-compatible vectorbronnen zijn in V1 veilig inspecteerbaar.", "PRODUCTION_ASSET_FORMAT_UNSUPPORTED");
  const kind = sourceKind(filename, mimeType);
  const documentMetadata = sourceDocumentMetadata(sourceBytes);
  const publicInspection = await inspectPdf(sourceBytes);
  let candidates = publicInspection.candidates;
  const privateSource = kind === "ILLUSTRATOR_PDF" ? illustratorPrivateData(sourceBytes) : null;
  let privateEvidence = { available: Boolean(privateSource), used: false, pathCount: 0, strokePaint: false };
  if ((!candidates.length || publicInspection.evidence.pathCount < 10) && privateSource) {
    const privateVectors = illustratorContours(privateSource);
    const sourceBounds = bounds(privateVectors.contours);
    const visualGroups = sourceBounds ? visualRegionGroups(privateVectors.contours, sourceBounds) : [];
    const objectGroups = sourceBounds ? clusterContours(privateVectors.contours, sourceBounds) : [];
    const componentGroups = sourceBounds ? selectableVectorComponents(privateVectors.contours, sourceBounds) : [];
    const warnings = privateVectors.hasStrokePaint ? ["STROKE_REQUIRES_REVIEW"] : [];
    const visualCandidates = visualGroups.map((group, index) => sourceCandidate(group, index, 1, warnings, "VISUAL_REGION")).filter(Boolean);
    const knownGeometry = new Set(visualCandidates.map(({ geometryHash }) => geometryHash));
    const objectCandidates = objectGroups.map((group, index) => sourceCandidate(group, visualCandidates.length + index, 1, warnings, "OBJECT_GROUP")).filter((candidate) => {
      if (!candidate || knownGeometry.has(candidate.geometryHash)) return false;
      knownGeometry.add(candidate.geometryHash); return true;
    });
    const componentCandidates = componentGroups.map((group, index) => sourceCandidate(group, visualCandidates.length + objectCandidates.length + index, 1, warnings, "VECTOR_COMPONENT")).filter((candidate) => candidate && !knownGeometry.has(candidate.geometryHash));
    candidates = [...visualCandidates, ...objectCandidates, ...componentCandidates].slice(0, 500);
    privateEvidence = { available: true, used: true, pathCount: privateVectors.contours.length, strokePaint: privateVectors.hasStrokePaint };
  }
  if (!candidates.length) throw assetError("In deze bron zijn geen veilig selecteerbare gesloten vectorvormen gevonden.", "PRODUCTION_ASSET_NO_VECTOR_CANDIDATES");
  const collapsed = collapseEquivalentVectorComponents(candidates);
  candidates = collapsed.candidates;
  return {
    source: {
      filename: String(filename).slice(0, 180),
      mimeType,
      format: kind,
      sha256: sha256(sourceBytes),
      sizeBytes: sourceBytes.length,
      immutable: true,
      documentMetadata,
    },
    inspection: {
      engine: "WBD_PRODUCTION_ASSET_INTAKE_V1",
      engineVersion: "1",
      publicPdf: publicInspection.evidence,
      illustratorPrivate: privateEvidence,
      candidateCount: candidates.length,
      rawCandidateCount: collapsed.rawCandidateCount,
      equivalentComponentCount: collapsed.equivalentComponentCount,
      glyphReviewCandidateCount: collapsed.glyphReviewCandidateCount,
      normalReviewCandidateCount: collapsed.normalReviewCandidateCount,
      requiresHumanSelection: true,
      geometryNeverAiGenerated: true,
    },
    documentPreviewSvg: documentPreviewSvg(candidates),
    candidates,
  };
}

export function productionAssetPiece({ asset, variant, line, order, foilColor }) {
  if (asset.lifecycleStatus !== "PRODUCTION_READY" || asset.productionMethod !== "SELF_PRODUCED") throw assetError("Dit beeldmerk is nog niet vrijgegeven voor eigen productie.", "PRODUCTION_ASSET_NOT_READY", 409);
  const numberSet = asset.applications?.some(({ kind }) => kind === "NUMBER_SET");
  if (numberSet) {
    if (!/^\d{1,4}$/u.test(line.content) || !asset.numberGlyphs) throw assetError("Deze nummerbron kan de gevraagde cijferreeks niet veilig zetten.", "PRODUCTION_ASSET_GLYPH_MISSING", 409);
    const requestedHeight = Number(line.heightMm || variant.heightMm);
    if (!(requestedHeight > 0)) throw assetError("Een nummerbron vereist een fysieke hoogte.", "PRODUCTION_ASSET_SIZE_MISSING", 409);
    let offsetX = 0;
    const spacing = requestedHeight * 0.08;
    const contours = [];
    for (const digit of Array.from(line.content)) {
      const glyph = asset.numberGlyphs[digit];
      if (!glyph?.contours?.length || !(glyph.heightUnits > 0)) throw assetError(`Cijfer ${digit} ontbreekt in de beheerde nummerbron.`, "PRODUCTION_ASSET_GLYPH_MISSING", 409);
      const scale = requestedHeight / glyph.heightUnits;
      contours.push(...glyph.contours.map((contour) => ({ ...contour, id: `${digit}-${contour.id}-${contours.length + 1}`, points: contour.points.map(({ x, y }) => ({ x: offsetX + x * scale, y: y * scale })) })));
      offsetX += glyph.widthUnits * scale + spacing;
    }
    const producedBounds = bounds(contours);
    return {
      id: `${order.id}-${line.itemId ?? line.id}-${asset.id}`,
      sourceOrderId: order.id,
      label: line.preview?.label ?? `${asset.name} ${line.content}`,
      product: order.items.find(({ id }) => id === line.itemId)?.product ?? "Productienummers",
      association: order.association,
      printType: "Beheerde vectornummerbron",
      requestedPhysicalSizeMm: { widthMm: producedBounds.width, heightMm: requestedHeight },
      vectorProfile: `${asset.id}@${asset.version}#${asset.sourceSelection.geometryHash}`,
      material: { code: `foil-${String(foilColor).toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/g, "-")}`, foilColor },
      contours,
      productionRule: { mirror: true, rotation: requestedHeight > 180 ? 90 : 0, allowedNestingRotations: [0] },
    };
  }
  if (!asset.controlledVector?.contours?.length || asset.controlledVector.geometryHash !== asset.sourceSelection?.geometryHash) throw assetError("De beheerde vectoridentiteit is onvolledig.", "PRODUCTION_ASSET_IDENTITY_MISMATCH", 409);
  const sourceContours = asset.controlledVector.contours;
  const sourceBounds = bounds(sourceContours);
  const requestedWidth = Number(line.widthMm || variant.widthMm);
  const requestedHeight = Number(line.heightMm || variant.heightMm);
  if (!(requestedWidth > 0) && !(requestedHeight > 0)) throw assetError("Een productieasset vereist een fysieke breedte of hoogte.", "PRODUCTION_ASSET_SIZE_MISSING", 409);
  const scale = requestedWidth > 0 ? requestedWidth / sourceBounds.width : requestedHeight / sourceBounds.height;
  const derivedWidth = sourceBounds.width * scale;
  const derivedHeight = sourceBounds.height * scale;
  if (requestedWidth > 0 && requestedHeight > 0 && Math.abs(derivedHeight - requestedHeight) > 0.2) throw assetError("Breedte en hoogte wijken af van de vaste beeldverhouding.", "PRODUCTION_ASSET_ASPECT_RATIO_MISMATCH", 409);
  const contours = sourceContours.map((contour) => ({ ...contour, points: contour.points.map(({ x, y }) => ({ x: x * scale, y: y * scale })) }));
  return {
    id: `${order.id}-${line.itemId ?? line.id}-${asset.id}`,
    sourceOrderId: order.id,
    label: line.preview?.label ?? asset.name,
    product: order.items.find(({ id }) => id === line.itemId)?.product ?? "Productieasset",
    association: order.association,
    printType: "Beheerde productieasset",
    requestedPhysicalSizeMm: { widthMm: derivedWidth, heightMm: derivedHeight },
    vectorProfile: `${asset.id}@${asset.version}#${asset.controlledVector.geometryHash}`,
    material: { code: `foil-${String(foilColor).toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/g, "-")}`, foilColor },
    contours,
    productionRule: { mirror: true, rotation: 0, allowedNestingRotations: [0] },
  };
}
