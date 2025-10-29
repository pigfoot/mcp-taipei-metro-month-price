# Research: TPASS Calculator Technical Decisions

**Date**: 2025-10-28
**Feature**: TPASS Calculator

## Phase 0 Research Outcomes

### 1. Taiwan Government Calendar API Access

**Decision**: Implement automatic calendar fetching with intelligent caching
**Rationale**:
- Fetch from government open data platform when available
- Cache to static JSON for offline usage and faster response
- **Automatic fetch on first query or cache expiration** (solves issue a)
- **Multi-year fetching for cross-month periods** (solves issue b)
- Automatic fallback to cached data when API unavailable
- PoC demonstrates real-world data integration capability

**Alternatives considered**:
- Manual updates only: Too limiting, doesn't demonstrate integration capability
- Real-time API only: No fallback when API unavailable
- Web scraping: Fragile, API/CSV preferred
- Single-year cache: Insufficient for TPASS periods crossing year boundaries

**New requirements addressed**:
1. **Auto-fetch on missing/expired cache**: CalendarService checks cache validity before every calculation
2. **Cross-month data fetching**: Fetch data for all years spanning the TPASS period
3. **Detailed holiday information in response**: Include holiday names and dates in calculation results

**Implementation approach**:
```typescript
// Enhanced Calendar Service with auto-fetch
class CalendarService {
  private static readonly CACHE_EXPIRY_DAYS = 30;
  private cache: Map<string, CalendarEntry> = new Map();
  private metadata: { lastUpdated: string; yearsCovered: number[] } | null = null;

  async initialize(): Promise<void> {
    const cacheValid = await this.isCacheValid();

    if (!cacheValid) {
      // Auto-fetch on missing or expired cache (issue a)
      console.log('Cache missing or expired, fetching fresh data...');
      await this.fetchAndUpdateCache();
    } else {
      await this.loadCache();
    }
  }

  private async isCacheValid(): Promise<boolean> {
    try {
      const cached = await Bun.file('data/calendar-cache.json').json();
      const lastUpdate = new Date(cached.metadata.lastUpdated);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));

      return daysSinceUpdate < CalendarService.CACHE_EXPIRY_DAYS;
    } catch {
      return false; // Cache doesn't exist
    }
  }

  async ensureDataForPeriod(startDate: Date, endDate: Date): Promise<void> {
    // Check if we have data for all required years (issue b)
    const requiredYears = this.getYearsInRange(startDate, endDate);
    const missingYears = requiredYears.filter(year =>
      !this.metadata?.yearsCovered.includes(year)
    );

    if (missingYears.length > 0) {
      console.log(`Fetching data for years: ${missingYears.join(', ')}`);
      await this.fetchMultipleYears(missingYears);
    }
  }

  private getYearsInRange(start: Date, end: Date): number[] {
    const years = new Set<number>();
    years.add(start.getFullYear());
    years.add(end.getFullYear());
    return Array.from(years);
  }

  private async fetchMultipleYears(years: number[]): Promise<void> {
    const fetcher = new CalendarFetcher();

    for (const year of years) {
      const data = await fetcher.fetchFromSource(year);
      this.mergeIntoCache(data);
    }

    await this.saveCache();
  }
}

// Enhanced Calendar Entry with detailed info
interface CalendarEntry {
  date: string; // YYYY-MM-DD
  isWorkingDay: boolean;
  isHoliday: boolean;
  name?: string; // Holiday name (issue c)
  description?: string; // Holiday description
}

// Enhanced response format (issue c)
interface FareComparisonResponse {
  // ... existing fields
  holidayDetails?: {
    totalHolidays: number;
    holidayList: Array<{
      date: string;
      name: string;
      dayOfWeek: string;
    }>;
  };
}
```

### 2. MCP SDK Integration

**Decision**: Use @modelcontextprotocol/sdk official package
**Rationale**:
- Official SDK ensures protocol compliance
- Provides TypeScript types out of the box
- Handles JSON-RPC protocol details

**Alternatives considered**:
- Custom implementation: Rejected due to unnecessary complexity
- Alternative MCP libraries: None found that are more suitable

**Implementation approach**:
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Initialize MCP server with stdio transport
const server = new Server({
  name: 'taipei-metro-tpass',
  version: '1.0.0'
});
```

### 3. OpenAI Apps SDK Integration

**Decision**: Prepare adapter pattern, defer actual integration
**Rationale**:
- OpenAI Apps SDK (2025) not yet available
- Adapter pattern allows future integration without refactoring core logic
- PoC can demonstrate MCP integration first

**Alternatives considered**:
- Wait for SDK release: Would delay PoC unnecessarily
- Mock implementation: Considered but adds no real value for PoC

**Implementation approach**:
```typescript
// Prepare adapter interface
interface CalculatorAdapter {
  calculateFare(params: CalculateParams): Promise<FareResult>;
  getDiscountInfo(): Promise<DiscountInfo>;
}

