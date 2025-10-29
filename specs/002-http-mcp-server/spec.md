# Feature Specification: Streamable HTTP MCP Server

**Feature Branch**: `002-http-mcp-server`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "Implement streamable HTTP MCP server for TPASS calculator"

## Clarifications

### Session 2025-10-29

- Q: Server port configuration mechanism? → A: Environment variable (e.g., MCP_PORT)
- Q: Logging detail level for tool executions? → A: Structured logging with request/response summary (no sensitive data)
- Q: Health check endpoint path? → A: /healthz
- Q: Containerfile optimization priorities? → A: Build speed (layer caching) and security (minimal privileges, no vulnerabilities)
- Q: Use Containerfile instead of Dockerfile? → A: Yes, for OCI standard compliance and tool flexibility
- Q: Handling connections exceeding 100 concurrent limit? → A: Queue with timeout (max 30 seconds wait)
- Q: Package update command name? → A: bun run update-deps
- Q: MCP protocol endpoint path? → A: /mcp
- Q: How to accept major version updates? → A: Use --major flag
- Q: Container base image? → A: oven/bun:slim
- Q: Server start command? → A: bun run server

## User Scenarios & Testing *(mandatory)*

### User Story 1 - MCP Server Initialization and Health Check (Priority: P1)

An administrator or automated system needs to start and verify that the MCP server is running properly, accepting connections, and ready to serve requests through HTTP protocol.

**Why this priority**: This is the foundation for all other functionality. Without a properly running server, no other features can be used.

**Independent Test**: Can be fully tested by starting the server and sending a health check request, verifying it responds with proper status indicating it's ready to accept MCP tool requests.

**Acceptance Scenarios**:

1. **Given** the server is not running, **When** the administrator runs `bun run server` with proper configuration, **Then** the server starts successfully and listens on the port specified by MCP_PORT environment variable (default 8080 if not set)
2. **Given** the server is running, **When** a health check request is sent to /healthz, **Then** the server responds with a success status and server information
3. **Given** the server configuration is invalid, **When** attempting to start the server, **Then** clear error messages are displayed indicating the configuration issue

---

### User Story 2 - TPASS Calculator Tool Execution (Priority: P2)

An AI assistant needs to calculate whether a user should purchase a TPASS monthly pass based on their travel patterns and costs. The tool should accept travel parameters and return a clear recommendation.

**Why this priority**: This is the core business functionality that provides value to end users by helping them make informed decisions about TPASS purchases.

**Independent Test**: Can be tested by sending various travel scenarios to the calculator tool and verifying it returns accurate recommendations with cost breakdowns.

**Acceptance Scenarios**:

1. **Given** the MCP server is running, **When** an AI sends a valid TPASS calculation request with travel parameters, **Then** the server returns a recommendation with cost analysis
2. **Given** the calculator tool receives incomplete travel data, **When** the calculation is attempted, **Then** the tool returns an error message indicating what information is missing
3. **Given** the calculator tool receives travel data indicating savings with TPASS, **When** calculation is performed, **Then** the tool recommends purchasing TPASS with savings amount
4. **Given** the calculator tool receives travel data indicating no savings, **When** calculation is performed, **Then** the tool recommends not purchasing TPASS with cost comparison

---

### User Story 3 - Streaming Response Support (Priority: P3)

An AI assistant needs to receive real-time updates during long-running calculations or when processing multiple scenarios, allowing for progressive display of results to the end user.

**Why this priority**: Streaming improves user experience by providing immediate feedback during potentially longer calculations, especially when analyzing multiple travel scenarios.

**Independent Test**: Can be tested by sending a request for multiple scenario calculations and verifying that partial results are streamed back progressively rather than waiting for all calculations to complete.

**Acceptance Scenarios**:

1. **Given** a request for multiple scenario calculations, **When** the server processes them, **Then** partial results are streamed back as each scenario completes
2. **Given** a long-running calculation request, **When** the server is processing, **Then** progress updates are streamed to indicate the calculation is ongoing
3. **Given** a streaming connection is interrupted, **When** the client reconnects, **Then** appropriate error handling ensures data consistency

