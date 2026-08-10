import type {
  BoundsMm,
  GeometryValidationResult,
  PointMm,
  RotationDegrees,
  ValidationIssue,
  VectorContour,
} from "./types.ts";

export const DMPL_GRID_MM = 0.025;
export const GEOMETRY_EPSILON_MM = 0.000_001;

export function quantizeMm(value: number): number {
  return Number((Math.round(value / DMPL_GRID_MM) * DMPL_GRID_MM).toFixed(6));
}

export function quantizePoint(point: PointMm): PointMm {
  return { x: quantizeMm(point.x), y: quantizeMm(point.y) };
}

export function samePoint(
  left: PointMm,
  right: PointMm,
  toleranceMm = GEOMETRY_EPSILON_MM,
): boolean {
  return Math.abs(left.x - right.x) <= toleranceMm
    && Math.abs(left.y - right.y) <= toleranceMm;
}

export function boundsForPoints(points: readonly PointMm[]): BoundsMm {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function boundsForContours(contours: readonly VectorContour[]): BoundsMm {
  return boundsForPoints(contours.flatMap(({ points }) => points));
}

export function closeContour(contour: VectorContour): VectorContour {
  if (contour.points.length === 0) return { ...contour, closed: false };
  const points = contour.points.map(quantizePoint);
  const first = points[0];
  const last = points.at(-1);
  if (contour.closed && last && !samePoint(first, last)) points.push({ ...first });
  return { ...contour, points };
}

function rotatePoint(point: PointMm, rotation: RotationDegrees): PointMm {
  switch (rotation) {
    case 0:
      return { ...point };
    case 90:
      return { x: -point.y, y: point.x };
    case 180:
      return { x: -point.x, y: -point.y };
    case 270:
      return { x: point.y, y: -point.x };
  }
}

export function transformContours(
  contours: readonly VectorContour[],
  mirror: boolean,
  rotation: RotationDegrees,
): VectorContour[] {
  const inputBounds = boundsForContours(contours);
  const transformed = contours.map((contour) => ({
    ...contour,
    points: contour.points.map((point) => {
      const local = {
        x: point.x - inputBounds.minX,
        y: point.y - inputBounds.minY,
      };
      const mirrored = mirror
        ? { x: inputBounds.width - local.x, y: local.y }
        : local;
      return rotatePoint(mirrored, rotation);
    }),
  }));
  const transformedBounds = boundsForContours(transformed);

  return transformed.map((contour) => closeContour({
    ...contour,
    points: contour.points.map((point) => quantizePoint({
      x: point.x - transformedBounds.minX,
      y: point.y - transformedBounds.minY,
    })),
  }));
}

export function translateContours(
  contours: readonly VectorContour[],
  translation: PointMm,
): VectorContour[] {
  return contours.map((contour) => ({
    ...contour,
    points: contour.points.map((point) => quantizePoint({
      x: point.x + translation.x,
      y: point.y + translation.y,
    })),
  }));
}

export function signedAreaMm2(points: readonly PointMm[]): number {
  let area = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

export function contourAreaMm2(contour: VectorContour): number {
  return Math.abs(signedAreaMm2(contour.points));
}

export function totalContourAreaMm2(contours: readonly VectorContour[]): number {
  return contours.reduce((total, contour) => total + contourAreaMm2(contour), 0);
}

function orientation(a: PointMm, b: PointMm, c: PointMm): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function pointOnSegment(a: PointMm, b: PointMm, c: PointMm): boolean {
  return b.x <= Math.max(a.x, c.x) + GEOMETRY_EPSILON_MM
    && b.x + GEOMETRY_EPSILON_MM >= Math.min(a.x, c.x)
    && b.y <= Math.max(a.y, c.y) + GEOMETRY_EPSILON_MM
    && b.y + GEOMETRY_EPSILON_MM >= Math.min(a.y, c.y);
}

function segmentsIntersect(
  firstStart: PointMm,
  firstEnd: PointMm,
  secondStart: PointMm,
  secondEnd: PointMm,
): boolean {
  const first = orientation(firstStart, firstEnd, secondStart);
  const second = orientation(firstStart, firstEnd, secondEnd);
  const third = orientation(secondStart, secondEnd, firstStart);
  const fourth = orientation(secondStart, secondEnd, firstEnd);

  if ((first > 0 && second < 0 || first < 0 && second > 0)
    && (third > 0 && fourth < 0 || third < 0 && fourth > 0)) return true;
  if (Math.abs(first) <= GEOMETRY_EPSILON_MM && pointOnSegment(firstStart, secondStart, firstEnd)) return true;
  if (Math.abs(second) <= GEOMETRY_EPSILON_MM && pointOnSegment(firstStart, secondEnd, firstEnd)) return true;
  if (Math.abs(third) <= GEOMETRY_EPSILON_MM && pointOnSegment(secondStart, firstStart, secondEnd)) return true;
  return Math.abs(fourth) <= GEOMETRY_EPSILON_MM && pointOnSegment(secondStart, firstEnd, secondEnd);
}

function distancePointToSegment(point: PointMm, start: PointMm, end: PointMm): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= GEOMETRY_EPSILON_MM) return Math.hypot(point.x - start.x, point.y - start.y);
  const ratio = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + ratio * dx), point.y - (start.y + ratio * dy));
}

