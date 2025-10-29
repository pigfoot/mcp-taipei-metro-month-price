# Quickstart: TPASS Calculator

**Feature**: TPASS Monthly Pass Calculator for Taipei Metro
**Version**: 1.0.0

## Overview

The TPASS Calculator helps commuters decide whether to purchase a TPASS monthly pass (NT$1,200 for 30 days) or use Taipei Metro's frequent rider discount program (5%-15% off based on monthly trip count).

## Prerequisites

- Bun 1.x runtime installed
- TypeScript 5.x
- MCP-compatible client (e.g., Claude Desktop) for testing MCP integration

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd mcp-taipei-metro-month-price

# Install dependencies
bun install

# Initialize calendar data
bun run setup
```

## Quick Start

### 1. Basic Calculation (Default Parameters)

```bash
# Run with defaults (today's date, NT$40 fare, 2 trips/day)
bun run calculate

# Expected output:
# TPASS Cost: NT$1,200
# Regular Cost: NT$1,496 (15% discount applied)
# Recommendation: BUY_TPASS
# You save: NT$296
```

### 2. Custom Parameters

```bash
# Specify custom start date and fare
bun run calculate --date "2025-11-01" --fare 35 --trips 2

# Or use the interactive mode
bun run calculate --interactive
```

### 3. MCP Server Mode

```bash
# Start as MCP server (for integration with AI assistants)
bun run mcp-server

# The server will run on stdio, waiting for MCP protocol commands
```

### 4. Testing with MCP Client

Configure your MCP client (e.g., Claude Desktop) with:

```json
{
  "mcpServers": {
    "taipei-metro-tpass": {
      "command": "bun",
      "args": ["run", "mcp-server"],
      "cwd": "/path/to/mcp-taipei-metro-month-price"
    }
  }
}
```

Then use the tools:
- `calculate_fare` - Calculate and compare costs
- `get_discount_info` - Get discount tier information

## API Examples

### TypeScript/JavaScript

```typescript
import { calculateTPASSComparison } from './src/services/calculator';

// Basic calculation
const result = await calculateTPASSComparison({
  startDate: new Date('2025-10-28'),
  oneWayFare: 40,
  tripsPerDay: 2
});

console.log(`Recommendation: ${result.recommendation}`);
console.log(`Save NT$${Math.abs(result.savingsAmount)}`);
```

### MCP Protocol Request

```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "calculate_fare",
    "arguments": {
      "startDate": "2025-10-28",
      "oneWayFare": 40,
      "tripsPerDay": 2
    }
  },
  "id": 1
}
```

### MCP Protocol Response

```json
{
  "jsonrpc": "2.0",
  "result": {
    "tpassCost": 1200,
    "regularCost": 1496,
    "savingsAmount": -296,
    "recommendation": "BUY_TPASS",
    "recommendationReason": "Save NT$296 with TPASS monthly pass",
    "details": {
      "workingDays": 22,
      "totalTrips": 44,
      "discountRate": 0.15,
      "discountTier": "41+ trips: 15% off"
    }
  },
  "id": 1
}
```

## Common Use Cases

### 1. Daily Commuter

```bash
# Standard Mon-Fri commuter, round trip
bun run calculate --fare 40 --trips 2
```

### 2. Part-Time Worker

```bash
# Works 3 days a week, custom working days
bun run calculate --fare 35 --custom-days 12
```

### 3. Multiple Trips Per Day

```bash
# Makes 4 trips per day (2 round trips)
bun run calculate --fare 25 --trips 4
```

### 4. Historical Analysis

```bash
# Check past month (shows warning for past date)
bun run calculate --date "2025-09-01"
```

## Configuration

### Calendar Data

The calculator automatically fetches and caches government holiday data. The system will:
1. Try to fetch fresh data from government open data platforms
2. Cache the data to `data/calendar-cache.json`
3. Use cached data when API is unavailable

To manually update calendar data:

```bash
# Fetch latest calendar data from government sources
bun run calendar:update

# Force refresh (ignore cache age)
bun run calendar:update --force

# Check cache status
bun run calendar:status

# View cached data
bun run calendar:view --year 2025
```

**Automatic Updates**:
- Calendar data is automatically fetched on first run
- Cache is refreshed if older than 30 days
- Fallback to cached data if fetch fails

### Default Values

Edit `src/config.ts` to change defaults:

```typescript
export const DEFAULT_CONFIG = {
  oneWayFare: 40,        // Default fare in NTD
  tripsPerDay: 2,        // Default trips per working day
  tpassPrice: 1200,      // TPASS monthly pass price
  tpassValidityDays: 30  // TPASS validity period
};
```

## Troubleshooting

### Issue: Calendar data not found

```bash
# Solution: Initialize calendar data
bun run setup
```

### Issue: MCP server not responding

```bash
# Check if server is running
ps aux | grep "bun.*mcp-server"

# Restart server
bun run mcp-server
```

### Issue: Incorrect working day calculation

```bash
# Verify calendar data
bun run verify-calendar --date "2025-10-28"

# Use custom working days as workaround
bun run calculate --custom-days 20
```

## Testing

### Manual Testing

```bash
# Run manual tests
bun test:manual

# Test specific scenarios
bun test:manual --scenario cross-month
bun test:manual --scenario past-date
bun test:manual --scenario high-fare
```

### MCP Integration Test

```bash
# Test MCP protocol compliance
bun test:mcp

# Test with mock MCP client
bun test:mcp --mock-client
```

## Project Structure

```
mcp-taipei-metro-month-price/
├── src/
│   ├── adapters/         # MCP and OpenAI adapters
│   ├── models/           # Data models
│   ├── services/         # Core calculation logic
│   └── lib/              # Utilities
├── data/
│   └── calendar-2025.json # Cached holiday data
├── specs/                # Feature specifications
└── tests/                # Test files
```

## Next Steps

1. **Customize for your commute**: Adjust default values in config
2. **Integrate with AI assistant**: Configure MCP client
3. **Add more stations**: Extend with actual station fare data
4. **Automate updates**: Set up calendar data auto-update

## Support

For issues or questions:
- Check the [spec documentation](./spec.md)
- Review the [implementation plan](./plan.md)
- See [data model](./data-model.md) for technical details