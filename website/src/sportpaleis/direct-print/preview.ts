import type { CutBatch, CutJob, VectorContour } from "./types.ts";

export interface ProductionPreview {
  cutJobId: string;
  foilColor: string;
  quantity: number;
  ready: boolean;
  widthMm: number;
  lengthMm: number;
  usedWidthMm: number;
  estimatedFoilLengthMm: number;
  components: readonly { label: string; sourceOrderId: string; printType: string }[];
  svg: string;
}

export interface ColorBatchPreview {
  cutBatchId: string;
  foilColor: string;
  objectCount: number;
  jobCount: number;
  usedWidthMm: number;
  estimatedFoilLengthMm: number;
  readyForPrinting: boolean;
  notReadyReasons: readonly string[];
  components: readonly { label: string; sourceOrderId: string; printType: string }[];
  jobs: readonly ProductionPreview[];
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function contourPath(contour: VectorContour): string {
  return contour.points.map((point, index) =>
    `${index === 0 ? "M" : "L"}${point.x.toFixed(3)} ${point.y.toFixed(3)}`).join(" ") + " Z";
}

export function createProductionPreview(job: CutJob): ProductionPreview {
  const width = job.productionArea.widthMm;
  const length = Math.max(job.productionArea.lengthMm, 1);
  const paths = job.productionGeometry.contours
    .map((contour) => `<path data-contour-id="${escapeXml(contour.id)}" d="${contourPath(contour)}"/>`)
    .join("");
  return {
    cutJobId: job.cutJobId,
    foilColor: job.material.foilColor,
    quantity: job.productionGeometry.groups.length,
    ready: job.status === "READY" && job.readyForPrinting,
    widthMm: width,
    lengthMm: length,
    usedWidthMm: job.nesting.usedWidthMm,
    estimatedFoilLengthMm: job.efficiency.usedFoilLengthMm,
    components: job.productionGeometry.groups.map(({ label, provenance }) => ({
      label,
      sourceOrderId: provenance.sourceOrderId,
      printType: provenance.printType,
    })),
    svg: `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Productiepreview ${escapeXml(job.cutJobId)}" viewBox="0 0 ${width} ${length}" width="${width}mm" height="${length}mm"><g fill="none" stroke="black" stroke-width="0.2" vector-effect="non-scaling-stroke">${paths}</g></svg>`,
  };
}

export function createColorBatchPreview(batch: CutBatch): ColorBatchPreview {
  const jobs = batch.jobs.map(createProductionPreview);
  return {
    cutBatchId: batch.cutBatchId,
    foilColor: batch.foilColor,
    objectCount: batch.objectIds.length,
    jobCount: jobs.length,
    usedWidthMm: Math.max(0, ...jobs.map(({ usedWidthMm }) => usedWidthMm)),
    estimatedFoilLengthMm: batch.efficiency.usedFoilLengthMm,
    readyForPrinting: batch.readyForPrinting,
    notReadyReasons: batch.notReadyReasons,
    components: jobs.flatMap(({ components }) => components),
    jobs,
  };
}
