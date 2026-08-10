import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  createColorBatchPreview,
  createCutJobBatch,
  createProductionPreview,
  createReferencePieces,
  createWorkspaceProductionBatchContract,
  validateDmplRoundTrip,
} from "../src/sportpaleis/direct-print/index.ts";

const outputDirectory = fileURLToPath(new URL(
  "../../outputs/sportpaleis-direct-print-optimization-004/",
  import.meta.url,
));

function rectangle(id, widthMm, heightMm) {
  return {
    id,
    closed: true,
    points: [
      { x: 0, y: 0 },
      { x: widthMm, y: 0 },
      { x: widthMm, y: heightMm },
      { x: 0, y: heightMm },
      { x: 0, y: 0 },
    ],
  };
}

function syntheticObject(id, label, widthMm, heightMm, values) {
  return {
    id,
    label,
    sourceOrderId: values.sourceOrderId,
    product: values.printType,
    printType: values.printType,
    association: values.association,
    requestedPhysicalSizeMm: { widthMm, heightMm },
    vectorProfile: values.vectorProfile,
    material: values.material,
    contours: [rectangle(`contour-${id}`, widthMm, heightMm)],
    productionRule: {
      mirror: true,
      rotation: 0,
      allowedNestingRotations: values.allowedNestingRotations ?? [0],
    },
  };
}

const nesting = {
  absoluteMaxWidthMm: 450,
  preferredWorkingWidthMm: 440,
  minimumCutGapMm: 6.4,
  edgeMarginMm: 3,
};

const referencePlan = createCutJobBatch({
  organizationId: "sport-2000-sportpaleis-bv",
  orderId: "SNIJTEST-001-REFERENCE",
  revision: 1,
  attemptIdPrefix: "offline-optimization-004-reference",
  createdAt: "2026-08-07T12:00:00.000Z",
  pieces: createReferencePieces(),
  nesting,
});

const syntheticPlan = createCutJobBatch({
  organizationId: "sport-2000-sportpaleis-bv",
  orderId: "SYNTHETIC-MIX-004",
  revision: 1,
  attemptIdPrefix: "offline-optimization-004-synthetic",
  createdAt: "2026-08-07T12:00:00.000Z",
  pieces: [
    syntheticObject("white-initials", "Initialen BH", 30, 20, {
      sourceOrderId: "ORDER-BUITENHOUT",
      printType: "initialen",
      association: "Buitenhout",
      vectorProfile: "Initials Condensed",
      material: { code: "HTV-WHITE-A", foilColor: "Wit" },
      allowedNestingRotations: [0, 90],
    }),
    syntheticObject("white-number", "Rugnummer 12", 120, 200, {
      sourceOrderId: "ORDER-PIONEERS-REFERENCE",
      printType: "rugnummer",
      association: "Pioneers",
      vectorProfile: "Synthetic Number Profile",
      material: { code: "HTV-WHITE-B", foilColor: "WIT" },
    }),
    syntheticObject("white-name", "Naamregel TEST", 190, 28, {
      sourceOrderId: "ORDER-OTHER",
      printType: "naam",
      association: "Andere vereniging",
      vectorProfile: "Synthetic Name Profile",
      material: { code: "HTV-WHITE-A", foilColor: "Wit" },
    }),
    syntheticObject("black-short-number", "Shortnummer 8", 55, 70, {
      sourceOrderId: "ORDER-BLACK",
      printType: "shortnummer",
      association: "Andere vereniging",
      vectorProfile: "Synthetic Short Profile",
      material: { code: "HTV-BLACK", foilColor: "Zwart" },
    }),
  ],
  nesting,
});

const referenceRoundTrips = referencePlan.jobs.map(validateDmplRoundTrip);
if (referenceRoundTrips.some(({ passed }) => !passed)) {
  throw new Error("2/34/77 round-trip faalde in Optimization 004.");
}
const [referenceJob] = referencePlan.jobs;
const referencePreview = createProductionPreview(referenceJob);
const syntheticPreviews = syntheticPlan.batches.map(createColorBatchPreview);
const workspaceContracts = syntheticPlan.batches.map(createWorkspaceProductionBatchContract);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(`${outputDirectory}/reference-2-34-77-plan.json`, `${JSON.stringify(referencePlan, null, 2)}\n`, "utf8"),
  writeFile(`${outputDirectory}/reference-2-34-77-preview.svg`, referencePreview.svg, "utf8"),
  writeFile(`${outputDirectory}/reference-2-34-77-round-trips.json`, `${JSON.stringify(referenceRoundTrips, null, 2)}\n`, "utf8"),
  writeFile(`${outputDirectory}/synthetic-color-batches.json`, `${JSON.stringify(syntheticPlan, null, 2)}\n`, "utf8"),
  writeFile(`${outputDirectory}/synthetic-batch-previews.json`, `${JSON.stringify(syntheticPreviews, null, 2)}\n`, "utf8"),
  writeFile(`${outputDirectory}/workspace-contracts.json`, `${JSON.stringify(workspaceContracts, null, 2)}\n`, "utf8"),
  writeFile(`${outputDirectory}/OPTIMIZATION_STATUS.json`, `${JSON.stringify({
    optimization: "Sportpaleis Direct Print Optimization 004",
    batchingKey: "foilColor",
    minimumCutGapMm: nesting.minimumCutGapMm,
    minimumCutGapStatus: "TEMPORARY_OFFLINE_TEST_VALUE_REQUIRES_PHYSICAL_VALIDATION",
    absoluteMaxWidthMm: nesting.absoluteMaxWidthMm,
    preferredWorkingWidthMm: nesting.preferredWorkingWidthMm,
    hardwareSendEnabled: false,
    physicalValidationPerformed: false,
    readyForWorkspaceIntegration: true,
    readyForHardwareValidation: true,
    referenceRoundTripPassed: referenceRoundTrips.every(({ passed }) => passed),
  }, null, 2)}\n`, "utf8"),
]);

console.log(JSON.stringify({
  outputDirectory,
  referenceJobs: referencePlan.jobs.length,
  referenceObjects: referencePlan.batches[0].objectIds.length,
  referenceUsedLengthMm: referencePlan.batches[0].efficiency.usedFoilLengthMm,
  syntheticColorBatches: syntheticPlan.batches.length,
  syntheticJobs: syntheticPlan.jobs.length,
  syntheticObjects: syntheticPlan.batches.reduce((total, batch) => total + batch.objectIds.length, 0),
  hardwareSendEnabled: false,
}, null, 2));
