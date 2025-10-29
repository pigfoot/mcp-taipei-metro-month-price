# OpenAI Apps SDK Integration Guide

## Overview

This guide shows how to integrate the TPASS Calculator with OpenAI Apps SDK (2025) as a custom function/tool.

## Architecture

```
OpenAI Apps Platform
      ↓
OpenAI Apps SDK
      ↓
src/adapters/openai/app.ts (Adapter Layer)
      ↓
src/services/calculator.ts (Core Logic)
```

## Integration Steps

### 1. Install OpenAI Apps SDK

```bash
# When OpenAI Apps SDK becomes available
npm install @openai/apps-sdk
# or
bun add @openai/apps-sdk
```

### 2. Create OpenAI App Entry Point

Create `src/adapters/openai/server.ts`:

```typescript
import { OpenAIApp } from '@openai/apps-sdk';
import { openAIAppConfig, handleOpenAIFunctionCall } from './app.js';

// Initialize OpenAI App
const app = new OpenAIApp({
  name: openAIAppConfig.name,
  version: openAIAppConfig.version,
  description: openAIAppConfig.description,
});

// Register functions
openAIAppConfig.functions.forEach((func) => {
  app.registerFunction(func);
});

// Handle function calls
app.onFunctionCall(async (call) => {
  try {
    const result = await handleOpenAIFunctionCall({
      name: call.name,
      arguments: JSON.stringify(call.arguments),
    });
    return result;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`OpenAI App listening on port ${port}`);
});
```

### 3. Update package.json

```json
{
  "scripts": {
    "openai-server": "bun run src/adapters/openai/server.ts",
    "dev:openai": "bun run --watch src/adapters/openai/server.ts"
  }
}
```

### 4. Configure App Manifest

Create `openai-app.json` in project root:

```json
{
  "name": "taipei-metro-tpass",
  "version": "1.0.0",
  "description": "TPASS monthly pass calculator for Taipei Metro",
  "author": "Your Name",
  "homepage": "https://github.com/your-org/mcp-taipei-metro-month-price",
  "functions": [
    {
      "name": "calculateTPASSComparison",
      "description": "Calculate and compare TPASS monthly pass versus regular fare with frequent rider discount",
      "parameters": {
        "type": "object",
        "properties": {
          "startDate": {
            "type": "string",
            "description": "Start date for TPASS validity period (YYYY-MM-DD)"
          },
          "oneWayFare": {
            "type": "number",
            "description": "One-way fare amount in NTD (default: 40)"
          },
          "tripsPerDay": {
            "type": "number",
            "description": "Number of trips per working day (default: 2)"
          },
          "customWorkingDays": {
            "type": "number",
            "description": "Override calculated working days (0-30)"
          }
        }
      }
    },
    {
      "name": "getDiscountInformation",
      "description": "Get information about Taipei Metro frequent rider discount tiers",
      "parameters": {
        "type": "object",
        "properties": {}
      }
    }
  ]
}
```

## Usage Examples

### Example 1: Direct Function Call

```typescript
import { handleOpenAIFunctionCall } from './src/adapters/openai/app.js';

// Calculate TPASS comparison
const result = await handleOpenAIFunctionCall({
  name: 'calculateTPASSComparison',
  arguments: JSON.stringify({
    startDate: '2025-11-01',
    oneWayFare: 40,
    tripsPerDay: 2,
  }),
});

console.log(result);
// {
//   "recommendation": "BUY_TPASS",
//   "tpassCost": 1200,
//   "regularCost": 1496,
//   "savings": 296,
//   "explanation": "Save NT$296 with TPASS monthly pass",
//   "calculationDetails": { ... }
// }
```

### Example 2: Using OpenAI Chat Completion

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const messages = [
  {
    role: 'user',
    content: '我每天通勤單程票價 40 元，一天來回兩次，請幫我計算是否該買 TPASS 月票？',
  },
];

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: messages,
  functions: [
    {
      name: 'calculateTPASSComparison',
      description:
        'Calculate and compare TPASS monthly pass versus regular fare',
      parameters: {
        type: 'object',
        properties: {
          oneWayFare: { type: 'number' },
          tripsPerDay: { type: 'number' },
        },
      },
    },
  ],
  function_call: 'auto',
});

// Handle function call
if (response.choices[0].message.function_call) {
  const functionCall = response.choices[0].message.function_call;
  const result = await handleOpenAIFunctionCall({
    name: functionCall.name,
    arguments: functionCall.arguments,
  });

  // Send result back to OpenAI
  messages.push(response.choices[0].message);
  messages.push({
    role: 'function',
    name: functionCall.name,
    content: JSON.stringify(result),
  });

  const finalResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: messages,
  });

  console.log(finalResponse.choices[0].message.content);
  // "根據您的通勤模式，建議購買 TPASS 月票。您每月將節省 NT$296..."
}
```

### Example 3: Integration with OpenAI Assistants API

```typescript
import OpenAI from 'openai';
import { getOpenAIFunctions } from './src/adapters/openai/app.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create assistant with TPASS calculator functions
const assistant = await openai.beta.assistants.create({
  name: 'TPASS 計算助理',
  description: '台北捷運月票計算顧問',
  model: 'gpt-4',
  tools: getOpenAIFunctions().map((func) => ({
    type: 'function',
    function: func,
  })),
});

// Create thread and run
const thread = await openai.beta.threads.create();

