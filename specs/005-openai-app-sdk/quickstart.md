# Quickstart: OpenAI App SDK Integration

**Feature**: OpenAI App SDK Integration
**Version**: 1.0.0
**Date**: 2025-11-04

## Overview

This guide helps you quickly get started with the OpenAI App SDK integration for the TPASS calculator. The service now supports both MCP clients and OpenAI Apps SDK through intelligent request routing.

## Key Concepts

### Dual Protocol Support

The service automatically detects client type based on User-Agent header:
- **MCP Clients**: Standard MCP JSON-RPC responses
- **OpenAI Apps**: Rich widget-based responses with step-by-step guidance

### "No-OpenAI-SDK" Strategy

To avoid rapidly changing library dependencies, we use:
- Standard HTTP/JSON responses
- OpenAI Apps Functions Schema v1.0
- Direct integration with existing calculation logic

## Quick Start

### 1. Running the Service

```bash
# Start HTTP server with dual protocol support
bun run server

# Or run MCP stdio server (existing functionality)
bun run mcp-server
```

### 2. Testing OpenAI Apps Integration

**Test User-Agent Detection:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "User-Agent: openai-mcp/1.0.0" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'
```

**Expected Response:**
- User-Agent with "openai-mcp" → OpenAI Apps format response
- Other User-Agent → Standard MCP response

### 3. Testing Widget Interactions

**Start Step-by-Step Calculation:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "startTpassCalculation",
    "arguments": {
      "mode": "basic"
    }
  }
}
```

**Expected Widget Response:**
```json
{
  "result": {
    "success": true,
    "currentStep": 1,
    "totalSteps": 3,
    "stepTitle": "Basic TPASS Calculation",
    "stepDescription": "Enter your travel details to get started",
    "widget": {
      "type": "form",
      "layout": "vertical",
      "title": "Travel Information",
      "fields": [
        {
          "name": "startDate",
          "type": "date-picker",
          "label": "Start Date",
          "description": "When does your 30-day period begin?",
          "required": true
        },
        {
          "name": "oneWayFare",
          "type": "number-input",
          "label": "One-way Fare",
          "description": "Cost of a single trip in NTD",
          "validation": { "min": 1, "max": 200 }
        }
      ],
      "actions": [
        {
          "type": "next",
          "label": "Continue",
          "enabled": true
        }
      ]
    }
  }
}
```

## Architecture Overview

### Request Flow

```
HTTP Request
    ↓
User-Agent Detection
    ↓
Protocol Routing
    ├→ MCP: JSON-RPC Response
    └→ OpenAI Apps: Widget Response
```

### Key Components

1. **UserAgentDetector**: Inspects User-Agent header
2. **ResponseFormatter**: Generates appropriate response format
3. **WidgetRenderer**: Creates OpenAI Apps widgets
4. **OpenAIAppAdapter**: Bridges calculation logic to Apps SDK

### Integration Points

- **Shared Logic**: All TPASS calculations use existing services
- **Protocol Independence**: MCP stdio and HTTP transports work independently
- **Backward Compatibility**: Existing MCP clients unaffected

## Widget Interaction Patterns

### Step 1: Basic Parameters
- Start date selection
- Fare amount input
- Basic validation

### Step 2: Advanced Options
- Trips per day
- Custom working days
- Optional overrides

### Step 3: Results Display
- Cost comparison
- Savings visualization
- Recommendation

### Error Handling
- Input validation with helpful messages
- Retry mechanisms
- Fallback to basic calculation mode

## Testing Strategy

### 1. API Response Format Validation

Test that responses conform to expected schemas:
```bash
# Test MCP response format
curl -H "User-Agent: mcp-client/1.0" http://localhost:3000/mcp

# Test OpenAI Apps response format
curl -H "User-Agent: openai-mcp/1.0.0" http://localhost:3000/mcp
```

### 2. Widget Configuration Validation

Verify widget configurations are valid:
- Required fields present
- Validation rules match backend constraints
- Layout specifications correct

### 3. Backward Compatibility Testing

Ensure existing MCP functionality unchanged:
```bash
# Test MCP stdio server
bun run mcp-server

# Test MCP HTTP endpoint
curl -H "User-Agent: mcp-client" http://localhost:3000/mcp
```

## Common Use Cases

### 1. Simple TPASS Calculation
- User provides basic parameters
- System returns immediate recommendation
- Includes savings visualization

### 2. Cross-Month Calculation
- System detects month boundary crossing
- Shows monthly breakdown
- Explains discount tier application

### 3. Discount Information Lookup
- User requests discount details
- System returns interactive tier table
- Includes eligibility criteria

### 4. Error Recovery
- Invalid input detected
- System provides helpful suggestions
- User can retry with corrected data

## Development Notes

### Adding New Functions

1. Define function schema in `contracts/openai-apps-extended.json`
2. Implement handler in `src/adapters/openai/app.ts`
3. Add validation logic
4. Test with widget configuration

### Modifying Widgets

1. Update widget configuration in response
2. Ensure validation rules match
3. Test progressive disclosure flow
4. Verify error handling

### Performance Considerations

- Widget rendering happens on OpenAI side
- Backend only sends configuration
- Response time should stay under 3 seconds
- No additional rate limiting needed

## Troubleshooting

### Common Issues

**Problem**: User-Agent not detected correctly
- **Solution**: Check header format, ensure "openai-mcp" prefix present

**Problem**: Widget not rendering in ChatGPT
- **Solution**: Verify widget configuration schema compliance

**Problem**: Calculation results inconsistent between MCP and OpenAI
- **Solution**: Check shared calculation logic, ensure no protocol-specific modifications

**Problem**: Error messages not user-friendly
- **Solution**: Enhance error handling in widget configuration

### Debug Mode

Enable detailed logging:
```bash
DEBUG=openai-app:* bun run server
```

### Validation Tools

Use schema validation tools to verify widget configurations:
```bash
# Validate against OpenAI Apps schema
jq '.widget | validateAgainstOpenAiSchema()' response.json
```

## Next Steps

1. **Phase 2**: Implement actual code changes based on this plan
2. **Testing**: Comprehensive integration testing
3. **Deployment**: Gradual rollout with backward compatibility monitoring
4. **Iteration**: Refine widget interactions based on user feedback

## Resources

- [OpenAI Apps Functions Schema](https://openai.com/apps/schema/functions.json)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [Existing Implementation](../contracts/openai-apps.json)
