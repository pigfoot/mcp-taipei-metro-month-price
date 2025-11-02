# Quickstart: Cross-Month TPASS Calculation

## Overview

This feature corrects the TPASS 30-day pass calculation to properly handle scenarios where the pass period spans multiple calendar months. The calculation now splits costs by month and applies discount tiers independently per month.

## Setup

### Prerequisites

- Bun 1.x installed
- TypeScript 5.x
- Existing MCP server implementation

### Installation

```bash
# Install dependencies
bun install

# Run tests to verify
bun test
```

## Usage Examples

### 1. Basic Cross-Month Calculation

Calculate TPASS cost for a period starting October 31st:

```typescript
import { calculateCrossMonthTPASSWithBreakdown } from './src/services/calculator.js';

const result = await calculateCrossMonthTPASSWithBreakdown({
  startDate: new Date(2024, 9, 31), // Oct 31, 2024
  oneWayFare: 35,
  tripsPerDay: 2,
  customWorkingDays: 20
});

console.log(result);
// Output:
// {
//   totalFinalCost: 1267,
//   segments: [
//     { monthName: 'October 2024', workingDays: 1, trips: 2, discountTier: '0%', finalCost: 70 },
//     { monthName: 'November 2024', workingDays: 19, trips: 38, discountTier: '10%', finalCost: 1197 }
//   ]
// }
```

### 2. CLI Usage

Using the CLI to calculate cross-month TPASS:

```bash
$ bun run calculate --date 2024-10-31 --fare 35 --custom-days 20
```

Output includes automatic monthly breakdown:
```
📊 MONTHLY BREAKDOWN (Cross-Month Calculation)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Month 1: October 2024
  Date Range: Oct 31 - Oct 31
  Working Days: 1
  Trips: 2
  Base Fare: NT$35
  Original Cost: NT$70
  Discount Tier: 0%
  Discount Amount: NT$0
  Final Cost: NT$70

Month 2: November 2024
  Date Range: Nov 1 - Nov 29
  Working Days: 19
  Trips: 38
  Base Fare: NT$35
  Original Cost: NT$1330
  Discount Tier: 10%
  Discount Amount: NT$133
  Final Cost: NT$1197

TOTALS:
  Original Cost: NT$1400
  Discount Amount: NT$133
  Final Cost: NT$1267
```

### 3. MCP Tool Usage

The MCP tool `calculate_fare` automatically handles cross-month calculations:

```json
{
  "tool": "calculate_fare",
  "arguments": {
    "start_date": "2024-10-31",
    "one_way_fare": 35,
    "trips_per_day": 2,
    "custom_working_days": 20
  }
}
```

Response includes monthly breakdown when period crosses month boundaries.

### 4. Testing Different Scenarios

```bash
# Single month (no boundary crossing)
bun run calculate --date 2024-11-05 --fare 35

# Year boundary crossing
bun run calculate --date 2024-12-20 --fare 35

# February with leap year
bun run calculate --date 2024-02-15 --fare 35
```

## Key Differences from Old Calculation

### Old Method (Incorrect)
- Calculates total trips for entire 30-day period
- Applies single discount tier to total
- Example: 40 trips = 10% discount on all 1400 TWD = 1260 TWD

### New Method (Correct)
- Splits calculation by calendar month
- Applies discount tiers per month independently
- Example:
  - October: 2 trips = 0% discount on 70 TWD = 70 TWD
  - November: 38 trips = 10% discount on 1330 TWD = 1197 TWD
  - Total: 1267 TWD

## Testing

### Unit Tests

```bash
# Run unit tests for the calculation logic
bun test tests/unit/tpass-calculator.test.ts
bun test tests/unit/month-splitter.test.ts
```

### Integration Tests

```bash
# Run cross-month scenario tests
bun test tests/integration/cross-month.test.ts
```

### Manual Testing via CLI

```bash
# Test cross-month calculation
bun run calculate --date 2024-10-31 --fare 35 --custom-days 20

# Test actual working days (no custom override)
bun run calculate --date 2024-10-31 --fare 35

# Test with test scripts
bun run test-cross-month.ts
bun run test-actual-days.ts
```

## Validation Checklist

- [ ] Cross-month calculations split correctly at month boundaries
- [ ] Discount tiers applied independently per month
- [ ] Year boundaries handled correctly (Dec → Jan)
- [ ] Leap years handled properly
- [ ] Single-month periods don't split unnecessarily
- [ ] Total cost equals sum of monthly costs
- [ ] Comparison with old method shows expected differences

## Common Edge Cases

1. **Month-end start dates**: Starting on the 29th, 30th, or 31st
2. **February calculations**: Both leap and non-leap years
3. **Year transitions**: December to January
4. **Single working day months**: Months with heavy holidays
5. **No working days**: Entire month is holidays/weekends

## Troubleshooting

### Issue: Incorrect discount tier applied

Check that trips are calculated per calendar month, not per arbitrary 30-day period.

### Issue: Year boundary not handled

Verify that the date splitting logic correctly increments the year when moving from December to January.

### Issue: Leap year February calculations

Ensure using JavaScript's built-in Date API which handles leap years automatically.

## Performance Considerations

- Calculation time: < 10ms for typical scenarios
- Memory usage: Minimal (< 1KB per calculation)
- Suitable for real-time calculation without caching

## Next Steps

1. Deploy updated MCP server with new calculation logic
2. Update client applications to use new tool
3. Monitor for edge cases in production
4. Consider adding calculation result caching for frequently requested date ranges