# Implementation Tasks: OpenAI App SDK Integration

**Feature**: OpenAI App SDK Integration
**Version**: 1.0.0
**Date**: 2025-11-04
**Input**: Feature specification from `/specs/005-openai-app-sdk/spec.md`

**Overview**: Enable TPASS calculator service to support both MCP clients and OpenAI Apps SDK through user-agent based request routing with "no-opensai-sdk" strategy for compatibility.

## Implementation Strategy

**MVP Scope**: User Story 1 (OpenAI App Integration via /mcp Endpoint) - Provides core dual-protocol support with basic widget functionality.

**Incremental Delivery**:
1. **MVP**: Basic user-agent detection and response formatting (US1)
2. **Enhanced UX**: Full widget interaction patterns (US2)
3. **Operational**: Backward compatibility and migration support (US3)
4. **Polish**: Best practices and optimization (US4)

**Parallel Execution**: User Stories 3 and 4 can be developed in parallel after foundational work (US1, US2 must be sequential).

## Phase 1: Setup

**Goal**: Initialize project structure and extend existing codebase for OpenAI Apps integration.

### Project Structure Extension

- [X] T001 Extend project documentation with OpenAI Apps integration details in CLAUDE.md
- [X] T002 Create new test directory structure: tests/contract/openai-apps/ for API schema validation
- [X] T003 Create new integration test directory: tests/integration/openai-apps/ for end-to-end testing
- [X] T004 Set up Bun test framework configuration for OpenAI Apps tests

### Dependency Validation

- [X] T005 Verify @modelcontextprotocol/sdk v1.20.2 compatibility with planned OpenAI Apps integration
- [X] T006 Validate OpenAI Apps Functions Schema v1.0 compliance against planned implementation

---

## Phase 2: Foundational

**Goal**: Implement core components required by all user stories - user-agent detection, response routing, and shared infrastructure.

### User-Agent Detection Infrastructure

- [X] T007 Create UserAgentDetection service in src/lib/userAgentDetection.ts
- [X] T008 Implement robust user-agent parsing with "openai-mcp" prefix detection
- [X] T009 Add graceful fallback to MCP protocol when user-agent is missing or malformed

### Response Formatting Infrastructure

- [X] T010 Create ResponseFormatter interface and base implementation in src/lib/responseFormatter.ts
- [X] T011 Implement MCP protocol response formatter extending existing patterns
- [X] T012 Implement OpenAI Apps response formatter with widget support

### HTTP Server Integration

- [X] T013 Modify src/server/http-server.ts to integrate user-agent detection in /mcp endpoint
- [X] T014 Add request routing logic to delegate to appropriate response formatter
- [X] T015 Update HTTP server health check to report dual-protocol support status

### Error Handling Foundation

- [X] T016 Create error handling utilities for both MCP and OpenAI Apps protocols
- [X] T017 Implement protocol-specific error response formatting
- [X] T018 Add OpenAI message size validation and truncation logic
- [X] T019 Implement graceful fallback for widget rendering failures

### Performance Validation Foundation

- [X] T020 Add performance baseline tests for user-agent detection (<10ms)
- [X] T021 Add response time validation for basic calculations (<500ms)
- [X] T022 Implement response size monitoring for OpenAI message limits

---

## Phase 3: User Story 1 - OpenAI App Integration via /mcp Endpoint (Priority: P1)

**Goal**: Enable automatic detection of OpenAI App requests and provide appropriate response format with basic widget support.

**Independent Test**: Send HTTP POST request to /mcp endpoint with user-agent "openai-mcp/1.0.0" and verify OpenAI App SDK format response with widgets.

### OpenAI Apps Response Implementation

- [X] T023 [P] [US1] Enhance existing src/adapters/openai/app.ts with user-agent aware routing
- [X] T024 [P] [US1] Extend src/adapters/openai/functions.ts with widget configuration support
- [X] T025 [US1] Implement basic widget response structure in OpenAI Apps adapter
- [X] T026 [US1] Add function call result formatting with structured data for widgets

