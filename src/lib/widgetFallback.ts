/**
 * Widget Rendering Fallback System
 * Provides graceful degradation when OpenAI Apps widget rendering fails
 * Ensures users can still access calculation results with fallback interfaces
 */

import type { WidgetConfiguration, FormatterData, ClientType } from './responseFormatter.js';

// ============================================================================
// Fallback Types and Interfaces
// ============================================================================

export type FallbackLevel = 'none' | 'minimal' | 'enhanced' | 'full';

export interface WidgetRenderResult {
  success: boolean;
  fallbackLevel: FallbackLevel;
  widget?: WidgetConfiguration;
  fallbackWidget?: WidgetConfiguration;
  plainText: string;
  warnings: string[];
  errors: string[];
  metadata: {
    originalSize?: number;
    fallbackSize?: number;
    renderTime: number;
    strategy: string;
  };
}

export interface WidgetRenderContext {
  clientType: ClientType;
  userAgent?: string;
  capabilities: {
    supportsWidgets: boolean;
    supportsInteractiveElements: boolean;
    maxWidgetSize: number;
    maxResponseSize: number;
  };
  preferences: {
    verbose: boolean;
    showDetails: boolean;
    compactMode: boolean;
  };
}

export interface WidgetRenderError extends Error {
  type: 'widget_config_error' | 'render_timeout' | 'size_exceeded' | 'compatibility_error';
  code: string;
  originalError?: Error;
  context: {
    widgetType?: string;
    renderStep?: string;
    attempt?: number;
  };
}

// ============================================================================
// Main Widget Rendering with Fallback
// ============================================================================

/**
 * Render widget with automatic fallback on failure
 */
export async function renderWidgetWithFallback(
  data: FormatterData,
  context: WidgetRenderContext
): Promise<WidgetRenderResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    // Attempt full widget rendering first
    const result = await renderFullWidget(data, context);

    if (result.success) {
      return {
        ...result,
        renderTime: Date.now() - startTime,
      };
    }

    // If full widget fails, try enhanced fallback
    warnings.push('Full widget rendering failed, attempting enhanced fallback');
    const enhancedResult = await renderEnhancedFallback(data, context);

    if (enhancedResult.success) {
      return {
        ...enhancedResult,
        fallbackLevel: 'enhanced',
        renderTime: Date.now() - startTime,
      };
    }

    // If enhanced fails, try minimal fallback
    warnings.push('Enhanced fallback failed, attempting minimal fallback');
    const minimalResult = await renderMinimalFallback(data, context);

    return {
      ...minimalResult,
      fallbackLevel: 'minimal',
      warnings,
      renderTime: Date.now() - startTime,
      errors: [...errors, ...minimalResult.errors],
    };

  } catch (error) {
    // All rendering attempts failed, provide text-only fallback
    errors.push(`All widget rendering attempts failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    return {
      success: true,
      fallbackLevel: 'none',
      plainText: generatePlainTextResponse(data, context),
      warnings,
      errors,
      metadata: {
        renderTime: Date.now() - startTime,
        strategy: 'emergency-fallback',
      },
    };
  }
}

// ============================================================================
// Widget Rendering Strategies
// ============================================================================

/**
 * Attempt full widget rendering with all features
 */
async function renderFullWidget(
  data: FormatterData,
  context: WidgetRenderContext
): Promise<WidgetRenderResult> {
  try {
    // Validate widget configuration
    if (!data.widget) {
      throw new WidgetRenderError('No widget configuration provided', 'widget_config_error', {
        code: 'NO_WIDGET_CONFIG',
      });
    }

    // Check size constraints
    const widgetSize = estimateWidgetSize(data.widget);
    if (widgetSize > context.capabilities.maxWidgetSize) {
      throw new WidgetRenderError(
        `Widget too large: ${widgetSize} bytes`,
        'size_exceeded',
        {
          code: 'WIDGET_TOO_LARGE',
          context: { widgetType: data.widget.type },
        }
      );
    }

    // Simulate widget rendering (in real implementation, this would render actual widget)
    const renderSuccess = await simulateWidgetRendering(data.widget, context);

    if (!renderSuccess) {
      throw new WidgetRenderError('Widget rendering simulation failed', 'render_timeout', {
        code: 'RENDER_SIMULATION_FAILED',
        context: { widgetType: data.widget.type },
      });
    }

    return {
      success: true,
      fallbackLevel: 'full',
      widget: data.widget,
      plainText: generatePlainTextResponse(data, context),
      warnings: [],
      errors: [],
      metadata: {
        originalSize: widgetSize,
        renderTime: 0,
        strategy: 'full-widget',
      },
    };

  } catch (error) {
    if (error instanceof WidgetRenderError) {
      throw error;
    }

    throw new WidgetRenderError(
      `Widget rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'render_timeout',
      {
        code: 'WIDGET_RENDER_FAILED',
        originalError: error instanceof Error ? error : undefined,
        context: { widgetType: data.widget?.type },
      }
    );
  }
}

