# Implementation Plan: OpenAI App SDK Integration

**Branch**: `005-openai-app-sdk` | **Date**: 2025-11-04 | **Spec**: [link to spec.md]
**Input**: Feature specification from `/specs/005-openai-app-sdk/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable TPASS calculator service to support both MCP (Model Context Protocol) clients and OpenAI Apps SDK through user-agent based request routing. Key challenge: rapidly evolving OpenAI Apps SDK ecosystem requiring careful version management and compatibility strategy.

**Primary Approach**: Dual-protocol adapter pattern with user-agent detection and backward-compatible response formatting.

**Research Decision**: Adopt "no-opensai-sdk" strategy using standard HTTP/JSON to avoid rapidly changing library dependencies while maintaining OpenAI Apps compatibility.

## Technical Context

**Language/Version**: TypeScript 5.9.3
**Primary Dependencies**:
- @modelcontextprotocol/sdk v1.20.2 (stable)
- OpenAI Apps Functions Schema v1.0 (https://openai.com/apps/schema/functions.json)
- Bun 1.x runtime
**Storage**: Static JSON files (data/calendar-cache.json, data/fare-cache.json)
**Testing**: Bun test framework with integration tests
**Target Platform**: HTTP server with dual transport support (stdio MCP + HTTP OpenAI Apps)
**Project Type**: Single project with dual protocol support
**Performance Goals**: <3 second response time (matching existing MCP performance)
**Constraints**: No additional rate limiting, maintain backward compatibility, English-only
**Scale/Scope**: Support <100 station pairs, single-threaded execution acceptable

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Check Results**:
- ✅ **PoC-First Simplicity**: Adopts "no-opensai-sdk" strategy to avoid complex dependencies
- ✅ **TypeScript + Bun Foundation**: Uses TypeScript 5.9.3 with Bun 1.x runtime
- ✅ **MCP Protocol Compliance**: Maintains existing @modelcontextprotocol/sdk v1.20.2 usage
- ✅ **Dual Integration**: Supports both MCP and OpenAI Apps with shared calculation logic
- ✅ **Iterative Validation**: Features can be demonstrated independently

**No Violations Detected**: Plan follows all constitutional principles without requiring complexity justification.

### Post-Design Constitution Check
- ✅ **PoC-First Simplicity**: "No-OpenAI-SDK" strategy avoids complex dependencies
- ✅ **TypeScript + Bun Foundation**: Maintains existing stack with TypeScript 5.9.3 + Bun 1.x
- ✅ **MCP Protocol Compliance**: Preserves @modelcontextprotocol/sdk v1.20.2 usage
- ✅ **Dual Integration**: Clean adapter pattern for MCP + OpenAI Apps
- ✅ **Iterative Validation**: Each widget interaction step independently demonstrable

**Design Compliance**: All Phase 1 deliverables maintain constitutional adherence.

## Project Structure

### Documentation (this feature)

```text
specs/005-openai-app-sdk/
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
├── adapters/
│   ├── mcp/
│   │   ├── server.ts               # MCP stdio server (existing)
│   │   └── tools.ts                # MCP tool definitions (existing)
│   └── openai/
│       ├── app.ts                  # OpenAI Apps adapter (existing, to be enhanced)
│       └── functions.ts            # OpenAI function schemas (existing)
├── server/
│   ├── http-server.ts              # HTTP server with /mcp endpoint (existing)
│   ├── http-transport.ts           # MCP HTTP transport (existing)
│   └── health.ts                   # Health check endpoint (existing)
├── services/
│   ├── tpass-calculator.ts         # Core calculation logic (existing)
│   ├── calculator.ts               # High-level calculator (existing)
│   └── month-splitter.ts           # Cross-month logic (existing)
├── lib/
│   ├── utils.ts                    # Utility functions (existing)
│   └── types.ts                    # Type definitions (existing)
└── index.ts                        # Main entry point (existing)

tests/
├── unit/                           # Unit tests
├── integration/                    # Integration tests
└── contract/                       # Contract tests for API schemas
```

**Structure Decision**: Single project with dual protocol support via adapter pattern, extending existing MCP infrastructure with OpenAI Apps capabilities.

## Complexity Tracking

**No Complexity Violations**: This implementation adheres to constitutional principles without requiring additional justification. The "no-opensai-sdk" strategy actually reduces complexity compared to introducing new dependencies.

## Phase 2 Planning (Next Steps)

**Ready for Implementation**: All Phase 0 and Phase 1 deliverables complete.

**Implementation Readiness Checklist**:
- [x] Research findings documented
- [x] Technical approach validated
- [x] Data model defined
- [x] API contracts specified
- [x] Quickstart guide created
- [x] Constitution compliance verified
- [x] Agent context updated

**Next Command**: `/speckit.tasks` for detailed implementation task breakdown.