---

### User Story 4 - Package Update Command (Priority: P4)

A developer needs to keep project dependencies up-to-date with the latest versions while being aware of major version changes that might introduce breaking changes. The command should intelligently update packages to their latest versions within the current major version or warn about available major updates.

**Why this priority**: Keeping dependencies updated improves security and performance, while controlled updates with warnings prevent unexpected breaking changes that could affect the MCP server stability.

**Independent Test**: Can be tested by running the update command and verifying it correctly identifies available updates, applies minor/patch updates automatically, and warns about major version changes.

**Acceptance Scenarios**:

1. **Given** a package has a newer minor or patch version available, **When** the developer runs `bun run update-deps`, **Then** the package is automatically updated to the latest version within the same major version
2. **Given** a package has a major version update available, **When** the developer runs `bun run update-deps`, **Then** a warning message is displayed showing the available major version and suggesting to use `--major` flag to accept it
3. **Given** packages marked as "latest" in package.json, **When** `bun run update-deps` is executed, **Then** these packages are always updated to the absolute latest version regardless of major version changes
4. **Given** multiple packages need updates, **When** `bun run update-deps` completes, **Then** a summary report shows all updated packages, skipped major updates, and any warnings
5. **Given** a developer wants to accept major version updates, **When** running `bun run update-deps --major`, **Then** all packages including major versions are updated with clear indication of breaking changes

---

### User Story 5 - Containerized Deployment (Priority: P5)

A system administrator needs to deploy the MCP server in a containerized environment for consistent deployment across different environments and easy scaling.

**Why this priority**: Containerization ensures consistent deployment, simplifies operations, and enables easy scaling, but the server can function without it for development and testing.

**Independent Test**: Can be tested by building the container image and running it, verifying the server functions identically to non-containerized deployment.

**Acceptance Scenarios**:

1. **Given** a valid container configuration file, **When** building the container image, **Then** the image builds successfully with all dependencies included, utilizing layer caching for fast rebuilds and following security best practices (non-root user, slim base image)
2. **Given** a built container image, **When** running the container, **Then** the MCP server starts and is accessible on the exposed port
3. **Given** container resource limits are set, **When** the server approaches limits, **Then** appropriate warnings or throttling occurs

---

### Edge Cases

- What happens when the server receives malformed MCP protocol requests?
- How does the system handle concurrent calculation requests from multiple AI assistants?
- What occurs when calendar data cache is unavailable or corrupted?
- How does the server respond when port is already in use during startup?
- What happens when container runs out of memory during calculation?
- When connections exceed 100 concurrent limit, new requests are queued for up to 30 seconds before returning timeout error
- How does the update command handle network failures when checking for package versions?
- What happens when package registry returns inconsistent or malformed version information?
- How does the system handle conflicts when multiple packages depend on different versions of the same sub-dependency?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose MCP tools through HTTP protocol at `/mcp` endpoint allowing AI assistants to connect and execute tools
- **FR-002**: System MUST provide a TPASS calculator tool that accepts travel parameters and returns purchase recommendations
- **FR-003**: Server MUST support streaming responses for real-time feedback during calculations
- **FR-004**: System MUST validate all incoming requests against MCP protocol specifications
- **FR-005**: Server MUST provide health check endpoint at /healthz path for monitoring and readiness verification
- **FR-006**: System MUST handle multiple concurrent client connections without blocking, queuing excess connections beyond 100 concurrent limit with maximum 30-second wait time
- **FR-007**: Calculator tool MUST provide cost breakdown comparing TPASS price with individual trip costs
- **FR-008**: System MUST log all tool executions with structured format including timestamp, tool name, request/response summaries (excluding sensitive data), execution time, and outcome status
- **FR-009**: Server MUST gracefully handle shutdown signals to prevent data loss
- **FR-010**: System MUST be deployable in containerized environments with proper configuration
- **FR-011**: Server MUST read port configuration from MCP_PORT environment variable, defaulting to 8080 if not specified
- **FR-018**: Server MUST be startable using `bun run server` command
- **FR-012**: System MUST provide `bun run update-deps` command that checks for newer versions of all dependencies
- **FR-013**: Update command MUST automatically update packages to latest minor/patch versions within the same major version
- **FR-014**: Update command MUST display warnings for available major version updates with clear indication of version jump and instruction to use `--major` flag
- **FR-017**: Update command with `--major` flag MUST update all packages including major versions with appropriate warnings
- **FR-015**: Packages with version specifier "latest" in package.json (e.g., `"prettier": "latest"`) MUST always update to the absolute latest version regardless of major version changes
- **FR-016**: Update command MUST generate a summary report showing all changes, warnings, and skipped updates

