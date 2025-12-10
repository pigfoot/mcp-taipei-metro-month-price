# Workflow API Contract

**Feature**: CI/CD Multi-Architecture Container Image Pipeline
**Date**: 2025-11-05

## Overview

This document defines the interface contract for the GitHub Actions workflow, including inputs, outputs, required secrets, and expected behaviors.

---

## 1. Trigger Inputs

### Trigger Type: Push to Main Branch

**Event**: `push`
**Ref Filter**: `branches: [main]`

**Inputs** (implicit from Git):
```yaml
trigger: push
ref: refs/heads/main
sha: <commit-sha>
```

**Expected Behavior**:
1. Build multi-architecture image
2. Delete old "latest" tagged images from both registries
3. Push new image with "latest" tag to both registries
4. Cancel any in-progress main branch builds (concurrency control)

**Outputs**:
```yaml
tag_published: "latest"
docker_hub_digest: "sha256:abc123..."
ghcr_digest: "sha256:abc123..."  # Same as Docker Hub
build_duration_seconds: 420
cache_hit: true
```

---

### Trigger Type: Push Version Tag

**Event**: `push`
**Ref Filter**: `tags: ['v*']`

**Inputs** (implicit from Git):
```yaml
trigger: push
ref: refs/tags/v1.2.3
sha: <commit-sha>
tag_name: v1.2.3
```

**Expected Behavior**:
1. Validate tag format matches `^v[0-9]+\.[0-9]+\.[0-9]+$` (fail if invalid)
2. Build multi-architecture image
3. Strip "v" prefix from tag for image tag (v1.2.3 → 1.2.3)
4. Push image with version tag to both registries
5. Do NOT delete previous versions (preserve all version tags)

**Outputs**:
```yaml
tag_published: "1.2.3"
docker_hub_digest: "sha256:def456..."
ghcr_digest: "sha256:def456..."
build_duration_seconds: 450
cache_hit: false
```

---

### Trigger Type: Manual Workflow Dispatch

**Event**: `workflow_dispatch`

**Inputs** (manual form fields):
```yaml
trigger: workflow_dispatch
tag_name:
  description: "Custom tag name (optional, defaults to 'manual-<sha>')"
  required: false
  default: ""
platforms:
  description: "Platforms to build (comma-separated)"
  required: false
  default: "linux/amd64,linux/arm64"
skip_push:
  description: "Build only (do not push to registries)"
  type: boolean
  required: false
  default: false
```

**Expected Behavior**:
1. Build for specified platforms
2. Use custom tag if provided, otherwise `manual-<short-sha>`
3. Skip registry push if `skip_push: true` (for testing)
4. Do NOT delete old tags (manual builds are experimental)

**Outputs**:
```yaml
tag_published: "manual-abc1234" | <custom-tag>
docker_hub_digest: "sha256:ghi789..." | "N/A (skipped)"
ghcr_digest: "sha256:ghi789..." | "N/A (skipped)"
build_duration_seconds: 380
cache_hit: true
```

---

## 2. Required Secrets

### GitHub Repository Secrets

Must be configured in repository settings before workflow can execute.

| Secret Name | Type | Scope | Required For | Validation |
|-------------|------|-------|--------------|------------|
| `DOCKERHUB_USERNAME` | string | Docker Hub account username | Push to Docker Hub | Must not be empty |
| `DOCKERHUB_TOKEN` | string | Personal Access Token with `repo:delete` | Push + delete on Docker Hub | Must have delete permission |
| `GITHUB_TOKEN` | string (auto) | Automatic GitHub Actions token | Push to GHCR | Auto-provided, requires `packages:write` |

**Secret Validation** (performed at workflow start):
```yaml
- name: Validate Secrets
  run: |
    if [ -z "${{ secrets.DOCKERHUB_USERNAME }}" ]; then
      echo "ERROR: DOCKERHUB_USERNAME secret not configured"
      exit 1
    fi
    if [ -z "${{ secrets.DOCKERHUB_TOKEN }}" ]; then
      echo "ERROR: DOCKERHUB_TOKEN secret not configured"
      exit 1
    fi
```

---

