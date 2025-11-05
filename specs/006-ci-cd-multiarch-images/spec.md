# Feature Specification: CI/CD Multi-Architecture Container Image Pipeline

**Feature Branch**: `006-ci-cd-multiarch-images`
**Created**: 2025-11-05
**Status**: Draft
**Input**: User description: "apply github action to build and deploy images to docker.io ghcr.io. need to apply best practice in 2025 for bun/typescript, like build cache. Need to use rootless buildah to build, reference: https://raw.githubusercontent.com/pigfoot/librechat/refs/heads/pf-branch/.github/workflows/tag-images.yml But you should optimize it. need multi-arch build for arm64 and amd64. new tag to build with that tag name (like image_name:1.1.0). meanwhile every commit to main is also need to build as latest tag. However please remove old latest images before push -> only keep latest images, but remove old images under last latest tag. Containerfile is the file to build, however since HEALTHCHECK is used, so that format docker is needed to set."

## Clarifications

### Session 2025-11-05

- Q: When multi-architecture build has one architecture fail (e.g., arm64 succeeds but amd64 fails), how should the system handle this? → A: Fail the entire build and do not publish any images (all-or-nothing approach)
- Q: When container registry push fails due to network issues or authentication errors, how should the system handle this? → A: Retry up to 3 times with exponential backoff, then fail the build
- Q: When attempting to delete "latest" images that don't exist or are already removed, how should the system react? → A: Log a warning and continue with the workflow (treat as already cleaned up)
- Q: When concurrent builds are triggered simultaneously (e.g., main push during tag creation), how should the system handle this? → A: Cancel in-progress build and start the newer one (concurrency group with cancel-in-progress)
- Q: When tag names contain special characters or don't follow semantic versioning, how should the system behave? → A: Fail the build with clear error message requiring semantic versioning format (v1.2.3)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated Image Build on Main Branch Commits (Priority: P1)

As a developer, when I push commits to the main branch, the system automatically builds multi-architecture container images and publishes them to both Docker Hub (docker.io) and GitHub Container Registry (ghcr.io) with the "latest" tag.

**Why this priority**: This is the core continuous deployment workflow that ensures the latest stable version is always available to users. Without this, there's no automated deployment at all.

**Independent Test**: Can be fully tested by pushing a commit to main, waiting for the workflow to complete, and verifying that `docker pull` retrieves the newly built image from both registries with "latest" tag for both amd64 and arm64 architectures.

**Acceptance Scenarios**:

1. **Given** code changes are ready on main branch, **When** developer pushes commit to main, **Then** GitHub Actions workflow triggers automatically
2. **Given** workflow is triggered, **When** build completes successfully, **Then** new images with "latest" tag are available on docker.io and ghcr.io
3. **Given** images are built, **When** user pulls image on amd64 machine, **Then** correct amd64 architecture variant is pulled
4. **Given** images are built, **When** user pulls image on arm64 machine, **Then** correct arm64 architecture variant is pulled
5. **Given** previous "latest" tagged images exist, **When** new "latest" images are pushed, **Then** old "latest" tagged images are removed from registries

---

### User Story 2 - Version-Tagged Release Builds (Priority: P2)

As a release manager, when I create a new version tag (e.g., v1.2.0), the system automatically builds multi-architecture container images and publishes them to both Docker Hub (docker.io) and GitHub Container Registry (ghcr.io) with that specific version tag, allowing users to pull exact versions.

**Why this priority**: Version tagging enables users to pin to specific stable releases and supports rollback scenarios. This is essential for production deployments but can work after the basic "latest" workflow is functional.

**Independent Test**: Can be fully tested by creating a git tag (e.g., `git tag v1.0.0 && git push --tags`), waiting for the workflow to complete, and verifying that images with tag "1.0.0" are pullable from both registries on both architectures.

**Acceptance Scenarios**:

1. **Given** code is ready for release, **When** maintainer creates and pushes a new version tag, **Then** GitHub Actions workflow triggers for that tag
2. **Given** tag workflow is triggered, **When** build completes, **Then** images tagged with the version number are available on both registries
3. **Given** version-tagged images exist, **When** user pulls image with specific version tag, **Then** they receive the exact build corresponding to that version
4. **Given** multiple version tags exist, **When** new version is published, **Then** all previous version-tagged images remain available

---

### User Story 3 - Optimized Build Performance with Caching (Priority: P3)

As a developer, when automated builds run, they utilize build caching mechanisms to speed up the build process by reusing unchanged dependencies and layers from previous builds.

**Why this priority**: Build optimization improves developer productivity and reduces CI costs, but the builds must work correctly first before optimization matters.

**Independent Test**: Can be fully tested by running two consecutive builds with no code changes, measuring build times, and verifying that the second build completes significantly faster (e.g., 50%+ reduction) due to cache hits.

**Acceptance Scenarios**:

1. **Given** no cached layers exist, **When** first build runs, **Then** all dependencies are downloaded and cached for future builds
2. **Given** cached layers exist from previous build, **When** subsequent build runs with no dependency changes, **Then** build reuses cached layers
3. **Given** only application code changed, **When** build runs, **Then** dependency layers are reused and only application layers rebuild
4. **Given** build cache exists, **When** build time is measured, **Then** builds complete in 50% or less time compared to uncached builds

---

### Edge Cases

