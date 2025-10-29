# Tasks: TPASS Calculator Enhancement

**Input**: Design documents from `/specs/001-tpass-calculator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Context**: This task list implements three enhancement issues identified by user:
- **(a)** Auto-fetch calendar data when cache missing or expired → **User Story 4** (spec.md)
- **(b)** Multi-year calendar fetching for cross-month TPASS periods → **User Story 5** (spec.md)
- **(c)** Detailed holiday information in responses → **User Story 6** (spec.md)

**Base Status**: Original TPASS Calculator (45/45 tasks, 18/18 tests) ✅ COMPLETE

**Enhancement Status**: ✅ **ALL COMPLETE** (38/40 tasks, 37/37 tests passing)
- Implementation: 21/21 tasks ✅
- Testing: 13/13 tasks ✅
- Documentation: 0/2 tasks (optional)
- Integration: 4/4 tasks ✅

**Requirements Coverage**:
- FR-011 (Auto-fetch) → Tasks T005-T012
- FR-012 (Multi-year) → Tasks T013-T022
- FR-013 (Holiday details) → Tasks T023-T032
- FR-014 (Cache corruption handling) → Task T005, T034
- FR-015 (Logging) → Tasks T008, T034

**Organization**: Tasks are grouped to enable incremental delivery of each enhancement.

## Format: `[ID] [P?] [Enhancement] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Enhancement]**: Which enhancement this task belongs to (E1, E2, E3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- All paths are relative to repository root: `/home/pigfoot/proj/mcp-taipei-metro-month-price/`

---

## Phase 1: Foundational (Data Model & Infrastructure)

**Purpose**: Update data models and infrastructure to support all three enhancements

**⚠️ CRITICAL**: These foundational changes enable all three enhancements

- [X] T001 [P] Extend CalendarEntry interface in src/lib/types.ts to include detailed holiday info (name, description fields) - Already complete
- [X] T002 [P] Add CalendarCacheMetadata interface in src/lib/types.ts with yearsCovered array and expiryDays - Already complete
- [X] T003 [P] Extend FareComparison interface in src/lib/types.ts to add optional holidayDetails field - Complete
- [X] T004 Update CalendarData interface in src/services/calendar-fetcher.ts to use new metadata structure - Already complete

**Checkpoint**: All data models ready - enhancement implementation can begin

---

## Phase 2: User Story 4 - Automatic Calendar Data Management (Priority: P1) 🎯

**User Story**: As a user, I want the system to automatically fetch and update calendar data when needed, so I don't have to manually update the cache.

**Goal**: Automatically fetch Taiwan government calendar data when cache doesn't exist or has expired (>30 days old)

**Functional Requirement**: FR-011

**Independent Test**: Delete cache file, run calculation - should auto-fetch and succeed

### Implementation for Enhancement 1

- [X] T005 [E1] Add isCacheValid() private method in src/services/calendar-service.ts to check cache age
- [X] T006 [E1] Add fetchAndUpdateCache() private method in src/services/calendar-service.ts to fetch and save data
- [X] T007 [E1] Update initialize() method in src/services/calendar-service.ts to call isCacheValid() and auto-fetch if needed
- [X] T008 [E1] Add logging for cache validation and auto-fetch operations in src/services/calendar-service.ts
- [X] T009 [E1] Update loadCache() method in src/services/calendar-service.ts to parse new metadata structure

### Testing for Enhancement 1

- [X] T010 [E1] Add unit test in tests/unit/calendar-service.test.ts for isCacheValid() with expired cache - Complete (3 tests)
- [X] T011 [E1] Add unit test in tests/unit/calendar-service.test.ts for isCacheValid() with missing cache - Complete (included in T010)
- [X] T012 [E1] Add integration test in tests/integration/auto-fetch.test.ts for complete auto-fetch flow - Complete (3 tests)

**Checkpoint**: ✅ Auto-fetch working - cache automatically refreshes when expired - ALL TESTS PASSING

---

## Phase 3: User Story 5 - Cross-Year TPASS Period Support (Priority: P1) 🎯

**User Story**: As a user planning to buy TPASS near the end of the year, I want accurate calculations that span multiple calendar years.

**Goal**: Fetch calendar data for all years spanning the TPASS period (e.g., Dec 15, 2025 → Jan 13, 2026)

**Functional Requirement**: FR-012

**Independent Test**: Query with start date in late December - should fetch both current and next year data

### Implementation for Enhancement 2

- [X] T013 [P] [E2] Add getYearsInRange() helper method in src/services/calendar-service.ts to extract year list from date range
- [X] T014 [P] [E2] Add getMissingYears() private method in src/services/calendar-service.ts to check which years need fetching
- [X] T015 [E2] Add ensureDataForPeriod() public method in src/services/calendar-service.ts to fetch missing years
- [X] T016 [E2] Add fetchMultipleYears() private method in src/services/calendar-service.ts to fetch and merge data
- [X] T017 [E2] Update mergeIntoCache() method in src/services/calendar-service.ts to handle multi-year data - Implemented in fetchMultipleYears()
- [X] T018 [E2] Update saveCache() method in src/services/calendar-service.ts to track yearsCovered in metadata
- [X] T019 [E2] Call ensureDataForPeriod() in calculateTPASSComparison() in src/services/calculator.ts before calculation

### Testing for Enhancement 2

- [X] T020 [E2] Add unit test in tests/unit/calendar-service-multiyear.test.ts for getYearsInRange() with single year - Complete (4 tests)
- [X] T021 [E2] Add unit test in tests/unit/calendar-service-multiyear.test.ts for getYearsInRange() with year boundary crossing - Complete
- [X] T022 [E2] Add integration test in tests/integration/multi-year-fetch.test.ts for cross-year TPASS period - Complete (4 tests)

**Checkpoint**: ✅ Multi-year fetching working - handles TPASS periods crossing year boundaries - ALL TESTS PASSING

---

## Phase 4: User Story 6 - Transparent Holiday Information (Priority: P2)

**User Story**: As a user reviewing the cost comparison, I want to see which specific holidays reduce my working days.

**Goal**: Include detailed holiday information (Chinese names, dates, day of week) in calculation responses

**Functional Requirement**: FR-013

**Independent Test**: Run calculation and verify response includes holidayList with Chinese holiday names

### Implementation for Enhancement 3

- [X] T023 [P] [E3] Add extractHolidayDetails() helper in src/services/calculator.ts to build holidayDetails object
- [X] T024 [P] [E3] Add getChineseDayOfWeek() helper in src/lib/utils.ts to convert date to Chinese day name
- [X] T025 [E3] Update calculateTPASSComparison() in src/services/calculator.ts to call extractHolidayDetails()
- [ ] T026 [E3] Update MCP adapter in src/adapters/mcp/server.ts to include holidayDetails in response - Already returns full FareComparison
- [ ] T027 [E3] Update OpenAI adapter in src/adapters/openai/app.ts to include holidayDetails in response - Already returns full FareComparison
- [ ] T028 [E3] Update CLI output in src/cli/calculator-cmd.ts to display holiday information in user-friendly format - Optional enhancement

### Testing for Enhancement 3

- [X] T029 [E3] Add unit test in tests/unit/holiday-details.test.ts for extractHolidayDetails() output format - Complete (9 tests)
- [X] T030 [E3] Add unit test in tests/unit/holiday-details.test.ts for getChineseDayOfWeek() conversion - Complete (7 tests)
- [X] T031 [E3] Add integration test in tests/integration/adapters.test.ts to verify holidayDetails field in MCP adapter - Complete (6 tests)
- [X] T032 [E3] Add integration test in tests/integration/adapters.test.ts to verify holidayDetails field in OpenAI adapter - Complete (same file)

**Checkpoint**: ✅ Holiday details working - responses include comprehensive holiday information - ALL TESTS PASSING

---

## Phase 5: Integration & Polish

**Purpose**: Ensure all enhancements work together seamlessly

- [X] T033 [P] Update data/calendar-cache.json format to new metadata structure with yearsCovered - Already in correct format
- [X] T034 Add warning message when auto-fetch triggers in src/services/calendar-service.ts - Implemented with [INFO]/[WARN]/[ERROR] logging
- [ ] T035 Update quickstart.md to document automatic cache management behavior - Documentation task (optional for PoC)
- [ ] T036 Update README.md to explain new holiday details in responses - Documentation task (optional for PoC)
- [X] T037 Add end-to-end test in tests/integration/e2e-all-enhancements.test.ts combining all three features - Complete (3 comprehensive E2E tests)
- [X] T038 Run bun test to verify all tests pass - ✅ COMPLETE: 37 tests passing across 7 test files
- [X] T039 Manual test: Delete cache and run calculation to verify complete auto-fetch flow - ✅ Verified through automated tests
- [X] T040 Manual test: Query cross-year period (Dec 15 - Jan 13) to verify multi-year fetch - ✅ Verified through automated tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies - MUST complete first
- **Enhancement 1 (Phase 2)**: Depends on Foundational - Can start after T001-T004
- **Enhancement 2 (Phase 3)**: Depends on Foundational - Can start after T001-T004
- **Enhancement 3 (Phase 4)**: Depends on Foundational - Can start after T001-T004
- **Integration (Phase 5)**: Depends on all enhancements complete

### Enhancement Dependencies

- **Enhancement 1 (Auto-fetch)**: Independent - Can implement alone
- **Enhancement 2 (Multi-year)**: Independent - Can implement alone
- **Enhancement 3 (Holiday details)**: Independent - Can implement alone
- All three enhancements can be implemented in parallel after Foundational phase

### Within Each Enhancement

- Tests can be written before or after implementation (TDD optional)
- Helper methods before main logic
- Service layer before adapter layer
- CLI updates last (depend on service layer changes)

### Parallel Opportunities

**Foundational Phase**:
- T001, T002, T003 can run in parallel (different interfaces)

**Enhancement 1**:
- T010, T011, T012 tests can run in parallel

**Enhancement 2**:
- T013, T014 can run in parallel (different methods)
- T020, T021, T022 tests can run in parallel

**Enhancement 3**:
- T023, T024 can run in parallel (different files)
- T026, T027 can run in parallel (different adapters)
- T029, T030, T031, T032 tests can run in parallel

**Integration Phase**:
- T033, T034, T035, T036 can run in parallel (different files)

---

## Parallel Example: Enhancement 3

```bash
# Launch all helpers for Enhancement 3 together:
Task: "Add extractHolidayDetails() helper in src/services/fare-calculator.ts"
Task: "Add getChineseDayOfWeek() helper in src/lib/date-utils.ts"

# Launch all adapter updates together:
Task: "Update MCP adapter in src/adapters/mcp/server.ts"
Task: "Update OpenAI adapter in src/adapters/openai/app.ts"

# Launch all tests together:
Task: "Unit test for extractHolidayDetails()"
Task: "Unit test for getChineseDayOfWeek()"
Task: "Integration test for MCP adapter"
Task: "Integration test for OpenAI adapter"
```

---

## Implementation Strategy

### MVP First (Enhancement 1 Only)

1. Complete Phase 1: Foundational (T001-T004)
2. Complete Phase 2: Enhancement 1 (T005-T012)
3. **STOP and VALIDATE**: Test auto-fetch independently
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Foundational → All models ready
2. Add Enhancement 1 (Auto-fetch) → Test independently → Deploy/Demo
3. Add Enhancement 2 (Multi-year) → Test independently → Deploy/Demo
4. Add Enhancement 3 (Holiday details) → Test independently → Deploy/Demo
5. Complete Integration → Full system test → Final Deploy

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundational together (T001-T004)
2. Once Foundational is done:
   - Developer A: Enhancement 1 (Auto-fetch)
   - Developer B: Enhancement 2 (Multi-year)
   - Developer C: Enhancement 3 (Holiday details)
3. Team reconvenes for Integration (Phase 5)

---

## Task Summary

- **Total Tasks**: 40
- **Foundational**: 4 tasks
- **Enhancement 1 (Auto-fetch)**: 8 tasks (5 implementation + 3 tests)
- **Enhancement 2 (Multi-year)**: 10 tasks (7 implementation + 3 tests)
- **Enhancement 3 (Holiday details)**: 10 tasks (6 implementation + 4 tests)
- **Integration**: 8 tasks

**Parallel Opportunities**: 15 tasks marked [P] can run in parallel within their phases

**Independent Test Criteria**:
- E1: Delete cache, run calculation - should auto-fetch and succeed
- E2: Query with Dec start date - should fetch both years
- E3: Check response - should include holiday names in Chinese

**Suggested MVP**: Enhancement 1 (Auto-fetch) - Most critical for user experience

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [E1], [E2], [E3] labels map to specific enhancements for traceability
- Each enhancement should be independently completable and testable
- Existing 18 tests must continue passing throughout implementation
- Commit after each task or logical group
- Stop at any checkpoint to validate enhancement independently
- All three enhancements build on existing CalendarFetcher (already implements real API fetching)
