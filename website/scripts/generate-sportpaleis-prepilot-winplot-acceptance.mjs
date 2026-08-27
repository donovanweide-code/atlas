import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createCutJobBatch, createProductionPreview, createReferencePieces, generateDmpl, validateDmplRoundTrip } from "../src/sportpaleis/direct-print/index.ts";

const outputDirectory = fileURLToPath(new URL("../../outputs/sportpaleis-prepilot-completion-20260811/", import.meta.url));
const createdAt = "2026-08-11T12:00:00.000Z";
const nesting = { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 };
const reference = Object.fromEntries(createReferencePieces().map((piece) => [piece.label.replace("Rugnummer ", ""), piece]));
const specs = [
  { id: "01", association: "Almere Pioneers", profile: "FFF englisch", kind: "Senior rugnummer", values: ["2"], ready: true },
  { id: "02", association: "Almere Pioneers", profile: "FFF englisch", kind: "Senior rugnummer", values: ["34"], ready: true },
  { id: "03", association: "Almere Pioneers", profile: "FFF englisch", kind: "Senior rugnummer", values: ["77"], ready: true },
  { id: "04", association: "Almere Pioneers", profile: "FFF englisch", kind: "Team-mix 2/34/77", values: ["2", "34", "77", "2", "34", "77"], ready: true },
  { id: "05", association: "A.S.C. Waterwijk", profile: "schluber / Spain", kind: "Senior rugnummer 22 cm", ready: false, gaps: ["Exact lokaal vectorbronbestand ontbreekt", "Snijcontour en fysieke output zijn niet gevalideerd"] },
  { id: "06", association: "Buitenhout MHC", profile: "Myriad Pro Bold / outline", kind: "Senior rugnummer 20 cm outline", ready: false, gaps: ["Buitenhout-bronmap ontbreekt lokaal", "Outline-contour en fysieke output zijn niet gevalideerd"] },
  { id: "07", association: "DCG", profile: "schluber", kind: "Initialen 3 cm", ready: false, gaps: ["Exact schluber-letterbestand/contour ontbreekt", "Fysieke initialen-output is niet gevalideerd"] },
  { id: "08", association: "MHC Lelystad", profile: "Myriad Pro Bold / outline", kind: "Zwart seniornummer 22 cm + naam 3,2 cm", ready: false, gaps: ["Lelystad-bronmap ontbreekt lokaal", "Combinatiecontour en fysieke output zijn niet gevalideerd"] },
  { id: "09", association: "FC Huizen", profile: "Spain", kind: "Shortnummer 7,5 cm + initialen 3 cm", ready: false, gaps: ["Exact Spain-letterbestand/contour ontbreekt", "Fysieke combinatie-output is niet gevalideerd"] },
  { id: "10", association: "HBSA", profile: "Viking-Normal", kind: "Naam 2 cm · geel", ready: false, gaps: ["Exact Viking-Normal-letterbestand/contour ontbreekt", "Gele naam-output is niet fysiek gevalideerd"] },
];

const manifest = { buildId: "SPW-PRE-PILOT-MASTER-CORRECTION-20260811", status: "PARTIAL_HUMAN_WINPLOT_REVIEW_REQUIRED", generatedAt: createdAt, physicalPlotPerformed: false, hardwareSendEnabled: false, requestedCases: 10, reliablePositiveCases: 4, blockedCases: 6, exactValidatedScope: "Almere Pioneers Senior-rugnummers 2, 34 en 77 op 200 mm; bestaande bevestigde contourbron", nesting, cases: [] };
await mkdir(outputDirectory, { recursive: true });

