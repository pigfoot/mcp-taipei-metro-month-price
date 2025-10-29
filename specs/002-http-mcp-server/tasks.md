# Implementation Tasks: Streamable HTTP MCP Server

**Feature**: 002-http-mcp-server
**Branch**: `002-http-mcp-server`
**Generated**: 2025-10-29

**Total Tasks**: 25 tasks across 7 phases

---

## Phase 1: Setup (2 tasks)

**Purpose**: Create feature branch and validate environment prerequisites

- [X] T001 [P1] [Setup] Create feature branch `002-http-mcp-server` from main
- [X] T002 [P1] [Setup] Verify @modelcontextprotocol/sdk v1.20.2 installed and StreamableHTTPServerTransport available in node_modules/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.d.ts

**Dependencies**: None (can run immediately)

---

## Phase 2: Configuration Foundation (3 tasks)

**Purpose**: Add server configuration and environment variable handling

- [X] T003 [P1] [US1] Create src/config/env.ts with environment variable configuration (MCP_PORT with default 8080, LOG_LEVEL, CACHE_PATH) following existing src/config/app.ts pattern
- [X] T004 [P1] [US1] Add package.json script `"server": "bun run src/index.ts"` in scripts section
- [X] T005 [P1] [US1] Create src/types/server.ts with ServerConfig interface (port: number, logLevel: string, cachePath: string) and HealthCheckResponse type definition from data-model.md

**Dependencies**: T001-T002 must complete first

---

## Phase 3: User Story 1 - MCP Server Initialization and Health Check (7 tasks)

**Purpose**: Implement HTTP server with MCP transport and health monitoring endpoint

- [X] T006 [P1] [US1] Create src/server/http-transport.ts wrapping StreamableHTTPServerTransport with configuration from src/config/env.ts (stateless mode: sessionIdGenerator undefined)
- [X] T007 [P1] [US1] Update src/adapters/mcp/server.ts to add optional HTTP transport mode alongside existing stdio mode using environment detection
- [X] T008 [P1] [US1] Create src/server/http-server.ts with Bun.serve() HTTP server handling /mcp endpoint (delegating to transport.handleRequest) and routing to health handler
- [X] T009 [P1] [US1] Create src/server/health.ts implementing GET /healthz endpoint returning HealthCheckResponse with server status, MCP connection state, and uptime tracking
- [X] T010 [P1] [US1] Update src/index.ts to start HTTP server when MCP_PORT is set, otherwise default to stdio mode for backward compatibility
- [X] T011 [P1] [US1] Manual test: Start server with `MCP_PORT=8080 bun run server` and verify health check responds at http://localhost:8080/healthz with status "healthy" and mcp.connected true
- [X] T011b [P1] [US1] Manual test: Verify graceful shutdown by starting server, sending health check request, then sending SIGTERM signal - confirm response completes before shutdown and no errors logged

**Story Completion Criteria**:
- ✅ Server starts successfully with `bun run server` (FR-018)
- ✅ Health check endpoint returns proper JSON response (FR-005)
- ✅ Server startup time < 5 seconds (SC-001)
- ✅ MCP transport connection status visible in health response

**Dependencies**: T003-T005 must complete first

---

## Phase 4: User Story 2 - TPASS Calculator Tool Execution (4 tasks)

**Purpose**: Expose existing TPASS calculator through HTTP MCP endpoint

- [X] T012 [P2] [US2] Verify existing MCP tool handlers in src/adapters/mcp/tools.ts work with HTTP transport (no modifications needed, SDK handles routing)
- [X] T013 [P2] [US2] Verify existing calculate_tpass_value tool schema and handler function in src/adapters/mcp/tools.ts are registered with MCP server
- [X] T014 [P2] [US2] Manual test: POST to http://localhost:8080/mcp with JSON-RPC request calling calculate_tpass_value tool with test parameters (rides: 42, month: 11, year: 2025)
- [X] T015 [P2] [US2] Verify calculator returns TPASSRecommendation with cost breakdown, savings analysis, and purchase decision matching acceptance criteria

