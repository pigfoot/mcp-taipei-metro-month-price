# Data Model: Streamable HTTP MCP Server

**Feature**: 002-http-mcp-server
**Date**: 2025-10-29

## Overview

This document defines the data structures and relationships for the HTTP MCP Server feature. Since this feature primarily wraps existing TPASS calculator functionality with HTTP/MCP transport, the core domain entities already exist. This document focuses on HTTP-specific entities and request/response models.

## Core Entities

### 1. ServerConfig

Configuration for the HTTP MCP server.

**Fields**:
- `port: number` - HTTP server port (from MCP_PORT env var, default 3000)
- `logLevel: string` - Logging verbosity ("info" | "debug" | "error")
- `cachePath: string` - Path to calendar cache file

**Validation Rules**:
- port: 1-65535 range
- logLevel: Must be one of: "info", "debug", "error"
- cachePath: Must be valid file path

**Lifecycle**: Created at server startup, immutable during runtime

### 2. MCP Request/Response (SDK-provided)

These types are provided by @modelcontextprotocol/sdk and used directly:

**JSONRPCMessage** (from SDK):
- `jsonrpc: "2.0"`
- `id?: string | number`
- `method?: string`
- `params?: unknown`
- `result?: unknown`
- `error?: object`

**No custom modifications needed** - SDK handles serialization/deserialization.

### 3. HealthCheckResponse

Response for /healthz endpoint.

**Fields**:
- `status: "healthy" | "unhealthy"`
- `server: object`
  - `name: string` - Server name (from APP_INFO)
  - `version: string` - Server version (from APP_INFO)
  - `uptime: number` - Seconds since server start
- `mcp: object`
  - `connected: boolean` - MCP transport connection status
  - `toolsAvailable: number` - Count of registered tools
- `timestamp: string` - ISO 8601 timestamp

**Validation Rules**:
- status: Required, must be "healthy" or "unhealthy"
- timestamp: Must be valid ISO 8601 format

### 4. PackageVersionInfo

Information about a package version.

**Fields**:
- `name: string` - Package name (e.g., "prettier")
- `current: string` - Currently installed version (e.g., "^3.6.0")
- `latestMinor: string` - Latest version within same major (e.g., "3.6.2")
- `latestMajor: string | null` - Latest major version if different (e.g., "4.0.1")
- `updateAvailable: boolean` - True if any update available
- `isMajorUpdate: boolean` - True if latest is a major version bump

**Validation Rules**:
- name: Non-empty string
- current, latestMinor, latestMajor: Valid semver format
- If isMajorUpdate is true, latestMajor must be non-null

### 5. UpdateReport

Summary of package update operation.

**Fields**:
- `updated: PackageUpdate[]` - List of updated packages
- `skipped: PackageUpdate[]` - List of packages with major updates skipped
- `warnings: string[]` - Warning messages (major version available)
- `timestamp: string` - ISO 8601 timestamp of update
- `success: boolean` - Overall operation success

**PackageUpdate sub-type**:
- `name: string`
- `from: string` - Previous version
- `to: string` - New version
- `changeType: "patch" | "minor" | "major"`

**Validation Rules**:
- updated + skipped arrays: No duplicate package names
- warnings: Each warning should reference a package in skipped array

## Existing Domain Entities (Reused)

These entities are already defined in the existing TPASS calculator and are reused without modification:

### TravelParameters (from existing)
- Already defined in `src/models/tpass.ts`
- Used in MCP tool input

### TPASSRecommendation (from existing)
- Already defined in `src/models/tpass.ts`
- Used in MCP tool output

### CalendarCache (from existing)
- Already defined in `src/models/calendar.ts`
- Used by calculator service

## State Transitions

### Server Lifecycle

```
[STOPPED] --start()--> [STARTING] --transport.connect()--> [RUNNING]
                                                               |
                                    <----close()---------------+
                                    |
                                    v
                                [STOPPED]
```

**States**:
- **STOPPED**: Server not running, no resources allocated
- **STARTING**: Server initializing, transport connecting
- **RUNNING**: Server accepting requests, MCP transport connected
- **STOPPING**: Graceful shutdown in progress

**Transitions**:
- `start()`: STOPPED → STARTING
- `transport.connect()`: STARTING → RUNNING
- `close()`: RUNNING → STOPPING → STOPPED
- `error`: Any → STOPPED

### MCP Session (Stateless Mode)

```
[NO SESSION] --POST /mcp--> [REQUEST PROCESSING] --response--> [NO SESSION]
```

**Note**: In stateless mode (sessionIdGenerator: undefined), no persistent session state is maintained. Each request is independent.

### Package Update Operation

```
[IDLE] --update-deps--> [CHECKING VERSIONS] --fetch()--> [COMPARING]
                                                             |
                        <----write package.json--------------+
                        |
                        v
                    [COMPLETE]
```

**States**:
- **IDLE**: No update operation in progress
- **CHECKING VERSIONS**: Querying npm registry for latest versions
- **COMPARING**: Comparing current vs available versions
- **UPDATING**: Writing updated package.json
- **COMPLETE**: Operation finished

## Data Flow

### MCP Tool Execution Flow

```
AI Client --> POST /mcp --> StreamableHTTPServerTransport
                                      |
                                      v
                            JSONRPCMessage validation
                                      |
                                      v
                            Server.handleRequest()
                                      |
                                      v
                            Tool handler (existing)
                                      |
                                      v
                            TPASSRecommendation
                                      |
                                      v
                            JSONRPCMessage response
                                      |
                                      v
                            SSE stream OR JSON --> AI Client
```

### Health Check Flow

```
Monitor --> GET /healthz --> Health Handler
                                   |
                                   v
                          Check server state
                                   |
                                   v
                          HealthCheckResponse
                                   |
                                   v
                          JSON response (200 OK or 503)
```

## Validation Rules Summary

| Entity | Field | Rule |
|--------|-------|------|
| ServerConfig | port | 1-65535 |
| ServerConfig | logLevel | enum: info, debug, error |
| HealthCheckResponse | status | enum: healthy, unhealthy |
| PackageVersionInfo | versions | Valid semver |
| UpdateReport | package names | No duplicates |
| All timestamps | format | ISO 8601 |

## Persistence

**No new persistent storage required**:
- ServerConfig: Runtime only (from environment)
- HealthCheckResponse: Computed on demand
- PackageVersionInfo: Computed from package.json + npm registry
- UpdateReport: Computed during update operation
- Calendar cache: Existing file (`data/calendar-cache.json`)

## Relationships

```
ServerConfig (1) --uses--> CalendarCache (1)
Server (1) --exposes--> HealthCheckResponse (*)
Server (1) --handles--> MCP Tool Calls (*) --uses--> TravelParameters/TPASSRecommendation
UpdateCommand (1) --produces--> UpdateReport (1) --contains--> PackageUpdate (*)
```

## Notes

- This feature does not introduce complex domain entities
- Primary entities are configuration and transport-level structures
- Core business logic (TPASS calculation) entities remain unchanged
- SDK handles MCP protocol entities automatically
