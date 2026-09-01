import { createHash } from "node:crypto";
import { create } from "fontkit";

import { boundsForContours, flattenSourcePath, samePoint, validateGeometry } from "./direct-print/geometry.ts";

const FONT_OUTLINE_TOLERANCE_MM = 0.02;
const MAX_POINTS_PER_PRODUCTION_PIECE = 150_000;
const MAX_PARSED_FONT_CACHE_ENTRIES = 16;
const MAX_MANAGED_FONT_GEOMETRY_CACHE_ENTRIES = 256;
const parsedFontCache = new Map();
const managedFontGeometryCache = new Map();

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function managedFontError(message, code = "PRODUCTION_FONT_INVALID") {
  return Object.assign(new Error(message), { statusCode: 409, code });
}

export function normalizeAndValidateManagedFontContours(contours) {
  const normalized = contours.map((contour) => ({
    ...contour,
    points: contour.points.filter((point, index, points) => index === 0 || !samePoint(point, points[index - 1])),
  }));
  const validation = validateGeometry(normalized);
  if (!validation.valid) {
    const error = managedFontError(
      "Dit productievoorstel kan nog niet worden voorbereid. Controleer de productiegegevens.",
      "PRODUCTION_FONT_GEOMETRY_INVALID",
    );
    error.geometryIssues = validation.issues.map(({ code, contourId }) => ({ code, contourId: contourId ?? null }));
    throw error;
  }
  return normalized;
}

function parseFont(bytes, identity = null) {
  try {
    if (identity && parsedFontCache.has(identity)) {
      const cached = parsedFontCache.get(identity);
      parsedFontCache.delete(identity);
      parsedFontCache.set(identity, cached);
      return cached;
    }
    const font = create(Buffer.from(bytes));
    if (!font || typeof font.layout !== "function" || !Number.isFinite(font.unitsPerEm) || font.unitsPerEm <= 0 || !Number.isInteger(font.numGlyphs) || font.numGlyphs < 1) {
      throw new Error("Fonttabellen ontbreken.");
    }
    if (identity) {
      parsedFontCache.set(identity, font);
      if (parsedFontCache.size > MAX_PARSED_FONT_CACHE_ENTRIES) parsedFontCache.delete(parsedFontCache.keys().next().value);
    }
    return font;
  } catch {
    throw managedFontError("De fontbron kan niet als zelfstandig outline-font worden gelezen.", "FONT_FILE_INVALID");
  }
}

export function validateManagedFontBytes(bytes) {
  const font = parseFont(bytes);
  let hasOutline = false;
  const probeCount = Math.min(font.numGlyphs, 128);
  for (let index = 0; index < probeCount; index += 1) {
    const glyph = font.getGlyph(index);
    if (glyph?.path?.commands?.some(({ command }) => command !== "moveTo" && command !== "closePath")) {
      hasOutline = true;
      break;
    }
  }
  if (!hasOutline) throw managedFontError("De fontbron bevat geen bruikbare vectorcontouren.", "FONT_FILE_INVALID");
  return Object.freeze({
    familyName: String(font.familyName ?? "").trim() || null,
    subfamilyName: String(font.subfamilyName ?? "").trim() || null,
    fullName: String(font.fullName ?? "").trim() || null,
    postscriptName: String(font.postscriptName ?? "").trim() || null,
    unitsPerEm: font.unitsPerEm,
    glyphCount: font.numGlyphs,
  });
}

/**
 * One admission proof for every uploaded production font. It intentionally
 * uses the same outline engine as physical output: a readable filename or an
 * installed OS font can never satisfy this boundary.
 */
