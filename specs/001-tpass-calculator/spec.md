# Feature Specification: TPASS Calculator

**Feature Branch**: `001-tpass-calculator`
**Created**: 2025-10-28
**Status**: Draft
**Input**: User description: "先做個核心的部份, 來計算是否應該要買月票 TPASS..."

## Clarifications

### Session 2025-10-28

- Q: 當 TPASS 30 天期間跨越兩個日曆月份時，常客優惠折扣如何計算？ → A: 分別計算每個月份的折扣再按比例合併
- Q: 當政府行事曆資料無法取得時，系統應該如何處理？ → A: 使用快取的歷史資料
- Q: 當使用者選擇過去的日期作為 TPASS 開始日期時，系統應該如何處理？ → A: 允許計算但顯示警告提示
- Q: 系統應該使用什麼預設的單程票價金額？ → A: NT$40
- Q: 當使用者沒有指定每個工作日的搭乘次數時，系統應該預設為幾次？ → A: 2 次（往返）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Calculate TPASS vs Regular Fare Recommendation (Priority: P1)

As a daily commuter, I want to compare the cost of purchasing a TPASS monthly pass versus using the regular Taipei Metro frequent rider discount program, so I can make an informed decision about which option saves me the most money.

**Why this priority**: This is the core value proposition of the entire feature - helping users save money on transportation costs.

**Independent Test**: Can be fully tested by providing a start date, fare amount, and receiving a cost comparison with a clear recommendation.

**Acceptance Scenarios**:

1. **Given** I select October 28, 2025 as the start date and enter a one-way fare of NT$40, **When** the system calculates 22 working days in the 30-day period, **Then** it should show TPASS costs NT$1,200 and regular fare with 15% discount (44 trips) costs NT$1,496, recommending TPASS purchase
2. **Given** I select a date with only 15 working days in the next 30 days and enter a one-way fare of NT$40, **When** the system calculates costs, **Then** it should show TPASS costs NT$1,200 and regular fare with 10% discount (30 trips) costs NT$1,080, recommending NOT to purchase TPASS
3. **Given** I don't specify a date, **When** I use the calculator, **Then** it should default to today's date

---

### User Story 2 - View Frequent Rider Discount Tiers (Priority: P2)

As a user, I want to understand how the Taipei Metro frequent rider discount tiers work, so I can see how my trip count affects my discount percentage.

**Why this priority**: Users need transparency about the discount structure to trust the recommendations.

**Independent Test**: Can be tested by viewing discount information without performing any calculations.

**Acceptance Scenarios**:

1. **Given** I want to understand discount tiers, **When** I view the discount information, **Then** I should see: 11-20 trips = 5% off, 21-40 trips = 10% off, 41+ trips = 15% off
2. **Given** the discount resets monthly, **When** I view the rules, **Then** it should clearly indicate the discount period is calendar month-based (e.g., Oct 1-31)

---

### User Story 3 - Customize Commute Pattern (Priority: P2)

As a user with a non-standard commute pattern, I want to adjust the calculation parameters, so the recommendation matches my actual usage.

**Why this priority**: Not all users have standard Mon-Fri commutes; flexibility improves accuracy for diverse user needs.

**Independent Test**: Can be tested by modifying default parameters and seeing updated calculations.

**Acceptance Scenarios**:

1. **Given** I work part-time, **When** I override the working days count, **Then** the calculation should use my custom value instead of the government calendar
2. **Given** I make multiple trips per day, **When** I specify trips per working day, **Then** the calculation should multiply accordingly
3. **Given** my one-way fare differs from the default, **When** I enter a custom fare amount, **Then** all calculations should use my specified fare

### User Story 4 - Automatic Calendar Data Management (Priority: P1) 🎯 Enhancement

As a user, I want the system to automatically fetch and update calendar data when needed, so I don't have to manually update the cache or worry about stale holiday information.

**Why this priority**: Eliminates manual maintenance burden and ensures calculations always use current government holiday data.

**Independent Test**: Delete calendar cache file, run calculation - system should auto-fetch data and complete successfully without user intervention.

**Acceptance Scenarios**:

