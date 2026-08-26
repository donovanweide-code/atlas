import { createAuditEvent, classifyReleaseError, normalizeAuditActor, verifyAuditChain } from "./release-engine-core.mjs";
import { appendReleaseTransition, currentReleaseState } from "./release-engine-state-store.mjs";
import {
  buildMigrationPlan,
  createLockedDeployPlan,
  inspectEnvironmentContract,
  inspectMigrationState,
  inspectRecoveryReadiness,
  verifyLockedDeployPlan,
} from "./release-engine-inspection.mjs";

function runtimeSatisfies(actual, required) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/u.exec(String(actual));
  if (!match) return false;
  const version = match.slice(1).map(Number);
  const compare = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  return String(required).split(/\s+/u).filter(Boolean).every((clause) => {
    const parsed = /^(>=|<=|>|<|=)?v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/u.exec(clause);
    if (!parsed) return false;
    const operator = parsed[1] ?? "=";
    const target = [Number(parsed[2]), Number(parsed[3] ?? 0), Number(parsed[4] ?? 0)];
    const result = compare(version, target);
    return operator === ">=" ? result >= 0 : operator === "<=" ? result <= 0 : operator === ">" ? result > 0 : operator === "<" ? result < 0 : result === 0;
  });
}

function identity(contract) {
  return { tenant: contract.tenant, application: contract.application, releaseId: contract.releaseId };
}

async function guarded(operation, context) {
  try { return await operation(); }
  catch (error) { throw classifyReleaseError(error, context); }
}

export class WbdReleaseEngine {
  constructor({ stateStore, platform, clock = () => new Date() }) {
    this.stateStore = stateStore;
    this.platform = platform;
    this.clock = clock;
  }

  async state(contract) {
    return currentReleaseState(this.stateStore, identity(contract));
  }

  async events(contract) {
    const events = await this.stateStore.events(identity(contract));
    verifyAuditChain(events);
    return events;
  }

  async transition(contract, to, type, details, idempotencyKey, actorId = "wbd-release-runner", actorDisplayName = null) {
    return appendReleaseTransition(this.stateStore, identity(contract), { to, type, details, actorId, actorDisplayName, idempotencyKey, at: this.clock().toISOString() });
  }

  async checkpoint(contract, type, details, idempotencyKey, actorId = "wbd-release-runner", actorDisplayName = null) {
    const previous = await this.state(contract);
    if (!previous) throw new Error("Checkpoint zonder release-state geweigerd.");
    const existing = (await this.events(contract)).find((event) => event.idempotencyKey === idempotencyKey);
    if (existing) return existing;
    return this.stateStore.append(identity(contract), createAuditEvent({ previous, state: previous.state, type, ...identity(contract), actorId, actorDisplayName, details, idempotencyKey, at: this.clock().toISOString() }));
  }

  async register(contract) {
    const current = await this.state(contract);
    if (current) return current;
    return this.transition(contract, "CANDIDATE", "candidate_registered", { contractHash: contract.contractHash, commit: contract.commit, tag: contract.tag }, `candidate-${contract.contractHash}`);
  }

  async acquireOperationLocks(contract, purpose) {
    let releaseEnvironment;
    let environmentHeld = false;
    const acquireEnvironment = async (lockPurpose = purpose) => {
      try {
        releaseEnvironment = this.platform.acquireEnvironmentLock
          ? await this.platform.acquireEnvironmentLock(contract, lockPurpose)
          : async () => {};
        environmentHeld = true;
      } catch (error) {
        throw classifyReleaseError(error, {
          stage: "LOCKING", className: "ENVIRONMENT_LOCK", component: "production-environment",
          candidate: contract.releaseId, nextAction: "Wacht tot de actieve production release-run klaar is; lees daarna baseline en health opnieuw.", retrySafe: true,
        });
      }
    };
    const releaseEnvironmentLock = async () => {
      if (!environmentHeld) return;
      environmentHeld = false;
      await releaseEnvironment();
    };
    await acquireEnvironment();
    try {
      const releaseApplication = await this.stateStore.lock(identity(contract), purpose);
      const unlock = async () => {
        try { await releaseApplication(); }
        finally { await releaseEnvironmentLock(); }
      };
      unlock.releaseEnvironment = releaseEnvironmentLock;
      unlock.reacquireEnvironment = async (lockPurpose) => {
        if (environmentHeld) return;
        await acquireEnvironment(lockPurpose);
      };
      return unlock;
    } catch (error) {
      await releaseEnvironmentLock();
      throw classifyReleaseError(error, {
        stage: "LOCKING", className: "CONCURRENT_RELEASE", component: `${contract.tenant}:${contract.application}`,
        candidate: contract.releaseId, nextAction: "Laat de bestaande release-run eindigen en herhaal daarna vanaf een verse read-only baseline.", retrySafe: true,
      });
    }
  }

