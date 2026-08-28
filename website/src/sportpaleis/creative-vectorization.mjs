import { createHash } from "node:crypto";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { convertBuffer } from "@visioncortex/vtracer";

import { inspectProductionAssetSvg } from "./production-assets-svg.mjs";

const MAX_BYTES = 8 * 1024 * 1024;
const SUPPORTED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"]);

export const CREATIVE_VECTOR_ENGINES = Object.freeze([
  Object.freeze({ id: "VTRACER_WASM_1_0_0_ALPHA_3", route: "ACTIVE_SELF_HOSTED", license: "MIT OR Apache-2.0", externalCost: 0, dataLeavesWorkspace: false }),
  Object.freeze({ id: "VECTORIZER_AI_API", route: "OPTIONAL_COMMERCIAL_BENCHMARK", license: "Commercial service", externalCost: "CREDIT_BASED", dataLeavesWorkspace: true }),
  Object.freeze({ id: "ADOBE_ILLUSTRATOR_IMAGE_TRACE", route: "HUMAN_QUALITY_BENCHMARK", license: "Adobe subscription", externalCost: "SUBSCRIPTION", dataLeavesWorkspace: false }),
]);

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const error = (message, code) => Object.assign(new Error(message), { statusCode: 400, code });
const quantizedColor = (red, green, blue, alpha) => `${red >> 4}:${green >> 4}:${blue >> 4}:${alpha >> 6}`;

async function rasterFacts(bytes) {
  const image = await loadImage(bytes);
  if (!(image.width > 0) || !(image.height > 0)) throw error("De afbeelding heeft geen bruikbare afmetingen.", "CREATIVE_VECTOR_IMAGE_INVALID");
  const sampleWidth = Math.min(240, image.width);
  const sampleHeight = Math.max(1, Math.round(image.height * sampleWidth / image.width));
  const canvas = createCanvas(sampleWidth, sampleHeight);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, sampleWidth, sampleHeight);
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  const colors = new Set();
  let transparent = 0;
  let grayscale = 0;
  let opaque = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const [red, green, blue, alpha] = pixels.slice(index, index + 4);
    if (alpha < 24) { transparent += 1; continue; }
    opaque += 1;
    if (Math.max(red, green, blue) - Math.min(red, green, blue) < 18) grayscale += 1;
    if (colors.size < 513) colors.add(quantizedColor(red, green, blue, alpha));
  }
  return {
    width: image.width,
    height: image.height,
    aspectRatio: Number((image.width / image.height).toFixed(4)),
    sampledColors: colors.size,
    transparencyRatio: Number((transparent / Math.max(1, transparent + opaque)).toFixed(4)),
    grayscaleRatio: Number((grayscale / Math.max(1, opaque)).toFixed(4)),
  };
}

function classify(facts, filename) {
  const sourceName = filename.toLocaleLowerCase("nl-NL");
  if (/photo|foto|scan|screenshot/u.test(sourceName) || facts.sampledColors > 160) return "UNSUITABLE_PHOTO";
  if (/wordmark|woordmerk|tekst|type/u.test(sourceName) || facts.aspectRatio > 4.2 || facts.aspectRatio < 0.24) return "TEXT_HEAVY";
  if (facts.sampledColors <= 5 || facts.grayscaleRatio > 0.94) return "MONOCHROME_LINE";
  if (facts.sampledColors <= 28) return "FLAT_LOGO";
  if (facts.sampledColors <= 96) return "MULTICOLOR_BADGE";
  return "COMPLEX_RASTER";
}

function decision(sourceClass, officialVectorAvailable) {
  if (officialVectorAvailable) return { status: "OFFICIAL_VECTOR_PREFERRED", humanMessage: "Gebruik de officiële vectorbron. Automatisch overtrekken zou een tweede, minder betrouwbare waarheid maken.", vectorizable: false };
  if (sourceClass === "UNSUITABLE_PHOTO") return { status: "REJECTED", humanMessage: "Dit is fotografie en hoort geen logo-SVG te worden. Bewaar het als beeldbron.", vectorizable: false };
  if (sourceClass === "TEXT_HEAVY") return { status: "CHECK_REQUIRED", humanMessage: "Tekst en woordmerken vragen controle van lettervormen en kerning. Vraag bij voorkeur de officiële bron.", vectorizable: false };
  if (sourceClass === "COMPLEX_RASTER") return { status: "CHECK_REQUIRED", humanMessage: "De bron bevat te veel visuele detail voor een betrouwbare automatische productiebron.", vectorizable: false };
  return { status: "READY_FOR_CANDIDATE", humanMessage: "Een vectorvoorstel kan worden gemaakt. De bron blijft leidend en menselijke vergelijking blijft verplicht.", vectorizable: true };
}