### Key Entities *(include if feature involves data)*

- **Travel Parameters**: User's travel patterns including frequency, routes, and ticket types used for TPASS calculation
- **TPASS Recommendation**: Calculator output containing purchase recommendation, cost analysis, and savings information
- **MCP Request**: Incoming tool execution request following MCP protocol specifications
- **MCP Response**: Server response containing tool execution results or error information
- **Calendar Cache**: Stored calendar data used for accurate monthly calculations
- **Package Version Info**: Metadata about available package versions including current, latest minor/patch, and latest major versions
- **Update Report**: Summary of package updates performed, warnings issued, and actions skipped

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Server starts and becomes ready to accept connections within 5 seconds of launch
- **SC-002**: TPASS calculator returns recommendations within 2 seconds for typical travel scenarios
- **SC-003**: System handles at least 100 concurrent MCP connections without performance degradation
- **SC-004**: 99% of valid MCP requests receive successful responses without errors
- **SC-005**: Streaming responses begin within 500ms of request initiation
- **SC-006**: Container image size remains under 100MB using slim base for optimal balance of size and functionality
- **SC-009**: Container rebuilds utilize layer caching to complete in under 30 seconds for code-only changes
- **SC-010**: Container runs with non-root user and passes security vulnerability scans with no critical issues
- **SC-007**: Server maintains 99.9% uptime during normal operations
- **SC-008**: 95% of users receive accurate TPASS recommendations matching manual calculations
- **SC-011**: Package update command completes checking all dependencies within 10 seconds
- **SC-012**: Update command correctly identifies 100% of available minor/patch updates
- **SC-013**: Major version warnings are displayed for 100% of packages with breaking changes
- **SC-014**: Update summary report is generated in under 2 seconds after completion

## Dependencies *(mandatory)*

- Existing TPASS calculator core functionality must be available and functional
- Calendar data cache must be accessible for accurate monthly calculations
- Network connectivity for HTTP protocol communication
- Container runtime environment (for containerized deployment scenarios)

## Scope *(mandatory)*

### In Scope
- HTTP-based MCP server implementation
- TPASS calculator tool exposure through MCP protocol
- Streaming response capability
- Container deployment configuration using Containerfile
- Health monitoring endpoints
- Request validation and error handling
- Package dependency update command with version management
- Major version change warnings and reporting

### Out of Scope
- Modifications to core TPASS calculator logic
- User interface or direct user interaction
- Authentication and authorization mechanisms
- Database persistence beyond existing cache
- Multi-region deployment or load balancing
- Integration with payment systems

## Assumptions *(mandatory)*

- The existing TPASS calculator function is already implemented and tested
- MCP protocol specifications are stable and well-documented
- Container runtime environment supports OCI-compliant container specifications (Podman, Docker, etc.)
- Network infrastructure allows HTTP traffic on configured ports
- AI assistants using the service understand MCP protocol
- Calendar cache data format remains consistent with current implementation
- Container build tools support Containerfile format (Podman, Buildah, Docker with -f flag)
- Package registry (npm/bun registry) is accessible and returns accurate version information
- Semantic versioning is followed by all project dependencies