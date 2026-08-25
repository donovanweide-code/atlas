import { createHash } from "node:crypto";

const ILLUSTRATOR_PX_TO_MM = 25.4 / 72;
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_CONTOURS = 20_000;
const MAX_POINTS = 250_000;
const FLATTEN_TOLERANCE_MM = 0.04;
const ALLOWED_TAGS = new Set(["svg", "g", "path", "polygon", "polyline", "rect", "circle", "ellipse", "line", "title", "desc", "metadata", "text", "tspan"]);
const GEOMETRY_TAGS = new Set(["path", "polygon", "polyline", "rect", "circle", "ellipse", "line"]);

function svgError(message, code = "PRODUCTION_ASSET_SVG_INVALID", statusCode = 400) {
  return Object.assign(new Error(message), { code, statusCode });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}

function multiply(left, right) {
  const [a, b, c, d, e, f] = left;
  const [g, h, i, j, k, l] = right;
  return [a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f];
}

function transformPoint(matrix, point) {
  return {
    x: (matrix[0] * point.x + matrix[2] * point.y + matrix[4]) * ILLUSTRATOR_PX_TO_MM,
    y: (matrix[1] * point.x + matrix[3] * point.y + matrix[5]) * ILLUSTRATOR_PX_TO_MM,
  };
}

function transformMatrix(value) {
  if (!value) return [1, 0, 0, 1, 0, 0];
  let result = [1, 0, 0, 1, 0, 0];
  const expressions = [...value.matchAll(/([a-z]+)\s*\(([^)]*)\)/giu)];
  if (!expressions.length) throw svgError("De SVG bevat een ongeldige transformatie.", "PRODUCTION_ASSET_SVG_TRANSFORM_INVALID");
  for (const [, operation, rawValues] of expressions) {
    const values = rawValues.trim().split(/[\s,]+/u).filter(Boolean).map(Number);
    if (values.some((entry) => !Number.isFinite(entry))) throw svgError("De SVG bevat een ongeldige transformatie.", "PRODUCTION_ASSET_SVG_TRANSFORM_INVALID");
    let next;
    if (operation.toLowerCase() === "matrix" && values.length === 6) next = values;
    else if (operation.toLowerCase() === "translate" && [1, 2].includes(values.length)) next = [1, 0, 0, 1, values[0], values[1] ?? 0];
    else if (operation.toLowerCase() === "scale" && [1, 2].includes(values.length)) next = [values[0], 0, 0, values[1] ?? values[0], 0, 0];
    else if (operation.toLowerCase() === "rotate" && [1, 3].includes(values.length)) {
      const radians = values[0] * Math.PI / 180;
      const rotation = [Math.cos(radians), Math.sin(radians), -Math.sin(radians), Math.cos(radians), 0, 0];
      next = values.length === 3
        ? multiply(multiply([1, 0, 0, 1, values[1], values[2]], rotation), [1, 0, 0, 1, -values[1], -values[2]])
        : rotation;
    } else throw svgError(`De SVG-transformatie ${operation} wordt niet veilig ondersteund.`, "PRODUCTION_ASSET_SVG_TRANSFORM_UNSUPPORTED");
    result = multiply(result, next);
  }
  return result;
}

function decodeXml(value) {
  return String(value).replace(/&#x([0-9a-f]+);|&#(\d+);|&(quot|apos|lt|gt|amp);/giu, (_, hex, decimal, named) => {
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    if (decimal) return String.fromCodePoint(Number(decimal));
    return ({ quot: '"', apos: "'", lt: "<", gt: ">", amp: "&" })[named.toLowerCase()];
  });
}