  async inspectAndPrepare(contract) {
    await this.register(contract);
    const unlock = await this.acquireOperationLocks(contract, "prepare");
    try {
      const current = await this.state(contract);
      if (current.state === "AWAITING_HUMAN_GO") return this.platform.loadPlan(contract);
      if (!["CANDIDATE", "BLOCKED"].includes(current.state)) throw new Error(`Prepare niet toegestaan vanuit ${current.state}.`);
      await this.transition(contract, "INSPECTING", "inspection_started", {}, `inspect-${current.sequence + 1}`);
      try {
        const active = await this.platform.inspectCurrent(contract);
        if (active.health !== "PASS" || active.readiness !== "PASS") throw Object.assign(new Error("Actieve productie is niet gezond/readiness-ready."), { code: "CURRENT_HEALTH_FAIL" });
        if (active.releaseId !== contract.expectedBaseline.releaseId || active.commit !== contract.expectedBaseline.commit) {
          throw Object.assign(new Error(`Production baseline drift: ${active.releaseId}/${active.commit}.`), { code: "BASELINE_DRIFT" });
        }
        const artifact = await this.platform.inspectArtifact(contract);
        if (artifact.sha256 !== contract.artifact.sha256 || artifact.manifestSha256 !== contract.artifact.manifestSha256 || artifact.commit !== contract.commit || artifact.tag !== contract.tag) {
          throw Object.assign(new Error("Artifact/manifest/tag/commit-integriteit wijkt af."), { code: "ARTIFACT_INTEGRITY" });
        }
        if (contract.compatibilityPolicy.baselineMustBeAncestor
          && (contract.compatibilityPolicy.proof.baselineCommit !== active.commit || artifact.baseFreezeCommit !== active.commit)) {
          throw Object.assign(new Error("Forward-only ancestry/baseline proof wijkt af."), { code: "BASELINE_DRIFT" });
        }
        if (!runtimeSatisfies(active.runtimeVersion, contract.requiredRuntimeVersion)) {
          throw Object.assign(new Error(`Runtimeversie ${active.runtimeVersion} wijkt af van ${contract.requiredRuntimeVersion}.`), { code: "RUNTIME_VERSION_MISMATCH" });
        }
        const environment = this.platform.inspectEnvironment
          ? await this.platform.inspectEnvironment(contract)
          : inspectEnvironmentContract(contract, await this.platform.readEnvironment(contract), await this.platform.inspectSecrets(contract));
        const databaseInspections = [];
        const actualSchemas = [];
        for (const database of contract.databases) {
          try {
            const actual = await this.platform.inspectDatabase(contract, database, environment.resolved);
            actualSchemas.push({ database: database.id, ...actual });
            databaseInspections.push(inspectMigrationState(database, actual));
          } catch (error) {
            throw classifyReleaseError(error, { stage: "INSPECTING", component: `database:${database.id}`, candidate: contract.releaseId, className: "DATABASE_CONNECTIVITY", nextAction: "Herstel database-connectiviteit binnen de bestaande credential-boundary en herhaal read-only inspectie.", retrySafe: true });
          }
        }
        const migrationPlan = buildMigrationPlan(contract, databaseInspections);
        let recovery = await guarded(() => this.platform.inspectRecovery(contract), { stage: "INSPECTING", component: "backup-recovery", candidate: contract.releaseId, className: "ROLLBACK", nextAction: "Herstel de centrale backup/restore-evidence boundary en herhaal prepare.", retrySafe: true });
        let recoveryReadiness = inspectRecoveryReadiness(contract, recovery, this.clock().getTime());
        if (!recoveryReadiness.ready && contract.prepare.autoBackup) {
          recovery = await guarded(() => this.platform.createAndVerifyBackup(contract, { scopes: contract.databases.map((database) => database.id) }), { stage: "PREPARED", component: "backup-recovery", candidate: contract.releaseId, className: "ROLLBACK", nextAction: "Herstel backup of geïsoleerde restore-verificatie; wijzig de candidate niet.", retrySafe: true });
          recoveryReadiness = inspectRecoveryReadiness(contract, recovery, this.clock().getTime());
        }
        if (!recoveryReadiness.ready) throw Object.assign(new Error("Backup/restore recoverybasis is niet bewezen."), { code: "RECOVERY_NOT_READY", recoveryReadiness });
        const schemaSnapshot = contract.prepare.schemaSnapshot
          ? await this.platform.createSchemaSnapshot(contract, { actualSchemas, evaluatedState: databaseInspections })
          : { sha256: "0".repeat(64) };
        await unlock.releaseEnvironment();
        const staged = await guarded(() => this.platform.stageArtifact(contract, artifact), { stage: "PREPARED", component: "artifact-staging", candidate: contract.releaseId, className: "ARTIFACT", nextAction: "Herstel uitsluitend de centrale immutable artifact-staging boundary.", retrySafe: true });
        await unlock.reacquireEnvironment("prepare-finalize");
        const finalBaseline = await this.platform.inspectCurrent(contract);
        if (finalBaseline.health !== "PASS" || finalBaseline.readiness !== "PASS"
          || finalBaseline.releaseId !== active.releaseId || finalBaseline.commit !== active.commit) {
          throw Object.assign(new Error(`Production baseline drift tijdens prepare: ${finalBaseline.releaseId}/${finalBaseline.commit}.`), { code: "BASELINE_DRIFT" });
        }
        const rollback = await guarded(() => this.platform.prepareRollback(contract, active, recovery), { stage: "PREPARED", component: "rollback-set", candidate: contract.releaseId, className: "ROLLBACK", nextAction: "Maak en verifieer de immutable rollbackset opnieuw.", retrySafe: true });
        if (rollback.verified !== true || rollback.targetReleaseId !== contract.rollback.targetReleaseId) throw Object.assign(new Error("Rollbackset kon niet worden geverifieerd."), { code: "ROLLBACK_NOT_READY" });
        const safetyCounters = this.platform.captureSideEffectCounters ? await this.platform.captureSideEffectCounters(contract) : null;
        const plan = createLockedDeployPlan({
          contract, active, artifact, environment, migrations: migrationPlan,
          recovery, stagedRelease: staged.releasePath, schemaSnapshotHash: schemaSnapshot.sha256,
          safetyCounters,
          createdAt: this.clock().toISOString(),
        });
        const supersedesPlanHash = current.state === "BLOCKED" ? current.details?.planHash ?? null : null;
        await this.platform.persistPlan(contract, plan, { supersedesPlanHash });
        await this.transition(contract, "PREPARED", "candidate_prepared", {
          planHash: plan.planHash, baseline: active, migrations: migrationPlan.steps.map(({ database, migrationId, lockRisk }) => ({ database, migrationId, lockRisk })),
          backup: { id: recovery.backup.id, checksumVerified: true }, rollback: { targetReleaseId: rollback.targetReleaseId, verified: true },
          risk: migrationPlan.risk, featureExposure: contract.featureExposure.default, supersedesPlanHash,
        }, `prepared-${plan.planHash}`);
        await this.transition(contract, "AWAITING_HUMAN_GO", "human_go_requested", this.approvalSummary(contract, plan), `awaiting-go-${plan.planHash}`);
        return plan;
      } catch (error) {
        const diagnostic = classifyReleaseError(error, {
          stage: "INSPECTING", component: "release-preflight", candidate: contract.releaseId,
          className: error?.code === "BASELINE_DRIFT" ? "BASELINE_DRIFT" : undefined,
          nextAction: error?.code === "BASELINE_DRIFT" ? "Forward-port de candidate op de actuele productie en bewijs alle gates opnieuw." : undefined,
        }).diagnostic;
        await this.transition(contract, "BLOCKED", "release_blocked", diagnostic, `blocked-${Date.now()}`);
        throw Object.assign(new Error(diagnostic.message), { diagnostic });
      }
    } finally {
      await unlock();
    }
  }