/**
 * Enhanced fallback with simplified widget and rich text
 */
async function renderEnhancedFallback(
  data: FormatterData,
  context: WidgetRenderContext
): Promise<WidgetRenderResult> {
  try {
    // Create simplified widget configuration
    const simplifiedWidget = createSimplifiedWidget(data);

    // Validate simplified widget
    const widgetSize = estimateWidgetSize(simplifiedWidget);
    if (widgetSize > context.capabilities.maxWidgetSize) {
      throw new WidgetRenderError('Simplified widget still too large', 'size_exceeded', {
        code: 'SIMPLIFIED_WIDGET_TOO_LARGE',
      });
    }

    // Simulate enhanced widget rendering
    const renderSuccess = await simulateWidgetRendering(simplifiedWidget, context);

    if (!renderSuccess) {
      throw new WidgetRenderError('Enhanced fallback rendering failed', 'render_timeout', {
        code: 'ENHANCED_FALLBACK_FAILED',
      });
    }

    return {
      success: true,
      fallbackLevel: 'enhanced',
      fallbackWidget: simplifiedWidget,
      plainText: generateEnhancedPlainText(data, context),
      warnings: ['Using simplified widget due to rendering constraints'],
      errors: [],
      metadata: {
        fallbackSize: widgetSize,
        renderTime: 0,
        strategy: 'enhanced-fallback',
      },
    };

  } catch (error) {
    throw new WidgetRenderError(
      `Enhanced fallback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'render_timeout',
      {
        code: 'ENHANCED_FALLBACK_ERROR',
        originalError: error instanceof Error ? error : undefined,
      }
    );
  }
}

/**
 * Minimal fallback with basic information widget
 */
async function renderMinimalFallback(
  data: FormatterData,
  context: WidgetRenderContext
): Promise<WidgetRenderResult> {
  try {
    // Create minimal info widget
    const minimalWidget = createMinimalWidget(data);

    // Always succeeds as it's just basic info
    const renderSuccess = await simulateWidgetRendering(minimalWidget, context);

    return {
      success: true,
      fallbackLevel: 'minimal',
      fallbackWidget: minimalWidget,
      plainText: generateMinimalPlainText(data, context),
      warnings: ['Using minimal fallback - limited functionality available'],
      errors: [],
      metadata: {
        fallbackSize: estimateWidgetSize(minimalWidget),
        renderTime: 0,
        strategy: 'minimal-fallback',
      },
    };

  } catch (error) {
    // Even minimal fallback shouldn't fail, but just in case
    return {
      success: true,
      fallbackLevel: 'none',
      plainText: generatePlainTextResponse(data, context),
      warnings: ['Minimal fallback failed, providing plain text only'],
      errors: [`Minimal fallback error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      metadata: {
        renderTime: 0,
        strategy: 'emergency-fallback',
      },
    };
  }
}

// ============================================================================
// Widget Creation Functions
// ============================================================================

/**
 * Create simplified widget from original data
 */
function createSimplifiedWidget(data: FormatterData): WidgetConfiguration {
  return {
    type: 'result',
    layout: 'vertical',
    title: 'TPASS Calculation Result',
    description: `${data.recommendation === 'BUY_TPASS' ? 'Buy' : 'Don\'t buy'} TPASS - Save ${data.savings} NTD`,
    sections: [
      {
        title: 'Summary',
        type: 'summary',
        content: generateConciseExplanation(data),
        data: {
          recommendation: data.recommendation,
          savings: data.savings,
          savingsPercentage: data.savingsPercentage,
        },
      },
    ],
    actions: [
      {
        type: 'recalculate',
        label: 'Recalculate',
        description: 'Run calculation again with same parameters',
        enabled: true,
        priority: 'primary',
      },
    ],
  };
}

/**
 * Create minimal info widget
 */
function createMinimalWidget(data: FormatterData): WidgetConfiguration {
  return {
    type: 'info',
    layout: 'vertical',
    title: 'Calculation Complete',
    description: `${data.recommendation} - ${data.savings} NTD savings`,
    sections: [
      {
        title: 'Result',
        type: 'summary',
        content: `${data.recommendation}: Save ${data.savings} NTD (${data.savingsPercentage}%)`,
      },
    ],
    actions: [
      {
        type: 'help',
        label: 'More Info',
        description: 'Get detailed explanation',
        enabled: true,
        priority: 'secondary',
      },
    ],
  };
}

// ============================================================================
// Text Generation Functions
// ============================================================================

/**
 * Generate plain text response for text-only fallback
 */
