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
 * Health check response with dual-protocol support
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
    /** Supported features */
    features: string[];
  };
  /** Protocol-specific status */
  protocols: {
    /** MCP protocol status */
    mcp: {
      /** Whether MCP transport is connected */
      connected: boolean;
      /** Number of available tools */
      toolsAvailable: number;
      /** Supported transports */
      transport: string;
      /** Protocol version */
      version: string;
    };
    /** OpenAI Apps protocol status */
    'openai-apps': {
      /** Whether OpenAI Apps is supported */
      supported: boolean;
      /** Number of available functions */
      functionsAvailable: number;
      /** Supported features */
      features: string[];
      /** Protocol version */
      version: string;
    };
  };
  /** User-agent detection configuration */
  detection: {
    /** Detection method */
    method: string;
    /** Detection patterns */
    patterns: string[];
    /** Fallback protocol */
    fallback: string;
    /** Detection confidence level */
    confidence: string;
  };
  /** ISO 8601 timestamp */
  timestamp: string;
}