  approvalSummary(contract, plan) {
    return Object.freeze({
      currentRelease: plan.observedBaseline,
      candidate: { releaseId: contract.releaseId, commit: contract.commit, tag: contract.tag },
      codeDiffScope: contract.changeScope,
      migrations: plan.migrations.steps.map(({ database, migrationId, lockRisk }) => ({ database, migrationId, classification: "ADDITIVE", lockRisk })),
      backup: { id: plan.recovery.backupId, checksum: plan.recovery.backupSha256, restoreEvidence: plan.recovery.restoreEvidenceId },
      risk: plan.migrations.risk,
      expectedDowntime: contract.activation.restart.strategy === "single" ? "one-controlled-restart" : "unknown",
      readinessChecks: contract.activation.readinessChecks,
      smokes: contract.activation.smokeSuite,
      rollback: contract.rollback,
      featureExposure: contract.featureExposure,
      planHash: plan.planHash,
    });
  }

  async finishVerification(contract, plan) {
    const state = await this.state(contract);
    if (state.state === "ACTIVATING") await this.transition(contract, "VERIFYING", "verification_started", {}, `verify-${plan.planHash}`);
    for (const readiness of contract.activation.readinessChecks) {
      const result = await guarded(() => this.platform.runReadiness(contract, readiness, plan), { stage: "VERIFYING", component: readiness, candidate: contract.releaseId, className: "READINESS", nextAction: "Automatische rollback; onderzoek daarna de readiness-diagnostic.", retrySafe: false });
      await this.checkpoint(contract, "readiness_passed", { readiness, result }, `readiness-${readiness}-${plan.planHash}`);
    }
    for (const smoke of contract.activation.smokeSuite) {
      const result = await guarded(() => this.platform.runSmoke(contract, smoke, { release: "candidate", phase: "post-switch" }), { stage: "VERIFYING", component: smoke, candidate: contract.releaseId, className: "SMOKE", nextAction: "Automatische rollback; herstel uitsluitend de falende smoke-boundary.", retrySafe: false });
      await this.checkpoint(contract, "smoke_passed", { smoke, result }, `smoke-${smoke}-${plan.planHash}`);
    }
    if (plan.safetyCounters && this.platform.captureSideEffectCounters) {
      const after = await guarded(() => this.platform.captureSideEffectCounters(contract), { stage: "VERIFYING", component: "side-effect-counters", candidate: contract.releaseId, className: "AUDIT", nextAction: "Automatische rollback wanneer veilige side-effect evidence ontbreekt.", retrySafe: false });
      if (after.delivered !== plan.safetyCounters.delivered || after.activeSubscriptions !== plan.safetyCounters.activeSubscriptions) {
        throw classifyReleaseError(Object.assign(new Error("Onverwachte push/subscription-side effect tijdens activation."), { code: "UNEXPECTED_EXTERNAL_SIDE_EFFECT" }), { stage: "VERIFYING", component: "side-effect-counters", candidate: contract.releaseId, className: "AUDIT", nextAction: "Automatische rollback; onderzoek delivery/subscription audit zonder nieuwe push te versturen.", retrySafe: false });
      }
    }
    const evidence = await guarded(() => this.platform.writeReleaseEvidence(contract, plan, contract.postDeployEvidence), { stage: "VERIFYING", component: "release-evidence", candidate: contract.releaseId, className: "AUDIT", nextAction: "Automatische rollback; release mag zonder evidence niet LIVE worden.", retrySafe: false });
    await this.checkpoint(contract, "release_evidence_written", { evidence }, `evidence-${plan.planHash}`);
    await this.transition(contract, "LIVE", "release_live", { releaseId: contract.releaseId, planHash: plan.planHash, featureExposure: contract.featureExposure.default }, `live-${plan.planHash}`);
    return { state: "LIVE", releaseId: contract.releaseId, planHash: plan.planHash };
  }