- **Registry push failure**: When container registry push fails due to network issues or authentication errors, the system MUST retry up to 3 times with exponential backoff before failing the entire build
- **Partial architecture build failure**: When one architecture build succeeds but the other fails (e.g., arm64 succeeds, amd64 fails), the entire build MUST fail and no images are published to any registry (all-or-nothing approach)
- **Missing "latest" images during cleanup**: When attempting to delete "latest" tagged images that don't exist or are already removed, the system MUST log a warning and continue with the workflow (treat as already cleaned up, idempotent operation)
- **Concurrent build triggers**: When concurrent builds are triggered simultaneously (e.g., main push during tag creation), the system MUST cancel in-progress builds and start the newer one using concurrency groups with cancel-in-progress strategy
- **Invalid tag format**: When tag names contain special characters or don't follow semantic versioning format (e.g., v1.2.3), the system MUST fail the build with a clear error message indicating the required format
- **Build cache corruption**: When build cache is corrupted or unreadable, the system MUST clear the corrupted cache, log a warning, and proceed with clean build (cache automatically regenerated on next successful build)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST trigger automated builds on every push to the main branch
- **FR-002**: System MUST trigger automated builds when new version tags are created and pushed
- **FR-003**: System MUST build container images for both amd64 and arm64 architectures in every build
- **FR-004**: System MUST use rootless buildah as the container build tool
- **FR-005**: System MUST publish built images to Docker Hub (docker.io) registry
- **FR-006**: System MUST publish built images to GitHub Container Registry (ghcr.io)
- **FR-007**: System MUST tag images built from main branch with "latest" tag
- **FR-008**: System MUST tag images built from version tags with the corresponding version number (e.g., tag v1.2.0 creates image tag 1.2.0)
- **FR-009**: System MUST remove previous images tagged as "latest" before pushing new "latest" images to prevent accumulation
- **FR-010**: System MUST build images using Docker format (not OCI) to support HEALTHCHECK instruction in Containerfile
- **FR-011**: System MUST utilize build caching mechanisms to optimize build performance for Bun and TypeScript projects
- **FR-012**: System MUST create multi-architecture manifest for each image supporting both amd64 and arm64
- **FR-013**: System MUST use the project's Containerfile as the build specification
- **FR-014**: System MUST authenticate to Docker Hub (docker.io) using credentials stored in GitHub Secrets
- **FR-015**: System MUST authenticate to GitHub Container Registry (ghcr.io) using GitHub token
- **FR-016**: System MUST report build status (success/failure) visible in GitHub repository
- **FR-017**: System MUST allow manual triggering of build workflows via workflow_dispatch
- **FR-018**: System MUST fail the entire build and publish no images if any architecture build fails (all-or-nothing atomic build requirement)
- **FR-019**: System MUST retry failed registry push operations up to 3 times with exponential backoff before failing the build
- **FR-020**: System MUST treat deletion of non-existent "latest" images as successful (idempotent cleanup), logging a warning but continuing the workflow
- **FR-021**: System MUST use concurrency groups to cancel in-progress builds when new builds are triggered, ensuring only the most recent build runs
- **FR-022**: System MUST validate that version tags follow semantic versioning format (v[major].[minor].[patch], e.g., v1.2.3) and fail the build with clear error message if invalid
- **FR-023**: System MUST detect corrupted or invalid build cache, clear it automatically, and fallback to clean build with appropriate logging

### Key Entities

- **Container Image**: Multi-architecture container image artifact containing the application, tagged with version identifier or "latest", stored in container registries
- **Image Tag**: Identifier attached to container images, either "latest" for main branch builds or semantic version number for tagged releases
- **Build Workflow**: Automated GitHub Actions workflow that orchestrates building, tagging, and publishing container images
- **Container Registry**: Storage location for container images (Docker Hub and GitHub Container Registry, ghcr.io), requiring authentication and supporting multi-architecture manifests
- **Architecture Variant**: Specific build of the image for either amd64 or arm64 processor architecture, combined into multi-architecture manifest

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can deploy new versions by simply pushing to main branch without manual build steps
- **SC-002**: Users can pull container images from both Docker Hub (docker.io) and GitHub Container Registry (ghcr.io) successfully
- **SC-003**: Images work correctly on both amd64 and arm64 systems without requiring separate tags
- **SC-004**: Build workflows complete within 15 minutes for typical code changes
- **SC-005**: Cached builds complete in 50% or less time compared to clean builds
- **SC-006**: Only one "latest" tagged image exists in each registry at any given time
- **SC-007**: Version-tagged images remain available indefinitely in registries
- **SC-008**: 100% of builds produce both architecture variants or fail entirely (no partial builds published)
- **SC-009**: Build failures are visible in GitHub UI within 1 minute of occurrence

## Assumptions

- GitHub Actions runners support QEMU for multi-architecture builds
- Docker Hub (docker.io) account credentials are available and stored in GitHub Secrets (DOCKERHUB_USERNAME, DOCKERHUB_TOKEN)
- GitHub token provided by Actions has sufficient permissions to push to ghcr.io
- Project follows semantic versioning for release tags (e.g., v1.2.3)
- Containerfile exists in repository root directory
- Image name for this project is "mcp-taipei-metro-month-price" (or will be specified in workflow configuration)
- Registry storage quotas are sufficient for accumulating version-tagged images over time
- Build caching is supported by GitHub Actions and buildah for this project type

## Dependencies

- Existing Containerfile must build successfully with Docker format
- GitHub repository must have main branch as default/primary branch
- GitHub Secrets must be configured with Docker Hub (docker.io) credentials before workflow can publish
- Git tags must be pushed to repository to trigger version-tagged builds

## Out of Scope

- Building images for architectures other than amd64 and arm64
- Publishing to container registries other than Docker Hub (docker.io) and GitHub Container Registry (ghcr.io)
- Automated testing of built images before publishing (testing is a separate concern)
- Vulnerability scanning of built images
- Image signing or attestation
- Automatic cleanup of old version-tagged images
- Build notifications via external services (Slack, email, etc.)
- Custom tag naming strategies beyond "latest" and version numbers
