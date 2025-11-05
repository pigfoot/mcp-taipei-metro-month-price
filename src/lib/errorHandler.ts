/**
 * Dual-Protocol Error Handling Utilities
 * Provides unified error handling for MCP and OpenAI Apps protocols
 * with graceful fallbacks and user-friendly error messages
 */

import type { ClientType } from './responseFormatter.js';

// ============================================================================
// Error Types and Interfaces
// ============================================================================

export interface ProtocolError {
  type: 'validation' | 'calculation' | 'network' | 'widget' | 'protocol' | 'timeout';
  code?: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  clientType: ClientType;
  timestamp: string;
  context?: {
    step?: number;
    field?: string;
    function?: string;
    userAgent?: string;
    requestId?: string;
  };
}

export interface ErrorContext {
  clientType: ClientType;
  functionName?: string;
  step?: number;
  field?: string;
  userAgent?: string;
  requestId?: string;
  additionalContext?: Record<string, unknown>;
}

// ============================================================================
// Error Creation Utilities
// ============================================================================

/**
 * Create a standardized error object for both protocols
 */
export function createError(
  type: ProtocolError['type'],
  message: string,
  context: ErrorContext,
  options: {
    code?: string;
    retryable?: boolean;
    details?: Record<string, unknown>;
  } = {}
): ProtocolError {
  return {
    type,
    code: options.code,
    message,
    details: options.details,
    retryable: options.retryable ?? shouldRetry(type),
    clientType: context.clientType,
    timestamp: new Date().toISOString(),
    context: {
      functionName: context.functionName,
      step: context.step,
      field: context.field,
      userAgent: context.userAgent,
      requestId: context.requestId,
      ...context.additionalContext,
    },
  };
}

/**
 * Determine if an error type is retryable
 */
