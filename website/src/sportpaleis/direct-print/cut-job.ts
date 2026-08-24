import {
  boundsForContours,
  contourSetsConflict,
  quantizeMm,
  totalContourAreaMm2,
  transformContours,
  translateContours,
  validateGeometry,
} from "./geometry.ts";
import { sha256, stableJson } from "./sha256.ts";
import {
  CUT_JOB_STATUS,
  type CutBatch,
  type CutJob,
  type CutJobBatch,
  type CutJobRequest,
  type CutObject,
  type MaterialEfficiencyMetrics,
  type MaterialSpecification,
  type NestingConfiguration,
  type ProductionGroup,
  type RotationDegrees,
  type VectorContour,
} from "./types.ts";

interface PreparedOrientation {
  nestingRotation: RotationDegrees;
  contours: readonly VectorContour[];
  widthMm: number;
  heightMm: number;
}

interface PreparedObject {
  input: CutObject;
  sourceBoundsMm: ReturnType<typeof boundsForContours>;
  orientations: readonly PreparedOrientation[];
  sortWidthMm: number;
  sortHeightMm: number;
  sortAreaMm2: number;
}

interface PlacedObject {
  prepared: PreparedObject;
  orientation: PreparedOrientation;
  xMm: number;
  yMm: number;
  contours: readonly VectorContour[];
  boundsMm: ReturnType<typeof boundsForContours>;
}

interface NestSolution {
  sheets: readonly (readonly PlacedObject[])[];
  configuredWidthMm: number;
  totalLengthMm: number;
  evaluatedCandidateCount: number;
  signature: string;
}

function placementEnvelopesConflict(
  left: ReturnType<typeof boundsForContours>,
  right: ReturnType<typeof boundsForContours>,
  minimumGapMm: number,
): boolean {
  return !(left.maxX + minimumGapMm <= right.minX + 0.000_001
    || right.maxX + minimumGapMm <= left.minX + 0.000_001
    || left.maxY + minimumGapMm <= right.minY + 0.000_001
    || right.maxY + minimumGapMm <= left.minY + 0.000_001);
}

function compareNumberTuples(left: readonly number[], right: readonly number[]): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index] - right[index];
    if (difference !== 0) return difference;
  }
  return 0;
}

const NESTING_STRATEGY = "DETERMINISTIC_MULTI_HEURISTIC_CONTOUR_SAFE_NO_SCALE" as const;

function normalizedFoilColor(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl-NL");
}

function idPart(value: string): string {
  const slug = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("nl-NL").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "kleur";
}

function colorIdentifier(value: string): string {
  return `${idPart(value)}-${sha256(normalizedFoilColor(value)).slice(0, 8)}`;
}

function totalRotation(base: RotationDegrees, nesting: RotationDegrees): RotationDegrees {
  return ((base + nesting) % 360) as RotationDegrees;
}

function allowedNestingRotations(input: CutObject): readonly RotationDegrees[] {
  const rotations = input.productionRule.allowedNestingRotations ?? [0];
  const unique = [...new Set(rotations)].sort((left, right) => left - right);
  if (unique.length === 0 || unique.some((value) => ![0, 90, 180, 270].includes(value))) {
    throw new Error(`Ongeldige nestingrotaties voor ${input.id}.`);
  }
  return unique;
}

function validateNestingConfiguration(configuration: NestingConfiguration): void {
  if (configuration.absoluteMaxWidthMm !== 450) {
    throw new Error("Sportpaleis absoluteMaxWidthMm moet exact 450 mm zijn.");
  }
  if (configuration.preferredWorkingWidthMm <= 0
    || configuration.preferredWorkingWidthMm > configuration.absoluteMaxWidthMm) {
    throw new Error("preferredWorkingWidthMm moet tussen 0 en 450 mm liggen.");
  }
  if (!Number.isFinite(configuration.minimumCutGapMm) || configuration.minimumCutGapMm < 0
    || !Number.isFinite(configuration.edgeMarginMm) || configuration.edgeMarginMm < 0) {
    throw new Error("minimumCutGapMm en edgeMarginMm moeten eindige, niet-negatieve millimeterwaarden zijn.");
  }
  if (configuration.maxJobLengthMm !== undefined
    && (!Number.isFinite(configuration.maxJobLengthMm) || configuration.maxJobLengthMm <= 0)) {
    throw new Error("maxJobLengthMm moet een positieve millimeterwaarde zijn.");
  }
}