export async function preflightCreativeRaster({ bytes, filename, mimeType, officialVectorAvailable = false }) {
  const source = Buffer.from(bytes ?? []);
  if (!SUPPORTED_MIME.has(String(mimeType))) throw error("Kies een PNG, JPEG, WebP, GIF of BMP.", "CREATIVE_VECTOR_MIME_UNSUPPORTED");
  if (!source.length || source.length > MAX_BYTES) throw error("De beeldbron is leeg of groter dan 8 MB.", "CREATIVE_VECTOR_SIZE_INVALID");
  const facts = await rasterFacts(source);
  const sourceClass = classify(facts, String(filename ?? "bron"));
  return {
    source: { filename: String(filename ?? "bron").slice(0, 180), mimeType, bytes: source.length, sha256: sha256(source), ...facts },
    sourceClass,
    ...decision(sourceClass, officialVectorAvailable),
  };
}

function vtracerOptions(sourceClass) {
  if (sourceClass === "MONOCHROME_LINE") return { preset: "bw", clustering: "bw", mode: "spline", adaptive: true, filterSpeckle: 3, simplify: 1.1, optimize: 2, pathPrecision: 3 };
  if (sourceClass === "FLAT_LOGO") return { preset: "poster", hierarchical: "cutout", mode: "spline", filterSpeckle: 4, maxColors: 12, simplify: 1.25, optimize: 2, pathPrecision: 3 };
  return { preset: "poster", hierarchical: "cutout", mode: "spline", filterSpeckle: 3, maxColors: 32, simplify: 1, optimize: 2, pathPrecision: 3 };
}

export async function createCreativeVectorCandidate(input) {
  const bytes = Buffer.from(input.bytes ?? []);
  const preflight = await preflightCreativeRaster({ ...input, bytes });
  if (!preflight.vectorizable) throw error(preflight.humanMessage, `CREATIVE_VECTOR_${preflight.status}`);
  const startedAt = performance.now();
  const svg = convertBuffer(bytes, vtracerOptions(preflight.sourceClass));
  const latencyMs = Math.round(performance.now() - startedAt);
  const inspected = inspectProductionAssetSvg({ bytes: Buffer.from(svg), filename: `${preflight.source.filename}.svg`, mimeType: "image/svg+xml", intakeKind: "ARTWORK" });
  const pathCount = (svg.match(/<path\b/gu) ?? []).length;
  const fillColors = [...new Set([...svg.matchAll(/\bfill=["']([^"']+)/gu)].map((match) => match[1]))];
  const warnings = [];
  if (pathCount > 2_000) warnings.push("Veel vectorpaden: controleer bewerkbaarheid en snijkwaliteit.");
  if (preflight.sourceClass === "MULTICOLOR_BADGE") warnings.push("Controleer kleurvlakken, kleine details en transparantie naast het origineel.");
  return {
    id: `vector-candidate-${preflight.source.sha256.slice(0, 16).toLocaleLowerCase("nl-NL")}`,
    status: "HUMAN_REVIEW_REQUIRED",
    engine: "VTRACER_WASM_1_0_0_ALPHA_3",
    engineOptions: vtracerOptions(preflight.sourceClass),
    preflight,
    derivative: {
      mimeType: "image/svg+xml",
      svg,
      sha256: sha256(svg),
      bytes: Buffer.byteLength(svg),
      pathCount,
      fillColors,
      width: inspected.inspection.svg.boundsMm.width,
      height: inspected.inspection.svg.boundsMm.height,
      geometryHash: inspected.candidates[0].geometryHash,
    },
    evidence: { sourceSha256: preflight.source.sha256, derivativeSha256: sha256(svg), latencyMs, warnings, canonicalPromotionPerformed: false },
  };
}
