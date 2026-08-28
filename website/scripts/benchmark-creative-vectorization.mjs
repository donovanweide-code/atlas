import { createCanvas } from "@napi-rs/canvas";
import { createCreativeVectorCandidate, preflightCreativeRaster } from "../src/sportpaleis/creative-vectorization.mjs";

function fixture({ id, filename, mimeType = "image/png", width = 640, height = 420, officialVectorAvailable = false, jpegQuality, paint }) {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  paint(context, width, height);
  const bytes = jpegQuality ? canvas.toBuffer("image/jpeg", jpegQuality) : canvas.toBuffer("image/png");
  return { id, filename, mimeType, officialVectorAvailable, bytes };
}

const fixtures = [
  fixture({ id: "sharp-png-logo", filename: "fictief-sharp-logo.png", paint(ctx) { ctx.fillStyle = "#d10019"; ctx.fillRect(90, 80, 460, 260); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(320, 210, 82, 0, Math.PI * 2); ctx.fill(); } }),
  fixture({ id: "bad-jpeg", filename: "fictief-bad-logo.jpg", mimeType: "image/jpeg", jpegQuality: 28, paint(ctx) { ctx.fillStyle = "#131313"; ctx.fillRect(76, 92, 488, 236); ctx.fillStyle = "#d10019"; ctx.fillRect(120, 132, 400, 156); } }),
  fixture({ id: "transparent-logo", filename: "fictief-transparent-logo.png", paint(ctx) { ctx.clearRect(0, 0, 640, 420); ctx.fillStyle = "rgba(209,0,25,.88)"; ctx.beginPath(); ctx.arc(320, 210, 145, 0, Math.PI * 2); ctx.fill(); } }),
  fixture({ id: "monochrome-line-art", filename: "fictief-line-art.png", paint(ctx) { ctx.strokeStyle = "#000"; ctx.lineWidth = 18; ctx.strokeRect(100, 80, 440, 260); ctx.beginPath(); ctx.moveTo(100, 340); ctx.lineTo(540, 80); ctx.stroke(); } }),
  fixture({ id: "multicolor-badge", filename: "fictief-multicolor-badge.png", paint(ctx) { const colors = ["#d10019", "#005baa", "#ffd200", "#111", "#fff"]; colors.forEach((color, index) => { ctx.fillStyle = color; ctx.fillRect(100 + index * 44, 80 + index * 28, 360 - index * 44, 260 - index * 44); }); } }),
  fixture({ id: "text-logo", filename: "fictief-woordmerk.png", width: 900, height: 180, paint(ctx) { ctx.fillStyle = "#111"; ctx.font = "900 90px Arial"; ctx.fillText("SPORTWERK", 70, 125); } }),
  fixture({ id: "sponsor-logo", filename: "fictief-sponsorlogo.png", paint(ctx) { ctx.fillStyle = "#172b4d"; ctx.beginPath(); ctx.roundRect(90, 90, 460, 240, 42); ctx.fill(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(225, 210, 64, 0, Math.PI * 2); ctx.fill(); } }),
  fixture({ id: "geometric-logo", filename: "fictief-geometric-logo.png", paint(ctx) { ctx.fillStyle = "#111"; ctx.beginPath(); ctx.moveTo(320, 55); ctx.lineTo(560, 350); ctx.lineTo(80, 350); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#d10019"; ctx.fillRect(240, 150, 160, 145); } }),
  fixture({ id: "low-resolution-logo", filename: "fictief-lowres-logo.png", width: 120, height: 80, paint(ctx) { ctx.fillStyle = "#005baa"; ctx.fillRect(8, 8, 104, 64); ctx.fillStyle = "#fff"; ctx.fillRect(30, 22, 60, 36); } }),
  fixture({ id: "scanned-artwork", filename: "fictief-scan-artwork.jpg", mimeType: "image/jpeg", jpegQuality: 65, paint(ctx, width, height) { for (let y = 0; y < height; y += 8) for (let x = 0; x < width; x += 8) { ctx.fillStyle = `rgb(${(x + y) % 255},${(x * 3) % 255},${(y * 5) % 255})`; ctx.fillRect(x, y, 8, 8); } } }),
  fixture({ id: "unsuitable-photo", filename: "fictief-teamfoto.png", paint(ctx, width, height) { const gradient = ctx.createLinearGradient(0, 0, width, height); for (let stop = 0; stop <= 1; stop += .05) gradient.addColorStop(stop, `hsl(${stop * 340} 72% ${35 + stop * 40}%)`); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height); } }),
  fixture({ id: "official-vector-exists", filename: "fictief-logo-raster.png", officialVectorAvailable: true, paint(ctx) { ctx.fillStyle = "#111"; ctx.fillRect(120, 100, 400, 220); } }),
];

const results = [];
for (const item of fixtures) {
  const preflight = await preflightCreativeRaster(item);
  if (!preflight.vectorizable) {
    results.push({ id: item.id, sourceClass: preflight.sourceClass, status: preflight.status, vectorized: false, message: preflight.humanMessage });
    continue;
  }
  const candidate = await createCreativeVectorCandidate(item);
  results.push({ id: item.id, sourceClass: candidate.preflight.sourceClass, status: candidate.status, vectorized: true, latencyMs: candidate.evidence.latencyMs, inputBytes: candidate.preflight.source.bytes, outputBytes: candidate.derivative.bytes, paths: candidate.derivative.pathCount, colors: candidate.derivative.fillColors.length, warnings: candidate.evidence.warnings });
}

console.log(JSON.stringify({ engine: "VTRACER_WASM_1_0_0_ALPHA_3", fixtureCount: fixtures.length, accepted: results.filter(({ vectorized }) => vectorized).length, rejectedOrHeld: results.filter(({ vectorized }) => !vectorized).length, results }, null, 2));