function segmentDistanceMm(
  firstStart: PointMm,
  firstEnd: PointMm,
  secondStart: PointMm,
  secondEnd: PointMm,
): number {
  if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) return 0;
  return Math.min(
    distancePointToSegment(firstStart, secondStart, secondEnd),
    distancePointToSegment(firstEnd, secondStart, secondEnd),
    distancePointToSegment(secondStart, firstStart, firstEnd),
    distancePointToSegment(secondEnd, firstStart, firstEnd),
  );
}

function pointInPolygon(point: PointMm, polygon: readonly PointMm[]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    const crosses = currentPoint.y > point.y !== previousPoint.y > point.y
      && point.x < (previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)
        / (previousPoint.y - currentPoint.y) + currentPoint.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function boundsSeparated(left: BoundsMm, right: BoundsMm, gapMm: number): boolean {
  return left.maxX + gapMm <= right.minX + GEOMETRY_EPSILON_MM
    || right.maxX + gapMm <= left.minX + GEOMETRY_EPSILON_MM
    || left.maxY + gapMm <= right.minY + GEOMETRY_EPSILON_MM
    || right.maxY + gapMm <= left.minY + GEOMETRY_EPSILON_MM;
}

/**
 * Conservatieve contourtest voor onafhankelijke objecten. Elke contour wordt
 * als massieve polygoon behandeld; compound-path-gaten leveren dus nooit een
 * onveilige optimalisatie op.
 */
export function contourSetsConflict(
  leftContours: readonly VectorContour[],
  rightContours: readonly VectorContour[],
  minimumGapMm: number,
): boolean {
  const leftBounds = boundsForContours(leftContours);
  const rightBounds = boundsForContours(rightContours);
  if (boundsSeparated(leftBounds, rightBounds, minimumGapMm)) return false;

  for (const left of leftContours) {
    const leftContourBounds = boundsForContours([left]);
    for (const right of rightContours) {
      const rightContourBounds = boundsForContours([right]);
      if (boundsSeparated(leftContourBounds, rightContourBounds, minimumGapMm)) continue;
      if (pointInPolygon(left.points[0], right.points)
        || pointInPolygon(right.points[0], left.points)) return true;
      for (let leftIndex = 0; leftIndex < left.points.length - 1; leftIndex += 1) {
        for (let rightIndex = 0; rightIndex < right.points.length - 1; rightIndex += 1) {
          const distance = segmentDistanceMm(
            left.points[leftIndex],
            left.points[leftIndex + 1],
            right.points[rightIndex],
            right.points[rightIndex + 1],
          );
          if (distance + GEOMETRY_EPSILON_MM < minimumGapMm
            || minimumGapMm === 0 && distance <= GEOMETRY_EPSILON_MM) return true;
        }
      }
    }
  }
  return false;
}

export function minimumContourSetDistanceMm(
  leftContours: readonly VectorContour[],
  rightContours: readonly VectorContour[],
): number {
  if (contourSetsConflict(leftContours, rightContours, 0)) return 0;
  let minimum = Number.POSITIVE_INFINITY;
  for (const left of leftContours) {
    for (const right of rightContours) {
      for (let leftIndex = 0; leftIndex < left.points.length - 1; leftIndex += 1) {
        for (let rightIndex = 0; rightIndex < right.points.length - 1; rightIndex += 1) {
          minimum = Math.min(minimum, segmentDistanceMm(
            left.points[leftIndex],
            left.points[leftIndex + 1],
            right.points[rightIndex],
            right.points[rightIndex + 1],
          ));
        }
      }
    }
  }
  return minimum;
}

function canonicalPoint(point: PointMm): string {
  return `${quantizeMm(point.x).toFixed(3)},${quantizeMm(point.y).toFixed(3)}`;
}

function canonicalCycle(points: readonly PointMm[]): string {
  const openPoints = samePoint(points[0], points.at(-1) ?? points[0])
    ? points.slice(0, -1)
    : [...points];
  if (openPoints.length === 0) return "";
  const sequences: string[] = [];
  for (const candidate of [openPoints, [...openPoints].reverse()]) {
    for (let offset = 0; offset < candidate.length; offset += 1) {
      sequences.push(candidate
        .slice(offset)
        .concat(candidate.slice(0, offset))
        .map(canonicalPoint)
        .join("|"));
    }
  }
  return sequences.sort()[0];
}

function canonicalSegment(left: PointMm, right: PointMm): string {
  return [canonicalPoint(left), canonicalPoint(right)].sort().join("|");
}

export function validateGeometry(
  contours: readonly VectorContour[],
  absoluteMaxWidthMm?: number,
): GeometryValidationResult {
  const issues: ValidationIssue[] = [];
  if (contours.length === 0) {
    issues.push({ code: "EMPTY_GEOMETRY", message: "De productiegeometrie bevat geen contouren." });
  }

  const contourSignatures = new Map<string, string>();
  const segmentOwners = new Map<string, string>();

  for (const contour of contours) {
    if (contour.points.some(({ x, y }) => !Number.isFinite(x) || !Number.isFinite(y))) {
      issues.push({ code: "INVALID_COORDINATE", contourId: contour.id, message: `${contour.id} bevat een ongeldige coördinaat.` });
      continue;
    }
    if (!contour.closed || contour.points.length < 4 || !samePoint(contour.points[0], contour.points.at(-1) ?? contour.points[0])) {
      issues.push({ code: "OPEN_CONTOUR", contourId: contour.id, message: `${contour.id} is niet gesloten.` });
      continue;
    }
    if (Math.abs(signedAreaMm2(contour.points)) <= GEOMETRY_EPSILON_MM) {
      issues.push({ code: "ZERO_AREA", contourId: contour.id, message: `${contour.id} heeft geen bruikbaar oppervlak.` });
    }

    const contourSignature = canonicalCycle(contour.points);
    const existingContour = contourSignatures.get(contourSignature);
    if (existingContour) {
      issues.push({ code: "DUPLICATE_CONTOUR", contourId: contour.id, message: `${contour.id} dupliceert ${existingContour}.` });
    } else {
      contourSignatures.set(contourSignature, contour.id);
    }

    const segmentCount = contour.points.length - 1;
    for (let index = 0; index < segmentCount; index += 1) {
      const start = contour.points[index];
      const end = contour.points[index + 1];
      const segmentSignature = canonicalSegment(start, end);
      const owner = segmentOwners.get(segmentSignature);
      if (owner) {
        issues.push({ code: "DUPLICATE_SEGMENT", contourId: contour.id, message: `${contour.id} bevat een dubbele snijlijn uit ${owner}.` });
      } else {
        segmentOwners.set(segmentSignature, contour.id);
      }

      for (let other = index + 1; other < segmentCount; other += 1) {
        if (other === index + 1 || index === 0 && other === segmentCount - 1) continue;
        if (segmentsIntersect(start, end, contour.points[other], contour.points[other + 1])) {
          issues.push({ code: "SELF_INTERSECTION", contourId: contour.id, message: `${contour.id} kruist zichzelf.` });
          break;
        }
      }
    }
  }

  if (absoluteMaxWidthMm !== undefined) {
    const bounds = boundsForContours(contours);
    if (bounds.width > absoluteMaxWidthMm + GEOMETRY_EPSILON_MM) {
      issues.push({ code: "WIDTH_EXCEEDED", message: `Productiebreedte ${bounds.width.toFixed(3)} mm overschrijdt ${absoluteMaxWidthMm} mm.` });
    }
  }

  return { valid: issues.length === 0, issues };
}

export type SourcePathCommand =
  | { type: "move"; point: PointMm }
  | { type: "line"; point: PointMm }
  | { type: "cubic"; control1: PointMm; control2: PointMm; point: PointMm }
  | { type: "close" };

function distancePointToLine(point: PointMm, start: PointMm, end: PointMm): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) <= GEOMETRY_EPSILON_MM && Math.abs(dy) <= GEOMETRY_EPSILON_MM) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  return Math.abs(dy * point.x - dx * point.y + end.x * start.y - end.y * start.x)
    / Math.hypot(dx, dy);
}