await openai.beta.threads.messages.create(thread.id, {
  role: 'user',
  content: '我每個月工作 20 天，單程 45 元，該買月票嗎？',
});

const run = await openai.beta.threads.runs.create(thread.id, {
  assistant_id: assistant.id,
});

// Poll for completion and handle function calls
let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

while (runStatus.status === 'requires_action') {
  const toolCalls = runStatus.required_action?.submit_tool_outputs?.tool_calls;

  if (toolCalls) {
    const toolOutputs = await Promise.all(
      toolCalls.map(async (call) => {
        const result = await handleOpenAIFunctionCall({
          name: call.function.name,
          arguments: call.function.arguments,
        });

        return {
          tool_call_id: call.id,
          output: JSON.stringify(result),
        };
      })
    );

    await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
      tool_outputs: toolOutputs,
    });
  }

  runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
}

// Get final response
const messages = await openai.beta.threads.messages.list(thread.id);
console.log(messages.data[0].content);
```

## Testing OpenAI Integration

### Manual Testing

```bash
# Run OpenAI adapter tests
bun run tests/manual/test-openai-adapter.ts

# Expected output:
# ✅ Retrieved 2 function schemas
# ✅ calculateTPASSComparison with defaults
# ✅ getDiscountInformation
# 🎉 All OpenAI adapter tests passed!
```

### Integration Testing with OpenAI

Create `tests/integration/test-openai-live.ts`:

```typescript
import { handleOpenAIFunctionCall } from '../../src/adapters/openai/app.js';
import OpenAI from 'openai';

async function testLiveIntegration() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  console.log('Testing TPASS calculator with OpenAI...\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'user',
        content:
          '我是全職上班族，每天通勤單程 40 元，往返兩次。請幫我計算是否該買 TPASS 月票？',
      },
    ],
    functions: [
      {
        name: 'calculateTPASSComparison',
        description: 'Calculate TPASS vs regular fare comparison',
        parameters: {
          type: 'object',
          properties: {
            oneWayFare: { type: 'number' },
            tripsPerDay: { type: 'number' },
          },
        },
      },
    ],
    function_call: 'auto',
  });

  if (response.choices[0].message.function_call) {
    const call = response.choices[0].message.function_call;
    console.log(`Function called: ${call.name}`);
    console.log(`Arguments: ${call.arguments}\n`);

    const result = await handleOpenAIFunctionCall({
      name: call.name,
      arguments: call.arguments,
    });

    console.log('Result:', JSON.stringify(result, null, 2));
  }
}

testLiveIntegration();
```

Run with:

```bash
OPENAI_API_KEY=sk-... bun run tests/integration/test-openai-live.ts
```

## Deployment

### Option 1: Standalone Server

```bash
# Start OpenAI Apps server
bun run openai-server

# Server will run on http://localhost:3000
# OpenAI platform can call your functions via HTTP
```

### Option 2: Serverless (Vercel/Netlify)

Create `api/openai-functions.ts`:

```typescript
import { handleOpenAIFunctionCall } from '../src/adapters/openai/app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, arguments: args } = req.body;
    const result = await handleOpenAIFunctionCall({ name, arguments: args });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

Deploy:

```bash
# Vercel
vercel deploy

# Or Netlify
netlify deploy
```

## Environment Variables

Create `.env`:

```bash
# OpenAI API Key (for testing)
OPENAI_API_KEY=sk-...

# Server configuration
PORT=3000
NODE_ENV=production

# Calendar API (optional)
CALENDAR_API_URL=https://data.gov.tw/...
```

## Monitoring & Logging

Add logging to track function usage:

```typescript
// In src/adapters/openai/app.ts

export async function handleOpenAIFunctionCall(
  functionCall: OpenAIFunctionCall
): Promise<Record<string, unknown>> {
  const startTime = Date.now();

  console.log(`[OpenAI] Function call: ${functionCall.name}`);
  console.log(`[OpenAI] Arguments: ${functionCall.arguments}`);

  try {
    const result = await routeFunctionCall(functionCall);

    const duration = Date.now() - startTime;
    console.log(`[OpenAI] Success in ${duration}ms`);

    return result;
  } catch (error) {
    console.error(`[OpenAI] Error: ${error}`);
    throw error;
  }
}
```

## Best Practices

1. **Error Handling**: Always return structured error responses
2. **Validation**: Validate input parameters before processing
3. **Rate Limiting**: Implement rate limiting for production
4. **Caching**: Cache calendar data to reduce API calls
5. **Monitoring**: Log all function calls for debugging
6. **Security**: Validate API keys and implement authentication

## Troubleshooting

### Issue: Function not being called

- Check function schema matches OpenAI's format
- Verify function description is clear and relevant
- Test with explicit `function_call` parameter

### Issue: Invalid response format

- Ensure response matches declared output schema
- Check for missing required fields
- Validate JSON serialization

### Issue: Timeout errors

- Implement caching for calendar data
- Optimize calculation logic
- Consider async processing for complex queries

## Next Steps

1. Deploy to OpenAI Apps marketplace
2. Add more functions (station search, route planning)
3. Implement user preferences persistence
4. Add analytics and usage tracking

## Resources

- [OpenAI Apps Documentation](https://platform.openai.com/docs/apps)
- [Function Calling Guide](https://platform.openai.com/docs/guides/function-calling)
- [OpenAI SDK for TypeScript](https://github.com/openai/openai-node)