function prepareObject(input: CutObject): PreparedObject {
  const sourceValidation = validateGeometry(input.contours);
  if (!sourceValidation.valid) {
    throw new Error(`Ongeldige brongeometrie voor ${input.id}: ${sourceValidation.issues.map(({ code }) => code).join(", ")}`);
  }
  const baseContours = transformContours(
    input.contours,
    input.productionRule.mirror,
    input.productionRule.rotation,
  );
  const sourceBoundsMm = boundsForContours(baseContours);
  const orientations = allowedNestingRotations(input).map((nestingRotation) => {
    const contours = transformContours(baseContours, false, nestingRotation);
    const bounds = boundsForContours(contours);
    return {
      nestingRotation,
      contours,
      widthMm: quantizeMm(bounds.width),
      heightMm: quantizeMm(bounds.height),
    };
  });
  return {
    input,
    sourceBoundsMm,
    orientations,
    sortWidthMm: Math.max(...orientations.map(({ widthMm }) => widthMm)),
    sortHeightMm: Math.max(...orientations.map(({ heightMm }) => heightMm)),
    sortAreaMm2: quantizeMm(sourceBoundsMm.width * sourceBoundsMm.height),
  };
}

function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values.map(quantizeMm))].sort((left, right) => left - right);
}

function placementCandidates(
  sheet: readonly PlacedObject[],
  orientation: PreparedOrientation,
  configuration: NestingConfiguration,
  configuredWidthMm: number,
): readonly { x: number; y: number }[] {
  const edge = configuration.edgeMarginMm;
  const gap = configuration.minimumCutGapMm;
  // Bound contour-aware search for predictable daily performance. Larger or
  // highly detailed batches keep the proven envelope heuristic.
  const sourceContourAnchors = sheet.flatMap(({ contours }) => contours.flatMap(({ points }) => points));
  const contourAnchors = sheet.length < 8 && sourceContourAnchors.length <= 64 ? sourceContourAnchors : [];
  const xValues = uniqueSorted([
    edge,
    ...sheet.flatMap(({ boundsMm }) => [
      boundsMm.minX,
      boundsMm.maxX + gap,
      boundsMm.minX - orientation.widthMm - gap,
    ]),
    ...contourAnchors.flatMap(({ x }) => [
      x + gap,
      x - orientation.widthMm - gap,
    ]),
  ]).filter((x) => x >= edge && x + orientation.widthMm + edge <= configuredWidthMm + 0.000_001);
  const yValues = uniqueSorted([
    edge,
    ...sheet.flatMap(({ boundsMm }) => [
      boundsMm.minY,
      boundsMm.maxY + gap,
      boundsMm.minY - orientation.heightMm - gap,
    ]),
    ...contourAnchors.flatMap(({ y }) => [
      y + gap,
      y - orientation.heightMm - gap,
    ]),
  ]).filter((y) => y >= edge);

  return yValues.flatMap((y) => xValues.map((x) => ({ x, y })));
}

