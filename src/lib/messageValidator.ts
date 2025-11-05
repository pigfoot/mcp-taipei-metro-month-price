/**
 * OpenAI Message Size Validation and Truncation Utilities
 * Ensures responses comply with OpenAI Apps message size limits
 * and provides graceful degradation for large responses
 */

import type { WidgetConfiguration, FormatterData } from './responseFormatter.js';

// ============================================================================
// Constants and Limits
// ============================================================================

/**
 * OpenAI message size limits (approximate values based on documentation)
 */
export const OPENAI_LIMITS = {
  MAX_MESSAGE_SIZE: 128 * 1024, // 128KB per message
  MAX_FUNCTION_CALL_SIZE: 64 * 1024, // 64KB for function call data
  MAX_WIDGET_SIZE: 32 * 1024, // 32KB for widget configurations
  MAX_STRING_LENGTH: 100 * 1024, // 100KB for string content
  MAX_TOTAL_TOKENS: 4000, // Approximate token limit for responses
} as const;

/**
 * Severity levels for truncation decisions
 */
export type TruncationSeverity = 'none' | 'minimal' | 'moderate' | 'aggressive';

/**
 * Truncation strategy options
 */
export interface TruncationStrategy {
  severity: TruncationSeverity;
  preserveMetadata: boolean;
  preserveCalculationDetails: boolean;
  preserveWidget: boolean;
  maxStringLength: number;
  compressNumbers: boolean;
}

// ============================================================================
// Validation Results
// ============================================================================

/**
 * Result of message size validation
 */
export interface ValidationResult {
  isValid: boolean;
  currentSize: number;
  limit: number;
  severity: TruncationSeverity;
  issues: ValidationIssue[];
  recommendations: string[];
}

/**
 * Individual validation issue
 */
export interface ValidationIssue {
  type: 'size_exceeded' | 'string_too_long' | 'widget_too_large' | 'too_many_details';
  field: string;
  currentSize: number;
  limit?: number;
  suggestion: string;
}

/**
 * Truncation result
 */
export interface TruncationResult {
  truncated: boolean;
  originalSize: number;
  finalSize: number;
  strategy: TruncationStrategy;
  removedFields: string[];
  appliedTruncations: TruncationApplied[];
}

/**
 * Individual truncation that was applied
 */
export interface TruncationApplied {
  field: string;
  originalSize: number;
  finalSize: number;
  method: 'string_truncate' | 'number_round' | 'remove_details' | 'compress_widget' | 'remove_section';
  reason: string;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate response size for OpenAI Apps compatibility
 */
export function validateMessageSize(
  data: unknown,
  options: {
    limit?: number;
    strictMode?: boolean;
  } = {}
): ValidationResult {
  const limit = options.limit || OPENAI_LIMITS.MAX_MESSAGE_SIZE;
  const currentSize = calculateSize(data);
  const issues: ValidationIssue[] = [];
  const recommendations: string[] = [];

  // Check overall message size
  if (currentSize > limit) {
    issues.push({
      type: 'size_exceeded',
      field: 'message',
      currentSize,
      limit,
      suggestion: 'Consider truncating long text fields or removing detailed information',
    });
  }

  // Check string fields
  if (typeof data === 'object' && data !== null) {
    const stringIssues = validateStringFields(data as Record<string, unknown>);
    issues.push(...stringIssues);
  }

  // Determine severity
  const severity = determineSeverity(currentSize, limit, issues.length);

  // Generate recommendations
  if (issues.length > 0) {
    recommendations.push(...generateRecommendations(issues, currentSize, limit));
  }

  return {
    isValid: currentSize <= limit,
    currentSize,
    limit,
    severity,
    issues,
    recommendations,
  };
}

/**
 * Calculate approximate size of data in bytes
 */
function calculateSize(data: unknown): number {
  if (typeof data === 'string') {
    return data.length;
  }

  if (typeof data === 'number') {
    return 8; // Approximate size of a number
  }

  if (typeof data === 'boolean') {
    return 4; // Approximate size of a boolean
  }

  if (data === null || data === undefined) {
    return 0;
  }

  if (Array.isArray(data)) {
    return data.reduce((sum, item) => sum + calculateSize(item), 0);
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    let totalSize = 0;

    // Add overhead for object structure
    totalSize += Object.keys(obj).length * 50; // Approximate object overhead

    // Add size of each property
    for (const [key, value] of Object.entries(obj)) {
      totalSize += key.length * 2; // UTF-16 encoding
      totalSize += calculateSize(value);
    }

    return totalSize;
  }

  return 0;
}

/**
 * Validate string fields for length limits
 */
function validateStringFields(obj: Record<string, unknown>): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.length > OPENAI_LIMITS.MAX_STRING_LENGTH) {
      issues.push({
        type: 'string_too_long',
        field: key,
        currentSize: value.length,
        limit: OPENAI_LIMITS.MAX_STRING_LENGTH,
        suggestion: `Truncate string to ${OPENAI_LIMITS.MAX_STRING_LENGTH} characters`,
      });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedIssues = validateStringFields(value as Record<string, unknown>);
      issues.push(...nestedIssues);
    }
  }

  return issues;
}

