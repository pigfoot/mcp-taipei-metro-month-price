# Tasks: CI/CD Multi-Architecture Container Image Pipeline

**Input**: Design documents from `/specs/006-ci-cd-multiarch-images/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Manual validation only (no automated tests for infrastructure workflows)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Infrastructure project**: `.github/workflows/`, `scripts/ci/` at repository root
- Workflows follow GitHub Actions YAML structure
- Supporting scripts in `scripts/ci/` (if needed)

---

## Phase 1: Setup (Workflow Foundation)

**Purpose**: Create workflow directory structure and basic configuration

- [X] T001 Create `.github/workflows/` directory structure
- [X] T002 [P] Create `scripts/ci/` directory for supporting scripts (if needed)
- [X] T003 [P] Document key patterns from reference workflow (https://raw.githubusercontent.com/pigfoot/librechat/refs/heads/pf-branch/.github/workflows/tag-images.yml) in `specs/006-ci-cd-multiarch-images/research.md` under new "Reference Analysis" section (tag handling, buildah configuration, multi-arch strategy)

---

## Phase 2: Foundational (Core Workflow Structure)

**Purpose**: Core workflow skeleton that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create `.github/workflows/build-images.yml` with basic workflow structure (name, triggers configuration)
- [X] T005 Add workflow triggers: `on: push: branches: [main], tags: ['v*'], workflow_dispatch`
- [X] T006 [P] Configure concurrency groups: `concurrency: group: build-images-${{ github.ref }}, cancel-in-progress: true`
- [X] T007 [P] Add environment variables: IMAGE_NAME, PLATFORMS, DOCKER_FORMAT in `.github/workflows/build-images.yml`
- [X] T008 Define 3-stage job structure: `prepare` (metadata), `build` (matrix: amd64/arm64 native runners), `manifest` (multi-arch) in `.github/workflows/build-images.yml`
- [X] T009 Add checkout step: `uses: actions/checkout@v4` in `.github/workflows/build-images.yml`
- [X] T010 [P] Add podman-static installation step for heredoc support (buildah >= 1.35.0) in `.github/workflows/build-images.yml`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automated Image Build on Main Branch Commits (Priority: P1) 🎯 MVP

**Goal**: Push to main automatically builds and publishes multi-arch images with "latest" tag to both registries

**Requirements Mapping**: Implements FR-001, FR-003, FR-005, FR-006, FR-007, FR-009, FR-011, FR-012, FR-014, FR-015

**Independent Test**: Push commit to main → verify `podman pull docker.io/<user>/mcp-taipei-metro-month-price:latest` works on amd64 and arm64

### Implementation for User Story 1

- [X] T011 [US1] Add multi-arch build step using podman-static (installed in T010) with native ARM64 runners via matrix strategy, image name from env var, tags from prepare job, containerfile `./Containerfile`, build command includes `--format docker` flag (required for FR-010 HEALTHCHECK support) in `.github/workflows/build-images.yml`
- [X] T012 [US1] Create step to delete old "latest" from GHCR using `gh api --method DELETE` to `/user/packages/container/mcp-taipei-metro-month-price/versions` with tag filter in `.github/workflows/build-images.yml`
- [X] T013 [P] [US1] Create step to delete old "latest" from Docker Hub using curl with API v2 DELETE endpoint (requires JWT auth with DOCKERHUB_TOKEN) in `.github/workflows/build-images.yml`
- [X] T014 [US1] Add GHCR push-by-digest step using `podman push --digestfile`, wrapped in `nick-fields/retry@v3` (3 attempts, exponential backoff) in `.github/workflows/build-images.yml`
- [X] T015 [US1] Add Docker Hub push-by-digest step using `podman push --digestfile`, wrapped in `nick-fields/retry@v3` (3 attempts, exponential backoff) in `.github/workflows/build-images.yml`
- [X] T016 [US1] Add digest artifact upload step using `actions/upload-artifact@v4` to transfer tiny digest files (~70 bytes) to manifest job in `.github/workflows/build-images.yml`
- [X] T017 [US1] Add conditional logic: run latest cleanup + push steps only when `github.ref == 'refs/heads/main'` in `.github/workflows/build-images.yml`

**Checkpoint**: At this point, pushing to main should successfully build and publish "latest" tagged multi-arch images to both registries

---

## Phase 4: User Story 2 - Version-Tagged Release Builds (Priority: P2)

**Goal**: Pushing version tags (v1.2.3) automatically builds and publishes images with version tag (1.2.3) to both registries

**Requirements Mapping**: Implements FR-002, FR-008, FR-022

**Independent Test**: Create tag `v1.0.0` → push → verify `podman pull docker.io/<user>/mcp-taipei-metro-month-price:1.0.0` works

### Implementation for User Story 2

- [X] T018 [P] [US2] Add semantic version validation step: check if tag matches `^v[0-9]+\.[0-9]+\.[0-9]+$` using grep, fail with error message if invalid, conditional on `startsWith(github.ref, 'refs/tags/')` in prepare job of `.github/workflows/build-images.yml`
- [X] T019 [US2] Add step to extract version from tag: strip "v" prefix from `github.ref` and store in metadata output in prepare job of `.github/workflows/build-images.yml`
- [X] T020 [US2] Update manifest job: use dynamic tag from prepare job metadata (latest or version) when creating manifests in `.github/workflows/build-images.yml`
- [X] T021 [US2] Ensure version-tagged builds do NOT delete previous versions (skip cleanup steps when tag trigger) in `.github/workflows/build-images.yml`

**Checkpoint**: At this point, creating and pushing version tags should publish versioned multi-arch images without affecting previous versions

---

## Phase 5: User Story 3 - Optimized Build Performance with Container Layer Caching (Priority: P3)

**Goal**: Builds reuse cached container layers to achieve 50%+ time reduction on consecutive builds

**Requirements Mapping**: Container layer caching (automatic via Podman), targets SC-004 (3min clean), SC-005 (≤2min cached, 50% reduction)

**Independent Test**: Run two builds with no code changes → second build completes in ≤2 min (first ~3 min, 50% reduction via Podman layer caching)

### Implementation for User Story 3

- [X] T022 [US3] Verify Containerfile multi-stage design: `COPY package.json bun.lockb` before `COPY ./src` to maximize layer reuse (already implemented in Containerfile)
- [X] T023 [US3] Add build duration measurement: capture start/end times and output total duration for performance tracking in workflow summary (`.github/workflows/build-images.yml`)

**Checkpoint**: At this point, consecutive builds should complete in approximately half the time of clean builds due to Podman's automatic container layer caching

---

## Phase 6: Error Handling & Edge Cases

**Purpose**: Implement robust failure recovery and edge case handling

**Requirements Mapping**: Implements FR-017 (atomic builds), FR-018 (retry), FR-019 (idempotent cleanup), FR-020 (concurrency)

- [X] T024 [P] Add all-or-nothing build check: matrix strategy with `fail-fast: false` + manifest job depends on all builds ensures entire workflow fails if any architecture fails in `.github/workflows/build-images.yml`
- [X] T025 [P] Verify exponential backoff configuration in retry steps: 10s base, 3 attempts (configured in T014, T015, ensure correct parameters with retry@v3) in `.github/workflows/build-images.yml`
- [X] T026 [P] Add idempotent cleanup handling: wrap GHCR/Docker Hub delete steps with `continue-on-error: true` (latest cleanup should not fail if tag doesn't exist) in `.github/workflows/build-images.yml`
- [X] T027 Test concurrent build cancellation: push commit A, wait 30s, push commit B → verify commit A build is cancelled in GitHub Actions UI
- [X] T028 Test invalid tag rejection: push tag `v1.0` → verify workflow fails with semantic versioning error message in GitHub Actions UI
- [X] T029 Test partial architecture failure: intentionally break arm64 build in Containerfile → verify entire build fails and no images pushed in GitHub Actions UI

---

## Phase 7: Polish & Validation

**Purpose**: Final configuration, documentation, and end-to-end testing

**Requirements Mapping**: Implements FR-015 (build status), FR-016 (workflow_dispatch), validates all FR/SC

- [X] T030 [P] Add build summary output: tag published, registry URLs, pull commands to `GITHUB_STEP_SUMMARY` in `.github/workflows/build-images.yml`
- [X] T031 [P] Add secrets validation step: check DOCKERHUB_USERNAME and DOCKERHUB_TOKEN are set at workflow start, fail early with clear error if missing in `.github/workflows/build-images.yml`
- [X] T032 [P] Configure workflow permissions: `contents: read`, `packages: write` in `.github/workflows/build-images.yml`
- [X] T033 [P] Add workflow dispatch inputs: custom tag_name, skip_push boolean for testing in `.github/workflows/build-images.yml`
- [X] T034 [P] Run actionlint validation: `actionlint .github/workflows/build-images.yml` to catch YAML syntax errors
- [X] T035 Test manual workflow dispatch (validates FR-016): trigger via GitHub UI with custom tag, verify build runs successfully and workflow_dispatch functionality works as expected
- [X] T036 End-to-end test (main branch): push commit → wait for completion → verify images on both registries → pull and run on amd64 → verify architecture
- [X] T037 End-to-end test (version tag): create v1.0.0 tag → push → wait for completion → verify images on both registries → pull and run
- [X] T038 [P] Update CLAUDE.md Recent Changes section with new workflow and push-by-digest best practice
- [X] T039 [P] Add GitHub Secrets setup instructions to project README: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN requirements

---

## Task Dependencies

### User Story Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundation) ← MUST complete before any user story
    ↓
Phase 3 (US1: Main branch builds) ← MVP, can start after Phase 2
    ↓
Phase 4 (US2: Version tags) ← Depends on US1 (extends same workflow)
    ↓
Phase 5 (US3: Caching) ← Depends on US1 (optimizes existing builds)
    ↓
Phase 6 (Error Handling) ← Depends on all user stories being functional
    ↓
Phase 7 (Polish) ← Final validation and documentation
```

