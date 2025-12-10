# Quickstart Guide: CI/CD Multi-Architecture Image Builds

**Feature**: CI/CD Multi-Architecture Container Image Pipeline
**Date**: 2025-11-05

## Overview

This guide helps developers trigger builds, validate outputs, and troubleshoot the automated container image pipeline.

---

## Prerequisites

Before the workflow can run successfully:

### 1. Configure GitHub Secrets

Navigate to repository **Settings → Secrets and variables → Actions → New repository secret**:

| Secret Name | Value | How to Get |
|-------------|-------|------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username | Your Docker Hub account username |
| `DOCKERHUB_TOKEN` | Docker Hub Personal Access Token | [Create PAT](https://hub.docker.com/settings/security) with Delete permission for the repository |

**Verify secrets are configured**:
```bash
gh secret list
# Should show:
# DOCKERHUB_USERNAME
# DOCKERHUB_TOKEN
```

### 2. Enable GitHub Actions

Ensure GitHub Actions is enabled:
- Repository **Settings → Actions → General**
- **Actions permissions**: Allow all actions
- **Workflow permissions**: Read and write permissions

---

## How to Trigger Builds

### Option 1: Push to Main Branch (Automatic)

**Triggers**: Every push to `main` branch
**Result**: Builds and publishes image with `latest` tag

```bash
# Make changes to code
git add .
git commit -m "feat: update MCP tool"
git push origin main

# Workflow automatically starts
# Check status:
gh run list --workflow=build-images.yml --limit 1
```

**What happens**:
1. Deletes old `latest` tagged images from Docker Hub and GHCR
2. Builds multi-arch image (amd64 + arm64)
3. Pushes new `latest` image to both registries
4. Takes ~7-15 minutes depending on cache

---

### Option 2: Create Version Tag (Automatic)

**Triggers**: Pushing a semver tag (e.g., `v1.2.3`)
**Result**: Builds and publishes image with version tag (`1.2.3`)

```bash
# Create and push version tag
git tag v1.2.3
git push origin v1.2.3

# Workflow automatically starts
gh run list --workflow=build-images.yml --limit 1
```

**Tag format requirements**:
- ✅ Valid: `v1.0.0`, `v2.10.5`, `v10.0.1`
- ❌ Invalid: `1.0.0` (missing `v`), `v1.0` (incomplete), `v1.0.0-beta` (pre-release not supported)

**What happens**:
1. Validates tag format (fails if invalid)
2. Builds multi-arch image
3. Strips `v` prefix (v1.2.3 → image tag `1.2.3`)
4. Pushes to both registries
5. **Does NOT delete previous versions** (all versions preserved)

---

### Option 3: Manual Workflow Dispatch (Testing)

**Use case**: Testing workflow changes without pushing code

1. Go to **Actions → Build Multi-Arch Images → Run workflow**
2. Fill in optional parameters:
   - **Custom tag**: Leave empty for auto-generated `manual-<sha>`
   - **Platforms**: Default `linux/amd64,linux/arm64`
   - **Skip push**: Check to build only (no registry push)
3. Click **Run workflow**

**Command-line equivalent**:
```bash
# Trigger manual build with defaults
gh workflow run build-images.yml

# Trigger with custom tag (no push to registries)
gh workflow run build-images.yml \
  -f tag_name=test-branch \
  -f skip_push=true
```

---

## How to Validate Successful Build

### Step 1: Check Workflow Status

```bash
# List recent workflow runs
gh run list --workflow=build-images.yml --limit 5

# Watch live workflow run
gh run watch

# View detailed logs
gh run view <run-id> --log
```

**Expected output** (success):
```
✓ Build Multi-Arch Images · v1.2.3
  ID: 1234567890
  Status: completed
  Conclusion: success
  Created: 5 minutes ago
  Duration: 8m 32s
```

### Step 2: Verify Images on Docker Hub

```bash
# Check image exists and has both architectures
podman manifest inspect docker.io/<username>/mcp-taipei-metro-month-price:latest

# Expected output:
# {
#   "manifests": [
#     { "platform": { "architecture": "amd64", "os": "linux" } },
#     { "platform": { "architecture": "arm64", "os": "linux" } }
#   ]
# }
```

### Step 3: Verify Images on GitHub Container Registry

```bash
podman manifest inspect ghcr.io/<github_owner>/mcp-taipei-metro-month-price:latest
```

### Step 4: Pull and Test Image

**On amd64 machine**:
```bash
podman pull docker.io/<username>/mcp-taipei-metro-month-price:latest
podman run --rm docker.io/<username>/mcp-taipei-metro-month-price:latest --version

# Verify architecture
podman inspect docker.io/<username>/mcp-taipei-metro-month-price:latest \
  | jq '.[0].Architecture'
# Expected: "amd64"
```

**On arm64 machine** (if available):
```bash
podman pull docker.io/<username>/mcp-taipei-metro-month-price:latest
podman inspect docker.io/<username>/mcp-taipei-metro-month-price:latest \
  | jq '.[0].Architecture'
# Expected: "arm64"
```

---

## Troubleshooting Common Issues

### Issue 1: "DOCKERHUB_USERNAME secret not configured"

**Symptom**:
```
ERROR: DOCKERHUB_USERNAME secret not configured
Error: Process completed with exit code 1.
```

**Fix**:
1. Go to repository **Settings → Secrets → Actions**
2. Click **New repository secret**
3. Name: `DOCKERHUB_USERNAME`, Value: your Docker Hub username
4. Repeat for `DOCKERHUB_TOKEN`

**Verify**:
```bash
gh secret list
```

---

### Issue 2: "Tag 'v1.0' does not follow semantic versioning"

**Symptom**:
```
ERROR: Tag 'v1.0' does not follow semantic versioning (expected: v1.2.3)
Error: Process completed with exit code 2.
```

**Fix**:
```bash
# Delete invalid tag
git tag -d v1.0
git push origin :refs/tags/v1.0

# Create correct tag
git tag v1.0.0
git push origin v1.0.0
```

---

### Issue 3: "Build failed for platform linux/arm64"

**Symptom**:
```
ERROR: Build failed for platform linux/arm64
RUN command failed: bun install (exit code 127)
Build aborted: all-or-nothing requirement (FR-018)
```

**Possible Causes**:
1. Containerfile has architecture-specific commands
2. Dependency not available for arm64
3. Native ARM64 runner build issue

**Debug Steps**:
```bash
# Test build locally with buildah
podman build --platform linux/arm64 --format docker -t test-arm64 .

# If it fails locally, issue is in Containerfile
# Check for:
# - Hardcoded amd64 binaries
# - Dependencies without arm64 support
# - Platform-specific commands
```

**Fix**:
- Use multi-arch base images (e.g., `node:20-alpine` supports both)
- Check dependencies support arm64
- Use `RUN --platform=$BUILDPLATFORM` for build tools

---

### Issue 4: "Failed to push to docker.io after 3 attempts"

**Symptom**:
```
ERROR: Failed to push to docker.io after 3 attempts
Last error: 503 Service Unavailable
```

**Possible Causes**:
1. Docker Hub temporary outage
2. Network issue with GitHub Actions runner
3. Invalid credentials

**Debug Steps**:
```bash
# Check Docker Hub status
curl -I https://hub.docker.com/health

# Verify credentials work
echo "$DOCKERHUB_TOKEN" | podman login docker.io -u $DOCKERHUB_USERNAME --password-stdin

# Check token has correct permissions
# Token should have: "Read, Write, Delete" scopes
```

**Fix**:
- If Docker Hub status shows outage: Wait and re-trigger workflow
- If credentials invalid: Regenerate PAT with Delete permission for the repository
- If persistent: Check GitHub Actions runner network status

---

### Issue 5: Build Cancelled Unexpectedly

**Symptom**:
```
Build was cancelled
Conclusion: cancelled
```

**Cause**: Concurrency control - newer build triggered while this was running

**Expected Behavior**: This is normal when:
- You push commit B while commit A is still building
- The newer build automatically cancels the older one

**No Action Needed**: Newer build will complete and publish images

**Verify**:
```bash
# Check most recent build status
gh run list --workflow=build-images.yml --limit 2

# Should show:
# Run 2 (cancelled) - older commit
# Run 3 (success) - newer commit
```

---

## Advanced Operations

### Check Build Cache Status

```bash
# View workflow run details
gh run view <run-id>

# Look for "Restore Build Cache" step
# Output shows:
# - Cache hit: true (cached build, ~7min)
# - Cache hit: false (clean build, ~15min)
```

### Manually Clear Build Cache

**When needed**: Cache corruption, wrong dependencies cached

```bash
# GitHub Actions cache API (requires gh CLI >= 2.0)
gh cache list

# Delete specific cache
gh cache delete <cache-id>

# Delete all Bun caches
gh cache list | grep "bun-" | awk '{print $1}' | xargs -n1 gh cache delete
```

### Test Workflow Changes Locally

**Before pushing workflow YAML changes**:

```bash
# Install actionlint
brew install actionlint  # macOS
# or: sudo apt install actionlint  # Ubuntu

# Validate workflow syntax
actionlint .github/workflows/build-images.yml

# Test buildah build locally
podman build --platform linux/amd64,linux/arm64 --format docker \
  --manifest mcp-taipei-metro-month-price:test .

# Verify manifest
podman manifest inspect mcp-taipei-metro-month-price:test
```

---

## Monitoring & Alerts

### Recommended GitHub Actions Checks

1. **Weekly Build Success Rate**:
   ```bash
   # Check last 10 builds
   gh run list --workflow=build-images.yml --limit 10 --json conclusion \
     | jq '[.[] | select(.conclusion == "success")] | length'

   # Should be >= 9 (90% success rate)
   ```

2. **Average Build Duration**:
   ```bash
   gh run list --workflow=build-images.yml --limit 5 --json createdAt,updatedAt \
     | jq '.[] | (.updatedAt | fromdateiso8601) - (.createdAt | fromdateiso8601)'

   # Clean builds: ~900s (15min)
   # Cached builds: ~450s (7.5min)
   ```

3. **Cache Hit Rate**:
   ```bash
   # View recent workflow logs
   gh run view <run-id> --log | grep "cache-hit"

   # Target: >= 70% cache hits over time
   ```

---

## Quick Reference

### Workflow Lifecycle Summary

| Action | Trigger | Tag Published | Duration | Deletes Old Latest? |
|--------|---------|---------------|----------|---------------------|
| Push to `main` | Automatic | `latest` | ~7-15min | Yes |
| Push tag `v1.2.3` | Automatic | `1.2.3` | ~7-15min | No |
| Manual dispatch | Manual | `manual-<sha>` | ~7-15min | No |

### Key GitHub CLI Commands

```bash
# Workflow management
gh workflow list
gh workflow run build-images.yml
gh run list --workflow=build-images.yml
gh run watch

# Secrets management
gh secret list
gh secret set DOCKERHUB_USERNAME --body "your-username"
gh secret set DOCKERHUB_TOKEN < token.txt

# Cache management
gh cache list
gh cache delete <cache-id>
```

### Key Podman Commands

```bash
# Verify multi-arch image
podman manifest inspect <image>:<tag>

# Pull and test
podman pull <image>:<tag>
podman run --rm <image>:<tag> --version

# Check architecture
podman inspect <image>:<tag> | jq '.[0].Architecture'
```

---

## Next Steps

After validating the workflow:

1. **Merge to main**: Create PR from feature branch
2. **First production build**: Merge will trigger automatic build
3. **Create first release**: Tag with `v1.0.0`
4. **Monitor**: Check build success rate weekly

**Related Documentation**:
- [Workflow API Contract](./contracts/workflow-api.md)
- [Data Model (workflow states)](./data-model.md)
- [Research & Decisions](./research.md)

---

**Last Updated**: 2025-11-05
**Questions?** Check workflow logs with `gh run view --log`
