# Implementation Plan: Cross-Month TPASS Calculation

**Branch**: `004-cross-month-tpass` | **Date**: 2025-11-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-cross-month-tpass/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement corrected TPASS fare calculation logic that properly handles cross-month scenarios by splitting the 30-day period into separate monthly calculations, applying discount tiers independently per month based on cumulative trip counts, and summing the results for accurate total cost estimation.

## Technical Context

**Language/Version**: TypeScript 5.x with Bun 1.x runtime
**Primary Dependencies**: @modelcontextprotocol/sdk (MCP server implementation)
**Storage**: Static JSON file cache (calendar-cache.json, fare-cache.json)
**Testing**: Bun test framework
**Target Platform**: MCP server (stdio transport) for Claude Desktop integration
**Project Type**: single (MCP server implementation)
**Performance Goals**: Sub-second calculation response time
**Constraints**: <200ms calculation time, maintain compatibility with existing MCP tools
**Scale/Scope**: Support calculation for any 30-day period, handle all month boundary scenarios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### PoC-First Simplicity ✅
- Direct implementation of calculation logic without abstraction layers
- Focus on happy path validation for cross-month scenarios
- Hardcoded test data acceptable for validation

### TypeScript + Bun Foundation ✅
- Pure TypeScript implementation for calculation logic
- Bun runtime with ES modules
- No additional framework dependencies

### MCP Protocol Compliance ✅
- Extends existing MCP server implementation
- Maintains compatible tool interface
- Request/response follows MCP JSON-RPC format

### Dual Integration ✅
- Core calculation logic remains shareable
- MCP server implementation maintains stdio transport
- Logic can be adapted for OpenAI Apps when needed

### Iterative Validation ✅
- Single demonstrable feature: cross-month calculation fix
- Can be tested independently via MCP tools
- Builds on existing working implementation

**Gate Status**: PASSED - No constitution violations

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
├── models/
│   └── tpass-calculation.ts     # Cross-month calculation data models
├── services/
│   ├── tpass-calculator.ts      # Main calculation service (new)
│   └── month-splitter.ts        # New service for month boundary logic
└── adapters/
    └── mcp/
        └── tools.ts              # MCP tool definitions (modified)

tests/
├── integration/
│   ├── cross-month.test.ts      # Cross-month scenario tests
│   └── performance.test.ts      # Performance benchmark tests
└── unit/
    ├── month-splitter.test.ts   # Month splitting logic tests
    ├── tpass-calculator.test.ts # Calculator unit tests
    └── discount-tiers.test.ts   # Discount tier validation tests
```

**Structure Decision**: Single project structure chosen as this is an enhancement to the existing MCP server. The feature adds new calculation logic to existing services without requiring separate frontend/backend separation.

**Implementation Notes**:
- Discount tier logic consolidated in `src/models/tpass-calculation.ts` (reuses existing `src/models/discount.ts`)
- MCP tools located at `src/adapters/mcp/tools.ts` (follows existing adapter pattern)
- Test suite expanded to 5 test files (38 total tests) exceeding original plan

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
