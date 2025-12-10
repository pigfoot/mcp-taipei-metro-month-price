# Implementation Plan: CI/CD Multi-Architecture Container Image Pipeline

**Branch**: `006-ci-cd-multiarch-images` | **Date**: 2025-11-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-ci-cd-multiarch-images/spec.md`

## Summary

Implement automated GitHub Actions workflow for building and publishing multi-architecture (amd64/arm64) container images to Docker Hub and GitHub Container Registry using push-by-digest approach (2025 best practice). The workflow uses rootless podman for container builds, leverages container layer caching, manages "latest" tag cleanup, enforces semantic versioning for releases, and handles concurrent builds with proper failure recovery strategies.

## Technical Context

**Language/Version**: YAML (GitHub Actions workflow), Bash (supporting scripts)
**Primary Dependencies**:
- GitHub Actions native runners (ubuntu-24.04 for amd64, ubuntu-24.04-arm for arm64)
- podman-static v5.6.2 (rootless container builds with heredoc support)
- nick-fields/retry@v3 (retry logic with exponential backoff)

**Storage**: Podman container layer cache (automatic, no explicit configuration needed)
**Testing**: Manual validation via workflow dispatch, automated integration tests via push/tag triggers
**Target Platform**: Native ARM64 and AMD64 GitHub runners, output images for linux/amd64 and linux/arm64
**Project Type**: Infrastructure/CI-CD (workflow configuration, no application code)
**Performance Goals**:
- Clean builds complete within 3 minutes (using native ARM64 runners, 10-50x faster than QEMU)
- Cached builds complete in ≤2 minutes (container layer caching via Podman, reusing unchanged dependency layers)
- Registry push operations complete within 1 minute per registry

**Constraints**:
- Must use rootless buildah (security requirement)
- Must build with Docker format (not OCI) to support HEALTHCHECK in Containerfile
- Must enforce semantic versioning (v[major].[minor].[patch])
- All-or-nothing atomic builds (both architectures or fail entirely)
- Registry push retry limit: 3 attempts with exponential backoff

**Scale/Scope**:
- 2 container registries (Docker Hub, GHCR)
- 2 architecture variants per build
- Estimated 10-20 builds per week (main branch + tagged releases)
- Containerfile in repository root (existing file)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Evaluation Against Constitution v1.0.0

This feature is **infrastructure automation** rather than application code. Evaluating against applicable principles:

#### I. PoC-First Simplicity
✅ **COMPLIANT**: Infrastructure automation is necessary for PoC distribution and testing
- **Justification**: Without automated image builds, manual container publishing blocks PoC iteration velocity
- **Simplicity preserved**: Using existing GitHub Actions and RedHat's buildah actions (no custom tooling)

#### II. TypeScript + Bun Foundation
⚠️ **PARTIAL EXCEPTION**: Workflow written in YAML/Bash, not TypeScript
- **Justification**: GitHub Actions workflows require YAML configuration format
- **Mitigation**: Keeps TypeScript as application language; CI/CD uses platform-native formats
- **Note**: Supporting scripts (if needed) will use Bash for portability on GitHub Actions runners

#### III. MCP Protocol Compliance
✅ **NOT APPLICABLE**: Infrastructure feature does not affect MCP protocol implementation

#### IV. Dual Integration (MCP + OpenAI Apps)
✅ **NOT APPLICABLE**: Infrastructure feature serves both integrations equally (builds container with both)

#### V. Iterative Validation
✅ **COMPLIANT**: Workflow can be tested incrementally
- Phase 1: Manual dispatch → basic build
- Phase 2: Main branch push → latest tagging
- Phase 3: Tag push → versioned releases
- Phase 4: Concurrency control and failure recovery

### Complexity Justification

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Using YAML/Bash instead of TypeScript | GitHub Actions workflow language is YAML; shell scripts required for registry cleanup logic | TypeScript not supported as GitHub Actions workflow language; introducing Node.js runtime in workflow adds unnecessary complexity |
| Build caching layer | 50% build time reduction target (SC-005) requires caching | Without caching, 15-minute build limit (SC-004) may be exceeded as project grows |
| Multi-registry push with retry logic | Reliability requirement (FR-019) mandates resilience to transient failures | Single-attempt push would fail on temporary network issues, blocking deployments |

**Verdict**: ✅ **APPROVED with justifications** - Infrastructure automation is essential for PoC distribution; YAML/Bash are platform requirements, not architectural choices.

## Project Structure

### Documentation (this feature)

```text
specs/006-ci-cd-multiarch-images/
├── plan.md              # This file
├── research.md          # Phase 0: Build caching strategies, registry cleanup methods, concurrency patterns
├── data-model.md        # Phase 1: Workflow artifacts and state model (N/A for infra - see note below)
├── quickstart.md        # Phase 1: How to trigger builds, validate outputs, troubleshoot failures
├── contracts/           # Phase 1: Workflow interface contracts (inputs, outputs, secrets)
│   └── workflow-api.md  # Workflow dispatch API, expected environment variables, secrets schema
└── tasks.md             # Phase 2: Task decomposition (generated by /speckit.tasks)
```

**Note on data-model.md**: For infrastructure features, data-model.md documents **workflow state and artifacts** rather than application entities. This includes:
- GitHub Actions workflow run state machine
- Build artifact structure (manifest, image layers)
- Cache key hierarchy

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── build-images.yml         # Main workflow: builds on push to main and tags
    └── build-manual.yml         # (Optional) Manual dispatch workflow for testing

scripts/                         # Supporting shell scripts (if needed)
└── ci/
    ├── cleanup-latest.sh       # (If needed) Delete old "latest" images from registries
    └── validate-semver.sh      # (If needed) Validate tag format before build

Containerfile                   # Existing file (referenced by workflow)
```

