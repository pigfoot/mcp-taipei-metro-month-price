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
      'Calculate whether buying a TPASS monthly pass (NT$1280) is more cost-effective than paying regular fares with Taipei Metro frequent rider discount. ' +
      'Use this tool when users want to: (1) decide if TPASS is worth it for their commute pattern, (2) calculate monthly transportation costs, or (3) compare savings between TPASS and regular fare. ' +
      'Returns detailed cost breakdown, savings analysis, discount tier applied, a recommendation (BUY or SKIP TPASS), and IMPORTANTLY: a list of public holidays (including non-weekend holidays like 中秋節, 國慶日) that reduce working days in the period.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description:
            'Start date for TPASS validity period in YYYY-MM-DD format (e.g., "2025-11-01"). ' +
            'Defaults to today. TPASS is valid for 30 days from start date. ' +
            'Use this to calculate for future months or specific periods.',
        },
        oneWayFare: {
          type: 'number',
          description:
            'One-way fare amount in NTD (New Taiwan Dollar). Defaults to 40. ' +
            'Common values: 20-25 (short distance), 40-50 (typical commute), 60-65 (long distance). ' +
            'This represents the cost of a single journey without any discount applied.',
        },
        tripsPerDay: {
          type: 'number',
          description:
            'Number of trips per working day. Defaults to 2 (one round trip). ' +
            'Examples: 2 = home to office and back, 4 = commute + lunch trip. ' +
            'This parameter directly affects whether TPASS is cost-effective.',
        },
        customWorkingDays: {
          type: 'number',
          description:
            'Override auto-calculated working days (excludes weekends and holidays) with a custom value between 0-30. ' +
            'Optional. Use this if user has irregular work schedule (e.g., shift work, part-time). ' +
            'If not specified, system automatically calculates working days based on calendar.',
        },
      },
    },
  },
  {
    name: 'get_discount_info',
    description:
      'Get detailed information about Taipei Metro frequent rider discount program tiers and TPASS specifications. ' +
      'Use this tool when users want to: (1) understand how the discount system works, (2) see discount tier thresholds, or (3) learn about TPASS benefits. ' +
      'Call this BEFORE calculate_fare if user is unfamiliar with the discount program. ' +
      'Returns: discount tier structure (11+ rides = 20% off, 21+ rides = 25% off, etc.), TPASS price, validity period, and comparison tips.',
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
      holidays: result.holidayDetails
        ? {
            totalHolidays: result.holidayDetails.totalHolidays,
            list: result.holidayDetails.holidayList,
          }
        : undefined,
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
