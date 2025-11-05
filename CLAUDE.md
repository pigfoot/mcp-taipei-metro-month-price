# mcp-taipei-metro-month-price Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-28

## Active Technologies
- TypeScript 5.x with Bun 1.x runtime + @modelcontextprotocol/sdk (official MCP SDK) (001-tpass-calculator)
- Static JSON file cache (`data/calendar-cache.json`) (001-tpass-calculator)
- TypeScript 5.9.3 with Bun 1.x runtime + @modelcontextprotocol/sdk ^1.20.2 (002-http-mcp-server)
- Static JSON file cache (data/calendar-cache.json) (002-http-mcp-server)
- TypeScript 5.9.3 / Bun 1.x + @modelcontextprotocol/sdk v1.20.2, fuzzysort (for fuzzy matching) (003-fare-lookup)
- JSON file cache at `data/fare-cache.json` (003-fare-lookup)
- TypeScript 5.x with Bun 1.x runtime + @modelcontextprotocol/sdk (MCP server implementation) (004-cross-month-tpass)
- Static JSON file cache (calendar-cache.json, fare-cache.json) (004-cross-month-tpass)
- Static JSON files (data/calendar-cache.json, data/fare-cache.json) (005-openai-app-sdk)
- TypeScript 5.9.3 + Bun 1.x + @modelcontextprotocol/sdk v1.20.2 + OpenAI Apps Functions Schema v1.0 (no-opensai-sdk strategy) (005-openai-app-sdk)
  - Dual-protocol support: MCP clients via stdio/HTTP + OpenAI Apps via user-agent detection
  - Widget-based interaction with step-by-step guidance for TPASS calculations
  - Response formatting for both MCP JSON-RPC and OpenAI Apps function calls
  - User-agent detection with "openai-mcp" prefix identification

- TypeScript 5.x / Bun 1.x runtime (001-tpass-calculator)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x / Bun 1.x runtime: Follow standard conventions

## File Management Rules

### Test Files
- **ONLY commit test files in `tests/` directory** with proper organization:
  - `tests/unit/` - Unit tests
  - `tests/integration/` - Integration tests
  - `tests/manual/` - Manual test scripts (if needed)
- **NEVER commit temporary test files** in project root (e.g., `test-*.ts`, `debug-*.ts`, `temp-*.ts`)
- Temporary test scripts should be:
  - Deleted immediately after use, OR
  - Added to `.gitignore` if needed for local development
- Before committing, **always check `git status`** and remove any temporary files

### Temporary/Debug Files to Avoid
Examples of files that should NOT be committed:
- `test-mcp-response.ts` (one-off MCP test)
- `test-cross-month.ts` (temporary validation script)
- `test-actual-days.ts` (ad-hoc testing)
- `debug-*.ts` (debugging scripts)
- `scratch-*.ts` (scratch/playground files)

**Exception**: If a temporary test demonstrates important validation logic, refactor it into a proper test in `tests/` directory before committing.

## Recent Changes
- 005-openai-app-sdk: Added OpenAI Apps Functions Schema v1.0 integration with dual-protocol support via user-agent detection and widget rendering
- 005-openai-app-sdk: Extended project documentation with OpenAI Apps integration details
- 004-cross-month-tpass: Added TypeScript 5.x with Bun 1.x runtime + @modelcontextprotocol/sdk (MCP server implementation)
- 003-fare-lookup: Added TypeScript 5.9.3 / Bun 1.x + @modelcontextprotocol/sdk v1.20.2, fuzzysort (for fuzzy matching)


<!-- MANUAL ADDITIONS START -->
## OpenAI Apps SDK Integration Details (005-openai-app-sdk)

### Implementation Approach
- **Strategy**: "no-opensai-sdk" approach using standard HTTP/JSON responses
- **Schema**: OpenAI Apps Functions Schema v1.0 compliance
- **User-Agent Detection**: Automatic protocol detection via "openai-mcp" prefix
- **Dual Protocol Support**:
  - MCP clients: Standard MCP JSON-RPC responses via stdio and HTTP
  - OpenAI Apps: Rich widget-based responses with step-by-step guidance

### Key Components
- **UserAgentDetection**: src/lib/userAgentDetection.ts - User-agent parsing and protocol routing
- **ResponseFormatter**: src/lib/responseFormatter.ts - Protocol-specific response generation
- **Widget Configuration**: Progressive disclosure with form, result, and error widgets
- **OpenAI Adapter**: src/adapters/openai/app.ts - Enhanced for dual-protocol support

### Widget Interaction Patterns
- **Step 1**: Basic parameters (start date, fare amount)
- **Step 2**: Advanced options (trips per day, custom working days)
- **Step 3**: Results display with savings visualization
- **Cross-month**: Automatic detection with monthly breakdown

### Testing Strategy
- **Contract Tests**: tests/contract/openai-apps/ for schema validation
- **Integration Tests**: tests/integration/openai-apps/ for end-to-end testing
- **Backward Compatibility**: Ensures existing MCP functionality unchanged
- **Performance**: <3 second response time maintained for both protocols

### API Endpoints
- **HTTP Server**: `bun run server` - Supports both MCP and OpenAI Apps
- **MCP Stdio**: `bun run mcp-server` - Original functionality preserved
- **Health Check**: Reports dual-protocol support status

### Error Handling
- Protocol-specific error formatting
- Widget-based error feedback with retry functionality
- Graceful fallback to MCP protocol when needed
- Input validation with helpful correction suggestions

### Migration Path
- Zero disruption to existing MCP clients
- Gradual adoption possible for OpenAI Apps integration
- Clear command distinction between stdio and HTTP transports
- Operational monitoring for protocol distribution

<!-- MANUAL ADDITIONS END -->
