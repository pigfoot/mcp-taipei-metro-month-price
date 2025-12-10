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
COPY --from=docker.io/oven/bun:slim /usr/local/bin/bun /usr/local/bin/

RUN <<EOT
# Create app directory and set ownership
mkdir /app && chmod -R 2755 /app && chown -R node:node /app
EOT

# Add main project and install it
COPY --chown=node:node package.json bun.lockb* /app/

# Then, add the rest of the project source code and install it
COPY --chown=node:node ./src /app/src

RUN <<EOT
# Use system CA certificates for Bun (required for GitHub Actions CI)
# Bun v1.2.23+ supports --use-system-ca flag
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

# Install curl for HEALTHCHECK (requires latest-dev with apk)
# Note: This step only works with RUNTIME_TAG=latest-dev
USER root
RUN apk add --no-cache curl

# Copy tini from builder (Wolfi doesn't include it)
COPY --from=builder /usr/bin/tini-static /usr/bin/tini

# Install bun using official distroless image (best practice)
COPY --from=docker.io/oven/bun:slim /usr/local/bin/bun /usr/local/bin/bun

# Copy the application from the builder
COPY --from=builder --chown=65532:65532 /app /app

# Create symlink for bunx
RUN ln -sf ./bun /usr/local/bin/bunx

# Switch to non-root user (Wolfi default: 65532)
USER 65532:65532
WORKDIR /app

# Set environment variables
ENV BUN_INSTALL="/home/nonroot/.bun" \
    PATH="/home/nonroot/.local/bin:${BUN_INSTALL}/bin:/app/bin:$PATH"

# MCP HTTP Server configuration
ENV MCP_PORT=3000
EXPOSE 3000

# Health check endpoint (requires curl from apk)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["bun", "run", "server"]

# ==========================================================================
# USAGE NOTES
# ==========================================================================
#
# Default build (latest-dev with curl for HEALTHCHECK):
#   podman build -t mcp-taipei-metro:latest .
#
# Production build (latest, no curl, no HEALTHCHECK):
#   podman build --build-arg RUNTIME_TAG=latest -t mcp-taipei-metro:prod .
#   Note: HEALTHCHECK will fail in production, use external health checks
#
# Security benefits of Wolfi glibc-dynamic:
#   - CVE-free by design (Chainguard security updates)
#   - Minimal attack surface (~20MB latest-dev vs ~70MB node:lts-slim)
#   - Non-root user by default (UID 65532)
#   - Only necessary packages installed
#
# Why latest-dev?
#   - PoC project prioritizes functionality over minimal size
#   - Enables HEALTHCHECK with curl
#   - Allows debugging with shell access
#   - Production migration: switch to :latest + external health checks
#