### Basic Widget Configuration

- [X] T027 [US1] Create WidgetConfiguration interface in src/lib/types.ts
- [X] T028 [US1] Implement basic form widget generation for TPASS calculation input
- [X] T029 [US1] Add result display widget with cost breakdown visualization
- [X] T030 [US1] Implement error widget with retry functionality

### Integration Testing

- [X] T031 Create integration test for user-agent detection accuracy in tests/integration/openai-apps/
- [X] T032 Create contract test for OpenAI Apps response format validation in tests/contract/openai-apps/
- [X] T033 Add backward compatibility test ensuring MCP responses unchanged in tests/integration/
- [X] T034 Add accuracy measurement test validating 100% user-agent detection success rate

### Calculation Logic Verification

- [X] T035 [P] [US1] Implement calculation accuracy verification comparing OpenAI App results with MCP results
- [X] T036 [P] [US1] Add cross-month calculation verification tests for OpenAI widget responses
- [X] T037 [P] [US1] Validate discount tier application consistency between MCP and OpenAI App calculations

### Acceptance Criteria Validation

- [X] T038 Test OpenAI App request detection with various user-agent formats
- [X] T039 Verify MCP protocol backward compatibility with existing clients
- [X] T040 Validate OpenAI function call processing and response formatting
- [X] T041 Test missing/malformed user-agent fallback behavior

---

## Phase 4: User Story 2 - Widget-Based User Interaction (Priority: P1)

**Goal**: Implement intuitive form widgets and step-by-step guided interaction for complex TPASS calculations.

**Independent Test**: Verify OpenAI App response includes proper widget definitions that render correctly in ChatGPT interface with progressive disclosure.

### Step-by-Step Interaction Pattern

- [X] T042 [US2] Create StepByStepInteraction manager in src/lib/stepByStepInteraction.ts
- [X] T043 [US2] Implement initial simplified calculation widget with basic parameters
- [X] T044 [US2] Add advanced options widget for trips per day and custom working days
- [X] T045 [US2] Create detailed results widget with savings visualization

### Form Widget Implementation

- [X] T043 [P] [US2] Implement date-picker widget for start date selection in src/lib/widgets/datePicker.ts
- [X] T044 [P] [US2] Implement number-input widget with validation in src/lib/widgets/numberInput.ts
- [X] T045 [P] [US2] Create dropdown widget for predefined options in src/lib/widgets/dropdown.ts
- [X] T046 [US2] Add input validation with helpful error messages and correction suggestions

### Progressive Disclosure Implementation

- [X] T047 [US2] Implement cross-month calculation detection and monthly breakdown widget
- [X] T048 [US2] Create discount tier visualization widget with eligibility criteria
- [X] T049 [US2] Add actionable elements with proper labels and clear visual hierarchy

### User Experience Testing

- [X] T050 Create widget interaction flow tests in tests/integration/openai-apps/
- [X] T051 Validate widget configuration schema compliance with OpenAI Apps standards
- [X] T052 Test step-by-step progression logic and data validation

### Acceptance Criteria Validation

- [X] T053 Test form widgets accept user input with proper validation
- [X] T054 Verify result widgets display calculation data clearly
- [X] T055 Validate interactive elements respond appropriately to user actions
- [X] T056 Test cross-month calculations produce detailed monthly breakdowns

---

## Phase 5: User Story 3 - Seamless Migration from MCP to OpenAI App SDK (Priority: P2)

**Goal**: Maintain existing MCP functionality while adding OpenAI App SDK support through the same endpoint for operational efficiency.

**Independent Test**: Verify both "bun run mcp-server" (stdio transport) and HTTP /mcp endpoint work correctly with appropriate protocol handling.

### Backward Compatibility Validation

- [X] T057 [P] [US3] Verify existing MCP stdio server functionality unchanged in src/adapters/mcp/server.ts
- [X] T058 [P] [US3] Test HTTP /mcp endpoint with standard MCP JSON-RPC requests
- [X] T059 [US3] Validate "bun run mcp-server" command continues to work without modifications
- [X] T060 [US3] Ensure no regression in existing MCP client integrations

