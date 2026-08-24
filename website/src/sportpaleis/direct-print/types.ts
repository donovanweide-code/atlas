export const CUT_JOB_STATUS = {
  CREATED: "CREATED",
  VALIDATED: "VALIDATED",
  READY: "READY",
  CLAIMED: "CLAIMED",
  RECEIVED: "RECEIVED",
  SENDING: "SENDING",
  SENT: "SENT",
  UNKNOWN_PARTIAL_SEND: "UNKNOWN_PARTIAL_SEND",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
} as const;

export type CutJobStatus =
  (typeof CUT_JOB_STATUS)[keyof typeof CUT_JOB_STATUS];

export const BRIDGE_STATUS = {
  NOT_CONNECTED: "NOT_CONNECTED",
  CONNECTED: "CONNECTED",
  READY: "READY",
  BUSY: "BUSY",
  OFFLINE: "OFFLINE",
  JOB_RECEIVED: "JOB_RECEIVED",
  SENT: "SENT",
  UNKNOWN_PARTIAL_SEND: "UNKNOWN_PARTIAL_SEND",
  ERROR: "ERROR",
} as const;

export type BridgeStatus =
  (typeof BRIDGE_STATUS)[keyof typeof BRIDGE_STATUS];

export type RotationDegrees = 0 | 90 | 180 | 270;

export interface PointMm {
  x: number;
  y: number;
}

export interface BoundsMm {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface VectorContour {
  id: string;
  closed: boolean;
  points: readonly PointMm[];
}

export interface MaterialSpecification {
  code: string;
  foilColor: string;
  description?: string;
}

export interface ProductionRule {
  mirror: boolean;
  /** Vaste productrotatie, vóór de nestingrotatie. */
  rotation: RotationDegrees;
  /** Toegestane extra nestingrotaties. Afwezig betekent uitsluitend 0°. */
  allowedNestingRotations?: readonly RotationDegrees[];
}

export interface RequestedPhysicalSizeMm {
  widthMm?: number;
  heightMm?: number;
}

/** Eén zelfstandig te produceren orderonderdeel. */
export interface CutObject {
  id: string;
  label: string;
  sourceOrderId?: string;
  product: string;
  printType?: string;
  association?: string;
  requestedPhysicalSizeMm?: RequestedPhysicalSizeMm;
  vectorProfile?: string;
  material: MaterialSpecification;
  contours: readonly VectorContour[];
  productionRule: ProductionRule;
}

/** Compatibiliteitsnaam voor Foundation 003-consumenten. */
export type CutPieceInput = CutObject;

export interface CutObjectProvenance {
  sourceObjectId: string;
  sourceOrderId: string;
  association?: string;
  printType: string;
  product: string;
  requestedPhysicalSizeMm?: RequestedPhysicalSizeMm;
  vectorProfile?: string;
  material: MaterialSpecification;
  mirror: boolean;
  baseRotation: RotationDegrees;
  allowedNestingRotations: readonly RotationDegrees[];
}

export interface ProductionGroup {
  id: string;
  label: string;
  sourcePieceId: string;
  provenance: CutObjectProvenance;
  mirrorApplied: boolean;
  baseRotationApplied: RotationDegrees;
  nestingRotationApplied: RotationDegrees;
  rotationApplied: RotationDegrees;
  placementMm: PointMm;
  sourceBoundsMm: BoundsMm;
  boundsMm: BoundsMm;
  contours: readonly VectorContour[];
}

export interface ProductionGeometry {
  groups: readonly ProductionGroup[];
  contours: readonly VectorContour[];
  boundsMm: BoundsMm;
}

export interface NestingConfiguration {
  absoluteMaxWidthMm: number;
  preferredWorkingWidthMm: number;
  minimumCutGapMm: number;
  edgeMarginMm: number;
  maxJobLengthMm?: number;
}

export interface NestingResult {
  strategy: "DETERMINISTIC_MULTI_HEURISTIC_CONTOUR_SAFE_NO_SCALE";
  sheetIndex: number;
  sheetCount: number;
  usedWidthMm: number;
  usedLengthMm: number;
  configuredWidthMm: number;
  minimumCutGapMm: number;
  scaleApplied: 1;
  baselineUsedLengthMm: number;
  savedLengthVsBaselineMm: number;
  evaluatedCandidateCount: number;
}

export interface MaterialEfficiencyMetrics {
  totalBoundingAreaMm2: number;
  totalContourAreaMm2: number;
  usedProductionAreaMm2: number;
  estimatedFoilAreaMm2: number;
  usedFoilLengthMm: number;
  efficiencyPercent: number;
  wastedAreaMm2: number;
  wastedLengthIndicatorMm: number;
  savedLengthVsBaselineMm: number;
}

export interface ProductionArea {
  widthMm: number;
  lengthMm: number;
  absoluteMaxWidthMm: number;
}

export interface HardwareValidationBoundary {
  required: true;
  items: readonly string[];
}

/** Eén fysieke snijopdracht op één moment. */
export interface CutJob {
  schemaVersion: 2;
  cutJobId: string;
  cutBatchId: string;
  organizationId: string;
  orderId: string;
  revision: number;
  attemptId: string;
  product: string;
  association?: string;
  material: MaterialSpecification;
  materialCodes: readonly string[];
  units: "mm";
  productionGeometry: ProductionGeometry;
  nesting: NestingResult;
  efficiency: MaterialEfficiencyMetrics;
  productionArea: ProductionArea;
  contentHash: string;
  createdAt: string;
  status: CutJobStatus;
  readyForPrinting: boolean;
  notReadyReasons: readonly string[];
  hardwareValidation: HardwareValidationBoundary;
}

/** Alle compatibele objecten met dezelfde foliekleur. */
export interface CutBatch {
  cutBatchId: string;
  organizationId: string;
  foilColor: string;
  materialCodes: readonly string[];
  objectIds: readonly string[];
  strategy: {
    classification: "SMALL" | "LARGE";
    heuristic: "OBJECT_COUNT_GTE_8";
    objective: "MINIMIZE_FOIL_LENGTH" | "COMBINED_PERSONALISATION_BATCH";
  };
  jobs: readonly CutJob[];
  efficiency: MaterialEfficiencyMetrics;
  readyForPrinting: boolean;
  notReadyReasons: readonly string[];
}

/** Productieplan met kleur-batches en de afgeplatte joblijst. */
export interface CutJobBatch {
  batchId: string;
  organizationId: string;
  orderId: string;
  revision: number;
  batches: readonly CutBatch[];
  jobs: readonly CutJob[];
}

export interface CutJobRequest {
  organizationId: string;
  orderId: string;
  revision: number;
  attemptIdPrefix: string;
  createdAt: string;
  pieces: readonly CutObject[];
  nesting: NestingConfiguration;
}

export interface ValidationIssue {
  code:
    | "OPEN_CONTOUR"
    | "DUPLICATE_CONTOUR"
    | "DUPLICATE_SEGMENT"
    | "INVALID_COORDINATE"
    | "ZERO_AREA"
    | "SELF_INTERSECTION"
    | "WIDTH_EXCEEDED"
    | "EMPTY_GEOMETRY";
  message: string;
  contourId?: string;
}

export interface GeometryValidationResult {
  valid: boolean;
  issues: readonly ValidationIssue[];
}