## 3. Environment Variables

### Workflow-Level Variables

Defined in workflow YAML, accessible to all jobs.

| Variable | Value | Purpose | Override Allowed |
|----------|-------|---------|------------------|
| `IMAGE_NAME` | `mcp-taipei-metro-month-price` | Base image name | No (hardcoded) |
| `PLATFORMS` | `linux/amd64,linux/arm64` | Build architectures | Yes (via workflow_dispatch input) |
| `DOCKER_FORMAT` | `docker` | Container format (not OCI) | No (required for HEALTHCHECK) |
| `CACHE_TTL_DAYS` | `7` | Build cache retention | No |

### Runtime Variables

Computed during workflow execution.

| Variable | Example Value | Computed From | Used For |
|----------|---------------|---------------|----------|
| `TAG` | `latest` or `1.2.3` | `github.ref` parsing | Image tag |
| `SHORT_SHA` | `abc1234` | `github.sha` truncation | Manual build tags |
| `CACHE_KEY` | `bun-Linux-sha256:abc...` | `bun.lock` hash | Cache restore/save |
| `MANIFEST_DIGEST` | `sha256:def456...` | Buildah output | Registry metadata |

---

## 4. Outputs

### Workflow Outputs

Accessible to downstream workflows or GitHub API consumers.

```yaml
outputs:
  tag:
    description: "Image tag that was published"
    value: ${{ steps.build.outputs.tag }}

  docker_hub_digest:
    description: "Image manifest digest on Docker Hub"
    value: ${{ steps.push_dockerhub.outputs.digest }}

  ghcr_digest:
    description: "Image manifest digest on GHCR"
    value: ${{ steps.push_ghcr.outputs.digest }}

  platforms:
    description: "Architectures included in manifest"
    value: ${{ steps.build.outputs.platforms }}

  cache_hit:
    description: "Whether build cache was restored"
    value: ${{ steps.cache.outputs.cache-hit }}
```

### Build Artifacts

Generated files available for download from workflow run.

| Artifact Name | Content | Retention | Purpose |
|---------------|---------|-----------|---------|
| `build-logs` | Combined stdout/stderr from buildah | 7 days | Debugging build failures |
| `manifest.json` | Multi-arch manifest JSON | 7 days | Inspecting image structure |

---

## 5. Exit Codes & Failure Modes

### Success Exit Codes

| Code | Meaning | Condition |
|------|---------|-----------|
| `0` | Success | All steps completed, images pushed to both registries |

### Failure Exit Codes

| Code | Meaning | Failure Point | Recovery |
|------|---------|---------------|----------|
| `1` | General failure | Any step | Review logs, fix issue, re-trigger |
| `2` | Invalid tag format | Tag validation step | Create tag with correct format (v1.2.3) |
| `3` | Architecture build failed | Buildah multi-arch build | Fix Containerfile or dependency issue |
| `4` | Registry push failed (after retries) | Push step | Check secrets, network, registry status |
| `5` | Concurrency conflict (cancelled) | Workflow start | Expected behavior, newer build will complete |

### Failure Examples with Expected Behavior

#### Example 1: Invalid Semantic Version Tag

**Trigger**: Push tag `v1.0`
**Expected Failure Point**: Tag validation step
**Exit Code**: `2`
**Error Message**:
```
ERROR: Tag 'v1.0' does not follow semantic versioning (expected: v1.2.3)
Please create a tag matching the pattern: v[major].[minor].[patch]
```
**Recovery**: Delete tag, create `v1.0.0`

---

#### Example 2: Partial Architecture Build Failure

**Trigger**: Push to main
**Expected Failure Point**: Buildah build step
**Exit Code**: `3`
**Error Message**:
```
ERROR: Build failed for platform linux/arm64
Error: RUN command failed: npm install (exit code 127)
Build aborted: all-or-nothing requirement (FR-018)
No images published to any registry.
```
**Recovery**: Fix dependency issue, push new commit

---

#### Example 3: Registry Push Failure After Retries

