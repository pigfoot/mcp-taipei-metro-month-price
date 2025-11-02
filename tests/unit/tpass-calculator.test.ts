/**
 * Unit tests for tpass-calculator service
 * Feature: 004-cross-month-tpass
 */

import { describe, test, expect } from 'bun:test';
import { calculateSegmentCost, applyDiscountTier, calculateCrossMonthTPASS } from '../../src/services/tpass-calculator';

describe('tpass-calculator - calculateSegmentCost (FR-002)', () => {
  test('should calculate segment cost with no discount (2 trips)', async () => {
    const startDate = new Date(2024, 9, 31); // Oct 31, 2024 (Thursday)
    const endDate = new Date(2024, 9, 31); // Same day
    const farePerTrip = 35;
    const tripsPerDay = 2;

    const segment = await calculateSegmentCost(startDate, endDate, farePerTrip, tripsPerDay);

    expect(segment.year).toBe(2024);
    expect(segment.month).toBe(9); // October
    expect(segment.monthName).toBe('October');
    expect(segment.baseFare).toBe(35);
    expect(segment.workingDays).toBe(1); // Oct 31 is Thursday
    expect(segment.trips).toBe(2);
    expect(segment.originalCost).toBe(70); // 2 trips * $35
    expect(segment.discountTier).toBe(0); // 0-10 trips = 0%
    expect(segment.discountAmount).toBe(0);
    expect(segment.finalCost).toBe(70);
  });

  test('should calculate segment cost with discount for month-long period', async () => {
    // Using Nov 1-29, 2024 (29 days, will have >20 working days = >40 trips)
    const startDate = new Date(2024, 10, 1); // Nov 1, 2024
    const endDate = new Date(2024, 10, 29); // Nov 29, 2024
    const farePerTrip = 35;
    const tripsPerDay = 2;

    const segment = await calculateSegmentCost(startDate, endDate, farePerTrip, tripsPerDay);

    expect(segment.month).toBe(10); // November
    expect(segment.baseFare).toBe(35);
    // Nov 1-29 has approximately 20 working days (excluding weekends and holidays)
    expect(segment.workingDays).toBeGreaterThan(15);
    expect(segment.trips).toBeGreaterThan(30); // Should be >40 trips
    // With >40 trips, discount tier should be 15% (41+ trips = 15%)
    expect(segment.discountTier).toBeGreaterThan(0);
    expect(segment.discountAmount).toBeGreaterThan(0);
    expect(segment.finalCost).toBeLessThan(segment.originalCost);
  });
});

describe('tpass-calculator - applyDiscountTier (FR-003)', () => {
  test('should apply no discount for 10 trips', () => {
    const baseCost = 350; // 10 trips * $35
    const trips = 10;

    const result = applyDiscountTier(baseCost, trips);

    expect(result).toBe(350); // No discount
  });

  test('should apply 5% discount for 15 trips', () => {
    const baseCost = 525; // 15 trips * $35
    const trips = 15;

    const result = applyDiscountTier(baseCost, trips);

    expect(result).toBe(498.75); // 525 * 0.95 = 498.75
  });

  test('should apply 10% discount for 30 trips', () => {
    const baseCost = 1050; // 30 trips * $35
    const trips = 30;

    const result = applyDiscountTier(baseCost, trips);

    expect(result).toBe(945); // 1050 * 0.9 = 945
  });

  test('should apply 15% discount for 42 trips', () => {
    const baseCost = 1470; // 42 trips * $35
    const trips = 42;

    const result = applyDiscountTier(baseCost, trips);

    expect(result).toBe(1249.5); // 1470 * 0.85 = 1249.5
  });
});

describe('tpass-calculator - calculateCrossMonthTPASS (FR-001 to FR-008)', () => {
  test('should calculate cross-month TPASS (Oct 31 to Nov 29, 2024)', async () => {
    const startDate = new Date(2024, 9, 31); // Oct 31, 2024
    const endDate = new Date(2024, 10, 29); // Nov 29, 2024
    const farePerTrip = 35;
    const tripsPerDay = 2;

    const result = await calculateCrossMonthTPASS(startDate, endDate, farePerTrip, tripsPerDay);

    // Basic properties
    expect(result.startDate).toEqual(startDate);
    expect(result.endDate).toEqual(endDate);
    expect(result.farePerTrip).toBe(35);
    expect(result.totalDays).toBe(30);
    expect(result.crossesMonthBoundary).toBe(true);

    // Should have 2 segments
    expect(result.segments).toHaveLength(2);

    // October segment
    expect(result.segments[0].month).toBe(9);
    expect(result.segments[0].monthName).toBe('October');
    expect(result.segments[0].workingDays).toBe(1);
    expect(result.segments[0].trips).toBe(2);
    expect(result.segments[0].discountTier).toBe(0);

    // November segment
    expect(result.segments[1].month).toBe(10);
    expect(result.segments[1].monthName).toBe('November');
    expect(result.segments[1].workingDays).toBeGreaterThan(15);
    expect(result.segments[1].discountTier).toBeGreaterThan(0);

    // Totals
    expect(result.totalWorkingDays).toBeGreaterThan(16);
    expect(result.totalTrips).toBeGreaterThan(32);
    expect(result.totalFinalCost).toBeLessThan(result.totalOriginalCost);

    // Should include previous calculation comparison
    expect(result.previousCalculation).toBeDefined();
    expect(result.previousCalculation?.method).toBe('single-discount');
  });

  test('should calculate single-month TPASS (Oct 1 to Oct 30, 2024)', async () => {
    const startDate = new Date(2024, 9, 1); // Oct 1, 2024
    const endDate = new Date(2024, 9, 30); // Oct 30, 2024
    const farePerTrip = 35;
    const tripsPerDay = 2;

    const result = await calculateCrossMonthTPASS(startDate, endDate, farePerTrip, tripsPerDay);

    // Should not cross month boundary
    expect(result.crossesMonthBoundary).toBe(false);

    // Should have 1 segment
    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].month).toBe(9); // October
    expect(result.segments[0].monthName).toBe('October');

    // Should not have previous calculation comparison for single month
    expect(result.previousCalculation).toBeUndefined();
  });

  test('should handle year boundary (Dec 20, 2024 to Jan 18, 2025)', async () => {
    const startDate = new Date(2024, 11, 20); // Dec 20, 2024
    const endDate = new Date(2025, 0, 18); // Jan 18, 2025
    const farePerTrip = 35;
    const tripsPerDay = 2;

    const result = await calculateCrossMonthTPASS(startDate, endDate, farePerTrip, tripsPerDay);

    expect(result.crossesMonthBoundary).toBe(true);
    expect(result.segments).toHaveLength(2);

    // December segment
    expect(result.segments[0].year).toBe(2024);
    expect(result.segments[0].month).toBe(11); // December
    expect(result.segments[0].monthName).toBe('December');

    // January segment
    expect(result.segments[1].year).toBe(2025);
    expect(result.segments[1].month).toBe(0); // January
    expect(result.segments[1].monthName).toBe('January');

    // Should have comparison
    expect(result.previousCalculation).toBeDefined();
  });
});
