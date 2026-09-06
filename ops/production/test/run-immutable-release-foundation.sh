#!/usr/bin/env bash
set -Eeuo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
deploy_script="$(cd "$script_dir/.." && pwd)/spw-immutable-release.sh"
root="$(mktemp -d .deploy-foundation-test.XXXXXX)"
trap 'rm -rf -- "$root"' EXIT

# Alleen exact de bewezen 308 plus het canonieke doel is geldig. Geen generieke
# 3xx-acceptatie en geen redirect naar een ander doel.
bash -c 'source "$1"; verify_redirect_contract 308 /productie /productie' _ "$deploy_script"
if bash -c 'source "$1"; verify_redirect_contract 302 /productie /productie' _ "$deploy_script"; then
  printf '302 werd ten onrechte als canonieke redirect geaccepteerd\n' >&2
  exit 1
fi
if bash -c 'source "$1"; verify_redirect_contract 308 /verkeerd /productie' _ "$deploy_script"; then
  printf 'verkeerd redirectdoel werd ten onrechte geaccepteerd\n' >&2
  exit 1
fi

export SPW_DEPLOY_TEST_MODE=1
export SPW_SKIP_DEPENDENCY_INSTALL=1
export WBD_ROOT="$root/srv/wbd"
export WBD_ENV_FILE="$root/etc/wbd/production.env"
export WBD_BACKUP_DIR="$root/var/backups/wbd-mariadb"
export WBD_SERVICE=wbd-workspace.service
export WBD_READY_URL=https://workspace.sportpaleis.nl/readyz
export WBD_READY_RESOLVE=workspace.sportpaleis.nl:443:127.0.0.1
export WBD_BACKUP_MAX_AGE_SECONDS=90000

old_id=SPW-OLD-20260821
candidate_id=SPW-CANDIDATE-20260821
commit=1111111111111111111111111111111111111111
tag=SPW-CANDIDATE-TAG-20260821
fixture="$root/fixture"
artifact="$root/$candidate_id.tar.gz"
external_manifest="$root/$candidate_id.manifest.json"
assurance_evidence="$root/$candidate_id.assurance.json"

mkdir -p "$WBD_ROOT/releases/$old_id/website" "$WBD_ROOT/shared" "$WBD_BACKUP_DIR" \
  "$fixture/app/scripts" "$fixture/app/config" "$fixture/app/dist-workspace/assets" "$fixture/deployment"
printf 'old\n' > "$WBD_ROOT/releases/$old_id/website/version.txt"
cat > "$WBD_ROOT/releases/$old_id/RELEASE-MANIFEST.json" <<EOF
{"schemaVersion":2,"releaseId":"$old_id","commit":"0000000000000000000000000000000000000000","tag":"$old_id","files":[]}
EOF
printf '%s\n' "$WBD_ROOT/releases/$old_id" > "$WBD_ROOT/current"
mkdir -p "$(dirname "$WBD_ENV_FILE")"
printf 'NODE_ENV=production\nRELEASE_ID=%s\nSECRET=preserved\n' "$old_id" > "$WBD_ENV_FILE"
printf 'backup\n' > "$WBD_BACKUP_DIR/wbd-mariadb-20260821T000000Z.sql.enc"
(cd "$WBD_BACKUP_DIR" && sha256sum wbd-mariadb-20260821T000000Z.sql.enc > wbd-mariadb-20260821T000000Z.sql.enc.sha256)

