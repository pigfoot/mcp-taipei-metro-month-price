# Data Model: CI/CD Workflow State & Artifacts

**Feature**: CI/CD Multi-Architecture Container Image Pipeline
**Date**: 2025-11-05

## Overview

For infrastructure features, the "data model" describes workflow state transitions, build artifacts, and persistent data structures managed by the CI/CD pipeline.

---

## 1. Workflow Run State Machine

### Entity: WorkflowRun

Represents a single execution of the GitHub Actions workflow.

**States**:
```
queued → in_progress → completed
                    ↓
                 cancelled (if concurrency cancels)
```

**Attributes**:
| Field | Type | Description | Source |
|-------|------|-------------|--------|
| `run_id` | string | Unique workflow run identifier | GitHub Actions context |
| `trigger` | enum | `push_main`, `push_tag`, `workflow_dispatch` | `github.event_name` + `github.ref` |
| `ref` | string | Git ref that triggered build (e.g., `refs/heads/main`, `refs/tags/v1.0.0`) | `github.ref` |
| `commit_sha` | string | Full commit SHA being built | `github.sha` |
| `started_at` | timestamp | Workflow start time | GitHub Actions automatic |
| `completed_at` | timestamp | Workflow completion time (success or failure) | GitHub Actions automatic |
| `status` | enum | `success`, `failure`, `cancelled` | Workflow conclusion |
| `cache_hit` | boolean | Whether build cache was restored | Cache action output |

**State Transitions**:
1. **queued → in_progress**: Workflow starts, runner assigned
2. **in_progress → completed**: Build finishes successfully, images pushed to both registries
3. **in_progress → cancelled**: Newer build triggered, concurrency group cancels this run
4. **in_progress → completed (failure)**: Build fails (architecture build failure, validation error, push error after retries)

**Lifecycle Rules**:
- Only one `in_progress` run per `ref` (enforced by concurrency groups)
- Cancelled runs do not publish any artifacts
- Failed runs do not push to registries (FR-018 all-or-nothing)

---

## 2. Container Image Artifact

### Entity: ContainerImage

Represents a multi-architecture container image published to registries.

**Attributes**:
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `name` | string | Image repository name | `mcp-taipei-metro-month-price` |
| `tag` | string | Image tag | `latest`, `1.2.3` |
| `manifest_digest` | string | SHA256 digest of multi-arch manifest | `sha256:abc123...` |
| `created_at` | timestamp | Image creation timestamp | `2025-11-05T10:30:00Z` |
| `size_bytes` | integer | Combined size of all layers | `245000000` (245MB) |
| `architectures` | array | List of architecture variants | `["amd64", "arm64"]` |

**Relationships**:
- One `ContainerImage` has many `ArchitectureVariant` (exactly 2: amd64, arm64)
- One `WorkflowRun` produces one `ContainerImage` (or zero if failed)
- One `ContainerImage` is published to two `Registry` instances (Docker Hub, GHCR)

**Validation Rules**:
- `architectures` array MUST contain exactly 2 entries: `["amd64", "arm64"]` (FR-003, FR-018)
- `tag` MUST be either `"latest"` or match regex `^v[0-9]+\.[0-9]+\.[0-9]+$` (FR-007, FR-008, FR-022)
- `manifest_digest` MUST be identical across both registries (same content hash)

---

## 3. Architecture Variant

### Entity: ArchitectureVariant

Represents a single-architecture build of the image (one variant in the manifest).

**Attributes**:
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `architecture` | enum | CPU architecture | `amd64`, `arm64` |
| `os` | string | Operating system | `linux` |
| `digest` | string | SHA256 digest of this variant's layers | `sha256:def456...` |
| `size_bytes` | integer | Size of this variant | `122000000` (122MB) |
| `layers` | array | List of layer digests | `["sha256:layer1...", ...]` |
| `build_duration` | integer | Time to build this variant (seconds) | `420` (7 minutes) |

**Relationships**:
- Belongs to one `ContainerImage`
- Each `ArchitectureVariant` has many `ImageLayer`

**Lifecycle**:
- Both variants built in parallel using QEMU emulation
- If either variant build fails, entire workflow fails (FR-018)

---

## 4. Build Cache

### Entity: BuildCache

Represents cached build artifacts to speed up subsequent builds.

**Cache Hierarchy**:
```
bun-${{ runner.os }}-${{ hashFiles('**/bun.lock') }}
├── ~/.bun/install/cache/          # Bun's package cache
└── node_modules/                  # Installed dependencies
```

**Attributes**:
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `cache_key` | string | Unique cache identifier | `bun-Linux-sha256:abc123...` |
| `restored_from_key` | string | Actual key used (may be partial match) | `bun-Linux-sha256:abc1...` |
| `hit` | boolean | Whether exact key match found | `true` |
| `size_bytes` | integer | Total cache size | `850000000` (850MB) |
| `created_at` | timestamp | When cache was created | `2025-11-03T14:22:00Z` |
| `expires_at` | timestamp | Cache expiry (7 days from creation) | `2025-11-10T14:22:00Z` |

**Cache Invalidation Rules**:
1. **Exact match**: `bun.lock` hash unchanged → full hit
2. **Partial match**: Prefix `bun-Linux-` matches → partial restore (some reusable)
3. **Miss**: No matching prefix → clean build

**Size Limits**:
- Repository-wide limit: 10GB (GitHub Actions constraint)
- Automatic eviction: Oldest caches removed when limit exceeded
- TTL: 7 days (configurable in cache action)

---

## 5. Registry Metadata