### Dual Protocol Support

- [X] T061 [US3] Implement concurrent protocol handling in HTTP server
- [X] T062 [US3] Add protocol detection logging for operational transparency
- [X] T063 [US3] Create health check endpoint reporting both MCP and OpenAI Apps status

### Operational Monitoring

- [X] T064 [US3] Add minimal logging for protocol detection and routing decisions
- [X] T065 [US3] Implement basic metrics for OpenAI Apps vs MCP request distribution
- [X] T066 [US3] Create documentation for operational procedures and troubleshooting

### Migration Testing

- [X] T067 Create comprehensive backward compatibility test suite
- [X] T068 Test concurrent load handling between MCP and OpenAI Apps requests
- [X] T069 Validate no performance degradation for existing MCP clients

### Acceptance Criteria Validation

- [X] T070 Test MCP stdio server continues working without modifications
- [X] T071 Verify HTTP endpoint handles both MCP and OpenAI App requests appropriately
- [X] T072 Confirm clear command distinction between stdio and HTTP transports
- [X] T073 Validate zero regression in existing MCP functionality

---

## Phase 6: User Story 4 - Best Practice Widget Response Patterns (Priority: P3)

**Goal**: Follow OpenAI App SDK best practices for widget design and response patterns to ensure optimal user experience.

**Independent Test**: Validate widget structure against OpenAI Apps SDK documentation and successful app examples.

### Widget Design Standards

- [X] T074 [P] [US4] Implement progressive disclosure pattern in src/lib/widgets/progressiveDisclosure.ts
- [X] T075 [P] [US4] Create card-based layout system with clear visual hierarchy in src/lib/widgets/cardLayout.ts
- [X] T076 [P] [US4] Design actionable elements with proper labeling in src/lib/widgets/actionableElements.ts
- [X] T077 [US4] Implement error handling with helpful guidance and retry options

### Widget Type Optimization

- [X] T078 [US4] Optimize table widget for discount rates and trip comparisons
- [X] T079 [US4] Create chart widget for cost trends and savings visualization
- [X] T080 [US4] Enhance form widget design for optimal user input flow

### User Experience Enhancement

- [X] T081 [US4] Implement loading states and progress indicators for complex calculations
- [X] T082 [US4] Add contextual help and tooltips for complex fare concepts
- [X] T083 [US4] Create responsive widget layouts for different screen sizes
- [X] T084 [US4] Implement accessibility features following OpenAI Apps guidelines

### Best Practices Validation

- [X] T085 Review widget designs against OpenAI Apps SDK documentation
- [X] T086 Compare implementation patterns with successful app examples
- [X] T087 Optimize widget rendering performance and user interaction flow

### Acceptance Criteria Validation

- [X] T088 Test progressive disclosure pattern works correctly
- [X] T089 Verify card-based layout with clear visual hierarchy
- [X] T090 Validate error scenarios provide helpful guidance with retry options
- [X] T091 Confirm appropriate widget types used for different data presentations

---

## Final Phase: Polish & Cross-Cutting Concerns

**Goal**: Finalize implementation, optimize performance, and ensure production readiness.

### Performance Optimization

- [X] T092 Optimize response generation time to meet <3 second requirement
- [X] T093 Implement response caching for repeated OpenAI Apps requests
- [X] T094 Minimize widget configuration payload size for OpenAI message limits
- [X] T095 Add performance monitoring for dual-protocol server operations

### Documentation and Examples

- [X] T096 Update README.md with OpenAI Apps integration instructions
- [X] T097 Create example OpenAI Apps widget configurations
- [X] T098 Add troubleshooting guide for common integration issues
- [X] T099 Document API changes and migration notes for existing MCP users

### Final Testing and Validation

- [X] T100 Run comprehensive integration test suite for all user stories
- [X] T101 Validate all acceptance criteria across all user stories
- [X] T102 Perform load testing to ensure <3 second response time maintained
- [X] T103 Test error scenarios and edge cases across both protocols