function midpoint(left: PointMm, right: PointMm): PointMm {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function flattenCubic(
  start: PointMm,
  control1: PointMm,
  control2: PointMm,
  end: PointMm,
  toleranceMm: number,
  output: PointMm[],
): void {
  const flatness = Math.max(
    distancePointToLine(control1, start, end),
    distancePointToLine(control2, start, end),
  );
  if (flatness <= toleranceMm) {
    output.push(end);
    return;
  }
  const startControl = midpoint(start, control1);
  const controls = midpoint(control1, control2);
  const controlEnd = midpoint(control2, end);
  const leftControl = midpoint(startControl, controls);
  const rightControl = midpoint(controls, controlEnd);
  const split = midpoint(leftControl, rightControl);
  flattenCubic(start, startControl, leftControl, split, toleranceMm, output);
  flattenCubic(split, rightControl, controlEnd, end, toleranceMm, output);
}

export function flattenSourcePath(
  id: string,
  commands: readonly SourcePathCommand[],
  toleranceMm = 0.01,
): VectorContour {
  const points: PointMm[] = [];
  let current: PointMm | undefined;
  let start: PointMm | undefined;
  let closed = false;

  for (const command of commands) {
    if (command.type === "move") {
      current = command.point;
      start = command.point;
      points.push(command.point);
    } else if (command.type === "line") {
      current = command.point;
      points.push(command.point);
    } else if (command.type === "cubic") {
      if (!current) throw new Error(`Cubic zonder startpunt in ${id}.`);
      flattenCubic(current, command.control1, command.control2, command.point, toleranceMm, points);
      current = command.point;
    } else if (command.type === "close") {
      if (start && !samePoint(points.at(-1) ?? start, start)) points.push(start);
      closed = true;
    }
  }

  return closeContour({ id, closed, points });
}
