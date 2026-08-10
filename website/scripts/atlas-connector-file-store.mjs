import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

function safeSegment(value) {
  const segment = value.replace(/[^a-zA-Z0-9._-]+/g, "_");
  if (!segment || segment === "." || segment === "..") {
    throw new Error("Connector identifiers cannot form a safe state path.");
  }
  return segment;
}

export class FileConnectorStateStore {
  constructor(rootDirectory) {
    this.rootDirectory = path.resolve(rootDirectory);
  }

  statePath(definition) {
    const context = safeSegment(definition.contextId);
    const connector = safeSegment(definition.connectorId);
    return path.join(this.rootDirectory, context, `${connector}.json`);
  }

  async load(definition) {
    const filePath = this.statePath(definition);
    try {
      return JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async save(definition, state) {
    const filePath = this.statePath(definition);
    const directory = path.dirname(filePath);
    const temporaryPath = `${filePath}.${process.pid}.new`;
    await mkdir(directory, { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporaryPath, filePath);
  }
}
