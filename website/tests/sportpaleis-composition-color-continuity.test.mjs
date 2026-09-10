import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createServer } from 'vite';
import { SportpaleisFileStore, SportpaleisPilotService } from '../scripts/sportpaleis-pilot-foundation.mjs';
import { productionAssetPiece, productionAssetPieces, productionNumberGlyphSpacingMm } from '../src/sportpaleis/production-assets.mjs';
import { verifiedProductionNumberSources } from '../src/sportpaleis/verified-production-number-sources.mjs';
import { boundsForContours, createCutJobBatch, groupSemanticNumberObjects } from '../src/sportpaleis/direct-print/index.ts';
import { directReadyProductionColorGroups, openProductionColorContexts, unprintedProductionGroup } from '../src/sportpaleis/open-production-colors.ts';
import { createTestMailFoundation } from './helpers/sportpaleis-delivery-evidence.mjs';
import { createManagedFontProductionPiece } from '../src/sportpaleis/managed-font-production.mjs';

const values = ['11', '23', '44', '67', '87'];
const near = (a, b, tolerance = 0.003) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const empty = { initials: '', initialsInfix: '', name: '', backNumber: '', chestNumber: '', backNumberSizeClass: '', shortsNumber: '' };
const evidence = [];
async function save(name, value) {
  if (!process.env.SPW_COMPOSITION_EVIDENCE_DIR) return;
  await mkdir(process.env.SPW_COMPOSITION_EVIDENCE_DIR, { recursive: true });
  await writeFile(path.join(process.env.SPW_COMPOSITION_EVIDENCE_DIR, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}

test('11, 23, 44, 67, 87: iedere vectorbron levert direct één rigid nummerobject; 0–9 blijven identiek', async () => {
  for (const { element: asset } of verifiedProductionNumberSources().filter(({ element }) => element.lifecycleStatus === 'PRODUCTION_READY')) {
    for (const heightMm of [75, 200]) for (const value of [...values, ...'0123456789']) {
      const args = { asset, variant: asset.variants[0], line: { id: `line-${value}`, content: value, widthMm: 100, heightMm }, order: { id: 'PROOF', items: [], association: asset.ownerName }, foilColor: 'Wit' };
      const pieces = productionAssetPieces(args);
      assert.equal(pieces.length, 1, `${asset.id}:${value}: one production object`);
      assert.deepEqual(groupSemanticNumberObjects(pieces), pieces, 'later grouping is idempotent');
      const piece = pieces[0];
      const source = boundsForContours(piece.contours);
      near(source.height, heightMm);
      const members = piece.semanticGroup.physicalMembers;
      let expectedWidth = 0;
      if (value.length > 1) {
        assert.equal(members.length, value.length);
        for (const [i, digit] of [...value].entries()) {
          const glyph = asset.numberGlyphs[digit];
          const glyphBounds = boundsForContours(glyph.contours);
          const member = members[i];
          near(member.sourceBoundsMm.width, glyphBounds.width / glyph.heightUnits * heightMm, 0.025);
          near(member.sourceBoundsMm.height, glyphBounds.height / glyph.heightUnits * heightMm, 0.025);
          assert.equal(member.assetIdentity.geometryHash, glyph.geometryHash);
          assert.equal(member.assetIdentity.assetId, asset.id);
          near(member.relativePlacementMm.x, expectedWidth);
          expectedWidth += member.sourceBoundsMm.width + (i < value.length - 1 ? productionNumberGlyphSpacingMm(asset) : 0);
        }
        near(source.width, expectedWidth);
      } else {
        const previous = productionAssetPiece(args);
        const previousBounds = boundsForContours(previous.contours);
        near(source.width, previousBounds.width);
        const normalize = (contours, bounds) => contours.map(({ points }) => points.map(({ x, y }) => ({ x: x - bounds.minX, y: y - bounds.minY })));
        assert.deepEqual(normalize(piece.contours, source), normalize(previous.contours, previousBounds));
      }
      for (const rotation of [0, 90]) {
        const batch = createCutJobBatch({ organizationId: 'sportpaleis', orderId: 'PROOF', revision: 1, attemptIdPrefix: `${value}-${rotation}`, createdAt: '2026-09-08T00:00:00Z', pieces: [{ ...piece, productionRule: { ...piece.productionRule, allowedNestingRotations: [rotation] } }], nesting: { absoluteMaxWidthMm: 450, preferredWorkingWidthMm: 440, minimumCutGapMm: 6.4, edgeMarginMm: 5 } });
        const job = batch.jobs[0];
        assert.equal(job.productionGeometry.groups.length, 1);
        assert.equal(job.readyForPrinting, true);
        assert.equal(job.nesting.scaleApplied, 1);
        const placed = job.productionGeometry.groups[0];
        assert.equal(placed.mirrorApplied, true);
        assert.equal(placed.nestingRotationApplied, rotation);
        near(placed.boundsMm.width, rotation ? source.height : source.width, 0.025);
        near(placed.boundsMm.height, rotation ? source.width : source.height, 0.025);
        if (value.length > 1) {
          assert.equal(placed.physicalMembers.length, value.length);
          const [left, right] = placed.physicalMembers.map(({ boundsMm }) => boundsMm);
          near(rotation ? Math.max(right.minY - left.maxY, left.minY - right.maxY) : Math.max(right.minX - left.maxX, left.minX - right.maxX), productionNumberGlyphSpacingMm(asset));
        }
      }
      if (heightMm === 200 && value.length > 1) evidence.push({ source: asset.id, value, widthMm: source.width, heightMm: source.height, gapMm: productionNumberGlyphSpacingMm(asset), objectCount: pieces.length, contours: piece.contours });
    }
  }
  await save('number-composition.json', evidence.map(({ contours, ...row }) => row));
  const panels = evidence.map((row, index) => {
    const x = 15 + (index % 5) * 300;
    const y = 35 + Math.floor(index / 5) * 260;
    const d = row.contours.map(({ points }) => `M ${points.map(({ x, y }) => `${x},${y}`).join(' L ')} Z`).join(' ');
    return `<g transform="translate(${x} ${y})"><text y="-15" font-size="10">${row.value}: ${row.widthMm.toFixed(2)} × 200 mm · gap ${row.gapMm} mm</text><path d="${d}" fill="black" fill-rule="evenodd"/></g>`;
  }).join('');
  await save('number-composition.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1510 ${Math.ceil(evidence.length / 5) * 260}"><rect width="100%" height="100%" fill="white"/>${panels}</svg>`);
});

async function fixture(context) {
  const root = await mkdtemp(path.join(tmpdir(), 'spw-composition-colors-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const seedPasswords = { kevin: 'Composition-Admin-2026!', patrick: 'Composition-Operator-2026!', collega: 'Composition-Store-2026!', 'donovan-support': 'Composition-Support-2026!' };
  const store = new SportpaleisFileStore({ filePath: path.join(root, 'state.json'), backupDirectory: path.join(root, 'backups'), seedPasswords });
  const service = new SportpaleisPilotService({ store, mailFoundation: createTestMailFoundation(root), artifactRoot: path.resolve(import.meta.dirname, '..'), runtimeArtifactRoot: path.join(root, 'runtime'), releaseId: 'SPW-COMPOSITION-COLORS-PROOF' });
  await service.initialize();
  const admin = await service.login({ email: 'kevin@sportpaleis.nl', password: seedPasswords.kevin });
  const bootstrap = await service.bootstrap(admin.token);
  const font = bootstrap.productionFonts.find(({ status }) => status === 'TECHNICALLY_VALID');
  async function create(key, colors, numbers = ['11'], sourceId = font.id) {
    const productionLines = colors.flatMap((foilColor) => numbers.map((content) => ({ id: `${key}-${foilColor}-${content}`, type: 'NUMBER', personalizationField: 'backNumber', content, previewLabel: `Rugnummer ${content}`, widthMm: 100, heightMm: 200, quantity: 2, sourceId, foilColor })));
    const created = (await service.createOrder(admin.token, admin.csrfToken, { orderKind: 'CUSTOM', customer: key, customerEmail: '', customerPhone: '', standardPersonalization: empty, items: [{ product: key, size: '', quantity: productionLines.length * 2, personalization: key, foilColor: colors[0], deviation: true, overrides: empty }], productionLines }, `${key}-create`)).value;
    return (await service.advanceOrder(admin.token, admin.csrfToken, created.id, created.revision, `${key}-control`)).value;
  }
  return { root, store, service, admin, font, create };
}

test('fontnummer 11 en bestaande voorbeelden blijven per exemplaar één productieobject in de echte export', async (context) => {
  const { root, service, admin, create, font } = await fixture(context);
  const bytes = await readFile(path.resolve(import.meta.dirname, '../public', `.${font.sourceUrl}`));
  const order = await create('font-proof', ['Wit'], [...values, ...'0123456789']);
  const result = (await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: 'Wit' }, 'font-proof-job')).value;
  const job = result.job;
  const groups = job.snapshot.layout.productionGeometry.groups;
  assert.equal(groups.length, 30, '15 numbers × 2 copies, no extra digit objects');
  for (const value of values) {
    const selected = groups.filter(({ provenance }) => provenance.semanticGroup?.value === value);
    assert.equal(selected.length, 2, value);
    for (const placed of selected) {
      assert.deepEqual(placed.physicalMembers.map(({ digit }) => digit), [...value]);
      const [a, b] = placed.physicalMembers.map(({ boundsMm }) => boundsMm);
      const native = createManagedFontProductionPiece({ fontRecord: font, bytes, content: value, widthMm: 100, heightMm: 200, id: 'native-reference', foilColor: 'Wit' });
      const first = boundsForContours(native.contours.filter(({ id }) => id.startsWith('native-reference-g1-')));
      const second = boundsForContours(native.contours.filter(({ id }) => id.startsWith('native-reference-g2-')));
      near(placed.nestingRotationApplied ? Math.max(b.minY - a.maxY, a.minY - b.maxY) : Math.max(b.minX - a.maxX, a.minX - b.maxX), second.minX - first.maxX);
      assert.equal(placed.provenance.semanticGroup.spacingAuthority, 'SOURCE_NATIVE_SPACING_AUTHORITY');
      near(placed.sourceBoundsMm.height, 200);
      assert.equal(placed.mirrorApplied, true);
    }
  }
  const svg = await readFile(path.join(root, 'runtime', job.snapshot.artifact.path), 'utf8');
  assert.doesNotMatch(svg, /<(?:line|rect|polyline|polygon)\b/u);
  await save('font-production.svg', svg);
  await save('font-production.json', groups.map(({ sourcePieceId, sourceBoundsMm, boundsMm, physicalMembers, nestingRotationApplied, mirrorApplied }) => ({ sourcePieceId, sourceBoundsMm, boundsMm, physicalMembers, nestingRotationApplied, mirrorApplied })));
});

test('vector 11 en 87: twee exemplaren behouden unieke glyphprovenance per compleet object', async (context) => {
  const { service, admin, create } = await fixture(context);
  const source = 'production-asset-verified-hockey-rug-200';
  const order = await create('vector-copy-proof', ['Wit'], ['11', '87'], source);
  const { job } = (await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: 'Wit' }, 'vector-copy-proof-job')).value;
  const groups = job.snapshot.layout.productionGeometry.groups;
  assert.equal(groups.length, 4);
  const members = groups.flatMap(({ physicalMembers }) => physicalMembers);
  assert.equal(new Set(members.map(({ sourceObjectId }) => sourceObjectId)).size, 8);
  assert.ok(members.every(({ assetIdentity }) => assetIdentity.assetId === source && assetIdentity.sourceKind === 'PRODUCTION_ASSET'));
  assert.deepEqual(groups.map(({ provenance }) => provenance.semanticGroup.value).sort(), ['11', '11', '87', '87']);
});

for (const adopt of [false, true]) test(`Operator: WIT Bedrukt behoudt ZWART en BLAUW: ${adopt ? 'adoptie in bestaand voorstel' : 'BLAUW nog READY buiten voorstel'}`, async (context) => {
  const { service, admin, create } = await fixture(context);
  const operator = await service.login({ email: 'patrick@sportpaleis.nl', password: 'Composition-Operator-2026!' });
  const first = await create(`white-black-${adopt}`, ['Wit', 'Zwart']);
  const proposal = (await service.createProductionProposal(admin.token, admin.csrfToken, { orders: [{ id: first.id, expectedRevision: first.revision }] }, `proposal-${adopt}`)).value;
  const next = await create(`blue-${adopt}`, adopt ? ['Wit', 'Blauw'] : ['Blauw']);
  const white = proposal.groups.find(({ foilColor }) => foilColor === 'Wit');
  const whiteJob = adopt
    ? (await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: next.id, expectedRevision: next.revision }], foilColor: 'Wit' }, `color-continuity-adopt-${adopt}`)).value.job
    : (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: proposal.id, proposalGroupId: white.id, orders: white.orders }, `color-continuity-white-${adopt}`)).value;
  if (adopt) assert.equal(whiteJob.snapshot.orderIds.length, 2);
  const before = await service.bootstrap(operator.token);
  const completion = await service.completeProductionJob(operator.token, operator.csrfToken, whiteJob.id, `complete-white-${adopt}`);
  const state = await service.bootstrap(operator.token);
  const ids = new Set([first.id, next.id]);
  const scope = (input) => ({ ...input, orders: input.orders.filter(({ id }) => ids.has(id)), productionProposals: input.productionProposals.filter(({ orders }) => orders.some(({ id }) => ids.has(id))) });
  const scoped = scope(state);
  globalThis.location = { pathname: '/workspace/sportpaleis/productie', search: '', hash: '', hostname: 'localhost', protocol: 'http:' };
  const vite = await createServer({ root: path.resolve(import.meta.dirname, '..'), configFile: false, server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'silent', plugins: [{ name: 'production-filter-evidence', enforce: 'pre', transform(code, id) { if (id.endsWith('/sportpaleis-workspace.ts')) return code.replace(/(let activeProductionFilter[^\n]+ = )"ready";/u, '$1"printing";'); } }] });
  context.after(() => vite.close());
  const { renderSportpaleisWorkspacePageForEvidence, applyProductionCompletionProjection } = await vite.ssrLoadModule('/src/sportpaleis-workspace.ts');
  const immediateState = structuredClone(before);
  applyProductionCompletionProjection(immediateState, completion.projection);
  const rendered = renderSportpaleisWorkspacePageForEvidence(scope(immediateState), '/workspace/sportpaleis/productie').html;
  const primary = rendered.slice(rendered.indexOf('sp-production-primary-actions'), rendered.indexOf('sp-production-counters'));
  assert.match(primary, /<strong>BLAUW<\/strong>/u, 'BLAUW zichtbaar direct na WIT in filter In productie');
  assert.match(primary, /<strong>ZWART<\/strong>/u);
  assert.doesNotMatch(primary, /<strong>WIT<\/strong>/u);
  assert.match(primary, /Welke foliekleur wil je nu produceren/u);
  await save('colors-' + (adopt ? 'adoption' : 'direct') + '-after-white.html', '<!doctype html><meta charset="utf-8"><title>Na WIT: ZWART en BLAUW open</title><style>body{font-family:Arial;max-width:1000px;margin:30px auto}article,section{padding:16px;border:1px solid #ddd;margin:12px}strong{display:block}button{padding:12px}</style>' + rendered);
  assert.deepEqual(openProductionColorContexts(scoped).map(({ foilColor }) => foilColor).sort(), ['Blauw', 'Zwart']);
  const blue = scoped.orders.find(({ id }) => id === next.id);
  assert.equal(blue.productionStatus, adopt ? 'PARTIALLY_PRODUCED' : 'READY');
  assert.equal(blue.eventHistory.some(({ type, details }) => type === 'PRODUCTION_GROUP_PRINTED' && details.foilColor === 'Blauw'), false);
  assert.equal(blue.productionClosure.status === 'ELIGIBLE', false);
  const direct = directReadyProductionColorGroups(scoped);
  assert.deepEqual(direct.map(([color]) => color), adopt ? [] : ['Blauw']);
  const saved = scoped.productionProposals.find(({ id }) => id === proposal.id);
  const black = saved.groups.find(({ foilColor }) => foilColor === 'Zwart');
  assert.equal(black.status, 'OPEN');
  assert.ok(unprintedProductionGroup(scoped, black));
  if (adopt) {
    assert.equal(saved.groups.find(({ foilColor }) => foilColor === 'Blauw').status, 'OPEN');
    const incompleteAdoption = structuredClone(scoped);
    incompleteAdoption.productionProposals.find(({ id }) => id === saved.id).groups = saved.groups.filter(({ foilColor }) => foilColor !== 'Blauw');
    const incompleteHtml = renderSportpaleisWorkspacePageForEvidence(incompleteAdoption, '/workspace/sportpaleis/productie').html;
    assert.match(incompleteHtml, /Snel produceren · BLAUW/u, 'onvolledig geadopteerd geldig werk wordt automatisch opnieuw beschikbaar');
    assert.doesNotMatch(incompleteHtml, /productiecontrole nodig|Controleer SP-/u);
    const sourceBlocked = structuredClone(scoped);
    const blockedLine = sourceBlocked.orders.find(({ id }) => id === next.id).productionLines.find(({ foilColor }) => foilColor === 'Blauw');
    blockedLine.validation = { status: 'BLOCKED', reason: 'De exacte nummerbron ontbreekt. Koppel de bevestigde nummerbron.' };
    const blockedHtml = renderSportpaleisWorkspacePageForEvidence(sourceBlocked, '/workspace/sportpaleis/productie').html;
    assert.match(blockedHtml, /De exacte nummerbron ontbreekt/u);
    assert.match(blockedHtml, /Herstel de bron van deze opdruk/u);
    assert.doesNotMatch(blockedHtml, />BLAUW nu produceren</u);
    const inactive = structuredClone(scoped);
    inactive.activeProductionFoilColors = inactive.activeProductionFoilColors.filter((color) => color !== 'Blauw');
    const inactiveHtml = renderSportpaleisWorkspacePageForEvidence(inactive, '/workspace/sportpaleis/productie').html;
    assert.match(inactiveHtml, /Foliekleur BLAUW is niet actief/u);
    assert.doesNotMatch(inactiveHtml, />BLAUW nu produceren</u);
  }
  const blackJob = (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: saved.id, proposalGroupId: black.id, orders: black.orders }, `color-continuity-black-${adopt}`)).value;
  const blackActive = scope(await service.bootstrap(operator.token));
  assert.deepEqual(openProductionColorContexts(blackActive).map(({ foilColor }) => foilColor).sort(), ['Blauw', 'Zwart']);
  assert.equal(blackActive.productionJobs.find(({ id }) => id === blackJob.id).status, 'AWAITING_HUMAN_CHECK');
  const waitingHtml = renderSportpaleisWorkspacePageForEvidence(blackActive, '/workspace/sportpaleis/productie').html;
  assert.match(waitingHtml, /NOG TE PRODUCEREN[\s\S]*?<strong>BLAUW<\/strong>/u, 'BLAUW blijft expliciet zichtbaar tijdens ZWART');
  await save('colors-' + (adopt ? 'adoption' : 'direct') + '-black-active.html', '<!doctype html><meta charset="utf-8"><title>ZWART actief; BLAUW open</title>' + waitingHtml);
  await service.completeProductionJob(operator.token, operator.csrfToken, blackJob.id, `complete-black-${adopt}`);
  const afterBlack = scope(await service.bootstrap(operator.token));
  let blueJob;
  if (adopt) {
    const current = afterBlack.productionProposals.find(({ id }) => id === saved.id).groups.find(({ foilColor }) => foilColor === 'Blauw');
    blueJob = (await service.createProductionJob(operator.token, operator.csrfToken, { proposalId: saved.id, proposalGroupId: current.id, orders: current.orders }, `color-continuity-blue-job-${adopt}`)).value;
  } else {
    const current = afterBlack.orders.find(({ id }) => id === next.id);
    blueJob = (await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: current.id, expectedRevision: current.revision }], foilColor: 'Blauw' }, `color-continuity-blue-job-${adopt}`)).value.job;
  }
  assert.equal(blueJob.snapshot.productionGroup.foilColor, 'Blauw');
  await save(`colors-${adopt ? 'adoption' : 'direct'}.json`, { before: openProductionColorContexts(scope(before)), afterWhite: openProductionColorContexts(scoped), directAvailableAfterWhite: direct.map(([color]) => color), blueStatusAfterWhite: blue.productionStatus, afterBlackSelected: openProductionColorContexts(blackActive), blueJob: { id: blueJob.id, color: blueJob.snapshot.productionGroup.foilColor }, completionProjection: { orders: completion.projection.orders.map(({ id, productionStatus }) => ({ id, productionStatus })), groups: completion.projection.productionProposals.flatMap(({ groups }) => groups.map(({ foilColor, status }) => ({ foilColor, status }))) } });
});