  async finishRollback(contract, plan, reason) {
    await guarded(() => this.platform.rollback(contract, plan), { stage: "ROLLING_BACK", component: "atomic-rollback", candidate: contract.releaseId, className: "ROLLBACK", nextAction: "Gebruik onafhankelijke break-glass recovery.", retrySafe: false });
    await guarded(() => this.platform.restartRollbackTarget(contract, plan), { stage: "ROLLING_BACK", component: "rollback-restart", candidate: contract.releaseId, className: "ROLLBACK", nextAction: "Gebruik onafhankelijke break-glass recovery.", retrySafe: false });
    for (const readiness of contract.activation.readinessChecks) {
      const result = await guarded(() => this.platform.runReadiness(contract, readiness, plan, { rollback: true }), { stage: "ROLLING_BACK", component: readiness, candidate: contract.releaseId, className: "ROLLBACK", nextAction: "Gebruik onafhankelijke break-glass recovery.", retrySafe: false });
      await this.checkpoint(contract, "rollback_readiness_passed", { readiness, result }, `rollback-readiness-${readiness}-${plan.planHash}`);
    }
    for (const smoke of contract.rollback.smokeSuite) {
      const result = await guarded(() => this.platform.runSmoke(contract, smoke, { release: "rollback", phase: "rollback" }), { stage: "ROLLING_BACK", component: smoke, candidate: contract.releaseId, className: "ROLLBACK", nextAction: "Gebruik onafhankelijke break-glass recovery.", retrySafe: false });
      await this.checkpoint(contract, "rollback_smoke_passed", { smoke, result }, `rollback-smoke-${smoke}-${plan.planHash}`);
    }
    await this.transition(contract, "ROLLED_BACK", "rollback_completed", { reason, target: contract.rollback.targetReleaseId }, `rolled-back-${plan.planHash}`);
    return { state: "ROLLED_BACK", reason };
  }

