# Implementation Plan: Streamable HTTP MCP Server

**Branch**: `002-http-mcp-server` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-http-mcp-server/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement an HTTP-based MCP (Model Context Protocol) server that exposes the existing TPASS calculator functionality to AI assistants. The server will support streaming responses, provide health monitoring endpoints, and include a package update management command. The implementation uses TypeScript 5.x with Bun 1.x runtime and the official @modelcontextprotocol/sdk, deployed via OCI-compliant containerization (Containerfile with oven/bun:slim base).

## Technical Context

**Language/Version**: TypeScript 5.9.3 with Bun 1.x runtime
**Primary Dependencies**: @modelcontextprotocol/sdk ^1.20.2
**Storage**: Static JSON file cache (data/calendar-cache.json)
**Testing**: Bun test (manual validation sufficient for PoC per constitution)
**Target Platform**: Linux server (containerized deployment)
**Project Type**: Single server application
**Performance Goals**:
- Server startup < 5 seconds
- TPASS calculation response < 2 seconds
- Streaming response initiation < 500ms
- 100 concurrent connections without degradation
**Constraints**:
- Container image < 100MB (slim base)
- Container rebuild < 30 seconds (code-only changes)
- Non-root user execution
- No authentication (out of scope per spec)
**Scale/Scope**:
- Single MCP server instance
- Support for TPASS calculator tool + package update command
- Health monitoring endpoint
- ~1000 lines of application code estimated

## SDK-Provided Capabilities

The following functional requirements are satisfied by the @modelcontextprotocol/sdk and Bun runtime without custom implementation:

### Concurrent Connection Handling (FR-006)

**Requirement**: Handle 100 concurrent connections, queue excess with 30-second timeout

**Implementation**:
- `StreamableHTTPServerTransport` uses stateless mode (sessionIdGenerator: undefined)
- Bun.serve() handles concurrent HTTP connections natively
- No explicit queueing implementation needed for PoC (SDK + runtime handles this)

**Validation**: Manual load testing recommended during T011 (health check validation)

### Graceful Shutdown (FR-009)

**Requirement**: Gracefully handle shutdown signals to prevent data loss

**Implementation**:
- Bun runtime provides signal handling (SIGTERM, SIGINT)
- Stateless mode means no in-memory session state to persist
- Current connections complete before shutdown (Bun native behavior)

**Validation**: Manual testing with `kill -TERM <pid>` during T010 (server startup)

### MCP Protocol Validation (FR-004)

**Requirement**: Validate incoming requests against MCP protocol specifications

**Implementation**:
- `StreamableHTTPServerTransport.handleRequest()` performs JSON-RPC validation
- SDK rejects malformed requests with proper error codes
- No custom validation needed

**Validation**: Implicit in T014 (MCP tool execution test with invalid payloads)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: PoC-First Simplicity
- ✅ **PASS**: Using simplest HTTP MCP server implementation
- ✅ **PASS**: Direct integration with existing TPASS calculator
- ✅ **PASS**: Manual testing acceptable per constitution
- ✅ **PASS**: No premature optimization - deferred unless blocking

### Principle II: TypeScript + Bun Foundation
- ✅ **PASS**: TypeScript 5.9.3 with Bun 1.x runtime
- ✅ **PASS**: Minimal dependencies (@modelcontextprotocol/sdk only)
- ✅ **PASS**: ES modules (import/export)
- ✅ **PASS**: Strict type safety enabled

### Principle III: MCP Protocol Compliance
- ✅ **PASS**: Using official @modelcontextprotocol/sdk
- ✅ **PASS**: HTTP transport per spec requirements
- ✅ **PASS**: JSON-RPC format compliance via SDK

### Principle IV: Dual Integration (MCP + OpenAI Apps)
- ⚠️ **DEFERRED**: This feature focuses on HTTP MCP server only
- 📝 **NOTE**: OpenAI Apps integration is out of scope per feature spec
- 📝 **NOTE**: Core TPASS calculator logic remains reusable for future OpenAI Apps integration

### Principle V: Iterative Validation
- ✅ **PASS**: Prioritized user stories (P1: Health check → P2: Calculator → P3: Streaming)
- ✅ **PASS**: Each story independently testable
- ✅ **PASS**: Manual validation via health check and tool execution

### Complexity Violations Requiring Justification
None - implementation aligns with PoC simplicity principles.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── server/
│   ├── http-server.ts          # HTTP server with MCP protocol handling
│   ├── health.ts                # /healthz endpoint implementation
│   └── streaming.ts             # Server-sent events for streaming responses
├── mcp/
│   ├── tools/
│   │   ├── tpass-calculator.ts  # MCP tool wrapper for TPASS calculator
│   │   └── registry.ts          # Tool registration and management
│   └── protocol/
│       ├── request-validator.ts # MCP request validation
│       └── response-builder.ts  # MCP response formatting
├── calculator/
│   └── [existing TPASS calculator - already implemented]
├── commands/
│   ├── update-deps.ts           # Package update command logic
│   └── version-checker.ts       # Semver comparison and major version detection
├── config/
│   └── env.ts                   # Environment variable configuration (MCP_PORT)
└── index.ts                     # Entry point (bun run server)

data/
└── calendar-cache.json          # Static calendar data cache

tests/
├── integration/
│   ├── health-check.test.ts     # Health endpoint tests
│   ├── mcp-calculator.test.ts   # MCP tool execution tests
│   └── streaming.test.ts        # Streaming response tests
└── unit/
    ├── request-validator.test.ts
    └── version-checker.test.ts

Containerfile                    # OCI-compliant container build config
.containerignore                 # Container build exclusions
```

**Structure Decision**: Single project structure chosen as this is a standalone server application. The structure separates concerns into:
- `server/`: HTTP server and transport layer
- `mcp/`: MCP protocol implementation
- `calculator/`: Existing TPASS calculation logic (reused)
- `commands/`: CLI commands (update-deps)
- `config/`: Configuration management

## Complexity Tracking

No violations - implementation aligns with PoC simplicity principles.

## Post-Design Constitution Re-Check

*Re-evaluated after Phase 1 design artifacts completed*

### Principle I: PoC-First Simplicity
- ✅ **PASS**: Design uses SDK-provided transport (no custom HTTP implementation)
- ✅ **PASS**: Reuses existing MCP server and tool handlers
- ✅ **PASS**: Minimal new code required (~50 LOC estimated vs. 450 LOC original)
- ✅ **PASS**: No premature abstractions introduced

### Principle II: TypeScript + Bun Foundation
- ✅ **PASS**: No additional dependencies beyond SDK (already installed)
- ✅ **PASS**: Bun HTTP API used for health endpoint only
- ✅ **PASS**: Pure TypeScript with strict mode
- ✅ **PASS**: ES modules throughout

### Principle III: MCP Protocol Compliance
- ✅ **PASS**: StreamableHTTPServerTransport ensures spec compliance
- ✅ **PASS**: OpenAPI contract documents HTTP endpoints
- ✅ **PASS**: SSE streaming per MCP specification

### Principle IV: Dual Integration
- ✅ **PASS**: MCP implementation complete
- 📝 **NOTE**: OpenAI Apps integration remains future work (out of scope)

### Principle V: Iterative Validation
- ✅ **PASS**: quickstart.md provides independent testing for each component
- ✅ **PASS**: Health check can be validated independently
- ✅ **PASS**: MCP tool execution can be validated independently
- ✅ **PASS**: Container deployment can be validated independently

**Final Assessment**: All constitution principles satisfied. Design significantly simpler than original plan due to research findings. Ready for task decomposition phase.
