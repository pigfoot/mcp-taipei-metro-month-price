/**
 * Response Formatter System
 * Generates appropriate response format based on client type (MCP or OpenAI Apps)
 * Supports widget-based interactions for OpenAI Apps with backward compatibility
 */

import type { UserAgentInfo } from './userAgentDetection.js';

// ============================================================================
// Core Interfaces
// ============================================================================

export interface ResponseFormatter {
  formatSuccess(data: FormatterData): Response;
  formatError(error: ErrorResponse): Response;
  formatInfo(message: string, metadata?: Record<string, unknown>): Response;
}

export type ClientType = 'mcp' | 'openai-apps';

export interface FormatterData {
  // Common calculation results
  recommendation: 'BUY_TPASS' | 'USE_REGULAR';
  tpassCost: number;
  regularCost: number;
  savings: number;
  savingsPercentage: number;
  explanation: string;

  // Optional detailed data
  calculationDetails?: {
    workingDays: number;
    totalTrips: number;
    discountRate: number;
    discountTier: string;
    validityPeriod: {
      start: string;
      end: string;
    };
    crossMonthDetails?: {
      isCrossMonth: boolean;
      monthlyBreakdown: Array<{
        month: string;
        workingDays: number;
        trips: number;
        cost: number;
      }>;
    };
  };

  // OpenAI Apps specific fields
  widget?: WidgetConfiguration;
  interactive?: InteractiveStep;
}

export interface ErrorResponse {
  type: 'validation' | 'calculation' | 'network' | 'widget' | 'protocol';
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  retryable: boolean;
  context?: {
    step?: number;
    field?: string;
    function?: string;
  };
}

// ============================================================================
// Widget Configuration (OpenAI Apps specific)
// ============================================================================

export interface WidgetConfiguration {
  type: 'form' | 'result' | 'error' | 'info';
  layout: 'vertical' | 'horizontal' | 'grid';
  title: string;
  description?: string;
  fields?: WidgetField[];
  sections?: WidgetSection[];
  actions?: WidgetAction[];
  data?: Record<string, unknown>;
}

export interface WidgetField {
  name: string;
  type: 'date-picker' | 'number-input' | 'dropdown' | 'text-input' | 'checkbox';
  label: string;
  description?: string;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: string[];
  };
  defaultValue?: unknown;
}

export interface WidgetSection {
  title: string;
  type: 'summary' | 'details' | 'breakdown' | 'tiers' | 'benefits' | 'tips' | 'error';
  content: string;
  data?: Record<string, unknown>;
}

export interface WidgetAction {
  type: 'submit' | 'next' | 'cancel' | 'retry' | 'recalculate' | 'detailed_view' | 'share' | 'help';
  label: string;
  description?: string;
  enabled?: boolean;
  priority?: 'primary' | 'secondary' | 'tertiary';
}

// ============================================================================
// Interactive Step Management (for multi-step processes)
// ============================================================================

export interface InteractiveStep {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  stepDescription?: string;
  stepType: 'input' | 'review' | 'result' | 'error';
  canProceed: boolean;
  nextStepConfig?: WidgetConfiguration;
  validationErrors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  suggestion?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface Response {
  success: boolean;
  clientType: ClientType;
  timestamp: string;
  data?: unknown;
  error?: ErrorResponse;
  metadata?: {
    processingTime: number;
    protocolVersion?: string;
    features?: string[];
  };
}

// ============================================================================
// Response Formatter Factory
// ============================================================================

/**
 * Create appropriate response formatter based on client type
 */
export function createResponseFormatter(clientType: ClientType): ResponseFormatter {
  switch (clientType) {
    case 'openai-apps':
      return new OpenAIAppsResponseFormatter();
    case 'mcp':
    default:
      return new MCPResponseFormatter();
  }
}

// ============================================================================
// MCP Response Formatter (JSON-RPC 2.0 compatible)
// ============================================================================

class MCPResponseFormatter implements ResponseFormatter {
  formatSuccess(data: FormatterData): any { // JSON-RPC 2.0 format
    const explanation = this.buildExplanation(data);

    return {
      jsonrpc: '2.0',
      id: Date.now(), // In real MCP, this would be the request ID
      result: {
        recommendation: data.recommendation,
        tpassCost: data.tpassCost,
        regularCost: data.regularCost,
        savings: data.savings,
        savingsPercentage: data.savingsPercentage,
        explanation,
        calculationDetails: data.calculationDetails,
      },
    };
  }

  formatError(error: ErrorResponse): any { // JSON-RPC 2.0 error format
    return {
      jsonrpc: '2.0',
      id: Date.now(), // In real MCP, this would be the request ID
      error: {
        code: error.code || -32603, // Internal error code
        message: error.message,
        data: error.data,
      },
    };
  }