function generatePlainTextResponse(data: FormatterData, context: WidgetRenderContext): string {
  let response = `TPASS Calculation Results\n\n`;

  response += `Recommendation: ${data.recommendation === 'BUY_TPASS' ? 'Buy TPASS' : 'Use Regular Fare'}\n`;
  response += `TPASS Cost: ${data.tpassCost} NTD\n`;
  response += `Regular Cost: ${data.regularCost} NTD\n`;
  response += `Savings: ${data.savings} NTD (${data.savingsPercentage}%)\n\n`;

  response += `Explanation:\n${data.explanation}\n\n`;

  if (context.preferences.verbose && data.calculationDetails) {
    response += `Details:\n`;
    response += `- Working Days: ${data.calculationDetails.workingDays}\n`;
    response += `- Total Trips: ${data.calculationDetails.totalTrips}\n`;
    response += `- Discount Rate: ${(data.calculationDetails.discountRate * 100).toFixed(0)}%\n`;

    if (data.calculationDetails.crossMonthDetails?.isCrossMonth) {
      response += `- Cross-month calculation\n`;
      if (data.calculationDetails.crossMonthDetails.monthlyBreakdown) {
        response += `\nMonthly Breakdown:\n`;
        for (const month of data.calculationDetails.crossMonthDetails.monthlyBreakdown.slice(0, 3)) {
          response += `  ${month.month}: ${month.trips} trips, ${month.cost} NTD\n`;
        }
      }
    }
  }

  response += `\nTo get interactive widgets, ensure your client supports OpenAI Apps SDK widgets.`;

  return response;
}

/**
 * Generate enhanced plain text for enhanced fallback
 */
function generateEnhancedPlainText(data: FormatterData, context: WidgetRenderContext): string {
  let response = `🚌 TPASS Calculator - Simplified View\n\n`;

  response += `**Recommendation:** ${data.recommendation === 'BUY_TPASS' ? '✅ Buy TPASS' : '❌ Use Regular Fare'}\n\n`;

  response += `**Cost Comparison:**\n`;
  response += `• TPASS: ${data.tpassCost} NTD\n`;
  response += `• Regular: ${data.regularCost} NTD\n`;
  response += `• **You Save:** ${data.savings} NTD (${data.savingsPercentage}%)\n\n`;

  response += `**Explanation:**\n${data.explanation}\n\n`;

  if (context.preferences.showDetails && data.calculationDetails) {
    response += `**Calculation Details:**\n`;
    response += `• Working Days: ${data.calculationDetails.workingDays}\n`;
    response += `• Total Trips: ${data.calculationDetails.totalTrips}\n`;
    response += `• Discount Tier: ${data.calculationDetails.discountTier}\n`;

    if (data.calculationDetails.crossMonthDetails?.isCrossMonth) {
      response += `• Cross-month calculation applied\n`;
    }
  }

  return response;
}

/**
 * Generate minimal plain text for minimal fallback
 */
function generateMinimalPlainText(data: FormatterData, context: WidgetRenderContext): string {
  return `${data.recommendation === 'BUY_TPASS' ? 'Buy' : 'Don\'t buy'} TPASS: Save ${data.savings} NTD (${data.savingsPercentage}%)`;
}

/**
 * Generate concise explanation for simplified widget
 */
function generateConciseExplanation(data: FormatterData): string {
  if (data.recommendation === 'BUY_TPASS') {
    return `Buy TPASS and save ${data.savings} NTD (${data.savingsPercentage}%). TPASS costs ${data.tpassCost} NTD vs ${data.regularCost} NTD regular fare.`;
  } else {
    return `Use regular fare and save ${Math.abs(data.savings)} NTD. Regular fare (${data.regularCost} NTD) is cheaper than TPASS (${data.tpassCost} NTD).`;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Estimate widget size in bytes
 */
function estimateWidgetSize(widget: WidgetConfiguration): number {
  return JSON.stringify(widget).length;
}

/**
 * Simulate widget rendering process
 */
async function simulateWidgetRendering(
  widget: WidgetConfiguration,
  context: WidgetRenderContext
): Promise<boolean> {
  // Simulate processing time and potential failures
  const processingTime = Math.random() * 100 + 50; // 50-150ms

  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate occasional failures (5% chance)
      const shouldFail = Math.random() < 0.05;
      resolve(!shouldFail);
    }, processingTime);
  });
}

/**
 * Check if client supports widgets
 */
export function supportsWidgets(userAgent?: string): boolean {
  if (!userAgent) {
    return false;
  }

  const lowerUA = userAgent.toLowerCase();

  // Known OpenAI Apps compatible clients
  const supportedPatterns = [
    /openai-mcp/i,
    /openai.*apps/i,
    /chatgpt/i,
  ];

  return supportedPatterns.some(pattern => pattern.test(lowerUA));
}

/**
 * Get recommended fallback level based on client capabilities
 */
export function getRecommendedFallbackLevel(
  userAgent?: string,
  preferences?: { verbose: boolean; compact: boolean }
): FallbackLevel {
  if (!supportsWidgets(userAgent)) {
    return 'none';
  }

  if (preferences?.compact) {
    return 'minimal';
  }

  if (preferences?.verbose) {
    return 'enhanced';
  }

  return 'enhanced'; // Default to enhanced for better UX
}