### Entity: RegistryMetadata

Represents metadata stored in container registries about published images.

**Attributes**:
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `registry` | enum | Registry instance | `docker_hub`, `ghcr` |
| `repository` | string | Full repository path | `docker.io/username/mcp-taipei-metro-month-price` |
| `tag` | string | Image tag | `latest` |
| `digest` | string | Image manifest digest | `sha256:abc123...` |
| `pushed_at` | timestamp | When image was pushed | `2025-11-05T10:35:00Z` |
| `pulled_count` | integer | Number of pulls (registry-specific) | `42` |

**"latest" Tag Lifecycle**:
1. **Before push**: Old `latest` tag exists (e.g., digest `sha256:old123...`)
2. **Deletion step**: Delete old `latest` tag via API
3. **After push**: New `latest` tag created (digest `sha256:new456...`)

**Cleanup Behavior** (FR-009, FR-020):
- **GHCR**: Use `gh api` to delete by tag name (idempotent)
- **Docker Hub**: Use API v2 DELETE endpoint (returns 404 if not found, acceptable)
- **Non-"latest" tags**: Never deleted (version tags preserved indefinitely per SC-007)

---

## 6. Workflow Secrets & Configuration

### Entity: WorkflowConfiguration

Represents configuration data required by the workflow (not code, but external data).

**GitHub Secrets** (stored in repository settings):
| Secret Name | Type | Purpose | Validation |
|-------------|------|---------|------------|
| `DOCKERHUB_USERNAME` | string | Docker Hub account username | Required for push |
| `DOCKERHUB_TOKEN` | string | Docker Hub PAT with `repo:delete` scope | Required for push + deletion |
| `GITHUB_TOKEN` | string | Automatic GitHub Actions token | Auto-provided, `packages:write` permission needed |

**Environment Variables** (defined in workflow YAML):
| Variable | Type | Value | Description |
|----------|------|-------|-------------|
| `IMAGE_NAME` | string | `mcp-taipei-metro-month-price` | Image repository name |
| `PLATFORMS` | string | `linux/amd64,linux/arm64` | Comma-separated arch list |
| `CACHE_KEY_PREFIX` | string | `bun-${{ runner.os }}` | Cache key namespace |
| `BUILD_FORMAT` | string | `docker` | Container format (not OCI) |

---

## 7. Error States & Recovery

### Entity: BuildError

Represents failure scenarios and their recovery behavior.

**Error Types**:
| Error Code | Description | Recovery Strategy | Example |
|------------|-------------|-------------------|---------|
| `PARTIAL_ARCH_BUILD_FAILURE` | One architecture build succeeded, other failed | Fail entire workflow (FR-018) | arm64 succeeds, amd64 fails → fail entire run |
| `REGISTRY_PUSH_FAILURE` | Registry push fails (network/auth) | Retry 3x with exponential backoff (FR-019) | 502 Bad Gateway → retry after 10s, 20s, 40s |
| `INVALID_TAG_FORMAT` | Git tag doesn't match semver pattern | Fail immediately with error message (FR-022) | Tag `v1.0` → fail with "expected v1.2.3" |
| `LATEST_DELETE_FAILURE_NOTFOUND` | "latest" tag doesn't exist during cleanup | Log warning, continue (FR-020) | First build ever → no previous "latest" |
| `CONCURRENT_BUILD_CONFLICT` | New build triggered while current building | Cancel current build (FR-021) | Commit B pushed while commit A building |

**Recovery Decision Tree**:
```
Build Error
├── Transient? (network, timeout)
│   ├── Yes → Retry (max 3x)
│   └── No → Fail immediately
├── Partial success? (one arch built)
│   └── Always fail (all-or-nothing)
└── Expected state? (e.g., "latest" not found)
    ├── Yes → Log warning, continue
    └── No → Fail with error
```

---

## State Diagram: Complete Build Lifecycle

```
[Git Push/Tag]
    ↓
[Workflow Queued]
    ↓
[Check Concurrency] ──→ [Cancel older run if exists]
    ↓
[Workflow In Progress]
    ├──→ [Validate Semver] (if tag) ──→ [Fail if invalid]
    ├──→ [Restore Build Cache] ──→ [Cache Hit? Yes/No]
    ├──→ [Build amd64 Variant] ──┐
    ├──→ [Build arm64 Variant] ──┤
    │                            ├──→ [Both succeed?]
    │                            │       ├── Yes → Continue
    │                            │       └── No → Fail Workflow
    ├──→ [Create Multi-Arch Manifest]
    ├──→ [Delete Old "latest" Tag] (if main branch)
    ├──→ [Push to GHCR] ──→ [Retry 3x if fails]
    ├──→ [Push to Docker Hub] ──→ [Retry 3x if fails]
    └──→ [Mark Workflow Complete]
            ├── Success → Images available
            └── Failure → No images published
```

---

## Data Persistence

| Data Type | Persistence Location | Retention | Access Method |
|-----------|---------------------|-----------|---------------|
| Workflow Run History | GitHub Actions UI/API | 90 days (GitHub default) | `gh run list` |
| Build Cache | GitHub Actions cache | 7 days or 10GB limit | Cache action restore |
| Container Images (versioned) | Docker Hub + GHCR | Indefinite (SC-007) | `podman pull` |
| Container Images ("latest") | Docker Hub + GHCR | Until next main push | `podman pull` |
| Workflow Configuration (secrets) | GitHub repository settings | Indefinite | Manual update only |

---

**Data Model Completed**: 2025-11-05
**Next**: Generate contracts/workflow-api.md and quickstart.md