1. **Given** the calendar cache doesn't exist, **When** I run a calculation, **Then** the system should automatically fetch government calendar data, cache it, and complete the calculation
2. **Given** the calendar cache is older than 30 days, **When** I initialize the calculator, **Then** the system should detect the expired cache and automatically fetch fresh data
3. **Given** the auto-fetch process completes, **When** viewing the output, **Then** I should see an informational message indicating fresh data was fetched

---

### User Story 5 - Cross-Year TPASS Period Support (Priority: P1) 🎯 Enhancement

As a user planning to buy TPASS near the end of the year, I want accurate calculations that span multiple calendar years, so I can make informed decisions for cross-year travel periods.

**Why this priority**: TPASS periods don't align with calendar years - a Dec 15 purchase spans into January, requiring data from both years.

**Independent Test**: Query with start date Dec 15 - system should fetch and use calendar data from both current year and next year.

**Acceptance Scenarios**:

1. **Given** I select December 15 as start date, **When** the system calculates the 30-day period, **Then** it should fetch calendar data for both December (current year) and January (next year)
2. **Given** the cache contains only current year data, **When** I query a cross-year period, **Then** the system should detect missing year data and fetch it automatically
3. **Given** a TPASS period spans two years, **When** viewing calculation details, **Then** working days should be accurately counted across both years

---

### User Story 6 - Transparent Holiday Information (Priority: P2) Enhancement

As a user reviewing the cost comparison, I want to see which specific holidays reduce my working days, so I can understand why the recommendation differs from my expectations.

**Why this priority**: Transparency builds trust in recommendations - users need to understand why working day counts may be lower than expected.

**Independent Test**: Run calculation and verify response includes a list of holidays with Chinese names and dates.

**Acceptance Scenarios**:

1. **Given** I run a calculation that includes national holidays, **When** viewing the results, **Then** I should see a list of holidays with their Chinese names and dates
2. **Given** the TPASS period includes a makeup working day (補行上班), **When** viewing holiday details, **Then** the system should clearly identify which holiday it compensates for
3. **Given** holiday information is displayed, **When** reviewing each entry, **Then** I should see the day of week (一, 二, etc.) and whether it's a weekend

---

### Edge Cases

