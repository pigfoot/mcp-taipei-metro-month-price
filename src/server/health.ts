/**
 * Health check endpoint handler with dual-protocol support
 * Reports status for both MCP and OpenAI Apps protocols
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { HealthCheckResponse } from '../types/server.js';
import { APP_INFO } from '../config.js';
import { tools } from '../adapters/mcp/tools.js';
import { openAIFunctionSchemas } from '../adapters/openai/functions.js';

/**
 * Handle health check request
 *
 * @param mcpServer - MCP server instance
 * @param startTime - Server start timestamp
 * @returns HTTP response with health status
 */
export function handleHealthCheck(
  mcpServer: Server,
  startTime: number
): Response {
  // Calculate uptime in seconds
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  // Check if MCP transport is connected
  // Note: The Server object doesn't expose connection status directly
  // We assume it's connected if the server is running
  const connected = true; // Simplified for PoC

  const healthResponse: HealthCheckResponse = {
    status: connected ? 'healthy' : 'unhealthy',
    server: {
      name: APP_INFO.name,
      version: APP_INFO.version,
      uptime,
      features: [
        'dual-protocol-support',
        'user-agent-detection',
        'widget-responses',
        'backward-compatibility',
        'openai-apps-integration',
      ],
    },
    protocols: {
      mcp: {
        connected,
        toolsAvailable: tools.length,
        transport: 'stdio + http',
        version: '2.0',
      },
      'openai-apps': {
        supported: true,
        functionsAvailable: openAIFunctionSchemas.length,
        features: ['function-calls', 'widgets', 'step-by-step'],
        version: 'apps-schema-v1.0',
      },
    },
    detection: {
      method: 'user-agent',
      patterns: ['openai-mcp/*', 'openai.*mcp'],
      fallback: 'mcp',
      confidence: 'high',
    },
    timestamp: new Date().toISOString(),
  };

  const statusCode = connected ? 200 : 503;

  return new Response(JSON.stringify(healthResponse, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