  formatInfo(message: string, metadata?: Record<string, unknown>): any { // JSON-RPC 2.0 format
    return {
      jsonrpc: '2.0',
      id: Date.now(), // In real MCP, this would be the request ID
      result: {
        message,
        type: 'info',
        ...metadata,
      },
    };
  }

  private buildExplanation(data: FormatterData): string {
    const recommendation = data.recommendation === 'BUY_TPASS' ? 'buy TPASS' : 'use regular fare';
    const savingsText = data.savings > 0 ? `saving ${data.savings} NTD (${data.savingsPercentage}%)` : 'no savings';

    return `Based on your usage pattern, we recommend you ${recommendation}, ${savingsText}. ${data.explanation}`;
  }
}

// ============================================================================
// OpenAI Apps Response Formatter (with widget support)
// ============================================================================

class OpenAIAppsResponseFormatter implements ResponseFormatter {
  formatSuccess(data: FormatterData): Response {
    const explanation = this.buildExplanation(data);

    return {
      success: true,
      clientType: 'openai-apps',
      timestamp: new Date().toISOString(),
      data: {
        success: true,
        recommendation: data.recommendation,
        tpassCost: data.tpassCost,
        regularCost: data.regularCost,
        savings: data.savings,
        savingsPercentage: data.savingsPercentage,
        explanation,
        calculationDetails: data.calculationDetails,
        widget: data.widget,
        interactive: data.interactive,
      },
      metadata: {
        protocolVersion: 'apps-schema-v1.0',
        features: ['widget-support', 'interactive-steps', 'cross-month-breakdown'],
      },
    };
  }

  formatError(error: ErrorResponse): Response {
    // Create error widget for OpenAI Apps
    const errorWidget = this.createErrorWidget(error);

    return {
      success: false,
      clientType: 'openai-apps',
      timestamp: new Date().toISOString(),
      error,
      data: {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          context: error.context,
        },
        widget: errorWidget,
      },
      metadata: {
        protocolVersion: 'apps-schema-v1.0',
        features: ['error-widget', 'retry-guidance'],
      },
    };
  }

  formatInfo(message: string, metadata?: Record<string, unknown>): Response {
    const infoWidget = this.createInfoWidget(message, metadata);

    return {
      success: true,
      clientType: 'openai-apps',
      timestamp: new Date().toISOString(),
      data: {
        success: true,
        message,
        type: 'info',
        metadata,
        widget: infoWidget,
      },
      metadata: {
        protocolVersion: 'apps-schema-v1.0',
        features: ['info-widget'],
      },
    };
  }

  private buildExplanation(data: FormatterData): string {
    const recommendation = data.recommendation === 'BUY_TPASS' ? 'buy TPASS' : 'use regular fare';
    const savingsText = data.savings > 0 ? `saving ${data.savings} NTD (${data.savingsPercentage}%)` : 'no savings';

    return `Based on your usage pattern, we recommend you ${recommendation}, ${savingsText}. ${data.explanation}`;
  }

  private createErrorWidget(error: ErrorResponse): WidgetConfiguration {
    return {
      type: 'error',
      layout: 'vertical',
      title: 'Calculation Error',
      description: error.message,
      sections: [
        {
          title: 'Error Details',
          type: 'error',
          content: `Error Type: ${error.type}${error.code ? ` (${error.code})` : ''}`,
          data: { errorType: error.type, errorCode: error.code },
        },
      ],
      actions: error.retryable ? [
        {
          type: 'retry',
          label: 'Try Again',
          description: 'Retry the calculation with the same parameters',
          enabled: true,
          priority: 'primary',
        },
        {
          type: 'help',
          label: 'Get Help',
          description: 'View troubleshooting tips',
          enabled: true,
          priority: 'secondary',
        },
      ] : [
        {
          type: 'help',
          label: 'View Details',
          description: 'View detailed error information',
          enabled: true,
          priority: 'primary',
        },
      ],
    };
  }

  private createInfoWidget(message: string, metadata?: Record<string, unknown>): WidgetConfiguration {
    return {
      type: 'info',
      layout: 'vertical',
      title: 'Information',
      description: message,
      sections: metadata ? [
        {
          title: 'Additional Info',
          type: 'details',
          content: JSON.stringify(metadata, null, 2),
          data: metadata,
        },
      ] : undefined,
      actions: [
        {
          type: 'help',
          label: 'More Details',
          description: 'Get additional information about TPASS calculations',
          enabled: true,
          priority: 'secondary',
        },
      ],
    };
  }
}