/**
 * Determine truncation severity based on size and issues
 */
function determineSeverity(currentSize: number, limit: number, issueCount: number): TruncationSeverity {
  const ratio = currentSize / limit;

  if (ratio <= 0.7 && issueCount === 0) {
    return 'none';
  } else if (ratio <= 0.85 && issueCount <= 2) {
    return 'minimal';
  } else if (ratio <= 1.0 && issueCount <= 5) {
    return 'moderate';
  } else {
    return 'aggressive';
  }
}

/**
 * Generate recommendations for fixing validation issues
 */
function generateRecommendations(issues: ValidationIssue[], currentSize: number, limit: number): string[] {
  const recommendations: string[] = [];

  const sizeExceeded = issues.find(i => i.type === 'size_exceeded');
  if (sizeExceeded) {
    recommendations.push('Remove verbose explanations or detailed breakdowns');
    recommendations.push('Compress numeric values or round to fewer decimal places');
    recommendations.push('Consider using abbreviated field names');
  }

  const stringTooLong = issues.filter(i => i.type === 'string_too_long');
  if (stringTooLong.length > 0) {
    recommendations.push('Truncate long text fields to essential information');
    recommendations.push('Use bullet points instead of long paragraphs');
  }

  const widgetTooLarge = issues.find(i => i.type === 'widget_too_large');
  if (widgetTooLarge) {
    recommendations.push('Simplify widget configuration or remove optional sections');
    recommendations.push('Use compact widget layouts');
  }

  if (currentSize > limit * 1.2) {
    recommendations.push('Consider splitting response into multiple messages');
    recommendations.push('Use progressive disclosure pattern for detailed information');
  }

  return recommendations;
}

// ============================================================================
// Truncation Functions
// ============================================================================

/**
 * Truncate response data to meet size requirements
 */
export function truncateResponse(
  data: FormatterData,
  strategy: TruncationStrategy
): TruncationResult {
  const originalSize = calculateSize(data);
  const removedFields: string[] = [];
  const appliedTruncations: TruncationApplied[] = [];

  // Create a deep copy to avoid mutating original data
  const truncated = JSON.parse(JSON.stringify(data));

  // Apply truncation strategies
  if (strategy.preserveMetadata) {
    // Keep metadata minimal
    if (truncated.calculationDetails?.crossMonthDetails?.monthlyBreakdown) {
      const originalBreakdownSize = calculateSize(truncated.calculationDetails.crossMonthDetails.monthlyBreakdown);
      truncated.calculationDetails.crossMonthDetails.monthlyBreakdown =
        truncateMonthlyBreakdown(truncated.calculationDetails.crossMonthDetails.monthlyBreakdown, strategy);

      appliedTruncations.push({
        field: 'calculationDetails.crossMonthDetails.monthlyBreakdown',
        originalSize: originalBreakdownSize,
        finalSize: calculateSize(truncated.calculationDetails.crossMonthDetails.monthlyBreakdown),
        method: 'remove_details',
        reason: 'Monthly breakdown truncation',
      });
    }
  }

  // Truncate explanations if too long
  if (truncated.explanation && truncated.explanation.length > strategy.maxStringLength) {
    const originalLength = truncated.explanation.length;
    truncated.explanation = truncateString(truncated.explanation, strategy.maxStringLength);

    appliedTruncations.push({
      field: 'explanation',
      originalSize: originalLength,
      finalSize: truncated.explanation.length,
      method: 'string_truncate',
      reason: 'Explanation length reduction',
    });
  }

  // Handle widget truncation
  if (strategy.preserveWidget && truncated.widget) {
    const originalWidgetSize = calculateSize(truncated.widget);
    truncated.widget = truncateWidget(truncated.widget, strategy);

    appliedTruncations.push({
      field: 'widget',
      originalSize: originalWidgetSize,
      finalSize: calculateSize(truncated.widget),
      method: 'compress_widget',
      reason: 'Widget configuration compression',
    });
  }

  // Remove non-essential details in aggressive mode
  if (strategy.severity === 'aggressive') {
    if (truncated.calculationDetails?.crossMonthDetails) {
      const originalDetailsSize = calculateSize(truncated.calculationDetails.crossMonthDetails);
      delete truncated.calculationDetails.crossMonthDetails;
      removedFields.push('calculationDetails.crossMonthDetails');

      appliedTruncations.push({
        field: 'calculationDetails.crossMonthDetails',
        originalSize: originalDetailsSize,
        finalSize: 0,
        method: 'remove_details',
        reason: 'Aggressive truncation - removing cross-month details',
      });
    }
  }

  const finalSize = calculateSize(truncated);

  return {
    truncated: finalSize < originalSize,
    originalSize,
    finalSize,
    strategy,
    removedFields,
    appliedTruncations,
  };
}