**Structure Decision**: Single workflow file (`build-images.yml`) handles both main branch and tag triggers using conditional logic. Separate manual workflow optional for development/testing. No application code changes required - this is pure CI/CD configuration.

## Complexity Tracking

> Filled per Constitution Check violations requiring justification

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| YAML/Bash instead of TypeScript | GitHub Actions native language; shell scripts needed for Docker Hub API calls (delete old images) | TypeScript would require bundling Node.js runtime in workflow, adding minutes to build time and violating simplicity principle |
| GitHub Actions cache | Build time target (SC-004: 15min, SC-005: 50% reduction) requires layer caching | GitHub's default cache mechanism is free and maintained; custom caching adds complexity without benefit |
| Exponential backoff retry | Transient network failures common in CI environments; FR-019 mandates 3 retries | Single retry insufficient per production CI best practices; linear backoff may trigger rate limits |

---

## Phase 0: Research & Decision Log

**Status**: ✅ COMPLETED (see research.md)

Research topics completed:
1. ✅ Push-by-digest multi-arch build pattern (2025 best practice, from github-actions-container-build skill)
2. ✅ Container layer caching via Podman (automatic, no explicit cache configuration needed)
3. ✅ GitHub Container Registry (GHCR) image deletion API for "latest" cleanup
4. ✅ Docker Hub API v2 for programmatic tag deletion
5. ✅ GitHub Actions concurrency groups with cancel-in-progress strategy
6. ✅ Multi-architecture manifest creation with Podman (digest-based approach)
7. ✅ Semantic versioning validation patterns in GitHub Actions

**Outputs**: [research.md](./research.md)

---

## Phase 1: Design Artifacts

**Status**: ✅ COMPLETED

### 1. Data Model

**File**: [data-model.md](./data-model.md)

For infrastructure features, "data model" refers to workflow state and artifacts:
- GitHub Actions workflow run states (queued, in_progress, completed, cancelled)
- Container image artifacts (multi-arch manifest, architecture-specific digests)
- Digest artifacts (tiny ~70 byte files transferred between jobs: amd64-ghcr, arm64-ghcr, amd64-dockerhub, arm64-dockerhub)
- Container layer cache (managed automatically by Podman, no explicit workflow state)
- Registry metadata (image digests, tags, creation timestamps)

### 2. API Contracts

**File**: [contracts/workflow-api.md](./contracts/workflow-api.md)

Workflow interface contracts:
- **Inputs**: Git triggers (push to main, tag push, workflow_dispatch)
- **Secrets**: DOCKERHUB_USERNAME, DOCKERHUB_TOKEN (GitHub repository secrets)
- **Outputs**: Build status, image digests, published tags
- **Environment Variables**: IMAGE_NAME, PLATFORMS, CACHE_KEY_PREFIX

### 3. Quickstart Guide

**File**: [quickstart.md](./quickstart.md)

Operational guide for developers:
- How to trigger builds (push to main, create version tag, manual dispatch)
- How to validate successful image publication (docker pull commands)
- How to troubleshoot build failures (common error patterns)
- How to test workflow changes safely (using workflow_dispatch with manual review)

---

## Phase 2: Task Decomposition

**Status**: ⏸️ PENDING - Use `/speckit.tasks` command

Task decomposition will be generated by `/speckit.tasks` command and output to [tasks.md](./tasks.md).