test('Geldige resterende opdruk zonder OPEN groep wordt vanuit PARTIALLY_PRODUCED opnieuw gevormd zonder Bedrukt werk te herhalen', async (context) => {
  const { service, store, admin, create } = await fixture(context);
  const operator = await service.login({ email: 'patrick@sportpaleis.nl', password: 'Composition-Operator-2026!' });
  const order = await create('missing-open-blue', ['Wit', 'Blauw']);
  const { job, proposal } = (await service.prepareCurrentProductionGroup(admin.token, admin.csrfToken, { orders: [{ id: order.id, expectedRevision: order.revision }], foilColor: 'Wit' }, 'orphan-white')).value;
  await service.completeProductionJob(operator.token, operator.csrfToken, job.id, 'orphan-white-done');
  await store.mutate((state) => { const p = state.productionProposals.find(({ id }) => id === proposal.id); p.groups = p.groups.filter(({ foilColor }) => foilColor !== 'Blauw'); return { state, value: null }; });
  const before = await service.bootstrap(operator.token);
  const current = before.orders.find(({ id }) => id === order.id);
  assert.equal(current.productionStatus, 'PARTIALLY_PRODUCED');
  const scoped = { ...before, orders: [current], productionProposals: before.productionProposals.filter(({ id }) => id === proposal.id) };
  assert.deepEqual(directReadyProductionColorGroups(scoped).map(([color]) => color), ['Blauw']);
  const input = { orders: [{ id: current.id, expectedRevision: current.revision }], foilColor: 'Blauw' };
  const next = (await service.prepareCurrentProductionGroup(operator.token, operator.csrfToken, input, 'orphan-blue-production')).value;
  assert.equal(next.job.snapshot.productionGroup.foilColor, 'Blauw');
  assert.ok(next.job.snapshot.productionLines.every(({ content }) => content === '11'));
  assert.equal(next.job.snapshot.layout.objectCount, 2);
  assert.equal(next.proposal.groups.length, 1, 'afgeronde WIT niet opnieuw gegroepeerd');
  assert.equal((await service.prepareCurrentProductionGroup(operator.token, operator.csrfToken, input, 'orphan-blue-production')).value.job.id, next.job.id);
  const after = await service.bootstrap(operator.token);
  assert.deepEqual(after.productionJobs.find(({ id }) => id === job.id).snapshot, before.productionJobs.find(({ id }) => id === job.id).snapshot);
  assert.equal(after.productionJobs.filter(({ id }) => id === next.job.id).length, 1);
});