/**
 * Truncate string to maximum length with ellipsis
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }

  const ellipsis = '...';
  const availableLength = maxLength - ellipsis.length;

  if (availableLength <= 0) {
    return ellipsis;
  }

  return str.substring(0, availableLength) + ellipsis;
}

/**
 * Truncate monthly breakdown array
 */
function truncateMonthlyBreakdown(
  breakdown: Array<{ month: string; workingDays: number; trips: number; cost: number }>,
  strategy: TruncationStrategy
): Array<{ month: string; workingDays: number; trips: number; cost: number }> {
  const maxItems = strategy.severity === 'aggressive' ? 3 :
                   strategy.severity === 'moderate' ? 6 : breakdown.length;

  return breakdown.slice(0, maxItems);
}

/**
 * Truncate widget configuration
 */
function truncateWidget(widget: WidgetConfiguration, strategy: TruncationStrategy): WidgetConfiguration {
  const truncated = { ...widget };

  // Truncate sections if too many
  if (truncated.sections && truncated.sections.length > 5) {
    const maxSections = strategy.severity === 'aggressive' ? 3 : 5;
    truncated.sections = truncated.sections.slice(0, maxSections);
  }

  // Truncate section content
  if (truncated.sections) {
    truncated.sections = truncated.sections.map(section => ({
      ...section,
      content: truncateString(section.content, strategy.maxStringLength / 10),
    }));
  }

  // Limit actions
  if (truncated.actions && truncated.actions.length > 3) {
    truncated.actions = truncated.actions.slice(0, 3);
  }

  return truncated;
}

// ============================================================================
// Strategy Factory
// ============================================================================

/**
 * Create truncation strategy based on validation result
 */
export function createTruncationStrategy(validation: ValidationResult): TruncationStrategy {
  switch (validation.severity) {
    case 'none':
      return {
        severity: 'none',
        preserveMetadata: true,
        preserveCalculationDetails: true,
        preserveWidget: true,
        maxStringLength: OPENAI_LIMITS.MAX_STRING_LENGTH,
        compressNumbers: false,
      };

    case 'minimal':
      return {
        severity: 'minimal',
        preserveMetadata: true,
        preserveCalculationDetails: true,
        preserveWidget: true,
        maxStringLength: Math.floor(OPENAI_LIMITS.MAX_STRING_LENGTH * 0.8),
        compressNumbers: false,
      };

    case 'moderate':
      return {
        severity: 'moderate',
        preserveMetadata: true,
        preserveCalculationDetails: false,
        preserveWidget: true,
        maxStringLength: Math.floor(OPENAI_LIMITS.MAX_STRING_LENGTH * 0.6),
        compressNumbers: true,
      };

    case 'aggressive':
      return {
        severity: 'aggressive',
        preserveMetadata: false,
        preserveCalculationDetails: false,
        preserveWidget: true,
        maxStringLength: Math.floor(OPENAI_LIMITS.MAX_STRING_LENGTH * 0.4),
        compressNumbers: true,
      };

    default:
      return createTruncationStrategy({ ...validation, severity: 'moderate' });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if response needs truncation
 */
export function needsTruncation(data: unknown, limit = OPENAI_LIMITS.MAX_MESSAGE_SIZE): boolean {
  return calculateSize(data) > limit;
}

/**
 * Get human-readable size description
 */
export function getSizeDescription(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} bytes`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Estimate token count from byte size (approximate)
 */
export function estimateTokenCount(bytes: number): number {
  // Rough estimation: 1 token ≈ 4 characters ≈ 4 bytes
  return Math.ceil(bytes / 4);
}

/**
 * Check if response is within reasonable token limits
 */
export function checkTokenLimits(data: unknown): {
  estimatedTokens: number;
  withinLimits: boolean;
  recommendations: string[];
} {
  const size = calculateSize(data);
  const estimatedTokens = estimateTokenCount(size);
  const recommendations: string[] = [];

  if (estimatedTokens > OPENAI_LIMITS.MAX_TOTAL_TOKENS) {
    recommendations.push('Response may be too verbose for optimal token usage');
    recommendations.push('Consider summarizing key information');
    recommendations.push('Use bullet points for complex data');
  }

  return {
    estimatedTokens,
    withinLimits: estimatedTokens <= OPENAI_LIMITS.MAX_TOTAL_TOKENS,
    recommendations,
  };
}