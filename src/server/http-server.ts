/**
 * HTTP Server for MCP with health check endpoint
 */

import { createServer as createNodeServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { ServerConfig } from '../types/server.js';
import { handleHealthCheck } from './health.js';

/**
 * Create and start HTTP server with MCP and health endpoints
 *
 * @param config - Server configuration
 * @param mcpServer - MCP server instance
 * @param transport - HTTP transport for MCP
 * @returns Node.js HTTP server instance
 */
export async function createHttpServer(
  config: ServerConfig,
  mcpServer: Server,
  transport: StreamableHTTPServerTransport
) {
  const startTime = Date.now();

  const server = createNodeServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Health check endpoint
    if (url.pathname === '/healthz') {
      const healthResponse = handleHealthCheck(mcpServer, startTime);
      const body = await healthResponse.text();
      res.writeHead(healthResponse.status, { 'Content-Type': 'application/json' });
      res.end(body);
      return;
    }

    // MCP endpoint - delegate to transport
    if (url.pathname === '/mcp') {
      // Parse request body for POST requests
      let parsedBody: any = undefined;
      if (req.method === 'POST') {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) {
            chunks.push(chunk);
          }
          const body = Buffer.concat(chunks).toString();
          parsedBody = JSON.parse(body);
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
          return;
        }
      }

      // Handle MCP request through transport
      try {
        await transport.handleRequest(req, res, parsedBody);
      } catch (error) {
        console.error('MCP transport error:', error);
        if (!res.headersSent) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Internal server error',
            })
          );
        }
      }
      return;
    }

    // 404 for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  });

  server.listen(config.port, () => {
    console.log(`🚀 MCP HTTP Server starting...`);
    console.log(`✓ Server listening on http://localhost:${config.port}`);
    console.log(`  - Health check: http://localhost:${config.port}/healthz`);
    console.log(`  - MCP endpoint: http://localhost:${config.port}/mcp`);
  });

  return server;
}