- What happens when the selected date is in the past? → Resolved: Allow calculation but display warning message
- How does the system handle national holidays that fall on weekdays?
- What if the government calendar data is unavailable? → Resolved: Use cached historical data as fallback
- How does the calculation handle partial months (e.g., starting mid-month)? → Resolved: Calculate each month's discount separately then combine proportionally
- What if the calendar cache is corrupted or malformed? → Enhancement: Fall back to fresh fetch if cache JSON parsing fails
- How many years of calendar data should be fetched? → Enhancement: Fetch only years within the TPASS 30-day period (maximum 2 years)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate the total cost of using TPASS for a 30-day period starting from a selected date (fixed at NT$1,200)
- **FR-002**: System MUST calculate the total cost using Taipei Metro frequent rider discounts based on trip count within the calendar month (when TPASS period spans multiple months, calculate each month's discount separately then combine proportionally)
- **FR-003**: System MUST determine working days within the 30-day TPASS period using Taiwan government office calendar (fallback to cached historical data if current data unavailable)
- **FR-004**: System MUST apply correct discount tiers: 5% (11-20 trips), 10% (21-40 trips), 15% (41+ trips)
- **FR-005**: System MUST provide a clear recommendation on whether to purchase TPASS based on cost comparison
- **FR-006**: System MUST default to current date if no date is specified by user (allow past dates with warning message)
- **FR-007**: System MUST allow users to input custom one-way fare amount (default: NT$40)
- **FR-008**: System MUST display both cost calculations transparently (TPASS vs frequent rider program)
- **FR-009**: System MUST calculate round-trip costs automatically (one-way fare × 2)
- **FR-010**: System MUST count trips correctly (default: 2 trips per working day for round-trip commute, customizable by user)

### Enhancement Functional Requirements

- **FR-011**: System MUST automatically fetch Taiwan government calendar data when cache is missing or older than 30 days (triggers once during CalendarService initialization, not per calculation)
- **FR-012**: System MUST fetch calendar data for all years spanning the TPASS 30-day period (maximum 2 years for cross-year periods like Dec 15 → Jan 13)
- **FR-013**: System MUST include detailed holiday information in calculation responses with Chinese holiday names, dates, day of week (一, 二, etc.), and identification of makeup working days (補行上班)
- **FR-014**: System MUST handle corrupted calendar cache gracefully by falling back to fresh data fetch if JSON parsing fails
- **FR-015**: System MUST log informational messages when auto-fetch triggers or when using cached data as fallback

### Key Entities *(include if feature involves data)*

- **TPASS**: Monthly pass with fixed price (NT$1,200) valid for 30 consecutive days from activation
- **Trip**: Single journey on Taipei Metro with associated fare
- **Discount Tier**: Percentage discount based on monthly trip count range
- **Working Day**: Government-designated working day from official calendar
- **Fare Comparison**: Result showing TPASS cost vs frequent rider program cost with recommendation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can receive cost comparison results within 2 seconds of providing input
- **SC-002**: 95% of users successfully complete their first calculation without assistance
- **SC-003**: Cost calculations are 100% accurate based on current fare rules and discount tiers
- **SC-004**: Users can make an informed decision with clear savings amount displayed (e.g., "Save NT$296 with TPASS")
- **SC-005**: System correctly identifies at least 95% of government holidays and working days
- **SC-006**: User satisfaction rating of 4+ out of 5 for helping make purchase decisions

## Assumptions

- Taiwan government office calendar data is accessible and regularly updated
- TPASS price remains fixed at NT$1,200 for the 30-day period
- Taipei Metro frequent rider discount tiers remain stable (5%, 10%, 15%)
- Users primarily commute on working days with round-trip patterns
- Discount calculation is based on calendar month boundaries (1st to last day)
- One-way fare amounts are consistent for a user's regular commute route

## Technical Specifications (Enhancement Clarifications)

### Auto-fetch Behavior (addresses U2)
- **Trigger Timing**: Auto-fetch executes **once** during `CalendarService.initialize()`, not on every calculation
- **Cache Validity**: Cache considered expired after 30 days from `metadata.lastUpdated` date
- **Performance**: First calculation after cache expiry may take 2-3 seconds for fetch; subsequent calculations use cached data

### Multi-year Fetch Limits (addresses U3)
- **Year Range**: System fetches only years within the TPASS 30-day period (maximum 2 consecutive years)
- **Example**: Oct 28, 2025 start date → fetches 2025 only. Dec 15, 2025 start date → fetches 2025 and 2026
- **Constraint**: Queries more than 2 years in the future will fetch required years but may encounter missing government data (API typically provides current year + next year only)

### Holiday Name Language (addresses U4)
- **Primary Language**: Chinese (Traditional) - target audience is Taiwan commuters
- **Encoding**: UTF-8 for Chinese characters (國慶日, 春節, etc.)
- **English Fallback**: Not required for PoC - acceptable limitation for Taiwan-focused project
- **Day of Week**: Displayed in Chinese (一, 二, 三, 四, 五, 六, 日)

### Cache Corruption Handling (addresses U5)
- **Detection**: JSON.parse() failure when loading cache indicates corruption
- **Recovery**: Automatic fallback to fresh data fetch from government API
- **Logging**: Warning message logged: "[WARN] Cache corrupted, fetching fresh data..."
- **User Impact**: Transparent recovery - calculation proceeds normally with slight delay

### Terminology Standards (addresses T1)
For consistency across all documentation and code:

- **"Taiwan government calendar data"**: Complete dataset including all working days and holidays from government source
- **"Calendar entry"** or **"Holiday entry"**: Individual record representing one date
- **"Working day"** (singular) or **"Working days"** (plural): Government-designated working day (not weekend or holiday)
- **"Calendar cache"**: Local JSON file storing fetched calendar data with metadata
- **"Auto-fetch"**: Automatic process of fetching fresh calendar data when cache is missing or expired
- **"Cross-year period"**: TPASS validity period spanning two calendar years (e.g., Dec 15, 2025 → Jan 13, 2026)