export function inspectManagedFontAdmission(bytes, { representativeValues = ["MW", "SPORTPALEIS", "34"] } = {}) {
  const sourceBytes = Buffer.from(bytes);
  const sourceSha256 = sha256(sourceBytes);
  const metadata = validateManagedFontBytes(sourceBytes);
  const values = [...new Set(representativeValues.map((value) => String(value ?? "").trim()).filter(Boolean))];
  if (!values.length) throw managedFontError("Minimaal één representatieve productiewaarde is vereist.", "PRODUCTION_FONT_ADMISSION_VALUES_MISSING");
  const fontRecord = { id: `font-${sourceSha256.slice(0, 16).toLowerCase()}`, version: sourceSha256.slice(0, 12), sha256: sourceSha256, status: "TECHNICALLY_VALID" };
  const proofs = values.map((content, index) => {
    const first = createManagedFontProductionPiece({ fontRecord, bytes: sourceBytes, content, widthMm: 100, heightMm: 20, id: `admission-${index + 1}`, sourceOrderId: "ADMISSION", product: "Font admission", association: "Sportpaleis", foilColor: "Wit" });
    const second = createManagedFontProductionPiece({ fontRecord, bytes: sourceBytes, content, widthMm: 100, heightMm: 20, id: `admission-${index + 1}`, sourceOrderId: "ADMISSION", product: "Font admission", association: "Sportpaleis", foilColor: "Wit" });
    const normalized = (piece) => piece.contours.map(({ closed, points }) => ({ closed, points }));
    const firstHash = sha256(Buffer.from(JSON.stringify(normalized(first))));
    const secondHash = sha256(Buffer.from(JSON.stringify(normalized(second))));
    if (firstHash !== secondHash) throw managedFontError("De fontbron levert geen deterministische productiecontour.", "PRODUCTION_FONT_NON_DETERMINISTIC");
    return Object.freeze({ content, geometrySha256: firstHash, widthMm: first.requestedPhysicalSizeMm.widthMm, heightMm: first.requestedPhysicalSizeMm.heightMm });
  });
  return Object.freeze({
    sourceSha256,
    metadata,
    representativeProofs: Object.freeze(proofs),
    executabilitySha256: sha256(Buffer.from(JSON.stringify({ sourceSha256, metadata, proofs }))),
  });
}

function mapPoint(x, y, bounds, scale) {
  return { x: (x - bounds.minX) * scale, y: (bounds.maxY - y) * scale };
}

function positionedGlyphCommands(font, content) {
  for (const character of Array.from(content)) {
    const codePoint = character.codePointAt(0);
    if (!/^\s$/u.test(character) && (!Number.isInteger(codePoint) || !font.hasGlyphForCodePoint(codePoint))) {
      throw managedFontError(`De gekozen fontbron bevat geen glyph voor “${character}”.`, "PRODUCTION_FONT_GLYPH_MISSING");
    }
  }

  let run;
  try { run = font.layout(content); }
  catch { throw managedFontError("De tekst kan niet met de exact beheerde fontbron worden gezet."); }
  if (!run?.glyphs?.length || run.glyphs.length !== run.positions?.length) throw managedFontError("De fontbron leverde geen volledige glyph-run op.");

  let penX = 0;
  let penY = 0;
  const glyphs = [];
  const bounds = { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY };
  for (let index = 0; index < run.glyphs.length; index += 1) {
    const glyph = run.glyphs[index];
    const position = run.positions[index];
    const offsetX = penX + Number(position.xOffset ?? 0);
    const offsetY = penY + Number(position.yOffset ?? 0);
    const commands = glyph.path?.commands ?? [];
    const glyphBounds = glyph.path?.bbox;
    if (commands.length && glyphBounds && Number.isFinite(glyphBounds.minX) && glyphBounds.maxX > glyphBounds.minX && glyphBounds.maxY > glyphBounds.minY) {
      glyphs.push({ commands, offsetX, offsetY });
      bounds.minX = Math.min(bounds.minX, glyphBounds.minX + offsetX);
      bounds.minY = Math.min(bounds.minY, glyphBounds.minY + offsetY);
      bounds.maxX = Math.max(bounds.maxX, glyphBounds.maxX + offsetX);
      bounds.maxY = Math.max(bounds.maxY, glyphBounds.maxY + offsetY);
    }
    penX += Number(position.xAdvance ?? 0);
    penY += Number(position.yAdvance ?? 0);
  }
  if (!glyphs.length || !(bounds.maxX > bounds.minX) || !(bounds.maxY > bounds.minY)) throw managedFontError("De tekst levert geen bruikbare gesloten fontcontour op.");
  return { glyphs, bounds };
}

