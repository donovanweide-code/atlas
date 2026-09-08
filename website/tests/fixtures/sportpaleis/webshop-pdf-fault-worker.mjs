// Disposable process used only by the supervisor tests; no file or provider access.
process.on("disconnect", () => process.exit(0));
process.once("message", ({ mode }) => {
  if (mode === "crash") process.exit(17);
  if (mode === "protocol") process.send({ type: "result", result: { ok: "forged" } });
  if (mode === "empty-success") process.send({ type: "result", result: { ok: true, evidence: {} } });
  if (mode === "hang") { while (true) { /* hard deadline must kill even a blocked event loop */ } }
});
