/**
 * TPASS Calculator - Main entry point
 * MCP server for Taipei Metro monthly pass cost comparison
 */

console.log('TPASS Calculator v1.0.0');
console.log('Taipei Metro Monthly Pass Cost Comparison Tool');
console.log('');
console.log('Available commands:');
console.log('  bun run mcp-server      - Start MCP server (stdio)');
console.log('  bun run calculate       - Run fare calculation CLI');
console.log('  bun run calendar:update - Update government calendar data');
console.log('  bun run calendar:status - Check calendar cache status');
console.log('');

export * from './lib/types.js';
export * from './models/discount.js';
export * from './services/calculator.js';
