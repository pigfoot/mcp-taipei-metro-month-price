# mcp-taipei-metro-month-price Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-28

## Active Technologies
- TypeScript 5.x with Bun 1.x runtime + @modelcontextprotocol/sdk (official MCP SDK) (001-tpass-calculator)
- Static JSON file cache (`data/calendar-cache.json`) (001-tpass-calculator)
- TypeScript 5.9.3 with Bun 1.x runtime + @modelcontextprotocol/sdk ^1.20.2 (002-http-mcp-server)
- Static JSON file cache (data/calendar-cache.json) (002-http-mcp-server)
- TypeScript 5.9.3 / Bun 1.x + @modelcontextprotocol/sdk v1.20.2, fuzzysort (for fuzzy matching) (003-fare-lookup)
- JSON file cache at `data/fare-cache.json` (003-fare-lookup)

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

## Recent Changes
- 003-fare-lookup: Added TypeScript 5.9.3 / Bun 1.x + @modelcontextprotocol/sdk v1.20.2, fuzzysort (for fuzzy matching)
- 002-http-mcp-server: Added TypeScript 5.9.3 with Bun 1.x runtime + @modelcontextprotocol/sdk ^1.20.2
- 002-http-mcp-server: Added TypeScript 5.9.3 with Bun 1.x runtime + @modelcontextprotocol/sdk ^1.20.2


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
