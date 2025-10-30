# API Contracts

This directory contains API contract definitions for the HTTP MCP Server.

## Files

### http-api.yaml

OpenAPI 3.1.0 specification for the HTTP endpoints:

**Endpoints**:
- `GET /healthz` - Health check endpoint
- `POST /mcp` - MCP JSON-RPC endpoint
- `GET /mcp` - MCP SSE stream endpoint
- `DELETE /mcp` - Close MCP session (stateful mode only)

**Usage**:
```bash
# View with Swagger UI
npx @redocly/cli preview-docs contracts/http-api.yaml

# Validate
npx @redocly/cli lint contracts/http-api.yaml

# Generate client
npx @openapitools/openapi-generator-cli generate \
  -i contracts/http-api.yaml \
  -g typescript-fetch \
  -o generated/client
```

## MCP Protocol

The `/mcp` endpoint implements the MCP (Model Context Protocol) Streamable HTTP transport specification.

**MCP Specification**: https://spec.modelcontextprotocol.io/

**Key Points**:
- JSON-RPC 2.0 message format
- SSE (Server-Sent Events) for streaming
- Stateless mode (no session management)
- Tool execution via `tools/call` method

## Testing

### Health Check

```bash
curl http://localhost:3000/healthz
```

Expected response:
```json
{
  "status": "healthy",
  "server": {
    "name": "mcp-taipei-metro-month-price",
    "version": "1.0.0",
    "uptime": 3600
  },
  "mcp": {
    "connected": true,
    "toolsAvailable": 2
  },
  "timestamp": "2025-10-29T10:30:00.000Z"
}
```

### MCP Tool Call

```bash
curl -X POST http://localhost:3000/mcp \
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

### SSE Stream

```bash
# Using curl to monitor SSE stream
curl -N http://localhost:3000/mcp \
  -H "Accept: text/event-stream"
```

## Notes

- The MCP endpoint is managed by `StreamableHTTPServerTransport` from @modelcontextprotocol/sdk
- Health endpoint is a custom implementation for monitoring
- All MCP protocol details handled by SDK - contract here is for reference only
- Actual MCP tool schemas defined in src/adapters/mcp/tools.ts