  async approveAndActivate(contract, approval) {
    const approvalActor = normalizeAuditActor(approval);
    const unlock = await this.acquireOperationLocks(contract, "activate");
    let switched = false;
    let plan;
    try {
      const current = await this.state(contract);
      if (current?.state === "LIVE") return { state: "LIVE", idempotent: true };
      if (current?.state !== "AWAITING_HUMAN_GO") throw new Error(`Human GO niet toegestaan vanuit ${current?.state ?? "NONE"}.`);
      plan = await this.platform.loadPlan(contract);
      verifyLockedDeployPlan(plan, contract);
      if (approval?.releaseId !== contract.releaseId || approval?.planHash !== plan.planHash || approval?.decision !== "GO") {
        throw Object.assign(new Error("Human GO komt niet exact overeen met het locked deployplan."), { code: "GO_MISMATCH" });
      }
      const active = await this.platform.inspectCurrent(contract);
      if (active.health !== "PASS" || active.readiness !== "PASS") throw Object.assign(new Error("Actieve productie is niet gezond tijdens final drift recheck."), { code: "CURRENT_HEALTH_FAIL" });
      if (active.releaseId !== plan.observedBaseline.releaseId || active.commit !== plan.observedBaseline.commit) {
        throw Object.assign(new Error(`Final baseline drift vóór activation: actueel ${active.releaseId}/${active.commit}, plan ${plan.observedBaseline.releaseId}/${plan.observedBaseline.commit}.`), { code: "BASELINE_DRIFT" });
      }
      await this.checkpoint(contract, "final_drift_recheck_passed", { active }, `drift-${plan.planHash}`);
      await this.transition(contract, "ACTIVATING", "human_go_approved", { actorId: approvalActor.id, actorDisplayName: approvalActor.displayName, planHash: plan.planHash }, `go-${plan.planHash}`, approvalActor.id, approvalActor.displayName);

      for (const step of plan.migrations.steps) {
        await guarded(() => this.platform.applyMigration(contract, step, plan), { stage: "ACTIVATING", component: `migration:${step.database}:${step.migrationId}`, candidate: contract.releaseId, className: "MIGRATION", nextAction: "Stop vóór switch; inspecteer intent journal, ledger en echt schema.", retrySafe: true });
        const verification = await guarded(() => this.platform.verifyMigration(contract, step, plan), { stage: "ACTIVATING", component: `migration-verify:${step.database}:${step.migrationId}`, candidate: contract.releaseId, className: "MIGRATION", nextAction: "Stop vóór switch; los schema/ledger-afwijking op zonder validation over te slaan.", retrySafe: false });
        if (verification.passed !== true) throw Object.assign(new Error(`Migrationverificatie faalde voor ${step.migrationId}.`), { code: "MIGRATION_VERIFY_FAIL" });
        await this.checkpoint(contract, "migration_applied", { database: step.database, migrationId: step.migrationId, checksum: step.checksum, verification: verification.evidence }, `migration-${step.database}-${step.migrationId}`);
      }
      for (const smoke of contract.activation.oldReleasePostMigrationSmokes) {
        const result = await guarded(() => this.platform.runSmoke(contract, smoke, { release: "active-baseline", phase: "post-migration" }), { stage: "ACTIVATING", component: smoke, candidate: contract.releaseId, className: "SMOKE", nextAction: "Stop vóór switch; actieve oude release moet additieve migrations blijven verdragen.", retrySafe: false });
        await this.checkpoint(contract, "old_release_post_migration_smoke_passed", { smoke, result }, `old-smoke-${smoke}-${plan.planHash}`);
      }
      await guarded(() => this.platform.atomicSwitch(contract, plan), { stage: "ACTIVATING", component: "atomic-switch", candidate: contract.releaseId, className: "RUNTIME", nextAction: "Verifieer of de broker atomisch naar baseline heeft hersteld; forceer niets.", retrySafe: false });
      switched = true;
      await this.checkpoint(contract, "atomic_switch_completed", { releaseId: contract.releaseId }, `switch-${plan.planHash}`);
      await guarded(() => this.platform.restartService(contract, plan), { stage: "ACTIVATING", component: contract.activation.restart.service, candidate: contract.releaseId, className: "RESTART", nextAction: "Automatische rollback uitvoeren.", retrySafe: false });
      await this.checkpoint(contract, "planned_restart_completed", { service: contract.activation.restart.service, count: 1 }, `restart-${plan.planHash}`);
      return await this.finishVerification(contract, plan);
    } catch (error) {
      const diagnostic = classifyReleaseError(error, {
        stage: switched ? "VERIFYING" : "ACTIVATING", component: "release-activation", candidate: contract.releaseId,
        className: error?.code === "BASELINE_DRIFT" ? "BASELINE_DRIFT" : undefined,
        nextAction: switched ? "Automatische rollback uitvoeren en rollback-smokes verifiëren." : "Productie ongewijzigd laten en de concrete pre-switch blocker oplossen.",
      }).diagnostic;
      if (!switched) {
        const stale = diagnostic.class === "BASELINE_DRIFT";
        if ((await this.state(contract))?.state !== "BLOCKED") {
          await this.transition(contract, "BLOCKED", stale ? "stale_plan_invalidated" : "activation_blocked_before_switch", {
            ...diagnostic, planHash: plan?.planHash ?? null, invalidated: stale,
          }, `${stale ? "stale-plan" : "activation-blocked"}-${Date.now()}`);
        }
        throw Object.assign(new Error(diagnostic.message), { diagnostic });
      }
      await this.transition(contract, "ROLLING_BACK", "rollback_started", diagnostic, `rollback-start-${Date.now()}`);
      try {
        return await this.finishRollback(contract, plan, diagnostic);
      } catch (rollbackError) {
        const rollbackDiagnostic = classifyReleaseError(rollbackError, { stage: "ROLLING_BACK", component: "automatic-rollback", candidate: contract.releaseId, className: "ROLLBACK", nextAction: "Activeer onafhankelijke break-glass recovery; normale runner blijft geblokkeerd." }).diagnostic;
        await this.transition(contract, "BLOCKED", "rollback_failed", rollbackDiagnostic, `rollback-failed-${Date.now()}`);
        throw Object.assign(new Error(rollbackDiagnostic.message), { diagnostic: rollbackDiagnostic });
      }
    } finally {
      await unlock();
    }
  }

