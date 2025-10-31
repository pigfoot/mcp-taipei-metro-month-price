/**
 * MCP tool definitions for TPASS Calculator
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { calculateTPASSComparison, getDiscountInfo } from '../../services/calculator.js';
import { parseDate, formatDate, getNextWorkingDay } from '../../lib/utils.js';
import { getDiscountTierDescription } from '../../models/discount.js';
import { FareService } from '../../services/fareService.js';
import { CalendarService } from '../../services/calendar-service.js';
import type { FareLookupRequest } from '../../models/fare.js';

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
            'Defaults to the next working day (skips weekends and public holidays). ' +
            'TPASS is valid for 30 days from start date. ' +
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
  {
    name: 'lookup_fare',
    description:
      'Lookup Taipei Metro fare between two stations or validate manual fare input for TPASS calculations. ' +
      'Use this tool when users: (1) provide station names and want to find the fare automatically, (2) want to manually specify a fare amount, or (3) need fare information before calculating TPASS savings. ' +
      'Supports both regular (full price) and discounted fare types. ' +
      'If station names are not exact matches, returns suggestions for disambiguation. ' +
      'The returned fare can be used directly with calculate_fare tool.',
    inputSchema: {
      type: 'object',
      properties: {
        fare: {
          type: 'number',
          description:
            'Manual fare amount in NTD. Use this if you already know the fare. ' +
            'Cannot be used together with origin/destination. Must be a positive number.',
        },
        origin: {
          type: 'string',
          description:
            'Origin station name in Chinese (e.g., "台北車站", "淡水"). ' +
            'Required if using station-based lookup. Must be used together with destination. ' +
            'Supports fuzzy matching - system will suggest corrections if exact match not found.',
        },
        destination: {
          type: 'string',
          description:
            'Destination station name in Chinese (e.g., "市政府", "象山"). ' +
            'Required if using station-based lookup. Must be used together with origin. ' +
            'Supports fuzzy matching - system will suggest corrections if exact match not found.',
        },
        fareType: {
          type: 'string',
          description:
            'Fare type: "regular" (full price) or "discounted" (優惠票). ' +
            'Defaults to "regular". Discounted fares are typically 50% off for eligible passengers.',
          enum: ['regular', 'discounted'],
        },
      },
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
    let startDate: Date;
    if (args.startDate) {
      startDate = parseDate(args.startDate);
    } else {
      // Default to next working day
      const calendarService = CalendarService.getInstance();
      await calendarService.initialize();
      startDate = getNextWorkingDay(
        new Date(),
        (date) => calendarService.isWorkingDay(date)
      );
    }

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
 * Handle lookup_fare tool call
 */
export async function handleLookupFare(args: {
  fare?: number;
  origin?: string;
  destination?: string;
  fareType?: 'regular' | 'discounted';
}): Promise<string> {
  try {
    // Create fare service instance
    const fareService = new FareService();
    await fareService.initialize();

    // Build request
    const request: FareLookupRequest = {
      fare: args.fare,
      origin: args.origin,
      destination: args.destination,
      fareType: args.fareType ?? 'regular',
    };

    // Lookup fare
    const result = await fareService.lookupFare(request);

    // Format response based on result
    if (result.success) {
      const response: Record<string, unknown> = {
        success: true,
        fare: result.fare,
        source: result.source,
        fareType: args.fareType ?? 'regular',
      };

      // Add station details if available
      if (result.stations) {
        response.stations = {
          origin: result.stations.origin.matched,
          destination: result.stations.destination.matched,
          distance: result.stations.distance,
        };
      }

      // Add warnings if present
      if (result.warnings && result.warnings.length > 0) {
        response.warnings = result.warnings;
      }

      // Add usage hint for calculate_fare
      response.nextStep = `Use this fare (${result.fare} NTD) with the calculate_fare tool to determine if TPASS is cost-effective for your commute.`;

      return JSON.stringify(response, null, 2);
    } else {
      // Handle error or suggestions
      const errorResponse: Record<string, unknown> = {
        success: false,
        error: {
          code: result.error!.code,
          message: result.error!.message,
        },
      };

      // Add suggestions if available
      if (result.suggestions) {
        errorResponse.suggestions = {};

        if (result.suggestions.origin && result.suggestions.origin.length > 0) {
          errorResponse.suggestions = {
            ...(errorResponse.suggestions as object),
            origin: result.suggestions.origin.map((match) => ({
              station: match.name,
              confidence: `${(match.score * 100).toFixed(0)}%`,
            })),
          };
        }

        if (result.suggestions.destination && result.suggestions.destination.length > 0) {
          errorResponse.suggestions = {
            ...(errorResponse.suggestions as object),
            destination: result.suggestions.destination.map((match) => ({
              station: match.name,
              confidence: `${(match.score * 100).toFixed(0)}%`,
            })),
          };
        }

        errorResponse.hint =
          'Please select one of the suggested station names and try again with the exact name.';
      }

      // Add error details hint if available
      if (result.error!.details?.hint) {
        errorResponse.hint = result.error!.details.hint;
      }

      return JSON.stringify(errorResponse, null, 2);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    return JSON.stringify(
      {
        success: false,
        error: {
          code: 'E001',
          message: errorMessage,
        },
      },
      null,
      2
    );
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
    case 'lookup_fare':
      return handleLookupFare(args as Parameters<typeof handleLookupFare>[0]);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
