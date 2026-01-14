# syntax=docker/dockerfile:1

# Global ARG for runtime image selection
# - latest: Production (no shell, minimal, most secure, no apk)
# - latest-dev: Development/debugging (includes shell, apk, can install packages)
ARG RUNTIME_TAG=latest-dev

###############################
# Builder stage
###############################
FROM docker.io/node:lts-slim AS builder

# Install system dependencies first
RUN <<EOT
apt update -qqy
DEBIAN_FRONTEND=noninteractive \
  apt install -qyy --no-install-recommends --no-install-suggests \
  tini curl \
  ca-certificates
rm -rf /var/lib/apt/lists/*
# Update CA certificates for SSL verification (needed for bun install in CI)
update-ca-certificates
EOT

# Install bun using official distroless image (best practice)
COPY --from=docker.io/oven/bun:slim /usr/local/bin/bun /usr/local/bin/bun

RUN <<EOT
# Create app directory and set ownership
mkdir /app && chmod -R 2755 /app && chown -R node:node /app
# Create symlink for bunx (will be preserved when copied to runtime)
ln -s /usr/local/bin/bun /usr/local/bin/bunx
EOT

# Add main project and install it
COPY --chown=node:node package.json bun.lockb* /app/

# Then, add the rest of the project source code and install it
COPY --chown=node:node ./src /app/src

RUN --mount=type=cache,target=/home/node/.bun/install/cache,uid=1000,gid=1000 <<EOT
# Use system CA certificates for Bun (required for GitHub Actions CI)
# Bun v1.2.23+ supports --use-system-ca flag
# Cache mount speeds up repeated builds by caching Bun's package cache
su node -c 'cd /app \
  && bun install --frozen-lockfile --use-system-ca'

# Optional: Compiling to standalone binary (including Bun runtime)
# su node -c 'cd /app \
#   && bun build ./src/index.ts --compile --outfile ./bin/app'
EOT

###############################
# Runtime stage (Wolfi glibc-dynamic)
###############################
# Re-declare ARG for this stage
ARG RUNTIME_TAG=latest-dev
FROM cgr.dev/chainguard/glibc-dynamic:${RUNTIME_TAG} AS runtime

# Temporarily switch to root for file operations
USER root

# Copy tini from builder (Wolfi doesn't include it)
COPY --from=builder /usr/bin/tini-static /usr/bin/tini

# Copy bun and bunx from builder (bunx is a symlink created in builder, preserved during copy)
COPY --from=builder /usr/local/bin/bun /usr/local/bin/bun
COPY --from=builder /usr/local/bin/bunx /usr/local/bin/bunx

# Copy the application from the builder
COPY --from=builder --chown=65532:65532 /app /app

# Switch to non-root user (Wolfi default: 65532)
USER 65532:65532
WORKDIR /app

# Set environment variables
ENV BUN_INSTALL="/home/nonroot/.bun" \
    PATH="/home/nonroot/.local/bin:${BUN_INSTALL}/bin:/app/bin:$PATH"

# MCP HTTP Server configuration
ENV MCP_PORT=3000
EXPOSE 3000

# Health check endpoint (uses Bun native fetch, works with both latest and latest-dev)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD bun -e "fetch('http://localhost:3000/healthz').then(r => process.exit(r.ok ? 0 : 1))" || exit 1

ENTRYPOINT ["tini", "--"]
# Use direct file path instead of npm script to work without shell
CMD ["bun", "run", "/app/src/index.ts"]

# ==========================================================================
# USAGE NOTES
# ==========================================================================
#
# Default build (latest-dev for debugging):
#   podman build -t mcp-taipei-metro:latest .
#
# Production build (latest for minimal size):
#   podman build --build-arg RUNTIME_TAG=latest -t mcp-taipei-metro:prod .
#
# Security benefits of Wolfi glibc-dynamic:
#   - CVE-free by design (Chainguard security updates)
#   - Minimal attack surface (~20MB latest-dev vs ~70MB node:lts-slim)
#   - Non-root user by default (UID 65532)
#   - Only necessary packages installed
#
# HEALTHCHECK implementation:
#   - Uses Bun native fetch() API (no external dependencies)
#   - Works with both latest and latest-dev runtime tags
#   - No need for curl or other HTTP client tools
#
# Build cache optimization:
#   - Bun install uses BuildKit cache mount for faster rebuilds
#   - Cache persists between builds in /home/node/.bun/install/cache
#
# Why latest-dev?
#   - PoC project prioritizes functionality over minimal size
#   - Allows debugging with shell access (sh/ash available)
#   - Production migration: switch to :latest for smallest attack surface
#
