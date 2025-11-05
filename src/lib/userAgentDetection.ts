/**
 * User-Agent Detection Service
 * Determines client protocol type from HTTP request metadata
 * Implements "openai-mcp" prefix detection with graceful MCP fallback
 */

export interface UserAgentInfo {
  raw: string;
  isOpenAI: boolean;
  openAIVersion?: string;
  clientType: 'mcp' | 'openai-apps';
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detect client type from User-Agent header
 * Returns robust detection with fallback to MCP protocol
 */
export function detectUserAgent(userAgent?: string): UserAgentInfo {
  // Default to MCP if no User-Agent provided
  if (!userAgent || userAgent.trim() === '') {
    return {
      raw: '',
      isOpenAI: false,
      clientType: 'mcp',
      isValid: true,
      confidence: 'high',
    };
  }

  // Clean and normalize User-Agent string
  const normalizedUA = userAgent.trim();
  const lowerUA = normalizedUA.toLowerCase();

  // Check for "openai-mcp" prefix pattern
  const openAIMatch = lowerUA.match(/^openai-mcp\/([\d.]+)/);
  if (openAIMatch) {
    return {
      raw: normalizedUA,
      isOpenAI: true,
      openAIVersion: openAIMatch[1],
      clientType: 'openai-apps',
      isValid: true,
      confidence: 'high',
    };
  }

  // Check for other OpenAI-related patterns
  const generalOpenAIMatch = lowerUA.match(/openai.*mcp/i);
  if (generalOpenAIMatch) {
    return {
      raw: normalizedUA,
      isOpenAI: true,
      clientType: 'openai-apps',
      isValid: true,
      confidence: 'medium',
    };
  }

  // Check for common MCP client patterns
  const mcpPatterns = [
    /mcp-client/i,
    /model-context-protocol/i,
    /claude-code/i,
    /anthropic/i,
  ];

  for (const pattern of mcpPatterns) {
    if (pattern.test(lowerUA)) {
      return {
        raw: normalizedUA,
        isOpenAI: false,
        clientType: 'mcp',
        isValid: true,
        confidence: 'medium',
      };
    }
  }

  // Unknown User-Agent: default to MCP for safety (but still valid)
  // Only mark as invalid if extremely long (over 2048 characters)
  const isInvalid = normalizedUA.length > 2048;
  return {
    raw: normalizedUA,
    isOpenAI: false,
    clientType: 'mcp',
    isValid: !isInvalid,
    confidence: 'low',
  };
}

/**
 * Extract version information from OpenAI User-Agent
 */
export function extractOpenAIVersion(userAgent: string): string | undefined {
  const match = userAgent.match(/openai-mcp\/([\d.]+)/);
  return match ? match[1] : undefined;
}

/**
 * Validate User-Agent format for security and compatibility
 */
export function validateUserAgent(userAgent: string): {
  isValid: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (!userAgent || userAgent.trim() === '') {
    warnings.push('Empty User-Agent header - defaulting to MCP protocol');
    return { isValid: true, issues, warnings };
  }

  // Check length limits
  if (userAgent.length > 512) {
    issues.push('User-Agent header too long (>512 characters)');
  }

  // Check for suspicious patterns
  if (userAgent.includes('<script>') || userAgent.includes('javascript:')) {
    issues.push('Potentially malicious User-Agent detected');
  }

  // Check for valid version format if OpenAI pattern
  if (userAgent.toLowerCase().includes('openai-mcp/')) {
    const versionMatch = userAgent.match(/openai-mcp\/([\d.]+)/);
    if (!versionMatch) {
      warnings.push('Invalid OpenAI version format in User-Agent');
    } else {
      const version = versionMatch[1];
      // Basic version validation (semver-ish)
      if (!/^\d+(\.\d+)*$/.test(version)) {
        warnings.push(`Invalid version format: ${version}`);
      }
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
  };
}

/**
 * Get logging context for debugging User-Agent detection
 */
export function getUserAgentContext(userAgent: string): {
  detected: UserAgentInfo;
  validation: ReturnType<typeof validateUserAgent>;
  shouldLog: boolean;
} {
  const detected = detectUserAgent(userAgent);
  const validation = validateUserAgent(userAgent);

  // Log if detection confidence is low or validation has issues
  const shouldLog = !detected.isValid ||
                   detected.confidence === 'low' ||
                   validation.issues.length > 0 ||
                   validation.warnings.length > 0;

  return {
    detected,
    validation,
    shouldLog,
  };
}