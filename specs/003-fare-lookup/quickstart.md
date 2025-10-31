# Quickstart: Taipei Metro Fare Lookup

**Feature**: 003-fare-lookup
**Version**: 1.0.0

## Overview

The Fare Lookup feature allows users to get Taipei Metro fares either by manually inputting the fare or by specifying origin and destination stations. The system automatically downloads fare data from the Taipei Open Data platform and caches it for 7 days.

## Prerequisites

- Bun 1.x installed
- Network connection (for initial data download)
- MCP client (e.g., Claude Desktop)

## Installation

1. Install the new dependency:
```bash
bun add fuzzysort
```

2. Update package.json to include new CLI commands:
```json
{
  "scripts": {
    "fare:update": "bun run src/cli/fare-cmd.ts update",
    "fare:status": "bun run src/cli/fare-cmd.ts status",
    "fare:lookup": "bun run src/cli/fare-cmd.ts lookup"
  }
}
```

## Usage Examples

### 1. Using MCP Tool (Primary Interface)

#### Manual Fare Input
```json
{
  "tool": "lookup-fare",
  "arguments": {
    "fare": 30,
    "fareType": "regular"
  }
}
```

#### Station-Based Lookup
```json
{
  "tool": "lookup-fare",
  "arguments": {
    "origin": "台北車站",
    "destination": "市政府",
    "fareType": "regular"
  }
}
```

#### With Fuzzy Matching
```json
{
  "tool": "lookup-fare",
  "arguments": {
    "origin": "台北",
    "destination": "市府",
    "fareType": "discounted"
  }
}
```

### 2. Using CLI Commands

#### Update fare cache manually
```bash
bun run fare:update
# Output: Downloading fare data from Taipei Open Data...
#         Parsed 2156 fare records
#         Cache saved to data/fare-cache.json
```

#### Check cache status
```bash
bun run fare:status
# Output: Cache Status:
#         Last Updated: 2025-10-31T10:00:00Z
#         Expires: 2025-11-07T10:00:00Z
#         Records: 2156
#         Status: Valid
```

#### Direct fare lookup
```bash
bun run fare:lookup --origin "台北車站" --destination "市政府"
# Output: Fare from 台北車站 to 市政府:
#         Regular: NT$25
#         Discounted: NT$13
#         Distance: 5.2 km
```

### 3. Programmatic Usage

```typescript
import { FareService } from './services/fareService';

const fareService = new FareService();

// Initialize (downloads data if needed)
await fareService.initialize();

// Lookup fare
const result = await fareService.lookupFare({
  origin: '台北車站',
  destination: '市政府',
  fareType: 'regular'
});

console.log(`Fare: NT$${result.fare}`);
```

## Common Scenarios

### First-Time Setup

1. Start the MCP server:
```bash
bun run mcp-server
```

2. The system will automatically:
   - Download fare data on first request
   - Create cache at `data/fare-cache.json`
   - Use cached data for subsequent requests

### Handling Station Names

The system handles various station name formats:

- Full name: "台北車站"
- Without suffix: "台北"
- Common abbreviations: "北車"
- Fuzzy matching for typos

### Cache Management

- **Automatic refresh**: Cache refreshes after 7 days
- **Manual refresh**: Run `bun run fare:update`
- **Fallback**: Uses expired cache if network fails (with warning)

## Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| E001 | Network error | Check internet connection |
| E002 | CSV download failed | Try manual update later |
| E006 | Stations not found | Check station names |
| W001 | Using expired cache | System will auto-update |

## Testing

### Quick Test

```bash
# Test with sample stations
bun run fare:lookup --origin "台北車站" --destination "淡水"
```

### Fuzzy Matching Test

```bash
# Test fuzzy matching
bun run fare:lookup --origin "北車" --destination "101"
```

### Cache Expiry Test

```bash
# Modify cache file timestamp
# Then run lookup to test expired cache handling
```

## Troubleshooting

### Cache Issues

If cache is corrupted:
```bash
rm data/fare-cache.json
bun run fare:update
```

### Encoding Issues

If seeing garbled Chinese characters:
- Ensure terminal supports UTF-8
- Check file encoding is preserved

### Network Issues

If download fails:
- Check proxy settings
- Verify URL is accessible: https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=893c2f2a-dcfd-407b-b871-394a14105532

## Configuration

Add to `src/config.ts`:

```typescript
export const FARE_CONFIG = {
  csvUrl: 'https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=893c2f2a-dcfd-407b-b871-394a14105532',
  cacheFile: 'data/fare-cache.json',
  cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
  fuzzyThreshold: 0.3,
  maxSuggestions: 3
};
```

## API Integration

For OpenAI Apps integration (future):

```typescript
// Same logic, different adapter
app.post('/fare', async (req, res) => {
  const result = await fareService.lookupFare(req.body);
  res.json(result);
});
```

## Performance

Expected performance metrics:

- Initial download: ~1s
- Cache load: <10ms
- Fuzzy search: <5ms
- Total response: <50ms (cached)

## Next Steps

1. Monitor cache hit rates
2. Collect station name variations
3. Add route planning (future)
4. Support IC card discounts (future)