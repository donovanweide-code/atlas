import { createHash } from "node:crypto";
import { parentPort, workerData } from "node:worker_threads";

import { encodeSportpaleisRuntimeState } from "./sportpaleis-mariadb-store.mjs";
import { sha256CanonicalJson } from "./workspace-domain-state.mjs";

try {
  const stateSha256 = sha256CanonicalJson(workerData.snapshot);
  const encoded = encodeSportpaleisRuntimeState(workerData.snapshot);
  parentPort.postMessage({
    ok: true,
    result: {
      stateSha256,
      serialized: encoded.serialized,
      encodedSha256: createHash("sha256").update(encoded.serialized).digest("hex"),
      encoding: encoded.encoding,
    },
  });
} catch (error) {
  parentPort.postMessage({
    ok: false,
    error: {
      name: error?.name ?? "Error",
      message: error?.message ?? "De legacy rollbackstate kon niet worden gematerialiseerd.",
      code: error?.code ?? "LEGACY_ROLLBACK_ENCODING_FAILED",
    },
  });
}
