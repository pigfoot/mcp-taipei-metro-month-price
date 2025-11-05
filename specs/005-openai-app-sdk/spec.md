# Feature Specification: OpenAI Apps SDK Integration

**Feature Branch**: `005-openai-app-sdk`
**Created**: 2025-11-04
**Status**: Draft
**Input**: User description: "目前 MCP 已經完成了, 但 OpenAI Apps SDK 還沒有完成。所以這個 spec 就要來把 OpenAI Apps SDK 照 MCP tool 也完成而且也要 study best practice 怎麼實作 OpenAI Apps SDK"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - OpenAI App Integration via /mcp Endpoint (Priority: P1)

As a developer integrating with OpenAI Apps SDK, I want the TPASS calculator service to automatically detect OpenAI Apps SDK requests via user-agent header and provide an appropriate OpenAI-compatible response format with widgets, so I can leverage the Taipei Metro fare calculator within OpenAI ChatGPT applications.

**Why this priority**: This is the core integration requirement that enables OpenAI Apps to use the existing MCP functionality, directly supporting the primary use case of making TPASS calculator available in ChatGPT.

**Independent Test**: Can be fully tested by sending an HTTP POST request to /mcp endpoint with user-agent: "openai-mcp/1.0.0" and verifying the response uses OpenAI Apps SDK format with appropriate widgets.

**Acceptance Scenarios**:

1. **Given** a request to /mcp endpoint with user-agent containing "openai-mcp", **When** the system receives a calculate TPASS request, **Then** it returns OpenAI Apps SDK format with interactive widgets for user input
2. **Given** a request to /mcp endpoint with standard browser user-agent, **When** the system receives a request, **Then** it returns standard MCP protocol response (backward compatibility)
3. **Given** a request to /mcp endpoint with user-agent "openai-mcp/1.0.0" containing function call, **When** system processes the function call, **Then** it responds with OpenAI Apps SDK function result format including structured data for widgets
4. **Given** a request to /mcp endpoint without user-agent header, **When** system receives request, **Then** it defaults to standard MCP protocol response for safety

---

### User Story 2 - Widget-Based User Interaction (Priority: P1)

As an OpenAI Apps SDK user, I want to interact with the TPASS calculator through intuitive form widgets (date pickers, number inputs, dropdowns) rendered within the ChatGPT interface, so I can easily input parameters and visualize fare calculations with interactive UI elements.

**Why this priority**: Widgets provide the best user experience for data input and visualization in OpenAI Apps SDK, making the complex TPASS calculation accessible to non-technical users.

**Independent Test**: Can be verified by checking OpenAI Apps SDK response includes proper widget definitions (input fields, buttons, charts) that render correctly in ChatGPT interface.

**Acceptance Scenarios**:

1. **Given** an OpenAI Apps SDK request for TPASS calculation, **When** system generates response, **Then** it includes form widgets for start date, fare amount, and trips per day with appropriate validation
2. **Given** user submits form data via widgets, **When** system processes input, **Then** it returns calculation results with visual widgets (cards, charts) displaying cost breakdown and savings
3. **Given** calculation involves cross-month periods, **When** system generates widget response, **Then** it displays interactive monthly breakdown chart with detailed cost information
4. **Given** user requests discount information, **When** system responds, **Then** it shows interactive discount tier table widget with eligibility criteria

---

### User Story 3 - Seamless Migration from MCP to OpenAI Apps SDK (Priority: P2)

As a system operator, I want to maintain the existing MCP server functionality while adding OpenAI Apps SDK support through the same endpoint, so I don't need to maintain separate server instances and can gradually migrate users to the new interface.

**Why this priority**: Operational efficiency - reduces infrastructure complexity and maintenance overhead by supporting both protocols through a single endpoint.

**Independent Test**: Can be tested by verifying both "bun run mcp-server" (stdio transport) and HTTP /mcp endpoint work correctly, and that the HTTP endpoint handles both MCP and OpenAI App requests appropriately.

**Acceptance Scenarios**:

