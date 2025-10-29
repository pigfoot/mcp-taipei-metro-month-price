# Quick Start: HTTP MCP Server

**Feature**: 002-http-mcp-server
**Target**: Developers setting up and testing the HTTP MCP server

## Prerequisites

- Bun 1.x installed (`bun --version`)
- Project dependencies installed (`bun install`)
- Existing TPASS calculator working

## Quick Start (3 Steps)

### 1. Start the Server

```bash
# Default configuration (port 8080)
bun run server

# Custom port
MCP_PORT=3000 bun run server

# With debug logging
LOG_LEVEL=debug bun run server
```

Expected output:
```
🚀 MCP HTTP Server starting...
✓ Calendar cache loaded from data/calendar-cache.json
✓ MCP transport connected (stateless mode)
✓ Server listening on http://localhost:8080
  - Health check: http://localhost:8080/healthz
  - MCP endpoint: http://localhost:8080/mcp
📊 Registered tools: calculate_tpass_value, get_discount_info
```

### 2. Verify Health

```bash
curl http://localhost:8080/healthz
```

Expected response:
```json
{
  "status": "healthy",
  "server": {
    "name": "mcp-taipei-metro-month-price",
    "version": "1.0.0",
    "uptime": 5
  },
  "mcp": {
    "connected": true,
    "toolsAvailable": 2
  },
  "timestamp": "2025-10-29T10:30:00.000Z"
}
```

### 3. Test MCP Tool

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "calculate_tpass_value",
      "arguments": {
        "rides": 42,
        "month": 11,
        "year": 2025
      }
    }
  }'
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_PORT` | `8080` | HTTP server port |
| `LOG_LEVEL` | `info` | Logging level (debug, info, error) |
| `CACHE_PATH` | `data/calendar-cache.json` | Calendar cache file path |

### Example Configurations

**Development**:
```bash
MCP_PORT=8080 LOG_LEVEL=debug bun run server
```

**Production**:
```bash
MCP_PORT=80 LOG_LEVEL=info bun run server
```

**Testing**:
```bash
MCP_PORT=0 bun run server  # Random available port
```

## Container Deployment

### Build Container

```bash
# Build image
docker build -t mcp-taipei-metro-server .

# Or using podman
podman build -t mcp-taipei-metro-server .
```

### Run Container

```bash
# Default configuration
docker run -p 8080:8080 mcp-taipei-metro-server

# Custom port
docker run -p 3000:3000 -e MCP_PORT=3000 mcp-taipei-metro-server

# With volume mount for cache
docker run -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  mcp-taipei-metro-server
```

### Health Check

```bash
# Container includes health check
docker ps  # Check HEALTH status

# Manual health check
curl http://localhost:8080/healthz
```

## Testing

### List Available Tools

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

### Calculate TPASS Value

```bash
curl -X POST http://localhost:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "calculate_tpass_value",
      "arguments": {
        "rides": 42,
        "month": 11,
        "year": 2025
      }
    }
  }' | jq
```

### SSE Streaming (EventSource)

```javascript
// JavaScript client example
const eventSource = new EventSource('http://localhost:8080/mcp');

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('MCP message:', message);
};

eventSource.onerror = (error) => {
  console.error('SSE error:', error);
  eventSource.close();
};
```

### Using curl for SSE

```bash
curl -N -H "Accept: text/event-stream" http://localhost:8080/mcp
```

## Package Update Command

### Check for Updates

```bash
bun run update-deps
```

Example output:
```
Checking for package updates...
✓ prettier: 3.6.0 → 3.6.2 (minor update)
⚠️  prettier: 4.0.1 available (major update - use --major flag)
✓ eslint: 9.38.0 → 9.38.2 (patch update)

Summary: 2 packages updated, 1 major version warning
```

### Accept Major Updates

```bash
bun run update-deps --major
```

## Troubleshooting

### Server Won't Start

**Problem**: Port already in use
```
Error: listen EADDRINUSE: address already in use :::8080
```

**Solution**: Use different port or kill process
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>

# Or use different port
MCP_PORT=8081 bun run server
```

### Health Check Returns 503

**Problem**: MCP transport not connected

**Solution**: Check logs for transport connection errors
```bash
LOG_LEVEL=debug bun run server
```

### Tool Call Fails

**Problem**: Invalid tool arguments

**Solution**: Check tool schema
```bash
curl -X POST http://localhost:8080/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Calendar Cache Missing

**Problem**: Cache file not found
```
Error: Calendar cache not found at data/calendar-cache.json
```

**Solution**: Update calendar cache
```bash
bun run calendar:update
```

## Development Workflow

### 1. Make Changes

Edit source files in `src/`

### 2. Run with Auto-Reload

```bash
bun --watch run server
```

### 3. Test Changes

```bash
# Health check
curl http://localhost:8080/healthz

# Tool test
curl -X POST http://localhost:8080/mcp \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### 4. Check Logs

```bash
# Terminal output shows structured logs
{
  "timestamp": "2025-10-29T10:30:00.000Z",
  "level": "info",
  "tool": "calculate_tpass_value",
  "executionTime": 125,
  "status": "success"
}
```

## Integration with AI Clients

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "taipei-metro": {
      "url": "http://localhost:8080/mcp",
      "transport": "http"
    }
  }
}
```

### Custom Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport({
  url: 'http://localhost:8080/mcp'
});

const client = new Client(
  { name: 'my-client', version: '1.0.0' },
  { capabilities: {} }
);

await client.connect(transport);

// Call tool
const result = await client.request({
  method: 'tools/call',
  params: {
    name: 'calculate_tpass_value',
    arguments: { rides: 42, month: 11, year: 2025 }
  }
});
```

## Next Steps

- Review [data-model.md](./data-model.md) for data structures
- Check [contracts/](./contracts/) for API specifications
- See [plan.md](./plan.md) for implementation details
- Read [research.md](./research.md) for architecture decisions

## Support

For issues or questions:
1. Check logs with `LOG_LEVEL=debug`
2. Verify health endpoint responds
3. Review MCP protocol specification
4. Check existing issues in project repository
