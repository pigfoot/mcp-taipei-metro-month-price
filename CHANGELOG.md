# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-10-31

### Added
- **Fare Lookup Feature**: Comprehensive fare lookup system for Taipei Metro
  - Automatic fare lookup by station names with fuzzy matching
  - Support for 17,161 fare records from Taipei Open Data
  - Big5 encoding support for Chinese station names
  - 7-day intelligent caching with automatic refresh
  - Support for both regular and discounted fares
- **New Services**:
  - `FareService`: Core fare lookup logic with validation
  - `FareCacheService`: Cache management with atomic writes and corruption detection
- **New Libraries**:
  - CSV Parser with Big5 encoding support
  - Station Matcher with fuzzy matching (using fuzzysort library)
- **New CLI Commands**:
  - `fare:lookup` - Lookup fare between two stations
  - `fare:status` - Check fare cache status
  - `fare:update` - Download and update fare data
- **New MCP Tool**:
  - `lookup_fare` - MCP tool for AI assistant integration
- **New Utility Functions**:
  - `getNextWorkingDay()` - Calculate next working day respecting holidays

### Changed
- **Default Behavior**: `calculate_fare` now defaults to next working day instead of today
  - Automatically skips weekends and public holidays
  - Integrated with CalendarService for holiday awareness
- **Tool Descriptions**: Updated MCP tool descriptions to reflect new default behavior

### Fixed
- Unused import cleanup in `tools.ts`
- TypeScript strict mode compliance for all new files

### Technical Details
- Added dependency: `fuzzysort@^3.1.0`
- CSV data source: [Taipei Open Data Platform](https://data.taipei/api/frontstage/tpeod/dataset/resource.download?rid=893c2f2a-dcfd-407b-b871-394a14105532)
- Total records: 17,161 fare records covering 118 unique stations
- Cache location: `data/fare-cache.json`
- Specification: `specs/003-fare-lookup/`

### Testing
- ✅ CLI commands tested and working
- ✅ Fuzzy matching tested with various inputs
- ✅ Cache management tested (download, status, expiry)
- ✅ Integration with existing TPASS calculator verified

## [1.0.0] - 2025-10-28

### Added
- Initial release of TPASS Calculator
- **Core Features**:
  - TPASS vs regular fare comparison
  - Automatic discount tier calculation
  - Cross-month period support
  - Calendar integration with Taiwan public holidays
- **MCP Tools**:
  - `calculate_fare` - Calculate TPASS comparison
  - `get_discount_info` - Get discount information
- **CLI Commands**:
  - `calculate` - Run TPASS comparison
  - `discount` - Show discount information
  - `calendar:update` - Update holiday calendar
  - `calendar:status` - Check calendar status
  - `calendar:view` - View holiday data
- **Services**:
  - Calculator service with cross-month support
  - Calendar service with auto-fetch capability
  - Calendar fetcher for Taiwan government data
- **Architecture**:
  - MCP server implementation
  - Layered architecture with adapters pattern
  - TypeScript 5.9.3 + Bun 1.x runtime

### Technical Details
- Dependencies: `@modelcontextprotocol/sdk@^1.20.2`
- Test coverage: Calendar service unit tests

---

## Release Notes

### v1.1.0 Highlights

The fare lookup feature is a major enhancement that makes the TPASS calculator significantly more user-friendly. Instead of manually looking up fares, users can now:

1. **Automatic Lookup**: Simply provide origin and destination station names
2. **Fuzzy Matching**: Handles typos and partial names with smart suggestions
3. **Seamless Integration**: Fare lookup results work directly with TPASS calculation
4. **Smart Defaults**: Calculator now defaults to next working day for better accuracy

**Example Workflow**:
```bash
# 1. Find your commute fare
bun run fare:lookup -- --origin "亞東醫院" --destination "科技大樓"
# Output: NT$35

# 2. Calculate if TPASS is worth it
bun run calculate --fare 35 --trips 2
# Automatically starts from next working day
```

This update represents a significant step toward making the tool more practical for real-world use.