**Story Completion Criteria**:
- ✅ TPASS calculator accepts valid travel parameters (FR-002)
- ✅ Returns recommendation with cost breakdown (FR-007)
- ✅ Response time < 2 seconds for typical scenarios (SC-002)
- ✅ Handles invalid input with clear error messages

**Dependencies**: T011 (US1 complete) must finish first

---

## Phase 5: User Story 3 - Streaming Response Support (2 tasks)

**Purpose**: Enable SSE streaming for real-time calculation updates

- [X] T016 [P3] [US3] Verify StreamableHTTPServerTransport automatically handles GET /mcp for SSE stream establishment (no custom code needed, SDK provides this)
- [X] T017 [P3] [US3] Manual test: Open SSE connection to http://localhost:8080/mcp with Accept: text/event-stream header and verify MCP messages stream as server-sent events

**Story Completion Criteria**:
- ✅ SSE stream establishes successfully (FR-003)
- ✅ Streaming response begins < 500ms (SC-005)
- ✅ Multiple partial results streamed progressively
- ✅ Proper error handling on connection interruption

**Dependencies**: T015 (US2 complete) must finish first

---

## Phase 6: User Story 4 - Package Update Command (5 tasks)

**Purpose**: Implement dependency update management with version awareness

- [X] T018 [P4] [US4] Create src/commands/version-checker.ts with semver comparison functions (isMinorUpdate, isMajorUpdate) and latest version fetching from npm registry
- [X] T019 [P4] [US4] Create src/commands/update-deps.ts with package.json reading, version comparison, and selective update logic (auto-update minor/patch, warn for major)
- [X] T020 [P4] [US4] Implement --major flag handling in src/commands/update-deps.ts to accept major version updates when explicitly requested
- [X] T021 [P4] [US4] Add package.json script `"update-deps": "bun run src/commands/update-deps.ts"` in scripts section
- [X] T022 [P4] [US4] Manual test: Run `bun run update-deps` and verify summary report shows updated packages, major version warnings, and completion time < 10 seconds

**Story Completion Criteria**:
- ✅ Command identifies all available updates (FR-012, SC-012)
- ✅ Auto-updates minor/patch versions (FR-013)
- ✅ Warns about major updates with --major flag instruction (FR-014)
- ✅ Generates summary report < 2 seconds (SC-014)
- ✅ Handles "latest" packages correctly (FR-015)

**Dependencies**: T001 (branch created) - can run in parallel with US1-US3

---

## Phase 7: User Story 5 - Containerized Deployment (2 tasks)

**Purpose**: Update existing container configuration for HTTP server deployment

- [X] T023 [P5] [US5] Rename Dockerfile to Containerfile and update: Change CMD to ["bun", "run", "server"], add ENV MCP_PORT=8080, add EXPOSE 8080, add HEALTHCHECK using curl to /healthz endpoint - keep existing node:lts-slim + Bun binary copy architecture
- [X] T024 [P5] [US5] Manual test: Build container `docker build -f Containerfile -t mcp-taipei-metro-server .` and run `docker run -p 8080:8080 mcp-taipei-metro-server`, verify server accessible and health check passes, rebuild time < 30 seconds for code changes

**Story Completion Criteria**:
- ✅ Container builds successfully with layer caching (SC-009)
- ✅ Image size < 100MB using existing slim architecture (SC-006)
- ✅ Runs with non-root user (SC-010)
- ✅ Health check endpoint accessible from container
- ✅ Server starts and functions identically to non-containerized deployment

**Dependencies**: T017 (US3 complete) must finish first

---

## Dependency Graph

```
T001-T002 (Setup)
    ↓
T003-T005 (Configuration)
    ↓
T006-T011 (US1: Server + Health)
    ↓
T012-T015 (US2: Calculator)
    ↓
T016-T017 (US3: Streaming)
    ↓
T023-T024 (US5: Container)

T001 (branch)
    ↓
T018-T022 (US4: Package Update) [parallel track]
```

**Parallel Execution Opportunities**:
- T003, T004, T005 can run in parallel
- T006, T007 can run in parallel (different files)
- T008, T009 can run in parallel (different files)
- **Entire US4 (T018-T022) can run in parallel with US1-US3** since package update command is independent of HTTP server implementation