Expected task categories:
1. **Workflow Setup**: Create `.github/workflows/build-images.yml` with basic structure
2. **Multi-Arch Build**: Configure buildah-build action with amd64/arm64 platforms
3. **Registry Publishing**: Add push-to-registry actions for Docker Hub and GHCR
4. **Cache Configuration**: Implement GitHub Actions cache for build layers
5. **Latest Tag Cleanup**: Add step to delete old "latest" images before pushing new ones
6. **Concurrency Control**: Configure concurrency groups with cancel-in-progress
7. **Semantic Version Validation**: Add tag format validation step
8. **Retry Logic**: Wrap registry push with retry mechanism (exponential backoff)
9. **Testing & Validation**: Manual test via workflow_dispatch, verify outputs

---

## Implementation Notes

### Critical Success Factors

1. **Atomic Builds (FR-017)**: Matrix builds must use `fail-fast: false` but manifest job depends on all builds; if any architecture fails, manifest job skips (all-or-nothing)
2. **Latest Tag Cleanup (FR-009)**: Must delete old "latest" before pushing to avoid accumulation; GitHub Container Registry supports `gh api` deletion, Docker Hub requires API v2 token auth
3. **Push-by-Digest Pattern**: Architecture-specific images pushed by digest without tags; tiny digest files (~70 bytes) transferred as artifacts; manifest created from digests
4. **Concurrency (FR-020)**: `concurrency: group: build-images-${{ github.ref }}` with `cancel-in-progress: true` prevents duplicate builds

### Known Challenges

1. **Challenge**: Docker Hub API v2 requires separate authentication token for deletion operations
   **Mitigation**: Use Docker Hub Personal Access Token (PAT) with Delete permission for the repository stored in `DOCKERHUB_TOKEN` secret

2. **Challenge**: Container builds may have slow dependency installation
   **Mitigation**: Podman automatically caches container layers; multi-stage Containerfile copies `package.json`/`bun.lockb` before source code to maximize layer reuse

3. **Challenge**: Native ARM64 runners (`ubuntu-24.04-arm`) are only free for public repositories
   **Mitigation**: Repository is public; native runners provide 10-50x speedup over QEMU emulation (~2min vs ~20min)

### Validation Checklist (Pre-Merge)

Before merging this feature branch to main:
- [ ] Workflow file passes `actionlint` validation
- [ ] Manual workflow_dispatch test completes successfully
- [ ] Images pullable from both Docker Hub and GHCR on amd64 host
- [ ] Images pullable from both Docker Hub and GHCR on arm64 host (if available for testing)
- [ ] Semantic version validation rejects invalid tags (e.g., `v1.2`)
- [ ] Concurrency test: push to main twice rapidly, verify second build cancels first
- [ ] Latest cleanup test: verify only one "latest" image exists after consecutive main branch builds

---

## Dependencies

### Required GitHub Repository Configuration

Before workflow can execute successfully:
1. **GitHub Secrets**:
   - `DOCKERHUB_USERNAME`: Docker Hub account username
   - `DOCKERHUB_TOKEN`: Docker Hub Personal Access Token with Delete permission for the repository
   - (GITHUB_TOKEN is automatically provided by GitHub Actions)

2. **GitHub Actions Permissions**:
   - Workflow must have `packages: write` permission for GHCR push
   - Workflow must have `contents: read` permission for repository checkout

3. **Repository Settings**:
   - GitHub Actions enabled
   - Package write permission granted to Actions

### External Dependencies

- **Containerfile**: Must exist in repository root and build successfully with `podman build --format docker`
- **Existing Image Base**: Containerfile must reference base image accessible from GitHub Actions runners
- **Network Access**: GitHub Actions runners must reach Docker Hub and GHCR endpoints

---

## Rollback Plan

If workflow causes production issues:
1. **Immediate**: Disable workflow via GitHub repository settings (Actions → Disable workflow)
2. **Short-term**: Revert merge commit introducing workflow file
3. **Long-term**: Fix workflow issues in feature branch, revalidate with workflow_dispatch before re-enabling

Manual image building fallback:
```bash
# Local build (requires podman-static v5.6.2+ for heredoc support)
podman manifest create mcp-taipei-metro-month-price:latest
podman build --format docker --platform linux/amd64,linux/arm64 \
  --manifest mcp-taipei-metro-month-price:latest .
podman manifest push mcp-taipei-metro-month-price:latest \
  docker://docker.io/<dockerhub-username>/mcp-taipei-metro-month-price:latest
```

---

**Next Steps**: Execute `/speckit.tasks` to generate task decomposition in `tasks.md`.
