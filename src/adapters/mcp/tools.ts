/**
 * MCP tool definitions for TPASS Calculator
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { calculateTPASSComparison, getDiscountInfo } from '../../services/calculator.js';
import { parseDate, formatDate, formatCurrency, formatPercentage } from '../../lib/utils.js';
import { getDiscountTierDescription } from '../../models/discount.js';

/**
 * Define MCP tools
 */
export const tools: Tool[] = [
  {
    name: 'calculate_fare',
    description:
      'Calculate and compare TPASS monthly pass vs regular fare with frequent rider discount',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Start date for TPASS validity period (YYYY-MM-DD). Defaults to today if not specified.',
        },
        oneWayFare: {
          type: 'number',
          description: 'One-way fare amount in NTD. Defaults to 40 if not specified.',
        },
        tripsPerDay: {
          type: 'number',
          description: 'Number of trips per working day. Defaults to 2 (round trip) if not specified.',
        },
        customWorkingDays: {
          type: 'number',
          description:
            'Override calculated working days with custom value (0-30). Optional.',
        },
      },
    },
  },
  {
    name: 'get_discount_info',
    description: 'Get information about Taipei Metro frequent rider discount tiers',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * Handle calculate_fare tool call
 */
export async function handleCalculateFare(args: {
  startDate?: string;
  oneWayFare?: number;
  tripsPerDay?: number;
  customWorkingDays?: number;
}): Promise<string> {
  try {
    // Parse and validate inputs
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

    // Format response
    const response = {
      tpassCost: result.tpassCost,
      regularCost: result.regularCost,
      regularCostBeforeDiscount: result.regularCostBeforeDiscount,
      savingsAmount: result.savingsAmount,
      savingsPercentage: result.savingsPercentage,
      recommendation: result.recommendation,
      recommendationReason: result.recommendationReason,
      details: {
        workingDays: result.period.workingDays,
        totalTrips: result.totalTrips,
        discountRate: result.appliedDiscount.discountRate,
        discountTier: getDiscountTierDescription(result.appliedDiscount),
        periodStart: formatDate(result.period.startDate),
        periodEnd: formatDate(result.period.endDate),
      },
      warnings: result.warnings,
    };

    return JSON.stringify(response, null, 2);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return JSON.stringify({ error: errorMessage }, null, 2);
  }
}

/**
 * Handle get_discount_info tool call
 */
export async function handleGetDiscountInfo(): Promise<string> {
  try {
    const info = getDiscountInfo();

    const response = {
      discountTiers: info.frequentRiderProgram.discountTiers,
      validityPeriod: 'Calendar month',
      resetCycle: info.frequentRiderProgram.resetCycle,
      tpassInfo: {
        price: info.tpassProgram.price,
        validityDays: info.tpassProgram.validity,
        benefits: info.tpassProgram.benefits.join(', '),
      },
      comparisonTip: info.comparisonTip,
    };

    return JSON.stringify(response, null, 2);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return JSON.stringify({ error: errorMessage }, null, 2);
  }
}

/**
 * Route tool calls to appropriate handlers
 */
export async function handleToolCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case 'calculate_fare':
      return handleCalculateFare(args as Parameters<typeof handleCalculateFare>[0]);
    case 'get_discount_info':
      return handleGetDiscountInfo();
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
