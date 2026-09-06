process.on("disconnect", () => process.exit(0));
process.once("message", ({ mode } = {}) => {
  if (mode === "hang") return;
  if (mode === "crash") process.exit(17);
  const response = mode === "error"
    ? { ok: false, error: { message: "fixture failure", code: "FIXTURE_FAILURE" } }
    : { ok: true, result: { fixturePid: process.pid } };
  if (process.connected) process.send?.(response, () => process.disconnect());
});