---

## Story Completion Order

Based on priorities and dependencies:

1. **Setup** (T001-T002) - Foundation
2. **Configuration** (T003-T005) - Required by all stories
3. **US1** (T006-T011) - P1: Server initialization - blocks US2, US3, US5
4. **US2** (T012-T015) - P2: Calculator tool - blocks US3
5. **US3** (T016-T017) - P3: Streaming - blocks US5
6. **US4** (T018-T022) - P4: Package update - **Can run anytime after T001** (independent)
7. **US5** (T023-T024) - P5: Container - requires US3 complete

---

## Implementation Estimates

Based on research findings (90% complexity reduction from SDK usage):

| Phase | Tasks | Estimated LOC | Estimated Time |
|-------|-------|---------------|----------------|
| Phase 1 | T001-T002 | 0 | 5 minutes |
| Phase 2 | T003-T005 | ~30 | 30 minutes |
| Phase 3 | T006-T011 | ~80 | 2 hours |
| Phase 4 | T012-T015 | ~0 | 30 minutes (verification only) |
| Phase 5 | T016-T017 | ~0 | 15 minutes (verification only) |
| Phase 6 | T018-T022 | ~120 | 2 hours |
| Phase 7 | T023-T024 | 4 lines | 30 minutes |
| **Total** | **25 tasks** | **~234 LOC** | **~6 hours** |

**Note**: Original estimate was 450 LOC / 12 hours. Research findings reduced implementation by 48% due to SDK providing complete HTTP/SSE transport.

---

## Testing Strategy

### Manual Testing Per User Story

**US1 - Server Health**:
```bash
# T011 validation
MCP_PORT=8080 bun run server
curl http://localhost:8080/healthz
# Expected: {"status":"healthy","server":{...},"mcp":{"connected":true,...}}
```

**US2 - Calculator Tool**:
```bash
# T014 validation
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"calculate_tpass_value","arguments":{"rides":42,"month":11,"year":2025}}}'
# Expected: JSON-RPC response with TPASSRecommendation
```

**US3 - Streaming**:
```bash
# T017 validation
curl -N -H "Accept: text/event-stream" http://localhost:8080/mcp
# Expected: SSE stream with event: message lines
```

**US4 - Package Update**:
```bash
# T022 validation
bun run update-deps
# Expected: Summary report with updated packages and warnings
```

**US5 - Container**:
```bash
# T024 validation
docker build -f Containerfile -t mcp-taipei-metro-server .
docker run -p 8080:8080 mcp-taipei-metro-server
curl http://localhost:8080/healthz
# Expected: Same health response as non-containerized
```

---

## Notes

- **No automated tests required** - Spec does not request test suite, manual validation sufficient per constitution Principle I (PoC-First Simplicity)
- **Existing code reuse** - TPASS calculator logic and MCP server infrastructure already implemented in 001-tpass-calculator
- **SDK handles complexity** - StreamableHTTPServerTransport provides complete HTTP/SSE implementation, no custom protocol code needed
- **Container optimization** - Existing Dockerfile hybrid architecture (node:lts-slim + Bun binary copy) is superior to pure oven/bun:slim, only 4 line changes needed
- **Backward compatibility** - HTTP mode is optional, stdio mode remains default when MCP_PORT not set

---

## Success Validation Checklist

After all tasks complete, verify:

- [ ] Server starts < 5 seconds (SC-001)
- [ ] Calculator responds < 2 seconds (SC-002)
- [ ] Handles 100 concurrent connections (SC-003)
- [ ] 99% valid requests succeed (SC-004)
- [ ] Streaming begins < 500ms (SC-005)
- [ ] Container image < 100MB (SC-006)
- [ ] Container rebuild < 30 seconds (SC-009)
- [ ] Non-root container user (SC-010)
- [ ] Package check < 10 seconds (SC-011)
- [ ] 100% minor/patch updates identified (SC-012)
- [ ] 100% major warnings displayed (SC-013)
- [ ] Update report < 2 seconds (SC-014)