**Trigger**: Push tag `v2.0.0`
**Expected Failure Point**: Push to Docker Hub (after 3 retries)
**Exit Code**: `4`
**Error Message**:
```
ERROR: Failed to push to docker.io after 3 attempts
Last error: 503 Service Unavailable
Retry attempts: 10s, 20s, 40s
No images published (rollback performed).
```
**Recovery**: Check Docker Hub status, retry when service recovered

---

## 6. Concurrency Behavior

### Concurrency Configuration

```yaml
concurrency:
  group: build-images-${{ github.ref }}
  cancel-in-progress: true
```

### Behavior Matrix

| Scenario | Group Key | Behavior |
|----------|-----------|----------|
| Push commit A to main, then push commit B to main | `build-images-refs/heads/main` | Build A cancelled, build B starts |
| Push commit to main, then push tag v1.0.0 | Different groups (`refs/heads/main` vs `refs/tags/v1.0.0`) | Both run in parallel |
| Push tag v1.0.0, then push tag v1.0.1 | Different groups (different refs) | Both run in parallel |
| Manual dispatch twice with same inputs | `build-images-refs/heads/main` (workflow_dispatch uses default ref) | Second cancels first |

**Cancelled Build Guarantees**:
- No images published (cleanup is safe)
- Workflow status: `cancelled`
- Exit code: `5`
- No notification (expected behavior)

---

## 7. API Compatibility Guarantees

### What We Guarantee

✅ **Stable**:
- Workflow file location: `.github/workflows/build-images.yml`
- Output variable names and types
- Secret names and required scopes
- Trigger events (push to main, push tags, workflow_dispatch)
- Exit codes for failure modes

✅ **Backward Compatible Changes**:
- Adding new optional workflow_dispatch inputs
- Adding new output variables
- Adding new environment variables (with defaults)

### What May Change

⚠️ **Subject to Change** (with advance notice):
- Internal step names (workflow-internal, not in outputs)
- Cache key format (may change for optimization)
- Build duration (performance improvements)

❌ **Breaking Changes** (require major version bump):
- Changing secret names
- Removing output variables
- Changing exit code meanings
- Changing trigger filters

---

## 8. Performance SLAs

### Build Duration Targets

| Scenario | Target | Measured From | Measured To |
|----------|--------|---------------|-------------|
| Clean build (cache miss) | ≤ 15 min | Workflow start | Last registry push complete |
| Cached build (cache hit) | ≤ 7.5 min | Workflow start | Last registry push complete |
| Registry push (per registry) | ≤ 3 min | Push start | Push complete |

### Retry Limits

| Operation | Max Attempts | Backoff Strategy | Total Max Time |
|-----------|--------------|------------------|----------------|
| Registry push | 3 | Exponential (10s base) | ~70 seconds + 3x push time |
| Buildah build | 1 | No retry (fail fast) | N/A |

---

## 9. Monitoring & Observability

### Recommended Metrics to Track

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| Build success rate (%) | GitHub Actions API | < 90% over 7 days |
| Average build duration | Workflow outputs | > 20 minutes (clean build) |
| Cache hit rate (%) | Workflow outputs | < 70% over 7 days |
| Registry push failures | Workflow failure logs | > 2 per week |

### Logs & Debugging

All workflow steps output to GitHub Actions UI:
- **Build logs**: Buildah stdout/stderr (includes layer build progress)
- **Push logs**: Registry push progress (includes retry attempts)
- **Validation logs**: Tag format check, secret validation

**Example Log Snippet** (successful build):
```
✓ Validate Semantic Versioning: Tag 'v1.2.3' is valid
✓ Restore Build Cache: Cache hit (key: bun-Linux-sha256:abc...)
✓ Build Multi-Arch Image: amd64 complete (5m 32s), arm64 complete (6m 18s)
✓ Delete Old Latest Tag (GHCR): No previous 'latest' found (first build)
✓ Delete Old Latest Tag (Docker Hub): Deleted digest sha256:old123...
✓ Push to GHCR: Pushed sha256:new456... (attempt 1/3, success)
✓ Push to Docker Hub: Pushed sha256:new456... (attempt 1/3, success)
```

---

**Contract Version**: 1.0.0
**Last Updated**: 2025-11-05
**Next**: Generate quickstart.md
