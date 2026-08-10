import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  createCutJobBatch,
  createProductionPreview,
  createReferencePieces,
  generateDmpl,
  validateDmplRoundTrip,
} from "../src/sportpaleis/direct-print/index.ts";

const outputDirectory = fileURLToPath(new URL(
  "../../outputs/sportpaleis-direct-print-foundation-003/",
  import.meta.url,
));

const batch = createCutJobBatch({
  organizationId: "sport-2000-sportpaleis-bv",
  orderId: "SNIJTEST-001-REFERENCE",
  revision: 1,
  attemptIdPrefix: "offline-foundation-003",
  createdAt: "2026-08-07T12:00:00.000Z",
  pieces: createReferencePieces(),
  nesting: {
    absoluteMaxWidthMm: 450,
    preferredWorkingWidthMm: 440,
    minimumCutGapMm: 6.4,
    edgeMarginMm: 3,
  },
});

if (batch.jobs.length !== 1) throw new Error("Referentie moet één offline CutJob opleveren.");
const job = batch.jobs[0];
const dmpl = generateDmpl(job);
const roundTrip = validateDmplRoundTrip(job);
const preview = createProductionPreview(job);
if (!roundTrip.passed) throw new Error(`Round-trip faalde: ${roundTrip.failures.join(", ")}`);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(`${outputDirectory}/reference-2-34-77-cutjob.json`, `${JSON.stringify(job, null, 2)}\n`, "utf8"),
  writeFile(`${outputDirectory}/reference-2-34-77-preview.svg`, preview.svg, "utf8"),
  writeFile(`${outputDirectory}/reference-2-34-77.dmpl.txt`, dmpl.content, "ascii"),
  writeFile(`${outputDirectory}/reference-2-34-77-round-trip.json`, `${JSON.stringify(roundTrip, null, 2)}\n`, "utf8"),
  writeFile(`${outputDirectory}/FOUNDATION_STATUS.json`, `${JSON.stringify({
    foundation: "Sportpaleis Direct Print Foundation 003",
    hardwareSendEnabled: false,
    productionReady: false,
    hardwareValidationRequired: true,
    filesAreOfflineEvidenceOnly: true,
  }, null, 2)}\n`, "utf8"),
]);

console.log(JSON.stringify({
  outputDirectory,
  cutJobId: job.cutJobId,
  contentHash: job.contentHash,
  contours: job.productionGeometry.contours.length,
  groups: job.productionGeometry.groups.length,
  usedWidthMm: job.nesting.usedWidthMm,
  roundTripPassed: roundTrip.passed,
  productionReady: dmpl.productionReady,
}, null, 2));