1. **Given** existing MCP client using stdio transport, **When** server starts, **Then** it continues to work without modifications (backward compatibility)
2. **Given** HTTP server running on /mcp endpoint, **When** it receives standard MCP JSON-RPC request, **Then** it returns standard MCP response format
3. **Given** HTTP server running on /mcp endpoint, **When** it receives OpenAI Apps SDK request, **Then** it returns OpenAI-compatible response with widgets
4. **Given** "bun run mcp-server" command, **When** executed, **Then** it starts stdio MCP server without HTTP transport (maintaining existing workflow)

---

### User Story 4 - Best Practice Widget Response Patterns (Priority: P3)

As an OpenAI App developer, I want the TPASS calculator to follow OpenAI Apps SDK best practices for widget design and response patterns, so the user experience is consistent with other successful OpenAI Apps and follows platform guidelines.

**Why this priority**: Following best practices ensures optimal user experience and increases the likelihood of App Store approval and user adoption.

**Independent Test**: Can be validated by reviewing widget structure against OpenAI Apps SDK documentation and comparing with successful app examples.

**Acceptance Scenarios**:

1. **Given** a calculation request, **When** system generates widget response, **Then** it uses progressive disclosure pattern (basic result first, detailed breakdown on demand)
2. **Given** multiple calculation results, **When** system displays widgets, **Then** it uses card-based layout with clear visual hierarchy and actionable elements
3. **Given** error scenarios, **When** system responds, **Then** it provides helpful widget-based guidance with retry options and input validation messages
4. **Given** complex fare data, **When** system presents information, **Then** it uses appropriate widget types (tables for rates, charts for trends, forms for input)

### Edge Cases

- What happens when user-agent header is missing or malformed?
- How does system handle requests that mix MCP and OpenAI Apps SDK formats?
- What occurs when OpenAI Apps SDK version compatibility issues arise?
- How does system behave when widget data exceeds OpenAI message size limits?
- What happens during network timeouts or server errors in OpenAI App context?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST inspect user-agent header in all incoming HTTP requests to /mcp endpoint and detect "openai-mcp" prefix for OpenAI Apps SDK requests
- **FR-002**: System MUST route requests to appropriate response formatter based on user-agent detection:
  - Requests with "openai-mcp" user-agent → OpenAI Apps SDK format with widgets
  - All other requests → Standard MCP protocol JSON-RPC response (backward compatibility)
- **FR-003**: System MUST maintain existing MCP stdio server functionality via dedicated command (e.g., "bun run mcp-server") without HTTP transport dependencies, ensuring clear distinction from HTTP server commands
- **FR-004**: System MUST generate OpenAI Apps SDK compatible responses following official example function call response format:
  - Function call results in OpenAI Apps SDK format with structured data
  - Complete widget definition structure for user input (date pickers, number inputs, dropdowns)
  - Visual result display widgets (cards, charts, tables) with proper layout
  - Friendly error messages with actionable suggestions using widget-based feedback including retry options and correction guidance
- **FR-005**: System MUST preserve all existing TPASS calculation logic and data:
  - Cross-month calculation accuracy
  - Discount tier application
  - Fare lookup functionality
  - Working day calculations with Taiwan calendar
- **FR-006**: System MUST implement step-by-step guided interaction pattern:
  - Initial simplified calculation options presented to user
  - Based on user selection, display detailed results with visualization
  - Progressive disclosure for complex cross-month calculations
  - Clear visual hierarchy in widget layout
  - Appropriate widget types for data (forms, charts, tables)
  - Actionable elements with proper labels
- **FR-007**: System MUST handle edge cases gracefully:
  - Missing or malformed user-agent headers
  - Request format validation errors
  - Widget rendering failures
  - Large response data that may exceed OpenAI message limits
- **FR-008**: System MUST maintain existing MCP security model for OpenAI App integration without requiring additional authentication or authorization
- **FR-009**: System MUST NOT impose additional rate limiting or request quotas beyond existing MCP server limitations
- **FR-010**: System MUST support English language only for OpenAI App integration (consistent with existing MCP implementation)
- **FR-011**: System MUST use OpenAI Apps Functions Schema v1.0 for widget integration while maintaining local TPASS calculation logic (consistent with existing MCP strategy)
- **FR-012**: System MUST be testable through API response format validation only, with widget rendering testing delegated to OpenAI platform

