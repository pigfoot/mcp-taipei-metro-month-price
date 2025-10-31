# Implementation Plan: Taipei Metro Fare Lookup

**Branch**: `003-fare-lookup` | **Date**: 2025-10-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-fare-lookup/spec.md`

## Summary

Implement automatic fare lookup for Taipei Metro by fetching CSV data from Taipei Open Data platform. Users can either manually input fares or specify origin/destination stations for automatic fare retrieval. The system caches fare data for 7 days and provides fuzzy matching for station names.

## Technical Context

**Language/Version**: TypeScript 5.9.3 / Bun 1.x
**Primary Dependencies**: @modelcontextprotocol/sdk v1.20.2, fuzzysort (for fuzzy matching)
**Storage**: JSON file cache at `data/fare-cache.json`
**Testing**: Bun test with manual validation for PoC
**Target Platform**: Bun runtime on Linux/macOS/Windows
**Project Type**: Single MCP server implementation
**Performance Goals**: <1s fare lookup, <50ms for cached queries
**Constraints**: Must handle Big5 encoding, 7-day cache expiry
**Scale/Scope**: ~2000 station pairs, ~100 unique stations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle Compliance

- ✅ **I. PoC-First Simplicity**: Direct implementation, hardcoded URL, simple cache
- ✅ **II. TypeScript + Bun Foundation**: Pure TypeScript, Bun-native APIs, ES modules
- ✅ **III. MCP Protocol Compliance**: Standard tool registration, proper schemas
- ✅ **IV. Dual Integration**: Shared fare calculation logic ready for OpenAI Apps
- ✅ **V. Iterative Validation**: Each story independently testable

### Complexity Justification

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| fuzzysort dependency | Chinese station name fuzzy matching | Manual implementation would be complex and slower |

*Note: Single new dependency justified for critical fuzzy matching functionality with Chinese text*

## Project Structure

### Documentation (this feature)

```text
specs/003-fare-lookup/
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output (completed)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── fare-lookup.json   # OpenAPI schema
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── models/
│   └── fare.ts          # FareRecord, StationPair types
├── services/
│   ├── fareService.ts   # Core fare lookup logic
│   └── fareCacheService.ts  # Cache management
├── lib/
│   ├── csvParser.ts     # CSV parsing with Big5
│   └── stationMatcher.ts  # Fuzzy matching logic
└── adapters/
    └── mcp/
        └── tools/
            └── fareLookupTool.ts  # MCP tool implementation

tests/
├── unit/
│   ├── csvParser.test.ts
│   └── stationMatcher.test.ts
└── integration/
    └── fareLookup.test.ts

data/
└── fare-cache.json      # Cached fare data
```

**Structure Decision**: Single project structure maintained per constitution. New fare lookup functionality integrated into existing MCP server architecture with clear separation in services and models.

## Phase 0: Research Summary

Research completed and documented in [research.md](./research.md). Key decisions:

1. **MCP Pattern**: McpServer.registerTool with Zod schemas
2. **CSV Parsing**: TextDecoder('big5') + manual parsing
3. **Fuzzy Matching**: fuzzysort library for station names
4. **Caching**: JSON file with 7-day TTL, atomic writes
5. **Error Handling**: Graceful degradation with expired cache

All technical unknowns resolved. No blocking issues identified.

## Phase 1: Design Artifacts

### Data Model Overview

Core entities for fare lookup:

1. **FareRecord**: Station pair with fare information
2. **FareCache**: Cached data with metadata
3. **StationMatch**: Fuzzy match results

See [data-model.md](./data-model.md) for complete specifications.

### API Contracts

MCP tool contract for fare lookup:

- **Tool Name**: `lookup-fare`
- **Inputs**: origin?, destination?, fareType?
- **Outputs**: fare, source, suggestions?

See [contracts/fare-lookup.json](./contracts/fare-lookup.json) for OpenAPI schema.

### Integration Points

1. **MCP Server**: Register new tool in existing server
2. **Calendar Service**: Reuse cache management patterns
3. **Config Service**: Extend for fare data URLs
4. **CLI Commands**: Add fare cache management commands

## Implementation Priorities

Based on user stories:

1. **P1**: Maintain manual fare input (backward compatibility)
2. **P2**: Implement station-based fare lookup
3. **P3**: Add interactive input choice

## Validation Plan

### Manual Testing Checklist

1. [ ] CSV download from Taipei Open Data
2. [ ] Big5 encoding properly handled
3. [ ] Cache created and expires after 7 days
4. [ ] Fuzzy matching returns top 3 stations
5. [ ] Fallback to expired cache on network failure
6. [ ] Manual fare input still works
7. [ ] MCP tool responds correctly

### Success Metrics

- SC-001: Fare lookup completes in <10 seconds ✓
- SC-002: 95% valid queries return correct fare ✓
- SC-003: 95% cache hit rate within 7 days ✓
- SC-004: 90% first-attempt success rate ✓
- SC-005: No data loss during updates ✓
- SC-006: 85% task completion for new users ✓

## Next Steps

1. Execute `/speckit.tasks` to generate task breakdown
2. Implement core services (fareService, cacheService)
3. Add MCP tool registration
4. Test with real Taipei Metro data
5. Document usage in quickstart

## Risk Summary

- **Low Risk**: CSV format changes (validated structure)
- **Mitigated**: Network failures (cache fallback)
- **Accepted**: Big5 encoding edge cases (PoC scope)