### Story Independence

- **US1 (Main branch builds)**: Independent after Phase 2, can be tested standalone
- **US2 (Version tags)**: Extends US1, but logically independent (different trigger)
- **US3 (Caching)**: Optimizes US1/US2, does not change functionality

### Critical Path

```
T004 → T005 → T008 → T009 → T011 (build matrix) → T014 (GHCR digest) → T015 (Docker Hub digest) → T016 (artifact upload) → manifest job
```

All other tasks can run in parallel or depend only on these critical tasks.

---

## Parallel Execution Opportunities

### Within Each Phase

**Phase 2 (Foundation)**:
- T006 (concurrency), T007 (env vars), T010 (podman-static) can run in parallel after T005

**Phase 3 (US1)**:
- T012 (GHCR cleanup), T013 (Docker Hub cleanup) can run in parallel in prepare job
- T014 (GHCR push-by-digest) and T015 (Docker Hub push-by-digest) can run in parallel in build job

**Phase 4 (US2)**:
- T018 (validation), T019 (tag extraction) can run in parallel in prepare job

**Phase 5 (US3)**:
- T022, T023 are verification tasks, can run in parallel

**Phase 6 (Error Handling)**:
- T024, T025, T026 can all run in parallel (independent edge case handling)
- T027, T028, T029 are test tasks, can run in parallel