function contourCommands(commands, offsetX, offsetY, bounds, scale) {
  const contours = [];
  let current = [];
  let currentPoint = null;
  const mapped = (x, y) => mapPoint(x + offsetX, y + offsetY, bounds, scale);
  const finish = () => {
    if (current.length) contours.push(current);
    current = [];
    currentPoint = null;
  };

  for (const command of commands) {
    const args = command.args ?? [];
    if (command.command === "moveTo") {
      finish();
      currentPoint = mapped(args[0], args[1]);
      current.push({ type: "move", point: currentPoint });
    } else if (command.command === "lineTo") {
      currentPoint = mapped(args[0], args[1]);
      current.push({ type: "line", point: currentPoint });
    } else if (command.command === "quadraticCurveTo") {
      if (!currentPoint) throw managedFontError("De fontcontour bevat een curve zonder startpunt.");
      const control = mapped(args[0], args[1]);
      const point = mapped(args[2], args[3]);
      current.push({
        type: "cubic",
        control1: { x: currentPoint.x + (2 / 3) * (control.x - currentPoint.x), y: currentPoint.y + (2 / 3) * (control.y - currentPoint.y) },
        control2: { x: point.x + (2 / 3) * (control.x - point.x), y: point.y + (2 / 3) * (control.y - point.y) },
        point,
      });
      currentPoint = point;
    } else if (command.command === "bezierCurveTo") {
      const point = mapped(args[4], args[5]);
      current.push({ type: "cubic", control1: mapped(args[0], args[1]), control2: mapped(args[2], args[3]), point });
      currentPoint = point;
    } else if (command.command === "closePath") {
      current.push({ type: "close" });
      finish();
    } else {
      throw managedFontError(`Niet-ondersteunde fontcontouropdracht: ${command.command ?? "onbekend"}.`);
    }
  }
  finish();
  return contours;
}

function productionRotationForRequestedHeightAxis(requestedHeightAxis) {
  if (requestedHeightAxis === "SOURCE") return 0;
  if (requestedHeightAxis !== "REQUESTED_HEIGHT_AXIS_HORIZONTAL") throw managedFontError("Onbekende fysieke productieoriëntatie.");
  const sourceHeightAxis = { x: 0, y: 1 };
  const rotations = [0, 90, 180, 270];
  const rotateAxis = (rotation) => ({
    0: sourceHeightAxis,
    90: { x: -sourceHeightAxis.y, y: sourceHeightAxis.x },
    180: { x: -sourceHeightAxis.x, y: -sourceHeightAxis.y },
    270: { x: sourceHeightAxis.y, y: -sourceHeightAxis.x },
  })[rotation];
  const rotation = rotations.find((candidate) => {
    const axis = rotateAxis(candidate);
    return Math.abs(axis.x) === 1 && axis.y === 0;
  });
  if (rotation === undefined) throw managedFontError("De fysieke horizontale productierichting kan niet veilig worden bepaald.");
  return rotation;
}