function tryPlace(
  prepared: PreparedObject,
  sheet: readonly PlacedObject[],
  configuration: NestingConfiguration,
  configuredWidthMm: number,
): { placement?: PlacedObject; evaluated: number } {
  let best: PlacedObject | undefined;
  let bestScore: readonly number[] | undefined;
  let evaluated = 0;
  const currentLength = sheet.reduce((maximum, placed) => Math.max(maximum, placed.boundsMm.maxY), 0);

  for (const orientation of prepared.orientations) {
    for (const candidate of placementCandidates(sheet, orientation, configuration, configuredWidthMm)) {
      evaluated += 1;
      const contours = translateContours(orientation.contours, candidate);
      const boundsMm = boundsForContours(contours);
      const jobLength = boundsMm.maxY + configuration.edgeMarginMm;
      if (configuration.maxJobLengthMm !== undefined
        && jobLength > configuration.maxJobLengthMm + 0.000_001) continue;
      // Only evaluate contour distance when physical envelopes meet. This
      // allows safe use of obvious empty contour regions without scaling,
      // rotating, or introducing a separate optimizer.
      if (sheet.some((placed) => placementEnvelopesConflict(boundsMm, placed.boundsMm, configuration.minimumCutGapMm)
        && contourSetsConflict(contours, placed.contours, configuration.minimumCutGapMm))) continue;

      const resultingLength = Math.max(currentLength, boundsMm.maxY);
      const resultingWidth = Math.max(
        boundsMm.maxX,
        ...sheet.map((placed) => placed.boundsMm.maxX),
      );
      const score = [resultingLength, resultingWidth, candidate.y, candidate.x, orientation.nestingRotation];
      if (!bestScore || compareNumberTuples(score, bestScore) < 0) {
        best = { prepared, orientation, xMm: candidate.x, yMm: candidate.y, contours, boundsMm };
        bestScore = score;
      }
    }
  }
  return { placement: best, evaluated };
}

function nestInOrder(
  ordered: readonly PreparedObject[],
  configuration: NestingConfiguration,
  configuredWidthMm: number,
): NestSolution | undefined {
  const sheets: PlacedObject[][] = [[]];
  let evaluatedCandidateCount = 0;
  for (const prepared of ordered) {
    let result = tryPlace(prepared, sheets.at(-1) ?? [], configuration, configuredWidthMm);
    evaluatedCandidateCount += result.evaluated;
    if (!result.placement && (sheets.at(-1)?.length ?? 0) > 0 && configuration.maxJobLengthMm !== undefined) {
      sheets.push([]);
      result = tryPlace(prepared, [], configuration, configuredWidthMm);
      evaluatedCandidateCount += result.evaluated;
    }
    if (!result.placement) return undefined;
    sheets.at(-1)?.push(result.placement);
  }
  const totalLengthMm = quantizeMm(sheets.reduce((total, sheet) => total + sheet.reduce(
    (maximum, placed) => Math.max(maximum, placed.boundsMm.maxY + configuration.edgeMarginMm),
    configuration.edgeMarginMm,
  ), 0));
  const signature = sheets.map((sheet) => sheet.map((placed) =>
    `${placed.prepared.input.id}@${placed.xMm},${placed.yMm},${placed.orientation.nestingRotation}`).join("|")).join("||");
  return { sheets, configuredWidthMm, totalLengthMm, evaluatedCandidateCount, signature };
}

function baselineShelf(
  ordered: readonly PreparedObject[],
  configuration: NestingConfiguration,
  configuredWidthMm: number,
): NestSolution | undefined {
  const sheets: PlacedObject[][] = [[]];
  let x = configuration.edgeMarginMm;
  let y = configuration.edgeMarginMm;
  let rowHeight = 0;
  for (const prepared of ordered) {
    const orientation = prepared.orientations[0];
    if (orientation.widthMm + configuration.edgeMarginMm * 2 > configuredWidthMm) return undefined;
    if (x > configuration.edgeMarginMm
      && x + orientation.widthMm + configuration.edgeMarginMm > configuredWidthMm) {
      x = configuration.edgeMarginMm;
      y = quantizeMm(y + rowHeight + configuration.minimumCutGapMm);
      rowHeight = 0;
    }
    if (configuration.maxJobLengthMm !== undefined
      && y + orientation.heightMm + configuration.edgeMarginMm > configuration.maxJobLengthMm
      && (sheets.at(-1)?.length ?? 0) > 0) {
      sheets.push([]);
      x = configuration.edgeMarginMm;
      y = configuration.edgeMarginMm;
      rowHeight = 0;
    }
    if (configuration.maxJobLengthMm !== undefined
      && y + orientation.heightMm + configuration.edgeMarginMm > configuration.maxJobLengthMm) return undefined;
    const contours = translateContours(orientation.contours, { x, y });
    const boundsMm = boundsForContours(contours);
    sheets.at(-1)?.push({ prepared, orientation, xMm: x, yMm: y, contours, boundsMm });
    x = quantizeMm(x + orientation.widthMm + configuration.minimumCutGapMm);
    rowHeight = Math.max(rowHeight, orientation.heightMm);
  }
  const totalLengthMm = quantizeMm(sheets.reduce((total, sheet) => total + sheet.reduce(
    (maximum, placed) => Math.max(maximum, placed.boundsMm.maxY + configuration.edgeMarginMm),
    configuration.edgeMarginMm,
  ), 0));
  return { sheets, configuredWidthMm, totalLengthMm, evaluatedCandidateCount: 1, signature: "baseline" };
}

