/**
 * Type definitions for HTTP MCP Server
 */

/**
 * Server configuration interface
 */
export interface ServerConfig {
  /** HTTP server port */
  port: number;
  /** Logging level */
  logLevel: 'debug' | 'info' | 'error';
  /** Path to calendar cache file */
  cachePath: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Overall health status */
  status: 'healthy' | 'unhealthy';
  /** Server information */
  server: {
    /** Server name */
    name: string;
    /** Server version */
    version: string;
    /** Uptime in seconds */
    uptime: number;
  };
  /** MCP transport status */
  mcp: {
    /** Whether MCP transport is connected */
    connected: boolean;
    /** Number of available tools */
    toolsAvailable: number;
  };
  /** ISO 8601 timestamp */
  timestamp: string;
}