  async resume(contract) {
    const state = await this.state(contract);
    if (!state) {
      await this.register(contract);
      return this.inspectAndPrepare(contract);
    }
    if (state.state === "CANDIDATE") return this.inspectAndPrepare(contract);
    if (state.state === "BLOCKED") return { state: state.state, diagnostic: state.details };
    if (state.state === "AWAITING_HUMAN_GO") return { state: state.state, approval: this.approvalSummary(contract, await this.platform.loadPlan(contract)) };
    if (["ACTIVATING", "VERIFYING", "ROLLING_BACK"].includes(state.state)) {
      const unlock = await this.acquireOperationLocks(contract, "automatic-recovery");
      try {
        const plan = await this.platform.loadPlan(contract);
        verifyLockedDeployPlan(plan, contract);
        const active = await this.platform.inspectCurrent(contract);
        if (state.state === "ROLLING_BACK") return this.finishRollback(contract, plan, { code: "RUNNER_RESTART_DURING_ROLLBACK" });
        if (active.releaseId === contract.releaseId && state.state === "VERIFYING") {
          try { return await this.finishVerification(contract, plan); }
          catch (error) {
            const diagnostic = classifyReleaseError(error, { stage: "VERIFYING", component: "restart-recovery", candidate: contract.releaseId, nextAction: "Automatische rollback na mislukte resumed verification." }).diagnostic;
            await this.transition(contract, "ROLLING_BACK", "rollback_started", diagnostic, `resume-rollback-${Date.now()}`);
            return this.finishRollback(contract, plan, diagnostic);
          }
        }
        if (active.releaseId === contract.releaseId && state.state === "ACTIVATING") {
          const diagnostic = { class: "RUNTIME", code: "INTERRUPTED_RESTART_STATE_UNKNOWN", message: "Runner herstartte na switch maar vóór restart-checkpoint; veilige rollback gekozen." };
          await this.transition(contract, "ROLLING_BACK", "rollback_started", diagnostic, `resume-uncertain-${Date.now()}`);
          return this.finishRollback(contract, plan, diagnostic);
        }
        if (active.releaseId === plan.observedBaseline.releaseId && state.state === "ACTIVATING") {
          for (const step of plan.migrations.steps) {
            await this.platform.applyMigration(contract, step, plan);
            const verification = await this.platform.verifyMigration(contract, step, plan);
            if (!verification.passed) throw new Error(`Resume migrationverificatie faalde voor ${step.migrationId}.`);
          }
          for (const smoke of contract.activation.oldReleasePostMigrationSmokes) {
            const result = await this.platform.runSmoke(contract, smoke, { release: "active-baseline", phase: "post-migration" });
            await this.checkpoint(contract, "old_release_post_migration_smoke_passed", { smoke, result }, `old-smoke-${smoke}-${plan.planHash}`);
          }
          await this.platform.atomicSwitch(contract, plan);
          await this.checkpoint(contract, "atomic_switch_completed", { releaseId: contract.releaseId, resumed: true }, `switch-${plan.planHash}`);
          await this.platform.restartService(contract, plan);
          await this.checkpoint(contract, "planned_restart_completed", { service: contract.activation.restart.service, count: 1, resumed: true }, `restart-${plan.planHash}`);
          return this.finishVerification(contract, plan);
        }
        throw Object.assign(new Error("Actieve release komt niet overeen met candidate of locked baseline."), { code: "BASELINE_DRIFT" });
      } finally { await unlock(); }
    }
    return { state: state.state };
  }

