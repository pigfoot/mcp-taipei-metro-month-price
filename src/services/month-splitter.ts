/**
 * Month boundary detection and splitting service for cross-month TPASS calculations
 * Feature: 004-cross-month-tpass
 */

import { splitDateRangeByMonth } from '../lib/utils.js';

/**
 * Detect if a date range crosses month boundaries
 * Implements FR-001: Month boundary detection
 *
 * @param startDate - Start of the period
 * @param endDate - End of the period
 * @returns true if the period spans multiple calendar months
 */
export function detectMonthBoundary(startDate: Date, endDate: Date): boolean {
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth();

  // Check if year or month differs
  return startYear !== endYear || startMonth !== endMonth;
}

/**
 * Split a date range into monthly segments
 * Implements FR-002: Monthly segmentation
 *
 * This is a re-export wrapper around the existing splitDateRangeByMonth utility
 * to maintain service layer consistency.
 *
 * @param startDate - Start of the period
 * @param endDate - End of the period
 * @returns Array of date segments, one per calendar month
 */
export function splitIntoMonthlySegments(
  startDate: Date,
  endDate: Date
): Array<{ start: Date; end: Date; days: number }> {
  return splitDateRangeByMonth(startDate, endDate);
}
