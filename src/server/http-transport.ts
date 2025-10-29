/**
 * HTTP Transport wrapper for MCP Server using StreamableHTTPServerTransport
 */

import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ServerConfig } from '../types/server.js';

/**
 * Create and configure StreamableHTTPServerTransport for MCP
 *
 * @param config - Server configuration
 * @returns Configured transport instance
 */
export function createHttpTransport(
  config: ServerConfig
): StreamableHTTPServerTransport {
  // Use stateless mode (sessionIdGenerator: undefined)
  // This means no session management - each request is independent
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless mode
  });

  return transport;
}
