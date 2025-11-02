/**
 * Cross-month TPASS calculation service
 * Feature: 004-cross-month-tpass
 *
 * Implements corrected TPASS fare calculation that properly handles cross-month scenarios
 * by splitting the 30-day period into separate monthly calculations and applying discount
 * tiers independently per month.
 */

import type { MonthlySegment, CrossMonthCalculation } from '../models/tpass-calculation.js';
import { getDiscountTierForTrips, calculateDiscountAmount } from '../models/tpass-calculation.js';
import { calculateWorkingDayPeriod } from '../models/calendar.js';
import { detectMonthBoundary, splitIntoMonthlySegments } from './month-splitter.js';

/**
 * Get month name from Date object
 */
function getMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Calculate cost for a single monthly segment
 * Implements FR-002: Per-segment cost calculation
 *
 * @param segmentStart - Start date of the segment
 * @param segmentEnd - End date of the segment
 * @param farePerTrip - Base fare amount per trip
 * @param tripsPerDay - Number of trips per working day (typically 2)
 * @returns Monthly segment with all calculation details
 */
export async function calculateSegmentCost(
  segmentStart: Date,
  segmentEnd: Date,
  farePerTrip: number,
  tripsPerDay: number = 2
): Promise<MonthlySegment> {
  // Calculate working days for this segment
  const period = await calculateWorkingDayPeriod(segmentStart, segmentEnd);
  const workingDays = period.workingDays;
  const trips = workingDays * tripsPerDay;

  // Calculate costs
  const originalCost = trips * farePerTrip;

  // Apply discount tier based on trip count for this month
  const discountTier = getDiscountTierForTrips(trips);
  const discountAmount = calculateDiscountAmount(originalCost, trips);
  const finalCost = originalCost - discountAmount;

  return {
    year: segmentStart.getFullYear(),
    month: segmentStart.getMonth(),
    monthName: getMonthName(segmentStart),
    startDate: segmentStart,
    endDate: segmentEnd,
    workingDays,
    trips,
    baseFare: farePerTrip,
    discountTier: discountTier.discountPercent,
    discountAmount,
    originalCost,
    finalCost,
  };
}

/**
 * Apply discount tier to a cost amount
 * Implements FR-003: Discount tier application
 *
 * This is a convenience wrapper around the model function for service layer consistency.
 *
 * @param baseCost - Original cost before discount
 * @param trips - Number of trips in the period
 * @returns Discounted cost amount
 */
export function applyDiscountTier(baseCost: number, trips: number): number {
  const discountAmount = calculateDiscountAmount(baseCost, trips);
  return baseCost - discountAmount;
}

/**
 * Format monthly breakdown for display
 * Implements FR-007: Monthly breakdown display
 *
 * @param calculation - Complete cross-month calculation result
 * @returns Formatted breakdown as array of objects with display-friendly fields
 */
export function formatMonthlyBreakdown(calculation: CrossMonthCalculation): Array<{
  month: string;
  year: number;
  dateRange: string;
  workingDays: number;
  trips: number;
  baseFare: string;
  originalCost: string;
  discountTier: string;
  discountAmount: string;
  finalCost: string;
}> {
  return calculation.segments.map((segment) => ({
    month: segment.monthName,
    year: segment.year,
    dateRange: `${segment.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${segment.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    workingDays: segment.workingDays,
    trips: segment.trips,
    baseFare: `NT$${segment.baseFare}`,
    originalCost: `NT$${segment.originalCost.toFixed(0)}`,
    discountTier: `${segment.discountTier}%`,
    discountAmount: `NT$${segment.discountAmount.toFixed(0)}`,
    finalCost: `NT$${segment.finalCost.toFixed(0)}`,
  }));
}

/**
 * Calculate cross-month TPASS fare with detailed monthly breakdown
 * Implements FR-001 through FR-008
 *
 * Main entry point for cross-month TPASS calculation. Returns complete calculation
 * details including per-month breakdowns, discount applications, and comparison
 * with old calculation method.
 *
 * @param startDate - Start of 30-day TPASS period
 * @param endDate - End of 30-day TPASS period
 * @param farePerTrip - Base fare amount per trip
 * @param tripsPerDay - Number of trips per working day (default: 2)
 * @param customWorkingDays - Optional override for total working days
 * @returns Complete cross-month calculation with monthly breakdown
 */
export async function calculateCrossMonthTPASS(
  startDate: Date,
  endDate: Date,
  farePerTrip: number,
  tripsPerDay: number = 2,
  customWorkingDays?: number
): Promise<CrossMonthCalculation> {
  // Detect if period crosses month boundaries (FR-001)
  const crossesMonthBoundary = detectMonthBoundary(startDate, endDate);

  // Calculate total days
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Split into monthly segments and calculate each (FR-002)
  const dateSegments = splitIntoMonthlySegments(startDate, endDate);
  const segments: MonthlySegment[] = [];

  // If customWorkingDays is provided, distribute proportionally across segments
  if (customWorkingDays !== undefined) {
    const totalDaysInPeriod = dateSegments.reduce((sum, seg) => sum + seg.days, 0);

    for (const dateSegment of dateSegments) {
      // Proportional allocation of working days based on days in segment
      const segmentWorkingDays = Math.round((dateSegment.days / totalDaysInPeriod) * customWorkingDays);
      const trips = segmentWorkingDays * tripsPerDay;
      const originalCost = trips * farePerTrip;
      const discountTier = getDiscountTierForTrips(trips);
      const discountAmount = calculateDiscountAmount(originalCost, trips);
      const finalCost = originalCost - discountAmount;

      segments.push({
        year: dateSegment.start.getFullYear(),
        month: dateSegment.start.getMonth(),
        monthName: getMonthName(dateSegment.start),
        startDate: dateSegment.start,
        endDate: dateSegment.end,
        workingDays: segmentWorkingDays,
        trips,
        baseFare: farePerTrip,
        discountTier: discountTier.discountPercent,
        discountAmount,
        originalCost,
        finalCost,
      });
    }
  } else {
    // Calculate working days using calendar service
    for (const dateSegment of dateSegments) {
      const segment = await calculateSegmentCost(
        dateSegment.start,
        dateSegment.end,
        farePerTrip,
        tripsPerDay
      );
      segments.push(segment);
    }
  }

  // Calculate totals (FR-004)
  const totalWorkingDays = segments.reduce((sum, seg) => sum + seg.workingDays, 0);
  const totalTrips = segments.reduce((sum, seg) => sum + seg.trips, 0);
  const totalOriginalCost = segments.reduce((sum, seg) => sum + seg.originalCost, 0);
  const totalDiscountAmount = segments.reduce((sum, seg) => sum + seg.discountAmount, 0);
  const totalFinalCost = segments.reduce((sum, seg) => sum + seg.finalCost, 0);

  // Calculate old method for comparison (single discount tier for entire period)
  let previousCalculation: CrossMonthCalculation['previousCalculation'];
  if (crossesMonthBoundary) {
    const oldMethodTrips = totalTrips;
    const oldMethodCost = farePerTrip * oldMethodTrips;
    const oldMethodDiscountedCost = applyDiscountTier(oldMethodCost, oldMethodTrips);

    previousCalculation = {
      method: 'single-discount',
      totalCost: oldMethodDiscountedCost,
      difference: totalFinalCost - oldMethodDiscountedCost,
    };
  }

  return {
    startDate,
    endDate,
    farePerTrip,
    totalDays,
    totalWorkingDays,
    totalTrips,
    crossesMonthBoundary,
    segments,
    totalOriginalCost,
    totalDiscountAmount,
    totalFinalCost,
    previousCalculation,
  };
}
