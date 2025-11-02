# Feature Specification: Cross-Month TPASS Calculation

**Feature Branch**: `004-cross-month-tpass`
**Created**: 2025-11-02
**Status**: Draft
**Input**: User description: "我想要處理計算捷運常客優惠在跨月的計算問題"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Calculate Cross-Month TPASS Fare (Priority: P1)

As a commuter, I want the TPASS calculator to correctly calculate my monthly pass cost when the 30-day period spans across two calendar months, applying the correct discount tiers based on each month's trip count separately.

**Why this priority**: This is the core functionality that fixes the current calculation inaccuracy, directly impacting the accuracy of cost estimates for users.

**Independent Test**: Can be fully tested by providing a start date near month-end, a fare amount, and working days count, then verifying the calculation splits costs correctly across months.

**Acceptance Scenarios**:

1. **Given** a start date of October 31 with 20 working days and fare of $35, **When** calculating 30-day TPASS cost, **Then** system splits calculation into October (1 day, 2 trips, no discount = $70) and November (19 days, 38 trips, 10% discount = $1197) for total $1267
2. **Given** a start date in mid-month with all 30 days in same month, **When** calculating TPASS cost, **Then** system applies single month discount tier to all trips
3. **Given** a start date crossing year boundary (December to January), **When** calculating TPASS cost, **Then** system correctly splits calculation across both months and resets discount tier for new year
4. **Given** a start date of February 28 (non-leap year), **When** calculating 30-day TPASS cost, **Then** system adds 30 calendar days (ending March 29), correctly splits at February-March boundary, and calculates working days per segment
5. **Given** a start date of February 29 (leap year), **When** calculating 30-day TPASS cost, **Then** system adds 30 calendar days (ending March 30), correctly handles leap year February, and splits calculation at month boundary

---

### User Story 2 - Display Monthly Breakdown (Priority: P2)

As a commuter, I want to see a detailed breakdown of costs per month when my pass period crosses month boundaries, so I understand exactly how my discount is calculated.

**Why this priority**: Transparency in calculation helps users understand and trust the pricing, reducing confusion about cross-month calculations.

**Independent Test**: Can be tested by verifying the output includes separate line items for each month showing trips, discount tier, and subtotal.

**Acceptance Scenarios**:

1. **Given** a cross-month calculation, **When** viewing results, **Then** system displays separate cost breakdowns for each month with trip counts and applied discounts
2. **Given** a single-month calculation, **When** viewing results, **Then** system displays simplified single-month breakdown

---

### User Story 3 - Validate Discount Tier Rules (Priority: P3)

As a commuter, I want the system to correctly apply TPASS discount tiers based on cumulative monthly trips, ensuring accurate discount percentages for each month.

**Why this priority**: Ensures compliance with actual TPASS discount structure and maintains calculation accuracy.

**Independent Test**: Can be tested by verifying correct discount tiers are applied based on trip counts (0-10 trips: 0%, 11-20: 5%, 21-40: 10%, 41+: 15%).

**Acceptance Scenarios**:

1. **Given** 38 trips in a month, **When** calculating discount, **Then** system applies 10% discount
2. **Given** 2 trips in a month, **When** calculating discount, **Then** system applies no discount (0%)
3. **Given** 15 trips in a month, **When** calculating discount, **Then** system applies 5% discount
4. **Given** 42 trips in a month, **When** calculating discount, **Then** system applies 15% discount

---

### Edge Cases

- What happens when the start date is February 28/29 (month-end with varying days)?
- How does system handle calculation when some months have no working days (e.g., Taiwan national holidays)? (Test coverage: T027 validates zero-trip month display with $0 cost)
- How does system handle leap years when crossing February?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST detect when a 30-day period crosses month boundaries by comparing year and month of start/end dates
- **FR-002**: System MUST calculate trips and costs separately for each calendar month within the 30-day period by:
  1. Splitting the 30-day period into monthly segments at month boundaries
  2. Calculating working days per segment using existing working day logic
  3. Calculating trips per segment (working days × 2)
  4. Calculating base cost per segment (trips × fare amount)
- **FR-003**: System MUST apply TPASS discount tiers independently to each month's cumulative trip count:
  - Discount applies to entire month's cost based on that month's trip count
  - Formula: `discounted_cost = base_cost × (1 - discount_rate)` where discount_rate is the percentage (e.g., 0.10 for 10% discount means pay 90% of base cost)
  - Discount rate determined by trip count thresholds (see FR-008)
  - Example: base_cost = NT$1000, discount_rate = 0.10 (10% discount) → discounted_cost = NT$1000 × (1 - 0.10) = NT$900
