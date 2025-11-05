/**
 * OpenAI Apps SDK adapter with user-agent aware routing and widget support
 * Provides integration layer for OpenAI Apps with dual-protocol compatibility
 */

import { calculateTPASSComparison, getDiscountInfo } from '../../services/calculator.js';
import { parseDate, formatDate } from '../../lib/utils.js';
import { getDiscountTierDescription } from '../../models/discount.js';
import { openAIFunctionSchemas, createWidgetEnhancedFunction } from './functions.js';
import { detectUserAgent } from '../../lib/userAgentDetection.js';
import { createResultWidget, createFormWidget, createErrorWidget } from './widgets.js';
import { renderWidgetWithFallback } from '../../lib/widgetFallback.js';
import { validateMessageSize, createTruncationStrategy } from '../../lib/messageValidator.js';
import type { UserAgentInfo } from '../../lib/userAgentDetection.js';
import type { WidgetConfiguration, FormatterData } from '../../lib/responseFormatter.js';

/**
 * OpenAI function call parameters
 */
interface OpenAIFunctionCall {
  name: string;
  arguments: string; // JSON string
}

/**
 * Handle calculateTPASSComparison function call
 */
async function handleCalculateTPASSComparison(args: {
  startDate?: string;
  oneWayFare?: number;
  tripsPerDay?: number;
  customWorkingDays?: number;
}): Promise<Record<string, unknown>> {
  try {
    // Parse parameters
    const startDate = args.startDate ? parseDate(args.startDate) : new Date();
    const oneWayFare = args.oneWayFare;
    const tripsPerDay = args.tripsPerDay;
    const customWorkingDays = args.customWorkingDays;

    // Calculate comparison
    const result = await calculateTPASSComparison({
      startDate,
      oneWayFare,
      tripsPerDay,
      customWorkingDays,
    });

    // Format response according to OpenAI Apps schema
    return {
      recommendation: result.recommendation,
      tpassCost: result.tpassCost,
      regularCost: result.regularCost,
      savings: Math.abs(result.savingsAmount),
      savingsPercentage: Math.abs(result.savingsPercentage),
      explanation: result.recommendationReason,
      calculationDetails: {
        workingDays: result.period.workingDays,
        totalTrips: result.totalTrips,
        discountRate: result.appliedDiscount.discountRate,
        discountTier: getDiscountTierDescription(result.appliedDiscount),
        validityPeriod: {
          start: formatDate(result.period.startDate),
          end: formatDate(result.period.endDate),
        },
      },
    };
  } catch (error) {
    throw new Error(`Calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle getDiscountInformation function call
 */
async function handleGetDiscountInformation(): Promise<Record<string, unknown>> {
  try {
    const info = getDiscountInfo();

    // Format response according to OpenAI Apps schema
    return {
      frequentRiderProgram: {
        discountTiers: info.frequentRiderProgram.discountTiers,
        resetCycle: info.frequentRiderProgram.resetCycle,
        eligibility: info.frequentRiderProgram.eligibility,
      },
      tpassProgram: {
        price: info.tpassProgram.price,
        validity: info.tpassProgram.validity,
        benefits: info.tpassProgram.benefits,
        coverage: info.tpassProgram.coverage,
      },
      comparisonTip: info.comparisonTip,
    };
  } catch (error) {
    throw new Error(`Failed to get discount info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Route OpenAI function calls to appropriate handlers
 */
export async function handleOpenAIFunctionCall(
  functionCall: OpenAIFunctionCall
): Promise<Record<string, unknown>> {
  const args = JSON.parse(functionCall.arguments);

  switch (functionCall.name) {
    case 'calculateTPASSComparison':
      return handleCalculateTPASSComparison(args);
    case 'getDiscountInformation':
      return handleGetDiscountInformation();
    default:
      throw new Error(`Unknown function: ${functionCall.name}`);
  }
}

/**
 * Get OpenAI function definitions for registration
 */
export function getOpenAIFunctions() {
  return openAIFunctionSchemas;
}

/**
 * OpenAI Apps configuration
 */
export const openAIAppConfig = {
  name: 'taipei-metro-tpass',
  version: '1.0.0',
  description: 'TPASS monthly pass calculator for Taipei Metro',
  functions: openAIFunctionSchemas,
};