printf '{"name":"fixture","private":true,"version":"1.0.0","lockfileVersion":3,"packages":{}}\n' > "$fixture/app/package-lock.json"
printf '{"name":"fixture","private":true,"version":"1.0.0"}\n' > "$fixture/app/package.json"
printf 'candidate\n' > "$fixture/app/version.txt"
printf 'export {};\n' > "$fixture/app/scripts/workspace-runtime.mjs"
printf 'export {};\n' > "$fixture/app/scripts/production-migrate.mjs"
printf 'export {};\n' > "$fixture/app/scripts/sportpaleis-production-shaped-assurance.mjs"
printf 'process.stdout.write("{\\"status\\":\\"PASS\\"}\\n");\n' > "$fixture/app/scripts/sportpaleis-domain-rollback-bridge.mjs"
node - "$fixture/app/config" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const root = process.argv[2];
const matrix = { schemaVersion: 1, recordCount: 57, records: Array.from({ length: 57 }, (_, index) => ({ id: `SPW-RF-${String(index + 1).padStart(3, "0")}`, finalStatus: "CLOSED" })) };
const fixtures = { schemaVersion: 1, fixtures: Array.from({ length: 6 }, (_, index) => ({ id: `fixture-${index + 1}` })) };
const matrixBytes = Buffer.from(JSON.stringify(matrix));
const fixtureBytes = Buffer.from(JSON.stringify(fixtures));
fs.writeFileSync(path.join(root, "sportpaleis-regression-failure-matrix-v1.json"), matrixBytes);
fs.writeFileSync(path.join(root, "sportpaleis-immutable-regression-fixtures-v1.json"), fixtureBytes);
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
fs.writeFileSync(path.join(root, "sportpaleis-regression-contract-v1.json"), JSON.stringify({ schemaVersion: 1, contractId: "SPW-VERSIONED-REGRESSION-CONTRACT-V1-20260906", failureMatrix: { sha256: hash(matrixBytes) }, immutableFixtureManifest: { sha256: hash(fixtureBytes) } }));
NODE
cat > "$fixture/app/config/sportpaleis-production-shaped-assurance-v4.json" <<'EOF'
{"schemaVersion":4,"contractId":"SPORTPALEIS_PRODUCTION_SHAPED_ASSURANCE_V4_VERSIONED_SOAK","regressionContract":{"id":"SPW-VERSIONED-REGRESSION-CONTRACT-V1-20260906","path":"app/config/sportpaleis-regression-contract-v1.json"},"minimumLoad":{"revisionPolls":100,"libraryPreviews":300,"concurrentFullBootstraps":4,"soakCycles":5,"largeFreeProductionHeightsMm":[80,200]},"limits":{"allRoutesP95Ms":1000,"allRoutesMaxMs":5000,"bootstrapP95Ms":2000,"bootstrapMaxMs":3000,"bootstrapSurfaceMaxBytes":{"overview":3500000,"orders":3500000,"production":5250000,"library":2000000,"teamwear":3250000,"admin":2500000},"eventLoopP95Ms":100,"eventLoopMaxMs":1000,"rssHighWaterBytes":1073741824,"rssRecoveryBudgetBytes":536870912,"steadyStateRssGrowthBytes":67108864,"soakRecoveredRssBandBytes":134217728,"soakMaximumPositiveRssStepBytes":67108864,"databaseConnectionLimit":8,"databaseAcquireTimeouts":0,"databaseQueueHighWater":0},"requiredInvariants":["authenticatedRoutes","normalAndReviewAuth","readRevisionStable","readAuditStable","legacyStateWriteStable","businessHashesStable","domainRecordWritesIncremental","cacheInvalidationExact","interruptedRetryRecovered","previewFanoutBounded","bootstrapCacheBounded","scopedBootstrapPayloads","largeFreeProduction80Mm","largeFreeProduction200Mm","sameColorSourceConcurrency","workerCrashRecoveredWithoutOrphan","parentReservationCrashRecoveredWithoutOrphan","productionIdempotency","artifactIdentity","productionArtifactReconciliation","tenantAndScopeIsolation","rollbackMaterializationProven","multiCycleSoakCompleted","soakMemoryRecovered","soakMemoryTrendStable","soakQueueStable","noLegacyMonolithLoads"]}
EOF
printf '<!doctype html>workspace\n' > "$fixture/app/dist-workspace/workspace.html"
printf '<!doctype html>sportpaleis\n' > "$fixture/app/dist-workspace/sportpaleis.html"
printf 'asset\n' > "$fixture/app/dist-workspace/assets/app.js"
cat > "$fixture/deployment/wbd-workspace.service" <<'EOF'
[Service]
WorkingDirectory=/srv/wbd/current/website
ExecStart=/usr/bin/node /srv/wbd/current/website/scripts/workspace-runtime.mjs
EOF
node - "$fixture" "$candidate_id" "$commit" "$tag" <<'NODE'
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const [root, releaseId, commit, tag] = process.argv.slice(2);
const files = [
  "app/package-lock.json", "app/package.json", "app/version.txt",
  "app/scripts/workspace-runtime.mjs", "app/scripts/production-migrate.mjs",
  "app/scripts/sportpaleis-production-shaped-assurance.mjs",
  "app/scripts/sportpaleis-domain-rollback-bridge.mjs",
  "app/config/sportpaleis-production-shaped-assurance-v4.json",
  "app/config/sportpaleis-regression-contract-v1.json",
  "app/config/sportpaleis-regression-failure-matrix-v1.json",
  "app/config/sportpaleis-immutable-regression-fixtures-v1.json",
  "app/dist-workspace/workspace.html", "app/dist-workspace/sportpaleis.html",
  "app/dist-workspace/assets/app.js", "deployment/wbd-workspace.service",
].map((name) => {
  const bytes = fs.readFileSync(path.join(root, name));
  return { path: name, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") };
});
const assurance = files.find(({ path: name }) => name === "app/scripts/sportpaleis-production-shaped-assurance.mjs");
const contract = files.find(({ path: name }) => name === "app/config/sportpaleis-production-shaped-assurance-v4.json");
const regression = files.find(({ path: name }) => name === "app/config/sportpaleis-regression-contract-v1.json");
const matrix = files.find(({ path: name }) => name === "app/config/sportpaleis-regression-failure-matrix-v1.json");
const fixtures = files.find(({ path: name }) => name === "app/config/sportpaleis-immutable-regression-fixtures-v1.json");
fs.writeFileSync(path.join(root, "RELEASE-MANIFEST.json"), JSON.stringify({ schemaVersion: 2, releaseId, commit, tag, files, deployability: { productionShapedAssuranceRequired: true }, productionShapedAssurance: { entrypoint: assurance.path, sha256: assurance.sha256, contract: contract.path, contractSha256: contract.sha256, regressionContract: regression.path, regressionContractSha256: regression.sha256, regressionFailureMatrix: matrix.path, regressionFailureMatrixSha256: matrix.sha256, immutableFixtureManifest: fixtures.path, immutableFixtureManifestSha256: fixtures.sha256, requiredPhase: "PRE_DEPLOY" } }, null, 2));
NODE
tar -C "$fixture" -czf "$artifact" app deployment RELEASE-MANIFEST.json
artifact_hash="$(sha256sum "$artifact" | awk '{print $1}')"
assurance_hash="$(sha256sum "$fixture/app/scripts/sportpaleis-production-shaped-assurance.mjs" | awk '{print $1}')"
contract_hash="$(sha256sum "$fixture/app/config/sportpaleis-production-shaped-assurance-v4.json" | awk '{print $1}')"
regression_hash="$(sha256sum "$fixture/app/config/sportpaleis-regression-contract-v1.json" | awk '{print $1}')"
matrix_hash="$(sha256sum "$fixture/app/config/sportpaleis-regression-failure-matrix-v1.json" | awk '{print $1}')"
fixture_hash="$(sha256sum "$fixture/app/config/sportpaleis-immutable-regression-fixtures-v1.json" | awk '{print $1}')"
backup_hash="$(awk 'NR==1 {print $1}' "$WBD_BACKUP_DIR/wbd-mariadb-20260821T000000Z.sql.enc.sha256")"
cat > "$external_manifest" <<EOF
{"releaseId":"$candidate_id","commit":"$commit","tag":"$tag","artifact":"$(basename "$artifact")","artifactSha256":"$artifact_hash","deployability":{"productionShapedAssuranceRequired":true},"productionShapedAssurance":{"entrypoint":"app/scripts/sportpaleis-production-shaped-assurance.mjs","sha256":"$assurance_hash","contract":"app/config/sportpaleis-production-shaped-assurance-v4.json","contractSha256":"$contract_hash","regressionContract":"app/config/sportpaleis-regression-contract-v1.json","regressionContractSha256":"$regression_hash","regressionFailureMatrix":"app/config/sportpaleis-regression-failure-matrix-v1.json","regressionFailureMatrixSha256":"$matrix_hash","immutableFixtureManifest":"app/config/sportpaleis-immutable-regression-fixtures-v1.json","immutableFixtureManifestSha256":"$fixture_hash","requiredPhase":"PRE_DEPLOY"}}
EOF
cat > "$assurance_evidence" <<EOF
{"schemaVersion":4,"status":"PASS","releaseId":"$candidate_id","identity":{"candidateCommit":"$commit","candidateArtifactSha256":"$artifact_hash","restoreBackupSha256":"$backup_hash","assuranceEntrypointSha256":"$assurance_hash","assuranceContractSha256":"$contract_hash","assuranceContract":"SPORTPALEIS_PRODUCTION_SHAPED_ASSURANCE_V4_VERSIONED_SOAK","regressionContractSha256":"$regression_hash","regressionContract":"SPW-VERSIONED-REGRESSION-CONTRACT-V1-20260906"},"load":{"httpErrors":0,"serverErrors":0,"p95Ms":10,"maxMs":20,"bootstrapSurfaceBytes":{"overview":100,"orders":100,"production":100,"library":100,"teamwear":100,"admin":100},"byRoute":{"/api/sportpaleis/v1/bootstrap":{"p95Ms":10,"maxMs":20}}},"pool":{"connectionLimit":8,"acquireTimeouts":0,"queueHighWater":0},"runtime":{"eventLoopP95Ms":5,"eventLoopMaxMs":10,"rssHighWaterBytes":1000000,"rssRecoveredWithinBudget":true,"steadyStateMemoryStable":true,"soakMemoryRecovered":true,"soakMemoryTrendStable":true},"practice":{"largeFreeProduction":[{"heightMm":80},{"heightMm":200}],"sameColorSourceConcurrency":{"winnerJobId":"job-1","loserCode":"PRODUCTION_PHYSICAL_STEP_CONFLICT","dbRecordDeltas":{"jobs":1,"artifacts":1,"idempotency":1},"visibleSvgArtifacts":1,"visibleReservations":1,"visibleCommitMarkers":1,"quarantineEntries":0}},"invariants":{"authenticatedRoutes":true,"normalAndReviewAuth":true,"readRevisionStable":true,"readAuditStable":true,"legacyStateWriteStable":true,"businessHashesStable":true,"domainRecordWritesIncremental":true,"cacheInvalidationExact":true,"interruptedRetryRecovered":true,"previewFanoutBounded":true,"bootstrapCacheBounded":true,"scopedBootstrapPayloads":true,"largeFreeProduction80Mm":true,"largeFreeProduction200Mm":true,"sameColorSourceConcurrency":true,"workerCrashRecoveredWithoutOrphan":true,"parentReservationCrashRecoveredWithoutOrphan":true,"productionIdempotency":true,"artifactIdentity":true,"productionArtifactReconciliation":true,"tenantAndScopeIsolation":true,"rollbackMaterializationProven":true,"multiCycleSoakCompleted":true,"soakMemoryRecovered":true,"soakMemoryTrendStable":true,"soakQueueStable":true,"noLegacyMonolithLoads":true}}
EOF

# De broker leest het externe manifest. Daarom moeten ontbrekende of afwijkende
# regressiecontractbindings al tijdens prepare blokkeren, vóór staging of planbouw.
invalid_regression_manifest_dir="$root/invalid-regression-manifests"
mkdir -p "$invalid_regression_manifest_dir"
node - "$external_manifest" "$invalid_regression_manifest_dir" <<'NODE'
const fs = require("fs");
const path = require("path");
const [source, target] = process.argv.slice(2);
const manifest = JSON.parse(fs.readFileSync(source, "utf8"));
const bindings = [
  ["regressionContract", "regressionContractSha256"],
  ["regressionFailureMatrix", "regressionFailureMatrixSha256"],
  ["immutableFixtureManifest", "immutableFixtureManifestSha256"],
];
for (const [entry, hash] of bindings) {
  const withoutHash = structuredClone(manifest);
  delete withoutHash.productionShapedAssurance[hash];
  fs.writeFileSync(path.join(target, `missing-${hash}.json`), JSON.stringify(withoutHash));
  const wrongHash = structuredClone(manifest);
  wrongHash.productionShapedAssurance[hash] = "0".repeat(64);
  fs.writeFileSync(path.join(target, `wrong-${hash}.json`), JSON.stringify(wrongHash));
  const wrongPath = structuredClone(manifest);
  wrongPath.productionShapedAssurance[entry] = `app/config/not-allowlisted-${entry}.json`;
  fs.writeFileSync(path.join(target, `wrong-${entry}-path.json`), JSON.stringify(wrongPath));
}
NODE
for invalid_manifest in "$invalid_regression_manifest_dir"/*.json; do
  if $deploy_script prepare --artifact "$artifact" --manifest "$invalid_manifest" --expected-current "$old_id" --assurance-evidence "$assurance_evidence" >"$root/invalid-regression.out" 2>&1; then
    printf 'extern manifest zonder exacte regressiecontractbinding werd ten onrechte geaccepteerd\n' >&2
    exit 1
  fi
  [[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$old_id" ]]
  [[ ! -e "$WBD_ROOT/shared/deploy-plans/$candidate_id.json" ]]
done

# Een structureel incompleet raw artifact moet vóór staging, rollbackmateriaal en
# deployplan fail-closed stoppen. De actieve release blijft daarbij onaangeraakt.
bad_layout_fixture="$root/fixture-bad-layout"
bad_layout_artifact="$root/$candidate_id.bad-layout.tar.gz"
bad_layout_manifest="$root/$candidate_id.bad-layout.manifest.json"
cp -a "$fixture" "$bad_layout_fixture"
rm -f "$bad_layout_fixture/app/scripts/workspace-runtime.mjs"
tar -C "$bad_layout_fixture" -czf "$bad_layout_artifact" app deployment RELEASE-MANIFEST.json
bad_layout_hash="$(sha256sum "$bad_layout_artifact" | awk '{print $1}')"
cat > "$bad_layout_manifest" <<EOF
{"releaseId":"$candidate_id","commit":"$commit","tag":"$tag","artifact":"$(basename "$bad_layout_artifact")","artifactSha256":"$bad_layout_hash"}
EOF
if $deploy_script prepare --artifact "$bad_layout_artifact" --manifest "$bad_layout_manifest" --expected-current "$old_id" >"$root/bad-layout.out" 2>&1; then
  printf 'incompleet raw artifact werd ten onrechte geaccepteerd\n' >&2
  exit 1
fi
grep -q 'vereist artifactpad ontbreekt: app/scripts/workspace-runtime.mjs' "$root/bad-layout.out"
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$old_id" ]]
[[ ! -e "$WBD_ROOT/releases/$candidate_id" ]]
[[ ! -e "$WBD_ROOT/shared/deploy-plans/$candidate_id.json" ]]
[[ ! -e "$WBD_ROOT/shared/deploy-rollbacks/$candidate_id-prechange.tar.gz" ]]

output="$($deploy_script prepare --artifact "$artifact" --manifest "$external_manifest" --expected-current "$old_id" --assurance-evidence "$assurance_evidence")"
grep -q 'PREPARE=PASS' <<<"$output"
grep -q 'HUMAN_GO_REQUIRED=YES' <<<"$output"
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$old_id" ]]
grep -q "RELEASE_ID=$old_id" "$WBD_ENV_FILE"
plan="$WBD_ROOT/shared/deploy-plans/$candidate_id.json"
[[ -f "$plan" && -f "${plan}.sha256" ]]
[[ -f "$WBD_ROOT/shared/deploy-rollbacks/$candidate_id-prechange.tar.gz" ]]
[[ -f "$WBD_ROOT/releases/$candidate_id/website/scripts/workspace-runtime.mjs" ]]
[[ -f "$WBD_ROOT/releases/$candidate_id/website/package.json" ]]
[[ ! -e "$WBD_ROOT/releases/$candidate_id/app" ]]

export SPW_TEST_READINESS_STATUS=PASS
$deploy_script switch --plan "$plan" --human-go "$candidate_id" >/dev/null
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
grep -q 'SECRET=preserved' "$WBD_ENV_FILE"

# Stale plannen worden geweigerd voordat current of RELEASE_ID kan wijzigen.
# Automatische applicatierollback na een rode readiness.
second_id=SPW-CANDIDATE-FAIL-20260821
second_fixture="$root/fixture-fail"
second_artifact="$root/$second_id.tar.gz"
second_manifest="$root/$second_id.manifest.json"
second_assurance="$root/$second_id.assurance.json"
cp -a "$fixture" "$second_fixture"
node - "$second_fixture/RELEASE-MANIFEST.json" "$second_id" <<'NODE'
const fs = require("fs");
const [file, releaseId] = process.argv.slice(2);
const value = JSON.parse(fs.readFileSync(file, "utf8"));
value.releaseId = releaseId;
value.tag = releaseId;
fs.writeFileSync(file, JSON.stringify(value, null, 2));
NODE
tar -C "$second_fixture" -czf "$second_artifact" app deployment RELEASE-MANIFEST.json
second_hash="$(sha256sum "$second_artifact" | awk '{print $1}')"
cat > "$second_manifest" <<EOF
{"releaseId":"$second_id","commit":"$commit","tag":"$second_id","artifact":"$(basename "$second_artifact")","artifactSha256":"$second_hash","deployability":{"productionShapedAssuranceRequired":true},"productionShapedAssurance":{"entrypoint":"app/scripts/sportpaleis-production-shaped-assurance.mjs","sha256":"$assurance_hash","contract":"app/config/sportpaleis-production-shaped-assurance-v4.json","contractSha256":"$contract_hash","regressionContract":"app/config/sportpaleis-regression-contract-v1.json","regressionContractSha256":"$regression_hash","regressionFailureMatrix":"app/config/sportpaleis-regression-failure-matrix-v1.json","regressionFailureMatrixSha256":"$matrix_hash","immutableFixtureManifest":"app/config/sportpaleis-immutable-regression-fixtures-v1.json","immutableFixtureManifestSha256":"$fixture_hash","requiredPhase":"PRE_DEPLOY"}}
EOF
cat > "$second_assurance" <<EOF
{"schemaVersion":4,"status":"PASS","releaseId":"$second_id","identity":{"candidateCommit":"$commit","candidateArtifactSha256":"$second_hash","restoreBackupSha256":"$backup_hash","assuranceEntrypointSha256":"$assurance_hash","assuranceContractSha256":"$contract_hash","assuranceContract":"SPORTPALEIS_PRODUCTION_SHAPED_ASSURANCE_V4_VERSIONED_SOAK","regressionContractSha256":"$regression_hash","regressionContract":"SPW-VERSIONED-REGRESSION-CONTRACT-V1-20260906"},"load":{"httpErrors":0,"serverErrors":0,"p95Ms":10,"maxMs":20,"bootstrapSurfaceBytes":{"overview":100,"orders":100,"production":100,"library":100,"teamwear":100,"admin":100},"byRoute":{"/api/sportpaleis/v1/bootstrap":{"p95Ms":10,"maxMs":20}}},"pool":{"connectionLimit":8,"acquireTimeouts":0,"queueHighWater":0},"runtime":{"eventLoopP95Ms":5,"eventLoopMaxMs":10,"rssHighWaterBytes":1000000,"rssRecoveredWithinBudget":true,"steadyStateMemoryStable":true,"soakMemoryRecovered":true,"soakMemoryTrendStable":true},"practice":{"largeFreeProduction":[{"heightMm":80},{"heightMm":200}],"sameColorSourceConcurrency":{"winnerJobId":"job-1","loserCode":"PRODUCTION_PHYSICAL_STEP_CONFLICT","dbRecordDeltas":{"jobs":1,"artifacts":1,"idempotency":1},"visibleSvgArtifacts":1,"visibleReservations":1,"visibleCommitMarkers":1,"quarantineEntries":0}},"invariants":{"authenticatedRoutes":true,"normalAndReviewAuth":true,"readRevisionStable":true,"readAuditStable":true,"legacyStateWriteStable":true,"businessHashesStable":true,"domainRecordWritesIncremental":true,"cacheInvalidationExact":true,"interruptedRetryRecovered":true,"previewFanoutBounded":true,"bootstrapCacheBounded":true,"scopedBootstrapPayloads":true,"largeFreeProduction80Mm":true,"largeFreeProduction200Mm":true,"sameColorSourceConcurrency":true,"workerCrashRecoveredWithoutOrphan":true,"parentReservationCrashRecoveredWithoutOrphan":true,"productionIdempotency":true,"artifactIdentity":true,"productionArtifactReconciliation":true,"tenantAndScopeIsolation":true,"rollbackMaterializationProven":true,"multiCycleSoakCompleted":true,"soakMemoryRecovered":true,"soakMemoryTrendStable":true,"soakQueueStable":true,"noLegacyMonolithLoads":true}}
EOF
if ! $deploy_script prepare --artifact "$second_artifact" --manifest "$second_manifest" --expected-current "$candidate_id" --assurance-evidence "$second_assurance" >"$root/second-prepare.out" 2>&1; then
  cat "$root/second-prepare.out" >&2
  exit 1
fi
second_plan="$WBD_ROOT/shared/deploy-plans/$second_id.json"

# Een gewijzigde centrale state maakt het plan stale en blokkeert vóór switch.
cp "$WBD_ENV_FILE" "$root/production.env.before-stale"
printf '# unexpected change\n' >> "$WBD_ENV_FILE"
set +e
$deploy_script switch --plan "$second_plan" --human-go "$second_id" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
precheck_evidence="$WBD_ROOT/shared/deploy-evidence/$second_id/deployment.txt"
[[ -f "$precheck_evidence" ]]
grep -q '^result=PRECHECK_FAILED$' "$precheck_evidence"
grep -q '^step=CORE_PREFLIGHT$' "$precheck_evidence"
grep -q '^failed_gate=PRODUCTION_ENV$' "$precheck_evidence"
grep -q '^reason=stale plan: productie-env is gewijzigd\.$' "$precheck_evidence"
grep -q '^remote_exit_code=1$' "$precheck_evidence"
cp "$root/production.env.before-stale" "$WBD_ENV_FILE"

export SPW_TEST_FAIL_RELEASE="$second_id"
set +e
$deploy_script switch --plan "$second_plan" --human-go "$second_id" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
grep -q 'result=ROLLED_BACK' "$WBD_ROOT/shared/deploy-evidence/$second_id/deployment.txt"

# Dezelfde bounded readiness wordt voor kandidaat en rollback gebruikt. Een
# tijdelijke 502/503 of connectiefout mag binnen het venster herstellen; een
# blijvende fout rolt fail-closed terug, waarbij ook een vertraagde rollbackstart
# binnen hetzelfde contract gezond kan worden.
readiness_sequences="$root/readiness-sequences"
mkdir -p "$readiness_sequences"
export SPW_TEST_READINESS_SEQUENCE_DIR="$readiness_sequences"
export SPW_TEST_READINESS_MAX_ATTEMPTS=6

printf '502\nREADY\n' > "$readiness_sequences/$second_id"
verify_output="$(bash -c 'source "$1"; verify_readiness "$2" && printf PASS' _ "$deploy_script" "$second_id")"
[[ "$verify_output" == "PASS" ]]

printf 'CONNECT_ERROR\n502\n503\nREADY\n' > "$readiness_sequences/$second_id"
verify_output="$(bash -c 'source "$1"; verify_readiness "$2" && printf PASS' _ "$deploy_script" "$second_id")"
[[ "$verify_output" == "PASS" ]]

printf '502\nCONNECT_ERROR\nREADY\n' > "$readiness_sequences/$candidate_id"
verify_output="$(bash -c 'source "$1"; verify_readiness "$2" && printf PASS' _ "$deploy_script" "$candidate_id")"
[[ "$verify_output" == "PASS" ]]

printf 'READY:WRONG-RELEASE\nREADY\n' > "$readiness_sequences/$second_id"
set +e
bash -c 'source "$1"; verify_readiness "$2"' _ "$deploy_script" "$second_id" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
[[ "$(head -n 1 "$readiness_sequences/$second_id")" == "READY" ]]

printf '502\n503\n502\n' > "$readiness_sequences/$second_id"
printf '502\nCONNECT_ERROR\nREADY\n' > "$readiness_sequences/$candidate_id"
export SPW_TEST_READINESS_MAX_ATTEMPTS=3
set +e
$deploy_script switch --plan "$second_plan" --human-go "$second_id" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
grep -q 'result=ROLLED_BACK' "$WBD_ROOT/shared/deploy-evidence/$second_id/deployment.txt"
unset SPW_TEST_READINESS_SEQUENCE_DIR SPW_TEST_READINESS_MAX_ATTEMPTS

# Ook een rode post-switch smoke rolt automatisch terug, nadat readiness zelf
# al groen was. De kandidaat mag niet actief achterblijven.
unset SPW_TEST_FAIL_RELEASE
export SPW_TEST_POST_SWITCH_SMOKE_STATUS=FAIL
set +e
$deploy_script switch --plan "$second_plan" --human-go "$second_id" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
grep -q 'result=ROLLED_BACK' "$WBD_ROOT/shared/deploy-evidence/$second_id/deployment.txt"
unset SPW_TEST_POST_SWITCH_SMOKE_STATUS

# Ook een fout tussen env-update en symlink-update herstelt de oude env/state.
export SPW_TEST_FAIL_ATOMIC_RELEASE="$second_id"
set +e
$deploy_script switch --plan "$second_plan" --human-go "$second_id" >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
unset SPW_TEST_FAIL_ATOMIC_RELEASE

# Een mismatchende Human GO wordt fail-closed geweigerd.
set +e
$deploy_script switch --plan "$second_plan" --human-go WRONG-RELEASE >/dev/null 2>&1
status=$?
set -e
[[ "$status" -ne 0 ]]

printf 'IMMUTABLE_RELEASE_FOUNDATION_TESTS=PASS\n'
printf 'PREPARE_WITHOUT_SWITCH=PASS\n'
printf 'ATOMIC_SWITCH=PASS\n'
printf 'AUTOMATIC_APPLICATION_ROLLBACK=PASS\n'
printf 'TRANSIENT_502_THEN_READY=PASS\n'
printf 'DELAYED_CANDIDATE_READINESS=PASS\n'
printf 'DELAYED_ROLLBACK_READINESS=PASS\n'
printf 'PERMANENT_READINESS_FAILURE_ROLLBACK=PASS\n'
printf 'WRONG_RELEASE_ID_FAIL_CLOSED=PASS\n'
printf 'EXACT_CANONICAL_REDIRECT_SMOKE=PASS\n'
printf 'POST_SWITCH_SMOKE_ROLLBACK=PASS\n'
printf 'INTERMEDIATE_SWITCH_FAILURE_ROLLBACK=PASS\n'
printf 'STALE_AND_HUMAN_GO_GUARDS=PASS\n'
printf 'PRECHECK_FAILED_EVIDENCE=PASS\n'
printf 'PRECHECK_FAILURE_ACTIVE_UNCHANGED=PASS\n'
printf 'EXTERNAL_REGRESSION_CONTRACT_BINDING=PASS\n'

export SPW_TEST_MIGRATION_STATUS=FAIL
set +e
"$deploy_script" switch --plan "$second_plan" --human-go "$second_id" >/dev/null 2>&1
migration_status=$?
set -e
[[ "$migration_status" -ne 0 ]]
[[ "$(basename "$(cat "$WBD_ROOT/current")")" == "$candidate_id" ]]
grep -q "RELEASE_ID=$candidate_id" "$WBD_ENV_FILE"
grep -q '^result=PRECHECK_FAILED$' "$WBD_ROOT/shared/deploy-evidence/$second_id/deployment.txt"
grep -q '^failed_gate=CANDIDATE_MIGRATIONS$' "$WBD_ROOT/shared/deploy-evidence/$second_id/deployment.txt"
unset SPW_TEST_MIGRATION_STATUS
printf 'CANDIDATE_MIGRATION_FAIL_CLOSED=PASS\n'
