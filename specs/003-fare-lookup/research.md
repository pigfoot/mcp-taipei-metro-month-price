# Research Document: Taipei Metro Fare Lookup

**Feature**: 003-fare-lookup
**Date**: 2025-10-31
**Status**: Complete

## Executive Summary

Research conducted to resolve technical unknowns for implementing Taipei Metro fare lookup functionality. Key focus areas include MCP SDK patterns, CSV parsing with Big5 encoding, fuzzy string matching, and caching strategies.

## Research Findings

### 1. MCP Tool Implementation Pattern (v1.20.2)

**Decision**: Use McpServer with structured tool registration pattern
**Rationale**: Provides automatic schema validation, error handling, and notification support

**Key Patterns Identified**:
- Tool registration with input/output schemas using Zod
- Structured content responses for type safety
- Dynamic tool management (enable/disable/update) capability
- Support for both text and structured output

**Implementation Approach**:
```typescript
server.registerTool('lookup-fare', {
    title: 'Lookup Metro Fare',
    description: 'Get fare between two stations',
    inputSchema: {
        origin: z.string().optional(),
        destination: z.string().optional(),
        fareType: z.enum(['regular', 'discounted']).default('regular')
    },
    outputSchema: {
        fare: z.number(),
        source: z.enum(['cache', 'manual'])
    }
}, handler);
```

**Alternatives Considered**:
- Low-level Server API: More control but requires manual schema handling
- Direct JSON-RPC: Too low-level for this use case

### 2. CSV Parsing with Big5 Encoding

**Decision**: Use Bun's built-in fetch with TextDecoder for Big5
**Rationale**: Native Bun APIs are faster and avoid external dependencies

**Implementation Pattern**:
```typescript
const response = await fetch(CSV_URL);
const buffer = await response.arrayBuffer();
const decoder = new TextDecoder('big5');
const text = decoder.decode(buffer);
```

**CSV Parsing Strategy**:
- Manual parsing for simple CSV structure (avoid dependencies)
- Parse headers: _id, 起站, 訖站, 全票票價, 優惠票價, 距離
- Store in memory as Map for O(1) lookup

**Alternatives Considered**:
- csv-parse library: Unnecessary dependency for simple CSV
- iconv-lite: Not needed as TextDecoder supports Big5

### 3. Fuzzy String Matching

**Decision**: Use fuzzysort library (lightweight, TypeScript support)
**Rationale**:
- Fast performance (9.2 trust score)
- Simple API perfect for station name matching
- Minimal size (~8KB)
- Native TypeScript types

**Implementation Pattern**:
```typescript
import fuzzysort from 'fuzzysort';

const results = fuzzysort.go(userInput, stationNames, {
    threshold: 0.3,  // Minimum score
    limit: 3,         // Top 3 matches per spec
});
```

**Alternatives Considered**:
- Fuse.js: Heavier with more features we don't need
- Custom Levenshtein: More complex, slower
- Native string matching: Insufficient for Chinese characters

### 4. Caching Strategy

**Decision**: JSON file cache with 7-day TTL
**Rationale**: Follows existing calendar cache pattern, simple and reliable

**Cache Structure**:
```typescript
interface FareCache {
    version: string;
    lastUpdated: string;
    expiresAt: string;
    data: Map<string, FareRecord>;
}
```

**Cache Location**: `data/fare-cache.json` (consistent with calendar-cache.json)

**Cache Invalidation**:
- Check expiry on each request
- Fallback to expired cache if network fails (with warning)
- Atomic write to prevent corruption

**Alternatives Considered**:
- SQLite: Overkill for PoC
- In-memory only: Lost on restart
- Redis: External dependency

### 5. Station Name Handling

**Decision**: Normalize station names for matching
**Rationale**: Handle variations in input (e.g., "台北車站" vs "臺北車站")

**Normalization Rules**:
1. Traditional/Simplified Chinese conversion
2. Remove common suffixes (站, 車站)
3. Trim whitespace
4. Store both original and normalized for display

### 6. Error Handling Strategy

**Decision**: Graceful degradation with clear user feedback
**Rationale**: Maintain service availability even with partial failures

**Error Hierarchy**:
1. Network failure → Use expired cache → Warn user
2. No cache → Prompt manual input
3. Invalid stations → Show suggestions
4. Corrupted data → Re-download

### 7. Integration with Existing System

**Decision**: Create new MCP tool, reuse existing services
**Rationale**: Clean separation of concerns while leveraging existing infrastructure

**Integration Points**:
- Reuse CalendarService caching patterns
- Extend existing MCP server structure
- Share config management approach
- Consistent error response format

## Technology Stack Confirmation

Based on research and existing codebase:

- **Runtime**: Bun 1.x (confirmed)
- **Language**: TypeScript 5.9.3 (confirmed)
- **MCP SDK**: @modelcontextprotocol/sdk v1.20.2 (confirmed)
- **Fuzzy Matching**: fuzzysort (new dependency)
- **CSV Parsing**: Native implementation (no new dependency)
- **Encoding**: TextDecoder with Big5 (built-in)
- **Storage**: JSON file cache (pattern exists)

## Performance Considerations

**Expected Performance**:
- Initial CSV download: ~500ms
- Cache load: <10ms
- Fuzzy search: <5ms for 100 stations
- Total response: <50ms (cached), <1s (fresh download)

**Optimization Opportunities** (deferred for PoC):
- Pre-compute station pairs
- Index by station code
- Compress cache file

## Risk Mitigation

1. **API Changes**: Monitor CSV structure, add validation
2. **Encoding Issues**: Validate Big5 decoding, have UTF-8 fallback
3. **Large Dataset**: Current ~2000 station pairs manageable in memory
4. **Cache Corruption**: Atomic writes, validation on load

## Conclusion

All technical unknowns have been resolved. The implementation can proceed with:
1. Native Bun/TypeScript features for core functionality
2. Minimal new dependency (fuzzysort only)
3. Patterns consistent with existing codebase
4. Clear fallback strategies for failures

The approach aligns with PoC-first principles while maintaining quality and extensibility.