### Key Entities

- **UserAgentDetector**: Analyzes incoming HTTP requests to determine response format (MCP vs OpenAI Apps SDK)
- **ResponseFormatter**: Generates appropriate response based on detected client type with proper formatting for each protocol
- **WidgetRenderer**: Creates OpenAI Apps SDK compatible widget definitions and layouts for user interaction
- **OpenAIAppAdapter**: Bridges existing TPASS calculation logic to OpenAI Apps SDK function call interface

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: OpenAI App requests to /mcp endpoint receive responses within 3 seconds, matching the performance of standard MCP requests
- **SC-002**: User-agent detection achieves 100% accuracy in correctly identifying "openai-mcp" prefix and routing to appropriate response format
- **SC-003**: All existing MCP functionality remains operational with zero regression - stdio transport and HTTP MCP endpoint both work as before
- **SC-004**: OpenAI App responses include functional widgets that render correctly in ChatGPT interface:
  - Form widgets accept user input with validation
  - Result widgets display calculation data clearly
  - Interactive elements respond appropriately to user actions
- **SC-005**: Widget-based user flows complete successfully 95% of the time without technical errors or confusing interfaces
- **SC-006**: Cross-month TPASS calculations via OpenAI App widgets produce identical results to MCP protocol calculations (verified through integration tests)

## Scope & Boundaries *(mandatory)*

### In Scope
- Adding OpenAI Apps SDK support to existing /mcp HTTP endpoint
- Implementing user-agent based request routing
- Creating OpenAI Apps SDK compatible widget responses
- Maintaining backward compatibility with existing MCP clients
- Preserving all existing TPASS calculation logic
- Following OpenAI Apps SDK best practices for widget design

### Out of Scope
- Modifying the core TPASS calculation algorithms
- Adding new fare types or calculation methods
- Changing the existing MCP stdio server architecture
- Implementing OpenAI App Store submission process
- Adding user authentication or authorization
- Creating new data sources or calendar updates

## Assumptions *(mandatory)*

- Existing MCP server implementation and calculation logic remain unchanged
- User-agent header "openai-mcp/1.0.0" format indicates OpenAI Apps SDK client (version may vary)
- OpenAI Apps SDK widget specifications are stable and compatible with ChatGPT interface
- Both stdio and HTTP MCP transports continue to be supported in parallel
- Widget rendering and user interaction follow OpenAI Apps SDK documentation patterns
- Response time requirements match existing MCP performance (under 3 seconds)
- The /mcp endpoint continues to serve both MCP and OpenAI Apps SDK clients simultaneously
- Error handling for OpenAI App requests follows same reliability standards as MCP requests
- No additional monitoring or observability requirements beyond existing MCP server capabilities

## Clarifications

### Session 2025-11-04

- Q: Widget response format specifications → A: Follow official OpenAI Apps SDK example function call response format with complete widget definition structure
- Q: MCP service architecture strategy → A: Run stdio MCP server and HTTP server (supporting both protocols) as independent service processes with clear command distinction
- Q: OpenAI App error handling strategy → A: Provide friendly error messages with actionable suggestions using widget-based feedback including retry options and correction guidance
- Q: OpenAI Apps SDK security requirements → A: Maintain existing MCP security model without requiring additional authentication or authorization
- Q: Widget interaction pattern design → A: Use step-by-step guided interaction pattern with initial simplified options and detailed results with visualization
- Q: Data volume and scalability assumptions → A: No additional rate limiting or request quotas beyond existing MCP server limitations
- Q: Observability and monitoring requirements → A: No additional monitoring or observability requirements beyond existing MCP server capabilities
- Q: Localization and language support → A: Support English language only for OpenAI App integration
- Q: External dependencies and third-party services → A: Use OpenAI Apps SDK library for widget integration while maintaining local TPASS calculation logic
- Q: Testing strategy and validation approach → A: Test API response format only, widget rendering testing delegated to OpenAI platform
