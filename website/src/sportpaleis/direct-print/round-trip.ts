import { boundsForContours, samePoint, validateGeometry } from "./geometry.ts";
import { generateDmpl, parseDmpl } from "./dmpl.ts";
import type { BoundsMm, CutJob, VectorContour } from "./types.ts";

export const ROUND_TRIP_TOLERANCE_MM = 0.000_001;

export interface RoundTripReport {
  passed: boolean;
  toleranceMm: number;
  contourCountMatches: boolean;
  closureMatches: boolean;
  coordinatesMatch: boolean;
  boundsMatch: boolean;
  productionWidthMatches: boolean;
  duplicateLinesMatch: boolean;
  maxCoordinateDeltaMm: number;
  sourceBoundsMm: BoundsMm;
  parsedBoundsMm: BoundsMm;
  failures: readonly string[];
}

function closeEnough(left: number, right: number): boolean {
  return Math.abs(left - right) <= ROUND_TRIP_TOLERANCE_MM;
}

function boundsEqual(left: BoundsMm, right: BoundsMm): boolean {
  return closeEnough(left.minX, right.minX)
    && closeEnough(left.minY, right.minY)
    && closeEnough(left.maxX, right.maxX)
    && closeEnough(left.maxY, right.maxY)
    && closeEnough(left.width, right.width)
    && closeEnough(left.height, right.height);
}

function maxDelta(source: readonly VectorContour[], parsed: readonly VectorContour[]): number {
  let maximum = 0;
  for (let contourIndex = 0; contourIndex < source.length; contourIndex += 1) {
    const sourceContour = source[contourIndex];
    const parsedContour = parsed[contourIndex];
    if (!parsedContour || sourceContour.points.length !== parsedContour.points.length) return Number.POSITIVE_INFINITY;
    for (let pointIndex = 0; pointIndex < sourceContour.points.length; pointIndex += 1) {
      const sourcePoint = sourceContour.points[pointIndex];
      const parsedPoint = parsedContour.points[pointIndex];
      maximum = Math.max(
        maximum,
        Math.abs(sourcePoint.x - parsedPoint.x),
        Math.abs(sourcePoint.y - parsedPoint.y),
      );
    }
  }
  return maximum;
}

function duplicateCodes(contours: readonly VectorContour[]): string[] {
  return validateGeometry(contours).issues
    .filter(({ code }) => code === "DUPLICATE_CONTOUR" || code === "DUPLICATE_SEGMENT")
    .map(({ code }) => code)
    .sort();
}

export function validateDmplRoundTrip(job: CutJob): RoundTripReport {
  const source = job.productionGeometry.contours;
  const parsed = parseDmpl(generateDmpl(job).content).contours;
  const sourceBoundsMm = boundsForContours(source);
  const parsedBoundsMm = boundsForContours(parsed);
  const failures: string[] = [];
  const contourCountMatches = source.length === parsed.length;
  const closureMatches = contourCountMatches && source.every((contour, index) =>
    contour.closed === parsed[index].closed
    && samePoint(contour.points[0], contour.points.at(-1) ?? contour.points[0])
    === samePoint(parsed[index].points[0], parsed[index].points.at(-1) ?? parsed[index].points[0]));
  const maxCoordinateDeltaMm = maxDelta(source, parsed);
  const coordinatesMatch = maxCoordinateDeltaMm <= ROUND_TRIP_TOLERANCE_MM;
  const boundsMatch = boundsEqual(sourceBoundsMm, parsedBoundsMm);
  const productionWidthMatches = closeEnough(sourceBoundsMm.width, parsedBoundsMm.width);
  const duplicateLinesMatch = JSON.stringify(duplicateCodes(source)) === JSON.stringify(duplicateCodes(parsed));

  if (!contourCountMatches) failures.push("CONTOUR_COUNT");
  if (!closureMatches) failures.push("CLOSURE");
  if (!coordinatesMatch) failures.push("COORDINATES");
  if (!boundsMatch) failures.push("BOUNDS");
  if (!productionWidthMatches) failures.push("PRODUCTION_WIDTH");
  if (!duplicateLinesMatch) failures.push("DUPLICATE_LINES");

  return {
    passed: failures.length === 0,
    toleranceMm: ROUND_TRIP_TOLERANCE_MM,
    contourCountMatches,
    closureMatches,
    coordinatesMatch,
    boundsMatch,
    productionWidthMatches,
    duplicateLinesMatch,
    maxCoordinateDeltaMm,
    sourceBoundsMm,
    parsedBoundsMm,
    failures,
  };
}
