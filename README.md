# TPASS Calculator

Taipei Metro monthly pass (TPASS) cost comparison tool - MCP server implementation.

## Overview

This tool helps Taipei Metro commuters decide whether to purchase a TPASS monthly pass (NT$1,200 for 30 consecutive days) or use the regular fare with frequent rider discount program (5%-15% based on trip count).

## Features

- **Cost Comparison**: Calculate TPASS vs regular fare with automatic discount tier application
- **Smart Recommendations**: Get personalized recommendations based on your commute pattern
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
- `calculate_fare`: Calculate TPASS vs regular fare comparison
- `get_discount_info`: Get discount tier information

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

- **One-way fare**: NT$40
- **Trips per day**: 2 (round trip)
- **TPASS price**: NT$1,200
- **TPASS validity**: 30 consecutive days

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

## Development

### Project Structure

```
src/
├── adapters/         # Protocol adapters (MCP, OpenAI Apps)
│   ├── mcp/         # MCP server and tool definitions
│   └── openai/      # OpenAI Apps SDK adapter
├── cli/             # CLI commands
├── lib/             # Utilities and type definitions
├── models/          # Domain models (TPASS, discount, calendar)
├── services/        # Business logic services
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

### Manual Testing

```bash
# Run comprehensive test suite
bun run tests/manual/test-calculator.ts
```

## Technical Details

- **Language**: TypeScript
- **Runtime**: Bun
- **Architecture**: Layered architecture with adapters pattern
- **Calendar Data**: Taiwan government holiday calendar (2025)
- **MCP SDK**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)

## Limitations (PoC)

This is a proof-of-concept implementation with the following limitations:

1. **Manual calendar updates**: Calendar data must be updated manually in `data/calendar-cache.json`
2. **Single year coverage**: Currently covers 2025 only
3. **No automated tests**: Manual validation only
4. **Simplified error handling**: Basic error reporting

For production use, consider:
- Automated calendar API fetching
- Multi-year calendar coverage
- Comprehensive test suite
- Enhanced error handling and logging
- Performance optimization

## License

MIT

## Support

For issues, questions, or contributions, please refer to the repository issue tracker.
