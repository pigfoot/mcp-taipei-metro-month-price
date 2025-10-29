/**
 * Environment variable configuration for HTTP MCP Server
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
 * Load and validate server configuration from environment variables
 */
export function loadServerConfig(): ServerConfig {
  // Parse MCP_PORT with validation
  const portEnv = process.env.MCP_PORT ?? '8080';
  const port = parseInt(portEnv, 10);

  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid MCP_PORT: "${portEnv}". Must be a number between 1 and 65535.`
    );
  }

  // Parse LOG_LEVEL with validation
  const logLevel = process.env.LOG_LEVEL ?? 'info';
  const validLogLevels = ['debug', 'info', 'error'];

  if (!validLogLevels.includes(logLevel)) {
    throw new Error(
      `Invalid LOG_LEVEL: "${logLevel}". Must be one of: ${validLogLevels.join(', ')}`
    );
  }

  // Parse CACHE_PATH with default
  const cachePath = process.env.CACHE_PATH ?? 'data/calendar-cache.json';

  return {
    port,
    logLevel: logLevel as 'debug' | 'info' | 'error',
    cachePath,
  };
}

/**
 * Default server configuration for testing
 */
export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  port: 8080,
  logLevel: 'info',
  cachePath: 'data/calendar-cache.json',
} as const;
