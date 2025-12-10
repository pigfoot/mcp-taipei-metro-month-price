###############################
# Builder stage
###############################
FROM docker.io/node:lts-slim AS builder

# Install system dependencies first
RUN <<EOT
apt update -qqy
# Ensure apt-get doesn't open a menu on you.
DEBIAN_FRONTEND=noninteractive \
  apt install -qyy --no-install-recommends --no-install-suggests \
  tini curl \
  ca-certificates
rm -rf /var/lib/apt/lists/*
EOT

# Install bun using official distroless image (best practice)
COPY --from=docker.io/oven/bun:slim /usr/local/bin/bun /usr/local/bin/

RUN <<EOT
# Create n8n directory and set ownership
mkdir /app && chmod -R 2755 /app && chown -R node:node /app
EOT

# Add main project and install it
COPY --chown=node:node package.json bun.lockb* /app

# Then, add the rest of the project source code and install it
COPY --chown=node:node ./src /app/src

RUN <<EOT
su node -c 'cd /app \
  && bun install --frozen-lockfile'

# Compiling to standalone binary (including Bun runtime)
#su node -c 'cd /app \
#  && bun build ./src/index.ts --compile --outfile ./bin/app'
EOT

###############################
# Runtime stage
###############################
FROM docker.io/node:lts-slim AS runtime

# Install system dependencies first
RUN <<EOT
apt update -qqy
# Ensure apt-get doesn't open a menu on you.
DEBIAN_FRONTEND=noninteractive \
  apt install -qyy --no-install-recommends --no-install-suggests \
  curl \
  ca-certificates

# Clean up build dependencies
rm -rf \
  /var/lib/apt/lists/* \
  /tmp/* \
  /opt/yarn*
EOT

# Install bun using official distroless image (best practice)
COPY --from=docker.io/oven/bun:slim /usr/local/bin/bun /usr/local/bin/

# Copy tini and the application from the builder
COPY --from=builder /usr/bin/tini-static /usr/bin/tini
COPY --from=builder --chown=node:node /app /app

RUN <<EOT
  ln -sf ./bun /usr/local/bin/bunx
EOT

# Switch to non-root user early & Set working directory
USER node
WORKDIR /app

# cannot use $HOME
ENV BUN_INSTALL="/home/hode/.bun"
ENV PATH="/home/hode/.local/bin:${BUN_INSTALL}/bin:/app/bin:$PATH"

# MCP HTTP Server configuration
ENV MCP_PORT=3000
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthz || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["bun", "run", "server"]
