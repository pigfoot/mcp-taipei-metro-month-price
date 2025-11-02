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
- 004-cross-month-tpass: Added TypeScript 5.x with Bun 1.x runtime + @modelcontextprotocol/sdk (MCP server implementation)
- 003-fare-lookup: Added TypeScript 5.9.3 / Bun 1.x + @modelcontextprotocol/sdk v1.20.2, fuzzysort (for fuzzy matching)
- 002-http-mcp-server: Added TypeScript 5.9.3 with Bun 1.x runtime + @modelcontextprotocol/sdk ^1.20.2


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
