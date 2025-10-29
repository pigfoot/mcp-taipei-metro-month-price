/**
 * Core fare calculation service
 */

import type { FareComparison, CalculationParams, HolidayDetails, HolidayDetail } from '../lib/types.js';
import { DEFAULT_CONFIG } from '../config.js';
import { createTPASS } from '../models/tpass.js';
import { calculateWorkingDayPeriod } from '../models/calendar.js';
import { getDiscountTier, getAllDiscountTiers } from '../models/discount.js';
import { isInPast, formatCurrency, splitDateRangeByMonth, getChineseDayOfWeek, formatDate, isWeekend } from '../lib/utils.js';
import { CalendarService } from './calendar-service.js';

/**
 * Calculate TPASS vs regular fare comparison
 */
export async function calculateTPASSComparison(
  params: CalculationParams = {}
): Promise<FareComparison> {
  // Extract parameters with defaults
  const startDate = params.startDate || new Date();
  const oneWayFare = params.oneWayFare || DEFAULT_CONFIG.oneWayFare;
  const tripsPerDay = params.tripsPerDay || DEFAULT_CONFIG.tripsPerDay;

  // Create TPASS instance
  const tpass = createTPASS(startDate);

  // Enhancement: FR-012 - Ensure calendar data exists for entire TPASS period
  const calendarService = CalendarService.getInstance();
  await calendarService.ensureDataForPeriod(tpass.startDate, tpass.endDate);

  // Calculate working days in the period
  let workingDays: number;
  if (params.customWorkingDays !== undefined) {
    workingDays = params.customWorkingDays;
  } else {
    const period = await calculateWorkingDayPeriod(tpass.startDate, tpass.endDate);
    workingDays = period.workingDays;
  }

  // Calculate total trips
  const totalTrips = workingDays * tripsPerDay;

  // Calculate regular cost with cross-month discount support
  const regularCost = await calculateRegularFareWithCrossMonthDiscount(
    tpass.startDate,
    tpass.endDate,
    oneWayFare,
    tripsPerDay,
    params.customWorkingDays
  );

  // Get discount tier based on total trips (for display purposes)
  const appliedDiscount = getDiscountTier(totalTrips);

  // Calculate costs
  const tpassCost = tpass.price;
  const regularCostBeforeDiscount = oneWayFare * totalTrips;

  // Calculate savings
  const savingsAmount = tpassCost - regularCost;
  const savingsPercentage = savingsAmount / regularCost;

  // Determine recommendation
  const recommendation = tpassCost < regularCost ? 'BUY_TPASS' : 'USE_REGULAR';
  const recommendationReason =
    recommendation === 'BUY_TPASS'
      ? `Save ${formatCurrency(Math.abs(savingsAmount))} with TPASS monthly pass`
      : `Save ${formatCurrency(Math.abs(savingsAmount))} by using regular fare with frequent rider discount`;

  // Check for warnings
  const warnings: string[] = [];
  if (isInPast(startDate)) {
    warnings.push('Warning: Selected start date is in the past');
  }

  // Enhancement: FR-013 - Extract holiday details
  const holidayDetails = await extractHolidayDetails(tpass.startDate, tpass.endDate);

  // Build result
  const result: FareComparison = {
    startDate: new Date(startDate),
    oneWayFare,
    tripsPerDay,
    period: await calculateWorkingDayPeriod(tpass.startDate, tpass.endDate),
    totalTrips,
    appliedDiscount,
    tpassCost,
    regularCost,
    regularCostBeforeDiscount,
    savingsAmount,
    savingsPercentage,
    recommendation,
    recommendationReason,
    holidayDetails, // Enhancement: FR-013
  };

  if (warnings.length > 0) {
    result.warnings = warnings;
  }

  return result;
}

/**
 * Extract detailed holiday information for a date range
 * Enhancement: FR-013 (Holiday details in response)
 */
async function extractHolidayDetails(startDate: Date, endDate: Date): Promise<HolidayDetails> {
  const calendarService = CalendarService.getInstance();
  const holidayList: HolidayDetail[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const entry = calendarService.getEntry(current);

    // Include holidays and non-working days (excluding normal weekends without special designation)
    if (entry && entry.isHoliday && entry.name) {
      const dateStr = formatDate(current);
      holidayList.push({
        date: dateStr,
        name: entry.name,
        dayOfWeek: getChineseDayOfWeek(current),
        isWeekend: isWeekend(current),
      });
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    totalHolidays: holidayList.length,
    holidayList: holidayList.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/**
 * Calculate regular fare cost with cross-month discount support
 * Splits the period by calendar month and applies discount separately for each month
 */
async function calculateRegularFareWithCrossMonthDiscount(
  startDate: Date,
  endDate: Date,
  oneWayFare: number,
  tripsPerDay: number,
  customWorkingDays?: number
): Promise<number> {
  // If custom working days provided, use simple calculation
  if (customWorkingDays !== undefined) {
    const trips = customWorkingDays * tripsPerDay;
    const discount = getDiscountTier(trips);
    return oneWayFare * trips * (1 - discount.discountRate);
  }

  // Check if period spans multiple calendar months
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();

  // If same month, calculate directly
  if (startYear === endYear && startMonth === endMonth) {
    const period = await calculateWorkingDayPeriod(startDate, endDate);
    const trips = period.workingDays * tripsPerDay;
    const discount = getDiscountTier(trips);
    return oneWayFare * trips * (1 - discount.discountRate);
  }

  // Cross-month calculation: split by month and calculate each segment
  const segments = splitDateRangeByMonth(startDate, endDate);
  let totalCost = 0;

  for (const segment of segments) {
    const period = await calculateWorkingDayPeriod(segment.start, segment.end);
    const trips = period.workingDays * tripsPerDay;
    const discount = getDiscountTier(trips);
    const segmentCost = oneWayFare * trips * (1 - discount.discountRate);
    totalCost += segmentCost;
  }

  return totalCost;
}

/**
 * Get discount information
 */
export function getDiscountInfo() {
  const tiers = getAllDiscountTiers();

  return {
    frequentRiderProgram: {
      discountTiers: tiers.map((t) => ({
        tripRange: t.tripRange,
        discount: t.discount,
      })),
      resetCycle: 'Monthly on the 1st',
      eligibility: 'All Taipei Metro users',
    },
    tpassProgram: {
      price: formatCurrency(DEFAULT_CONFIG.tpassPrice),
      validity: `${DEFAULT_CONFIG.tpassValidityDays} consecutive days`,
      benefits: ['Unlimited trips within validity period', 'No need to track trip count'],
      coverage: 'Taipei Metro system',
    },
    comparisonTip: 'TPASS is typically beneficial for commuters making 30+ trips per month',
  };
}