// MCP adapter implementation
class MCPAdapter implements CalculatorAdapter { /* ... */ }

// Future: OpenAI Apps adapter
class OpenAIAppsAdapter implements CalculatorAdapter { /* ... */ }
```

### 4. Calculation Algorithm

**Decision**: Simple procedural calculation with clear steps
**Rationale**:
- PoC prioritizes clarity over optimization
- Easy to debug and validate
- No complex state management needed

**Alternatives considered**:
- Object-oriented calculator class: Over-engineered for PoC
- Functional composition: Adds complexity without benefit

**Implementation approach**:
```typescript
function calculateTPASSComparison(
  startDate: Date,
  oneWayFare: number = 40,
  tripsPerDay: number = 2
): ComparisonResult {
  // Step 1: Calculate working days in 30-day period
  const workingDays = getWorkingDaysInPeriod(startDate, 30);

  // Step 2: Calculate total trips
  const totalTrips = workingDays * tripsPerDay;

  // Step 3: Determine discount tier
  const discountRate = getDiscountRate(totalTrips);

  // Step 4: Calculate costs
  const regularCost = oneWayFare * totalTrips * (1 - discountRate);
  const tpassCost = 1200;

  // Step 5: Make recommendation
  return {
    tpassCost,
    regularCost,
    savings: tpassCost - regularCost,
    recommendation: tpassCost < regularCost ? 'BUY_TPASS' : 'USE_REGULAR',
    workingDays,
    totalTrips,
    discountRate
  };
}
```

### 5. Cross-Month Calculation

**Decision**: Split calculation by calendar month boundaries
**Rationale**:
- Aligns with actual Metro discount reset cycle
- More accurate for users starting mid-month
- Matches clarification from spec

**Alternatives considered**:
- Single month calculation: Too simplistic, inaccurate
- Daily proration: Over-complicated for discount tiers

**Implementation approach**:
```typescript
function calculateCrossMonthDiscount(
  startDate: Date,
  endDate: Date,
  oneWayFare: number,
  tripsPerDay: number
): number {
  const months = splitDateRangeByMonth(startDate, endDate);
  let totalCost = 0;

  for (const month of months) {
    const workingDays = getWorkingDaysInPeriod(month.start, month.days);
    const trips = workingDays * tripsPerDay;
    const discount = getDiscountRate(trips);
    totalCost += oneWayFare * trips * (1 - discount);
  }

  return totalCost;
}
```

### 6. Error Handling Strategy

**Decision**: Return descriptive errors, use fallback for calendar
**Rationale**:
- PoC needs clear debugging information
- Calendar fallback ensures basic functionality
- No need for complex error recovery

**Alternatives considered**:
- Throw exceptions: Poor UX for MCP clients
- Silent failures: Makes debugging difficult

**Implementation approach**:
```typescript
type Result<T> = { success: true; data: T } | { success: false; error: string };

function calculateWithFallback(date: Date): Result<ComparisonResult> {
  try {
    // Try with calendar data
    return { success: true, data: calculate(date) };
  } catch (e) {
    // Fallback to weekday estimation
    console.warn('Using weekday estimation fallback');
    return { success: true, data: calculateWithWeekdayEstimate(date) };
  }
}
```

### 7. Government Calendar Data Sources

**Decision**: Use multiple fallback sources for calendar data
**Rationale**:
- Primary: 政府資料開放平臺 data.gov.tw APIs
- Secondary: 新北市資料開放平臺
- Tertiary: CSV download from 行政院人事行政總處
- Ensures data availability even if one source fails

**Implementation sources**:
```typescript
const DATA_SOURCES = {
  primary: {
    name: 'data.gov.tw',
    url: 'https://data.gov.tw/dataset/14718', // 行政機關辦公日曆表
    format: 'json'
  },
  secondary: {
    name: '新北市資料開放平臺',
    url: 'https://data.ntpc.gov.tw/api/datasets/308DCD75-6434-45BC-A95F-584DA4FED251/json',
    format: 'json'
  },
  fallback: {
    name: 'CSV download',
    url: 'https://www.dgpa.gov.tw/information?uid=2&pid=38',
    format: 'csv',
    note: 'Requires parsing and transformation'
  }
};
```

**Data update strategy**:
- Check for updates weekly (configurable)
- Cache valid for 30 days minimum
- Manual trigger available via CLI command
- Version tracking to detect changes

## Summary of Technical Stack

Based on research, the final technical decisions for PoC:

1. **Runtime**: Bun 1.x with TypeScript 5.x
2. **Dependencies**:
   - @modelcontextprotocol/sdk (required)
   - No other runtime dependencies (PoC simplicity)
3. **Data Storage**: Static JSON files in `data/` directory
4. **Architecture**: Simple service layer with adapter pattern
5. **Testing**: Manual testing scripts, no test framework
6. **Build**: Direct Bun execution, no bundling needed

All NEEDS CLARIFICATION items from Technical Context have been resolved.