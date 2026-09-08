// Process entrypoint; accepts one bounded job and never persists document content.
process.on("disconnect", () => process.exit(0));
process.once("message", async ({ bytes, limits }) => {
  let task;
  const send = (result) => process.send?.({ type: "result", result });
  const memoryLimit = () => process.memoryUsage().rss > limits.maxRssBytes;
  const guard = () => { if (memoryLimit()) throw Object.assign(new Error(), { code: "PDF_MEMORY_LIMIT" }); };
  const heartbeat = setInterval(() => {
    if (memoryLimit()) { send({ ok: false, code: "PDF_MEMORY_LIMIT" }); process.exitCode = 1; }
    else process.send?.({ type: "heartbeat" });
  }, 5000);
  try {
    guard();
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    task = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false,
      disableFontFace: true, useSystemFonts: false, stopAtErrors: true, verbosity: 0,
      useWorkerFetch: false, isImageDecoderSupported: false });
    const document = await task.promise;
    if (document.numPages < 1) throw Object.assign(new Error(), { code: "PDF_EMPTY" });
    if (document.numPages > limits.maxPages) throw Object.assign(new Error(), { code: "PDF_PAGE_LIMIT" });
    const pages = [];
    let characters = 0, itemCount = 0;
    for (let number = 1; number <= document.numPages; number += 1) {
      guard();
      const page = await document.getPage(number);
      const stream = page.streamTextContent({ disableNormalization: true }).getReader();
      const items = [];
      let text = "";
      try {
        while (true) {
          const { done, value } = await stream.read();
          if (done) break;
          for (const item of value.items) {
            if (typeof item.str !== "string") continue;
            const suffix = item.hasEOL ? "\n" : " ";
            characters += item.str.length + suffix.length;
            itemCount += 1;
            if (characters > limits.maxTextChars || itemCount > limits.maxTextItems) throw Object.assign(new Error(), { code: "PDF_TEXT_LIMIT" });
            text += item.str + suffix;
            items.push({ originalValue: item.str, page: number, transform: item.transform,
              width: item.width, height: item.height, fontName: item.fontName, hasEOL: item.hasEOL === true });
          }
          guard();
        }
      } finally { await stream.cancel().catch(() => {}); }
      // Text-free pages may contain scanned personalization. Never silently skip them.
      if (!text.trim()) throw Object.assign(new Error(), { code: "PDF_OCR_REQUIRED" });
      pages.push({ page: number, text, items });
      page.cleanup();
    }
    guard();
    send({ ok: true, evidence: { pageCount: pages.length, pages } });
  } catch (error) {
    const allowed = new Set(["PDF_EMPTY", "PDF_PAGE_LIMIT", "PDF_TEXT_LIMIT", "PDF_MEMORY_LIMIT", "PDF_OCR_REQUIRED"]);
    const code = allowed.has(error?.code) ? error.code : error?.name === "PasswordException" ? "PDF_PASSWORD_PROTECTED" : "PDF_UNREADABLE";
    send({ ok: false, code });
  } finally {
    clearInterval(heartbeat);
    await task?.destroy().catch(() => {});
    process.disconnect?.();
  }
});