**Phase 7 (Polish)**:
- T030, T031, T032, T033, T034 all edit workflow file or docs, run in parallel
- T038 (CLAUDE.md) and T039 (README) can run in parallel

---

## Implementation Strategy

### MVP Scope (Minimum Viable Product)

**Deliver User Story 1 FIRST** (Phase 1-3):
- Complete Tasks T001-T017
- Result: Automated multi-arch image builds on every main push
- Can be tested and deployed independently
- Provides immediate value: continuous deployment

### Incremental Delivery

1. **Sprint 1**: MVP (US1) - T001-T017
   - Validate: Push to main → images published
2. **Sprint 2**: Versioning (US2) - T018-T022
   - Validate: Create tag → versioned images published
3. **Sprint 3**: Optimization (US3) - T023-T027
   - Validate: Measure build time reduction
4. **Sprint 4**: Hardening (Phase 6-7) - T028-T043
   - Validate: Error scenarios handled, end-to-end tests pass

### Testing Strategy

**No automated tests** (infrastructure validation is manual):
- Each user story has Independent Test criteria
- Manual validation steps at each checkpoint
- End-to-end tests in Phase 7 (T040, T041)

### Rollback Safety

- Each task is a single workflow file edit (atomic change)
- Can test with workflow_dispatch before enabling auto-triggers
- Workflow can be disabled in GitHub Settings if issues arise

---

## Task Validation Checklist

✅ All tasks follow format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
✅ Each user story has independent test criteria
✅ Tasks organized by user story (US1, US2, US3)
✅ Foundation phase (Phase 2) clearly marked as blocking
✅ Parallel opportunities identified with [P] markers
✅ File paths specified for all tasks
✅ Dependency graph provided
✅ MVP scope clearly defined (User Story 1)
✅ No automated test tasks (manual validation only for infrastructure)

---

**Total Tasks**: 43
**Parallelizable Tasks**: 21 (marked with [P])
**User Story 1 (MVP)**: 7 tasks (T011-T017)
**User Story 2**: 5 tasks (T018-T022)
**User Story 3**: 5 tasks (T023-T027)
**Estimated MVP Time**: 4-6 hours (experienced developer)
**Estimated Total Time**: 10-14 hours (all features + polish)

**Next Step**: Begin implementation with Phase 1 (Setup), then Foundation, then User Story 1 (MVP)
