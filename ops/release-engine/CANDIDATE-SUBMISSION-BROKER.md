# WBD Authorized Candidate Submission Broker V1

Status: isolated implementation; not installed or activated on production.

## Purpose

This broker fills one narrow boundary before the frozen WBD Release & Recovery Engine V1:

`authorized isolated build -> exact immutable candidate -> central inbox -> frozen prepare -> AWAITING_HUMAN_GO`

It does not build, alter, deploy, promote, switch, restart, migrate, or roll back releases. It has no `GO` endpoint. The frozen release engine, plan format, audit chain, prepare checks, activation, readiness, smoke, and rollback semantics are unchanged.

## Submission contract

The public action is conceptually:

`submitCandidateForReview(candidateId, commit, artifactSha256, contractHash)`

The transport carries the already-built artifact, external manifest, and release contract as an immutable envelope. The broker verifies:

- exact request schema;
- narrow authenticated principal;
- tenant/application authorization;
- candidate ID, tag, commit, artifact hash, manifest hash, and contract hash continuity;
- central source-tag commit continuity through an injected authoritative resolver;
- `otherTenantImpact: NONE`;
- `featureExposure.default: OFF` plus an explicit kill switch;
- create-only central inbox and contract registration;
- exact frozen `prepare({ contractHash })` response;
- checksum-locked `AWAITING_HUMAN_GO` plan.

Exact retries are idempotent. A reused candidate ID with changed identity is rejected. Audit events form a SHA-256 chain and the file-backed state adapter preserves replay state across restarts.

## Privilege boundary

The implementation intentionally does not include server installation, credentials, reverse-proxy configuration, or filesystem ACL changes. A production installation needs a separately reviewed, narrowly scoped service identity that can only:

1. create candidate files in `/srv/wbd/shared/release-inbox`;
2. create a previously absent contract file in `/srv/wbd/release-engine/contracts`;
3. call the existing protected Release Engine Unix-socket `prepare` route;
4. append its own submission audit/state.

It must not receive shell, SSH, database, systemd, `/srv/wbd/current`, release-switch, or `GO` privileges. Installation is a security-boundary action and is deliberately not performed by this code-only follow-up.

## Current Sportpaleis candidate

The verifier accepts the unchanged candidate identity:

- candidate: `SPW-CURRENT-HUMAN-REVIEW-CANDIDATE-R1-20260827`;
- commit: `a10232c09c7bef148d8e79c1ac4ab69845993b2f`;
- artifact SHA-256: `c71bd0fe163f328f0aa68e1dedb52253ed0c1dd33d58e76c5b7025e2035c8038`;
- contract hash: `572e4f4ffffe61052f56930fc7302c70de2a884fbd70ef9796111d9446c941dc`;
- manifest SHA-256: `94aac29164a6a8e8e5bb35734d4a03a802074ba20bed2673d627eb93d91deb35`.

The current environment still has no authorized installed submission endpoint, so this candidate is not submitted or prepared by this implementation run.
