import { boundsForContours, samePoint, validateGeometry } from "./geometry.ts";
import type { CutJob, PointMm, VectorContour } from "./types.ts";
import { SPORTPALEIS_MACHINE_CONSTRAINTS } from "./production-constraints.ts";

export const DMPL_UNITS_PER_MM = 40;
export const DMPL_MM_PER_UNIT = 0.025;

export interface DmplGenerationResult {
  format: "DMPL";
  content: string;
  bytes: Uint8Array;
  contourCount: number;
  endCommand: "@";
  endCommandStatus: "HARDWARE_VALIDATION_REQUIRED";
  productionReady: false;
}

function toUnit(valueMm: number): number {
  return Math.round(valueMm * DMPL_UNITS_PER_MM);
}

function vectorLine(command: "U" | "D", point: PointMm): string {
  return `${command}${toUnit(point.x)},${toUnit(point.y)}`;
}

export function generateDmpl(job: CutJob): DmplGenerationResult {
  if (job.units !== "mm") throw new Error("DM/PL-uitvoer accepteert uitsluitend millimeter-CutJobs.");
  const safeTrackWidthMm = job.productionArea.absoluteMaxWidthMm;
  if (!(safeTrackWidthMm > 0) || safeTrackWidthMm > SPORTPALEIS_MACHINE_CONSTRAINTS.maximumSafeTrackWidthMm) throw new Error("Ongeldige maximale veilige productiebreedte.");
  if (job.productionGeometry.boundsMm.width > safeTrackWidthMm) throw new Error(`CutJob overschrijdt ${safeTrackWidthMm} mm.`);
  const validation = validateGeometry(job.productionGeometry.contours, safeTrackWidthMm);
  if (!validation.valid) {
    throw new Error(`DM/PL geweigerd: ${validation.issues.map(({ code }) => code).join(", ")}`);
  }

  const lines = [
    ";:",
    "ECN",
    "A",
  ];
  for (const contour of job.productionGeometry.contours) {
    const first = contour.points[0];
    const last = contour.points.at(-1);
    if (!last || !samePoint(first, last)) throw new Error(`${contour.id} is niet gesloten.`);
    lines.push(vectorLine("U", first));
    for (const point of contour.points.slice(1)) lines.push(vectorLine("D", point));
    lines.push("U");
  }
  // @ deselecteert zonder bewust een productie-feedbeleid vast te leggen.
  // De keuze @/e blijft expliciet onderdeel van Hardware Validation 001.
  lines.push("@");
  const content = `${lines.join("\n")}\n`;
  return {
    format: "DMPL",
    content,
    bytes: new TextEncoder().encode(content),
    contourCount: job.productionGeometry.contours.length,
    endCommand: "@",
    endCommandStatus: "HARDWARE_VALIDATION_REQUIRED",
    productionReady: false,
  };
}

export interface ParsedDmpl {
  resolutionMm: 0.025;
  addressing: "ABSOLUTE";
  contours: readonly VectorContour[];
  boundsMm: ReturnType<typeof boundsForContours>;
  endCommand: "@";
}

function parseCoordinate(value: string): PointMm {
  const match = /^(-?\d+),(-?\d+)$/.exec(value);
  if (!match) throw new Error(`Ongeldige DM/PL-coördinaat: ${value}`);
  return {
    x: Number(match[1]) * DMPL_MM_PER_UNIT,
    y: Number(match[2]) * DMPL_MM_PER_UNIT,
  };
}

export function parseDmpl(content: string): ParsedDmpl {
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  let selected = false;
  let resolution = false;
  let absolute = false;
  let raised = true;
  let currentPoints: PointMm[] = [];
  const contours: VectorContour[] = [];
  let endCommand = false;

  const finishContour = (): void => {
    if (currentPoints.length === 0) return;
    const first = currentPoints[0];
    const last = currentPoints.at(-1) ?? first;
    contours.push({
      id: `parsed-${contours.length + 1}`,
      closed: samePoint(first, last),
      points: currentPoints,
    });
    currentPoints = [];
  };

  for (const line of lines) {
    if (line === ";:") {
      selected = true;
    } else if (line === "ECN") {
      if (!selected) throw new Error("ECN ontvangen voordat de cutter is geselecteerd.");
      resolution = true;
    } else if (line === "A") {
      absolute = true;
    } else if (line === "U") {
      raised = true;
      finishContour();
    } else if (/^U-?\d+,-?\d+$/.test(line)) {
      finishContour();
      raised = true;
      currentPoints.push(parseCoordinate(line.slice(1)));
    } else if (/^D-?\d+,-?\d+$/.test(line)) {
      if (!selected || !resolution || !absolute || currentPoints.length === 0) {
        throw new Error("D-vector zonder geldige initialisatie of startpositie.");
      }
      raised = false;
      currentPoints.push(parseCoordinate(line.slice(1)));
    } else if (line === "@") {
      finishContour();
      endCommand = true;
      selected = false;
    } else {
      throw new Error(`Niet-toegestaan of onbekend DM/PL-commando: ${line}`);
    }
  }

  finishContour();
  if (!resolution || !absolute || !endCommand || !raised) {
    throw new Error("Onvolledige of onveilig beëindigde DM/PL-opdracht.");
  }
  return {
    resolutionMm: 0.025,
    addressing: "ABSOLUTE",
    contours,
    boundsMm: boundsForContours(contours),
    endCommand: "@",
  };
}