export function createManagedFontProductionPiece({ fontRecord, bytes, content, widthMm, heightMm, id, sourceOrderId, product, association, foilColor, requestedHeightAxis = "SOURCE" }) {
  const sourceBytes = Buffer.from(bytes);
  const actualHash = sha256(sourceBytes);
  if (actualHash !== fontRecord.sha256 || fontRecord.status !== "TECHNICALLY_VALID") {
    throw managedFontError(`Fontbron ${fontRecord.id} wijkt af van de beheerde bronidentiteit.`, "PRODUCTION_FONT_HASH_MISMATCH");
  }
  if (!(Number(widthMm) > 0) || !(Number(heightMm) > 0)) throw managedFontError("Een productiefont vereist positieve fysieke afmetingen.");

  const geometryIdentity = JSON.stringify([actualHash, String(content), Number(heightMm), FONT_OUTLINE_TOLERANCE_MM]);
  let cachedGeometry = managedFontGeometryCache.get(geometryIdentity);
  let productionContours;
  let contourBounds;
  if (cachedGeometry) {
    managedFontGeometryCache.delete(geometryIdentity);
    managedFontGeometryCache.set(geometryIdentity, cachedGeometry);
    productionContours = cachedGeometry.contours.map(({ idSuffix, closed, points }) => ({ id: `${id}${idSuffix}`, closed, points }));
    contourBounds = cachedGeometry.bounds;
  } else {
    // Fontkit parsing and glyph flattening depend only on immutable source
    // bytes, content and physical height. Reusing that geometry avoids doing
    // the same contour work once per identical shirt while every returned
    // contour still receives its original order/copy-specific identity.
    const font = parseFont(sourceBytes, actualHash);
    const positioned = positionedGlyphCommands(font, content);
    // Physical text size is height-led. Applying one scale factor to both axes
    // preserves the exact font outline; width is a contour result, never an
    // independent text transform.
    const scale = Number(heightMm) / (positioned.bounds.maxY - positioned.bounds.minY);
    const contours = [];
    for (let glyphIndex = 0; glyphIndex < positioned.glyphs.length; glyphIndex += 1) {
      const glyph = positioned.glyphs[glyphIndex];
      const commandSets = contourCommands(glyph.commands, glyph.offsetX, glyph.offsetY, positioned.bounds, scale);
      for (let contourIndex = 0; contourIndex < commandSets.length; contourIndex += 1) {
        const contour = flattenSourcePath(`${id}-g${glyphIndex + 1}-c${contourIndex + 1}`, commandSets[contourIndex], FONT_OUTLINE_TOLERANCE_MM);
        if (contour.closed && contour.points.length >= 4) contours.push(contour);
      }
    }
    const sourcePointCount = contours.reduce((sum, contour) => sum + contour.points.length, 0);
    if (!contours.length || sourcePointCount > MAX_POINTS_PER_PRODUCTION_PIECE) throw managedFontError("De fontcontour is leeg of te complex voor veilige productie.");
    productionContours = normalizeAndValidateManagedFontContours(contours);
    contourBounds = boundsForContours(productionContours);
    if (!(contourBounds.width > 0) || !(contourBounds.height > 0)) throw managedFontError("De fontcontour heeft geen bruikbare fysieke afmetingen.");
    cachedGeometry = {
      bounds: Object.freeze({ ...contourBounds }),
      contours: Object.freeze(productionContours.map((contour) => Object.freeze({ idSuffix: contour.id.slice(String(id).length), closed: contour.closed, points: Object.freeze(contour.points.map((point) => Object.freeze({ ...point }))) }))),
    };
    managedFontGeometryCache.set(geometryIdentity, cachedGeometry);
    if (managedFontGeometryCache.size > MAX_MANAGED_FONT_GEOMETRY_CACHE_ENTRIES) managedFontGeometryCache.delete(managedFontGeometryCache.keys().next().value);
  }

  return {
    id,
    label: content,
    sourceOrderId,
    product,
    association,
    printType: "Beheerd productiefont",
    requestedPhysicalSizeMm: { widthMm: contourBounds.width, heightMm: contourBounds.height },
    sizing: { mode: "HEIGHT_UNIFORM", requestedHeightMm: Number(heightMm), derivedWidthMm: contourBounds.width, legacyRequestedWidthMm: Number(widthMm), requestedHeightAxis },
    vectorProfile: `${fontRecord.id}@${fontRecord.version}#${fontRecord.sha256}`,
    material: { code: `foil-${String(foilColor || "onbekend").toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/g, "-")}`, foilColor: foilColor || "Onbekend" },
    contours: productionContours,
    productionRule: { mirror: true, rotation: productionRotationForRequestedHeightAxis(requestedHeightAxis), allowedNestingRotations: [0, 90] },
  };
}
