#!/usr/bin/env bun
/**
 * TPASS Calculator - Main entry point
 * MCP server for Taipei Metro monthly pass cost comparison
 * Supports both HTTP and stdio transports
 */

import { loadServerConfig } from './config/env.js';
import { createServer } from './adapters/mcp/server.js';
import { createHttpTransport } from './server/http-transport.js';
import { createHttpServer } from './server/http-server.js';

/**
 * Main entry point
 * Detects MCP_PORT environment variable to determine transport mode:
 * - If MCP_PORT is set: Start HTTP server
 * - Otherwise: Fall back to stdio mode (backward compatibility)
 */
async function main() {
  // Check if HTTP mode is requested via MCP_PORT environment variable
  if (process.env.MCP_PORT) {
    // HTTP mode
    console.log('🚀 MCP HTTP Server starting...');

    try {
      // Load configuration
      const config = loadServerConfig();

      // Create MCP server instance
      const mcpServer = createServer();

      // Create HTTP transport
      const transport = createHttpTransport(config);

      // Connect MCP server to HTTP transport
      await mcpServer.connect(transport);
      console.log('✓ MCP transport connected (stateless mode)');

      // Start HTTP server
      const httpServer = await createHttpServer(config, mcpServer, transport);

      console.log(`📊 Registered tools: ${(await import('./adapters/mcp/tools.js')).tools.map(t => t.name).join(', ')}`);

      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n⏸️  Shutting down gracefully...');
        httpServer.stop();
        await mcpServer.close();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        console.log('\n⏸️  Shutting down gracefully...');
        httpServer.stop();
        await mcpServer.close();
        process.exit(0);
      });
    } catch (error) {
      console.error('❌ Failed to start HTTP server:', error);
      process.exit(1);
    }
  } else {
    // Stdio mode (backward compatibility)
    console.log('TPASS Calculator v1.0.0');
    console.log('Taipei Metro Monthly Pass Cost Comparison Tool');
    console.log('');
    console.log('Available commands:');
    console.log('  bun run server          - Start MCP HTTP server');
    console.log('  bun run mcp-server      - Start MCP server (stdio)');
    console.log('  bun run calculate       - Run fare calculation CLI');
    console.log('  bun run calendar:update - Update government calendar data');
    console.log('  bun run calendar:status - Check calendar cache status');
    console.log('');
    console.log('To start HTTP server, set MCP_PORT environment variable:');
    console.log('  MCP_PORT=8080 bun run server');
    console.log('');
  }
}

// Export library modules
export * from './lib/types.js';
export * from './models/discount.js';
export * from './services/calculator.js';

// Start server if run directly
if (import.meta.main) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
