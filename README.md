# TPASS Calculator

Taipei Metro monthly pass (TPASS) cost comparison tool - MCP server implementation.

## Overview

This tool helps Taipei Metro commuters decide whether to purchase a TPASS monthly pass (NT$1,200 for 30 consecutive days) or use the regular fare with frequent rider discount program (5%-15% based on trip count).

## Features

- **Cost Comparison**: Calculate TPASS vs regular fare with automatic discount tier application
- **Smart Recommendations**: Get personalized recommendations based on your commute pattern
- **Fare Lookup**: Automatic fare lookup by station names or manual input
  - Fuzzy station name matching with suggestions
  - 17,000+ fare records from Taipei Open Data
  - Support for regular and discounted fares
  - 7-day intelligent caching
- **Cross-Month Support**: Handles TPASS periods spanning multiple calendar months
- **Flexible Parameters**: Customize fare, trips per day, and working days
- **Calendar Integration**: Uses Taiwan government holiday calendar for accurate working day calculations
- **Multiple Interfaces**: MCP server, CLI commands, and programmatic API

## Installation

### Prerequisites

- [Bun](https://bun.sh/) v1.0.0 or higher

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd mcp-taipei-metro-month-price

# Install dependencies
bun install

# Verify installation
bun run calculate --help
```

## Usage

### CLI Commands

#### Calculate TPASS Comparison

```bash
# Default calculation (today, NT$40 fare, 2 trips/day)
bun run calculate

# Custom date
bun run calculate --date 2025-02-01

# Custom fare and trips
bun run calculate --fare 50 --trips 4

# Override working days (useful for non-standard schedules)
bun run calculate --custom-days 20

# All options
bun run calculate --date 2025-02-01 --fare 50 --trips 3 --custom-days 18
```

#### View Discount Information

```bash
# Display frequent rider discount tiers and TPASS info
bun run discount
```

#### Fare Lookup

```bash
# Lookup fare between two stations
bun run fare:lookup -- --origin "台北車站" --destination "市政府"

# Lookup discounted fare
bun run fare:lookup -- --origin "台北車站" --destination "淡水" --fareType discounted

# Check fare cache status
bun run fare:status

# Update fare cache from Taipei Open Data
bun run fare:update
```

The fare lookup system:
- Downloads 17,000+ fare records from Taipei Open Data
- Supports Big5 encoding for Chinese station names
- Uses fuzzy matching to suggest similar station names
- Caches data for 7 days with automatic refresh
- Returns both regular and discounted fares

#### Calendar Management

```bash
# Show calendar cache status
bun run calendar:status

# View cached holiday data
bun run calendar:view

# Update calendar cache from government open data platform
bun run calendar:update

# Update calendar cache for a specific year
bun run calendar:update 2026
```

The calendar update command automatically:
- Fetches Taiwan government holiday calendar from open data sources
- Creates a backup of existing cache
- Updates `data/calendar-cache.json` with fresh data
- Supports years 2020-2030

### MCP Server

Start the MCP server for integration with AI assistants:

```bash
bun run mcp-server
```

Available MCP tools:
- `calculate_fare`: Calculate TPASS vs regular fare comparison (defaults to next working day)
- `get_discount_info`: Get discount tier information
- `lookup_fare`: Lookup fare by station names or validate manual fare input

### OpenAI Apps Integration

The project includes an adapter for OpenAI Apps SDK integration (future):

```typescript
import { handleOpenAIFunctionCall, getOpenAIFunctions } from './src/adapters/openai/app.js';

// Register functions with OpenAI Apps
const functions = getOpenAIFunctions();

// Handle function calls
const result = await handleOpenAIFunctionCall({
  name: 'calculateTPASSComparison',
  arguments: JSON.stringify({ oneWayFare: 50, tripsPerDay: 3 })
});
```

Available OpenAI functions:
- `calculateTPASSComparison`: Calculate and compare TPASS vs regular fare
- `getDiscountInformation`: Get discount program information

### Programmatic Usage

```typescript
import { calculateTPASSComparison } from './src/services/calculator.js';
import { parseDate } from './src/lib/utils.js';

const result = await calculateTPASSComparison({
  startDate: parseDate('2025-02-01'),
  oneWayFare: 50,
  tripsPerDay: 2,
  customWorkingDays: 20
});

console.log(result.recommendation); // 'BUY_TPASS' or 'USE_REGULAR'
console.log(result.savingsAmount); // Savings in NTD
```

## Configuration

Default settings in `src/config.ts`:

### TPASS Settings
- **One-way fare**: NT$40
- **Trips per day**: 2 (round trip)
- **TPASS price**: NT$1,200
- **TPASS validity**: 30 consecutive days

### Fare Lookup Settings
- **CSV URL**: Taipei Open Data Platform fare data
- **Cache file**: `data/fare-cache.json`
- **Cache TTL**: 7 days
- **Fuzzy match threshold**: 0.3
- **Max suggestions**: 3

### Validation Constraints

- Fare: 1-1000 NTD
- Trips per day: 1-10
- Custom working days: 0-30

## Frequent Rider Discount Program

Taipei Metro offers automatic discounts based on monthly trip count:

| Trip Count | Discount |
|------------|----------|
| 0-10       | 0%       |
| 11-20      | 5%       |
| 21-40      | 10%      |
| 41+        | 15%      |

Discounts reset on the 1st of each month.

## Examples

### Example 1: Regular Commuter

```bash
$ bun run calculate --fare 40 --trips 2
```

Output:
- 22 working days × 2 trips = 44 trips
- Regular fare: NT$1,760 → NT$1,496 (15% off)
- **Recommendation**: Buy TPASS (save NT$296)

### Example 2: Occasional User

```bash
$ bun run calculate --custom-days 10 --trips 2
```

Output:
- 10 working days × 2 trips = 20 trips
- Regular fare: NT$800 → NT$760 (5% off)
- **Recommendation**: Use regular fare (save NT$440)

### Example 3: Cross-Month Period

```bash
$ bun run calculate --date 2025-01-15
```

Output correctly splits the 30-day period between January and February, applying discounts separately for each month.

### Example 4: Fare Lookup with Station Names

```bash
$ bun run fare:lookup -- --origin "亞東醫院" --destination "科技大樓"
```

Output:
```
✓ Fare found:
  Route: 亞東醫院 → 科技大樓
  Fare: NT$35
  Type: regular
  Distance: 15.78 km
```

Then use the fare with TPASS calculation:
```bash
$ bun run calculate --fare 35 --trips 2
```

### Example 5: Fuzzy Station Name Matching

```bash
$ bun run fare:lookup -- --origin "台北" --destination "市府"
```

Output:
```
✗ Station names not found. Did you mean:

Origin suggestions for "台北":
  1. 台北車站 (confidence: 100%)
  2. 台北橋 (confidence: 100%)
  3. 台北小巨蛋 (confidence: 100%)

Destination suggestions for "市府":
  1. 市政府 (confidence: 100%)
```

## Development

### Project Structure

```
src/
├── adapters/         # Protocol adapters (MCP, OpenAI Apps)
│   ├── mcp/         # MCP server and tool definitions
│   └── openai/      # OpenAI Apps SDK adapter
├── cli/             # CLI commands
│   ├── calculate-cmd.ts    # TPASS calculation
│   ├── discount-cmd.ts     # Discount info
│   ├── calendar-cmd.ts     # Calendar management
│   └── fare-cmd.ts         # Fare lookup (NEW)
├── lib/             # Utilities and type definitions
│   ├── csvParser.ts        # Big5 CSV parser (NEW)
│   ├── stationMatcher.ts   # Fuzzy matching (NEW)
│   └── utils.ts            # Date/format utilities
├── models/          # Domain models
│   ├── tpass.ts            # TPASS model
│   ├── discount.ts         # Discount tiers
│   ├── calendar.ts         # Calendar model
│   └── fare.ts             # Fare models (NEW)
├── services/        # Business logic services
│   ├── calculator.ts       # TPASS calculation
│   ├── calendar-service.ts # Holiday calendar
│   ├── fareService.ts      # Fare lookup logic (NEW)
│   └── fareCacheService.ts # Fare cache management (NEW)
└── config.ts        # Configuration constants
```

### Development Commands

```bash
# Type checking
bun run type-check

# Linting
bun run lint

# Formatting
bun run format

# Build
bun run build
```

### Testing

#### Manual Testing

```bash
# Test TPASS calculator
bun run tests/manual/test-calculator.ts

# Test fare lookup with CLI
bun run fare:update
bun run fare:status
bun run fare:lookup -- --origin "台北車站" --destination "市政府"

# Test fuzzy matching
bun run fare:lookup -- --origin "台北" --destination "市府"
# Expected: Returns suggestions for matching stations
```

#### Automated Testing

```bash
# Run all tests
bun test

# Run specific test files
bun test tests/unit/calendar-service.test.ts
bun test tests/unit/calendar-service-multiyear.test.ts
```

#### Integration Testing

Test the complete workflow:

```bash
# 1. Setup: Download fare and calendar data
bun run fare:update
bun run calendar:update

# 2. Lookup fare for your commute route
bun run fare:lookup -- --origin "亞東醫院" --destination "科技大樓"
# Note the fare amount (e.g., 35 NTD)

# 3. Calculate TPASS comparison
bun run calculate --fare 35 --trips 2
# Should default to next working day with accurate holiday calendar

# 4. Verify MCP integration
bun run mcp-server
# Test with MCP client: lookup_fare then calculate_fare
```

#### Test Coverage

Current test coverage:
- ✅ Calendar service (unit tests)
- ✅ Multi-year calendar support (unit tests)
- ✅ Fare lookup (manual CLI tests)
- ✅ Fuzzy matching (manual tests)
- ✅ CSV parsing with Big5 encoding (integration tests)
- ✅ Cache management (integration tests)
- ⏳ Fare service unit tests (planned)
- ⏳ E2E MCP tool tests (planned)

## Technical Details

- **Language**: TypeScript 5.9.3
- **Runtime**: Bun 1.x
- **Architecture**: Layered architecture with adapters pattern
- **Calendar Data**: Taiwan government holiday calendar (auto-fetch)
- **Fare Data**: Taipei Open Data Platform (17,000+ records, 118 stations)
- **Dependencies**:
  - [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk) ^1.20.2 - MCP server implementation
  - [fuzzysort](https://github.com/farzher/fuzzysort) ^3.1.0 - Fast fuzzy matching for station names

## Recent Updates

### v1.1.0 - Fare Lookup Feature (2025-10-31)

- ✨ **New**: Automatic fare lookup by station names
- ✨ **New**: Fuzzy matching for station name suggestions
- ✨ **New**: Support for 17,000+ fare records from Taipei Open Data
- ✨ **New**: 7-day intelligent caching system
- ✨ **New**: Big5 encoding support for Chinese station names
- ✨ **New**: CLI commands: `fare:lookup`, `fare:status`, `fare:update`
- ✨ **New**: MCP tool: `lookup_fare`
- 🎯 **Enhanced**: Default start date now uses next working day (respects holidays)
- 📝 **Improved**: Better error messages with station suggestions

### Known Limitations

Current limitations:
1. **Fare service unit tests**: Planned but not yet implemented
2. **E2E MCP tests**: Integration testing is manual only
3. **Error recovery**: Basic error handling, could be enhanced

For production use, consider:
- Comprehensive automated test suite
- Enhanced error handling and logging
- Performance monitoring and optimization
- Rate limiting for API calls

## License

MIT

## Support

For issues, questions, or contributions, please refer to the repository issue tracker.