- **FR-004**: System MUST sum the individual monthly costs to produce the total 30-day pass cost:
  - Total = Sum of all monthly discounted costs
  - No additional discounts applied to the total
- **FR-005**: System MUST maintain existing working day calculation logic while splitting costs by month:
  - Use existing holiday calendar for Taiwan national holidays
  - Apply same weekend exclusion rules
  - Calculate working days independently for each monthly segment
- **FR-006**: System MUST handle year boundary crossings (December to January) correctly:
  - Treat December and January as separate months
  - Reset discount tier calculation for the new year's month
  - Ensure date calculations handle year increment properly
- **FR-007**: System MUST display breakdown of costs per month when period spans multiple months:
  - Show month name and year for each segment
  - Show working days, trips, discount tier percentage, base cost, discount amount, and final cost
  - Display total as sum of monthly final costs
- **FR-008**: System MUST correctly apply the TPASS discount tier structure (based on monthly cumulative trip count):
  - 0-10 trips: 0% discount (no rebate)
  - 11-20 trips: 5% discount
  - 21-40 trips: 10% discount
  - 41+ trips: 15% discount
  - Trip count boundaries are inclusive (e.g., 10 trips = 0%, 11 trips = 5%, 40 trips = 10%, 41 trips = 15%)
- **FR-009**: System SHOULD provide comparison with previous calculation method in cross-month scenarios:
  - Display total cost difference between corrected cross-month calculation and previous single-tier approach
  - Show percentage savings or additional cost for transparency
  - Comparison helps users understand the impact of the corrected calculation logic

### Key Entities

- **Trip Calculation**: Represents daily commute data including date, fare amount, and trip count (typically 2 per working day)
- **MonthlySegment**: Represents accumulated trips and costs for a single calendar month within the 30-day period (implemented as MonthlySegment interface)
- **DiscountTier**: Represents the discount percentage applied based on cumulative monthly trip count
- **CrossMonthCalculation**: Represents the full 30-day calculation period with start date, end date, and monthly breakdowns

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cross-month calculations produce accurate total costs matching manual month-by-month calculations 100% of the time
- **SC-002**: Users receive calculation results within 2 seconds of request submission
- **SC-003**: Monthly breakdown displays include all necessary information in a structured JSON format:
  - Structure: MCP tool response includes `monthly_breakdown` array of objects, each containing the fields below
  - Required fields per month: month name, year, date range, working days, trips, base fare, original cost, discount tier percentage, discount amount, final cost
  - Format validation: All monetary values displayed as "NT$X", percentages as "X%"
  - Acceptance: Integration tests verify all required fields present in MCP tool response JSON structure
- **SC-004**: System correctly handles all month boundary scenarios including year transitions without errors
- **SC-005**: Discount tier application accuracy is 100% based on monthly trip counts

## Scope & Boundaries *(mandatory)*

### In Scope
- Correcting cross-month TPASS calculation logic
- Splitting costs by calendar month
- Applying discount tiers per month
- Displaying monthly cost breakdowns
- Handling year boundary transitions

### Out of Scope
- Changing the existing working day calculation algorithm
- Modifying the TPASS discount tier percentages
- Adding new fare types or pass options
- Historical fare data management
- Integration with payment systems

## Assumptions *(mandatory)*

- Working day calculation logic (excluding weekends and Taiwan national holidays) remains unchanged
- Each working day consists of exactly 2 trips (round trip)
- Fare amount remains constant throughout the 30-day period
- The 30-day period is fixed and non-adjustable
- Discount tiers reset at the beginning of each calendar month
- Calculation logic is date-agnostic (works for past, present, and future dates equally; system accepts historical, current, and future date inputs)
- All monetary calculations use standard rounding (round to nearest integer, 0.5 rounds up) applied only to final monetary values displayed to user (NT$ amounts)
- Trip counts are always whole numbers (no fractional trips)
- Discounts apply to each month independently based on that month's trip count
- Monthly breakdown displays show month name, year, working days, trips, discount tier, and final cost
- Zero-trip months are displayed in breakdown with $0 cost
- Input validation: start date must be valid, fare amount must be positive, working days calculated from date range