for (const spec of specs) {
  const stem = `case-${spec.id}-${spec.association.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  if (!spec.ready) {
    const blocked = { caseId: `WINPLOT-${spec.id}`, status: "BLOCKED_DATA_GAP", association: spec.association, profile: spec.profile, kind: spec.kind, dataGaps: spec.gaps, filesGenerated: [ `${stem}.blocked.json` ], safetyDecision: "Geen CutJob, DMPL, SVG of roundtrip gegenereerd; geometrie zou onbewezen zijn." };
    await writeFile(`${outputDirectory}/${stem}.blocked.json`, `${JSON.stringify(blocked, null, 2)}\n`, "utf8");
    manifest.cases.push(blocked);
    continue;
  }
  const orderId = `PREPILOT-PIONEERS-${spec.id}`;
  const pieces = spec.values.map((number, index) => ({ ...structuredClone(reference[number]), id: `${reference[number].id}-case-${spec.id}-${index + 1}`, sourceOrderId: orderId, label: `Rugnummer ${number} · acceptatiecase ${spec.id} · stuk ${index + 1}` }));
  const batchResult = createCutJobBatch({ organizationId: "sport-2000-sportpaleis-bv", orderId, revision: 1, attemptIdPrefix: `prepilot-winplot-${spec.id}`, createdAt, pieces, nesting });
  if (batchResult.jobs.length !== 1) throw new Error(`${orderId}: verwacht precies één witfoliebestand.`);
  const job = batchResult.jobs[0]; const dmpl = generateDmpl(job); const roundTrip = validateDmplRoundTrip(job); const preview = createProductionPreview(job);
  if (!roundTrip.passed || job.nesting.scaleApplied !== 1 || job.nesting.usedWidthMm > nesting.absoluteMaxWidthMm) throw new Error(`${orderId}: veilige geometriecontrole faalde.`);
  await Promise.all([writeFile(`${outputDirectory}/${stem}.dmpl.txt`, dmpl.content, "ascii"), writeFile(`${outputDirectory}/${stem}.preview.svg`, preview.svg, "utf8"), writeFile(`${outputDirectory}/${stem}.cutjob.json`, `${JSON.stringify(job, null, 2)}\n`, "utf8"), writeFile(`${outputDirectory}/${stem}.roundtrip.json`, `${JSON.stringify(roundTrip, null, 2)}\n`, "utf8")]);
  manifest.cases.push({ caseId: `WINPLOT-${spec.id}`, status: "READY_FOR_OFFLINE_HUMAN_REVIEW", association: spec.association, profile: spec.profile, kind: spec.kind, fictiveOrderId: orderId, material: "HTV-WHITE · Wit", numbers: spec.values, expectedPhysicalHeightMm: 200, expectedMirror: true, expectedBaseRotationDeg: 90, expectedScale: 1, expectedContours: job.productionGeometry.contours.length, roundTripPassed: roundTrip.passed, contentHash: job.contentHash, nestingStrategy: job.nesting.strategy, evaluatedCandidateCount: job.nesting.evaluatedCandidateCount, usedWidthMm: job.nesting.usedWidthMm, usedLengthMm: job.nesting.usedLengthMm, baselineUsedLengthMm: job.nesting.baselineUsedLengthMm, savedLengthVsBaselineMm: job.nesting.savedLengthVsBaselineMm, efficiencyPercent: batchResult.batches[0].efficiency.efficiencyPercent, wastedAreaMm2: batchResult.batches[0].efficiency.wastedAreaMm2, files: [ `${stem}.dmpl.txt`, `${stem}.preview.svg`, `${stem}.cutjob.json`, `${stem}.roundtrip.json` ], humanWinPlotExpectation: "Alleen offline openen en visueel/technisch controleren; niet plotten zonder afzonderlijke Human GO." });
}

await writeFile(`${outputDirectory}/EXPECTATION-MANIFEST.json`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(`${outputDirectory}/HUMAN-REVIEW.md`, `# WinPlot human review\n\nBuild: ${manifest.buildId}\n\nVan de tien representatieve cases zijn uitsluitend cases 01–04 betrouwbaar uitvoerbaar. Open alleen hun vier DMPL-bestanden offline. Cases 05–10 zijn DATA_GAP-cases en hebben bewust geen DMPL, CutJob, SVG of roundtrip.\n\nControleer voor 01–04 contouren, 200 mm hoogte, spiegeling, 1:1-schaal, draairichting, tussenruimte en praktisch foliegebruik. Er is geen hardwarekoppeling en geen fysieke plot uitgevoerd.\n`, "utf8");
console.log(JSON.stringify({ outputDirectory, requestedCases: specs.length, reliablePositiveCases: manifest.reliablePositiveCases, blockedCases: manifest.blockedCases, allReadyRoundTripsPassed: manifest.cases.filter(({ status }) => status === "READY_FOR_OFFLINE_HUMAN_REVIEW").every(({ roundTripPassed }) => roundTripPassed), hardwareSendEnabled: false, physicalPlotPerformed: false }, null, 2));