function compareSolutions(left: NestSolution, right: NestSolution): number {
  return left.totalLengthMm - right.totalLengthMm
    || left.sheets.length - right.sheets.length
    || left.configuredWidthMm - right.configuredWidthMm
    || left.signature.localeCompare(right.signature);
}

function orderings(prepared: readonly PreparedObject[]): readonly (readonly PreparedObject[])[] {
  const byId = (left: PreparedObject, right: PreparedObject) => left.input.id.localeCompare(right.input.id);
  const candidates = [
    [...prepared].sort((left, right) => right.sortHeightMm - left.sortHeightMm || right.sortWidthMm - left.sortWidthMm || byId(left, right)),
    [...prepared].sort((left, right) => right.sortWidthMm - left.sortWidthMm || right.sortHeightMm - left.sortHeightMm || byId(left, right)),
    [...prepared].sort((left, right) => right.sortAreaMm2 - left.sortAreaMm2 || byId(left, right)),
    [...prepared].sort(byId),
  ];
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const signature = candidate.map(({ input }) => input.id).join("\u0000");
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

function optimizeNesting(
  prepared: readonly PreparedObject[],
  configuration: NestingConfiguration,
): { solution: NestSolution; baselineLengthMm: number } {
  const widths = [...new Set([
    configuration.preferredWorkingWidthMm,
    configuration.absoluteMaxWidthMm,
  ])].sort((left, right) => left - right);
  const arrangements = orderings(prepared);
  const baselines = widths.flatMap((width) => {
    const result = baselineShelf(arrangements[0], configuration, width);
    return result ? [result] : [];
  });
  const solutions = widths.flatMap((width) => arrangements.flatMap((arrangement) => {
    const result = nestInOrder(arrangement, configuration, width);
    return result ? [result] : [];
  }));
  if (baselines.length === 0 && solutions.length === 0) {
    throw new Error(`Geometrie past niet binnen de absolute productiebreedte van ${configuration.absoluteMaxWidthMm} mm en wordt niet geschaald.`);
  }
  const baseline = [...baselines].sort(compareSolutions)[0];
  const allCandidates = [...solutions, ...baselines].sort(compareSolutions);
  return {
    solution: allCandidates[0],
    baselineLengthMm: baseline?.totalLengthMm ?? allCandidates[0].totalLengthMm,
  };
}

function buildGroup(placed: PlacedObject, request: CutJobRequest): ProductionGroup {
  const input = placed.prepared.input;
  const rotations = allowedNestingRotations(input);
  return {
    id: `group-${input.id}`,
    label: input.label,
    sourcePieceId: input.id,
    provenance: {
      sourceObjectId: input.id,
      sourceOrderId: input.sourceOrderId ?? request.orderId,
      ...(input.association ? { association: input.association } : {}),
      printType: input.printType ?? input.product,
      product: input.product,
      ...(input.requestedPhysicalSizeMm ? { requestedPhysicalSizeMm: input.requestedPhysicalSizeMm } : {}),
      ...(input.vectorProfile ? { vectorProfile: input.vectorProfile } : {}),
      material: input.material,
      mirror: input.productionRule.mirror,
      baseRotation: input.productionRule.rotation,
      allowedNestingRotations: rotations,
    },
    mirrorApplied: input.productionRule.mirror,
    baseRotationApplied: input.productionRule.rotation,
    nestingRotationApplied: placed.orientation.nestingRotation,
    rotationApplied: totalRotation(input.productionRule.rotation, placed.orientation.nestingRotation),
    placementMm: { x: placed.xMm, y: placed.yMm },
    sourceBoundsMm: placed.prepared.sourceBoundsMm,
    boundsMm: placed.boundsMm,
    contours: placed.contours,
  };
}

function efficiencyMetrics(
  groups: readonly ProductionGroup[],
  configuredWidthMm: number,
  usedWidthMm: number,
  lengthMm: number,
  savedLengthVsBaselineMm: number,
): MaterialEfficiencyMetrics {
  const totalBoundingAreaMm2 = quantizeMm(groups.reduce(
    (total, group) => total + group.boundsMm.width * group.boundsMm.height,
    0,
  ));
  const totalContourArea = quantizeMm(totalContourAreaMm2(groups.flatMap(({ contours }) => contours)));
  const usedProductionAreaMm2 = quantizeMm(usedWidthMm * lengthMm);
  const estimatedFoilAreaMm2 = quantizeMm(configuredWidthMm * lengthMm);
  const wastedAreaMm2 = quantizeMm(Math.max(0, estimatedFoilAreaMm2 - totalBoundingAreaMm2));
  return {
    totalBoundingAreaMm2,
    totalContourAreaMm2: totalContourArea,
    usedProductionAreaMm2,
    estimatedFoilAreaMm2,
    usedFoilLengthMm: lengthMm,
    efficiencyPercent: estimatedFoilAreaMm2 === 0
      ? 0
      : Number((Math.min(1, totalBoundingAreaMm2 / estimatedFoilAreaMm2) * 100).toFixed(2)),
    wastedAreaMm2,
    wastedLengthIndicatorMm: configuredWidthMm === 0 ? 0 : quantizeMm(wastedAreaMm2 / configuredWidthMm),
    savedLengthVsBaselineMm,
  };
}

function combinedEfficiency(
  jobs: readonly CutJob[],
  savedLengthVsBaselineMm: number,
): MaterialEfficiencyMetrics {
  const totalBoundingAreaMm2 = quantizeMm(jobs.reduce((total, job) => total + job.efficiency.totalBoundingAreaMm2, 0));
  const totalContourAreaMm2 = quantizeMm(jobs.reduce((total, job) => total + job.efficiency.totalContourAreaMm2, 0));
  const usedProductionAreaMm2 = quantizeMm(jobs.reduce((total, job) => total + job.efficiency.usedProductionAreaMm2, 0));
  const estimatedFoilAreaMm2 = quantizeMm(jobs.reduce((total, job) => total + job.efficiency.estimatedFoilAreaMm2, 0));
  const wastedAreaMm2 = quantizeMm(Math.max(0, estimatedFoilAreaMm2 - totalBoundingAreaMm2));
  const usedFoilLengthMm = quantizeMm(jobs.reduce((total, job) => total + job.productionArea.lengthMm, 0));
  const widestJobMm = Math.max(0, ...jobs.map((job) => job.productionArea.widthMm));
  return {
    totalBoundingAreaMm2,
    totalContourAreaMm2,
    usedProductionAreaMm2,
    estimatedFoilAreaMm2,
    usedFoilLengthMm,
    efficiencyPercent: estimatedFoilAreaMm2 === 0
      ? 0
      : Number((Math.min(1, totalBoundingAreaMm2 / estimatedFoilAreaMm2) * 100).toFixed(2)),
    wastedAreaMm2,
    wastedLengthIndicatorMm: widestJobMm === 0 ? 0 : quantizeMm(wastedAreaMm2 / widestJobMm),
    savedLengthVsBaselineMm,
  };
}

function jobHashPayload(job: Omit<CutJob, "contentHash" | "status" | "createdAt">): unknown {
  return {
    schemaVersion: job.schemaVersion,
    organizationId: job.organizationId,
    orderId: job.orderId,
    revision: job.revision,
    product: job.product,
    association: job.association,
    material: job.material,
    materialCodes: job.materialCodes,
    units: job.units,
    productionGeometry: job.productionGeometry,
    nesting: job.nesting,
    efficiency: job.efficiency,
    productionArea: job.productionArea,
    readyForPrinting: job.readyForPrinting,
    notReadyReasons: job.notReadyReasons,
    hardwareValidation: job.hardwareValidation,
  };
}

function aggregateMaterial(objects: readonly CutObject[], foilColor: string): MaterialSpecification {
  const codes = [...new Set(objects.map(({ material }) => material.code))].sort();
  return {
    code: codes.join("+"),
    foilColor,
    description: `Foliekleur-batch: ${codes.join(", ")}`,
  };
}

function createJob(
  request: CutJobRequest,
  cutBatchId: string,
  foilColor: string,
  allObjects: readonly CutObject[],
  sheet: readonly PlacedObject[],
  sheetIndex: number,
  sheetCount: number,
  configuredWidthMm: number,
  baselineLengthMm: number,
  optimizedTotalLengthMm: number,
  evaluatedCandidateCount: number,
): CutJob {
  const groups = sheet.map((placed) => buildGroup(placed, request));
  const contours = groups.flatMap(({ contours: groupContours }) => groupContours);
  const boundsMm = boundsForContours(contours);
  // Every source contour was fully validated before nesting. Mirror, rotation
  // and translation preserve that validity, so the combined job only needs
  // the cross-group checks below plus its absolute production width.
  if (boundsMm.width > request.nesting.absoluteMaxWidthMm + 0.000_001) {
    throw new Error(`Geneste productiebreedte ${boundsMm.width.toFixed(3)} mm overschrijdt ${request.nesting.absoluteMaxWidthMm} mm.`);
  }
  for (let left = 0; left < groups.length; left += 1) {
    for (let right = left + 1; right < groups.length; right += 1) {
      if (placementEnvelopesConflict(groups[left].boundsMm, groups[right].boundsMm, request.nesting.minimumCutGapMm)
        && contourSetsConflict(groups[left].contours, groups[right].contours, request.nesting.minimumCutGapMm)) {
        throw new Error(`Geneste objecten ${groups[left].sourcePieceId} en ${groups[right].sourcePieceId} overlappen of schenden minimumCutGapMm.`);
      }
    }
  }
  const materialCodes = [...new Set(allObjects.map(({ material }) => material.code))].sort();
  const material = aggregateMaterial(allObjects, foilColor);
  const product = [...new Set(sheet.map(({ prepared }) => prepared.input.product))].join(" + ");
  const associations = [...new Set(sheet.map(({ prepared }) => prepared.input.association)
    .filter((value): value is string => Boolean(value)))];
  const usedWidthMm = quantizeMm(boundsMm.maxX + request.nesting.edgeMarginMm);
  const usedLengthMm = quantizeMm(boundsMm.maxY + request.nesting.edgeMarginMm);
  const savedLengthVsBaselineMm = quantizeMm(Math.max(0, baselineLengthMm - optimizedTotalLengthMm));
  const efficiency = efficiencyMetrics(groups, configuredWidthMm, usedWidthMm, usedLengthMm, 0);
  const partialJob: Omit<CutJob, "contentHash" | "status" | "createdAt"> = {
    schemaVersion: 2,
    cutJobId: `${cutBatchId}:job-${sheetIndex + 1}`,
    cutBatchId,
    organizationId: request.organizationId,
    orderId: request.orderId,
    revision: request.revision,
    attemptId: `${request.attemptIdPrefix}-${colorIdentifier(foilColor)}-${sheetIndex + 1}`,
    product,
    ...(associations.length ? { association: associations.join(" + ") } : {}),
    material,
    materialCodes,
    units: "mm",
    productionGeometry: { groups, contours, boundsMm },
    nesting: {
      strategy: NESTING_STRATEGY,
      sheetIndex,
      sheetCount,
      usedWidthMm,
      usedLengthMm,
      configuredWidthMm,
      minimumCutGapMm: request.nesting.minimumCutGapMm,
      scaleApplied: 1,
      baselineUsedLengthMm: baselineLengthMm,
      savedLengthVsBaselineMm,
      evaluatedCandidateCount,
    },
    efficiency,
    productionArea: {
      widthMm: configuredWidthMm,
      lengthMm: usedLengthMm,
      absoluteMaxWidthMm: request.nesting.absoluteMaxWidthMm,
    },
    readyForPrinting: true,
    notReadyReasons: [],
    hardwareValidation: {
      required: true,
      items: [
        "SummaUsb.dll/driver en logische USB-poort",
        "DM/PL-eindcommando en foliedoorvoer",
        "fysieke 1:1-maatvoering en snijkwaliteit",
      ],
    },
  };
  return {
    ...partialJob,
    contentHash: sha256(stableJson(jobHashPayload(partialJob))),
    createdAt: request.createdAt,
    status: CUT_JOB_STATUS.READY,
  };
}

function createColorBatch(
  request: CutJobRequest,
  foilColor: string,
  objects: readonly CutObject[],
): CutBatch {
  const prepared = objects.map(prepareObject);
  const { solution, baselineLengthMm } = optimizeNesting(prepared, request.nesting);
  const cutBatchId = `${request.organizationId}:${request.orderId}:r${request.revision}:color-${colorIdentifier(foilColor)}`;
  const jobs = solution.sheets.map((sheet, sheetIndex) => createJob(
    request,
    cutBatchId,
    foilColor,
    objects,
    sheet,
    sheetIndex,
    solution.sheets.length,
    solution.configuredWidthMm,
    baselineLengthMm,
    solution.totalLengthMm,
    solution.evaluatedCandidateCount,
  ));
  const savedLength = quantizeMm(Math.max(0, baselineLengthMm - solution.totalLengthMm));
  return {
    cutBatchId,
    organizationId: request.organizationId,
    foilColor,
    materialCodes: [...new Set(objects.map(({ material }) => material.code))].sort(),
    objectIds: objects.map(({ id }) => id),
    strategy: objects.length >= 8
      ? { classification: "LARGE", heuristic: "OBJECT_COUNT_GTE_8", objective: "COMBINED_PERSONALISATION_BATCH" }
      : { classification: "SMALL", heuristic: "OBJECT_COUNT_GTE_8", objective: "MINIMIZE_FOIL_LENGTH" },
    jobs,
    efficiency: combinedEfficiency(jobs, savedLength),
    readyForPrinting: jobs.every(({ readyForPrinting }) => readyForPrinting),
    notReadyReasons: [...new Set(jobs.flatMap(({ notReadyReasons }) => notReadyReasons))],
  };
}

export function createCutJobBatch(request: CutJobRequest): CutJobBatch {
  validateNestingConfiguration(request.nesting);
  if (request.revision < 1 || !Number.isInteger(request.revision)) {
    throw new Error("CutJob revision moet een positief geheel getal zijn.");
  }
  if (request.pieces.length === 0) throw new Error("Een productieplan vereist minimaal één CutObject.");
  if (new Set(request.pieces.map(({ id }) => id)).size !== request.pieces.length) {
    throw new Error("CutObject-ID's moeten binnen een productieplan uniek zijn.");
  }

  const colorGroups = new Map<string, { foilColor: string; objects: CutObject[] }>();
  for (const object of request.pieces) {
    const key = normalizedFoilColor(object.material.foilColor);
    if (!key) throw new Error(`Foliekleur ontbreekt voor ${object.id}.`);
    const group = colorGroups.get(key) ?? { foilColor: object.material.foilColor.trim(), objects: [] };
    group.objects.push(object);
    colorGroups.set(key, group);
  }

  const batches = [...colorGroups.entries()].sort(([left], [right]) => left.localeCompare(right))
    .map(([, group]) => createColorBatch(request, group.foilColor, group.objects));
  return {
    batchId: `${request.organizationId}:${request.orderId}:r${request.revision}`,
    organizationId: request.organizationId,
    orderId: request.orderId,
    revision: request.revision,
    batches,
    jobs: batches.flatMap(({ jobs }) => jobs),
  };
}

export function recomputeContentHash(job: CutJob): string {
  const { contentHash: _contentHash, status: _status, createdAt: _createdAt, ...partialJob } = job;
  return sha256(stableJson(jobHashPayload(partialJob)));
}