function attributes(raw) {
  const result = {};
  for (const match of raw.matchAll(/([:\w.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu)) result[match[1].toLowerCase()] = decodeXml(match[2] ?? match[3] ?? "");
  return result;
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
  const a = midpoint(start, control1); const b = midpoint(control1, control2); const c = midpoint(control2, end);
  const d = midpoint(a, b); const e = midpoint(b, c); const f = midpoint(d, e);
  flattenCubic(start, a, d, f, output, depth + 1);
  flattenCubic(f, e, c, end, output, depth + 1);
}

function flattenQuadratic(start, control, end, output) {
  const control1 = { x: start.x + (2 / 3) * (control.x - start.x), y: start.y + (2 / 3) * (control.y - start.y) };
  const control2 = { x: end.x + (2 / 3) * (control.x - end.x), y: end.y + (2 / 3) * (control.y - end.y) };
  flattenCubic(start, control1, control2, end, output);
}

function samePoint(left, right) {
  return Math.abs(left.x - right.x) <= 0.000_01 && Math.abs(left.y - right.y) <= 0.000_01;
}

function pathContours(data, matrix, fillVisible) {
  const tokens = [...String(data).matchAll(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/giu)].map(({ 0: value }) => value);
  if (!tokens.length) return [];
  const output = [];
  let index = 0; let command = null; let rawCursor = { x: 0, y: 0 }; let rawStart = null; let cursor = transformPoint(matrix, rawCursor); let start = null; let current = [];
  let lastCubicControl = null; let lastQuadraticControl = null;
  const isCommand = (value) => /^[a-z]$/iu.test(value);
  const read = () => { const value = Number(tokens[index++]); if (!Number.isFinite(value)) throw svgError("De SVG bevat ongeldige padcoördinaten.", "PRODUCTION_ASSET_SVG_PATH_INVALID"); return value; };
  const rawPoint = (x, y, relative) => ({ x: relative ? rawCursor.x + x : x, y: relative ? rawCursor.y + y : y });
  const finish = (forceClosed = false) => {
    if (current.length > 2 && (forceClosed || fillVisible)) {
      if (!samePoint(current[0], current.at(-1))) current.push({ ...current[0] });
      output.push({ closed: true, points: current });
    }
    current = []; start = null; rawStart = null; lastCubicControl = null; lastQuadraticControl = null;
  };
  while (index < tokens.length) {
    if (isCommand(tokens[index])) command = tokens[index++];
    if (!command) throw svgError("De SVG bevat een pad zonder opdracht.", "PRODUCTION_ASSET_SVG_PATH_INVALID");
    const lower = command.toLowerCase(); const relative = command === lower;
    if (lower === "z") { if (rawStart) { rawCursor = rawStart; cursor = transformPoint(matrix, rawCursor); } finish(true); command = null; continue; }
    if (lower === "m") {
      const nextRaw = rawPoint(read(), read(), relative); const next = transformPoint(matrix, nextRaw);
      if (current.length) finish(false);
      rawCursor = nextRaw; rawStart = nextRaw; cursor = next; start = next; current.push(next); command = relative ? "l" : "L"; continue;
    }
    if (lower === "l") { rawCursor = rawPoint(read(), read(), relative); cursor = transformPoint(matrix, rawCursor); current.push(cursor); lastCubicControl = null; lastQuadraticControl = null; continue; }
    if (lower === "h") { const x = read(); rawCursor = { x: relative ? rawCursor.x + x : x, y: rawCursor.y }; cursor = transformPoint(matrix, rawCursor); current.push(cursor); lastCubicControl = null; lastQuadraticControl = null; continue; }
    if (lower === "v") { const y = read(); rawCursor = { x: rawCursor.x, y: relative ? rawCursor.y + y : y }; cursor = transformPoint(matrix, rawCursor); current.push(cursor); lastCubicControl = null; lastQuadraticControl = null; continue; }
    if (lower === "c") {
      const control1Raw = rawPoint(read(), read(), relative); const control2Raw = rawPoint(read(), read(), relative); const endRaw = rawPoint(read(), read(), relative);
      const control1 = transformPoint(matrix, control1Raw); const control2 = transformPoint(matrix, control2Raw); const end = transformPoint(matrix, endRaw);
      flattenCubic(cursor, control1, control2, end, current); rawCursor = endRaw; cursor = end; lastCubicControl = control2; lastQuadraticControl = null; continue;
    }
    if (lower === "s") {
      const control1 = lastCubicControl ? { x: cursor.x * 2 - lastCubicControl.x, y: cursor.y * 2 - lastCubicControl.y } : cursor;
      const control2Raw = rawPoint(read(), read(), relative); const endRaw = rawPoint(read(), read(), relative); const control2 = transformPoint(matrix, control2Raw); const end = transformPoint(matrix, endRaw);
      flattenCubic(cursor, control1, control2, end, current); rawCursor = endRaw; cursor = end; lastCubicControl = control2; lastQuadraticControl = null; continue;
    }
    if (lower === "q") {
      const controlRaw = rawPoint(read(), read(), relative); const endRaw = rawPoint(read(), read(), relative); const control = transformPoint(matrix, controlRaw); const end = transformPoint(matrix, endRaw);
      flattenQuadratic(cursor, control, end, current); rawCursor = endRaw; cursor = end; lastQuadraticControl = control; lastCubicControl = null; continue;
    }
    if (lower === "t") {
      const control = lastQuadraticControl ? { x: cursor.x * 2 - lastQuadraticControl.x, y: cursor.y * 2 - lastQuadraticControl.y } : cursor;
      const endRaw = rawPoint(read(), read(), relative); const end = transformPoint(matrix, endRaw);
      flattenQuadratic(cursor, control, end, current); rawCursor = endRaw; cursor = end; lastQuadraticControl = control; lastCubicControl = null; continue;
    }
    throw svgError(`SVG-padopdracht ${command} wordt niet veilig ondersteund.`, "PRODUCTION_ASSET_SVG_PATH_UNSUPPORTED");
  }
  finish(Boolean(start && samePoint(cursor, start)));
  return output;
}

function numberList(value) {
  return String(value ?? "").trim().split(/[\s,]+/u).filter(Boolean).map(Number);
}

function primitiveContours(tag, attrs, matrix, fillVisible) {
  const numeric = (name, fallback = 0) => { const value = Number(attrs[name] ?? fallback); if (!Number.isFinite(value)) throw svgError(`SVG-attribuut ${name} is ongeldig.`, "PRODUCTION_ASSET_SVG_GEOMETRY_INVALID"); return value; };
  if (tag === "path") return pathContours(attrs.d ?? "", matrix, fillVisible);
  if (["polygon", "polyline"].includes(tag)) {
    const values = numberList(attrs.points);
    if (values.length < 6 || values.length % 2) throw svgError("De SVG bevat een ongeldige puntenreeks.", "PRODUCTION_ASSET_SVG_GEOMETRY_INVALID");
    const points = []; for (let index = 0; index < values.length; index += 2) points.push(transformPoint(matrix, { x: values[index], y: values[index + 1] }));
    if (tag === "polygon" || fillVisible) { if (!samePoint(points[0], points.at(-1))) points.push({ ...points[0] }); return [{ closed: true, points }]; }
    return [];
  }
  if (tag === "rect") {
    const x = numeric("x"); const y = numeric("y"); const width = numeric("width"); const height = numeric("height");
    if (!(width > 0) || !(height > 0) || numeric("rx") || numeric("ry")) throw svgError("Alleen rechthoekige gesloten SVG-vormen worden ondersteund.", "PRODUCTION_ASSET_SVG_GEOMETRY_UNSUPPORTED");
    const raw = [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }, { x, y }];
    return [{ closed: true, points: raw.map((entry) => transformPoint(matrix, entry)) }];
  }
  if (["circle", "ellipse"].includes(tag)) {
    const cx = numeric("cx"); const cy = numeric("cy"); const rx = tag === "circle" ? numeric("r") : numeric("rx"); const ry = tag === "circle" ? rx : numeric("ry");
    if (!(rx > 0) || !(ry > 0)) throw svgError("De SVG bevat een ongeldige ellips.", "PRODUCTION_ASSET_SVG_GEOMETRY_INVALID");
    const points = Array.from({ length: 65 }, (_, index) => transformPoint(matrix, { x: cx + Math.cos((index / 64) * Math.PI * 2) * rx, y: cy + Math.sin((index / 64) * Math.PI * 2) * ry }));
    return [{ closed: true, points }];
  }
  if (tag === "line") {
    if (!fillVisible) return [];
    throw svgError("Een losse lijn heeft geen gesloten productiegeometrie.", "PRODUCTION_ASSET_SVG_OPEN_GEOMETRY");
  }
  return [];
}

function contourBounds(contours) {
  const points = contours.flatMap(({ points }) => points);
  if (!points.length) return null;
  const xs = points.map(({ x }) => x); const ys = points.map(({ y }) => y);
  const minX = Math.min(...xs); const minY = Math.min(...ys); const maxX = Math.max(...xs); const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function normalizeContours(contours, { scaleToHeight = null } = {}) {
  const value = contourBounds(contours);
  if (!value || !(value.width > 0) || !(value.height > 0)) return [];
  const scale = scaleToHeight ? scaleToHeight / value.height : 1;
  return contours.map((contour, index) => ({ id: `contour-${index + 1}`, closed: true, points: contour.points.map(({ x, y }) => ({ x: Math.round((x - value.minX) * scale * 100_000) / 100_000, y: Math.round((y - value.minY) * scale * 100_000) / 100_000 })) }));
}

function previewSvg(contours) {
  const value = contourBounds(contours); const padding = Math.max(value.width, value.height) * 0.04;
  const data = contours.map(({ points }) => `M ${points.map(({ x, y }) => `${x.toFixed(3)} ${y.toFixed(3)}`).join(" L ")} Z`).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${(value.minX - padding).toFixed(3)} ${(value.minY - padding).toFixed(3)} ${(value.width + padding * 2).toFixed(3)} ${(value.height + padding * 2).toFixed(3)}"><path d="${data}" fill="#101828" fill-rule="evenodd"/></svg>`;
}

function overlaps(left, right, padding = 0) {
  return !(left.maxX + padding < right.minX || right.maxX + padding < left.minX || left.maxY + padding < right.minY || right.maxY + padding < left.minY);
}

function components(contours) {
  const entries = contours.map((contour, index) => ({ contour, index, bounds: contourBounds([contour]) })).filter(({ bounds }) => bounds?.width > 0 && bounds?.height > 0);
  const parent = entries.map((_, index) => index);
  const find = (index) => parent[index] === index ? index : (parent[index] = find(parent[index]));
  const union = (left, right) => { const a = find(left); const b = find(right); if (a !== b) parent[b] = a; };
  for (let left = 0; left < entries.length; left += 1) for (let right = left + 1; right < entries.length; right += 1) if (overlaps(entries[left].bounds, entries[right].bounds, 0.01)) union(left, right);
  const groups = new Map(); entries.forEach((entry, index) => { const key = find(index); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(entry.contour); });
  return [...groups.values()];
}

function candidate(contours, index, selectionMode, warnings = []) {
  const rawBounds = contourBounds(contours); const normalized = normalizeContours(contours); const value = contourBounds(normalized);
  const pointCount = normalized.reduce((sum, contour) => sum + contour.points.length, 0);
  if (!value || normalized.length > MAX_CONTOURS || pointCount > MAX_POINTS) return null;
  const geometryHash = sha256(Buffer.from(JSON.stringify(normalized)));
  return { id: `candidate-${String(index + 1).padStart(3, "0")}-${geometryHash.slice(0, 10).toLowerCase()}`, suggestedName: selectionMode === "FULL_ARTWORK" ? "Complete opdruk" : "Cijfervorm", selectionMode, page: 1, selectionRef: `svg:geometry:${geometryHash}`, geometryHash, status: "REVIEW", boundsMm: { width: value.width, height: value.height }, aspectRatio: value.width / value.height, contourCount: normalized.length, pointCount, warnings, controlledVector: { format: "WBD_CONTOURS_V1", sourceOriginMm: { x: rawBounds.minX, y: rawBounds.minY }, contours: normalized }, previewSvg: previewSvg(normalized) };
}

function visualSignature(contours) {
  // Deliberately keep enough visual resolution to distinguish legitimately
  // different source glyphs (for example 6 and 9), while still collapsing
  // repeated instances of the exact same Illustrator outline.
  const value = contourBounds(contours); const resolution = 96;
  const inside = (point, polygon) => {
    let result = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current++) {
      const a = polygon[current]; const b = polygon[previous];
      if (((a.y > point.y) !== (b.y > point.y)) && point.x < ((b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || Number.EPSILON)) + a.x) result = !result;
    }
    return result;
  };
  const contourRasters = new Map();
  for (const contour of contours) {
    const bits = [];
    for (let row = 0; row < resolution; row += 1) for (let column = 0; column < resolution; column += 1) {
      const point = { x: value.minX + ((column + .5) / resolution) * value.width, y: value.minY + ((row + .5) / resolution) * value.height };
      bits.push(inside(point, contour.points) ? "1" : "0");
    }
    contourRasters.set(bits.join(""), bits);
  }
  const combined = Array.from({ length: resolution * resolution }, (_, index) => [...contourRasters.values()].reduce((filled, bits) => bits[index] === "1" ? !filled : filled, false) ? "1" : "0").join("");
  const aspectBucket = Math.round((value.width / value.height) / .01) * .01;
  return sha256(Buffer.from(`${aspectBucket.toFixed(2)}|${combined}`));
}

function numberGlyphCandidates(contours, sourceGroups, warnings) {
  const componentGroups = components(contours);
  // A source <g> can deliberately contain a complete multi-digit example.
  // Glyph review must never promote that composed example as one digit; use
  // only geometrically connected contour components and keep source groups as
  // immutable provenance/diagnostic evidence.
  const groups = componentGroups.filter((group) => { const value = contourBounds(group); return value?.width >= 0.5 && value.height >= 0.5 && value.width <= value.height; });
  const maximumHeight = Math.max(0, ...componentGroups.map((group) => contourBounds(group).height));
  const plausible = groups.filter((group) => { const value = contourBounds(group); return maximumHeight > 0 && value.height >= maximumHeight * 0.96 && value.height <= maximumHeight * 1.02; });
  const unique = new Map();
  for (const group of plausible) {
    const signature = visualSignature(group);
    if (!unique.has(signature)) unique.set(signature, group);
  }
  return [...unique.values()].map((group, index) => ({ ...candidate(group, index, "VECTOR_COMPONENT", warnings), reviewCategory: "NUMBER_GLYPH", normalReviewRepresentative: true, normalReviewAlternativeCount: 1 }));
}

function artworkGroupCandidates(contours, sourceGroups, warnings) {
  const fullBounds = contourBounds(contours);
  const usableGroups = sourceGroups
    .map((group) => ({ ...group, bounds: contourBounds(group.contours) }))
    .filter(({ bounds }) => bounds?.width >= 1 && bounds?.height >= 1)
    .filter(({ bounds }) => bounds.width * bounds.height >= fullBounds.width * fullBounds.height * 0.0025);
  const byId = new Map(usableGroups.map((group) => [group.id, group]));
  const roots = usableGroups.filter(({ parentGroupId }) => !parentGroupId || !byId.has(parentGroupId));
  const distinctChildren = (group) => {
    const seen = new Set();
    return usableGroups.filter(({ parentGroupId }) => parentGroupId === group.id).filter((child) => {
      const normalized = normalizeContours(child.contours);
      const hash = normalized.length ? sha256(Buffer.from(JSON.stringify(normalized))) : null;
      if (!hash || seen.has(hash)) return false;
      seen.add(hash);
      return true;
    });
  };
  let frontier = roots;
  // Illustrator commonly wraps a sheet once or twice before the actual logo
  // groups. Descend only through a single wrapper; stop at the first genuine
  // branch so nested letters/paths are never surfaced individually.
  while (frontier.length === 1) {
    const children = distinctChildren(frontier[0]);
    if (!children.length) break;
    frontier = children;
    if (frontier.length > 1) break;
  }
  if (frontier.length < 2 || frontier.length > 24) return [];
  return frontier.map((group, index) => ({
    ...candidate(group.contours, index + 1, "OBJECT_GROUP", warnings),
    suggestedName: `Mogelijke opdruk ${index + 1}`,
    reviewCategory: "ARTWORK_CANDIDATE",
    normalReviewRepresentative: true,
    normalReviewAlternativeCount: 1,
  })).filter(Boolean);
}

function parseSvg(source, intakeKind) {
  if (/<!ENTITY\b/iu.test(source) || /<!DOCTYPE[^>]*\[/iu.test(source)) throw svgError("De SVG bevat niet-toegestane XML-entiteiten.", "PRODUCTION_ASSET_SVG_ENTITY_UNSAFE");
  if (/<(?:script|foreignObject|iframe|object|embed|image|style|use|symbol|filter|mask|pattern)\b/iu.test(source)) throw svgError("De SVG bevat raster of niet-toegestane actieve/indirecte inhoud.", "PRODUCTION_ASSET_SVG_CONTENT_UNSAFE");
  const textCount = [...source.matchAll(/<text\b/giu)].length;
  if (textCount && intakeKind !== "NUMBER_SET") throw svgError("De SVG bevat tekst die niet als productiegeometrie kan worden gebruikt.", "PRODUCTION_ASSET_SVG_CONTENT_UNSAFE");
  if (/\son[a-z]+\s*=/iu.test(source) || /(?:href|xlink:href)\s*=/iu.test(source) || /url\s*\(/iu.test(source)) throw svgError("De SVG bevat een externe of actieve verwijzing.", "PRODUCTION_ASSET_SVG_REFERENCE_UNSAFE");
  const clean = source.replace(/<\?xml[^>]*>/giu, "").replace(/<!DOCTYPE[^>]*>/giu, "").replace(/<!--[\s\S]*?-->/gu, "");
  const stack = [{ tag: "root", matrix: [1, 0, 0, 1, 0, 0], hidden: false, contours: null, groupId: null }]; const contours = []; const sourceGroups = [];
  let nextGroupId = 1;
  let strokeCount = 0; let pathCount = 0; let transformCount = 0;
  for (const match of clean.matchAll(/<\s*(\/?)\s*([a-zA-Z][\w:.-]*)([^>]*)>/gu)) {
    const closing = Boolean(match[1]); const tag = match[2].toLowerCase(); const raw = match[3] ?? ""; const selfClosing = /\/\s*$/u.test(raw);
    if (!ALLOWED_TAGS.has(tag)) throw svgError(`SVG-element ${tag} wordt niet veilig ondersteund.`, "PRODUCTION_ASSET_SVG_ELEMENT_UNSUPPORTED");
    if (closing) {
      if (stack.length <= 1 || stack.at(-1).tag !== tag) throw svgError("De SVG-structuur is niet geldig gesloten.", "PRODUCTION_ASSET_SVG_XML_INVALID");
      const closed = stack.pop();
      if (closed.tag === "g" && closed.contours?.length) sourceGroups.push({ id: closed.groupId, parentGroupId: closed.parentGroupId, contours: closed.contours });
      continue;
    }
    const attrs = attributes(raw); if (attrs.style) throw svgError("Inline SVG-stijlen worden niet als productiecontract geaccepteerd.", "PRODUCTION_ASSET_SVG_STYLE_UNSUPPORTED");
    const parent = stack.at(-1); const local = transformMatrix(attrs.transform); if (attrs.transform) transformCount += 1;
    const matrix = multiply(parent.matrix, local); const hidden = parent.hidden || attrs.display === "none" || attrs.visibility === "hidden";
    if (GEOMETRY_TAGS.has(tag) && !hidden) {
      const fillVisible = (attrs.fill ?? "#000000").toLowerCase() !== "none";
      const strokeVisible = attrs.stroke && attrs.stroke.toLowerCase() !== "none";
      if (strokeVisible) strokeCount += 1;
      if (!fillVisible && strokeVisible) throw svgError("Een SVG met uitsluitend niet-uitgelijnde strokes is nog geen gesloten snijgeometrie.", "PRODUCTION_ASSET_SVG_STROKE_ONLY");
      const parsed = primitiveContours(tag, attrs, matrix, fillVisible); pathCount += 1; contours.push(...parsed);
      for (const entry of stack) if (entry.tag === "g") entry.contours.push(...parsed);
    }
    if (!selfClosing && !GEOMETRY_TAGS.has(tag) && !["title", "desc", "metadata"].includes(tag)) {
      const parentGroup = [...stack].reverse().find((entry) => entry.tag === "g");
      const groupId = tag === "g" ? `group-${nextGroupId++}` : null;
      stack.push({ tag, matrix, hidden, contours: tag === "g" ? [] : null, groupId, parentGroupId: tag === "g" ? parentGroup?.groupId ?? null : null });
    }
  }
  if (stack.length !== 1) throw svgError("De SVG-structuur is niet volledig gesloten.", "PRODUCTION_ASSET_SVG_XML_INVALID");
  const value = contourBounds(contours); const pointCount = contours.reduce((sum, contour) => sum + contour.points.length, 0);
  if (!value || !(value.width > 0) || !(value.height > 0) || contours.length > MAX_CONTOURS || pointCount > MAX_POINTS) throw svgError("De SVG bevat geen begrensde, veilig verwerkbare vectorgeometrie.", "PRODUCTION_ASSET_SVG_NO_GEOMETRY");
  const warnings = strokeCount ? ["STROKE_REQUIRES_REVIEW"] : [];
  const full = candidate(contours, 0, "FULL_ARTWORK", warnings);
  const glyphs = intakeKind === "NUMBER_SET" ? numberGlyphCandidates(contours, sourceGroups, warnings) : [];
  const artworks = intakeKind === "ARTWORK" ? artworkGroupCandidates(contours, sourceGroups, warnings) : [];
  return { contours, full, glyphs, artworks, evidence: { pathCount, contourCount: contours.length, pointCount, strokeCount, transformCount, sourceGroupCount: sourceGroups.length, artworkCandidateCount: artworks.length, textCount, excludedTextAnnotationCount: textCount, rasterCount: 0, scriptCount: 0, externalReferenceCount: 0, boundsMm: { width: value.width, height: value.height } } };
}

export function inspectProductionAssetSvg({ bytes, filename, mimeType = "image/svg+xml", intakeKind = "ARTWORK" }) {
  const sourceBytes = Buffer.from(bytes);
  if (!sourceBytes.length || sourceBytes.length > MAX_SOURCE_BYTES) throw svgError("Het SVG-bestand is leeg of groter dan 8 MB.", "PRODUCTION_ASSET_SOURCE_SIZE_INVALID", 413);
  const source = sourceBytes.toString("utf8");
  if (!/<svg\b/iu.test(source)) throw svgError("Het bestand bevat geen geldige SVG-root.", "PRODUCTION_ASSET_SVG_ROOT_MISSING");
  const kind = ["ARTWORK", "NUMBER_SET"].includes(intakeKind) ? intakeKind : "ARTWORK";
  const parsed = parseSvg(source, kind); const candidates = kind === "NUMBER_SET" ? parsed.glyphs : parsed.artworks.length ? parsed.artworks : [parsed.full];
  if (!candidates.length) throw svgError("De nummerset bevat geen eenduidig bruikbare complete cijferglyphs.", "PRODUCTION_ASSET_SVG_GLYPHS_MISSING");
  const sourceHash = sha256(sourceBytes);
  return {
    source: { filename: String(filename).slice(0, 180), mimeType, format: "SVG", sha256: sourceHash, sizeBytes: sourceBytes.length, immutable: true, documentMetadata: { svgVersion: source.match(/<svg\b[^>]*\bversion=["']([^"']+)/iu)?.[1] ?? null, generator: source.match(/Generator:\s*([^<\r\n]+)/iu)?.[1]?.trim() ?? null } },
    inspection: { engine: "WBD_PRODUCTION_ASSET_SVG_INTAKE_V1", engineVersion: "2", intakeKind: kind, candidateCount: candidates.length, rawCandidateCount: parsed.evidence.contourCount, glyphReviewCandidateCount: kind === "NUMBER_SET" ? candidates.length : 0, normalReviewCandidateCount: candidates.length, requiresHumanSelection: kind === "NUMBER_SET" || candidates.length > 1, geometryNeverAiGenerated: true, svg: parsed.evidence },
    documentPreviewSvg: previewSvg(normalizeContours(parsed.contours)),
    candidates,
  };
}
