// Measurement-only loader. The complete immutable assurance entrypoint and
// contract remain the candidate's; only its product imports select a runtime.
// The collector verifies every runtime file against the selected manifest.
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
// Store/backfill probes belong to the shared assurance rig. Older deployed
// bundles did not package the inactive Owner domain-store probe at all. Keep
// these exact candidate probe dependencies identical for both measurements;
// never silently fall back for a missing product module.
const assuranceImports=new Set(['./sportpaleis-domain-mariadb-store.mjs','./wbd-owner-domain-mariadb-store.mjs','./workspace-domain-state.mjs','./wbd-owner-domain-state.mjs','./sportpaleis-domain-rollback-bridge.mjs']);
export async function resolve(specifier, context, nextResolve) {
  const parent=context.parentURL?.startsWith('file:')?fileURLToPath(context.parentURL):'';
  const entry=process.env.BASELINE_ASSURANCE_ENTRY;
  const root=process.env.BASELINE_RUNTIME_ROOT;
  if(entry && root && path.resolve(parent)===path.resolve(entry) && !assuranceImports.has(specifier) && (specifier.startsWith('./') || specifier.startsWith('../src/'))){
    const target=path.resolve(root,'scripts',specifier);
    if(!target.startsWith(path.resolve(root)+path.sep)) throw new Error('BASELINE_RUNTIME_IMPORT_ESCAPE');
    return nextResolve(pathToFileURL(target).href,context);
  }
  return nextResolve(specifier,context);
}