### Code Quality and Maintenance

- [X] T104 Add comprehensive inline documentation for OpenAI Apps integration code
- [X] T105 Create code style guide for future OpenAI Apps feature additions
- [X] T106 Set up automated testing pipeline for continuous integration

## Dependencies

**Completion Order**:
```
Phase 1 (Setup) → Phase 2 (Foundational) → US1 (P1) → US2 (P1) → [US3 (P2) || US4 (P3)] → Polish
```

**Parallel Execution Opportunities**:
- T007-T009 (User-Agent Detection): Can run in parallel with T010-T012 (Response Formatting)
- T018-T021 (OpenAI Response): Can run in parallel with T022-T025 (Basic Widgets)
- T037-T040 (Form Widgets): Can run in parallel with T033-T036 (Step-by-Step)
- T051-T054 (Backward Compatibility): Can run in parallel with T055-T060 (Dual Protocol)
- T068-T071 (Widget Design): Can run in parallel with T072-T074 (Widget Types)

**Blocking Dependencies**:
- Phase 2 must complete before any User Story phases begin
- US1 (T018-T032) must complete before US2 (T033-T050) begins
- US2 (T033-T050) should complete before US3 (T051-T067) begins
- US4 (T068-T085) can begin after US2 (T033-T050) completes

## Independent Test Criteria

**US1 - OpenAI App Integration**:
- User-agent detection works 100% accurately
- OpenAI Apps responses include functional widgets
- MCP protocol backward compatibility maintained
- Response time under 3 seconds

**US2 - Widget-Based Interaction**:
- Form widgets accept input with validation
- Results display clearly with visualization
- Cross-month calculations show detailed breakdown
- Interactive elements respond appropriately

**US3 - Seamless Migration**:
- Existing MCP stdio server unaffected
- HTTP endpoint handles both protocols correctly
- Clear command distinction maintained
- Zero regression in existing functionality

**US4 - Best Practice Patterns**:
- Progressive disclosure implemented correctly
- Clear visual hierarchy in card layouts
- Helpful error guidance with retry options
- Appropriate widget types for data

## Parallel Execution Examples

**Example 1: Foundation + Basic Widgets**
```
Phase 2: T007-T012 (Foundational) runs concurrently
Phase 3: T018-T025 (US1 Basic Integration) runs concurrently
Total Time: ~60% of sequential execution
```

**Example 2: Widget Development**
```
Phase 3: T022-T025 (Basic Widgets) completes first
Phase 4: T037-T040 (Form Widgets) + T033-T036 (Step-by-Step) run in parallel
Total Time: ~50% of sequential execution for widget features
```

**Example 3: Parallel Enhancement**
```
After US1 + US2 complete:
Phase 5: T051-T060 (US3 Migration) runs in parallel with Phase 6: T068-T077 (US4 Design)
Total Time: ~40% of sequential execution for enhancement phases
```

---

## Task Summary

**Total Tasks**: 110
**Setup Phase**: 4 tasks
**Foundational Phase**: 16 tasks
**User Story 1 (P1)**: 20 tasks
**User Story 2 (P1)**: 18 tasks
**User Story 3 (P2)**: 17 tasks
**User Story 4 (P3)**: 18 tasks
**Polish Phase**: 17 tasks

**Parallel Execution Potential**: 43% of tasks can run in parallel, reducing total implementation time significantly.

**MVP Scope**: Complete Phase 1 + Phase 2 + US1 (Tasks 1-40) for basic OpenAI Apps integration with core functionality.

**Ready for Implementation**: All tasks follow strict checklist format with clear file paths and independent test criteria.

**Recent Fixes Applied**:
- ✅ Fixed FR-011 contradiction (removed SDK library requirement)
- ✅ Added TPASS calculation verification tasks
- ✅ Added performance baseline validation
- ✅ Enhanced edge case handling for OpenAI message limits
- ✅ Added 100% accuracy validation testing
- ✅ Standardized terminology to "OpenAI Apps SDK" (with space)
