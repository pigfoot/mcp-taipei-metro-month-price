# Implementation Plan: TPASS Calculator Enhancement

**Branch**: `001-tpass-calculator` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-tpass-calculator/spec.md`

**Note**: This plan addresses three enhancement issues: (a) auto-fetch on missing/expired cache, (b) cross-month data fetching, (c) detailed holiday information in responses.

## Summary

**Primary Requirement**: Enhance TPASS Calculator to automatically manage calendar data and provide detailed holiday information in responses.

**Technical Approach**:
- Auto-fetch calendar data when cache is missing or expired (30-day expiry)
- Multi-year calendar fetching for TPASS periods crossing month/year boundaries
- Enhanced response format including holiday names, dates, and working day exceptions
- Intelligent cache validation before every calculation

## Technical Context

**Language/Version**: TypeScript 5.x with Bun 1.x runtime
**Primary Dependencies**: @modelcontextprotocol/sdk (official MCP SDK)
**Storage**: Static JSON file cache (`data/calendar-cache.json`)
**Testing**: Bun test framework (already 18/18 tests passing)
**Target Platform**: MCP server (stdio transport) + OpenAI Apps SDK adapter
**Project Type**: Single project (CLI + MCP server)
**Performance Goals**: <100ms response time for cached calculations, <3s for fresh calendar fetch
**Constraints**: Offline-capable with 30-day cache validity, graceful fallback to cached data
**Scale/Scope**: PoC level - single user CLI tool with dual protocol support

**Enhancement Scope**:
- (a) Auto-fetch: Add cache validation to `CalendarService.initialize()`
- (b) Multi-year: Implement `ensureDataForPeriod()` for year-spanning TPASS periods
- (c) Holiday details: Extend response format with `holidayDetails` field containing holiday names/dates

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

✅ **No Constitution Violations**

This enhancement follows the existing project architecture:
- No new external dependencies required
- Builds on existing `CalendarService` and `CalendarFetcher`
- Follows established patterns for data fetching and caching
- Maintains backward compatibility with existing tests
- Enhances response format without breaking MCP protocol compliance

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
│   ├── calendar.ts          # CalendarEntry, CalendarData interfaces
│   └── fare.ts              # FareComparison interface (UPDATE: add holidayDetails)
├── services/
│   ├── calendar-fetcher.ts  # Already implements real API fetching
│   ├── calendar-service.ts  # UPDATE: add auto-fetch + multi-year support
│   └── fare-calculator.ts   # UPDATE: include holiday details in response
├── cli/
│   ├── calculator-cmd.ts    # UPDATE: display holiday information
│   └── calendar-cmd.ts      # Already supports manual cache updates
├── adapters/
│   ├── mcp/
│   │   └── server.ts        # UPDATE: return enhanced response format
│   └── openai/
│       └── app.ts           # UPDATE: return enhanced response format
└── lib/
    └── date-utils.ts        # Utility functions for date calculations

data/
└── calendar-cache.json      # UPDATE: metadata.yearsCovered tracking

tests/
├── unit/
│   ├── calendar-service.test.ts    # UPDATE: test auto-fetch logic
│   ├── fare-calculator.test.ts     # UPDATE: test holiday details in response
│   └── date-utils.test.ts
└── integration/
    ├── test-mcp-adapter.ts         # UPDATE: verify enhanced response
    └── test-openai-adapter.ts      # UPDATE: verify enhanced response
```

**Structure Decision**: Single project structure maintained. All enhancements build on existing files without adding new modules. Primary changes concentrated in:
1. `src/services/calendar-service.ts` - core auto-fetch logic
2. `src/services/fare-calculator.ts` - holiday details extraction
3. `src/models/fare.ts` - response format extension

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No complexity violations. This enhancement follows existing patterns and maintains project simplicity.

## Implementation Phases

### Phase 0: Research ✅ COMPLETED
- Analyzed auto-fetch requirements
- Researched multi-year calendar fetching strategies
- Designed enhanced response format with holiday details
- **Output**: `research.md` updated with technical decisions

### Phase 1: Design ✅ COMPLETED
- Extended `FareComparison` interface with `holidayDetails` field
- Defined `CalendarCacheMetadata` structure for multi-year tracking
- Documented validation rules and example responses
- **Output**: `data-model.md` updated with new interfaces

### Phase 2: Implementation (PENDING)
Will be executed via `/speckit.tasks` command to generate `tasks.md` with dependency-ordered implementation steps.

**Expected implementation areas**:
1. `CalendarService.initialize()` - auto-fetch logic
2. `CalendarService.ensureDataForPeriod()` - multi-year fetching
3. `FareCalculator.calculateTPASSComparison()` - extract holiday details
4. Update MCP and OpenAI adapters to return enhanced format
5. Update CLI output to display holiday information
6. Add tests for new functionality

## Dependencies

**External**: None (uses existing Taiwan government open data API)
**Internal**:
- `CalendarFetcher` - already implements real API fetching (completed in previous session)
- `CalendarService` - needs enhancement for auto-fetch and multi-year support
- Date utilities - may need helper functions for year range calculation

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API fetch fails during calculation | High | Graceful fallback to cached data + warning message |
| Cache expiry during offline period | Medium | 30-day validity period provides buffer |
| Multi-year fetch performance | Low | Fetch only missing years, cache all fetched data |
| Response format breaking changes | Medium | Add `holidayDetails` as optional field, maintain backward compatibility |