  async ownerSummary(contract) {
    const events = await this.events(contract);
    const current = verifyAuditChain(events).current;
    const plan = ["PREPARED", "AWAITING_HUMAN_GO", "ACTIVATING", "VERIFYING", "LIVE", "ROLLING_BACK", "ROLLED_BACK"].includes(current?.state)
      ? await this.platform.loadPlan(contract).catch(() => null)
      : null;
    const liveEvent = [...events].reverse().find((event) => event.type === "release_live");
    const smokeEvents = events.filter((event) => event.type === "smoke_passed" || event.type === "rollback_smoke_passed").slice(-20);
    const currentRelease = current?.state === "LIVE"
      ? { releaseId: contract.releaseId, commit: contract.commit }
      : current?.state === "ROLLED_BACK"
        ? { releaseId: contract.rollback.targetReleaseId, commit: contract.expectedBaseline.commit }
        : plan?.observedBaseline ?? null;
    return Object.freeze({
      tenant: contract.tenant, application: contract.application, releaseId: contract.releaseId,
      state: current?.state ?? null, currentRelease,
      candidate: { releaseId: contract.releaseId, commit: contract.commit },
      risk: plan?.migrations?.risk ?? null, pendingMigrations: plan?.migrations?.steps?.length ?? null,
      schema: plan ? { snapshotHash: plan.schemaSnapshotHash, migrationIds: plan.migrations.steps.map((step) => step.migrationId) } : null,
      backup: plan ? { ready: true, id: plan.recovery.backupId } : { ready: false },
      lastDeployment: liveEvent?.at ?? null,
      lastSmokeResults: smokeEvents.map((event) => ({ at: event.at, type: event.type, smoke: event.details.smoke, status: "PASS" })),
      rollback: current?.state === "ROLLED_BACK" ? { status: "ROLLED_BACK", target: contract.rollback.targetReleaseId } : plan ? { status: "READY", target: contract.rollback.targetReleaseId } : { status: "NOT_PREPARED", target: contract.rollback.targetReleaseId },
      humanAction: current?.state === "AWAITING_HUMAN_GO" ? "REVIEW_AND_GO" : "NONE",
      latestDiagnostic: current?.state === "BLOCKED"
        ? [...events].reverse().find((event) => event.type.includes("blocked") || event.type.includes("failed"))?.details ?? null
        : null,
    });
  }
}
