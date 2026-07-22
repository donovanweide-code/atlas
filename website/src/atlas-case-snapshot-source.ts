import { parseCaseSnapshot } from "./atlas-case-snapshot";

const snapshotModules = import.meta.glob<string>(
  "../../clients/0001-we-build-and-design/CASE-SNAPSHOT.json",
  { query: "?raw", import: "default", eager: true },
);

const case0001Path = "../../clients/0001-we-build-and-design/CASE-SNAPSHOT.json";

export const case0001SnapshotLoad = parseCaseSnapshot(snapshotModules[case0001Path]);
