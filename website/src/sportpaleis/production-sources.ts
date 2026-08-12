import { boundsForContours, createReferencePieces } from "./direct-print/index.ts";
import type { CutPieceInput } from "./direct-print/types.ts";
import type { ProductionLineType, ProductionProofStatus } from "./workspace-data.ts";

export const CUTJOB_SVG_WRITER = Object.freeze({
  id: "cutjob-svg",
  version: "1",
  format: "SVG" as const,
  proofStatus: "GEOMETRY_VALIDATED" as ProductionProofStatus,
  physicalRouteStatus: "HUMAN_VALIDATION_REQUIRED" as const,
});

export const PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID = "pioneers-senior-rugnumber-200mm";

export interface ProductionSourceRequest {
  sourceSetId: string | null | undefined;
  outputWriterId: string | null | undefined;
  lineType: ProductionLineType;
  content: string;
  physicalHeightMm: number;
}

export interface ResolvedProductionSource {
  id: string;
  version: string;
  sourceSetId: string;
  geometryAdapterId: "direct-print-cut-piece";
  geometryAdapterVersion: "1";
  outputWriterId: string;
  outputWriterVersion: string;
  sourceProofStatus: ProductionProofStatus;
  outputProofStatus: ProductionProofStatus;
  authority: string;
  content: string;
  lineType: ProductionLineType;
  widthMm: number;
  heightMm: number;
  piece: CutPieceInput;
}

const PIONEERS_SOURCE_VERSION = "Sportpaleis-Snijtest-001";
const pioneersReferenceByContent = new Map(
  createReferencePieces().map((piece) => [piece.label.replace(/^Rugnummer\s+/u, ""), piece]),
);

const registeredSources: ResolvedProductionSource[] = [...pioneersReferenceByContent].map(([content, piece]) => {
  const bounds = boundsForContours(piece.contours);
  return {
    id: `pioneers-rugnummer-${content}-200mm`,
    version: PIONEERS_SOURCE_VERSION,
    sourceSetId: PIONEERS_SENIOR_NUMBER_SOURCE_SET_ID,
    geometryAdapterId: "direct-print-cut-piece",
    geometryAdapterVersion: "1",
    outputWriterId: CUTJOB_SVG_WRITER.id,
    outputWriterVersion: CUTJOB_SVG_WRITER.version,
    sourceProofStatus: "PHYSICALLY_VALIDATED",
    // De brongeometrie is fysiek bewezen. De dynamisch geschreven SVG is dat
    // niet automatisch; writer- en bronbewijs blijven bewust afzonderlijk.
    outputProofStatus: CUTJOB_SVG_WRITER.proofStatus,
    authority: "Pioneers nummers.ai → Sportpaleis-Snijtest-001-2-34-77.ai → Golden Physical Case/Batch 001",
    content,
    lineType: "NUMBER",
    widthMm: Math.round(bounds.width * 1_000) / 1_000,
    heightMm: Math.round(bounds.height * 1_000) / 1_000,
    piece,
  };
});

export function resolveProductionSource(request: ProductionSourceRequest): ResolvedProductionSource | null {
  if (!request.sourceSetId || !request.outputWriterId) return null;
  return registeredSources.find((source) =>
    source.sourceSetId === request.sourceSetId
    && source.outputWriterId === request.outputWriterId
    && source.lineType === request.lineType
    && source.content === request.content
    && Math.abs(source.heightMm - request.physicalHeightMm) <= 0.01,
  ) ?? null;
}

export function productionSourceByIdentity(id: string, version: string): ResolvedProductionSource | null {
  return registeredSources.find((source) => source.id === id && source.version === version) ?? null;
}

export function productionPieceFromSource(
  source: ResolvedProductionSource,
  overrides: { id: string; sourceOrderId: string; label: string; product?: string },
): CutPieceInput {
  return {
    ...structuredClone(source.piece),
    id: overrides.id,
    sourceOrderId: overrides.sourceOrderId,
    label: overrides.label,
    product: overrides.product ?? source.piece.product,
  };
}

export function availableProductionSourceIdentities(): Array<Omit<ResolvedProductionSource, "piece">> {
  return registeredSources.map(({ piece: _piece, ...source }) => ({ ...source }));
}