function shouldRetry(errorType: ProtocolError['type']): boolean {
  switch (errorType) {
    case 'validation':
    case 'protocol':
      return false;
    case 'network':
    case 'timeout':
      return true;
    case 'calculation':
    case 'widget':
      return true; // Often temporary issues
    default:
      return false;
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

/**
 * Create validation error with detailed field information
 */
export function createValidationError(
  message: string,
  field: string,
  context: ErrorContext,
  options: {
    code?: string;
    suggestions?: string[];
    invalidValue?: unknown;
  } = {}
): ProtocolError {
  return createError('validation', message, context, {
    code: options.code || 'VALIDATION_ERROR',
    retryable: false,
    details: {
      field,
      invalidValue: options.invalidValue,
      suggestions: options.suggestions,
    },
  });
}

/**
 * Create date validation error
 */
export function createDateValidationError(
  field: string,
  value: unknown,
  context: ErrorContext
): ProtocolError {
  const invalidDate = typeof value === 'string' ? isNaN(Date.parse(value)) : true;

  if (invalidDate) {
    return createValidationError(
      `Invalid date format for ${field}. Please use YYYY-MM-DD format.`,
      field,
      context,
      {
        code: 'INVALID_DATE',
        invalidValue: value,
        suggestions: [
          'Use format: YYYY-MM-DD (e.g., 2024-11-04)',
          'Ensure the date is valid and not in the future',
        ],
      }
    );
  }

  return createValidationError(
    `Invalid date for ${field}.`,
    field,
    context,
    {
      code: 'INVALID_DATE',
      invalidValue: value,
    }
  );
}

/**
 * Create numeric validation error
 */
export function createNumericValidationError(
  field: string,
  value: unknown,
  context: ErrorContext,
  options: {
    min?: number;
    max?: number;
    expectedType?: string;
  } = {}
): ProtocolError {
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const isValidNumber = !isNaN(numValue);

  if (!isValidNumber) {
    return createValidationError(
      `${field} must be a valid number.`,
      field,
      context,
      {
        code: 'INVALID_NUMBER',
        invalidValue: value,
        suggestions: [`Expected type: ${options.expectedType || 'number'}`],
      }
    );
  }

  if (options.min !== undefined && numValue < options.min) {
    return createValidationError(
      `${field} must be at least ${options.min}.`,
      field,
      context,
      {
        code: 'VALUE_TOO_SMALL',
        invalidValue: value,
        suggestions: [`Minimum value: ${options.min}`],
      }
    );
  }

  if (options.max !== undefined && numValue > options.max) {
    return createValidationError(
      `${field} must be at most ${options.max}.`,
      field,
      context,
      {
        code: 'VALUE_TOO_LARGE',
        invalidValue: value,
        suggestions: [`Maximum value: ${options.max}`],
      }
    );
  }

  return createValidationError(
    `Invalid value for ${field}.`,
    field,
    context,
    {
      code: 'INVALID_VALUE',
      invalidValue: value,
    }
  );
}

// ============================================================================
// Calculation Errors
// ============================================================================

/**
 * Create calculation error with detailed context
 */
export function createCalculationError(
  message: string,
  context: ErrorContext,
  options: {
    code?: string;
    calculationStep?: string;
    inputData?: Record<string, unknown>;
  } = {}
): ProtocolError {
  return createError('calculation', message, context, {
    code: options.code || 'CALCULATION_ERROR',
    retryable: true,
    details: {
      calculationStep: options.calculationStep,
      inputData: options.inputData,
    },
  });
}

/**
 * Create cross-month calculation error
 */
export function createCrossMonthError(
  context: ErrorContext,
  options: {
    startDate?: string;
    endDate?: string;
    reason?: string;
  } = {}
): ProtocolError {
  return createCalculationError(
    `Cross-month calculation failed: ${options.reason || 'Unknown error'}`,
    context,
    {
      code: 'CROSS_MONTH_ERROR',
      calculationStep: 'cross-month-splitter',
      inputData: {
        startDate: options.startDate,
        endDate: options.endDate,
      },
    }
  );
}

// ============================================================================
// Network and Protocol Errors
// ============================================================================

/**
 * Create network error
 */
export function createNetworkError(
  message: string,
  context: ErrorContext,
  options: {
    code?: string;
    statusCode?: number;
    url?: string;
  } = {}
): ProtocolError {
  return createError('network', message, context, {
    code: options.code || 'NETWORK_ERROR',
    retryable: true,
    details: {
      statusCode: options.statusCode,
      url: options.url,
    },
  });
}

/**
 * Create protocol-specific error
 */
export function createProtocolError(
  message: string,
  context: ErrorContext,
  options: {
    code?: string;
    protocolVersion?: string;
    supportedVersions?: string[];
  } = {}
): ProtocolError {
  return createError('protocol', message, context, {
    code: options.code || 'PROTOCOL_ERROR',
    retryable: false,
    details: {
      protocolVersion: options.protocolVersion,
      supportedVersions: options.supportedVersions,
    },
  });
}

// ============================================================================
// Widget-Specific Errors
// ============================================================================

/**
 * Create widget rendering error
 */
export function createWidgetError(
  message: string,
  context: ErrorContext,
  options: {
    code?: string;
    widgetType?: string;
    renderingStep?: string;
  } = {}
): ProtocolError {
  return createError('widget', message, context, {
    code: options.code || 'WIDGET_ERROR',
    retryable: true,
    details: {
      widgetType: options.widgetType,
      renderingStep: options.renderingStep,
    },
  });
}

// ============================================================================
// Error Response Formatting
// ============================================================================

/**
 * Format error response based on client type
 */
export function formatErrorResponse(
  error: ProtocolError
): {
  response: unknown;
  headers: Record<string, string>;
  statusCode: number;
} {
  const baseResponse = {
    success: false,
    clientType: error.clientType,
    timestamp: error.timestamp,
    error: {
      type: error.type,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      context: error.context,
    },
    metadata: {
      protocolVersion: error.clientType === 'openai-apps' ? 'apps-schema-v1.0' : '2.0',
      features: ['error-handling', 'dual-protocol'],
    },
  };

  let statusCode = 500;
  let headers = { 'Content-Type': 'application/json' };

  switch (error.type) {
    case 'validation':
      statusCode = 400;
      break;
    case 'protocol':
      statusCode = 415; // Unsupported Media Type
      break;
    case 'network':
      statusCode = 502; // Bad Gateway
      break;
    case 'calculation':
    case 'widget':
      statusCode = 500;
      break;
    case 'timeout':
      statusCode = 408; // Request Timeout
      break;
  }

  // Add protocol-specific formatting
  if (error.clientType === 'openai-apps') {
    // Add widget for error display
    return {
      response: {
        ...baseResponse,
        data: {
          success: false,
          widget: createErrorWidget(error),
        },
      },
      headers,
      statusCode,
    };
  }

  return {
    response: baseResponse,
    headers,
    statusCode,
  };
}

/**
 * Create error widget for OpenAI Apps clients
 */
function createErrorWidget(error: ProtocolError) {
  const suggestions = getErrorSuggestions(error);

  return {
    type: 'error',
    layout: 'vertical',
    title: getErrorTitle(error),
    description: error.message,
    sections: [
      {
        title: 'Error Details',
        type: 'error',
        content: `Error Type: ${error.type}${error.code ? ` (${error.code})` : ''}`,
        data: {
          errorType: error.type,
          errorCode: error.code,
          retryable: error.retryable,
        },
      },
    ],
    actions: error.retryable ? [
      {
        type: 'retry',
        label: 'Try Again',
        description: 'Retry the operation with the same parameters',
        enabled: true,
        priority: 'primary',
      },
      {
        type: 'help',
        label: 'Get Help',
        description: 'View troubleshooting tips and suggestions',
        enabled: true,
        priority: 'secondary',
      },
    ] : [
      {
        type: 'help',
        label: 'View Details',
        description: 'View detailed error information and solutions',
        enabled: true,
        priority: 'primary',
      },
    ],
    data: {
      suggestions,
      context: error.context,
    },
  };
}

/**
 * Get error title based on error type
 */
function getErrorTitle(error: ProtocolError): string {
  switch (error.type) {
    case 'validation':
      return 'Invalid Input';
    case 'calculation':
      return 'Calculation Error';
    case 'network':
      return 'Connection Error';
    case 'widget':
      return 'Display Error';
    case 'protocol':
      return 'Protocol Error';
    case 'timeout':
      return 'Request Timeout';
    default:
      return 'Error';
  }
}

/**
 * Get helpful suggestions for error resolution
 */
function getErrorSuggestions(error: ProtocolError): string[] {
  const suggestions: string[] = [];

  switch (error.type) {
    case 'validation':
      suggestions.push('Check your input values and try again');
      if (error.context?.field) {
        suggestions.push(`Verify the ${error.context.field} field format`);
      }
      break;
    case 'calculation':
      suggestions.push('Try again with valid input parameters');
      suggestions.push('Ensure your dates are within a reasonable range');
      break;
    case 'network':
      suggestions.push('Check your internet connection');
      suggestions.push('Try again in a few moments');
      break;
    case 'widget':
      suggestions.push('Refresh the page and try again');
      suggestions.push('Try using a different browser or device');
      break;
    case 'protocol':
      suggestions.push('Update your client to the latest version');
      suggestions.push('Contact support for assistance');
      break;
    case 'timeout':
      suggestions.push('Try again with simpler parameters');
      suggestions.push('Check your internet connection speed');
      break;
  }

  return suggestions;
}

// ============================================================================
// Error Logging and Monitoring
// ============================================================================

/**
 * Log error with appropriate context and level
 */
export function logError(error: ProtocolError, logger = console): void {
  const logData = {
    type: error.type,
    code: error.code,
    message: error.message,
    clientType: error.clientType,
    retryable: error.retryable,
    context: error.context,
    timestamp: error.timestamp,
  };

  // Use appropriate log level based on error severity
  if (error.type === 'validation') {
    logger.warn('Validation Error:', logData);
  } else if (error.type === 'network' || error.type === 'timeout') {
    logger.warn('Temporary Error:', logData);
  } else {
    logger.error('Server Error:', logData);
  }
}

/**
 * Check if error should be reported to monitoring system
 */
export function shouldReportError(error: ProtocolError): boolean {
  // Don't report validation errors (user error)
  if (error.type === 'validation') {
    return false;
  }

  // Always report server errors
  if (error.type === 'calculation' || error.type === 'widget') {
    return true;
  }

  // Report network errors that persist
  if (error.type === 'network' || error.type === 'timeout') {
    return true;
  }

  // Protocol errors might indicate client issues
  return error.clientType === 'mcp'; // Only report MCP protocol errors
}